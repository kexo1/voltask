// Importuj hook, vďaka ktorému sa dá karta ťahať.
import { useDraggable } from '@dnd-kit/core'
// Importuj typ údajov úlohy.
import type { Task } from '../types/task'

// Karta potrebuje údaje úlohy; isOverlay označuje dočasný náhľad pri ťahaní.
type Props = { task: Task; isOverlay?: boolean }

// Zobraz údaje úlohy a zapoj kartu do ťahania.
export default function TaskCard({ task, isOverlay = false }: Props) {
  // Nastav kartu ako ťahateľnú, okrem prípadu, keď vykresľujeme jej náhľad.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: isOverlay,
  })

  // Vykresli kartu a nastav triedy pre ťahanie a jeho náhľad.
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`task-card${isDragging ? ' task-card--dragging' : ''}${isOverlay ? ' task-card--overlay' : ''}`}
    >
      <h3>{task.title}</h3>
      {/* Popis zobraz iba vtedy, ak je vyplnený. */}
      {task.description && <p>{task.description}</p>}
      <span className="task-card__assignee">
        {/* Zobraz meno priradenej osoby alebo text, ak nikto nie je priradený. */}
        {task.assignee ? task.assignee.displayName : 'Nepridelené'}
      </span>
    </div>
  )
}
