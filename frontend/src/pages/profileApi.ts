import { apiFetch } from '../shared/api/apiFetch'
import { getAuthError, type AuthResponse } from './authApi'

type ProfileResponse = { user: AuthResponse['user'] }

async function profileRequest(endpoint: string, options: RequestInit = {}): Promise<ProfileResponse> {
  const response = await apiFetch(endpoint, options)
  if (!response.ok) throw new Error(await getAuthError(response))
  return (await response.json()) as ProfileResponse
}

export async function getProfile(): Promise<ProfileResponse> {
  return profileRequest('/api/auth/me')
}

export async function updateProfile(displayName: string): Promise<ProfileResponse> {
  return profileRequest('/api/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
}
