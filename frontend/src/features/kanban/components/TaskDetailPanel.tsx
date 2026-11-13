import type { Task } from '../types/task'

type Props = { task: Task | null; onClose: () => void; onDelete: () => void; isDeleting?: boolean }

export default function TaskDetailPanel({ task, onClose, onDelete, isDeleting = false }: Props) {
  if (!task) return null
  const statusLabel = task.status === 'TODO' ? 'To Do' : task.status === 'IN_PROGRESS' ? 'In Progress' : 'Done'

  return (
    <aside className="task-detail-panel" aria-label="Detail úlohy">
      <div className="task-detail-panel__header">
        <p>Detail úlohy</p>
        <button type="button" onClick={onClose} aria-label="Zavrieť detail">×</button>
      </div>
      <h2>{task.title}</h2>
      <span className="task-detail-panel__status">{statusLabel}</span>
      <dl>
        <dt>Popis</dt><dd>{task.description || 'Bez popisu'}</dd>
        <dt>Riešiteľ</dt><dd>{task.assignee?.displayName || 'Nepridelené'}</dd>
      </dl>
      <p className="task-detail-panel__note">Detail je iba na čítanie. Úprava názvu a popisu zatiaľ nie je podporovaná API.</p>
      <button className="task-detail-panel__delete" type="button" onClick={onDelete} disabled={isDeleting}>
        {isDeleting ? 'Odstraňujem…' : 'Odstrániť úlohu'}
      </button>
    </aside>
  )
}
