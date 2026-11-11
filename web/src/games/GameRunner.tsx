import { X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import type { GameId, GameResult, GameSession, MeState } from '../../../shared/types.ts'
import { GAME_ICON } from '../components/GamePicker.tsx'
import { Bulbs, Led } from '../components/machine.tsx'
import { toast } from '../components/Toasts.tsx'
import { emit } from '../lib/socket.ts'
import { serverNow } from '../lib/store.ts'
import { GAMES, vibrate } from '../lib/util.ts'
import { ReflexGame } from './ReflexGame.tsx'
import { StopwatchGame } from './StopwatchGame.tsx'
import { TapGame } from './TapGame.tsx'

type Stage = 'countdown' | 'play' | 'sending' | 'result'

/** Pantalla completa de juego bonus: cuenta atrás, juego y premio. */
export function GameRunner({
  session,
  me,
  onClose,
  onAgain,
}: {
  session: GameSession | null
  me: MeState | null
  onClose: () => void
  onAgain: (game: GameId) => void
}) {
  const [stage, setStage] = useState<Stage>('countdown')
  const [count, setCount] = useState(3)
  const [result, setResult] = useState<GameResult | null>(null)

  useEffect(() => {
    if (!session) return
    setStage('countdown')
    setResult(null)
    let raf = 0
    let lastShown = -1
    const frame = () => {
      const left = session.startsAt - serverNow()
      if (left <= 0) {
        setStage('play')
        vibrate(40)
        return
      }
      const n = Math.ceil(left / 1000)
      if (n !== lastShown) {
        lastShown = n
        setCount(n)
        vibrate(10)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [session])

  const onDone = useCallback(
    async (score: number) => {
      if (!session) return
      setStage('sending')
      try {
        const r = await emit<GameResult>('game:finish', { sessionId: session.sessionId, score })
        setResult(r)
        if (r.points > 0) vibrate([30, 50, 30, 50, 80])
      } catch (e) {
        setResult({ points: 0, score, message: (e as Error).message })
      }
      setStage('result')
    },
    [session],
  )

  const info = session ? GAMES[session.game] : null
  const Glyph = session ? GAME_ICON[session.game] : null
  const Game = session?.game === 'tap' ? TapGame : session?.game === 'reflex' ? ReflexGame : StopwatchGame

  return (
    <AnimatePresence>
      {session && info && Glyph && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-ink safe-top safe-bottom"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <header className="flex items-center gap-3 px-4 pt-1">
            <span className="grid size-10 place-items-center rounded-machine bg-amber text-print">
              <Glyph size={22} weight="fill" aria-hidden />
            </span>
            <p className="flex-1 font-display text-[16px] leading-none">{info.name}</p>
            {stage !== 'play' && stage !== 'sending' && (
              <button onClick={onClose} className="grid size-10 place-items-center rounded-machine bg-panel-2" aria-label="Cerrar">
                <X size={20} weight="bold" />
              </button>
            )}
          </header>

          <div className="relative min-h-0 flex-1 px-4 py-4">
            {stage === 'countdown' && (
              <div className="grid h-full place-items-center">
                <div className="flex flex-col items-center text-center">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={count}
                      initial={{ scale: 1.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      className="led-well block rounded-[8px] px-8 py-6"
                    >
                      <Led value={count} className="text-[120px]" />
                    </motion.span>
                  </AnimatePresence>
                  <p className="mt-8 max-w-xs text-[18px] font-semibold text-paper/80">{info.desc}</p>
                </div>
              </div>
            )}
            {stage === 'play' && <Game durationMs={session.durationMs} onDone={onDone} />}
            {stage === 'sending' && (
              <div className="grid h-full place-items-center">
                <Bulbs count={5} chase size={14} className="w-40" />
              </div>
            )}
            {stage === 'result' && result && (
              <div className="grid h-full place-items-center text-center">
                <div className="flex flex-col items-center">
                  <motion.p
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                    className={`font-display text-[44px] leading-none ${result.points > 0 ? 'text-amber' : 'text-paper/50'}`}
                  >
                    {result.points > 0 ? '¡Premio!' : 'Casi'}
                  </motion.p>
                  <span className="led-well mt-5 rounded-[8px] px-6 py-4">
                    <Led value={result.points} digits={2} className="text-[80px]" />
                  </span>
                  <p className="mx-auto mt-5 max-w-xs text-[16px] text-paper/80">{result.message}</p>
                  <div className="mt-8 grid w-full max-w-xs gap-3">
                    {(me?.energy ?? 0) > 0 && (
                      <button
                        onClick={() => onAgain(session.game)}
                        className="pulsador flex h-16 items-center justify-center gap-3 bg-amber font-display text-[18px] text-print"
                      >
                        Otra vez
                        <Bulbs count={me?.maxEnergy ?? 3} lit={me?.energy ?? 0} size={8} className="w-14" />
                      </button>
                    )}
                    <button onClick={onClose} className="pulsador h-14 bg-panel-2 font-display text-[16px]">
                      Volver
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export async function startGame(game: GameId): Promise<GameSession | null> {
  try {
    return await emit<GameSession>('game:start', { game })
  } catch (e) {
    toast((e as Error).message, 'error', 4000)
    return null
  }
}
