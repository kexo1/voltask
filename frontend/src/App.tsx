import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BoardPage from './pages/BoardPage'
import type { AuthResponse } from './pages/authApi'

export default function App() {
  const [page, setPage] = useState<'login' | 'register'>('login')
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthResponse['user'] | null>(null)

  if (authenticatedUser) return <BoardPage />

  return page === 'login'
    ? <LoginPage onRegister={() => setPage('register')} onSuccess={(response) => setAuthenticatedUser(response.user)} />
    : <RegisterPage onLogin={() => setPage('login')} onSuccess={(response) => setAuthenticatedUser(response.user)} />
}
