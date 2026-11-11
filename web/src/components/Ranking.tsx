import { ArrowDown, UsersThree } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { MeState, PublicState, PublicUser, SongRequest } from '../../../shared/types.ts'
import { cx } from '../lib/util.ts'
import { Led, MarkerCircle } from './machine.tsx'

/** Avatares del equipo (emoji elegido por cada cliente). */
export function TeamBubbles({ by, team, total, size = 22 }: { by?: PublicUser; team: PublicUser[]; total: number; size?: number }) {
  const shown = [...(by ? [by] : []), ...team].slice(0, 5)
  const extra = total - shown.length
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <motion.span
          key={u.id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22, delay: i * 0.03 }}
          title={u.alias}
          className="-ml-1.5 grid place-items-center rounded-full border-2 border-ink bg-panel-2 first:ml-0"
          style={{ width: size, height: size, fontSize: size * 0.55 }}
        >
          {u.emoji}
        </motion.span>
      ))}
      {extra > 0 && <span className="ml-1 text-[12px] font-bold text-mute">+{extra}</span>}
    </div>
  )
}

/** Bombilla del peldaño. Destella cuando la canción suma. */
function RungLamp({ on, flash }: { on: boolean; flash: number }) {
  return (
    <span className="relative grid w-6 shrink-0 place-items-center self-stretch border-r border-print/50">
      <span className={cx('size-3.5', on ? 'bulb-on' : 'bulb')} />
      {flash > 0 && (
        <motion.span
          key={flash}
          className="bulb-on absolute size-3.5"
          initial={{ opacity: 1, scale: 1.6 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        />
      )}
    </span>
  )
}

/** Un peldaño de la escalera de premios. */
function Rung({
  r,
  pos,
  state,
  me,
  onSelect,
  onSupport,
}: {
  r: SongRequest
  pos: number
  state: PublicState
  me: MeState | null
  onSelect: (r: SongRequest) => void
  onSupport: (id: string) => void
}) {
  const reduce = useReducedMotion()
  const { duel, phase } = state
  const side = phase === 'duel' && duel ? (duel.aId === r.id ? 'a' : duel.bId === r.id ? 'b' : null) : null
  const frozen = phase === 'duel' && !side
  const mine = me?.activeRequestId === r.id
  const myTeam = me?.teamId === r.id
  const lit = side === 'a' || (!side && pos === 1 && !frozen)
  const ownOther = !!me?.activeRequestId && !mine
  const canVote = !me?.votedThisRound && !frozen && !ownOther

  // La luz que sube: la bombilla y el peldaño destellan cuando suma puntos
  const prev = useRef(r.points)
  const [flash, setFlash] = useState(0)
  useEffect(() => {
    if (r.points > prev.current) setFlash((f) => f + 1)
    prev.current = r.points
  }, [r.points])

  const surface = side === 'b' ? 'glass-rival' : lit ? 'glass' : 'glass-dim'
  const onGlass = surface !== 'glass-dim'

  return (
    <motion.li
      layout={!reduce}
      data-mine={mine || undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: frozen ? 0.45 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ layout: { type: 'spring', stiffness: 380, damping: 32 }, default: { duration: 0.25 } }}
      className="relative scroll-mt-24 scroll-mb-48 border-b border-print/60 last:border-b-0"
    >
      <div className={cx('relative flex items-stretch', surface)}>
        {flash > 0 && (
          <motion.span
            key={flash}
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-amber"
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
        <RungLamp on={lit || side === 'b'} flash={flash} />
        <button
          onClick={() => onSelect(r)}
          className="relative flex min-w-0 flex-1 items-center gap-2 py-2 pl-1.5 text-left"
          aria-label={`Puesto ${pos}: ${r.track.title}, ${r.points} puntos`}
        >
          <span className={cx('w-5 shrink-0 text-center font-display text-[20px] leading-none', onGlass ? 'text-print' : 'text-cyan')}>
            {pos}
          </span>
          <span className="relative shrink-0">
            <img src={r.track.cover} alt="" loading="lazy" className="size-[52px] rounded-[3px] object-cover ring-2 ring-print/70" />
            <span
              className="absolute -bottom-1.5 -right-1.5 grid size-6 place-items-center rounded-full border-2 border-ink bg-panel-2 text-[13px]"
              title={r.by.alias}
            >
              {r.by.emoji}
            </span>
          </span>
          <span className={cx('min-w-0 flex-1 pl-1', onGlass ? 'text-print' : 'text-paper')}>
            <span className="line-clamp-2 text-[16px] font-[800] leading-[1.1] [font-stretch:88%]">{r.track.title}</span>
            <span className={cx('block truncate text-[13px] font-medium', onGlass ? 'text-print/75' : 'text-paper/65')}>
              {r.track.artist}
            </span>
            {r.supporters > 1 && (
              <span className={cx('mt-0.5 flex items-center gap-1 text-[12px] font-bold', onGlass ? 'text-print/80' : 'text-paper/70')}>
                <UsersThree size={14} weight="bold" aria-hidden /> {r.supporters}
              </span>
            )}
          </span>
        </button>

        <div className="relative flex shrink-0 flex-col items-stretch justify-center gap-1.5 py-2 pr-2">
          <div className="led-well rounded-[4px] px-2 py-1.5 text-center">
            <Led value={r.points} digits={3} className="text-[17px]" flashOnChange />
          </div>
          {canVote && (
            <button
              onClick={() => onSupport(r.id)}
              className="pulsador h-8 bg-ink font-display text-[14px] text-amber ring-1 ring-amber/50 [--pulsador-glow:rgb(0_0_0/0.5)]"
              aria-label={`Votar ${r.track.title}`}
            >
              +{phase === 'duel' ? 2 * state.multiplier : state.multiplier}
            </button>
          )}
        </div>
      </div>
      {mine && <MarkerCircle />}
      {!mine && myTeam && !onGlass && <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-cyan/70" aria-hidden />}
    </motion.li>
  )
}

/** La escalera de premios: una sola columna de cristal con un peldaño por canción. */
export function Ranking({
  state,
  me,
  onSelect,
  onSupport,
}: {
  state: PublicState
  me: MeState | null
  onSelect: (r: SongRequest) => void
  onSupport: (id: string) => void
}) {
  if (state.ranking.length === 0) {
    return (
      <div aria-live="polite">
        <div className="bezel rounded-machine p-[3px]">
          <ol className="overflow-hidden rounded-[4px]" aria-label="Ranking vacío">
            {[1, 2, 3].map((n) => (
              <li key={n} className="glass-dim flex h-[64px] items-center border-b border-print/60 last:border-b-0">
                <span className="grid w-7 place-items-center self-stretch border-r border-print/50">
                  <span className="bulb size-3.5" />
                </span>
                <span className="w-9 text-center font-display text-[22px] text-cyan/50">{n}</span>
                <span className="size-[44px] rounded-[3px] bg-print/50" />
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-4 flex flex-col items-center gap-1 text-center">
          <p className="font-display text-[18px]">Escalera vacía</p>
          <p className="text-[15px] text-paper/70">Pide la primera y se queda arriba.</p>
          <ArrowDown size={26} weight="bold" className="mt-1 text-cyan" aria-hidden />
        </div>
      </div>
    )
  }
  return (
    <div className="bezel rounded-machine p-[3px]">
      <ol className="rounded-[4px] [&>li:first-child>div]:rounded-t-[4px] [&>li:last-child>div]:rounded-b-[4px]">
        <AnimatePresence initial={false}>
          {state.ranking.map((r, i) => (
            <Rung key={r.id} r={r} pos={i + 1} state={state} me={me} onSelect={onSelect} onSupport={onSupport} />
          ))}
        </AnimatePresence>
      </ol>
    </div>
  )
}
