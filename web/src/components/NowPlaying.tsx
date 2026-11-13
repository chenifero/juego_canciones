import { AnimatePresence, motion } from 'motion/react'
import type { PublicState } from '../../../shared/types.ts'
import { progressAt, useServerNow } from '../lib/store.ts'
import { cx, fmtTime } from '../lib/util.ts'
import { Avatar } from './Avatar.tsx'
import { Led, Stamp } from './machine.tsx'

const IDLE_TEXT: Record<string, string> = {
  'no-device': 'Spotify en pausa',
  disconnected: 'Spotify sin conectar',
  error: 'Reconectando con Spotify',
}

/** La ventana de la máquina: qué suena y cuánto falta para el cierre. */
export function NowPlaying({ state, duelShownElsewhere = false }: { state: PublicState; duelShownElsewhere?: boolean }) {
  const now = useServerNow(20)
  const track = state.now.track
  const progress = progressAt(state, now)
  const duration = track?.durationMs ?? 1
  const toLock = state.lockAt ? Math.max(0, state.lockAt - now) : null
  // Si la barra de duelo ya está a la vista, la ventana no lo repite
  const duel = state.phase === 'duel' && !duelShownElsewhere
  const quiet = state.phase === 'duel' && duelShownElsewhere
  const urgent = toLock !== null && toLock <= 10_000 && (state.phase === 'open' || state.phase === 'duel')

  let led = '-:--'
  let label: React.ReactNode
  if ((state.phase === 'open' || state.phase === 'duel') && toLock !== null) {
    led = fmtTime(toLock)
    label = state.phase === 'duel' ? 'Duelo final ×2' : 'La primera suena después'
  } else if (state.phase === 'locked') {
    label = state.locked ? (
      <span className="flex min-w-0 items-center gap-2">
        <Stamp tone="print" rotate={-3}>
          En cola
        </Stamp>
        <span className="truncate font-sans text-[15px] font-[800] normal-case">{state.locked.track.title}</span>
      </span>
    ) : (
      'Sigue la lista del bar'
    )
  } else {
    label = IDLE_TEXT[state.spotify] ?? 'Esperando música'
  }

  return (
    <section className="bezel relative rounded-machine p-[3px]" aria-label="Sonando ahora">
      <div className={'glass relative overflow-hidden rounded-[4px] p-3'}>
        {/* En el duelo, el cristal se parte: la mitad del rival se enciende en rosa */}
        <AnimatePresence>
          {duel && (
            <motion.div
              className="glass-rival absolute inset-0"
              initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
              animate={{ clipPath: 'polygon(62% 0, 100% 0, 100% 100%, 42% 100%)' }}
              exit={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </AnimatePresence>

        <div className="relative flex gap-3">
          <div className="relative size-[84px] shrink-0 overflow-hidden rounded-[4px] bg-print ring-2 ring-print">
            <AnimatePresence mode="popLayout">
              {track && (
                <motion.img
                  key={track.id}
                  src={track.cover}
                  alt=""
                  initial={{ y: '-100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 size-full object-cover"
                />
              )}
            </AnimatePresence>
          </div>
          <div className="min-w-0 flex-1 self-center text-print">
            <AnimatePresence mode="wait">
              <motion.div
                key={track?.id ?? 'none'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <h2 className="line-clamp-2 text-[19px] font-[850] leading-[1.1] tracking-[-0.01em] [font-stretch:88%]">
                  {track?.title ?? 'Nada sonando'}
                </h2>
                {track && <p className="mt-0.5 truncate text-[14px] font-semibold text-print/70">{track.artist}</p>}
                {state.now.requestedBy && (
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold">
                    <Avatar user={state.now.requestedBy} size={20} ring="border-print/40" className="border" />
                    <span className="truncate">{state.now.requestedBy.alias}</span>
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {!quiet && <div className="relative mt-3 flex items-center gap-3">
          <div className={cx('led-well shrink-0 rounded-[4px] px-2.5 py-2', urgent && 'animate-pulse-fast')}>
            <Led value={led} className="text-[24px]" color={urgent ? 'var(--color-pink)' : 'var(--color-amber)'} />
          </div>
          <div className="min-w-0 font-display text-[14px] uppercase leading-tight text-print">{label}</div>
        </div>}

        {track && (
          <div className="relative mt-3 h-[5px] overflow-hidden rounded-full bg-print/20" aria-hidden>
            <div className="h-full rounded-full bg-print" style={{ width: `${(progress / duration) * 100}%` }} />
          </div>
        )}
      </div>
    </section>
  )
}
