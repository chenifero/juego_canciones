import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { GameSession, QuizRound } from '../../../shared/types.ts'
import { Bulbs, Led, Stamp } from '../components/machine.tsx'
import { emit } from '../lib/socket.ts'
import { cx, vibrate } from '../lib/util.ts'

/** Cuadros por lado mientras la carátula se va aclarando. */
const STEPS = [5, 7, 10, 14, 20, 28, 40]
const REVEAL_MS = 1_200

/** Carátula que empieza en cuadros gordos y se va aclarando; al contestar se ve entera. */
function PixelCover({ src, progress, reveal }: { src: string; progress: number; reveal: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    setImg(null)
    const i = new Image()
    i.decoding = 'async'
    i.onload = () => setImg(i)
    i.src = src
  }, [src])

  const cells = reveal ? 0 : STEPS[Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length))]!

  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
    const size = c.clientWidth * (window.devicePixelRatio || 1)
    if (c.width !== size) c.width = c.height = size
    const ctx = c.getContext('2d')
    if (!ctx) return
    if (!cells) {
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(img, 0, 0, size, size)
      return
    }
    // Se dibuja en pequeño y se amplía sin suavizar: cuadros nítidos
    const small = document.createElement('canvas')
    small.width = small.height = cells
    small.getContext('2d')?.drawImage(img, 0, 0, cells, cells)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(small, 0, 0, cells, cells, 0, 0, size, size)
  }, [img, cells])

  return (
    <div className="bezel mx-auto w-[min(76vw,300px)] rounded-machine p-[3px]">
      <canvas ref={canvas} className="block aspect-square w-full rounded-[4px] bg-panel" role="img" aria-label="Carátula pixelada" />
    </div>
  )
}

type Phase = 'ask' | 'wait' | 'reveal'

/**
 * Juegos de acertar (carátula pixelada y trivia). Las preguntas vienen del servidor
 * y es él quien dice cuál era la buena: aquí solo se pregunta y se enseña.
 */
export function QuizGame({ session, onDone }: { session: GameSession; onDone: (score: number) => void }) {
  const reduce = useReducedMotion()
  const rounds = session.quiz ?? []
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [elapsed, setElapsed] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState<number | null>(null)
  const [hits, setHits] = useState(0)
  const roundStart = useRef(performance.now())
  const answered = useRef(false)
  const hitsRef = useRef(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  const q: QuizRound | undefined = rounds[i]

  async function answer(choice: number) {
    if (answered.current || !q) return
    answered.current = true
    const ms = Math.round(performance.now() - roundStart.current)
    setPicked(choice)
    setPhase('wait')
    let right = false
    try {
      const r = await emit<{ correct: number; right: boolean }>('game:answer', { sessionId: session.sessionId, choice, ms })
      setCorrect(r.correct)
      right = r.right
    } catch {
      setCorrect(null)
    }
    if (right) {
      hitsRef.current++
      setHits(hitsRef.current)
      vibrate([14, 30, 14])
    } else vibrate([40, 30, 40])
    setPhase('reveal')
    setTimeout(() => {
      if (i + 1 >= rounds.length) return doneRef.current(hitsRef.current)
      answered.current = false
      roundStart.current = performance.now()
      setElapsed(0)
      setPicked(null)
      setCorrect(null)
      setPhase('ask')
      setI(i + 1)
    }, REVEAL_MS)
  }

  // Reloj de la ronda; al acabarse cuenta como no contestada
  useEffect(() => {
    if (phase !== 'ask' || !q) return
    let raf = 0
    const frame = () => {
      const e = performance.now() - roundStart.current
      setElapsed(e)
      if (e >= q.timeMs) return void answer(-1)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase, i])

  if (!q) return null
  const left = Math.max(0, q.timeMs - elapsed)
  const urgent = left <= 2_500 && phase === 'ask'
  const isCover = !!q.cover
  const fast = isCover && elapsed <= 3_000 && phase === 'ask'

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className={cx('led-well rounded-[4px] px-3 py-2', urgent && 'animate-pulse-fast')}>
          <Led value={(left / 1000).toFixed(1)} digits={3} className="text-[26px]" color={urgent ? 'var(--color-pink)' : undefined} />
        </span>
        <span className="flex flex-col items-end gap-1">
          <Bulbs count={rounds.length} lit={hits} size={12} className={rounds.length > 3 ? 'w-28' : 'w-16'} />
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-mute">
            ronda
            <span className="led-well rounded-[3px] px-1.5 py-1">
              <Led value={i + 1} className="text-[14px]" />
            </span>
            de {rounds.length}
          </span>
        </span>
      </div>

      <motion.div
        key={i}
        initial={reduce ? false : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        {isCover ? (
          <div className="relative">
            <PixelCover src={q.cover!} progress={elapsed / q.timeMs} reveal={phase !== 'ask'} />
            {fast && (
              <span className="absolute -top-2 right-[calc(50%-min(38vw,150px)-6px)]">
                <Stamp tone="amber" rotate={6} className="bg-ink">
                  Vale doble
                </Stamp>
              </span>
            )}
          </div>
        ) : (
          <div className="bezel flex min-h-[132px] flex-1 rounded-machine p-[3px]">
            <div className="glass-dim grid flex-1 place-items-center rounded-[4px] px-5 py-6">
              <p className="text-balance text-center text-[24px] font-[900] leading-[1.12] [font-stretch:88%]">{q.prompt}</p>
            </div>
          </div>
        )}
        {isCover && <p className="text-center font-display text-[18px] leading-none">{q.prompt}</p>}

        <div className="mt-auto grid gap-2.5">
          {q.options.map((o, k) => {
            const isRight = phase === 'reveal' && correct === k
            const isWrong = phase === 'reveal' && picked === k && correct !== k
            return (
              <button
                key={k}
                onClick={() => answer(k)}
                disabled={phase !== 'ask'}
                className={cx(
                  'pulsador flex min-h-14 flex-col justify-center px-4 py-2 text-left disabled:!filter-none',
                  // La buena se enciende en ámbar (premio); el rosa queda solo para el fallo
                  isRight ? 'bg-amber text-print [--pulsador-glow:rgb(255_194_61/0.45)]' : isWrong ? 'glass-rival' : picked === k ? 'bg-paper text-print' : 'bg-panel-2',
                  phase === 'reveal' && !isRight && !isWrong && 'opacity-45',
                )}
              >
                <span className="line-clamp-2 text-[17px] font-[850] leading-[1.1] [font-stretch:90%]">{o.title}</span>
                {o.sub && (
                  <span className={cx('truncate text-[13px] font-semibold', isRight || isWrong || picked === k ? 'text-print/70' : 'text-mute')}>
                    {o.sub}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
