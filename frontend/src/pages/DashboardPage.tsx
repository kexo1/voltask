import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import plusIcon from '../assets/icons/plus.svg'
import projectIcon from '../assets/icons/project.svg'
import taskIcon from '../assets/icons/task.svg'
import teamIcon from '../assets/icons/team.svg'
import AppIcon from '../components/AppIcon'
import WorkspaceLoad from '../components/WorkspaceLoad'
import { getAssignedTasks, loadProjectsAndTasks } from './projectTaskData'
import { useWorkspaceData } from './useWorkspaceData'
import { projectBoardPath, requestWorkspace, type DashboardSummary } from './workspaceApi'

async function loadDashboard(userId: string) {
  const [summary, projectData] = await Promise.all([
    requestWorkspace<DashboardSummary>('/dashboard/summary'),
    loadProjectsAndTasks(),
  ])
  return {
    summary,
    ...projectData,
    assignedTasks: getAssignedTasks(projectData.tasks, userId).slice(0, 8),
  }
}

export default function DashboardPage({ userId }: { userId: string }) {
  const load = useCallback(() => loadDashboard(userId), [userId])
  const { state, reload } = useWorkspaceData(load)

  return (
    <section className="app-page">
      <div className="app-page__heading">
        <h1>Prehľad</h1>
        <Link className="app-button" to="/projects?create=personal">
          <AppIcon src={plusIcon} />
          Vytvoriť osobný projekt
        </Link>
      </div>
      {state.status === 'loading' && <WorkspaceLoad onRetry={reload} />}
      {state.status === 'error' && <WorkspaceLoad message={state.message} onRetry={reload} />}
      {state.status === 'ready' && (
        <>
          <nav className="app-summary" aria-label="Prehľad pracovného priestoru">
            <Link className="app-card app-summary__card" to="/teams">
              <span className="app-summary__label">
                <AppIcon src={teamIcon} />
                Tímy
              </span>
              <strong>{state.data.summary.teamCount}</strong>
            </Link>
            <Link className="app-card app-summary__card" to="/projects">
              <span className="app-summary__label">
                <AppIcon src={projectIcon} />
                Projekty
              </span>
              <strong>{state.data.summary.projectCount}</strong>
            </Link>
            <Link className="app-card app-summary__card" to="/#dashboard-assigned">
              <span className="app-summary__label">
                <AppIcon src={taskIcon} />
                Úlohy
              </span>
              <strong>{state.data.summary.taskCount}</strong>
            </Link>
          </nav>
          <section
            id="dashboard-assigned"
            className="dashboard-assigned"
            aria-labelledby="dashboard-assigned-title"
          >
            <h2 id="dashboard-assigned-title">Moje priradené úlohy</h2>
            {state.data.assignedTasks.length ? (
              <ul className="dashboard-assigned__list">
                {state.data.assignedTasks.map((task) => {
                  const project = state.data.projects.find(({ id }) => id === task.projectId)
                  return (
                    <li key={task.id}>
                      <Link to={projectBoardPath(task.projectId)}>
                        <span>{task.title}</span>
                        <span className="dashboard-assigned__project">
                          {project?.name ?? 'Projekt'}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p>Nemáte žiadne priradené úlohy.</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}
