export default function WorkspaceLoad({
  message,
  onRetry,
}: {
  message?: string
  onRetry: () => void
}) {
  if (message === undefined) return <p role="status">Načítavam…</p>

  return (
    <div className="app-page__error">
      <span role="alert">{message}</span>
      <button className="app-button app-button--secondary" type="button" onClick={onRetry}>
        Skúsiť znova
      </button>
    </div>
  )
}
