import { Cards, HandFist, ImageSquare, Question, Shuffle, Target, Timer, TrafficSignal, type Icon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { GameId, MeState, PublicState } from '../../../shared/types.ts'
import { GAMES, cx } from '../lib/util.ts'
import { Bulbs, Led } from './machine.tsx'
import { Sheet } from './Sheet.tsx'

export const GAME_ICON: Record<GameId, Icon> = {
  tap: HandFist,
  reflex: TrafficSignal,
  memory: Cards,
  rhythm: Target,
  cover: ImageSquare,
  trivia: Question,
  stopwatch: Timer,
}

/** Créditos (energía) como bombillas. */
export function EnergyPips({ me }: { me: MeState | null }) {
  return <Bulbs count={me?.maxEnergy ?? 3} lit={me?.energy ?? 0} size={8} className="w-14" />
}

export function GamePicker({
  open,
  onClose,
  state,
  me,
  onStart,
}: {
  open: boolean
  onClose: () => void
  state: PublicState
  me: MeState | null
  onStart: (g: GameId) => void
}) {
  const team = me?.teamId ? state.ranking.find((r) => r.id === me.teamId) : null
  const duelX = state.phase === 'duel' && team && state.duel && (state.duel.aId === team.id || state.duel.bId === team.id)
  const mult = duelX ? 2 : 1
  const empty = (me?.energy ?? 0) <= 0

  return (
    <Sheet open={open} onClose={onClose} title="Juegos bonus">
      {!team ? (
        <div className="py-8 text-center">
          <p className="font-display text-[18px]">Primero elige canción</p>
          <p className="mt-2 text-[16px] text-mute">Pide la tuya o vota una del ranking. Lo que ganes, va para ella.</p>
        </div>
      ) : (
        <>
          <div className="glass mb-4 flex items-center gap-3 rounded-machine p-2.5">
            <img src={team.track.cover} alt="" className="size-12 rounded-[3px] object-cover" />
            <p className="min-w-0 flex-1 truncate text-[17px] font-[850] [font-stretch:90%]">{team.track.title}</p>
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-[3px] bg-print px-2 py-1">
                <EnergyPips me={me} />
              </span>
              {mult > 1 && <span className="font-display text-[12px]">Puntos ×{mult}</span>}
            </div>
          </div>
          {duelX ? (
            <div className="py-2 text-center">
              <p className="font-display text-[20px] leading-tight">En el VS el juego es sorpresa</p>
              <p className="mt-2 text-[15px] text-mute">Los dos equipos juegan al mismo, puntos ×2 y sin gastar partidas.</p>
              <button
                onClick={() => onStart('tap')}
                className="pulsador mt-5 flex h-16 w-full items-center justify-center gap-3 bg-amber font-display text-[20px] text-print [--pulsador-glow:rgb(255_194_61/0.5)]"
              >
                <Shuffle size={26} weight="bold" aria-hidden /> ¡Juego sorpresa!
              </button>
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {(Object.keys(GAMES) as GameId[]).map((id, i, all) => {
              const g = GAMES[id]
              const Glyph = GAME_ICON[id]
              const level = g.level === 3 ? 'muy difícil' : g.level === 2 ? 'difícil' : 'fácil'
              // El último es el premio gordo: ocupa toda la fila, como el bote de la máquina
              const jackpot = i === all.length - 1
              const points = (
                <span className={cx('flex items-center gap-1.5', !jackpot && 'flex-col')}>
                  <span className="led-well rounded-[4px] px-2 py-1">
                    <Led value={g.max * mult} digits={2} className="text-[18px]" />
                  </span>
                  <span className="rounded-full bg-print px-1.5 py-1">
                    <Bulbs count={3} lit={g.level} size={6} className="w-9" />
                  </span>
                </span>
              )
              return (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  disabled={empty}
                  onClick={() => onStart(id)}
                  className={cx(
                    'pulsador flex bg-amber text-print [--pulsador-glow:rgb(255_194_61/0.4)]',
                    jackpot ? 'col-span-3 h-[76px] items-center gap-3 px-4' : 'aspect-[3/4] flex-col items-center justify-between px-1.5 py-3',
                  )}
                  aria-label={`${g.name}: hasta ${g.max * mult} puntos, ${level}`}
                >
                  <Glyph size={jackpot ? 30 : 34} weight="fill" aria-hidden />
                  <span className={cx('font-display leading-tight', jackpot ? 'flex-1 text-left text-[16px]' : 'text-center text-[13px]')}>
                    {g.name}
                  </span>
                  {points}
                </motion.button>
              )
            })}
          </div>
          )}
          {empty && !duelX && <p className="mt-4 text-center text-[15px] text-mute">Sin créditos. Se recargan con la siguiente canción.</p>}
        </>
      )}
    </Sheet>
  )
}
