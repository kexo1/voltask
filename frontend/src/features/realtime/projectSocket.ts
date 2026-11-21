import { io } from 'socket.io-client'

// Stavy spojenia a udalosti, ktore moze odoberat board alebo UI upozorneni.
export type ProjectConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export type ProjectSocketHandlers = {
  onStatusChange?: (status: ProjectConnectionStatus) => void
  onTaskCreated?: (task: unknown) => void
  onTaskUpdated?: (task: unknown) => void
  onTaskDeleted?: (event: { projectId: string; taskId: string }) => void
  onReconnected?: () => void
}

export type ProjectSocketConnection = {
  disconnect: () => void
}

// Obmedzenia cakani na pripojenie, join a dalsi pokus o spojenie.
const JOIN_TIMEOUT_MS = 10_000
const INITIAL_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 30_000

// Overi zakladny tvar dat prijatych zo servera.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Rozpozna chybu autentifikacie, pri ktorej treba obnovit cookie session.
function isAuthenticationError(error: Error): boolean {
  return /authentication is required|unauthorized|\b401\b/i.test(error.message)
}

// Obnovi session cez cookie; token sa necita ani neposiela z JavaScriptu.
async function refreshSession(): Promise<void> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Authentication refresh failed.')
  }
}

// Vytvori spojenie s projektovou room a poskytne ho odberatelom udalosti.
export function connectProjectSocket(
  projectId: string,
  handlers: ProjectSocketHandlers,
): ProjectSocketConnection {
  if (!projectId.trim()) {
    throw new Error('A project ID is required to connect.')
  }

  // Cookie autentifikacia sa odosiela browserom; reconnect riadi tato vrstva.
  const socket = io({
    autoConnect: false,
    reconnection: false,
    withCredentials: true,
  })

  // Premenne riadia ukoncenie spojenia, refresh a casovanie reconnectov.
  let disposed = false
  let terminal = false
  let hasJoined = false
  let refreshAttempted = false
  let refreshing = false
  let reconnectDelay = INITIAL_RECONNECT_DELAY_MS
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined
  let joinTimer: ReturnType<typeof setTimeout> | undefined

  // Stav sa neposiela po odpojeni odberatela.
  const setStatus = (status: ProjectConnectionStatus) => {
    if (!disposed) handlers.onStatusChange?.(status)
  }

  // Zrusi cakajuce casovace pri odpojeni alebo chybe.
  const clearReconnectTimer = () => {
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
    }
  }

  const clearJoinTimer = () => {
    if (joinTimer !== undefined) {
      clearTimeout(joinTimer)
      joinTimer = undefined
    }
  }

  // Pri trvalej chybe zastavi pokusy o pripojenie a oznami stav UI.
  const stopWithError = () => {
    terminal = true
    clearReconnectTimer()
    clearJoinTimer()
    setStatus('error')
    socket.disconnect()
  }

  // Pri docasnej chybe skusa spojenie znovu s rastucim, ohranicenym odstupom.
  const scheduleReconnect = () => {
    if (disposed || terminal || reconnectTimer !== undefined) return

    setStatus(window.navigator.onLine ? 'connecting' : 'disconnected')
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      if (disposed || terminal) return
      setStatus('connecting')
      socket.connect()
    }, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
  }

  // Obnovi session najviac raz; pri neuspechu skonci bez reconnect slucky.
  const refreshAndReconnect = async () => {
    if (refreshing) return
    if (refreshAttempted) {
      stopWithError()
      return
    }

    clearReconnectTimer()
    refreshing = true
    refreshAttempted = true
    try {
      await refreshSession()
      if (!disposed) {
        reconnectDelay = INITIAL_RECONNECT_DELAY_MS
        setStatus('connecting')
        socket.connect()
      }
    } catch {
      stopWithError()
    } finally {
      refreshing = false
    }
  }

  // Po kazdom pripojeni znovu vstupi do projektovej room a overi potvrdenie.
  socket.on('connect', () => {
    clearReconnectTimer()
    clearJoinTimer()
    reconnectDelay = INITIAL_RECONNECT_DELAY_MS

    joinTimer = setTimeout(stopWithError, JOIN_TIMEOUT_MS)
    socket.emit('joinProject', projectId, (acknowledgement: unknown) => {
      clearJoinTimer()
      if (
        !isRecord(acknowledgement) ||
        acknowledgement.joined !== projectId
      ) {
        stopWithError()
        return
      }

      const isReconnection = hasJoined
      hasJoined = true
      refreshAttempted = false
      setStatus('connected')
      if (isReconnection) handlers.onReconnected?.()
    })
  })

  // Autentifikacnu chybu riesi refresh; ostatne chyby pouziju backoff.
  socket.on('connect_error', (error: Error) => {
    if (isAuthenticationError(error)) {
      void refreshAndReconnect()
    } else {
      scheduleReconnect()
    }
  })

  // Po odpojeni zrusi join timeout a naplanuje dalsi pokus.
  socket.on('disconnect', () => {
    clearJoinTimer()
    if (!terminal) scheduleReconnect()
  })

  // Serverovu chybu pri join-e povazuje za terminalnu.
  socket.on('exception', stopWithError)

  // Udalosti prijme iba ak patria aktivnemu projektu a maju ID ulohy.
  socket.on('task:created', (task: unknown) => {
    if (
      isRecord(task) &&
      task.projectId === projectId &&
      typeof task.id === 'string'
    ) {
      handlers.onTaskCreated?.(task)
    }
  })

  // Aktualizaciu odovzda boardu az po kontrole projektu a ID ulohy.
  socket.on('task:updated', (task: unknown) => {
    if (
      isRecord(task) &&
      task.projectId === projectId &&
      typeof task.id === 'string'
    ) {
      handlers.onTaskUpdated?.(task)
    }
  })

  // Mazaciu udalost filtruje podla projektu a odovzda potrebne ID.
  socket.on('task:deleted', (event: unknown) => {
    if (
      isRecord(event) &&
      event.projectId === projectId &&
      typeof event.taskId === 'string'
    ) {
      handlers.onTaskDeleted?.({
        projectId,
        taskId: event.taskId,
      })
    }
  })

  // Po obnoveni sietoveho pripojenia urychli dalsi pokus.
  const handleOnline = () => {
    if (disposed || terminal || refreshing || !socket.disconnected) return
    clearReconnectTimer()
    reconnectDelay = INITIAL_RECONNECT_DELAY_MS
    setStatus('connecting')
    socket.connect()
  }

  // Spusti spojenie a zaregistruje reakciu na navrat online.
  window.addEventListener('online', handleOnline)
  setStatus('connecting')
  socket.connect()

  // Odpojenie odstrani listenery, casovace aj clenstvo v serverovej room.
  return {
    disconnect: () => {
      if (disposed) return
      disposed = true
      clearReconnectTimer()
      clearJoinTimer()
      window.removeEventListener('online', handleOnline)
      socket.removeAllListeners()
      socket.disconnect()
    },
  }
}
