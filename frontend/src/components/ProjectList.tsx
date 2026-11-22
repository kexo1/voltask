import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { projectBoardPath, type Project } from '../pages/workspaceApi'

export default function ProjectList({
  projects,
  renderActions,
}: {
  projects: Project[]
  renderActions?: (project: Project) => ReactNode
}) {
  return (
    <ul className="app-project-list">
      {projects.map((project) => (
        <li className="app-card" key={project.id}>
          <h3 className="app-card__title">
            <Link to={projectBoardPath(project.id)}>{project.name}</Link>
          </h3>
          {project.team && <p>Tím: {project.team.name}</p>}
          {project.description && <p className="app-project-description">{project.description}</p>}
          <p>Úlohy: {project.taskCount}</p>
          {renderActions?.(project)}
        </li>
      ))}
    </ul>
  )
}
