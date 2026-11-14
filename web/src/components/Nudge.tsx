import { Lightning, MusicNotesPlus } from '@phosphor-icons/react'
import type { MeState, PublicState } from '../../../shared/types.ts'
import { useServerNow } from '../lib/store.ts'
import { cx } from '../lib/util.ts'
import { Bulbs } from './machine.tsx'

/**
 * El rótulo grande que dice qué hacer ahora. Se adapta a quien mira:
 * sin canción → pedir; con canción o equipo → jugar para que suene primero;
 * en los últimos segundos se pone rojo y apremia.
 */
export function Nudge({
  state,
  me,
  urgent,
  onPlay,
  onSearch,
}: {
  state: PublicState
  me: MeState
  urgent: boolean
  onPlay: () => void
  onSearch: () => void
}) {
  const now = useServerNow(2)
  const myId = me.activeRequestId ?? me.teamId
  const mineIdx = myId ? state.ranking.findIndex((r) => r.id === myId) : -1
  const locked = !!state.locked && state.locked.id === myId
  const canRequest = !me.activeRequestId && me.nextRequestAt <= now

  // Nada que decir: ya está en cola, o no hay nada a lo que apuntarse
  if (locked) return null

  let title: string
  let action: string
  let onClick = onPlay
  let Icon = Lightning
  let out = false

  if (mineIdx >= 0) {
    // En el VS las partidas son sorpresa y no gastan créditos
    const finalist = state.phase === 'duel' && !!state.duel && (myId === state.duel.aId || myId === state.duel.bId)
    out = me.energy <= 0 && !finalist
    if (urgent) {
      title = mineIdx === 0 ? '¡Defiéndela!' : '¡Se acaba el tiempo!'
      action = out ? 'Sin partidas' : 'Juega ya'
    } else if (mineIdx === 0) {
      title = '¡Vas primera! No te la quiten'
      action = out ? 'Sin partidas hasta la siguiente' : 'Juega y sube más puntos'
    } else {
      title = '¿Quieres que tu canción suene primero?'
      action = out ? 'Sin partidas hasta la siguiente' : 'Juega a los minijuegos'
    }
  } else if (canRequest) {
    title = '¿Quieres elegir la música?'
    action = 'Pide tu canción'
    onClick = onSearch
    Icon = MusicNotesPlus
  } else {
    // Sin canción propia y esperando: puede apoyar entrando en un equipo desde el ranking
    title = 'Toca una canción del ranking y únete a su equipo'
    action = 'Así podrás jugar por ella'
    onClick = () => document.getElementById('ranking')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <button
      onClick={onClick}
      disabled={out}
      className={cx(
        'pulsador mt-5 block w-full px-4 py-4 text-left text-print',
        urgent ? 'bg-red animate-pulse-fast [--pulsador-glow:rgb(255_77_94/0.7)]' : 'bg-amber [--pulsador-glow:rgb(255_194_61/0.45)]',
        !urgent && !out && 'animate-breathe-amber',
      )}
    >
      <span className="block font-display text-[26px] leading-[1.02] text-balance">{title}</span>
      <span className="mt-2.5 flex items-center gap-2.5">
        <Icon size={26} weight="fill" aria-hidden />
        <span className="font-display text-[17px] leading-none">{action}</span>
        {mineIdx >= 0 && <Bulbs count={me.maxEnergy} lit={me.energy} size={7} className="ml-auto w-14" />}
      </span>
    </button>
  )
}
