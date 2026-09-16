import { formatMinutes, formatTimestamp } from '../utils/date.js'

export default function StatsPage({ completedLog, streak, timer }) {
  const loggedMinutes = completedLog.filter((x) => x.kind === 'session').reduce((sum, x) => sum + x.minutes, 0)
  const liveMinutes = timer.mode === 'focus' ? timer.elapsedFocusSeconds / 60 : 0
  const totalPomodoroMinutes = loggedMinutes + liveMinutes
  const totalTasksCompleted = completedLog.filter((x) => x.kind === 'task').length

  return (
    <div className="history-view">
      <div className="text-muted planner-eyebrow">All-time</div>
      <h2 className="planner-title stats-title">Stats</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{formatMinutes(totalPomodoroMinutes)}</div>
          <div className="text-muted stat-label">Total pomodoro time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalTasksCompleted}</div>
          <div className="text-muted stat-label">Tasks completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            <i className="ph ph-fire" /> {streak}
          </div>
          <div className="text-muted stat-label">Day streak</div>
        </div>
      </div>

      <div className="history-list">
        {completedLog.map((item) => (
          <div className="history-row" key={`${item.kind}-${item.id}`}>
            <i className={`ph ${item.kind === 'session' ? 'ph-timer' : 'ph-check-circle'} stats-row-icon`} />
            <div className="history-copy">
              <div className="history-title">{item.kind === 'session' ? `Focus session · ${formatMinutes(item.minutes)}` : item.title}</div>
              {item.kind === 'task' && item.courseName && <div className="text-muted history-linked">{item.courseName}</div>}
              {item.kind === 'session' && item.linkedLabel && <div className="text-muted history-linked">{item.linkedLabel}</div>}
            </div>
            <div className="text-muted history-when">{formatTimestamp(item.completedAt)}</div>
          </div>
        ))}
      </div>
      {completedLog.length === 0 && (
        <p className="text-muted empty-state">Nothing completed yet — finish a task or a focus session to see it here.</p>
      )}
    </div>
  )
}
