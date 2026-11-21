import { useEffect, useState } from 'react'

type LoadState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string }

export function useWorkspaceData<T>(load: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    load()
      .then((data) => {
        if (active) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Údaje sa nepodarilo načítať.',
          })
      })
    return () => {
      active = false
    }
  }, [load, attempt])

  function reload() {
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }

  return { state, setState, reload }
}
