const AUTH_REFRESH_SKIP_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
])

let pendingRefresh: Promise<boolean> | null = null

async function refreshAuthSession(): Promise<boolean> {
  if (!pendingRefresh) {
    pendingRefresh = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        pendingRefresh = null
      })
  }

  return pendingRefresh
}

export async function apiFetch(input: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const requestInit: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  }

  const response = await fetch(input, requestInit)

  if (response.status !== 401 || AUTH_REFRESH_SKIP_PATHS.has(input)) {
    return response
  }

  const refreshed = await refreshAuthSession()
  if (!refreshed) {
    return response
  }

  return fetch(input, requestInit)
}
