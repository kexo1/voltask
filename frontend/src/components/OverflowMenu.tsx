import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import moreIcon from '../assets/icons/more.svg'
import AppIcon from './AppIcon'

export default function OverflowMenu({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const menuRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      const menu = menuRef.current
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      const menu = menuRef.current
      if (event.key === 'Escape' && menu?.open) {
        menu.open = false
        menu.querySelector('summary')?.focus()
      }
    }

    function closeOnFocusOutside(event: FocusEvent) {
      const menu = menuRef.current
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false
      }
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('focusin', closeOnFocusOutside)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('focusin', closeOnFocusOutside)
    }
  }, [])

  function closeAfterAction(event: MouseEvent<HTMLDetailsElement>) {
    if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) {
      if (menuRef.current) menuRef.current.open = false
    }
  }

  return (
    <details className="app-overflow-menu" ref={menuRef} onClick={closeAfterAction}>
      <summary
        className="app-button app-button--icon"
        aria-label={label}
        title={label}
      >
        <AppIcon src={moreIcon} />
      </summary>
      <div className="app-overflow-menu__items">{children}</div>
    </details>
  )
}
