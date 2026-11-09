import { useState, type FormEvent } from 'react'
import { submitAuthRequest, type AuthResponse } from './authApi'
import './auth.css'

type RegisterPageProps = { onLogin: () => void; onSuccess: (response: AuthResponse) => void }

export default function RegisterPage({ onLogin, onSuccess }: RegisterPageProps) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try {
      const response = await submitAuthRequest('/api/auth/register', { email, displayName, password })
      localStorage.setItem('accessToken', response.accessToken)
      onSuccess(response)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Registrácia sa nepodarila.')
    } finally { setIsSubmitting(false) }
  }

  return <main className="auth-page"><section className="auth-card" aria-labelledby="register-title">
    <h1 id="register-title">Registrácia</h1><p className="auth-card__intro">Vytvorte si nový účet.</p>
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-form__field">Zobrazované meno<input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={80} required /></label>
      <label className="auth-form__field">E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label className="auth-form__field">Heslo<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={72} required /></label>
      {error && <p className="auth-form__error" role="alert">{error}</p>}
      <button className="auth-form__submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Registrácia…' : 'Zaregistrovať sa'}</button>
    </form>
    <p className="auth-card__switch">Už máte účet? <button type="button" onClick={onLogin}>Prihláste sa</button></p>
  </section></main>
}
