import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createSeedCourses } from '../data/seed.js'
import { uid } from '../utils/id.js'
import { dayKeyOfIso, daysUntil, todayKey } from '../utils/date.js'
import { collectActivityByDay, computeSessionStats, computeStreak } from '../utils/stats.js'
import { playChime } from '../utils/sound.js'

const STORAGE_KEY = 'nocturne-course-planner-v2'
const LEGACY_KEY = 'nocturne-course-planner-v1'
const MAX_SESSIONS = 500
const MAX_TODAY_HISTORY_DAYS = 30

export const DEFAULT_SETTINGS = { focusMinutes: 45, shortMinutes: 5, longMinutes: 15 }
const DURATION_BOUNDS = { min: 1, max: 180 }

function clampMinutes(value, fallback) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(DURATION_BOUNDS.max, Math.max(DURATION_BOUNDS.min, n))
}

function normalizeSettings(raw) {
  return {
    focusMinutes: clampMinutes(raw?.focusMinutes, DEFAULT_SETTINGS.focusMinutes),
    shortMinutes: clampMinutes(raw?.shortMinutes, DEFAULT_SETTINGS.shortMinutes),
    longMinutes: clampMinutes(raw?.longMinutes, DEFAULT_SETTINGS.longMinutes),
  }
}

function normalizeCourses(rawCourses) {
  if (!Array.isArray(rawCourses)) return null
  return rawCourses.map((course) => ({
    id: course.id || uid(),
    name: course.name || 'Untitled course',
    tasks: Array.isArray(course.tasks)
      ? course.tasks.map((task) => ({
          id: task.id || uid(),
          title: task.title || '',
          type: task.type || 'Topic',
          deadline: task.deadline || '',
          notes: task.notes || '',
          priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
          done: !!task.done,
          completedAt: task.completedAt || null,
        }))
      : [],
  }))
}

function normalizeTodayTasksByDay(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const dayKeys = Object.keys(raw).sort().slice(-MAX_TODAY_HISTORY_DAYS)
  const out = {}
  for (const day of dayKeys) {
    const list = raw[day]
    if (!Array.isArray(list)) continue
    out[day] = list
      .filter((e) => e && e.id && (e.kind === 'existing' || e.kind === 'standalone'))
      .map((e) =>
        e.kind === 'existing'
          ? { id: e.id, kind: 'existing', courseId: e.courseId, taskId: e.taskId }
          : {
              id: e.id,
              kind: 'standalone',
              title: e.title || '',
              notes: e.notes || '',
              priority: ['low', 'medium', 'high'].includes(e.priority) ? e.priority : 'medium',
              done: !!e.done,
              completedAt: e.completedAt || null,
            },
      )
  }
  return out
}

function normalizeSessions(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s) => s && s.completedAt && ['focus', 'short', 'long'].includes(s.mode))
    .map((s) => ({
      id: s.id || uid(),
      mode: s.mode,
      minutes: Number(s.minutes) || 0,
      completedAt: s.completedAt,
      linkedLabel: s.linkedLabel || null,
    }))
    .slice(-MAX_SESSIONS)
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* corrupted v2 payload — fall through to legacy migration / seed data */
  }
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw)
      return { courses: legacy.courses, theme: legacy.theme }
    }
  } catch {
    /* corrupted v1 payload — fall through to seed data */
  }
  return null
}

/**
 * Mode-completion cadence (today's focus count, short vs. long break) lives entirely inside the
 * reducer rather than in a closure, since React guarantees queued dispatches to the same reducer
 * are applied in order against each other's results — safe even if several SKIPs fire before a
 * re-render lands. Reading `timer.mode` from a component-closure for that decision (the original
 * approach here) went stale under rapid dispatches and silently dropped transitions.
 *
 * `elapsedFocusSeconds` tracks real active seconds spent in the *current* focus segment (only ticks
 * up while running in focus mode) so partial study time is never lost: it's flushed into a logged
 * session — counting toward stats — whenever that segment ends for any reason (completes, is
 * skipped, is reset, or the mode is switched away), not only on a full 45-minute completion.
 */
