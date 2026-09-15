import { dayKeyOf, dayKeyOfIso, todayKey } from './date.js'

/** Map of dayKey -> { tasks: number, sessions: number }, merging completed tasks and focus sessions. */
export function collectActivityByDay(courses, sessions) {
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

export function activityLevel(entry) {
  if (!entry) return 0
  const count = entry.tasks + entry.sessions
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  return 3
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
