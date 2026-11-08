import { useEffect, useState } from 'react'
// Import drag-and-drop tools and event types.
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
import BoardColumn from '../features/kanban/components/BoardColumn'
import TaskCard from '../features/kanban/components/TaskCard'
import TaskCreateForm, {
  type TaskCreateData,
  type TeamMember,
} from '../features/kanban/components/TaskCreateForm'
import {
  createTask,
  getTeamMembers,
  getTasks,
  getTeams,
  updateTaskStatus,
  type KanbanTeam,
} from '../features/kanban/data/taskApi'
import { COLUMNS, type Task } from '../features/kanban/types/task'
import './BoardPage.css'

type LoadState =
  | { key: number; status: 'loading' | 'ready' }
  | { key: number; status: 'error'; error: string }

type TaskLoadState =
  | { teamId: string; key: number; status: 'loading' | 'ready' }
  | { teamId: string; key: number; status: 'error'; error: string }

export default function BoardPage() {
  const [teams, setTeams] = useState<KanbanTeam[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamLoad, setTeamLoad] = useState<LoadState>({
    key: 0,
    status: 'loading',
  })
  const [taskLoad, setTaskLoad] = useState<TaskLoadState>({
    teamId: '',
    key: 0,
    status: 'loading',
  })
  const [boardError, setBoardError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set())
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null
  const isLoadingTeams =
    teamLoad.key !== reloadKey || teamLoad.status === 'loading'
  const isLoadingTasks =
    Boolean(selectedTeamId) &&
    (taskLoad.teamId !== selectedTeamId ||
      taskLoad.key !== reloadKey ||
      taskLoad.status === 'loading')
  const loadError =
    teamLoad.key === reloadKey && teamLoad.status === 'error'
      ? teamLoad.error
      : taskLoad.teamId === selectedTeamId &&
          taskLoad.key === reloadKey &&
          taskLoad.status === 'error'
        ? taskLoad.error
        : ''

  useEffect(() => {
    let isCurrent = true

    getTeams()
      .then((loadedTeams) => {
        if (!isCurrent) return
        setTeams(loadedTeams)
        setSelectedTeamId((current) =>
          loadedTeams.some((team) => team.id === current)
            ? current
            : loadedTeams[0]?.id ?? '',
        )
        setTeamLoad({ key: reloadKey, status: 'ready' })
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setTeamLoad({
            key: reloadKey,
            status: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Timy sa nepodarilo nacitat.',
          })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [reloadKey])

  useEffect(() => {
    if (!selectedTeamId) return

    let isCurrent = true

    getTeamMembers(selectedTeamId)
      .then(async (loadedMembers) => {
        if (!isCurrent) return
        const loadedTasks = await getTasks(selectedTeamId, loadedMembers)
        if (!isCurrent) return
        setMembers(loadedMembers)
        setTasks(loadedTasks)
        setTaskLoad({ teamId: selectedTeamId, key: reloadKey, status: 'ready' })
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setTaskLoad({
            teamId: selectedTeamId,
            key: reloadKey,
            status: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Ulohy sa nepodarilo nacitat.',
          })
        }
      })

    return () => {
      isCurrent = false
    }
  }, [selectedTeamId, reloadKey])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  )

  const activeTask = tasks.find((t) => t.id === activeId) ?? null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    if (!event.over) return

    const taskId = String(event.active.id)
    const newStatus = COLUMNS.find(({ status }) => status === event.over?.id)?.status
    const previousTask = tasks.find((task) => task.id === taskId)
    if (!newStatus || !previousTask || previousTask.status === newStatus) return

    setBoardError('')
    setPendingTaskIds((current) => new Set(current).add(taskId))
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task,
      ),
    )

    try {
      await updateTaskStatus(taskId, newStatus)
    } catch (error) {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? { ...task, status: previousTask.status }
            : task,
        ),
      )
      setBoardError(
        error instanceof Error
          ? error.message
          : 'Stav ulohy sa nepodarilo ulozit.',
      )
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current)
        next.delete(taskId)
        return next
      })
    }
  }

  async function handleCreateTask(data: TaskCreateData) {
    if (!selectedTeam) throw new Error('Najprv vyberte tim.')

    setBoardError('')
    setIsCreatingTask(true)
    try {
      const task = await createTask(selectedTeam.id, members, data)
      setTasks((previous) => [task, ...previous])
    } finally {
      setIsCreatingTask(false)
    }
  }

  return (
    <main className="board">
      <h1>Kanban nástenka</h1>
      <label className="board__team-picker" htmlFor="board-team">
        Tím
        <select
          id="board-team"
          value={selectedTeamId}
          onChange={(event) => {
            setSelectedTeamId(event.target.value)
            setTasks([])
            setMembers([])
            setActiveId(null)
            setBoardError('')
          }}
          disabled={
            isLoadingTeams ||
            isCreatingTask ||
            pendingTaskIds.size > 0 ||
            teams.length === 0
          }
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      {loadError && (
        <div className="board__error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)}>
            Skúsiť znova
          </button>
        </div>
      )}
      {boardError && <p className="board__error" role="alert">{boardError}</p>}
      {isLoadingTeams && <p role="status">Načítavam tímy…</p>}
      {!isLoadingTeams && !loadError && teams.length === 0 && (
        <p>Nie ste členom žiadneho tímu.</p>
      )}
      <TaskCreateForm
        members={members}
        disabled={
          isLoadingTeams ||
          isLoadingTasks ||
          isCreatingTask ||
          !selectedTeam ||
          Boolean(loadError)
        }
        onSubmit={handleCreateTask}
      />
      {isLoadingTasks && <p role="status">Načítavam úlohy…</p>}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="board__columns">
          {COLUMNS.map(({ status, label }) => (
            <BoardColumn
              key={status}
              status={status}
              label={label}
              tasks={tasks.filter((t) => t.status === status)}
              pendingTaskIds={pendingTaskIds}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isOverlay />}
        </DragOverlay>
      </DndContext>
    </main>
  )
}
