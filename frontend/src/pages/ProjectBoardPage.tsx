import { useCallback } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import ProjectsBackLink from '../components/ProjectsBackLink'
import WorkspaceLoad from '../components/WorkspaceLoad'
import BoardPage from './BoardPage'
import { useWorkspaceData } from './useWorkspaceData'
import { requestWorkspace, type Project } from './workspaceApi'
import './BoardPage.css'

function ProjectBoard({ projectId, userId }: { projectId: string; userId: string }) {
  const load = useCallback(
    () => requestWorkspace<Project>(`/projects/${encodeURIComponent(projectId)}`),
    [projectId],
  )
  const { state, reload } = useWorkspaceData(load)

  if (state.status !== 'ready') {
    return (
      <section className="app-page">
        <div>
          <ProjectsBackLink />
        </div>
        <h1>Projekt</h1>
        <WorkspaceLoad
          onRetry={reload}
          message={state.status === 'error' ? state.message : undefined}
        />
      </section>
    )
  }

  return <BoardPage project={state.data} userId={userId} />
}

export default function ProjectBoardPage({ userId }: { userId: string }) {
  const { projectId } = useParams()
  if (!projectId) return <Navigate to="/projects" replace />

  return (
    <main className="board">
      <ProjectBoard key={projectId} projectId={projectId} userId={userId} />
    </main>
  )
}
