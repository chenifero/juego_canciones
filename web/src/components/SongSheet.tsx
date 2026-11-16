import { Camera, Lightning } from '@phosphor-icons/react'
import type { MeState, PublicState, SongRequest } from '../../../shared/types.ts'
import { energyFor } from '../lib/energy.ts'
import { useServerNow } from '../lib/store.ts'
import { Recharge } from './GamePicker.tsx'
import { Bulbs, Led, Stamp } from './machine.tsx'
import { TeamBubbles } from './Ranking.tsx'
import { Sheet } from './Sheet.tsx'

export function SongSheet({
  request,
  state,
  me,
  onClose,
  onSupport,
  onPlay,
  onFace,
}: {
  request: SongRequest | null
  state: PublicState
  me: MeState | null
  onClose: () => void
  onSupport: (id: string) => Promise<void>
  onPlay: () => void
  /** Abrir «Tu cara» para hacerse el selfie del VS. */
  onFace: () => void
}) {
  // Siempre la versión más reciente desde el estado
  const r = request ? (state.ranking.find((x) => x.id === request.id) ?? null) : null
  const pos = r ? state.ranking.findIndex((x) => x.id === r.id) + 1 : 0
  const inDuel = !!(r && state.phase === 'duel' && state.duel && (state.duel.aId === r.id || state.duel.bId === r.id))
  const frozen = state.phase === 'duel' && !inDuel
  const mine = !!r && me?.activeRequestId === r.id
  const myTeam = !!r && me?.teamId === r.id
  const voteValue = inDuel ? 2 : 1
  const canVote = !me?.votedThisRound && !frozen
  const now = useServerNow(2)
  // Por la tuya juegas con las partidas de la ronda; por las demás, con las de ayudar (y su espera)
  const energy = energyFor(me, mine, now)

  return (
    <Sheet open={!!request} onClose={onClose} title={r ? `Puesto ${pos}` : ' '}>
      {!r ? (
        <p className="py-10 text-center text-mute">Esta canción ya no está en el ranking.</p>
      ) : (
        <div className="flex flex-col gap-4 pb-2">
          <div className="flex gap-4">
            <img src={r.track.cover} alt="" className="size-32 shrink-0 rounded-[4px] object-cover shadow-[0_16px_40px_-12px_rgb(0_0_0/0.9)]" />
            <div className="min-w-0 self-center">
              {mine && <Stamp tone="amber">La tuya</Stamp>}
              {!mine && myTeam && <Stamp tone="cyan">Tu equipo</Stamp>}
              {inDuel && <Stamp tone="pink" className="ml-1">En duelo</Stamp>}
              <h3 className="mt-1.5 line-clamp-3 text-[22px] font-[850] leading-[1.1] [font-stretch:88%]">{r.track.title}</h3>
              <p className="mt-0.5 truncate text-[15px] text-mute">{r.track.artist}</p>
            </div>
          </div>

          <div className="bezel flex items-center gap-4 rounded-machine p-3">
            <div className="led-well rounded-[4px] px-3 py-2">
              <Led value={r.points} digits={3} className="text-[30px]" />
            </div>
            <div className="min-w-0">
              <TeamBubbles by={r.by} team={r.team} total={r.supporters} size={28} />
              <p className="mt-1 truncate text-[14px] font-semibold text-paper/70">Pedida por {r.by.alias}</p>
            </div>
          </div>

          {frozen && <p className="text-[15px] font-semibold text-pink">Duelo en marcha: esta espera a la siguiente ronda.</p>}

          <div className="grid gap-3">
            {canVote && (
              <button
                onClick={() => onSupport(r.id)}
                className="pulsador glass h-16 font-display text-[18px] [--pulsador-glow:rgb(25_195_255/0.5)]"
              >
                {myTeam ? `Votar +${voteValue}` : `Apoyar +${voteValue}`}
              </button>
            )}
            {!frozen && (
              <button
                disabled={energy.left <= 0}
                onClick={async () => {
                  // Jugar por ella te une a su equipo (si no lo estabas) y abre los juegos
                  if (!myTeam) await onSupport(r.id)
                  onPlay()
                }}
                className="pulsador flex h-16 items-center justify-center gap-3 bg-amber font-display text-[18px] text-print [--pulsador-glow:rgb(255_194_61/0.45)]"
              >
                <Lightning size={24} weight="fill" aria-hidden /> {mine ? 'Jugar por la tuya' : 'Jugar por ella'}
                {!energy.readyAt && <Bulbs count={energy.max} lit={energy.left} size={8} className="w-14" />}
              </button>
            )}
            {!frozen && energy.readyAt > 0 && (
              <div className="flex items-center gap-3 rounded-machine bg-panel-2 px-3 py-2.5">
                <p className="flex-1 text-[14px] font-bold leading-snug">Sin partidas para otras canciones. Vuelves a jugar en</p>
                <Recharge readyAt={energy.readyAt} now={now} />
              </div>
            )}
            {mine && !me?.user.photo && (
              <button onClick={onFace} className="pulsador flex h-14 items-center justify-center gap-2 bg-panel-2 font-display text-[15px]">
                <Camera size={20} weight="fill" aria-hidden /> Pon tu cara en el VS
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
