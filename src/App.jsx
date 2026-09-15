import Sidebar from './components/Sidebar.jsx'
import PlannerView from './components/PlannerView.jsx'
import FocusView from './components/FocusView.jsx'
import { DURATIONS, useCoursePlanner } from './hooks/useCoursePlanner.js'

export default function App() {
  const planner = useCoursePlanner()

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
        doneToday={planner.timer.doneToday}
        courses={planner.courses}
        selectedId={planner.selectedCourse.id}
        onSelectCourse={planner.selectCourse}
        onRemoveCourse={planner.removeCourse}
        newCourseName={planner.newCourseName}
        onNewCourseNameChange={planner.setNewCourseName}
        onAddCourse={planner.addCourse}
      />
      <main className="main">
        {planner.view === 'planner' ? (
          <PlannerView
            selectedCourse={planner.selectedCourse}
            onToggleTask={planner.toggleTask}
            onRemoveTask={planner.removeTask}
            taskDraft={planner.taskDraft}
            onTaskDraftChange={planner.setTaskDraftField}
            onAddTask={planner.addTask}
            upcoming={planner.upcoming}
          />
        ) : (
          <FocusView
            timer={planner.timer}
            durations={DURATIONS}
            onSetMode={planner.setMode}
            onToggleRun={planner.toggleRun}
            onReset={planner.resetTimer}
            onSkip={planner.skipMode}
            linked={planner.linked}
            onSetLinked={planner.setLinked}
            openTasks={planner.openTasks}
          />
        )}
      </main>
    </div>
  )
}
