export default function AppIcon({ src }: { src: string }) {
  return <span className="app-icon" style={{ maskImage: `url("${src}")` }} aria-hidden="true" />
}
