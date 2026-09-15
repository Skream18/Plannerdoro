import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createSeedCourses } from '../data/seed.js'
import { uid } from '../utils/id.js'
import { dayKeyOfIso, daysUntil, todayKey } from '../utils/date.js'
import { collectActivityByDay, computeSessionStats, computeStreak } from '../utils/stats.js'
import { playChime } from '../utils/sound.js'

const STORAGE_KEY = 'nocturne-course-planner-v2'
const LEGACY_KEY = 'nocturne-course-planner-v1'
const MAX_SESSIONS = 500

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
 */
function completeMode(state, durations) {
  const finishedMode = state.mode
  const finishedMinutes = durations[finishedMode] / 60
  const today = todayKey()
  let todayFocusCount = state.today === today ? state.todayFocusCount : 0
  let nextMode
  if (finishedMode === 'focus') {
    todayFocusCount += 1
    nextMode = todayFocusCount % 4 === 0 ? 'long' : 'short'
  } else {
    nextMode = 'focus'
  }
  return {
    ...state,
    mode: nextMode,
    left: durations[nextMode],
    running: false,
    today,
    todayFocusCount,
    lastCompletionSeq: state.lastCompletionSeq + 1,
    lastCompletion: { mode: finishedMode, minutes: finishedMinutes },
  }
}

function timerReducer(state, action) {
  switch (action.type) {
    case 'TICK':
      if (!state.running) return state
      return state.left > 1 ? { ...state, left: state.left - 1 } : completeMode(state, action.durations)
    case 'SKIP':
      return completeMode(state, action.durations)
    case 'SET_MODE':
      return { ...state, mode: action.mode, left: action.left, running: false }
    case 'SYNC_DURATION':
      return { ...state, left: action.left }
    case 'TOGGLE_RUN':
      return { ...state, running: !state.running }
    case 'RESET':
      return { ...state, left: action.left, running: false }
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

  const [view, setView] = useState('planner')
  const [focusTab, setFocusTab] = useState('timer')
  const [selId, setSelId] = useState(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [taskDraft, setTaskDraft] = useState({ title: '', type: 'Lecture', deadline: '', notes: '', priority: 'medium' })
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
      lastCompletionSeq: 0,
      lastCompletion: null,
    }
  })

  // — theme —
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // — persistence: courses, theme, settings, sessions, stopwatch, laps —
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ courses, theme, settings, sessions, stopwatch, laps }))
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* localStorage unavailable (private mode, quota) — planner still works in-memory */
    }
  }, [courses, theme, settings, sessions, stopwatch, laps])

  // — pomodoro tick — durationsRef avoids restarting the interval whenever settings change —
  const durationsRef = useRef(durations)
  durationsRef.current = durations
  useEffect(() => {
    const id = setInterval(() => dispatchTimer({ type: 'TICK', durations: durationsRef.current }), 1000)
    return () => clearInterval(id)
  }, [])

  // — keep the idle countdown synced to duration settings without disturbing a running session —
  useEffect(() => {
    if (timer.running) return
    const target = durations[timer.mode]
    if (timer.left === target) return
    dispatchTimer({ type: 'SYNC_DURATION', left: target })
  }, [durations, timer.mode, timer.running, timer.left])

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

  // — react to completions the reducer recorded (tick-to-zero or Skip) — logs history, chimes, toasts.
  // Guarded by seq rather than a boolean so React StrictMode's double-invoke can't double-fire it.
  const lastHandledSeqRef = useRef(0)
  useEffect(() => {
    if (timer.lastCompletionSeq === lastHandledSeqRef.current) return
    lastHandledSeqRef.current = timer.lastCompletionSeq
    const { mode: finishedMode, minutes } = timer.lastCompletion
    const record = {
      id: uid(),
      mode: finishedMode,
      minutes,
      completedAt: new Date().toISOString(),
      linkedLabel: finishedMode === 'focus' && linkedRef.current ? allTasksLabel.get(linkedRef.current) || null : null,
    }
    setSessions((prev) => [...prev, record].slice(-MAX_SESSIONS))
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

  const activityByDay = useMemo(() => collectActivityByDay(courses, sessions), [courses, sessions])
  const streak = useMemo(() => computeStreak(activityByDay), [activityByDay])
  const sessionStats = useMemo(() => computeSessionStats(sessions), [sessions])

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

  function toggleTask(taskId) {
    mutateCourse(selectedCourse.id, (c) => ({
      ...c,
      tasks: c.tasks.map((t) =>
        t.id === taskId ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : null } : t,
      ),
    }))
  }

  function removeTask(taskId) {
    mutateCourse(selectedCourse.id, (c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }))
  }

  function setTaskDraftField(field, value) {
    setTaskDraft((d) => ({ ...d, [field]: value }))
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
    doneCount,
    totalCount,
    completionRatio,
    upcoming,
    openTasks,
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
    activityByDay,
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
