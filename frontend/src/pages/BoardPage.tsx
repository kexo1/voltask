// Importuj React state, ktorý uchováva zoznam úloh v pamäti.
import { useState } from 'react'
// Importuj nástroje na ťahanie a typy udalostí.
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
// Importuj stĺpec nástenky a kartu úlohy.
import BoardColumn from '../features/kanban/components/BoardColumn'
import TaskCard from '../features/kanban/components/TaskCard'
// Importuj dočasné úlohy a povolené stavy úloh.
import { MOCK_TASKS } from '../features/kanban/data/tasks'
import { COLUMNS, type Task, type TaskStatus } from '../features/kanban/types/task'
// Načítaj štýly použité na nástenke.
import './BoardPage.css'

// Zostav stránku nástenky a spracuj presúvanie úloh.
export default function BoardPage() {
  // Ulož zoznam úloh do React state, aby zmena prekreslila nástenku.
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS)
  // Ulož ID karty, ktorú práve ťaháme.
  const [activeId, setActiveId] = useState<string | null>(null)

  // Ťahanie myšou začne po pohybe o 5 px; dotykové ťahanie po krátkom podržaní.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  )

  // Nájdi ťahanú úlohu, aby sa zobrazila v náhľade pri presúvaní.
  const activeTask = tasks.find((t) => t.id === activeId) ?? null

  // Zapamätaj si, ktorá karta sa začala presúvať.
  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  // Presuň kartu do stavu stĺpca, kam bola pustená.
  function handleDragEnd(event: DragEndEvent) {
    // Po skončení ťahania zruš označenie aktívnej karty.
    setActiveId(null)
    // Ak karta nebola pustená na stĺpec, nič nemeň.
    if (!event.over) return
    // Zisti ID ťahanej karty a stav cieľového stĺpca.
    const taskId = String(event.active.id)
    const newStatus = event.over.id as TaskStatus
    // Zmeň iba presunutú úlohu; React potom prekreslí nástenku.
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    )
  }

  // Vykresli nadpis, stĺpce stavov a náhľad ťahanej karty.
  return (
    <main className="board">
      <h1>Kanban nástenka</h1>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="board__columns">
          {/* Vytvor stĺpec pre každý stav a vyber jeho úlohy. */}
          {COLUMNS.map(({ status, label }) => (
            <BoardColumn
              key={status}
              status={status}
              label={label}
              tasks={tasks.filter((t) => t.status === status)}
            />
          ))}
        </div>
        {/* Počas ťahania zobraz plávajúcu kópiu karty. */}
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isOverlay />}
        </DragOverlay>
      </DndContext>
    </main>
  )
}
