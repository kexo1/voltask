import { requestWorkspace } from '../../../pages/workspaceApi'
import type { TaskCreateData } from '../components/TaskCreateForm'
import type {
  TaskDependencyItem,
  TaskDependentItem,
  TaskStatus,
} from '../types/task'

export type ProjectTask = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  projectId: string
  assigneeId: string | null
  dependencies?: TaskDependencyItem[]
  dependents?: TaskDependentItem[]
}

export type TaskUpdateData = {
  title?: string
  description?: string | null
  status?: TaskStatus
  assigneeId?: string | null
}

export function getTasks(projectId: string, page = 1, limit = 100) {
  const params = new URLSearchParams({
    projectId,
    page: String(page),
    limit: String(limit),
  })
  return requestWorkspace<ProjectTask[]>(`/tasks?${params.toString()}`)
}

export function createTask(projectId: string, data: TaskCreateData) {
  return requestWorkspace<ProjectTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify({ ...data, projectId }),
  })
}

export function updateTask(projectId: string, taskId: string, data: TaskUpdateData) {
  return requestWorkspace<ProjectTask>(`/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...data, projectId }),
  })
}

export function updateTaskStatus(projectId: string, taskId: string, status: TaskStatus) {
  return requestWorkspace<ProjectTask>(`/tasks/${encodeURIComponent(taskId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ projectId, status }),
  })
}

export function addTaskDependency(
  projectId: string,
  taskId: string,
  dependsOnId: string,
) {
  return requestWorkspace<ProjectTask>(
    `/tasks/${encodeURIComponent(taskId)}/dependencies`,
    {
      method: 'POST',
      body: JSON.stringify({ projectId, dependsOnId }),
    },
  )
}

export function removeTaskDependency(
  projectId: string,
  taskId: string,
  dependsOnId: string,
) {
  return requestWorkspace<ProjectTask>(
    `/tasks/${encodeURIComponent(taskId)}/dependencies/${encodeURIComponent(dependsOnId)}?projectId=${encodeURIComponent(projectId)}`,
    { method: 'DELETE' },
  )
}

export function deleteTask(projectId: string, taskId: string) {
  return requestWorkspace<{ success: true }>(
    `/tasks/${encodeURIComponent(taskId)}?projectId=${encodeURIComponent(projectId)}`,
    { method: 'DELETE' },
  )
}
