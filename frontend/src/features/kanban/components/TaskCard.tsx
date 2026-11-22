// Import the hook that makes a card draggable.
import { useDraggable } from '@dnd-kit/core'
// Import the task type.
import type { Task } from '../types/task'

// isOverlay marks the temporary card preview used while dragging.
type Props = { task: Task; isOverlay?: boolean; disabled?: boolean }

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
      <h3>{task.title}</h3>
      {/* Show the description only when one is available. */}
      {task.description && <p>{task.description}</p>}
      <span className="task-card__assignee">
        {/* Show the assignee name or the unassigned label. */}
        {task.assignee ? task.assignee.displayName : 'Nepridelené'}
      </span>
    </div>
  )
}
