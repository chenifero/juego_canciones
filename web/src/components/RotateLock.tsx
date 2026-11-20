import { DeviceRotate } from '@phosphor-icons/react'
import { useEffect } from 'react'

type LockableOrientation = ScreenOrientation & { lock?: (o: 'portrait') => Promise<void> }

/** Intenta fijar el vertical. Solo lo permiten la app instalada o la pantalla completa (Android); si no, no pasa nada. */
function tryLockPortrait(): void {
  const o = screen.orientation as LockableOrientation | undefined
  o?.lock?.('portrait').catch(() => {})
}

/**
 * La máquina solo se juega en vertical. Donde el navegador deja fijarlo, se fija;
 * donde no (iPhone, Chrome sin instalar), con el móvil tumbado se tapa todo y se pide girarlo.
 */
export function RotateLock() {
  useEffect(() => {
    tryLockPortrait()
    const again = () => tryLockPortrait()
    document.addEventListener('pointerdown', again, { once: true })
    document.addEventListener('fullscreenchange', again)
    return () => {
      document.removeEventListener('pointerdown', again)
      document.removeEventListener('fullscreenchange', again)
    }
  }, [])

  return (
    <div
      className="rotate-lock fixed inset-0 z-[100] place-items-center bg-ink px-6 text-center [touch-action:none]"
      role="alert"
    >
      <div className="flex flex-col items-center">
        <span className="glass grid size-20 place-items-center rounded-machine">
          <DeviceRotate size={44} weight="bold" aria-hidden />
        </span>
        <p className="mt-5 font-display text-[22px] leading-none">Pon el móvil en vertical</p>
        <p className="mt-2 text-[15px] text-mute">La máquina solo se juega de pie.</p>
      </div>
    </div>
  )
}
