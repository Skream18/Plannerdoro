const DAY_MS = 86400000

export const dayKeyOf = (date) => date.toISOString().slice(0, 10)

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
