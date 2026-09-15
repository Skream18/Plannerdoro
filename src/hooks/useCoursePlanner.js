import { useEffect, useMemo, useReducer, useState } from 'react'
import { createSeedCourses } from '../data/seed.js'
import { uid } from '../utils/id.js'
import { daysUntil, todayKey } from '../utils/date.js'

const STORAGE_KEY = 'nocturne-course-planner-v1'

export const DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function initTimerState(persisted) {
  const today = todayKey()
  const doneToday = persisted?.day === today ? persisted.doneToday || 0 : 0
  return { mode: 'focus', left: DURATIONS.focus, running: false, doneToday, day: today }
}

function completeMode(state) {
  if (state.mode === 'focus') {
    const doneToday = state.doneToday + 1
    const nextMode = doneToday % 4 === 0 ? 'long' : 'short'
    return { ...state, doneToday, mode: nextMode, left: DURATIONS[nextMode], running: false }
  }
  return { ...state, mode: 'focus', left: DURATIONS.focus, running: false }
}

function timerReducer(state, action) {
  switch (action.type) {
    case 'TICK':
      if (!state.running) return state
      return state.left > 1 ? { ...state, left: state.left - 1 } : completeMode(state)
    case 'SET_MODE':
      return { ...state, mode: action.mode, left: DURATIONS[action.mode], running: false }
    case 'TOGGLE_RUN':
      return { ...state, running: !state.running }
    case 'RESET':
      return { ...state, left: DURATIONS[state.mode], running: false }
    case 'SKIP':
      return completeMode(state)
    default:
      return state
  }
}

export function useCoursePlanner() {
  const persisted = useMemo(() => loadPersisted(), [])

  const [courses, setCourses] = useState(() =>
    Array.isArray(persisted?.courses) && persisted.courses.length ? persisted.courses : createSeedCourses(),
  )
  const [theme, setTheme] = useState(persisted?.theme === 'light' ? 'light' : 'dark')
  const [view, setView] = useState('planner')
  const [selId, setSelId] = useState(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [taskDraft, setTaskDraft] = useState({ title: '', type: 'Lecture', deadline: '', notes: '' })
  const [linked, setLinked] = useState('')
  const [timer, dispatchTimer] = useReducer(timerReducer, persisted, initTimerState)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ courses, theme, doneToday: timer.doneToday, day: timer.day }),
      )
    } catch {
      /* localStorage unavailable (private mode, quota) — planner still works in-memory */
    }
  }, [courses, theme, timer.doneToday, timer.day])

  useEffect(() => {
    const id = setInterval(() => dispatchTimer({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [])

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selId) || courses[0] || { id: null, name: 'No courses yet', tasks: [] },
    [courses, selId],
  )

  const allTasks = useMemo(
    () => courses.flatMap((course) => course.tasks.map((task) => ({ task, course }))),
    [courses],
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
    () =>
      allTasks
        .filter((x) => !x.task.done)
        .map((x) => ({ id: x.task.id, label: `${x.course.name} — ${x.task.title}` })),
    [allTasks],
  )

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
      done: false,
    }
    mutateCourse(selectedCourse.id, (c) => ({ ...c, tasks: [...c.tasks, task] }))
    setTaskDraft((d) => ({ ...d, title: '', deadline: '', notes: '' }))
  }

  function toggleTask(taskId) {
    mutateCourse(selectedCourse.id, (c) => ({
      ...c,
      tasks: c.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    }))
  }

  function removeTask(taskId) {
    mutateCourse(selectedCourse.id, (c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== taskId) }))
  }

  function setTaskDraftField(field, value) {
    setTaskDraft((d) => ({ ...d, [field]: value }))
  }

  return {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    view,
    setView,
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
    setMode: (mode) => dispatchTimer({ type: 'SET_MODE', mode }),
    toggleRun: () => dispatchTimer({ type: 'TOGGLE_RUN' }),
    resetTimer: () => dispatchTimer({ type: 'RESET' }),
    skipMode: () => dispatchTimer({ type: 'SKIP' }),
  }
}
