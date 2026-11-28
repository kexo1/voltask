import { apiFetch } from '../shared/api/apiFetch'
import { getAuthError } from './authApi'

export type Team = { id: string; name: string }
export type WorkspaceUser = { id: string; displayName: string }
export type TeamDetail = Team & {
  members: { role: 'OWNER' | 'MEMBER'; user: WorkspaceUser }[]
}
export type ProjectMember = { userId: string; user: WorkspaceUser }
export type Project = {
  id: string
  ownerId: string
  name: string
  description: string | null
  team: Team | null
  members: ProjectMember[]
  taskCount: number
}
export type DashboardSummary = { teamCount: number; projectCount: number; taskCount: number }

export async function requestWorkspace<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`/api${path}`, options)
  if (!response.ok) throw new Error(await getAuthError(response))
  return response.json() as Promise<T>
}

export function getTeams() {
  return requestWorkspace<Team[]>('/teams')
}

export function getTeam(id: string) {
  return requestWorkspace<TeamDetail>(`/teams/${encodeURIComponent(id)}`)
}

export function getProjects() {
  return requestWorkspace<Project[]>('/projects')
}

export async function getOwnedTeams(userId: string) {
  const teams = await getTeams()
  const details = await Promise.all(teams.map(({ id }) => getTeam(id)))
  return details.filter((team) =>
    team.members.some(({ role, user }) => role === 'OWNER' && user.id === userId),
  )
}

export function deleteProject(id: string) {
  return requestWorkspace<{ success: true }>(`/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function projectBoardPath(id: string) {
  return `/projects/${encodeURIComponent(id)}/board`
}
