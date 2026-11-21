import { useLayoutEffect, useRef, type ReactNode } from 'react'

export default function Modal({
  labelId,
  busy = false,
  onClose,
  children,
}: {
  labelId: string
  busy?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useLayoutEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => {
      element?.close()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      className="app-dialog app-card"
      aria-labelledby={labelId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      {children}
    </dialog>
  )
}
