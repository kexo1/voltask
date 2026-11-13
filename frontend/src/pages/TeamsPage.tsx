import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getAuthError } from './authApi'

export type TeamSummary = { id: string; name: string }

function parseTeam(value: unknown): TeamSummary {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('name' in value) ||
    typeof value.name !== 'string'
  ) {
    throw new Error('API vrátilo neplatné údaje tímu.')
  }
  return { id: value.id, name: value.name }
}

async function fetchTeams(): Promise<TeamSummary[]> {
  const response = await fetch('/api/teams', { credentials: 'include' })
  if (!response.ok) throw new Error(await getAuthError(response))
  const result: unknown = await response.json()
  if (!Array.isArray(result)) throw new Error('API vrátilo neplatný zoznam tímov.')
  return result.map(parseTeam)
}

async function createTeamRequest(name: string): Promise<TeamSummary> {
  const response = await fetch('/api/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error(await getAuthError(response))
  return parseTeam(await response.json())
}

async function deleteTeamRequest(teamId: string): Promise<void> {
  const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}`, { method: 'DELETE', credentials: 'include' })
  if (!response.ok) throw new Error(await getAuthError(response))
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; teams: TeamSummary[] }
  | { status: 'error'; message: string }

export default function TeamsPage() {
  const [loadKey, setLoadKey] = useState(0)
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [teamName, setTeamName] = useState('')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

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

  async function handleCreateTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = teamName.trim()
    if (!name || isCreating) return

    setCreateError('')
    setIsCreating(true)
    try {
      const team = await createTeamRequest(name)
      setLoadState((state) =>
        state.status === 'ready'
          ? { status: 'ready', teams: [...state.teams, team] }
          : { status: 'ready', teams: [team] },
      )
      setTeamName('')
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Tím sa nepodarilo vytvoriť.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteTeam(team: TeamSummary) {
    if (deletingTeamId || !window.confirm(`Naozaj chcete odstranit tim "${team.name}"?`)) return
    setDeleteError('')
    setDeletingTeamId(team.id)
    try {
      await deleteTeamRequest(team.id)
      setLoadState((state) => state.status === 'ready' ? { status: 'ready', teams: state.teams.filter((item) => item.id !== team.id) } : state)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Tim sa nepodarilo odstranit.')
    } finally {
      setDeletingTeamId(null)
    }
  }

  return (
    <section className="app-page">
      <h1>Tímy</h1>
      <p className="app-page__intro">Prehľad tímov, ktorých ste členom.</p>
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
          <h2 className="app-card__title">Zatiaľ nemáte žiadny tím</h2>
          <p className="app-card__text">Vytvorte tím a začnite plánovať spoločnú prácu.</p>
        </section>
      )}
      {loadState.status === 'ready' && loadState.teams.length > 0 && (
        <ul className="app-page__team-list">
          {loadState.teams.map((team) => (
            <li key={team.id} className="app-page__team-item">
              <Link className="app-page__team-link" to={`/teams/${encodeURIComponent(team.id)}/board`}>
                {team.name}
              </Link>
              <button className="app-button app-button--danger app-page__delete-button" type="button" onClick={() => void handleDeleteTeam(team)} disabled={deletingTeamId !== null} aria-label={`Odstranit tim ${team.name}`}>
                {deletingTeamId === team.id ? 'Odstranujem...' : 'Odstranit'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {deleteError && <p className="app-page__error" role="alert">{deleteError}</p>}
      <section className="app-card">
        <h2 className="app-card__title">Vytvoriť tím</h2>
        <form className="team-form" onSubmit={handleCreateTeam}>
          <label className="sr-only" htmlFor="team-name">Názov tímu</label>
          <input
            id="team-name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="Názov tímu"
            maxLength={80}
            required
            disabled={isCreating}
          />
          <button className="app-button" type="submit" disabled={isCreating}>
            {isCreating ? 'Vytváram…' : 'Vytvoriť tím'}
          </button>
        </form>
        {createError && <p className="app-page__error" role="alert">{createError}</p>}
      </section>
    </section>
  )
}
