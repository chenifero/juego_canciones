import { Lightning, MusicNotesPlus, WifiSlash } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameId, GameSession, MeState, PublicState, SongRequest } from '../../../shared/types.ts'
import { DoseSheet } from '../components/DoseSheet.tsx'
import { DuelBar, DuelOverlay, getDuel } from '../components/DuelView.tsx'
import { GamePicker } from '../components/GamePicker.tsx'
import { Bulbs, Led } from '../components/machine.tsx'
import { NowPlaying } from '../components/NowPlaying.tsx'
import { Ranking } from '../components/Ranking.tsx'
import { SearchSheet } from '../components/SearchSheet.tsx'
import { SongSheet } from '../components/SongSheet.tsx'
import { toast } from '../components/Toasts.tsx'
import { WinnerOverlay } from '../components/WinnerOverlay.tsx'
import { GameRunner, startGame } from '../games/GameRunner.tsx'
import { emit } from '../lib/socket.ts'
import { useServerNow } from '../lib/store.ts'
import { cx, fmtTime, vibrate } from '../lib/util.ts'

export function Home({
  state,
  me,
  connected,
  doseCode,
  clearDose,
}: {
  state: PublicState
  me: MeState
  connected: boolean
  doseCode: string | null
  clearDose: () => void
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selected, setSelected] = useState<SongRequest | null>(null)
  const [session, setSession] = useState<GameSession | null>(null)

  // El duelo se abre a pantalla completa una vez por duelo; luego se puede minimizar
  const duel = getDuel(state)
  const duelKey = duel && state.duel ? `${state.duel.aId}-${state.duel.bId}-${state.duel.startsAt}` : null
  const [dismissedDuel, setDismissedDuel] = useState<string | null>(null)
  const duelOpen = !!duelKey && dismissedDuel !== duelKey && !session
  useEffect(() => {
    if (duelKey) vibrate([80, 60, 80])
  }, [duelKey])

  // Al pedir, tu canción se pone a la vista (encima del panel de pulsadores)
  const showMine = useCallback(() => {
    requestAnimationFrame(() =>
      document.querySelector('[data-mine]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    )
  }, [])
  const prevMine = useRef(me.activeRequestId)
  useEffect(() => {
    if (me.activeRequestId && me.activeRequestId !== prevMine.current) setTimeout(showMine, 450)
    prevMine.current = me.activeRequestId
  }, [me.activeRequestId, showMine])

  const support = useCallback(async (requestId: string) => {
    try {
      const r = await emit<{ points: number; message: string }>('support', { requestId })
      vibrate(r.points ? [15, 30, 15] : 10)
      toast(r.message, r.points ? 'ok' : 'info')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }, [])

  const play = useCallback(async (game: GameId) => {
    const s = await startGame(game)
    if (s) {
      setPickerOpen(false)
      setSelected(null)
      setSession(s)
    }
  }, [])

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pb-48 safe-top">
      <header className="pb-3">
        <Bulbs count={15} size={7} chase={!!duel} className="px-1" />
        <div className="mt-3 flex items-center gap-2.5">
          <img src="/brand/logo-mark.png" alt="" className="h-9 w-auto" />
          <span className="font-display text-[17px] leading-none">BarmaGames</span>
          <span className="ml-auto flex max-w-[45%] items-center gap-2 rounded-full bg-panel py-1 pl-1 pr-3">
            <span className="grid size-7 place-items-center rounded-full bg-panel-2 text-[15px]" aria-hidden>
              {me.user.emoji}
            </span>
            <span className="truncate text-[14px] font-bold">{me.user.alias}</span>
          </span>
        </div>
      </header>

      <AnimatePresence>
        {!connected && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-3 flex items-center gap-2 overflow-hidden rounded-machine bg-pink/15 px-3 py-2 text-[14px] font-bold text-pink"
            role="status"
          >
            <WifiSlash size={18} weight="bold" aria-hidden /> Sin conexión con el bar. Reconectando.
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {duel && !duelOpen && (
          <motion.div className="sticky top-2 z-30 mb-3" exit={{ opacity: 0, y: -20 }}>
            <DuelBar state={state} onOpen={() => setDismissedDuel(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      <NowPlaying state={state} duelShownElsewhere={!!duel} />

      <h2 className="mb-3 mt-7 font-display text-[18px] leading-none">Ranking</h2>
      <Ranking state={state} me={me} onSelect={setSelected} onSupport={support} />

      <Deck state={state} me={me} onSearch={() => setSearchOpen(true)} onPlay={() => setPickerOpen(true)} onMine={showMine} />

      <SearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} onSupport={support} />
      <SongSheet
        request={selected}
        state={state}
        me={me}
        onClose={() => setSelected(null)}
        onSupport={support}
        onPlay={() => {
          setSelected(null)
          setPickerOpen(true)
        }}
      />
      <GamePicker open={pickerOpen} onClose={() => setPickerOpen(false)} state={state} me={me} onStart={play} />
      <DoseSheet code={doseCode} state={state} me={me} onClose={clearDose} />
      <DuelOverlay
        state={state}
        me={me}
        open={duelOpen}
        onMinimize={() => setDismissedDuel(duelKey)}
        onSupport={support}
        onPlay={() => setPickerOpen(true)}
      />
      <GameRunner session={session} me={me} onClose={() => setSession(null)} onAgain={play} />
      <WinnerOverlay />
    </div>
  )
}

/** El panel de pulsadores de la máquina: PIDE y JUGAR. */
function Deck({
  state,
  me,
  onSearch,
  onPlay,
  onMine,
}: {
  state: PublicState
  me: MeState
  onSearch: () => void
  onPlay: () => void
  onMine: () => void
}) {
  const now = useServerNow(2)
  const mineIdx = state.ranking.findIndex((r) => r.id === me.activeRequestId)
  const mineLocked = !!state.locked && state.locked.id === me.activeRequestId
  const wait = me.nextRequestAt > now ? me.nextRequestAt - now : 0
  const canRequest = !me.activeRequestId && wait === 0

  let face: React.ReactNode
  let action = onSearch
  if (mineLocked) {
    face = <span className="font-display text-[18px] leading-tight">La tuya va después</span>
    action = () => toast('Tu canción ya está en la cola de Spotify', 'ok')
  } else if (mineIdx >= 0) {
    face = (
      <span className="flex items-center gap-3">
        <span className="text-right font-display text-[14px] leading-tight">
          Tu canción
          <br />
          va en el
        </span>
        <span className="font-display text-[44px] leading-none">{mineIdx + 1}</span>
      </span>
    )
    action = onMine
  } else if (wait > 0) {
    face = (
      <span className="flex items-center gap-3">
        <span className="text-left font-display text-[14px] leading-tight">
          Pides
          <br />
          en
        </span>
        <span className="led-well rounded-[4px] px-2 py-1.5">
          <Led value={fmtTime(wait)} className="text-[22px]" />
        </span>
      </span>
    )
    action = () => toast('Mientras, vota y juega para otras canciones', 'info')
  } else {
    face = (
      <span className="flex items-center gap-2.5">
        <MusicNotesPlus size={30} weight="bold" aria-hidden />
        <span className="text-left font-display text-[19px] leading-[1.05]">
          Pide tu
          <br />
          canción
        </span>
      </span>
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20">
      <div className="mx-auto max-w-lg bg-gradient-to-t from-ink from-70% to-transparent px-4 pt-8 safe-bottom">
        <div className="bezel grid grid-cols-[1fr_104px] gap-3 rounded-machine p-3">
          <button
            onClick={action}
            className={cx('pulsador glass grid h-[100px] place-items-center [--pulsador-glow:rgb(25_195_255/0.55)]', canRequest && 'animate-breathe')}
          >
            {face}
          </button>
          <button
            onClick={onPlay}
            className="pulsador flex h-[100px] flex-col items-center justify-center gap-1.5 bg-amber text-print [--pulsador-glow:rgb(255_194_61/0.45)]"
            aria-label={`Jugar. Te quedan ${me.energy} partidas`}
          >
            <Lightning size={26} weight="fill" aria-hidden />
            <span className="font-display text-[15px] leading-none">Jugar</span>
            <Bulbs count={me.maxEnergy} lit={me.energy} size={7} className="w-12" />
          </button>
        </div>
      </div>
    </div>
  )
}
