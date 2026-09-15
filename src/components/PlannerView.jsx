import { daysUntil, formatFullDate, formatShortDate, relativeDeadlineLabel, urgencyOf } from '../utils/date.js'

const TASK_TYPES = ['Lecture', 'Tutorial', 'Assignment', 'Reading', 'Topic']

const DUE_TINTS = {
  over: { bg: 'var(--tint-accent)', fg: 'var(--color-accent-400)' },
  soon: { bg: 'var(--tint-accent)', fg: 'var(--on-tint)' },
  calm: { bg: 'var(--tint-neutral)', fg: 'var(--ink-soft)' },
}

export default function PlannerView({ selectedCourse, onToggleTask, onRemoveTask, taskDraft, onTaskDraftChange, onAddTask, upcoming }) {
  const selDone = selectedCourse.tasks.filter((t) => t.done).length

  return (
    <div className="planner-layout">
      <section className="planner-main">
        <div className="text-muted planner-eyebrow">{formatFullDate(new Date())}</div>
        <h2 className="planner-title">{selectedCourse.name}</h2>
        <p className="text-muted planner-summary">
          {selectedCourse.tasks.length ? `${selDone} of ${selectedCourse.tasks.length} done` : 'No tasks yet'}
        </p>

        <div className="task-list">
          {selectedCourse.tasks.map((task) => {
            const urgency = task.deadline ? urgencyOf(daysUntil(task.deadline)) : 'calm'
            const tint = DUE_TINTS[urgency]
            return (
              <div className="task-row" key={task.id}>
                <button
                  className="task-check"
                  onClick={() => onToggleTask(task.id)}
                  title="Toggle complete"
                  style={{
                    borderColor: task.done ? 'var(--color-accent)' : 'var(--color-neutral-600)',
                    background: task.done ? 'var(--color-accent)' : 'transparent',
                    color: task.done ? 'var(--color-bg)' : 'transparent',
                  }}
                >
                  <i className="ph ph-check" />
                </button>
                <div className="task-body">
                  <div className="task-heading">
                    <span
                      className="task-title"
                      style={{
                        color: task.done ? 'var(--ink-soft)' : 'var(--color-text)',
                        textDecoration: task.done ? 'line-through' : 'none',
                      }}
                    >
                      {task.title}
                    </span>
                    <span className="task-type">{task.type}</span>
                    {task.deadline && (
                      <span className="task-due" style={{ background: tint.bg, color: tint.fg }}>
                        <i className="ph ph-calendar-blank" />
                        {formatShortDate(task.deadline)}
                      </span>
                    )}
                  </div>
                  {task.notes && <div className="text-muted task-notes">{task.notes}</div>}
                </div>
                <button className="btn btn-ghost btn-icon task-delete" onClick={() => onRemoveTask(task.id)} title="Delete task">
                  <i className="ph ph-trash" />
                </button>
              </div>
            )
          })}
        </div>

        {selectedCourse.tasks.length === 0 && <p className="text-muted empty-state">Nothing here yet. Add the first task below.</p>}

        <form className="task-form" onSubmit={onAddTask}>
          <input
            className="input task-form-title"
            value={taskDraft.title}
            onChange={(e) => onTaskDraftChange('title', e.target.value)}
            placeholder="New task"
          />
          <select className="input task-form-type" value={taskDraft.type} onChange={(e) => onTaskDraftChange('type', e.target.value)}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="input task-form-date"
            type="date"
            value={taskDraft.deadline}
            onChange={(e) => onTaskDraftChange('deadline', e.target.value)}
          />
          <button className="btn btn-primary task-form-submit" type="submit">
            <i className="ph ph-plus" /> Add
          </button>
          <input
            className="input task-form-notes"
            value={taskDraft.notes}
            onChange={(e) => onTaskDraftChange('notes', e.target.value)}
            placeholder="Notes (optional)"
          />
        </form>
      </section>

      <aside className="deadlines-aside">
        <div className="deadlines-card">
          <h6>Upcoming deadlines</h6>
          <div className="deadlines-list">
            {upcoming.map((u) => {
              const urgency = urgencyOf(u.daysAway)
              const fg = DUE_TINTS[urgency].fg
              const mark = urgency === 'calm' ? 'var(--color-divider)' : 'var(--color-accent)'
              return (
                <div className="deadline-row" key={u.id}>
                  <div className="deadline-mark" style={{ background: mark }} />
                  <div className="deadline-copy">
                    <div className="deadline-title">{u.title}</div>
                    <div className="text-muted deadline-course">{u.course}</div>
                    <div className="deadline-when" style={{ color: fg }}>
                      {formatShortDate(u.deadline)} · {relativeDeadlineLabel(u.daysAway)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {upcoming.length === 0 && <p className="text-muted deadlines-empty">No dated tasks left.</p>}
        </div>
      </aside>
    </div>
  )
}
