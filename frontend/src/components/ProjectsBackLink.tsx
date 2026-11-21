import { Link } from 'react-router-dom'

export default function ProjectsBackLink() {
  return (
    <Link className="app-button app-button--secondary app-button--back" to="/projects">
      <span aria-hidden="true">←</span>
      Všetky projekty
    </Link>
  )
}
