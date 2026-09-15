import { useMemo, useState } from 'react'
import { addMonths, dayKeyOf, formatShortDate, monthGrid, todayKey } from '../utils/date.js'
import { activityLevel } from '../utils/stats.js'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarView({ courses, activityByDay, streak }) {
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(todayKey())

  const weeks = useMemo(() => monthGrid(monthDate), [monthDate])
  const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const todayK = todayKey()

  const dueByDay = useMemo(() => {
    const map = new Map()
    for (const course of courses) {
      for (const task of course.tasks) {
        if (!task.deadline) continue
        const list = map.get(task.deadline) || []
        list.push({ ...task, courseName: course.name })
        map.set(task.deadline, list)
      }
    }
    return map
  }, [courses])

  const selectedTasks = dueByDay.get(selectedDay) || []

  return (
    <div className="calendar-view">
      <section className="calendar-main">
        <div className="calendar-header">
          <div>
            <div className="text-muted planner-eyebrow">Calendar</div>
            <h2 className="planner-title">{monthLabel}</h2>
          </div>
          <div className="calendar-nav">
            <div className="streak-chip" title="Consecutive active days">
              <i className="ph ph-fire" /> {streak} day{streak === 1 ? '' : 's'}
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setMonthDate((d) => addMonths(d, -1))} title="Previous month">
              <i className="ph ph-caret-left" />
            </button>
            <button
              className="btn btn-secondary calendar-today-btn"
              onClick={() => {
                setMonthDate(new Date())
                setSelectedDay(todayK)
              }}
            >
              Today
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => setMonthDate((d) => addMonths(d, 1))} title="Next month">
              <i className="ph ph-caret-right" />
            </button>
          </div>
        </div>

        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="calendar-weekday text-muted">
              {d}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {weeks.flat().map((day) => {
            const key = dayKeyOf(day)
            const inMonth = day.getMonth() === monthDate.getMonth()
            const level = activityLevel(activityByDay.get(key))
            const due = dueByDay.get(key) || []
            const classes = [
              'calendar-day',
              `activity-${level}`,
              !inMonth && 'calendar-day-outside',
              key === todayK && 'calendar-day-today',
              key === selectedDay && 'calendar-day-selected',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button key={key} className={classes} onClick={() => setSelectedDay(key)}>
                <span className="calendar-day-number">{day.getDate()}</span>
                {due.length > 0 && (
                  <span className="calendar-day-dots">
                    {due.slice(0, 3).map((t) => (
                      <span key={t.id} className="calendar-dot" />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <aside className="deadlines-aside calendar-aside">
        <div className="deadlines-card">
          <h6>
            {formatShortDate(selectedDay)}
            {selectedDay === todayK ? ' · Today' : ''}
          </h6>
          <div className="deadlines-list">
            {selectedTasks.map((t) => (
              <div className="deadline-row" key={t.id}>
                <div className="deadline-mark" style={{ background: t.done ? 'var(--color-divider)' : 'var(--color-accent)' }} />
                <div className="deadline-copy">
                  <div className="deadline-title">{t.title}</div>
                  <div className="text-muted deadline-course">{t.courseName}</div>
                </div>
              </div>
            ))}
          </div>
          {selectedTasks.length === 0 && <p className="text-muted deadlines-empty">Nothing due this day.</p>}
        </div>
      </aside>
    </div>
  )
}