function finishSegment(state, durations, { natural }) {
  const finishedMode = state.mode
  const elapsedFocusSeconds = finishedMode === 'focus' && natural ? state.elapsedFocusSeconds + 1 : state.elapsedFocusSeconds
  const today = todayKey()
  let todayFocusCount = state.today === today ? state.todayFocusCount : 0
  let nextMode
  let finishedMinutes
  if (finishedMode === 'focus') {
    finishedMinutes = elapsedFocusSeconds / 60
    todayFocusCount += 1
    nextMode = todayFocusCount % 4 === 0 ? 'long' : 'short'
  } else {
    finishedMinutes = durations[finishedMode] / 60
    nextMode = 'focus'
  }
  return {
    ...state,
    mode: nextMode,
    left: durations[nextMode],
    running: false,
    today,
    todayFocusCount,
    elapsedFocusSeconds: 0,
    lastCompletionSeq: state.lastCompletionSeq + 1,
    lastCompletion: { mode: finishedMode, minutes: finishedMinutes, partial: false },
  }
}

/** Flushes any accumulated (but not-yet-logged) focus time before applying `patch` — used whenever
 * the current segment is abandoned rather than completed (reset, switching modes, or a settings
 * change resyncing the idle countdown), so those seconds still land in stats. */
function withFocusFlush(state, patch) {
  if (state.mode === 'focus' && state.elapsedFocusSeconds > 0) {
    return {
      ...state,
      ...patch,
      elapsedFocusSeconds: 0,
      lastCompletionSeq: state.lastCompletionSeq + 1,
      lastCompletion: { mode: 'focus', minutes: state.elapsedFocusSeconds / 60, partial: true },
    }
  }
  return { ...state, ...patch, elapsedFocusSeconds: 0 }
}

function timerReducer(state, action) {
  switch (action.type) {
    case 'TICK': {
      if (!state.running) return state
      if (state.left > 1) {
        return state.mode === 'focus'
          ? { ...state, left: state.left - 1, elapsedFocusSeconds: state.elapsedFocusSeconds + 1 }
          : { ...state, left: state.left - 1 }
      }
      return finishSegment(state, action.durations, { natural: true })
    }
    case 'SKIP':
      return finishSegment(state, action.durations, { natural: false })
    case 'SET_MODE':
      return withFocusFlush(state, { mode: action.mode, left: action.left, running: false })
    case 'SYNC_DURATION':
      return withFocusFlush(state, { left: action.left })
    case 'TOGGLE_RUN':
      return { ...state, running: !state.running }
    case 'RESET':
      return withFocusFlush(state, { left: action.left, running: false })
    default:
      return state
  }
}

