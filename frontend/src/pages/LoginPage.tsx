import { useState, type FormEvent } from 'react'
import { submitAuthRequest, type AuthResponse } from './authApi'
import './auth.css'

type LoginPageProps = { onRegister: () => void; onSuccess: (response: AuthResponse) => void }

export default function LoginPage({ onRegister, onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try {
      const response = await submitAuthRequest('/api/auth/login', { email, password })
      localStorage.setItem('accessToken', response.accessToken)
      onSuccess(response)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Prihlásenie sa nepodarilo.')
    } finally { setIsSubmitting(false) }
  }

  return <main className="auth-page"><section className="auth-card" aria-labelledby="login-title">
    <h1 id="login-title">Prihlásenie</h1><p className="auth-card__intro">Prihláste sa do svojho účtu.</p>
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-form__field">E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label className="auth-form__field">Heslo<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
      {error && <p className="auth-form__error" role="alert">{error}</p>}
      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Prihlasovanie…' : 'Prihlásiť sa'}</button>
    </form>
    <p className="auth-card__switch">Nemáte účet? <button type="button" onClick={onRegister}>Zaregistrujte sa</button></p>
  </section></main>
}
