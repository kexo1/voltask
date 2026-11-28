import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import plusIcon from '../assets/icons/plus.svg'
import AppIcon from '../components/AppIcon'
import Modal from '../components/Modal'
import OverflowMenu from '../components/OverflowMenu'
import WorkspaceLoad from '../components/WorkspaceLoad'
import { useWorkspaceData } from './useWorkspaceData'
import { getTeam, getTeams, requestWorkspace, type Team } from './workspaceApi'

async function loadTeams() {
  const teams = await getTeams()
  return Promise.all(teams.map((team) => getTeam(team.id)))
}

export default function TeamsPage({ userId }: { userId: string }) {
  const { state, reload } = useWorkspaceData(loadTeams)
  const [action, setAction] = useState<{ type: 'create' } | { type: 'delete'; team: Team } | null>(
    null,
  )
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const isDeleting = action?.type === 'delete'
  const submitLabel = isDeleting ? 'Odstrániť tím' : 'Vytvoriť tím'
  const pendingLabel = isDeleting ? 'Odstraňujem…' : 'Vytváram…'

  function open(next: NonNullable<typeof action>) {
    setName('')
    setError('')
    setSuccess('')
    setAction(next)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!action || busy) return
    if (action.type === 'create' && !name.trim()) {
      setError('Zadajte názov tímu.')
      return
    }

    setBusy(true)
    setError('')
    try {
      if (action.type === 'create') {
        const team = await requestWorkspace<Team>('/teams', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim() }),
        })
        setSuccess(`Tím „${team.name}“ bol vytvorený.`)
      } else {
        await requestWorkspace(`/teams/${encodeURIComponent(action.team.id)}`, { method: 'DELETE' })
        setSuccess(`Tím „${action.team.name}“ bol odstránený.`)
      }
      setAction(null)
      reload()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Zmenu tímu sa nepodarilo uložiť.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="app-page">
      <div className="app-page__heading">
        <h1>Tímy</h1>
        <button
          className="app-button"
          type="button"
          onClick={() => open({ type: 'create' })}
        >
          <AppIcon src={plusIcon} />
          Vytvoriť tím
        </button>
      </div>
      {success && (
        <p className="app-page__success" role="status">
          {success}
        </p>
      )}
      {state.status === 'loading' && <WorkspaceLoad onRetry={reload} />}
      {state.status === 'error' && <WorkspaceLoad message={state.message} onRetry={reload} />}
      {state.status === 'ready' &&
        (state.data.length ? (
          <ul className="app-page__team-list">
            {state.data.map((team) => {
              const isOwner = team.members.some(
                ({ role, user }) => role === 'OWNER' && user.id === userId,
              )
              return (
                <li key={team.id} className="app-page__team-item">
                  <Link
                    className="app-page__team-link"
                    to={`/projects?team=${encodeURIComponent(team.id)}`}
                  >
                    <span className="app-page__team-title">{team.name}</span>
                    <span className="app-page__team-summary">
                      <span className="app-page__team-members" aria-label={`${team.members.length} členov`}>
                        {team.members.slice(0, 4).map(({ user }) => (
                          <span
                            key={user.id}
                            className="app-page__team-avatar"
                            aria-hidden="true"
                            title={user.displayName}
                          >
                            {user.displayName
                              .trim()
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join('')
                              .toUpperCase()}
                          </span>
                        ))}
                      </span>
                      <span>{team.members.length} členov</span>
                      <span>{team.projects.length} projektov</span>
                    </span>
                  </Link>
                  {isOwner && (
                    <OverflowMenu label={`Možnosti tímu ${team.name}`}>
                      <button
                        className="app-overflow-menu__item"
                        type="button"
                        disabled
                        title="Pozývanie členov bude dostupné neskôr."
                      >
                        Pozvať ľudí / priateľov
                        <span>Čoskoro</span>
                      </button>
                      <button
                        className="app-overflow-menu__item app-overflow-menu__item--danger"
                        type="button"
                        onClick={() => open({ type: 'delete', team })}
                      >
                        Odstrániť tím
                      </button>
                    </OverflowMenu>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p>Zatiaľ nie ste členom žiadneho tímu.</p>
        ))}
      {action && (
        <Modal labelId="team-action-title" busy={busy} onClose={() => setAction(null)}>
          <h2 id="team-action-title" className="app-card__title">
            {action.type === 'create' ? 'Vytvoriť tím' : `Odstrániť tím „${action.team.name}“?`}
          </h2>
          <form className="app-form" onSubmit={submit}>
            {action.type === 'create' ? (
              <>
                <label htmlFor="team-name">Názov tímu</label>
                <input
                  id="team-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                  disabled={busy}
                />
              </>
            ) : (
              <p>Spolu s tímom sa natrvalo odstránia všetky jeho projekty a úlohy.</p>
            )}
            {error && (
              <p className="app-page__error" role="alert">
                {error}
              </p>
            )}
            <div className="app-card__actions">
              <button
                className="app-button app-button--secondary"
                type="button"
                onClick={() => setAction(null)}
                disabled={busy}
              >
                Zrušiť
              </button>
              <button
                className={isDeleting ? 'app-button app-button--danger' : 'app-button'}
                type="submit"
                disabled={busy}
              >
                {action.type === 'create' && <AppIcon src={plusIcon} />}
                {busy ? pendingLabel : submitLabel}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
