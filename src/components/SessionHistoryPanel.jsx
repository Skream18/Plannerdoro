import { formatMinutes, formatTimestamp } from '../utils/date.js'

const MODE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' }

export default function SessionHistoryPanel({ sessions, sessionStats, streak, todayFocusCount }) {
  const reversed = [...sessions].reverse()

  return (
    <div className="history-view">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{sessionStats.totalFocusSessions}</div>
          <div className="text-muted stat-label">Focus sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatMinutes(sessionStats.totalFocusMinutes)}</div>
          <div className="text-muted stat-label">Hours tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{todayFocusCount}</div>
          <div className="text-muted stat-label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            <i className="ph ph-fire" /> {streak}
          </div>
          <div className="text-muted stat-label">Day streak</div>
        </div>
      </div>

      <div className="history-list">
        {reversed.map((s) => (
          <div className="history-row" key={s.id}>
            <span className={`history-mode-dot history-mode-${s.mode}`} />
            <div className="history-copy">
              <div className="history-title">
                {MODE_LABEL[s.mode]} · {formatMinutes(s.minutes)}
              </div>
              {s.linkedLabel && <div className="text-muted history-linked">{s.linkedLabel}</div>}
            </div>
            <div className="text-muted history-when">{formatTimestamp(s.completedAt)}</div>
          </div>
        ))}
      </div>
      {sessions.length === 0 && <p className="text-muted empty-state">No sessions yet — complete a focus session to see it here.</p>}
    </div>
  )
}
