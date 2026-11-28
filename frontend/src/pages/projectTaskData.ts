import { getAllAccessibleTasks, type ProjectTask } from '../features/kanban/data/taskApi'
import { getProjects } from './workspaceApi'

export type ProjectTaskProgress = {
  completed: number
  total: number
}

export async function loadProjectsAndTasks() {
  const [projects, tasks] = await Promise.all([getProjects(), getAllAccessibleTasks()])
  const taskProgress: Record<string, ProjectTaskProgress> = {}
  for (const project of projects) {
    taskProgress[project.id] = { completed: 0, total: 0 }
  }

  for (const task of tasks) {
    const progress = taskProgress[task.projectId]
    if (!progress) continue
    progress.total += 1
    if (task.status === 'DONE') progress.completed += 1
  }

  return { projects, tasks, taskProgress }
}

export function getAssignedTasks(tasks: ProjectTask[], userId: string) {
  return tasks.filter((task) => task.assigneeId === userId)
}
