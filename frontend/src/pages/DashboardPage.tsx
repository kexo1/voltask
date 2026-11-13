import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthError } from './authApi'

type TeamSummary = { id: string; name: string }

async function fetchTeams(): Promise<TeamSummary[]> {
  const response = await fetch('/api/teams', { credentials: 'include' })
  if (!response.ok) throw new Error(await getAuthError(response))
  const result: unknown = await response.json()
  if (
    !Array.isArray(result) ||
    result.some(
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
  return result
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; teams: TeamSummary[] }
  | { status: 'error'; message: string }

export default function DashboardPage() {
  const [loadKey, setLoadKey] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    fetchTeams()
      .then((teams) => {
        if (active) setLoadState({ status: 'ready', teams })
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Tímy sa nepodarilo načítať.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [loadKey])

  return (
    <section className="app-page">
      <h1>Prehľad</h1>
      <p className="app-page__intro">Vitajte vo Voltasku. Tu nájdete svoje tímy.</p>
      {loadState.status === 'loading' && <p role="status">Načítavam tímy…</p>}
      {loadState.status === 'error' && (
        <div className="app-page__error" role="alert">
          <span>{loadState.message}</span>
          <button
            className="app-button app-button--secondary"
            type="button"
            onClick={() => {
              setLoadState({ status: 'loading' })
              setLoadKey((key) => key + 1)
            }}
          >
            Skúsiť znova
          </button>
        </div>
      )}
      {loadState.status === 'ready' && loadState.teams.length === 0 && (
        <section className="app-card">
          <h2 className="app-card__title">Začnite vytvorením tímu</h2>
          <p className="app-card__text">Zatiaľ nie ste členom žiadneho tímu.</p>
          <div className="app-card__actions">
            <Link className="app-button" to="/teams">Vytvoriť tím</Link>
          </div>
        </section>
      )}
      {loadState.status === 'ready' && loadState.teams.length > 0 && (
        <section className="app-card">
          <h2 className="app-card__title">Vaše tímy</h2>
          <ul className="app-page__team-list">
            {loadState.teams.map((team) => (
              <li key={team.id}>
                <Link className="app-page__team-link" to={`/teams/${encodeURIComponent(team.id)}/board`}>
                  {team.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="app-card__actions">
            <Link className="app-button app-button--secondary" to="/teams">Spravovať tímy</Link>
          </div>
        </section>
      )}
    </section>
  )
}