// Import the hook that makes a card draggable.
import { useDraggable } from '@dnd-kit/core'
import gripIcon from '../../../assets/icons/grip.svg'
import AppIcon from '../../../components/AppIcon'
// Import the task type.
import type { Task } from '../types/task'

// isOverlay marks the temporary card preview used while dragging.
type Props = { task: Task; isOverlay?: boolean; disabled?: boolean }

function getInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : (words[0]?.slice(0, 2) ?? '').toUpperCase()
}

// Render the task data and enable dragging.
export default function TaskCard({ task, isOverlay = false, disabled = false }: Props) {
  // Disable dragging for the overlay and while a status update is pending.
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: isOverlay || disabled,
  })

  const classes = ['task-card']
  if (isDragging) classes.push('task-card--dragging')
  if (isOverlay) classes.push('task-card--overlay')
  if (disabled) classes.push('task-card--disabled')

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      role={isOverlay ? undefined : 'button'}
      tabIndex={isOverlay ? undefined : 0}
      aria-hidden={isOverlay || undefined}
      aria-label={isOverlay ? undefined : `Otvoriť detail úlohy ${task.title}`}
      data-task-id={task.id}
      className={classes.join(' ')}
    >
      <div className="task-card__heading">
        <h3>{task.title}</h3>
        <AppIcon src={gripIcon} />
      </div>
      {task.description && <p>{task.description}</p>}
      {task.assignee ? (
        <span
          className="task-card__assignee"
          aria-label={`Priradené: ${task.assignee.displayName}`}
          title={task.assignee.displayName}
        >
          <span className="task-card__avatar" aria-hidden="true">
            {getInitials(task.assignee.displayName)}
          </span>
        </span>
      ) : (
        <span className="task-card__assignee">Nepridelené</span>
      )}
    </div>
  )
}
