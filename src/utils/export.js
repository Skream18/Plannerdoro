const PRIORITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' }

export function buildExportText(courses, todayEntries = [], generatedAt = new Date()) {
  const lines = []
  lines.push('NOCTURNE COURSE PLANNER')
  lines.push(`Exported ${generatedAt.toLocaleString()}`)
  lines.push('='.repeat(48))

  if (todayEntries.length) {
    const todayDone = todayEntries.filter((t) => t.done).length
    lines.push('')
    lines.push(`TODAY — ${generatedAt.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} (${todayDone}/${todayEntries.length} complete)`)
    lines.push('-'.repeat(48))
    for (const entry of todayEntries) {
      const box = entry.done ? '[x]' : '[ ]'
      const meta = [`priority: ${PRIORITY_LABEL[entry.priority] || 'Medium'}`]
      if (entry.courseName) meta.push(`course: ${entry.courseName}`)
      lines.push(`  ${box} ${entry.title}  (${meta.join(', ')})`)
      if (entry.notes) lines.push(`      note: ${entry.notes}`)
    }
    lines.push('')
    lines.push('='.repeat(48))
  }

  for (const course of courses) {
    const done = course.tasks.filter((t) => t.done).length
    lines.push('')
    lines.push(`${course.name} — ${done}/${course.tasks.length} complete`)
    lines.push('-'.repeat(`${course.name} — ${done}/${course.tasks.length} complete`.length))
    if (!course.tasks.length) {
      lines.push('  (no tasks)')
      continue
    }
    for (const task of course.tasks) {
      const box = task.done ? '[x]' : '[ ]'
      const meta = [`type: ${task.type}`, `priority: ${PRIORITY_LABEL[task.priority] || 'Medium'}`]
      if (task.deadline) meta.push(`due: ${task.deadline}`)
      lines.push(`  ${box} ${task.title}  (${meta.join(', ')})`)
      if (task.notes) lines.push(`      note: ${task.notes}`)
    }
  }

  const allTasks = courses.flatMap((c) => c.tasks)
  const doneCount = allTasks.filter((t) => t.done).length
  lines.push('')
  lines.push('='.repeat(48))
  lines.push(`Total: ${doneCount}/${allTasks.length} tasks complete across ${courses.length} course(s).`)

  return lines.join('\n')
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
