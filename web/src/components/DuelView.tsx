import { CaretDown, Lightning } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import type { MeState, PublicState, SongRequest } from '../../../shared/types.ts'
import { useServerNow } from '../lib/store.ts'
import { cx, fmtTime } from '../lib/util.ts'
import { Bulbs, Led, Stamp } from './machine.tsx'
import { Avatar } from './Avatar.tsx'
import { TeamBubbles } from './Ranking.tsx'

export function getDuel(state: PublicState): { a: SongRequest; b: SongRequest } | null {
  if (state.phase !== 'duel' || !state.duel) return null
  const a = state.ranking.find((r) => r.id === state.duel!.aId)
  const b = state.ranking.find((r) => r.id === state.duel!.bId)
  return a && b ? { a, b } : null
}

function Side({ r, side, me }: { r: SongRequest; side: 'a' | 'b'; me: MeState | null }) {
  const isA = side === 'a'
  const mine = me?.activeRequestId === r.id
  const team = me?.teamId === r.id
  return (
    <motion.div
      initial={{ x: isA ? '-110%' : '110%' }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 170, damping: 19, delay: 0.1 }}
      className={cx('flex items-center gap-4 text-print', isA ? 'flex-row' : 'flex-row-reverse text-right')}
    >
      <div className="relative shrink-0">
        <img
          src={r.track.cover}
          alt=""
          className={cx(
            'size-[min(34vw,150px)] rounded-[4px] object-cover ring-4 ring-print shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]',
            isA ? '-rotate-2' : 'rotate-2',
          )}
        />
        {/* Con selfie, la cara de quien la pidió crece: es la cara de la canción en el VS */}
        <Avatar
          user={r.by}
          size={r.by.photo ? 68 : 44}
          ring="border-print"
          className={cx(
            'absolute border-4',
            r.by.photo ? '-bottom-5' : '-bottom-3 bg-paper',
            isA ? (r.by.photo ? '-right-2' : '-right-3') : r.by.photo ? '-left-2' : '-left-3',
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        {(mine || team) && (
          <Stamp tone="print" className="mb-1">
            {mine ? 'La tuya' : 'Tu equipo'}
          </Stamp>
        )}
        <p className="line-clamp-2 text-[20px] font-[900] leading-[1.05] [font-stretch:85%]">{r.track.title}</p>
        <p className="truncate text-[14px] font-semibold text-print/70">{r.by.alias}</p>
        <div className={cx('mt-2 flex items-center gap-2', !isA && 'flex-row-reverse')}>
          <span className="led-well rounded-[4px] px-2 py-1.5">
            <Led value={r.points} digits={3} className="text-[30px]" flashOnChange />
          </span>
          <TeamBubbles team={r.team} total={r.supporters - 1} size={24} />
        </div>
      </div>
    </motion.div>
  )
}

/** Duelo final a pantalla completa: la frontera entre los dos cristales se mueve según quién gana. */
export function DuelOverlay({
  state,
  me,
  open,
  onMinimize,
  onSupport,
  onPlay,
}: {
  state: PublicState
  me: MeState | null
  open: boolean
  onMinimize: () => void
  onSupport: (id: string) => void
  onPlay: () => void
}) {
  const now = useServerNow(20)
  const duel = getDuel(state)
  const toLock = state.lockAt ? Math.max(0, state.lockAt - now) : 0

  const total = duel ? duel.a.points + duel.b.points : 1
  const ratio = duel ? Math.min(0.78, Math.max(0.22, duel.a.points / Math.max(1, total))) : 0.5
  const y = (1 - ratio) * 100
  const clip = `polygon(0% 0%, 100% 0%, 100% ${y - 7}%, 0% ${y + 7}%)`

  const myTeam = duel && me?.teamId && (me.teamId === duel.a.id || me.teamId === duel.b.id) ? me.teamId : null
  const ownOutside = !!me?.activeRequestId && duel && me.activeRequestId !== duel.a.id && me.activeRequestId !== duel.b.id
  const urgent = toLock <= 10_000
  const vote = 2 * state.multiplier

  return (
    <AnimatePresence>
      {open && duel && (
        <motion.div
          className="fixed inset-0 z-40 overflow-hidden bg-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.3 }}
        >
          <div className="glass-rival absolute inset-0" />
          <motion.div
            className="glass absolute inset-0"
            initial={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 43%, 0% 57%)' }}
            animate={{ clipPath: clip }}
            transition={{ type: 'spring', stiffness: 60, damping: 14 }}
          />

          <div className="relative flex h-full flex-col safe-top safe-bottom">
            <div className="flex items-center justify-between px-4 pt-1">
              <Bulbs count={8} size={8} chase className="w-32" />
              <button
                onClick={onMinimize}
                className="flex items-center gap-1 rounded-machine bg-print px-3 py-2 text-[14px] font-bold text-paper"
                aria-label="Ver el ranking"
              >
                Ranking <CaretDown size={16} weight="bold" />
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-between px-5 py-5">
              <Side r={duel.a} side="a" me={me} />

              <div className="relative flex items-center justify-center">
                <motion.div
                  key={urgent ? 'u' : 'n'}
                  initial={{ scale: 3.2, opacity: 0, rotate: -18 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 13, delay: urgent ? 0 : 0.45 }}
                  className={cx('bezel flex flex-col items-center gap-1 rounded-machine px-5 py-3', urgent && 'animate-shake')}
                >
                  <p className="font-display text-[34px] leading-none text-paper">VS</p>
                  <span className="led-well rounded-[4px] px-2 py-1">
                    <Led value={fmtTime(toLock)} className="text-[20px]" color={urgent ? 'var(--color-red)' : 'var(--color-amber)'} />
                  </span>
                  <p className="font-display text-[11px] text-amber">Puntos ×{vote}</p>
                </motion.div>
              </div>

              <Side r={duel.b} side="b" me={me} />
            </div>

            <div className="bezel mx-4 mb-1 grid grid-cols-2 gap-3 rounded-machine p-3">
              {myTeam ? (
                <>
                  <button
                    disabled={!!me?.votedThisRound}
                    onClick={() => onSupport(myTeam)}
                    className="pulsador h-16 bg-paper font-display text-[17px] text-print"
                  >
                    {me?.votedThisRound ? 'Votado' : `Votar +${vote}`}
                  </button>
                  <button
                    disabled={(me?.energy ?? 0) <= 0}
                    onClick={onPlay}
                    className="pulsador flex h-16 items-center justify-center gap-2 bg-amber font-display text-[17px] text-print"
                  >
                    <Lightning size={22} weight="fill" aria-hidden /> Jugar
                  </button>
                </>
              ) : ownOutside ? (
                <p className="col-span-2 py-2 text-center text-[16px] font-semibold">La tuya espera a la siguiente ronda.</p>
              ) : (
                <>
                  <button onClick={() => onSupport(duel.a.id)} className="pulsador glass h-16 font-display text-[15px]">
                    Apoyar arriba
                  </button>
                  <button onClick={() => onSupport(duel.b.id)} className="pulsador glass-rival h-16 font-display text-[15px]">
                    Apoyar abajo
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Barra compacta del duelo cuando la pantalla completa está minimizada. */
export function DuelBar({ state, onOpen }: { state: PublicState; onOpen: () => void }) {
  const now = useServerNow(10)
  const duel = getDuel(state)
  if (!duel) return null
  const toLock = state.lockAt ? Math.max(0, state.lockAt - now) : 0
  const total = Math.max(1, duel.a.points + duel.b.points)
  return (
    <motion.button
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onClick={onOpen}
      className="bezel relative w-full overflow-hidden rounded-machine p-[3px] active:scale-[0.99]"
      aria-label="Abrir el duelo"
    >
      <div className="relative flex h-14 overflow-hidden rounded-[4px]">
        <div className="glass transition-[flex-grow] duration-700" style={{ flexGrow: duel.a.points / total }} />
        <div className="glass-rival transition-[flex-grow] duration-700" style={{ flexGrow: duel.b.points / total }} />
        <div className="absolute inset-0 flex items-center gap-2 px-1.5">
          <img src={duel.a.track.cover} alt="" className="size-11 rounded-[3px] object-cover ring-2 ring-print" />
          <span className="rounded-[3px] bg-print/85 px-1.5 py-1">
            <Led value={duel.a.points} digits={3} className="text-[15px]" />
          </span>
          <span className="flex flex-1 flex-col items-center">
            <span className="font-display text-[13px] leading-none text-print">Duelo</span>
            <span className="mt-1 rounded-[3px] bg-print/85 px-1.5 py-0.5">
              <Led value={fmtTime(toLock)} className="text-[12px]" />
            </span>
          </span>
          <span className="rounded-[3px] bg-print/85 px-1.5 py-1">
            <Led value={duel.b.points} digits={3} className="text-[15px]" />
          </span>
          <img src={duel.b.track.cover} alt="" className="size-11 rounded-[3px] object-cover ring-2 ring-print" />
        </div>
      </div>
    </motion.button>
  )
}
