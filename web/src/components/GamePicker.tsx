import { ArrowsLeftRight, Cards, HandFist, ImageSquare, Question, Shuffle, Target, Timer, TrafficSignal, type Icon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { GameId, MeState, PublicState } from '../../../shared/types.ts'
import { currentEnergy, energyFor, type Energy } from '../lib/energy.ts'
import { useServerNow } from '../lib/store.ts'
import { GAMES, cx, fmtTime } from '../lib/util.ts'
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
export function EnergyPips({ energy }: { energy: Energy }) {
  return <Bulbs count={energy.max} lit={energy.left} size={8} className="w-14" />
}

/** Cuenta atrás en LED hasta que vuelven las partidas para canciones ajenas. */
export function Recharge({ readyAt, now, className = 'text-[18px]' }: { readyAt: number; now: number; className?: string }) {
  return (
    <span className="led-well inline-flex rounded-[4px] px-2 py-1" role="timer" aria-label={`Vuelves a jugar en ${fmtTime(readyAt - now)}`}>
      <Led value={fmtTime(readyAt - now)} className={className} />
    </span>
  )
}

export function GamePicker({
  open,
  onClose,
  state,
  me,
  onStart,
  onPick,
  onSearch,
}: {
  open: boolean
  onClose: () => void
  state: PublicState
  me: MeState | null
  onStart: (g: GameId) => void
  /** Elegir por qué canción se juega (une a su equipo). */
  onPick: (requestId: string) => Promise<void>
  onSearch: () => void
}) {
  const now = useServerNow(2)
  const team = me?.teamId ? state.ranking.find((r) => r.id === me.teamId) : null
  const [choosing, setChoosing] = useState(false)
  useEffect(() => {
    if (open) setChoosing(false)
  }, [open])
  const duelX = state.phase === 'duel' && team && state.duel && (state.duel.aId === team.id || state.duel.bId === team.id)
  const mult = duelX ? 2 : 1
  const energy = currentEnergy(me, now)
  const empty = energy.left <= 0

  return (
    <Sheet open={open} onClose={onClose} title="Juegos bonus">
      {!team || choosing ? (
        <SongChooser
          state={state}
          me={me}
          now={now}
          current={team?.id ?? null}
          onSearch={onSearch}
          onPick={async (id) => {
            if (id !== team?.id) await onPick(id)
            setChoosing(false)
          }}
        />
      ) : (
        <>
          <div className="glass mb-4 flex items-center gap-3 rounded-machine p-2.5">
            <img src={team.track.cover} alt="" className="size-12 rounded-[3px] object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-[850] leading-tight [font-stretch:90%]">{team.track.title}</p>
              <p className="mt-0.5 truncate text-[13px] font-bold text-print/70">
                {me?.playingOwn ? 'Juegas por la tuya' : `Juegas por la de ${team.by.alias}`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {/* Sin partidas, las bombillas quedan apagadas: la cuenta atrás va una sola vez, en el aviso de abajo */}
              <span className="rounded-[3px] bg-print px-2 py-1">
                <EnergyPips energy={energy} />
              </span>
              {mult > 1 ? (
                <span className="font-display text-[12px]">Puntos ×{mult}</span>
              ) : (
                <button
                  onClick={() => setChoosing(true)}
                  className="flex min-h-8 items-center gap-1 rounded-[3px] bg-print px-2 font-display text-[11px] text-paper active:scale-95"
                >
                  <ArrowsLeftRight size={13} weight="bold" aria-hidden /> Cambiar
                </button>
              )}
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
            <>
              {empty && (
                <div className="mb-4 flex items-center gap-3 rounded-machine bg-panel-2 px-3 py-3">
                  {energy.readyAt ? (
                    <>
                      <p className="flex-1 text-[15px] font-bold leading-snug">Sin partidas para otras canciones. Vuelves a jugar en</p>
                      <Recharge readyAt={energy.readyAt} now={now} className="text-[22px]" />
                    </>
                  ) : (
                    <p className="flex-1 text-[15px] font-bold leading-snug">
                      Sin partidas por la tuya hasta la siguiente canción.
                      {energyFor(me, false, now).left > 0 && ' Puedes jugar por otra: toca «Cambiar».'}
                    </p>
                  )}
                </div>
              )}
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
            </>
          )}
        </>
      )}
    </Sheet>
  )
}

/** Lista para elegir por qué canción se juega: la tuya o la de otro equipo. */
function SongChooser({
  state,
  me,
  now,
  current,
  onPick,
  onSearch,
}: {
  state: PublicState
  me: MeState | null
  now: number
  current: string | null
  onPick: (id: string) => Promise<void>
  onSearch: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  // En el VS solo se puede jugar por las dos finalistas
  const frozenOut = (id: string) => state.phase === 'duel' && !!state.duel && state.duel.aId !== id && state.duel.bId !== id

  if (!state.ranking.length) {
    return (
      <div className="py-8 text-center">
        <p className="font-display text-[18px]">Aún no hay canciones</p>
        <p className="mt-2 text-[16px] text-mute">Pide la primera y juega por ella.</p>
        <button onClick={onSearch} className="pulsador glass mt-5 h-14 w-full font-display text-[17px] [--pulsador-glow:rgb(25_195_255/0.5)]">
          Pide tu canción
        </button>
      </div>
    )
  }
  const help = energyFor(me, false, now)
  return (
    <div>
      <p className="font-display text-[18px] leading-tight">¿Por qué canción juegas?</p>
      <p className="mt-1.5 text-[15px] text-mute">Lo que ganes va para ella.</p>
      {help.readyAt > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-machine bg-panel-2 px-3 py-2.5">
          <p className="flex-1 text-[14px] font-bold leading-snug">Partidas para otras canciones en</p>
          <Recharge readyAt={help.readyAt} now={now} />
        </div>
      )}
      <ol className="mt-4 grid gap-2">
        {state.ranking.map((r, i) => {
          const own = r.id === me?.activeRequestId
          const e = energyFor(me, own, now)
          const here = r.id === current
          return (
            <li key={r.id}>
              <button
                disabled={frozenOut(r.id) || busy !== null}
                onClick={async () => {
                  setBusy(r.id)
                  try {
                    await onPick(r.id)
                  } finally {
                    setBusy(null)
                  }
                }}
                className={cx('pulsador flex w-full items-center gap-3 px-2.5 py-2 text-left', here ? 'glass' : 'bg-panel-2')}
              >
                <span className={cx('w-7 text-center font-display text-[22px] leading-none', here ? 'text-print' : 'text-cyan')}>{i + 1}</span>
                <img src={r.track.cover} alt="" className="size-11 shrink-0 rounded-[3px] object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[16px] font-[850] leading-[1.1] [font-stretch:90%]">{r.track.title}</span>
                  <span className={cx('block truncate text-[13px] font-semibold', here ? 'text-print/70' : 'text-mute')}>
                    {own ? 'La tuya' : `De ${r.by.alias}`}
                  </span>
                </span>
                {!e.readyAt && (
                  <span className="rounded-[3px] bg-print px-1.5 py-1">
                    <EnergyPips energy={e} />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
