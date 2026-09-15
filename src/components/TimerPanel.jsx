import { useState } from 'react'
import RingProgress from './RingProgress.jsx'
import { formatClock } from '../utils/date.js'
import { primeAudio } from '../utils/sound.js'

const MODES = [
  ['focus', 'Focus'],
  ['short', 'Short break'],
  ['long', 'Long break'],
]

const MODE_LABELS = { focus: 'Focus session', short: 'Short break', long: 'Long break' }
const SETTING_FIELDS = [
  ['focusMinutes', 'Focus'],
  ['shortMinutes', 'Short break'],
  ['longMinutes', 'Long break'],
]

export default function TimerPanel({
  timer,
  durations,
  settings,
  onSetMode,
  onToggleRun,
  onReset,
  onSkip,
  onUpdateSettings,
  linked,
  onSetLinked,
  openTasks,
  todayFocusCount,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const total = durations[timer.mode]
  const left = timer.left
  const elapsedRatio = total ? (total - left) / total : 0
  const runLabel = timer.running ? 'Pause' : left === total ? 'Start' : 'Resume'
  const tomatoCount = Math.max(4, todayFocusCount)

  function handleToggleRun() {
    if (!timer.running) primeAudio()
    onToggleRun()
  }

  return (
    <div className="focus-view">
      <div className="timer-toprow">
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
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setSettingsOpen((v) => !v)}
          title="Timer duration settings"
          aria-label="Timer duration settings"
        >
          <i className="ph ph-sliders-horizontal" />
        </button>
      </div>

      {settingsOpen && (
        <div className="timer-settings">
          {SETTING_FIELDS.map(([field, label]) => (
            <label className="timer-setting" key={field}>
              <span className="text-muted">{label}</span>
              <input
                className="input"
                type="number"
                min={1}
                max={180}
                value={settings[field]}
                onChange={(e) => onUpdateSettings(field, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}

      <RingProgress value={elapsedRatio} viewBoxSize={320} displaySize={320} radius={144} strokeWidth={2} transitionMs={900} transitionEasing="linear">
        <div className="timer-clock">{formatClock(left)}</div>
        <div className="text-muted timer-mode-label">{MODE_LABELS[timer.mode]}</div>
      </RingProgress>

      <div className="timer-controls">
        <button className="btn btn-primary timer-run" onClick={handleToggleRun}>
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
            <span key={i} className="tomato" style={{ background: i < todayFocusCount ? 'var(--color-accent)' : 'transparent' }} />
          ))}
          <span className="text-muted tomatoes-count">{todayFocusCount} today</span>
        </div>
      </div>
    </div>
  )
}
