import plusIcon from '../../../assets/icons/plus.svg'
import AppIcon from '../../../components/AppIcon'
import type { Ref } from 'react'
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
  addButtonRef?: Ref<HTMLButtonElement>
  onAddTask: () => void
}

// Render one status column and its tasks.
export default function BoardColumn({
  status,
  label,
  tasks,
  pendingTaskIds = new Set(),
  addButtonRef,
  onAddTask,
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
      {!tasks.length && (
        <p className="board-column__empty">Presuňte sem úlohu</p>
      )}
      {status !== 'DONE' && (
        <button
          ref={addButtonRef}
          className="app-button app-button--secondary"
          type="button"
          onClick={onAddTask}
        >
          <AppIcon src={plusIcon} />
          Pridať úlohu
        </button>
      )}
    </section>
  )
}
