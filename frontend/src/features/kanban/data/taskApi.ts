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
async function requestApi(path: string, options: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(options.headers)

  if (options.body) headers.set('Content-Type', 'application/json')

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })
  if (!response.ok) throw new Error(await getAuthError(response))
  return response.json()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
