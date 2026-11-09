export type AuthResponse = { user: { id: string; email: string; displayName: string; createdAt: string }; accessToken: string }

export async function getAuthError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message
      if (Array.isArray(message)) return message.join(', ')
      if (typeof message === 'string') return message
    }
  } catch { /* Použi všeobecnú správu, ak API nevrátilo JSON. */ }
  return 'Požiadavku sa nepodarilo dokončiť. Skúste to znova.'
}

export async function submitAuthRequest(endpoint: string, payload: Record<string, string>): Promise<AuthResponse> {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error(await getAuthError(response))
  return (await response.json()) as AuthResponse
}
