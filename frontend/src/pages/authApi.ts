export type AuthUser = {
  id: string
  email: string
  displayName: string
  createdAt: string
}

export type AuthResponse = { user: AuthUser }

function isAuthUser(value: unknown): value is AuthUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'displayName' in value &&
    typeof value.displayName === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  )
}

function parseAuthUserResponse(value: unknown): AuthUser {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('user' in value) ||
    !isAuthUser(value.user)
  ) {
    throw new Error('API vrátilo neplatné údaje používateľa.')
  }
  return value.user
}

export async function getAuthError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message
      if (Array.isArray(message)) return message.join(', ')
      if (typeof message === 'string') return message
    }
  } catch { /* Keep a generic message when the API response is not JSON. */ }
  return 'Požiadavku sa nepodarilo dokončiť. Skúste to znova.'
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', { credentials: 'include' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error(await getAuthError(response))

  return parseAuthUserResponse(await response.json())
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error(await getAuthError(response))
}

export async function submitAuthRequest(
  endpoint: string,
  payload: Record<string, string | boolean>,
): Promise<AuthResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await getAuthError(response))

  return { user: parseAuthUserResponse(await response.json()) }
}
