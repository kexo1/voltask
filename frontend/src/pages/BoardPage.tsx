import { useEffect, useState } from 'react'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import BoardColumn from '../features/kanban/components/BoardColumn'
import TaskCard from '../features/kanban/components/TaskCard'
import TaskCreateForm, { type TaskCreateData, type TeamMember } from '../features/kanban/components/TaskCreateForm'
import { COLUMNS, type Task, type TaskStatus } from '../features/kanban/types/task'
import TaskDetailPanel from '../features/kanban/components/TaskDetailPanel'
import './BoardPage.css'

type Props = { teamId: string }
type LoadState = 'loading' | 'ready' | 'error'

async function requestApi(path: string, options: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...options, headers, credentials: 'include' })
  if (!response.ok) throw new Error(`Požiadavka zlyhala (${response.status}).`)
  return response.json()
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function parseMembers(data: unknown): TeamMember[] {
  if (!isRecord(data) || !Array.isArray(data.members)) throw new Error('Členov tímu sa nepodarilo načítať.')
  return data.members.flatMap((item) => isRecord(item) && isRecord(item.user) && typeof item.user.id === 'string' && typeof item.user.displayName === 'string' ? [{ id: item.user.id, displayName: item.user.displayName }] : [])
}
function parseTask(data: unknown, teamId: string, members: TeamMember[]): Task {
  if (!isRecord(data) || typeof data.id !== 'string' || typeof data.title !== 'string' || !COLUMNS.some((column) => column.status === data.status)) throw new Error('API vrátilo neplatné údaje úlohy.')
  const assigneeId = typeof data.assigneeId === 'string' ? data.assigneeId : null
  const relation = isRecord(data.assignee) && typeof data.assignee.id === 'string' ? data.assignee : null
  return { id: data.id, title: data.title, description: typeof data.description === 'string' ? data.description : null, status: data.status as TaskStatus, teamId: typeof data.teamId === 'string' ? data.teamId : teamId, assignee: relation ? { id: relation.id as string, displayName: typeof relation.displayName === 'string' ? relation.displayName : 'Neznámy riešiteľ' } : assigneeId ? members.find((member) => member.id === assigneeId) ?? { id: assigneeId, displayName: 'Neznámy riešiteľ' } : null }
}

export default function BoardPage({ teamId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    let current = true
    setTasks([]); setMembers([]); setSelectedTaskId(null); setLoadState('loading'); setError('')
    Promise.all([
      requestApi(`/api/teams/${encodeURIComponent(teamId)}`).then(parseMembers),
      requestApi(`/api/tasks?teamId=${encodeURIComponent(teamId)}`).then((data) => { if (!Array.isArray(data)) throw new Error('API vrátilo neplatný zoznam úloh.'); return data }),
    ]).then(([loadedMembers, loadedTasks]) => {
      if (!current) return
      setMembers(loadedMembers); setTasks((loadedTasks as unknown[]).map((task) => parseTask(task, teamId, loadedMembers))); setLoadState('ready')
    }).catch((loadError: unknown) => { if (current) { setLoadState('error'); setError(loadError instanceof Error ? loadError.message : 'Nástenku sa nepodarilo načítať.') } })
    return () => { current = false }
  }, [teamId, reloadKey])

  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }))
  const activeTask = tasks.find((task) => task.id === activeId) ?? null
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null
  function handleDragStart(event: DragStartEvent) { setActiveId(String(event.active.id)) }
  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const taskId = String(event.active.id); const newStatus = COLUMNS.find(({ status }) => status === event.over?.id)?.status; const previousTask = tasks.find((task) => task.id === taskId)
    if (!newStatus || !previousTask || previousTask.status === newStatus) return
    setError(''); setPendingTaskIds((ids) => new Set(ids).add(taskId)); setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: newStatus } : task))
    try { await requestApi(`/api/tasks/${encodeURIComponent(taskId)}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) }) }
    catch (saveError: unknown) { setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: previousTask.status } : task)); setError(saveError instanceof Error ? saveError.message : 'Stav úlohy sa nepodarilo uložiť.') }
    finally { setPendingTaskIds((ids) => { const next = new Set(ids); next.delete(taskId); return next }) }
  }
  async function handleCreateTask(data: TaskCreateData) {
    setIsCreating(true)
    try { const created = await requestApi('/api/tasks', { method: 'POST', body: JSON.stringify({ ...data, teamId }) }); setTasks((current) => [parseTask(created, teamId, members), ...current]); setIsCreateOpen(false) }
    finally { setIsCreating(false) }
  }
  return <main className="board">
    <header className="board__header"><div><p className="board__eyebrow">Voltask · tímová nástenka</p><h1>Kanban nástenka</h1><p className="board__team-id">Tím: {teamId}</p></div><button className="board__add-button" type="button" onClick={() => setIsCreateOpen(true)} disabled={loadState !== 'ready' || pendingTaskIds.size > 0} aria-label="Vytvoriť úlohu">+</button></header>
    {loadState === 'loading' && <p className="board__status" role="status">Načítavam nástenku…</p>}
    {error && <div className="board__error" role="alert"><span>{error}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)}>Skúsiť znova</button></div>}
    {loadState === 'ready' && tasks.length === 0 && <p className="board__empty">Tento tím zatiaľ nemá žiadne úlohy. Vytvorte prvú pomocou tlačidla +.</p>}
    {pendingTaskIds.size > 0 && <p className="board__pending" role="status">Ukladám zmenu stavu…</p>}
    {isCreateOpen && <div className="board__drawer-backdrop" onClick={() => setIsCreateOpen(false)}><aside className="board__drawer" onClick={(event) => event.stopPropagation()}><TaskCreateForm members={members} disabled={isCreating || pendingTaskIds.size > 0} onSubmit={handleCreateTask} onCancel={() => setIsCreateOpen(false)} /></aside></div>}
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}><div className="board__columns" onClick={(event) => { const card = (event.target as HTMLElement).closest<HTMLElement>('[data-task-id]'); if (card) setSelectedTaskId(card.dataset.taskId ?? null) }}>{COLUMNS.map(({ status, label }) => <BoardColumn key={status} status={status} label={label} tasks={tasks.filter((task) => task.status === status)} pendingTaskIds={pendingTaskIds} />)}</div><DragOverlay>{activeTask && <TaskCard task={activeTask} isOverlay />}</DragOverlay></DndContext>
    <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTaskId(null)} />
  </main>
}
