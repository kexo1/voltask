import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import Navbar from './components/Navbar'
import './components/AppShell.css'
import BoardPage from './pages/BoardPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import TeamsPage from './pages/TeamsPage'
import { getAuthError, getCurrentUser, type AuthUser } from './pages/authApi'

type TeamLookupState =
  | { teamId: string; status: 'loading' }
  | { teamId: string; status: 'ready'; name: string }
  | { teamId: string; status: 'missing' }
  | { teamId: string; status: 'error'; message: string }

type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; user: AuthUser | null }

function AppLayout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation()

  return (
    <div className="app-shell">
      <Navbar onLogout={onLogout} />
      <div className="app-shell__main" key={location.pathname}>
        <Outlet />
      </div>
    </div>
  )
}

function RequireAuth({ user }: { user: AuthUser | null }) {
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function LoginRoute({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const navigate = useNavigate()
  return (
    <LoginPage
      onRegister={() => navigate('/register')}
      onSuccess={(response) => onLogin(response.user)}
    />
  )
}

function RegisterRoute({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const navigate = useNavigate()
  return (
    <RegisterPage
      onLogin={() => navigate('/login')}
      onSuccess={(response) => onLogin(response.user)}
    />
  )
}

function TeamBoardRoute() {
  const { teamId } = useParams<{ teamId: string }>()
  const [reloadKey, setReloadKey] = useState(0)
  const [lookup, setLookup] = useState<TeamLookupState>({
    teamId: teamId ?? '',
    status: 'loading',
  })

  useEffect(() => {
    if (!teamId) return

    let active = true
    // Match the route ID to the user's teams before rendering the board.
    fetch('/api/teams', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getAuthError(response))
        const teams: unknown = await response.json()
        if (
          !Array.isArray(teams) ||
          teams.some(
            (team) =>
              typeof team !== 'object' ||
              team === null ||
              !('id' in team) ||
              typeof team.id !== 'string' ||
              !('name' in team) ||
              typeof team.name !== 'string',
          )
        ) {
          throw new Error('API vrátilo neplatný zoznam tímov.')
        }

        const selectedTeam = teams.find((team) => team.id === teamId)
        if (!active) return
        setLookup(
          selectedTeam
            ? { teamId, status: 'ready', name: selectedTeam.name }
            : { teamId, status: 'missing' },
        )
      })
      .catch((error: unknown) => {
        if (active) {
          setLookup({
            teamId,
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Názov tímu sa nepodarilo načítať.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [teamId, reloadKey])

  if (!teamId) return <Navigate to="/teams" replace />
  if (lookup.teamId !== teamId || lookup.status === 'loading') {
    return <p className="app-page__intro" role="status">Načítavam tím…</p>
  }
  if (lookup.status === 'missing') return <Navigate to="/teams" replace />
  if (lookup.status === 'error') {
    return (
      <section className="app-page">
        <div className="app-page__error" role="alert">
          <span>{lookup.message}</span>
          <button
            className="app-button app-button--secondary"
            type="button"
            onClick={() => {
              setLookup({ teamId, status: 'loading' })
              setReloadKey((key) => key + 1)
            }}
          >
            Skúsiť znova
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="app-page app-page--team-board">
      <BoardPage teamId={teamId} teamName={lookup.name} />
    </section>
  )
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })
  const [authCheckKey, setAuthCheckKey] = useState(0)

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((user) => {
        if (active) setAuthState({ status: 'ready', user })
      })
      .catch((error: unknown) => {
        if (active) {
          setAuthState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Prihlásenie sa nepodarilo overiť.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [authCheckKey])

  if (authState.status === 'loading') {
    return <main className="app-state" role="status">Načítavam aplikáciu…</main>
  }

  if (authState.status === 'error') {
    return (
      <main className="app-state">
        <p role="alert">{authState.message}</p>
        <button
          type="button"
          onClick={() => {
            setAuthState({ status: 'loading' })
            setAuthCheckKey((key) => key + 1)
          }}
        >
          Skúsiť znova
        </button>
      </main>
    )
  }

  const { user } = authState
  const setAuthenticatedUser = (authenticatedUser: AuthUser) =>
    setAuthState({ status: 'ready', user: authenticatedUser })
  const handleLogout = () => setAuthState({ status: 'ready', user: null })

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RequireAuth user={user} />}>
          <Route element={<AppLayout onLogout={handleLogout} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:teamId/board" element={<TeamBoardRoute />} />
            <Route
              path="/profile"
              element={
                user ? (
                  <ProfilePage user={user} onUserUpdated={setAuthenticatedUser} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
          </Route>
        </Route>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginRoute onLogin={setAuthenticatedUser} />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <RegisterRoute onLogin={setAuthenticatedUser} />
            )
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
