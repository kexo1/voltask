import { getAuthError } from '../../../pages/authApi'
import type { Task, TaskStatus } from '../types/task'
import type { TeamMember } from '../components/TaskCreateForm'

export type KanbanTeam = {
  id: string
  name: string
}

async function requestApi(path: string, options: RequestInit = {}): Promise<unknown> {
  const token = localStorage.getItem('accessToken')
  const headers = new Headers(options.headers)

  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(path, { ...options, headers })
  if (!response.ok) throw new Error(await getAuthError(response))
  return response.json()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Validate the API response before it enters the board state.
function parseTeams(data: unknown): KanbanTeam[] {
  if (!Array.isArray(data)) throw new Error('API vratilo neplatny zoznam timov.')

  return data.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string'
    ) {
      throw new Error('API vratilo neplatne udaje timu.')
    }

    return { id: item.id, name: item.name }
  })
}

function parseMembers(data: unknown): TeamMember[] {
  if (!isRecord(data) || !Array.isArray(data.members)) {
    throw new Error('API vratilo neplatne udaje clena timu.')
  }

  return data.members.map((membership: unknown) => {
    if (
      !isRecord(membership) ||
      !isRecord(membership.user) ||
      typeof membership.user.id !== 'string' ||
      typeof membership.user.displayName !== 'string'
    ) {
      throw new Error('API vratilo neplatne udaje clena timu.')
    }

    return {
      id: membership.user.id,
      displayName: membership.user.displayName,
    }
  })
}

function parseTask(data: unknown, teamId: string, members: TeamMember[]): Task {
  if (
    !isRecord(data) ||
    typeof data.id !== 'string' ||
    typeof data.title !== 'string' ||
    !['TODO', 'IN_PROGRESS', 'DONE'].includes(String(data.status))
  ) {
    throw new Error('API vratilo neplatne udaje ulohy.')
  }

  const assigneeId = typeof data.assigneeId === 'string' ? data.assigneeId : null
  const relationAssignee =
    isRecord(data.assignee) && typeof data.assignee.id === 'string'
      ? data.assignee
      : null
  const assignee = relationAssignee
    ? {
        id: relationAssignee.id as string,
        displayName:
          typeof relationAssignee.displayName === 'string'
            ? relationAssignee.displayName
            : 'Neznamy riesitel',
      }
    : assigneeId
      ? members.find((member) => member.id === assigneeId) ?? {
          id: assigneeId,
          displayName: 'Neznamy riesitel',
        }
      : null

  return {
    id: data.id,
    title: data.title,
    description: typeof data.description === 'string' ? data.description : null,
    status: data.status as TaskStatus,
    teamId: typeof data.teamId === 'string' ? data.teamId : teamId,
    assignee,
  }
}

export async function getTeams(): Promise<KanbanTeam[]> {
  return parseTeams(await requestApi('/api/teams'))
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  return parseMembers(
    await requestApi(`/api/teams/${encodeURIComponent(teamId)}`),
  )
}

export async function getTasks(teamId: string, members: TeamMember[]): Promise<Task[]> {
  const data = await requestApi(`/api/tasks?teamId=${encodeURIComponent(teamId)}`)
  if (!Array.isArray(data)) throw new Error('API vratilo neplatny zoznam uloh.')
  return data.map((task: unknown) => parseTask(task, teamId, members))
}

export async function createTask(
  teamId: string,
  members: TeamMember[],
  task: { title: string; description: string; assigneeId: string | null },
): Promise<Task> {
  const data = await requestApi('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ ...task, teamId }),
  })
  return parseTask(data, teamId, members)
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  await requestApi(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
