import { Link } from 'react-router-dom'
import ProjectList from '../components/ProjectList'
import WorkspaceLoad from '../components/WorkspaceLoad'
import { useWorkspaceData } from './useWorkspaceData'
import { getProjects, requestWorkspace, type DashboardSummary } from './workspaceApi'

async function loadDashboard() {
  const [summary, projects] = await Promise.all([
    requestWorkspace<DashboardSummary>('/dashboard/summary'),
    getProjects(),
  ])
  return { summary, projects }
}

export default function DashboardPage() {
  const { state, reload } = useWorkspaceData(loadDashboard)

  return (
    <section className="app-page">
      <h1>Prehľad</h1>
      <div>
        <Link className="app-button" to="/projects?create=personal">
          Vytvoriť osobný projekt
        </Link>
      </div>
      {state.status === 'loading' && <WorkspaceLoad onRetry={reload} />}
      {state.status === 'error' && <WorkspaceLoad message={state.message} onRetry={reload} />}
      {state.status === 'ready' && (
        <>
          <dl className="app-summary">
            <div className="app-card">
              <dt>Tímy</dt>
              <dd>{state.data.summary.teamCount}</dd>
            </div>
            <div className="app-card">
              <dt>Projekty</dt>
              <dd>{state.data.summary.projectCount}</dd>
            </div>
            <div className="app-card">
              <dt>Úlohy</dt>
              <dd>{state.data.summary.taskCount}</dd>
            </div>
          </dl>
          <section aria-labelledby="dashboard-projects">
            <h2 id="dashboard-projects" className="app-card__title">
              Vaše projekty
            </h2>
            {state.data.projects.length ? (
              <>
                <ProjectList projects={state.data.projects} />
                {state.data.summary.taskCount === 0 && (
                  <p>Otvorte projekt a vytvorte prvú úlohu.</p>
                )}
              </>
            ) : (
              <p>Zatiaľ nemáte žiadny projekt. Začať môžete osobným projektom.</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}
