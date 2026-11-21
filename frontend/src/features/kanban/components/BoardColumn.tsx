// Import the hook that makes the column a drop target.
import { useDroppable } from '@dnd-kit/core'
// Import task types and the task card component.
import type { Task, TaskStatus } from '../types/task'
import TaskCard from './TaskCard'

// The board page supplies these column values.
type Props = {
  status: TaskStatus
  label: string
  tasks: Task[]
  pendingTaskIds?: Set<string>
}

// Render one status column and its tasks.
export default function BoardColumn({
  status,
  label,
  tasks,
  pendingTaskIds = new Set(),
}: Props) {
  // Use the status as the column drop target ID.
  const { setNodeRef, isOver } = useDroppable({ id: status })

  // Render the column title, task count, and cards.
  return (
    <section
      ref={setNodeRef}
      className={`board-column${isOver ? ' board-column--over' : ''}`}
    >
      <h2>
        {label} <span className="board-column__count">{tasks.length}</span>
      </h2>
      <div className="board-column__tasks">
        {/* Render every task in this column. */}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            disabled={pendingTaskIds.has(task.id)}
          />
        ))}
      </div>
    </section>
  )
}
