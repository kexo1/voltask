import { Link } from 'react-router-dom'
import { projectBoardPath, type Project } from '../pages/workspaceApi'
import type { ProjectTaskProgress } from '../pages/projectTaskData'

export default function ProjectList({
  projects,
  taskProgress,
}: {
  projects: Project[]
  taskProgress?: Record<string, ProjectTaskProgress>
}) {
  return (
    <ul className="app-project-list">
      {projects.map((project) => {
        const progress = taskProgress?.[project.id]
        const percent = progress?.total
          ? (progress.completed / progress.total) * 100
          : 0
        const description = project.description?.trim()

        return (
          <li className="app-card" key={project.id}>
            <Link className="app-project-list__link" to={projectBoardPath(project.id)}>
              <div className="app-project-list__heading">
                <h3 className="app-card__title">{project.name}</h3>
                <span
                  className={`app-project-badge${project.team ? ' app-project-badge--team' : ' app-project-badge--personal'}`}
                >
                  {project.team?.name ?? 'Osobný'}
                </span>
              </div>
              {description && description !== project.name.trim() && (
                <p className="app-project-description">{description}</p>
              )}
              {progress && (
                <div className="app-project-progress">
                  <span>
                    {progress.completed}/{progress.total} dokončených
                  </span>
                  <span
                    className="app-project-progress__track"
                    role="progressbar"
                    aria-label={`Progres projektu ${project.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                  >
                    <span
                      className="app-project-progress__value"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </div>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
