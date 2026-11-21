import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  connectProjectSocket,
  type ProjectConnectionStatus,
  type ProjectSocketConnection,
} from './projectSocket'
import './RealtimeStatus.css'

export type RealtimeStatus =
  | 'connecting'
  | 'online'
  | 'disconnected'
  | 'error'

export type RealtimeTaskEvent =
  | { type: 'created' }
  | { type: 'updated' }
  | { type: 'deleted' }

type RealtimeListener = (event: RealtimeTaskEvent) => void

export type RealtimeContextValue = {
  status: RealtimeStatus
  activeProjectId: string | null
  subscribe: (listener: RealtimeListener) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'disconnected',
  activeProjectId: null,
  subscribe: () => () => undefined,
})

function getActiveProjectId(pathname: string, search: string): string | null {
  const projectMatch = pathname.match(
    /\/(?:projects?|projekty)\/([^/?#]+)(?:\/|$)/,
  )
  if (projectMatch) return decodeURIComponent(projectMatch[1])

  const queryProjectId = new URLSearchParams(search).get('projectId')
  return queryProjectId?.trim() ? queryProjectId : null
}

export function RealtimeProvider({
  authenticated,
  projectId: providedProjectId,
  children,
}: {
  authenticated: boolean
  projectId?: string | null
  children: ReactNode
}) {
  const location = useLocation()
  const [status, setStatus] = useState<RealtimeStatus>('disconnected')
  const listenersRef = useRef(new Set<RealtimeListener>())
  const routedProjectId = getActiveProjectId(location.pathname, location.search)
  const projectId =
    providedProjectId?.trim() || routedProjectId
  const activeProjectId = authenticated && projectId ? projectId : null

  useEffect(() => {
    let connection: ProjectSocketConnection | null = null
    const listeners = listenersRef.current

    if (!activeProjectId) {
      listeners.clear()
      return
    }

    const emitStatus = (socketStatus: ProjectConnectionStatus) => {
      setStatus(
        socketStatus === 'connected'
          ? 'online'
          : socketStatus,
      )
    }

    connection = connectProjectSocket(activeProjectId, {
      onStatusChange: emitStatus,
      onTaskCreated: () => {
        listeners.forEach((listener) =>
          listener({ type: 'created' }),
        )
      },
      onTaskUpdated: () => {
        listeners.forEach((listener) =>
          listener({ type: 'updated' }),
        )
      },
      onTaskDeleted: () => {
        listeners.forEach((listener) =>
          listener({ type: 'deleted' }),
        )
      },
    })

    return () => {
      connection?.disconnect()
      listeners.clear()
    }
  }, [activeProjectId])

  const subscribe = useCallback((listener: RealtimeListener) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  return (
    <RealtimeContext.Provider
      value={{
        status: activeProjectId ? status : 'disconnected',
        activeProjectId,
        subscribe,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

const statusLabels: Record<RealtimeStatus, string> = {
  connecting: 'Pripája sa',
  online: 'Online',
  disconnected: 'Odpojené',
  error: 'Chyba spojenia',
}

export function RealtimeStatusIndicator() {
  const { status } = useRealtime()

  return (
    <span
      className={`realtime-status realtime-status--${status}`}
      role="status"
      aria-label={`Stav spojenia: ${statusLabels[status]}`}
      title={statusLabels[status]}
    >
      <span className="realtime-status__dot" aria-hidden="true" />
      <span className="realtime-status__label">{statusLabels[status]}</span>
    </span>
  )
}

function eventMessage(event: RealtimeTaskEvent): string {
  switch (event.type) {
    case 'created':
      return 'Nová úloha bola vytvorená'
    case 'updated':
      return 'Úloha bola aktualizovaná'
    case 'deleted':
      return 'Úloha bola odstránená'
  }
}

export function RealtimeNotifications() {
  const { activeProjectId, subscribe } = useRealtime()
  const [notification, setNotification] = useState<{
    projectId: string
    message: string
  } | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activeProjectId) return

    const unsubscribe = subscribe((event) => {
      setNotification({
        projectId: activeProjectId,
        message: eventMessage(event),
      })
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(
        () => setNotification(null),
        5000,
      )
    })

    return () => {
      unsubscribe()
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [activeProjectId, subscribe])

  if (!activeProjectId || notification?.projectId !== activeProjectId) {
    return null
  }

  return (
    <div className="realtime-notifications">
      <div className="realtime-notification" role="status" aria-live="polite">
        <span>{notification.message}</span>
        <button
          type="button"
          className="realtime-notification__close"
          aria-label="Zavrieť upozornenie"
          onClick={() => {
            setNotification(null)
            if (timeoutRef.current !== null) {
              window.clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
