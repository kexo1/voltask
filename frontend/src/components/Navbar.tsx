import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import logo from '../assets/voltask-logo.png'
import { logout } from '../pages/authApi'

export default function Navbar({ onLogout }: { onLogout: () => void }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    setIsLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      onLogout()
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : 'Odhlásenie sa nepodarilo.',
      )
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="app-nav">
      <NavLink className="app-nav__brand" to="/dashboard" aria-label="Voltask – Prehľad">
        <img src={logo} alt="" />
      </NavLink>
      <nav className="app-nav__links" aria-label="Hlavná navigácia">
        <NavLink
          className={({ isActive }) => `app-nav__link${isActive ? ' is-active' : ''}`}
          to="/dashboard"
        >
          Prehľad
        </NavLink>
        <NavLink
          className={({ isActive }) => `app-nav__link${isActive ? ' is-active' : ''}`}
          to="/teams"
        >
          Tímy
        </NavLink>
        <NavLink
          className={({ isActive }) => `app-nav__link${isActive ? ' is-active' : ''}`}
          to="/profile"
        >
          Profil
        </NavLink>
        <button
          className="app-nav__logout"
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Odhlasujem…' : 'Odhlásiť sa'}
        </button>
      </nav>
      {logoutError && (
        <p className="app-nav__error" role="alert">
          {logoutError}
        </p>
      )}
    </header>
  )
}