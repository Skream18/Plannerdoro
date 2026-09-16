import { useState } from 'react'
import { daysUntil, formatFullDate, formatShortDate, relativeDeadlineLabel, urgencyOf } from '../utils/date.js'
import PriorityDot from './PriorityDot.jsx'

const TASK_TYPES = ['Lecture', 'Tutorial', 'Assignment', 'Reading', 'Topic']
const PRIORITIES = [
  ['low', 'Low priority'],
  ['medium', 'Medium priority'],
  ['high', 'High priority'],
]

const DUE_TINTS = {
  over: { bg: 'var(--tint-accent)', fg: 'var(--color-accent-400)' },
  soon: { bg: 'var(--tint-accent)', fg: 'var(--on-tint)' },
  calm: { bg: 'var(--tint-neutral)', fg: 'var(--ink-soft)' },
}

// Keeps a drag from turning into a text selection while the pointer moves across rows.
function lockTextSelection(locked) {
  document.body.style.userSelect = locked ? 'none' : ''
}

export default function PlannerView({
  selectedCourse,
  onToggleTask,
  onRemoveTask,
  onReorderTasks,
  taskDraft,
  onTaskDraftChange,
  onAddTask,
  upcoming,
}) {
  const selDone = selectedCourse.tasks.filter((t) => t.done).length
  const [dragId, setDragId] = useState(null)

  // Pointer-based drag reorder (works for mouse and touch alike, unlike native HTML5 drag-and-drop).
  // Listeners are attached synchronously inside the pointerdown handler itself — not in a useEffect
  // keyed off state — so a pointermove arriving a frame later (well before React re-renders) is
  // never missed.
  function handleDragStart(e, taskId) {
    e.preventDefault()
    const courseId = selectedCourse.id
    setDragId(taskId)
    lockTextSelection(true)

    function handleMove(moveEvent) {
      const row = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('[data-task-id]')
      const overId = row?.dataset.taskId
      if (overId && overId !== taskId) onReorderTasks(courseId, taskId, overId)
    }
    function handleEnd() {
      setDragId(null)
      lockTextSelection(false)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
  }

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
              <div
                className={`task-row${dragId === task.id ? ' task-row-dragging' : ''}`}
                key={task.id}
                data-task-id={task.id}
              >
                <span
                  className="task-drag-handle"
                  onPointerDown={(e) => handleDragStart(e, task.id)}
                  title="Drag to reorder"
                  aria-label="Drag to reorder"
                >
                  <i className="ph ph-dots-six-vertical" />
                </span>
                <button
                  className="task-check"
                  onClick={() => onToggleTask(selectedCourse.id, task.id)}
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
                    <PriorityDot priority={task.priority} />
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
                <button
                  className="btn btn-ghost btn-icon task-delete"
                  onClick={() => onRemoveTask(selectedCourse.id, task.id)}
                  title="Delete task"
                >
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
          <select
            className="input task-form-priority"
            value={taskDraft.priority}
            onChange={(e) => onTaskDraftChange('priority', e.target.value)}
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
