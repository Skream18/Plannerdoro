import { dayKeyOf, dayKeyOfIso, todayKey } from './date.js'

/**
 * Map of dayKey -> { tasks: number, sessions: number }, merging completed course tasks, completed
 * standalone "today" tasks, and focus sessions. `todayTasksByDay` entries with `kind: 'existing'`
 * are skipped here since they reference a course task already counted above.
 */
export function collectActivityByDay(courses, sessions, todayTasksByDay = {}) {
  const map = new Map()
  const bump = (key, field) => {
    const entry = map.get(key) || { tasks: 0, sessions: 0 }
    entry[field] += 1
    map.set(key, entry)
  }
  for (const course of courses) {
    for (const task of course.tasks) {
      if (task.done && task.completedAt) bump(dayKeyOfIso(task.completedAt), 'tasks')
    }
  }
  for (const list of Object.values(todayTasksByDay)) {
    for (const entry of list) {
      if (entry.kind === 'standalone' && entry.done && entry.completedAt) bump(dayKeyOfIso(entry.completedAt), 'tasks')
    }
  }
  for (const session of sessions) {
    if (session.mode === 'focus') bump(dayKeyOfIso(session.completedAt), 'sessions')
  }
  return map
}

/** Consecutive active days up to today — a day with no activity yet doesn't break the streak until it ends. */
export function computeStreak(activityMap) {
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!activityMap.has(todayKey())) cursor.setDate(cursor.getDate() - 1)
  while (true) {
    const entry = activityMap.get(dayKeyOf(cursor))
    if (!entry || (entry.tasks === 0 && entry.sessions === 0)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeSessionStats(sessions) {
  const focusSessions = sessions.filter((s) => s.mode === 'focus')
  const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + s.minutes, 0)
  return {
    totalSessions: sessions.length,
    totalFocusSessions: focusSessions.length,
    totalFocusMinutes,
  }
}
