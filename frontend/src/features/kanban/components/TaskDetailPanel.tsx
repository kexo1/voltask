import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COLUMNS, type Task, type TaskStatus } from '../types/task'
import type { TaskUpdateData } from '../data/taskApi'
import type { WorkspaceUser } from '../../../pages/workspaceApi'

type Props = {
  task: Task | null
  members: WorkspaceUser[]
  allTasks: Task[]
  error: string
  onClose: () => void
  onDelete: () => void
  isDeleting?: boolean
  isSaving?: boolean
  onStatusChange: (status: TaskStatus) => void
  onUpdateTask: (data: TaskUpdateData) => Promise<void>
  onAddDependency: (dependsOnId: string) => Promise<void>
  onRemoveDependency: (dependsOnId: string) => Promise<void>
}

export default function TaskDetailPanel({
  task,
  members,
  allTasks,
  error,
  onClose,
  onDelete,
  isDeleting = false,
  isSaving = false,
  onStatusChange,
  onUpdateTask,
  onAddDependency,
  onRemoveDependency,
}: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const taskId = task?.id

  const [prevTaskId, setPrevTaskId] = useState(taskId)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [selectedDependencyId, setSelectedDependencyId] = useState('')

  if (prevTaskId !== taskId) {
    setPrevTaskId(taskId)
    setIsEditing(false)
    setSelectedDependencyId('')
  }

  useEffect(() => {
    if (taskId) {
      closeButton.current?.focus()
    }
  }, [taskId])

  if (!task) return null

  const dependencies = task.dependencies ?? []
  const dependencyIds = new Set(dependencies.map((item) => item.dependsOnId))
  const availableDependencies = allTasks.filter(
    (candidate) => candidate.id !== task.id && !dependencyIds.has(candidate.id),
  )

  function startEditing() {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setAssigneeId(task.assignee?.id ?? '')
    setIsEditing(true)
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    await onUpdateTask({
      title: trimmedTitle,
      description: description.trim() || null,
      assigneeId: assigneeId || null,
    })
    setIsEditing(false)
  }

  async function handleAddDependency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedDependencyId) return
    await onAddDependency(selectedDependencyId)
    setSelectedDependencyId('')
  }

  return (
    <aside
      className="task-detail-panel"
      aria-label="Detail úlohy"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className="task-detail-panel__header">
        <p>Detail úlohy</p>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Zavrieť detail">
          ×
        </button>
      </div>

      {isEditing ? (
        <form className="app-form" onSubmit={(event) => void handleEditSubmit(event)}>
          <label htmlFor="edit-task-title">Názov</label>
          <input
            id="edit-task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
            disabled={isSaving || isDeleting}
          />

          <label htmlFor="edit-task-description">Popis</label>
          <textarea
            id="edit-task-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={5000}
            disabled={isSaving || isDeleting}
          />

          <label htmlFor="edit-task-assignee">Riešiteľ</label>
          <select
            id="edit-task-assignee"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            disabled={isSaving || isDeleting}
          >
            <option value="">Bez riešiteľa</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>

          <div className="task-detail-panel__actions">
            <button type="submit" className="app-button" disabled={isSaving || isDeleting}>
              {isSaving ? 'Ukladám…' : 'Uložiť zmeny'}
            </button>
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={() => setIsEditing(false)}
              disabled={isSaving || isDeleting}
            >
              Zrušiť
            </button>
          </div>
        </form>
      ) : (
        <>
          <h2>{task.title}</h2>
          <div className="app-form">
            <label htmlFor="task-status">Stav úlohy</label>
            <select
              id="task-status"
              value={task.status}
              disabled={isDeleting || isSaving}
              onChange={(event) => {
                const column = COLUMNS.find(({ status }) => status === event.target.value)
                if (column) onStatusChange(column.status)
              }}
            >
              {COLUMNS.map(({ status, label }) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <dl>
            <dt>Popis</dt>
            <dd>{task.description || 'Bez popisu'}</dd>

            <dt>Riešiteľ</dt>
            <dd>{task.assignee?.displayName || 'Nepridelené'}</dd>
          </dl>

          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={startEditing}
            disabled={isDeleting || isSaving}
          >
            Upraviť úlohu
          </button>
        </>
      )}

      <section className="task-detail-panel__dependencies" aria-label="Závislosti úlohy">
        <h3>Závisí od</h3>
        {dependencies.length === 0 ? (
          <p className="task-detail-panel__note">Táto úloha nemá žiadne závislosti.</p>
        ) : (
          <ul className="task-detail-panel__dependency-list">
            {dependencies.map((dep) => (
              <li key={dep.dependsOnId}>
                <span>
                  {dep.dependsOn.title} ({dep.dependsOn.status})
                </span>
                <button
                  type="button"
                  onClick={() => void onRemoveDependency(dep.dependsOnId)}
                  disabled={isDeleting || isSaving}
                  aria-label={`Odstrániť závislosť ${dep.dependsOn.title}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {availableDependencies.length > 0 && (
          <form className="app-form" onSubmit={(event) => void handleAddDependency(event)}>
            <label htmlFor="task-dependency-select">Pridať závislosť</label>
            <select
              id="task-dependency-select"
              value={selectedDependencyId}
              onChange={(event) => setSelectedDependencyId(event.target.value)}
              disabled={isDeleting || isSaving}
            >
              <option value="">Vyberte úlohu…</option>
              {availableDependencies.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="app-button app-button--secondary"
              disabled={!selectedDependencyId || isDeleting || isSaving}
            >
              Pridať závislosť
            </button>
          </form>
        )}
      </section>

      {error && (
        <p className="app-page__error" role="alert">
          {error}
        </p>
      )}
      <button
        className="task-detail-panel__delete"
        type="button"
        onClick={onDelete}
        disabled={isDeleting || isSaving}
      >
        {isDeleting ? 'Odstraňujem…' : 'Odstrániť úlohu'}
      </button>
    </aside>
  )
}
