import { formatStopwatchClock } from '../utils/date.js'

export default function StopwatchPanel({ running, elapsedMs, onToggle, onReset, onLap, laps }) {
  return (
    <div className="stopwatch-view">
      <div className="stopwatch-clock">{formatStopwatchClock(elapsedMs)}</div>
      <div className="timer-controls">
        <button className="btn btn-primary timer-run" onClick={onToggle}>
          <i className={`ph ${running ? 'ph-pause' : 'ph-play'}`} /> {running ? 'Pause' : elapsedMs > 0 ? 'Resume' : 'Start'}
        </button>
        <button className="btn btn-secondary" onClick={onLap} disabled={!running}>
          <i className="ph ph-flag" /> Lap
        </button>
        <button className="btn btn-ghost" onClick={onReset}>
          <i className="ph ph-arrow-counter-clockwise" /> Reset
        </button>
      </div>
      {laps.length > 0 && (
        <div className="lap-list">
          {laps.map((lap, i) => (
            <div className="lap-row" key={lap.id}>
              <span className="text-muted">Lap {laps.length - i}</span>
              <span className="lap-time">{formatStopwatchClock(lap.ms)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
