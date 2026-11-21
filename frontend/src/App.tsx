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
import ProjectBoardPage from './pages/ProjectBoardPage'
import ProjectsPage from './pages/ProjectsPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import TeamsPage from './pages/TeamsPage'
import { getCurrentUser, type AuthUser } from './pages/authApi'
import {
  RealtimeNotifications,
  RealtimeProvider,
} from './features/realtime/RealtimeContext'

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
      <RealtimeNotifications />
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

function LegacyTeamBoardRoute() {
  const { teamId } = useParams()
  return (
    <Navigate to={teamId ? `/projects?team=${encodeURIComponent(teamId)}` : '/teams'} replace />
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
            message: error instanceof Error ? error.message : 'Prihlásenie sa nepodarilo overiť.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [authCheckKey])

  if (authState.status === 'loading') {
    return (
      <main className="app-state" role="status">
        Načítavam aplikáciu…
      </main>
    )
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
      <RealtimeProvider authenticated={Boolean(user)}>
        <Routes>
        <Route element={<RequireAuth user={user} />}>
          <Route element={<AppLayout onLogout={handleLogout} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={user && <ProjectsPage userId={user.id} />} />
            <Route
              path="/projects/:projectId/board"
              element={user && <ProjectBoardPage userId={user.id} />}
            />
            <Route path="/teams" element={user && <TeamsPage userId={user.id} />} />
            <Route path="/teams/:teamId/board" element={<LegacyTeamBoardRoute />} />
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
      </RealtimeProvider>
    </BrowserRouter>
  )
}
