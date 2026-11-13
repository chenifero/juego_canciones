import { useEffect, type RefObject } from 'react'
import type { PublicState } from '../../../shared/types.ts'
import { useServerNow } from '../lib/store.ts'
import { vibrate } from '../lib/util.ts'

/** Segundos finales en que la máquina se pone en alarma. */
export const URGENT_MS = 10_000

/**
 * Cuenta atrás de alarma: en los últimos 10 s antes de cerrar las votaciones
 * la pantalla se ruboriza en rojo, tiembla cada segundo y el móvil vibra
 * (más fuerte en los 3 últimos). Avisa a Home con `onChange` para que
 * el resto de la pantalla también se ponga en rojo.
 */
export function Urgency({
  state,
  shakeRef,
  onChange,
}: {
  state: PublicState
  shakeRef: RefObject<HTMLElement | null>
  onChange: (urgent: boolean) => void
}) {
  const now = useServerNow(4)
  const toLock = state.lockAt ? state.lockAt - now : null
  const live =
    (state.phase === 'open' || state.phase === 'duel') &&
    state.ranking.length > 0 &&
    toLock !== null &&
    toLock > 0 &&
    toLock <= URGENT_MS
  const secs = live ? Math.ceil(toLock! / 1000) : 0

  useEffect(() => {
    onChange(live)
  }, [live, onChange])

  // Un latido por segundo: temblor de pantalla + vibración
  useEffect(() => {
    if (!secs) return
    const hot = secs <= 3
    vibrate(hot ? [160, 50, 160] : [80])
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const px = hot ? 7 : 3.5
    shakeRef.current?.animate(
      [
        { transform: 'translate3d(0,0,0)' },
        { transform: `translate3d(${-px}px,0,0)` },
        { transform: `translate3d(${px}px,0,0)` },
        { transform: `translate3d(${-px / 2}px,0,0)` },
        { transform: 'translate3d(0,0,0)' },
      ],
      { duration: hot ? 420 : 300, easing: 'ease-out' },
    )
  }, [secs, shakeRef])

  if (!live) return null
  return <div className="alarm-glow" data-hot={secs <= 3 || undefined} aria-hidden />
}
