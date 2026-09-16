import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import PlannerView from './components/PlannerView.jsx'
import FocusView from './components/FocusView.jsx'
import TodayView from './components/TodayView.jsx'
import ExportModal from './components/ExportModal.jsx'
import Toast from './components/Toast.jsx'
import { useCoursePlanner } from './hooks/useCoursePlanner.js'
import { primeAudio } from './utils/sound.js'

export default function App() {
  const planner = useCoursePlanner()
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e) {
      const target = e.target
      const isTyping =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      if (isTyping) return

      if (e.key === '1') return planner.setView('planner')
      if (e.key === '2') return planner.setView('today')
      if (e.key === '3') return planner.setView('focus')
      if (e.key.toLowerCase() === 't') return planner.toggleTheme()
      if (e.key.toLowerCase() === 'e') return setExportOpen(true)
      if (e.key === ' ' && planner.view === 'focus' && planner.focusTab === 'timer') {
        e.preventDefault()
        if (!planner.timer.running) primeAudio()
        planner.toggleRun()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [planner])

  return (
    <div className="app-shell">
      <Sidebar
        theme={planner.theme}
        onToggleTheme={planner.toggleTheme}
        view={planner.view}
        onSetView={planner.setView}
        completionRatio={planner.completionRatio}
        doneCount={planner.doneCount}
        totalCount={planner.totalCount}
        todayFocusCount={planner.timer.todayFocusCount}
        streak={planner.streak}
        onOpenExport={() => setExportOpen(true)}
        courses={planner.courses}
        selectedId={planner.selectedCourse.id}
        onSelectCourse={planner.selectCourse}
        onRemoveCourse={planner.removeCourse}
        newCourseName={planner.newCourseName}
        onNewCourseNameChange={planner.setNewCourseName}
        onAddCourse={planner.addCourse}
      />
      <main className="main">
        {planner.view === 'planner' && (
          <PlannerView
            selectedCourse={planner.selectedCourse}
            onToggleTask={planner.toggleTask}
            onRemoveTask={planner.removeTask}
            taskDraft={planner.taskDraft}
            onTaskDraftChange={planner.setTaskDraftField}
            onAddTask={planner.addTask}
            upcoming={planner.upcoming}
          />
        )}
        {planner.view === 'today' && (
          <TodayView
            entries={planner.todayEntries}
            onToggleEntry={planner.toggleTodayEntry}
            onRemoveEntry={planner.removeTodayEntry}
            pickOptions={planner.todayPickOptions}
            pickId={planner.todayPickId}
            onSetPickId={planner.setTodayPickId}
            onAddExisting={planner.addExistingToToday}
            standaloneDraft={planner.standaloneDraft}
            onStandaloneDraftChange={planner.setStandaloneDraftField}
            onAddStandalone={planner.addStandaloneToday}
          />
        )}
        {planner.view === 'focus' && (
          <FocusView
            focusTab={planner.focusTab}
            onSetFocusTab={planner.setFocusTab}
            timer={planner.timer}
            durations={planner.durations}
            settings={planner.settings}
            onSetMode={planner.setMode}
            onToggleRun={planner.toggleRun}
            onReset={planner.resetTimer}
            onSkip={planner.skipMode}
            onUpdateSettings={planner.updateSettings}
            linked={planner.linked}
            onSetLinked={planner.setLinked}
            openTasks={planner.openTasks}
            todayFocusCount={planner.timer.todayFocusCount}
            stopwatchRunning={planner.stopwatch.running}
            stopwatchElapsedMs={planner.stopwatchElapsedMs}
            onToggleStopwatch={planner.toggleStopwatch}
            onResetStopwatch={planner.resetStopwatch}
            onLap={planner.addLap}
            laps={planner.laps}
            sessions={planner.sessions}
            sessionStats={planner.sessionStats}
            streak={planner.streak}
          />
        )}
      </main>
      <ExportModal open={exportOpen} courses={planner.courses} todayEntries={planner.todayEntries} onClose={() => setExportOpen(false)} />
      <Toast toast={planner.toast} onDismiss={planner.dismissToast} />
    </div>
  )
}
