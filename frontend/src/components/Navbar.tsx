import { NavLink } from 'react-router-dom'
import logo from '../assets/voltask-logo.png'

export default function Navbar() {
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
      </nav>
    </header>
  )
}