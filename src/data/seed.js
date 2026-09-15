import { uid } from '../utils/id.js'

export const SEED_COURSES = [
  {
    name: 'Managing Software Projects',
    tasks: [
      { title: 'Lecture 1', type: 'Lecture' },
      { title: 'Lecture 2', type: 'Lecture' },
      {
        title: 'Project Charter',
        type: 'Assignment',
        deadline: '2026-10-15',
        notes: 'Understand it and submit on 15th Oct',
        priority: 'high',
      },
    ],
  },
  {
    name: 'Operating System',
    tasks: [
      { title: 'Lecture 1', type: 'Lecture' },
      { title: 'Lecture 2', type: 'Lecture' },
      { title: 'Tutorial 1', type: 'Tutorial' },
      { title: 'Tutorial 2', type: 'Tutorial', notes: 'Sunday' },
    ],
  },
  {
    name: 'AI for Software Engineering',
    tasks: [
      { title: 'Lecture 1', type: 'Lecture' },
      { title: 'Lecture 2', type: 'Lecture' },
      { title: 'Tutorial 1', type: 'Tutorial' },
      { title: 'Tutorial 2', type: 'Tutorial' },
    ],
  },
  {
    name: 'Psychology for Young Professionals',
    tasks: [
      { title: 'Personality', type: 'Topic' },
      { title: 'Motivation/Emotions', type: 'Topic' },
    ],
  },
  {
    name: 'Design and Analysis of Algorithms',
    tasks: [
      { title: 'Lecture 1', type: 'Lecture' },
      { title: 'Lecture 2', type: 'Lecture' },
    ],
  },
]

export function createSeedCourses() {
  return SEED_COURSES.map((course) => ({
    id: uid(),
    name: course.name,
    tasks: course.tasks.map((task) => ({
      id: uid(),
      title: task.title,
      type: task.type,
      deadline: task.deadline || '',
      notes: task.notes || '',
      priority: task.priority || 'medium',
      done: false,
      completedAt: null,
    })),
  }))
}
