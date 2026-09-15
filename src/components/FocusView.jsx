import TimerPanel from './TimerPanel.jsx'
import StopwatchPanel from './StopwatchPanel.jsx'
import SessionHistoryPanel from './SessionHistoryPanel.jsx'

const TABS = [
  ['timer', 'Timer'],
  ['stopwatch', 'Stopwatch'],
  ['history', 'History'],
]

export default function FocusView({
  focusTab,
  onSetFocusTab,
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
  stopwatchRunning,
  stopwatchElapsedMs,
  onToggleStopwatch,
  onResetStopwatch,
  onLap,
  laps,
  sessions,
  sessionStats,
  streak,
}) {
  return (
    <div className="focus-shell">
      <div className="focus-tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className="focus-tab-btn"
            onClick={() => onSetFocusTab(key)}
            style={{
              background: focusTab === key ? 'var(--tint-accent)' : 'transparent',
              color: focusTab === key ? 'var(--color-text)' : 'var(--ink-soft)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {focusTab === 'timer' && (
        <TimerPanel
          timer={timer}
          durations={durations}
          settings={settings}
          onSetMode={onSetMode}
          onToggleRun={onToggleRun}
          onReset={onReset}
          onSkip={onSkip}
          onUpdateSettings={onUpdateSettings}
          linked={linked}
          onSetLinked={onSetLinked}
          openTasks={openTasks}
          todayFocusCount={todayFocusCount}
        />
      )}
      {focusTab === 'stopwatch' && (
        <StopwatchPanel
          running={stopwatchRunning}
          elapsedMs={stopwatchElapsedMs}
          onToggle={onToggleStopwatch}
          onReset={onResetStopwatch}
          onLap={onLap}
          laps={laps}
        />
      )}
      {focusTab === 'history' && (
        <SessionHistoryPanel sessions={sessions} sessionStats={sessionStats} streak={streak} todayFocusCount={todayFocusCount} />
      )}
    </div>
  )
}
