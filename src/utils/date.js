const DAY_MS = 86400000

/**
 * Local-calendar-day key (YYYY-MM-DD), NOT UTC — streaks/heatmaps/history group by the day the
 * user experienced, so this must stay local. `date.toISOString().slice(0,10)` would silently shift
 * by a day for anyone outside UTC+0, especially near local midnight.
 */
export const dayKeyOf = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local-day key extracted from a stored ISO timestamp (e.g. a task's completedAt). */
export const dayKeyOfIso = (iso) => dayKeyOf(new Date(iso))

export const todayKey = () => dayKeyOf(new Date())

export const formatShortDate = (iso) => {
  const date = new Date(iso + 'T00:00:00')
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export const formatFullDate = (date) =>
  date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

export const daysUntil = (iso) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso + 'T00:00:00')
  return Math.round((target - today) / DAY_MS)
}

export const urgencyOf = (daysAway) => (daysAway < 0 ? 'over' : daysAway <= 3 ? 'soon' : 'calm')

export const relativeDeadlineLabel = (daysAway) => {
  if (daysAway < 0) return `${Math.abs(daysAway)}d overdue`
  if (daysAway === 0) return 'today'
  if (daysAway === 1) return 'tomorrow'
  return `in ${daysAway} days`
}

export const pad2 = (n) => String(n).padStart(2, '0')

/** mm:ss, growing to h:mm:ss past one hour — used by the Pomodoro clock and stopwatch. */
export const formatClock = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`
}

/** Stopwatch clock with centiseconds: mm:ss.cc, growing to h:mm:ss.cc past one hour. */
export const formatStopwatchClock = (ms) => {
  const totalCentis = Math.max(0, Math.floor(ms / 10))
  const centis = totalCentis % 100
  return `${formatClock(totalCentis / 100)}.${pad2(centis)}`
}

export const formatMinutes = (totalMinutes) => {
  const rounded = Math.round(totalMinutes)
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export const formatTimestamp = (iso) => {
  const date = new Date(iso)
  const sameDay = dayKeyOf(date) === todayKey()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = dayKeyOf(date) === dayKeyOf(yesterday)
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today · ${time}`
  if (isYesterday) return `Yesterday · ${time}`
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${time}`
}

export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

export const addMonths = (date, delta) => new Date(date.getFullYear(), date.getMonth() + delta, 1)

/** Weeks (arrays of 7 Dates) covering the full calendar-grid for a month, Sunday-first. */
export const monthGrid = (monthDate) => {
  const first = startOfMonth(monthDate)
  const gridStart = new Date(first)
  gridStart.setDate(gridStart.getDate() - first.getDay())
  const weeks = []
  const cursor = new Date(gridStart)
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}
