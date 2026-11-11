import { Pill } from '@phosphor-icons/react'
import { useState } from 'react'
import type { MeState, PublicState } from '../../../shared/types.ts'
import { emit } from '../lib/socket.ts'
import { cx, vibrate } from '../lib/util.ts'
import { Led } from './machine.tsx'
import { Sheet } from './Sheet.tsx'
import { toast } from './Toasts.tsx'

/** Canjear la "dosis" que da la barra con la consumición. */
export function DoseSheet({
  code,
  state,
  me,
  onClose,
}: {
  code: string | null
  state: PublicState
  me: MeState | null
  onClose: () => void
}) {
  const [sending, setSending] = useState(false)
  const duel = state.phase === 'duel' ? state.duel : null
  const options = state.ranking.filter((r) => !duel || r.id === duel.aId || r.id === duel.bId)
  const preferred = me?.teamId

  async function give(requestId: string) {
    if (!code || sending) return
    setSending(true)
    try {
      const r = await emit<{ message: string }>('dose:redeem', { code, requestId })
      vibrate([40, 30, 80])
      toast(r.message, 'ok', 4500)
      onClose()
    } catch (e) {
      toast((e as Error).message, 'error', 4500)
      if (/usado|caducado|no existe/.test((e as Error).message)) onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet open={!!code} onClose={onClose} title="Tu dosis">
      <div className="glass mb-4 flex items-center gap-3 rounded-machine p-3">
        <Pill size={34} weight="fill" aria-hidden />
        <p className="flex-1 font-display text-[16px] leading-tight">¿A qué canción se la das?</p>
        <span className="led-well rounded-[4px] px-2 py-1.5">
          <Led value={state.dosePoints * (duel ? 2 : 1)} digits={2} className="text-[22px]" />
        </span>
      </div>
      {options.length === 0 ? (
        <p className="py-8 text-center text-[16px] text-mute">No hay canciones todavía. Pide una primero: la dosis caduca a los 90 s.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...options]
            .sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred))
            .map((r) => (
              <li key={r.id}>
                <button
                  disabled={sending}
                  onClick={() => give(r.id)}
                  className={cx('pulsador flex w-full items-center gap-3 p-2.5 text-left', r.id === preferred ? 'glass' : 'bezel')}
                >
                  <img src={r.track.cover} alt="" className="size-12 rounded-[3px] object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-[850] [font-stretch:90%]">{r.track.title}</span>
                    <span className={cx('block truncate text-[13px]', r.id === preferred ? 'text-print/70' : 'text-mute')}>
                      {r.by.alias}, {r.points} puntos
                    </span>
                  </span>
                  <span className="font-display text-[14px]">Dar</span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </Sheet>
  )
}
