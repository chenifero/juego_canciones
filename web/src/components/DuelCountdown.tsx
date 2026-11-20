import { X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { MeState, PublicState, SongRequest } from '../../../shared/types.ts'
import { useServerNow } from '../lib/store.ts'
import { cx, vibrate } from '../lib/util.ts'
import { Avatar } from './Avatar.tsx'
import { Bulbs, Led, Stamp } from './machine.tsx'

/** Segundos de aviso antes de que empiece el duelo. */
export const PRE_DUEL_MS = 10_000
/** Si el servidor tarda en cambiar de fase, el letrero aguanta a cero como mucho este rato. */
const GRACE_MS = 3_000

function Contender({ r, side, me }: { r: SongRequest; side: 'a' | 'b'; me: MeState | null }) {
  const isA = side === 'a'
  const mine = me?.activeRequestId === r.id
  const team = !mine && me?.teamId === r.id
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <div className="relative w-full">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={r.id}
            src={r.track.cover}
            alt=""
            initial={{ scale: 0.6, opacity: 0, rotate: isA ? -14 : 14 }}
            animate={{ scale: 1, opacity: 1, rotate: isA ? -3 : 3 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className={cx(
              'aspect-square w-full rounded-[3px] object-cover',
              isA ? 'neon-tube-cyan' : 'neon-tube-pink',
            )}
          />
        </AnimatePresence>
        <Avatar
          user={r.by}
          size={r.by.photo ? 44 : 32}
          className={cx('absolute -bottom-3 border-[3px]', isA ? '-right-2' : '-left-2')}
        />
      </div>
      <p className="mt-4 line-clamp-2 text-[15px] font-[850] leading-[1.08] text-paper [font-stretch:86%]">{r.track.title}</p>
      {(mine || team) && (
        <Stamp tone={isA ? 'cyan' : 'pink'} className="mt-1.5">
          {mine ? 'La tuya' : 'Tu equipo'}
        </Stamp>
      )}
    </div>
  )
}

/**
 * Cuenta atrás de 10 s antes del duelo: letrero de neón en el centro de la pantalla
 * con la #1 VS la #2 y los segundos en LED. Al empezar el duelo se apaga y entra el VS.
 */
export function DuelCountdown({ state, me, blocked }: { state: PublicState; me: MeState | null; blocked: boolean }) {
  const now = useServerNow(12)
  const [dismissedRound, setDismissedRound] = useState<number | null>(null)

  const a = state.ranking[0]
  const b = state.ranking[1]
  const toDuel = state.duelAt !== null ? state.duelAt - now : null
  const live =
    state.phase === 'open' && !!a && !!b && toDuel !== null && toDuel <= PRE_DUEL_MS && toDuel > -GRACE_MS
  const open = live && !blocked && dismissedRound !== state.round
  const secs = live ? Math.max(0, Math.ceil(toDuel! / 1000)) : 0
  const hot = secs <= 3

  // Un toque por segundo en los tres últimos
  useEffect(() => {
    if (open && secs > 0 && secs <= 3) vibrate(secs === 1 ? [70, 50, 70] : 35)
  }, [open, secs])

  return (
    <AnimatePresence>
      {open && a && b && (
        <motion.div
          className="fixed inset-0 z-[45] grid place-items-center bg-[#050607]/85 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          onClick={() => setDismissedRound(state.round)}
          role="dialog"
          aria-modal="true"
          aria-label={`El duelo empieza en ${secs} segundos`}
        >
          <motion.div
            className="neon-sign w-full max-w-[360px]"
            initial={{ scale: 0.86, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 1.06, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="neon-panel relative px-4 pb-5 pt-4">
              <button
                onClick={() => setDismissedRound(state.round)}
                className="absolute right-2 top-2 grid size-9 place-items-center rounded-machine bg-panel-2 text-mute active:scale-95 active:text-paper"
                aria-label="Cerrar"
              >
                <X size={18} weight="bold" />
              </button>

              <Bulbs count={11} size={7} chase className="mx-auto w-[62%]" />
              <p className="neon-text mt-3 text-center font-display text-[24px] leading-none">Duelo final</p>

              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Contender r={a} side="a" me={me} />
                <motion.p
                  key={secs}
                  initial={{ scale: 1.25 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                  className="neon-text -mt-8 font-display text-[38px] leading-none"
                >
                  VS
                </motion.p>
                <Contender r={b} side="b" me={me} />
              </div>

              <div className="mt-5 flex flex-col items-center">
                <span className="led-well rounded-[4px] px-3 py-2">
                  <Led
                    value={String(secs).padStart(2, '0')}
                    className={cx('text-[48px]', hot && secs > 0 && 'animate-pulse-fast')}
                    color={hot ? 'var(--color-red)' : 'var(--color-amber)'}
                    flashOnChange
                  />
                </span>
                <Bulbs count={10} size={9} lit={secs} className="mt-3 w-[78%]" />
                <p className="mt-3 font-display text-[13px] leading-none text-amber">Puntos ×2</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
