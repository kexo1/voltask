import { requestWorkspace } from '../../../pages/workspaceApi'
import type { TaskCreateData } from '../components/TaskCreateForm'
import type { TaskStatus } from '../types/task'

export type ProjectTask = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  projectId: string
  assigneeId: string | null
}

export function getTasks(projectId: string) {
  return requestWorkspace<ProjectTask[]>(`/tasks?projectId=${encodeURIComponent(projectId)}`)
}

export function createTask(projectId: string, data: TaskCreateData) {
  return requestWorkspace<ProjectTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify({ ...data, projectId }),
  })
}

export function updateTaskStatus(projectId: string, taskId: string, status: TaskStatus) {
  return requestWorkspace<ProjectTask>(`/tasks/${encodeURIComponent(taskId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ projectId, status }),
  })
}

export function deleteTask(projectId: string, taskId: string) {
  return requestWorkspace<{ success: true }>(
    `/tasks/${encodeURIComponent(taskId)}?projectId=${encodeURIComponent(projectId)}`,
    { method: 'DELETE' },
  )
}
