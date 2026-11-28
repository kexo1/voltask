import { useCallback, useState, type FormEvent } from 'react'
import plusIcon from '../assets/icons/plus.svg'
import AppIcon from './AppIcon'
import { getTeam, requestWorkspace, type Project, type ProjectMember } from '../pages/workspaceApi'
import { useWorkspaceData } from '../pages/useWorkspaceData'
import Modal from './Modal'
import WorkspaceLoad from './WorkspaceLoad'

function ManageMembers({
  teamId,
  userId,
  projectId,
  members,
  onChange,
  onClose,
}: {
  teamId: string
  userId: string
  projectId: string
  members: ProjectMember[]
  onChange: (members: ProjectMember[], removedUserId?: string) => void
  onClose: () => void
}) {
  const load = useCallback(() => getTeam(teamId), [teamId])
  const { state, reload } = useWorkspaceData(load)
  const [memberId, setMemberId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const path = `/projects/${encodeURIComponent(projectId)}/members`

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !memberId) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const added = await requestWorkspace<ProjectMember>(path, {
        method: 'POST',
        body: JSON.stringify({ userId: memberId }),
      })
      onChange([...members, added])
      setMemberId('')
      setSuccess(`${added.user.displayName} – členstvo pridané.`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Člena sa nepodarilo pridať.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(member: ProjectMember) {
    if (
      busy ||
      !window.confirm(
        `Odobrať člena „${member.user.displayName}“? Zrušia sa aj jeho priradenia k úlohám projektu.`,
      )
    )
      return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await requestWorkspace(`${path}/${encodeURIComponent(member.userId)}`, { method: 'DELETE' })
      onChange(
        members.filter(({ userId }) => userId !== member.userId),
        member.userId,
      )
      setSuccess(`${member.user.displayName} – členstvo odobrané.`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Člena sa nepodarilo odobrať.')
    } finally {
      setBusy(false)
    }
  }

  const isOwner =
    state.status === 'ready' &&
    state.data.members.some(({ role, user }) => role === 'OWNER' && user.id === userId)
  const available =
    state.status === 'ready'
      ? state.data.members.filter(
          ({ user }) => !members.some((member) => member.userId === user.id),
        )
      : []

  return (
    <Modal labelId="project-members-title" busy={busy} onClose={onClose}>
      <h2 id="project-members-title" className="app-card__title">
        Členovia projektu
      </h2>
      {!members.length && <p>Projekt zatiaľ nemá priradených členov.</p>}
      <ul className="app-page__team-list">
        {members.map((member) => (
          <li className="app-page__team-item" key={member.userId}>
            <span>{member.user.displayName}</span>
            {isOwner && (
              <button
                className="app-button app-button--danger"
                type="button"
                disabled={busy}
                onClick={() => void remove(member)}
                aria-label={`Odobrať člena ${member.user.displayName}`}
              >
                Odobrať
              </button>
            )}
          </li>
        ))}
      </ul>
      {state.status !== 'ready' && (
        <WorkspaceLoad
          onRetry={reload}
          message={state.status === 'error' ? state.message : undefined}
        />
      )}
      {isOwner &&
        (available.length ? (
          <form className="app-form" onSubmit={add}>
            <label htmlFor="new-project-member">Pridať člena tímu</label>
            <select
              id="new-project-member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={busy}
              required
            >
              <option value="">Vyberte člena</option>
              {available.map(({ user }) => (
                <option value={user.id} key={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
            <button className="app-button" type="submit" disabled={busy}>
              <AppIcon src={plusIcon} />
              Pridať člena
            </button>
          </form>
        ) : (
          <p>Všetci členovia tímu už patria do projektu.</p>
        ))}
      {error && (
        <p className="app-page__error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="app-page__success" role="status">
          {success}
        </p>
      )}
      <div className="app-card__actions">
        <button
          className="app-button app-button--secondary"
          type="button"
          onClick={onClose}
          disabled={busy}
        >
          Zavrieť
        </button>
      </div>
    </Modal>
  )
}

export default function ProjectMembers({
  project,
  userId,
  members,
  onChange,
}: {
  project: Project
  userId: string
  members: ProjectMember[]
  onChange: (members: ProjectMember[], removedUserId?: string) => void
}) {
  const [open, setOpen] = useState(false)
  if (!project.team) return null

  return (
    <>
      <button
        className="app-button app-button--secondary"
        type="button"
        onClick={() => setOpen(true)}
      >
        Členovia projektu ({members.length})
      </button>
      {open && (
        <ManageMembers
          teamId={project.team.id}
          projectId={project.id}
          userId={userId}
          members={members}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
