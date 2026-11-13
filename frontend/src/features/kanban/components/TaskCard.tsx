// Import the hook that makes a card draggable.
import { useDraggable } from '@dnd-kit/core'
// Import the task type.
import type { Task } from '../types/task'

// isOverlay marks the temporary card preview used while dragging.
type Props = { task: Task; isOverlay?: boolean; disabled?: boolean }

// Render the task data and enable dragging.
export default function TaskCard({ task, isOverlay = false, disabled = false }: Props) {
  // Disable dragging for the overlay and while a status update is pending.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: isOverlay || disabled,
  })

  // Render the card with styles for dragging and the overlay.
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-task-id={task.id}
      className={`task-card${isDragging ? ' task-card--dragging' : ''}${isOverlay ? ' task-card--overlay' : ''}${disabled ? ' task-card--disabled' : ''}`}
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
