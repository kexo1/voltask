import backIcon from '../assets/icons/back.svg'
import AppIcon from './AppIcon'
import { Link } from 'react-router-dom'

export default function ProjectsBackLink() {
  return (
    <Link className="app-button app-button--secondary" to="/projects">
      <AppIcon src={backIcon} />
      Všetky projekty
    </Link>
  )
}
