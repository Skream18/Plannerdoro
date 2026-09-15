import RingProgress from './RingProgress.jsx'

export default function Sidebar({
  theme,
  onToggleTheme,
  view,
  onSetView,
  completionRatio,
  doneCount,
  totalCount,
  doneToday,
  courses,
  selectedId,
  onSelectCourse,
  onRemoveCourse,
  newCourseName,
  onNewCourseNameChange,
  onAddCourse,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">
          <i className="ph ph-moon-stars" />
        </div>
        <div className="brand-text">
          <div className="brand-title">Semester</div>
          <div className="brand-subtitle text-muted">Course planner</div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={onToggleTheme} title="Toggle light / dark">
          <i className={`ph ${theme === 'dark' ? 'ph-sun' : 'ph-moon'}`} />
        </button>
      </div>

      <div className="tab-switch">
        <button
          className="btn btn-ghost tab-btn"
          onClick={() => onSetView('planner')}
          style={{
            background: view === 'planner' ? 'var(--tint-accent)' : 'transparent',
            color: view === 'planner' ? 'var(--color-text)' : 'var(--ink-soft)',
          }}
        >
          <i className="ph ph-list-checks" /> Planner
        </button>
        <button
          className="btn btn-ghost tab-btn"
          onClick={() => onSetView('focus')}
          style={{
            background: view === 'focus' ? 'var(--tint-accent)' : 'transparent',
            color: view === 'focus' ? 'var(--color-text)' : 'var(--ink-soft)',
          }}
        >
          <i className="ph ph-timer" /> Focus
        </button>
      </div>

      <div className="progress-card">
        <RingProgress value={completionRatio} viewBoxSize={80} displaySize={76} radius={34} strokeWidth={6} transitionMs={500}>
          <span className="ring-label">{Math.round(completionRatio * 100)}%</span>
        </RingProgress>
        <div className="progress-copy">
          <div className="progress-count">
            {doneCount} of {totalCount}
          </div>
          <div className="text-muted progress-caption">tasks complete</div>
          <div className="progress-pomodoros">
            <i className="ph ph-fire" /> {doneToday} pomodoros today
          </div>
        </div>
      </div>

      <div className="courses-header">
        <h6>Courses</h6>
        <span className="text-muted">{courses.length}</span>
      </div>

      <div className="course-list">
        {courses.map((course) => {
          const done = course.tasks.filter((t) => t.done).length
          const active = course.id === selectedId
          const barWidth = course.tasks.length ? Math.round((done / course.tasks.length) * 100) : 0
          return (
            <div className="course-row" key={course.id}>
              <button
                className="course-btn"
                onClick={() => onSelectCourse(course.id)}
                style={{
                  background: active ? 'var(--tint-accent)' : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--ink-soft)',
                }}
              >
                <span className="course-btn-row">
                  <span className="course-name">{course.name}</span>
                  <span className="course-ratio">
                    {done}/{course.tasks.length}
                  </span>
                </span>
                <span className="course-bar-track">
                  <span className="course-bar-fill" style={{ width: `${barWidth}%` }} />
                </span>
              </button>
              <button className="btn btn-ghost btn-icon course-remove" onClick={() => onRemoveCourse(course.id)} title="Remove course">
                <i className="ph ph-x" />
              </button>
            </div>
          )
        })}
      </div>

      <form className="add-course-form" onSubmit={onAddCourse}>
        <input
          className="input"
          value={newCourseName}
          onChange={(e) => onNewCourseNameChange(e.target.value)}
          placeholder="Add a course"
        />
        <button className="btn btn-primary add-course-btn" type="submit">
          <i className="ph ph-plus" />
        </button>
      </form>
    </aside>
  )
}