export function useCoursePlanner() {
  const persisted = useMemo(() => loadPersisted(), [])

  const [courses, setCourses] = useState(() => normalizeCourses(persisted?.courses) || createSeedCourses())
  const [theme, setTheme] = useState(persisted?.theme === 'light' ? 'light' : 'dark')
  const [settings, setSettings] = useState(() => normalizeSettings(persisted?.settings))
  const [sessions, setSessions] = useState(() => normalizeSessions(persisted?.sessions))
  const [stopwatch, setStopwatch] = useState(
    () => persisted?.stopwatch || { accumulatedMs: 0, running: false, startedAt: null },
  )
  const [laps, setLaps] = useState(() => (Array.isArray(persisted?.laps) ? persisted.laps : []))
  const [todayTasksByDay, setTodayTasksByDay] = useState(() => normalizeTodayTasksByDay(persisted?.todayTasksByDay))

  const [view, setView] = useState('planner')
  const [focusTab, setFocusTab] = useState('timer')
  const [selId, setSelId] = useState(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [taskDraft, setTaskDraft] = useState({ title: '', type: 'Lecture', deadline: '', notes: '', priority: 'medium' })
  const [standaloneDraft, setStandaloneDraft] = useState({ title: '', notes: '', priority: 'medium' })
  const [todayPickId, setTodayPickId] = useState('')
  const [linked, setLinked] = useState('')
  const [toast, setToast] = useState(null)

  const durations = useMemo(
    () => ({ focus: settings.focusMinutes * 60, short: settings.shortMinutes * 60, long: settings.longMinutes * 60 }),
    [settings],
  )

  const [timer, dispatchTimer] = useReducer(timerReducer, null, () => {
    const today = todayKey()
    const todayFocusCount = sessions.filter((s) => s.mode === 'focus' && dayKeyOfIso(s.completedAt) === today).length
    return {
      mode: 'focus',
      left: normalizeSettings(persisted?.settings).focusMinutes * 60,
      running: false,
      today,
      todayFocusCount,
      elapsedFocusSeconds: 0,
      lastCompletionSeq: 0,
      lastCompletion: null,
    }
  })

  // — theme —
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // — persistence: courses, theme, settings, sessions, stopwatch, laps, today's list —
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ courses, theme, settings, sessions, stopwatch, laps, todayTasksByDay }),
      )
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* localStorage unavailable (private mode, quota) — planner still works in-memory */
    }
  }, [courses, theme, settings, sessions, stopwatch, laps, todayTasksByDay])

  // — pomodoro tick — durationsRef avoids restarting the interval whenever settings change —
  const durationsRef = useRef(durations)
  durationsRef.current = durations
  useEffect(() => {
    const id = setInterval(() => dispatchTimer({ type: 'TICK', durations: durationsRef.current }), 1000)
    return () => clearInterval(id)
  }, [])

  // — keep the idle countdown synced to duration settings without disturbing a running OR paused
  // session — only fires when `durations` itself changes (the settings were edited), never merely
  // because `running`/`left` changed (e.g. on pause), which previously reset the countdown on pause.
  const timerRef = useRef(timer)
  timerRef.current = timer
  const prevDurationsRef = useRef(durations)
  useEffect(() => {
    if (durations === prevDurationsRef.current) return
    prevDurationsRef.current = durations
    if (timerRef.current.running) return
    dispatchTimer({ type: 'SYNC_DURATION', left: durations[timerRef.current.mode] })
  }, [durations])

  // — toast auto-dismiss —
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(id)
  }, [toast])

  // — stopwatch ticking (only while running, just to force re-renders for the live clock) —
  const [, forceStopwatchTick] = useReducer((n) => n + 1, 0)
  useEffect(() => {
    if (!stopwatch.running) return
    const id = setInterval(forceStopwatchTick, 100)
    return () => clearInterval(id)
  }, [stopwatch.running])

  const allTasks = useMemo(() => courses.flatMap((course) => course.tasks.map((task) => ({ task, course }))), [courses])
  const allTasksLabel = useMemo(() => new Map(allTasks.map((x) => [x.task.id, `${x.course.name} — ${x.task.title}`])), [allTasks])

  const linkedRef = useRef(linked)
  linkedRef.current = linked

  // — react to completions the reducer recorded (natural completion, Skip, or an abandoned partial
  // segment from Reset/switching modes/a settings resync) — logs history, and for real completions
  // only, chimes + toasts. Guarded by seq rather than a boolean so React StrictMode's double-invoke
  // can't double-fire it.
  const lastHandledSeqRef = useRef(0)
  useEffect(() => {
    if (timer.lastCompletionSeq === lastHandledSeqRef.current) return
    lastHandledSeqRef.current = timer.lastCompletionSeq
    const { mode: finishedMode, minutes, partial } = timer.lastCompletion
    const record = {
      id: uid(),
      mode: finishedMode,
      minutes,
      completedAt: new Date().toISOString(),
      linkedLabel: finishedMode === 'focus' && linkedRef.current ? allTasksLabel.get(linkedRef.current) || null : null,
    }
    setSessions((prev) => [...prev, record].slice(-MAX_SESSIONS))
    if (partial) return
    playChime()
    setToast(
      finishedMode === 'focus'
        ? {
            id: uid(),
            text: timer.mode === 'long' ? 'Focus session complete — time for a long break.' : 'Focus session complete — take a short break.',
          }
        : { id: uid(), text: "Break's over — back to focus." },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.lastCompletionSeq])

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selId) || courses[0] || { id: null, name: 'No courses yet', tasks: [] },
    [courses, selId],
  )

  const doneCount = allTasks.filter((x) => x.task.done).length
  const totalCount = allTasks.length
  const completionRatio = totalCount ? doneCount / totalCount : 0

  const upcoming = useMemo(
    () =>
      allTasks
        .filter((x) => x.task.deadline && !x.task.done)
        .sort((a, b) => (a.task.deadline < b.task.deadline ? -1 : 1))
        .slice(0, 6)
        .map((x) => ({
          id: x.task.id,
          title: x.task.title,
          course: x.course.name,
          deadline: x.task.deadline,
          daysAway: daysUntil(x.task.deadline),
        })),
    [allTasks],
  )

  const openTasks = useMemo(
    () => allTasks.filter((x) => !x.task.done).map((x) => ({ id: x.task.id, label: `${x.course.name} — ${x.task.title}` })),
    [allTasks],
  )

  const activityByDay = useMemo(
    () => collectActivityByDay(courses, sessions, todayTasksByDay),
    [courses, sessions, todayTasksByDay],
  )
  const streak = useMemo(() => computeStreak(activityByDay), [activityByDay])
  const sessionStats = useMemo(() => computeSessionStats(sessions), [sessions])

  // — chronological log of everything completed: course/standalone tasks + focus sessions —
  const completedLog = useMemo(() => {
    const items = []
    for (const course of courses) {
      for (const task of course.tasks) {
        if (task.done && task.completedAt) {
          items.push({ id: task.id, kind: 'task', title: task.title, courseName: course.name, completedAt: task.completedAt })
        }
      }
    }
    for (const list of Object.values(todayTasksByDay)) {
      for (const entry of list) {
        if (entry.kind === 'standalone' && entry.done && entry.completedAt) {
          items.push({ id: entry.id, kind: 'task', title: entry.title, courseName: null, completedAt: entry.completedAt })
        }
      }
    }
    for (const s of sessions) {
      if (s.mode === 'focus') {
        items.push({ id: s.id, kind: 'session', minutes: s.minutes, linkedLabel: s.linkedLabel, completedAt: s.completedAt })
      }
    }
    return items.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  }, [courses, todayTasksByDay, sessions])

  // — prune "today" entries that reference a task/course which no longer exists —
  useEffect(() => {
    setTodayTasksByDay((prev) => {
      let changed = false
      const next = {}
      for (const [day, list] of Object.entries(prev)) {
        const filtered = list.filter((e) => e.kind !== 'existing' || allTasks.some((x) => x.task.id === e.taskId))
        if (filtered.length !== list.length) changed = true
        next[day] = filtered
      }
      return changed ? next : prev
    })
  }, [allTasks])

  const todayKeyNow = todayKey()
  const todayEntries = useMemo(() => todayTasksByDay[todayKeyNow] || [], [todayTasksByDay, todayKeyNow])

  const resolvedTodayEntries = useMemo(
    () =>
      todayEntries
        .map((entry) => {
          if (entry.kind === 'existing') {
            const found = allTasks.find((x) => x.task.id === entry.taskId)
            if (!found) return null
            return {
              id: entry.id,
              kind: 'existing',
              title: found.task.title,
              courseName: found.course.name,
              priority: found.task.priority,
              done: found.task.done,
              notes: found.task.notes,
            }
          }
          return {
            id: entry.id,
            kind: 'standalone',
            title: entry.title,
            courseName: null,
            priority: entry.priority,
            done: entry.done,
            notes: entry.notes,
          }
        })
        .filter(Boolean),
    [todayEntries, allTasks],
  )

  const todayPickOptions = useMemo(() => {
    const refIds = new Set(todayEntries.filter((e) => e.kind === 'existing').map((e) => e.taskId))
    return allTasks.filter((x) => !refIds.has(x.task.id)).map((x) => ({ id: x.task.id, label: `${x.course.name} — ${x.task.title}` }))
  }, [todayEntries, allTasks])

  function mutateCourse(id, fn) {
    setCourses((cs) => cs.map((c) => (c.id === id ? fn(c) : c)))
  }

  function selectCourse(id) {
    setSelId(id)
    setView('planner')
  }

  function addCourse(e) {
    e.preventDefault()
    const name = newCourseName.trim()
    if (!name) return
    const id = uid()
    setCourses((cs) => [...cs, { id, name, tasks: [] }])
    setNewCourseName('')
    setSelId(id)
    setView('planner')
  }

  function removeCourse(id) {
    setCourses((cs) => cs.filter((c) => c.id !== id))
    setSelId((cur) => (cur === id ? null : cur))
  }

  function addTask(e) {
    e.preventDefault()
    const title = taskDraft.title.trim()
    if (!title || !selectedCourse.id) return
    const task = {
      id: uid(),
      title,
      type: taskDraft.type,
      deadline: taskDraft.deadline,
      notes: taskDraft.notes.trim(),
      priority: taskDraft.priority,
      done: false,
      completedAt: null,
    }
    mutateCourse(selectedCourse.id, (c) => ({ ...c, tasks: [...c.tasks, task] }))
    setTaskDraft((d) => ({ ...d, title: '', deadline: '', notes: '' }))
  }

  function toggleTask(courseId, taskId) {
    mutateCourse(courseId, (c) => ({
      ...c,
      tasks: c.tasks.map((t) =>
        t.id === taskId ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : null } : t,
      ),
    }))
  }

  function removeTask(courseId, taskId) {
    mutateCourse(courseId, (c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }))
  }

  function reorderTasks(courseId, draggedId, targetId) {
    if (draggedId === targetId) return
    mutateCourse(courseId, (c) => {
      const fromIndex = c.tasks.findIndex((t) => t.id === draggedId)
      const toIndex = c.tasks.findIndex((t) => t.id === targetId)
      if (fromIndex === -1 || toIndex === -1) return c
      const tasks = [...c.tasks]
      const [moved] = tasks.splice(fromIndex, 1)
      tasks.splice(toIndex, 0, moved)
      return { ...c, tasks }
    })
  }

  function setTaskDraftField(field, value) {
    setTaskDraft((d) => ({ ...d, [field]: value }))
  }

  // — today's list —
  function addExistingToToday(e) {
    e.preventDefault()
    if (!todayPickId) return
    const found = allTasks.find((x) => x.task.id === todayPickId)
    if (!found) return
    setTodayTasksByDay((prev) => {
      const list = prev[todayKeyNow] || []
      if (list.some((entry) => entry.kind === 'existing' && entry.taskId === todayPickId)) return prev
      return { ...prev, [todayKeyNow]: [...list, { id: uid(), kind: 'existing', courseId: found.course.id, taskId: todayPickId }] }
    })
    setTodayPickId('')
  }

  function addStandaloneToday(e) {
    e.preventDefault()
    const title = standaloneDraft.title.trim()
    if (!title) return
    const entry = {
      id: uid(),
      kind: 'standalone',
      title,
      notes: standaloneDraft.notes.trim(),
      priority: standaloneDraft.priority,
      done: false,
      completedAt: null,
    }
    setTodayTasksByDay((prev) => ({ ...prev, [todayKeyNow]: [...(prev[todayKeyNow] || []), entry] }))
    setStandaloneDraft((d) => ({ ...d, title: '', notes: '' }))
  }

  function toggleTodayEntry(entryId) {
    const entry = todayEntries.find((x) => x.id === entryId)
    if (!entry) return
    if (entry.kind === 'existing') {
      toggleTask(entry.courseId, entry.taskId)
      return
    }
    setTodayTasksByDay((prev) => ({
      ...prev,
      [todayKeyNow]: (prev[todayKeyNow] || []).map((x) =>
        x.id === entryId ? { ...x, done: !x.done, completedAt: !x.done ? new Date().toISOString() : null } : x,
      ),
    }))
  }

  function removeTodayEntry(entryId) {
    setTodayTasksByDay((prev) => ({ ...prev, [todayKeyNow]: (prev[todayKeyNow] || []).filter((x) => x.id !== entryId) }))
  }

  function setStandaloneDraftField(field, value) {
    setStandaloneDraft((d) => ({ ...d, [field]: value }))
  }

  function updateSettings(field, minutes) {
    setSettings((s) => ({ ...s, [field]: clampMinutes(minutes, s[field]) }))
  }

  // — stopwatch —
  const stopwatchElapsedMs = stopwatch.accumulatedMs + (stopwatch.running && stopwatch.startedAt ? Date.now() - stopwatch.startedAt : 0)

  function toggleStopwatch() {
    setStopwatch((s) =>
      s.running
        ? { accumulatedMs: s.accumulatedMs + (Date.now() - s.startedAt), running: false, startedAt: null }
        : { ...s, running: true, startedAt: Date.now() },
    )
  }

  function resetStopwatch() {
    setStopwatch({ accumulatedMs: 0, running: false, startedAt: null })
    setLaps([])
  }

  function addLap() {
    setLaps((prev) => [{ id: uid(), ms: stopwatchElapsedMs }, ...prev])
  }

  return {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    view,
    setView,
    focusTab,
    setFocusTab,
    courses,
    selectedCourse,
    selectCourse,
    removeCourse,
    newCourseName,
    setNewCourseName,
    addCourse,
    taskDraft,
    setTaskDraftField,
    addTask,
    toggleTask,
    removeTask,
    reorderTasks,
    doneCount,
    totalCount,
    completionRatio,
    upcoming,
    openTasks,
    todayEntries: resolvedTodayEntries,
    todayPickOptions,
    todayPickId,
    setTodayPickId,
    addExistingToToday,
    standaloneDraft,
    setStandaloneDraftField,
    addStandaloneToday,
    toggleTodayEntry,
    removeTodayEntry,
    linked,
    setLinked,
    timer,
    durations,
    settings,
    updateSettings,
    setMode: (mode) => dispatchTimer({ type: 'SET_MODE', mode, left: durations[mode] }),
    toggleRun: () => dispatchTimer({ type: 'TOGGLE_RUN' }),
    resetTimer: () => dispatchTimer({ type: 'RESET', left: durations[timer.mode] }),
    skipMode: () => dispatchTimer({ type: 'SKIP', durations }),
    sessions,
    sessionStats,
    completedLog,
    streak,
    stopwatch,
    stopwatchElapsedMs,
    toggleStopwatch,
    resetStopwatch,
    laps,
    addLap,
    toast,
    dismissToast: () => setToast(null),
  }
}
