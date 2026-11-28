import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import OverflowMenu from '../components/OverflowMenu'
import ProjectMembers from '../components/ProjectMembers'
import ProjectsBackLink from '../components/ProjectsBackLink'
import WorkspaceLoad from '../components/WorkspaceLoad'
import {
  addTaskDependency,
  createTask,
  deleteTask,
  getTasks,
  removeTaskDependency,
  updateTask,
  updateTaskStatus,
  type ProjectTask,
  type TaskUpdateData,
} from '../features/kanban/data/taskApi'
import { deleteProject, getTeam, type Project, type ProjectMember } from './workspaceApi'
import { useWorkspaceData } from './useWorkspaceData'
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
import TaskCreateForm, { type TaskCreateData } from '../features/kanban/components/TaskCreateForm'
import { COLUMNS, type Task, type TaskStatus } from '../features/kanban/types/task'
import TaskDetailPanel from '../features/kanban/components/TaskDetailPanel'

type Props = { project: Project; userId: string }

export default function BoardPage({ project, userId }: Props) {
  const projectId = project.id
  const navigate = useNavigate()
  const teamId = project.team?.id
  const loadTeam = useCallback(
    () => (teamId ? getTeam(teamId) : Promise.resolve(null)),
    [teamId],
  )
  const { state: teamState, reload: reloadTeam } = useWorkspaceData(loadTeam)
  const [members, setMembers] = useState(project.members)
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [createStatus, setCreateStatus] = useState<TaskStatus | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)
  const [deleteProjectError, setDeleteProjectError] = useState('')
  const suppressClickAfterDrag = useRef(false)
  const taskTrigger = useRef<HTMLElement | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let current = true

    getTasks(projectId)
      .then((loadedTasks) => {
        if (!current) return
        setTasks(loadedTasks)
        setLoadState('ready')
      })
      .catch((loadError: unknown) => {
        if (current) {
          setLoadState('error')
          setError(
            loadError instanceof Error ? loadError.message : 'Nástenku sa nepodarilo načítať.',
          )
        }
      })

    return () => {
      current = false
    }
  }, [projectId, reloadKey])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const users = members.map(({ user }) => user)
  const usersById = new Map(users.map((user) => [user.id, user]))
  const boardTasks: Task[] = tasks.map((task) => ({
    ...task,
    assignee: task.assigneeId ? (usersById.get(task.assigneeId) ?? null) : null,
  }))
  const activeTask = boardTasks.find((task) => task.id === activeId) ?? null
  const selectedTask = boardTasks.find((task) => task.id === selectedTaskId) ?? null
  const canDeleteProject = project.team
    ? teamState.status === 'ready' &&
      teamState.data?.members.some(
        ({ role, user }) => role === 'OWNER' && user.id === userId,
      )
    : project.ownerId === userId

  function handleMembersChange(next: ProjectMember[], removedUserId?: string) {
    setMembers(next)
    if (removedUserId) {
      setTasks((current) =>
        current.map((task) =>
          task.assigneeId === removedUserId ? { ...task, assigneeId: null } : task,
        ),
      )
    }
  }

  function handleDragStart(event: DragStartEvent) {
    suppressClickAfterDrag.current = true
    setActiveId(String(event.active.id))
  }

  function openTaskDetail(card: HTMLElement) {
    const taskId = card.dataset.taskId
    if (!taskId) return

    setError('')
    taskTrigger.current = card
    setSelectedTaskId(taskId)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    window.setTimeout(() => {
      suppressClickAfterDrag.current = false
    }, 500)

    const taskId = String(event.active.id)
    const newStatus = COLUMNS.find(({ status }) => status === event.over?.id)?.status
    if (newStatus) await changeTaskStatus(taskId, newStatus)
  }

  async function changeTaskStatus(taskId: string, newStatus: TaskStatus) {
    const previousTask = tasks.find((task) => task.id === taskId)

    if (
      !previousTask ||
      previousTask.status === newStatus ||
      pendingTaskIds.has(taskId) ||
      deletingTaskId === taskId
    ) {
      return
    }

    setError('')
    setPendingTaskIds((ids) => new Set(ids).add(taskId))

    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)),
    )

    try {
      const saved = await updateTaskStatus(projectId, taskId, newStatus)
      if (saved.status !== newStatus) {
        setTasks((current) =>
          current.map((task) => (task.id === taskId ? { ...task, status: saved.status } : task)),
        )
      }
    } catch (saveError: unknown) {
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? { ...task, status: previousTask.status } : task,
        ),
      )
      setError(saveError instanceof Error ? saveError.message : 'Stav úlohy sa nepodarilo uložiť.')
    } finally {
      setPendingTaskIds((ids) => {
        const next = new Set(ids)
        next.delete(taskId)
        return next
      })
    }
  }

  async function handleCreateTask(data: TaskCreateData) {
    if (!createStatus) return
    setIsCreating(true)
    setError('')
    setSuccess('')
    try {
      const created = await createTask(projectId, { ...data, status: createStatus })
      setTasks((current) => [created, ...current])
      setCreateStatus(null)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleUpdateTask(taskId: string, data: TaskUpdateData) {
    setError('')
    setSuccess('')
    setPendingTaskIds((ids) => new Set(ids).add(taskId))

    try {
      const updated = await updateTask(projectId, taskId, data)
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)))
      setSuccess('Úloha bola aktualizovaná.')
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error ? updateError.message : 'Úlohu sa nepodarilo upraviť.',
      )
      throw updateError
    } finally {
      setPendingTaskIds((ids) => {
        const next = new Set(ids)
        next.delete(taskId)
        return next
      })
    }
  }

  async function handleAddDependency(taskId: string, dependsOnId: string) {
    setError('')
    setSuccess('')
    setPendingTaskIds((ids) => new Set(ids).add(taskId))

    try {
      const updated = await addTaskDependency(projectId, taskId, dependsOnId)
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)))
      setSuccess('Závislosť bola pridaná.')
    } catch (depError: unknown) {
      setError(
        depError instanceof Error ? depError.message : 'Závislosť sa nepodarilo pridať.',
      )
    } finally {
      setPendingTaskIds((ids) => {
        const next = new Set(ids)
        next.delete(taskId)
        return next
      })
    }
  }

  async function handleRemoveDependency(taskId: string, dependsOnId: string) {
    setError('')
    setSuccess('')
    setPendingTaskIds((ids) => new Set(ids).add(taskId))

    try {
      const updated = await removeTaskDependency(projectId, taskId, dependsOnId)
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)))
      setSuccess('Závislosť bola odstránená.')
    } catch (depError: unknown) {
      setError(
        depError instanceof Error ? depError.message : 'Závislosť sa nepodarilo odstrániť.',
      )
    } finally {
      setPendingTaskIds((ids) => {
        const next = new Set(ids)
        next.delete(taskId)
        return next
      })
    }
  }

  async function handleDeleteTask() {
    if (
      !selectedTask ||
      deletingTaskId ||
      pendingTaskIds.has(selectedTask.id) ||
      !window.confirm(`Naozaj chcete odstrániť úlohu "${selectedTask.title}"?`)
    ) {
      return
    }

    const taskId = selectedTask.id
    setDeletingTaskId(taskId)
    setError('')
    setSuccess('')

    try {
      await deleteTask(projectId, taskId)
      setTasks((current) => current.filter((task) => task.id !== taskId))
      setSelectedTaskId(null)
      addButton.current?.focus()
      setSuccess('Úloha bola odstránená.')
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Úlohu sa nepodarilo odstrániť.',
      )
    } finally {
      setDeletingTaskId(null)
    }
  }

  async function handleDeleteProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDeletingProject) return

    setIsDeletingProject(true)
    setDeleteProjectError('')
    try {
      await deleteProject(projectId)
      const returnPath = project.team
        ? `/projects?team=${encodeURIComponent(project.team.id)}`
        : '/projects'
      navigate(returnPath, { replace: true })
    } catch (deleteError: unknown) {
      setDeleteProjectError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Projekt sa nepodarilo odstrániť.',
      )
      setIsDeletingProject(false)
    }
  }

  return (
    <>
      <header className="board__header">
        <div className="board__toolbar">
          <div className="board__navigation">
            <ProjectsBackLink />
            <ProjectMembers
              project={project}
              userId={userId}
              members={members}
              onChange={handleMembersChange}
            />
          </div>
          {canDeleteProject && (
            <OverflowMenu label="Ďalšie možnosti projektu">
              <button
                className="app-overflow-menu__item app-overflow-menu__item--danger"
                type="button"
                onClick={() => {
                  setDeleteProjectError('')
                  setDeleteProjectOpen(true)
                }}
              >
                Odstrániť projekt
              </button>
            </OverflowMenu>
          )}
        </div>
        <div className="board__identity">
          <h1>{project.name}</h1>
          {project.team && <p className="board__team-context">Tím: {project.team.name}</p>}
        </div>
      </header>

      {project.team && teamState.status === 'error' && (
        <WorkspaceLoad message={teamState.message} onRetry={reloadTeam} />
      )}

      {success && (
        <p className="app-page__success" role="status">
          {success}
        </p>
      )}

      {loadState === 'loading' && (
        <p className="board__status" role="status">
          Načítavam nástenku…
        </p>
      )}

      {error && !selectedTask && (
        <div className="board__error" role="alert">
          <span>{error}</span>
          <button
            className="app-button app-button--secondary"
            type="button"
            disabled={pendingTaskIds.size > 0 || deletingTaskId !== null}
            onClick={() => {
              setSelectedTaskId(null)
              setLoadState('loading')
              setError('')
              setReloadKey((key) => key + 1)
            }}
          >
            {loadState === 'error' ? 'Skúsiť znova' : 'Obnoviť úlohy'}
          </button>
        </div>
      )}

      {createStatus && (
        <Modal
          labelId="task-create-form-title"
          busy={isCreating}
          onClose={() => setCreateStatus(null)}
        >
          <TaskCreateForm
            members={users}
            disabled={isCreating}
            onSubmit={handleCreateTask}
            onCancel={() => setCreateStatus(null)}
          />
        </Modal>
      )}

      {loadState === 'ready' && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveId(null)
            suppressClickAfterDrag.current = false
          }}
        >
          <div
            className="board__columns"
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              const card = (event.target as HTMLElement).closest<HTMLElement>('[data-task-id]')
              if (card) {
                event.preventDefault()
                openTaskDetail(card)
              }
            }}
            onClick={(event) => {
              if (suppressClickAfterDrag.current) {
                suppressClickAfterDrag.current = false
                return
              }
              const card = (event.target as HTMLElement).closest<HTMLElement>('[data-task-id]')
              if (card) openTaskDetail(card)
            }}
          >
            {COLUMNS.map(({ status, label }) => (
              <BoardColumn
                key={status}
                status={status}
                label={label}
                tasks={boardTasks.filter((task) => task.status === status)}
                pendingTaskIds={pendingTaskIds}
                addButtonRef={status === COLUMNS[0].status ? addButton : undefined}
                onAddTask={() => setCreateStatus(status)}
              />
            ))}
          </div>

          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeTask && <TaskCard task={activeTask} isOverlay />}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      )}

      <TaskDetailPanel
        task={selectedTask}
        members={users}
        allTasks={boardTasks}
        error={error}
        onClose={() => {
          setError('')
          setSelectedTaskId(null)
          const trigger = taskTrigger.current
          if (trigger?.isConnected) trigger.focus()
          else addButton.current?.focus()
        }}
        onDelete={() => void handleDeleteTask()}
        isDeleting={deletingTaskId !== null}
        isSaving={selectedTask ? pendingTaskIds.has(selectedTask.id) : false}
        onStatusChange={(status) => {
          if (selectedTask) void changeTaskStatus(selectedTask.id, status)
        }}
        onUpdateTask={(data) =>
          selectedTask ? handleUpdateTask(selectedTask.id, data) : Promise.resolve()
        }
        onAddDependency={(dependsOnId) =>
          selectedTask ? handleAddDependency(selectedTask.id, dependsOnId) : Promise.resolve()
        }
        onRemoveDependency={(dependsOnId) =>
          selectedTask ? handleRemoveDependency(selectedTask.id, dependsOnId) : Promise.resolve()
        }
      />

      {deleteProjectOpen && (
        <Modal
          labelId="delete-project-title"
          busy={isDeletingProject}
          onClose={() => setDeleteProjectOpen(false)}
        >
          <h2 id="delete-project-title" className="app-card__title">
            Odstrániť projekt „{project.name}“?
          </h2>
          <form onSubmit={(event) => void handleDeleteProject(event)}>
            <p>Spolu s projektom sa natrvalo odstránia všetky jeho úlohy a ich závislosti.</p>
            {deleteProjectError && (
              <p className="app-page__error" role="alert">
                {deleteProjectError}
              </p>
            )}
            <div className="app-card__actions">
              <button
                className="app-button app-button--secondary"
                type="button"
                onClick={() => setDeleteProjectOpen(false)}
                disabled={isDeletingProject}
              >
                Zrušiť
              </button>
              <button
                className="app-button app-button--danger"
                type="submit"
                disabled={isDeletingProject}
              >
                {isDeletingProject ? 'Odstraňujem…' : 'Odstrániť projekt'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
