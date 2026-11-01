// Importuj hook, vďaka ktorému je stĺpec cieľom na pustenie karty.
import { useDroppable } from '@dnd-kit/core'
// Importuj typy úloh a komponent karty úlohy.
import type { Task, TaskStatus } from '../types/task'
import TaskCard from './TaskCard'

// Tieto hodnoty dostane komponent zo stránky nástenky.
type Props = { status: TaskStatus; label: string; tasks: Task[] }

// Zobraz stĺpec jedného stavu a úlohy, ktoré doň patria.
export default function BoardColumn({ status, label, tasks }: Props) {
  // Nastav túto sekciu ako cieľ na pustenie; jej ID je stav úlohy.
  const { setNodeRef, isOver } = useDroppable({ id: status })

  // Vykresli názov stĺpca, počet úloh a ich karty.
  return (
    <section
      ref={setNodeRef}
      className={`board-column${isOver ? ' board-column--over' : ''}`}
    >
      <h2>
        {label} <span className="board-column__count">{tasks.length}</span>
      </h2>
      <div className="board-column__tasks">
        {/* Vytvor kartu pre každú úlohu v tomto stĺpci. */}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </section>
  )
}
