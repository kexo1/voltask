import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import type { AuthResponse } from './pages/authApi'

export default function App() {
  const [page, setPage] = useState<'login' | 'register'>('login')
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthResponse['user'] | null>(null)

  if (authenticatedUser) return <main className="auth-page"><section className="auth-card" aria-labelledby="success-title"><h1 id="success-title">Vitajte, {authenticatedUser.displayName}!</h1><p className="auth-form__success" role="status">{authenticatedUser.email} — autentifikácia prebehla úspešne.</p></section></main>

  return page === 'login'
    ? <LoginPage onRegister={() => setPage('register')} onSuccess={(response) => setAuthenticatedUser(response.user)} />
    : <RegisterPage onLogin={() => setPage('login')} onSuccess={(response) => setAuthenticatedUser(response.user)} />
}
