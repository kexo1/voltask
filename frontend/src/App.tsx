import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom'
import Navbar from './components/Navbar'
import './components/AppShell.css'
import BoardPage from './pages/BoardPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import TeamsPage from './pages/TeamsPage'
import { getCurrentUser, type AuthUser } from './pages/authApi'

type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; user: AuthUser | null }

function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-shell__main">
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
  if (!teamId) return <Navigate to="/teams" replace />
  return <BoardPage teamId={teamId} />
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

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RequireAuth user={user} />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:teamId/board" element={<TeamBoardRoute />} />
            <Route
              path="/profile"
              element={
                <section className="app-page">
                  <h1>Profil</h1>
                </section>
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
