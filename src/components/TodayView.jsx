import { formatFullDate } from '../utils/date.js'
import PriorityDot from './PriorityDot.jsx'

const PRIORITIES = [
  ['low', 'Low priority'],
  ['medium', 'Medium priority'],
  ['high', 'High priority'],
]

export default function TodayView({
  entries,
  onToggleEntry,
  onRemoveEntry,
  pickOptions,
  pickId,
  onSetPickId,
  onAddExisting,
  standaloneDraft,
  onStandaloneDraftChange,
  onAddStandalone,
}) {
  const doneCount = entries.filter((e) => e.done).length

  return (
    <div className="planner-layout">
      <section className="planner-main">
        <div className="text-muted planner-eyebrow">{formatFullDate(new Date())}</div>
        <h2 className="planner-title">Today's Tasks</h2>
        <p className="text-muted planner-summary">{entries.length ? `${doneCount} of ${entries.length} done` : 'Nothing planned yet'}</p>

        <div className="task-list">
          {entries.map((entry) => (
            <div className="task-row" key={entry.id}>
              <button
                className="task-check"
                onClick={() => onToggleEntry(entry.id)}
                title="Toggle complete"
                style={{
                  borderColor: entry.done ? 'var(--color-accent)' : 'var(--color-neutral-600)',
                  background: entry.done ? 'var(--color-accent)' : 'transparent',
                  color: entry.done ? 'var(--color-bg)' : 'transparent',
                }}
              >
                <i className="ph ph-check" />
              </button>
              <div className="task-body">
                <div className="task-heading">
                  <PriorityDot priority={entry.priority} />
                  <span
                    className="task-title"
                    style={{
                      color: entry.done ? 'var(--ink-soft)' : 'var(--color-text)',
                      textDecoration: entry.done ? 'line-through' : 'none',
                    }}
                  >
                    {entry.title}
                  </span>
                  <span className="task-type">{entry.courseName || 'Quick task'}</span>
                </div>
                {entry.notes && <div className="text-muted task-notes">{entry.notes}</div>}
              </div>
              <button
                className="btn btn-ghost btn-icon task-delete"
                onClick={() => onRemoveEntry(entry.id)}
                title={entry.kind === 'existing' ? 'Remove from today' : 'Delete task'}
              >
                <i className={`ph ${entry.kind === 'existing' ? 'ph-x' : 'ph-trash'}`} />
              </button>
            </div>
          ))}
        </div>

        {entries.length === 0 && <p className="text-muted empty-state">Nothing planned for today yet. Add a task below.</p>}

        <form className="task-form today-pick-form" onSubmit={onAddExisting}>
          <select className="input today-pick-select" value={pickId} onChange={(e) => onSetPickId(e.target.value)}>
            <option value="">Choose an existing task…</option>
            {pickOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary task-form-submit" type="submit" disabled={!pickId}>
            <i className="ph ph-plus" /> Add to today
          </button>
        </form>

        <form className="task-form" onSubmit={onAddStandalone}>
          <input
            className="input task-form-title"
            value={standaloneDraft.title}
            onChange={(e) => onStandaloneDraftChange('title', e.target.value)}
            placeholder="Create a new task"
          />
          <select
            className="input task-form-priority"
            value={standaloneDraft.priority}
            onChange={(e) => onStandaloneDraftChange('priority', e.target.value)}
            aria-label="Priority"
          >
            {PRIORITIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button className="btn btn-primary task-form-submit" type="submit">
            <i className="ph ph-plus" /> Add
          </button>
          <input
            className="input task-form-notes"
            value={standaloneDraft.notes}
            onChange={(e) => onStandaloneDraftChange('notes', e.target.value)}
            placeholder="Notes (optional)"
          />
        </form>
      </section>
    </div>
  )
}
