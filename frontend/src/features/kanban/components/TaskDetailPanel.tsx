import { useEffect, useRef } from 'react'
import { COLUMNS, type Task, type TaskStatus } from '../types/task'

type Props = {
  task: Task | null
  error: string
  onClose: () => void
  onDelete: () => void
  isDeleting?: boolean
  isSaving?: boolean
  onStatusChange: (status: TaskStatus) => void
}

export default function TaskDetailPanel({
  task,
  error,
  onClose,
  onDelete,
  isDeleting = false,
  isSaving = false,
  onStatusChange,
}: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const taskId = task?.id
  useEffect(() => {
    if (taskId) closeButton.current?.focus()
  }, [taskId])

  if (!task) return null

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
