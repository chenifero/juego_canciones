import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Bulbs, Led } from '../components/machine.tsx'
import { cx, vibrate } from '../lib/util.ts'

const ROUNDS = 5
const FALSE_START_PENALTY = 1200

type Stage = 'wait' | 'go' | 'feedback'

/** Reflejos: toca en cuanto se encienda el cristal. 5 rondas, cuenta la media. */
export function ReflexGame({ onDone }: { durationMs: number; onDone: (score: number) => void }) {
  const [stage, setStage] = useState<Stage>('wait')
  const [round, setRound] = useState(0)
  const [last, setLast] = useState<{ ms: number; early: boolean } | null>(null)
  const times = useRef<number[]>([])
  const goAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finished = useRef(false)

  useEffect(() => {
    if (stage !== 'wait') return
    timer.current = setTimeout(
      () => {
        goAt.current = performance.now()
        setStage('go')
        vibrate(15)
      },
      1000 + Math.random() * 2500,
    )
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [stage, round])

  function next() {
    if (times.current.length >= ROUNDS) {
      if (finished.current) return
      finished.current = true
      const avg = times.current.reduce((a, b) => a + b, 0) / times.current.length
      onDone(Math.round(avg))
      return
    }
    setRound((r) => r + 1)
    setStage('wait')
  }

  function press() {
    if (stage === 'feedback') return
    if (stage === 'wait') {
      if (timer.current) clearTimeout(timer.current)
      times.current.push(FALSE_START_PENALTY)
      setLast({ ms: FALSE_START_PENALTY, early: true })
      vibrate([40, 30, 40])
    } else {
      const ms = Math.round(performance.now() - goAt.current)
      times.current.push(ms)
      setLast({ ms, early: false })
    }
    setStage('feedback')
    setTimeout(next, 750)
  }

  const surface = stage === 'go' ? 'glass' : stage === 'feedback' && last?.early ? 'glass-rival' : 'bezel'

  return (
    <button
      onPointerDown={press}
      className={cx('relative flex h-full w-full touch-none flex-col items-center justify-center rounded-machine', surface)}
      aria-label="Toca cuando se encienda"
    >
      <span className="absolute top-5">
        <Bulbs count={ROUNDS} lit={times.current.length} size={14} className="w-36" />
      </span>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${stage}-${round}`}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="text-center"
        >
          {stage === 'wait' && <p className="font-display text-[40px] text-paper/80">Espera</p>}
          {stage === 'go' && <p className="font-display text-[76px] leading-none text-print">¡Ya!</p>}
          {stage === 'feedback' && last &&
            (last.early ? (
              <p className="font-display text-[40px] text-print">¡Pronto!</p>
            ) : (
              <span className="led-well rounded-[6px] px-4 py-3">
                <Led value={last.ms} digits={4} className="text-[48px]" />
              </span>
            ))}
        </motion.div>
      </AnimatePresence>
    </button>
  )
}
