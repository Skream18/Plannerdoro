import RingProgress from './RingProgress.jsx'

const MODES = [
  ['focus', 'Focus'],
  ['short', 'Short break'],
  ['long', 'Long break'],
]

const MODE_LABELS = { focus: 'Focus session', short: 'Short break', long: 'Long break' }

export default function FocusView({ timer, durations, onSetMode, onToggleRun, onReset, onSkip, linked, onSetLinked, openTasks }) {
  const total = durations[timer.mode]
  const left = timer.left
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  const elapsedRatio = total ? (total - left) / total : 0
  const runLabel = timer.running ? 'Pause' : left === total ? 'Start' : 'Resume'
  const tomatoCount = Math.max(4, timer.doneToday)

  return (
    <div className="focus-view">
      <div className="mode-switch">
        {MODES.map(([key, label]) => (
          <button
            key={key}
            className="mode-btn"
            onClick={() => onSetMode(key)}
            style={{
              background: timer.mode === key ? 'var(--tint-accent)' : 'transparent',
              color: timer.mode === key ? 'var(--color-text)' : 'var(--ink-soft)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <RingProgress value={elapsedRatio} viewBoxSize={320} displaySize={320} radius={144} strokeWidth={2} transitionMs={900} transitionEasing="linear">
        <div className="timer-clock">
          {mm}:{ss}
        </div>
        <div className="text-muted timer-mode-label">{MODE_LABELS[timer.mode]}</div>
      </RingProgress>

      <div className="timer-controls">
        <button className="btn btn-primary timer-run" onClick={onToggleRun}>
          <i className={`ph ${timer.running ? 'ph-pause' : 'ph-play'}`} /> {runLabel}
        </button>
        <button className="btn btn-secondary" onClick={onReset}>
          <i className="ph ph-arrow-counter-clockwise" /> Reset
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>
          <i className="ph ph-skip-forward" /> Skip
        </button>
      </div>

      <div className="linked-task">
        <label className="text-muted linked-label">Working on</label>
        <select className="input linked-select" value={linked} onChange={(e) => onSetLinked(e.target.value)}>
          <option value="">Nothing in particular</option>
          {openTasks.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="tomatoes">
          {Array.from({ length: tomatoCount }, (_, i) => (
            <span key={i} className="tomato" style={{ background: i < timer.doneToday ? 'var(--color-accent)' : 'transparent' }} />
          ))}
          <span className="text-muted tomatoes-count">{timer.doneToday} today</span>
        </div>
      </div>
    </div>
  )
}
