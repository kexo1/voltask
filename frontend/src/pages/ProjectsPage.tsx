import { useCallback, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import plusIcon from '../assets/icons/plus.svg'
import AppIcon from '../components/AppIcon'
import Modal from '../components/Modal'
import ProjectList from '../components/ProjectList'
import ProjectsBackLink from '../components/ProjectsBackLink'
import WorkspaceLoad from '../components/WorkspaceLoad'
import { useWorkspaceData } from './useWorkspaceData'
import {
  deleteProject,
  getOwnedTeams,
  getProjects,
  getTeam,
  projectBoardPath,
  requestWorkspace,
  type Project,
} from './workspaceApi'

function CreateProject({
  userId,
  personal = false,
  contextTeamId,
  onClose,
  onCreated,
}: {
  userId: string
  personal?: boolean
  contextTeamId?: string
  onClose: () => void
  onCreated: (project: Project) => void
}) {
  const loadTeams = useCallback(
    () => (personal || contextTeamId ? Promise.resolve([]) : getOwnedTeams(userId)),
    [contextTeamId, personal, userId],
  )
  const { state, reload } = useWorkspaceData(loadTeams)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (!name.trim()) {
      setError('Zadajte názov projektu.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const project = await requestWorkspace<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          teamId: contextTeamId || teamId || undefined,
        }),
      })
      onCreated(project)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Projekt sa nepodarilo vytvoriť.')
    } finally {
      setBusy(false)
    }
  }

  const content = (
    <>
      <h2 id="create-project-title" className="app-card__title">
        {personal ? 'Vytvoriť osobný projekt' : 'Vytvoriť projekt'}
      </h2>
      <form className="app-form" onSubmit={submit}>
        <label htmlFor="project-name">Názov projektu</label>
        <input
          id="project-name"
          autoFocus={Boolean(contextTeamId)}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          disabled={busy}
        />
        <label htmlFor="project-description">Opis (voliteľný)</label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={4}
          disabled={busy}
        />
        {!personal && !contextTeamId && (
          <>
            <label htmlFor="project-team">Tím (voliteľný)</label>
            <select
              id="project-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={busy || state.status !== 'ready'}
            >
              <option value="" aria-label="Žiadny tím"></option>
              {state.status === 'ready' &&
                state.data.map((team) => (
                  <option value={team.id} key={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
            {state.status === 'loading' && <p role="status">Načítavam tímy…</p>}
            {state.status === 'error' && <WorkspaceLoad message={state.message} onRetry={reload} />}
            {state.status === 'ready' && !state.data.length && (
              <p>Tímový projekt môže vytvoriť vlastník tímu.</p>
            )}
          </>
        )}
        {error && (
          <p className="app-page__error" role="alert">
            {error}
          </p>
        )}
        <div className="app-card__actions">
          <button className="app-button" type="submit" disabled={busy}>
            {busy ? 'Vytváram…' : 'Vytvoriť projekt'}
          </button>
          <button
            className="app-button app-button--secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Zrušiť
          </button>
        </div>
      </form>
    </>
  )

  return contextTeamId ? (
    <section className="app-card" aria-labelledby="create-project-title">
      {content}
    </section>
  ) : (
    <Modal labelId="create-project-title" busy={busy} onClose={onClose}>
      {content}
    </Modal>
  )
}

function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: Project
  onClose: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    setBusy(true)
    setError('')
    try {
      await deleteProject(project.id)
      onDeleted()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Projekt sa nepodarilo odstrániť.')
      setBusy(false)
    }
  }

  return (
    <Modal labelId="delete-project-title" busy={busy} onClose={onClose}>
      <h2 id="delete-project-title" className="app-card__title">
        Odstrániť projekt „{project.name}“?
      </h2>
      <form onSubmit={submit}>
        <p>Spolu s projektom sa natrvalo odstránia všetky jeho úlohy a ich závislosti.</p>
        {error && (
          <p className="app-page__error" role="alert">
            {error}
          </p>
        )}
        <div className="app-card__actions">
          <button
            className="app-button app-button--secondary"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Zrušiť
          </button>
          <button className="app-button app-button--danger" type="submit" disabled={busy}>
            {busy ? 'Odstraňujem…' : 'Odstrániť projekt'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function ProjectsPage({ userId }: { userId: string }) {
  const [search] = useSearchParams()
  const teamId = search.get('team') || undefined
  return <ProjectsView key={teamId ?? ''} userId={userId} teamId={teamId} />
}

function ProjectsView({ userId, teamId }: { userId: string; teamId?: string }) {
  const [search, setSearch] = useSearchParams()
  const { state, setState, reload } = useWorkspaceData(getProjects)
  const loadTeams = useCallback(
    async () => (teamId ? [await getTeam(teamId)] : getOwnedTeams(userId)),
    [teamId, userId],
  )
  const { state: teams, reload: reloadTeams } = useWorkspaceData(loadTeams)
  const [inlineOpen, setInlineOpen] = useState(false)
  const focusCreateTrigger = useRef(false)
  const [created, setCreated] = useState<Project | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deletedProjectName, setDeletedProjectName] = useState('')
  const create = teamId ? null : search.get('create')
  const team = teamId && teams.status === 'ready' ? teams.data[0] : undefined
  const ownsTeam = team?.members.some(({ role, user }) => role === 'OWNER' && user.id === userId)

  function closeCreate() {
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('create')
        return next
      },
      { replace: true },
    )
  }

  function closeInlineCreate() {
    focusCreateTrigger.current = true
    setInlineOpen(false)
  }

  const projects =
    state.status === 'ready'
      ? state.data.filter((project) => !teamId || project.team?.id === teamId)
      : null

  function canDelete(project: Project) {
    if (!project.team) return project.ownerId === userId
    if (teamId) return ownsTeam
    return teams.status === 'ready' && teams.data.some(({ id }) => id === project.team?.id)
  }

  function handleDeleted(project: Project) {
    setProjectToDelete(null)
    setCreated(null)
    setDeletedProjectName(project.name)
    setState((current) =>
      current.status === 'ready'
        ? { status: 'ready', data: current.data.filter(({ id }) => id !== project.id) }
        : current,
    )
  }

  return (
    <section className="app-page">
      {teamId && (
        <div>
          <ProjectsBackLink />
        </div>
      )}
      <div className="app-page__heading">
        <h1>{team?.name ?? (teamId ? 'Tímové projekty' : 'Projekty')}</h1>
        {!teamId && (
          <button
            className="app-button"
            type="button"
            onClick={() => {
              setCreated(null)
              setDeletedProjectName('')
              setSearch((previous) => {
                const next = new URLSearchParams(previous)
                next.set('create', 'project')
                return next
              })
            }}
          >
            Vytvoriť projekt
          </button>
        )}
      </div>
      {teamId && ownsTeam && !inlineOpen && (
        <div>
          <button
            className="app-button"
            type="button"
            disabled={state.status !== 'ready'}
            ref={(button) => {
              if (button && focusCreateTrigger.current) {
                button.focus()
                focusCreateTrigger.current = false
              }
            }}
            onClick={() => {
              setCreated(null)
              setDeletedProjectName('')
              setInlineOpen(true)
            }}
          >
            <AppIcon src={plusIcon} />
            Nový projekt
          </button>
        </div>
      )}
      {deletedProjectName && (
        <p className="app-page__success" role="status">
          Projekt „{deletedProjectName}“ bol odstránený.
        </p>
      )}
      {created && (
        <div className="app-page__success app-page__success--with-action">
          <span role="status">Projekt „{created.name}“ bol vytvorený.</span>
          <Link className="app-button app-button--secondary" to={projectBoardPath(created.id)}>
            Otvoriť nástenku
          </Link>
        </div>
      )}
      {state.status === 'loading' && <WorkspaceLoad onRetry={reload} />}
      {state.status === 'error' && <WorkspaceLoad message={state.message} onRetry={reload} />}
      {teams.status !== 'ready' && (teamId || projects?.some((project) => project.team)) && (
        <WorkspaceLoad
          message={teams.status === 'error' ? teams.message : undefined}
          onRetry={reloadTeams}
        />
      )}
      {teamId && inlineOpen && (
        <CreateProject
          userId={userId}
          contextTeamId={teamId}
          onClose={closeInlineCreate}
          onCreated={(project) => {
            setState((current) =>
              current.status === 'ready'
                ? { status: 'ready', data: [project, ...current.data] }
                : current,
            )
            setCreated(project)
            closeInlineCreate()
          }}
        />
      )}
      {projects &&
        (projects.length ? (
          <ProjectList
            projects={projects}
            renderActions={(project) =>
              canDelete(project) && (
                <button
                  className="app-button app-button--danger"
                  type="button"
                  aria-label={`Odstrániť projekt ${project.name}`}
                  onClick={() => {
                    setDeletedProjectName('')
                    setProjectToDelete(project)
                  }}
                >
                  Odstrániť projekt
                </button>
              )
            }
          />
        ) : (
          <p>
            {teamId
              ? 'V tomto tíme zatiaľ nemáte dostupné projekty.'
              : 'Zatiaľ nemáte žiadne projekty.'}
          </p>
        ))}
      {create && (
        <CreateProject
          key={create}
          userId={userId}
          personal={create === 'personal'}
          onClose={closeCreate}
          onCreated={(project) => {
            setCreated(project)
            closeCreate()
            reload()
          }}
        />
      )}
      {projectToDelete && (
        <DeleteProjectDialog
          project={projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onDeleted={() => handleDeleted(projectToDelete)}
        />
      )}
    </section>
  )
}
