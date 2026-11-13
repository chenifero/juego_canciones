import { BeerStein, Flask, Martini, MusicNotes, Pill, Plus, VinylRecord, type Icon } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Bulbs, Led } from '../components/machine.tsx'
import { cx, vibrate } from '../lib/util.ts'

/** Los seis símbolos de la máquina: botica y barra. */
const SYMBOLS: Icon[] = [Pill, Flask, BeerStein, Martini, MusicNotes, VinylRecord]
const NAMES = ['pastilla', 'matraz', 'jarra de cerveza', 'cóctel', 'notas', 'disco']
const PAIRS = SYMBOLS.length
/** Lo que se quedan a la vista dos cartas que no casan. */
const MISS_MS = 650

function deal(): number[] {
  const deck = [...SYMBOLS.keys(), ...SYMBOLS.keys()]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j]!, deck[i]!]
  }
  return deck
}

/** Memoria: empareja las 12 cartas antes de que se acabe el tiempo. Cuanto antes, más puntos. */
export function MemoryGame({ durationMs, onDone }: { durationMs: number; onDone: (score: number) => void }) {
  const reduce = useReducedMotion()
  const [deck] = useState(deal)
  const [open, setOpenState] = useState<number[]>([])
  const [matched, setMatchedState] = useState<Set<number>>(() => new Set())
  // Copias al día para dos toques en el mismo fotograma
  const openRef = useRef<number[]>([])
  const matchedRef = useRef<Set<number>>(new Set())
  const setOpen = (v: number[]) => setOpenState((openRef.current = v))
  const setMatched = (v: Set<number>) => setMatchedState((matchedRef.current = v))
  const [missed, setMissed] = useState<number[]>([])
  const [left, setLeft] = useState(durationMs)
  const start = useRef(performance.now())
  const done = useRef(false)
  const busy = useRef(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  function finish(score: number) {
    if (done.current) return
    done.current = true
    setTimeout(() => doneRef.current(score), score > 0 ? 700 : 300)
  }

  useEffect(() => {
    let raf = 0
    const frame = () => {
      const l = durationMs - (performance.now() - start.current)
      setLeft(Math.max(0, l))
      if (done.current) return
      if (l <= 0) return finish(0)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [durationMs])

  function flip(i: number) {
    if (done.current || busy.current || matchedRef.current.has(i) || openRef.current.includes(i)) return
    vibrate(6)
    const next = [...openRef.current, i]
    setOpen(next)
    if (next.length < 2) return
    const [a, b] = next as [number, number]
    if (deck[a] === deck[b]) {
      const m = new Set(matchedRef.current).add(a).add(b)
      setMatched(m)
      setOpen([])
      vibrate([12, 30, 12])
      if (m.size === deck.length) finish(Math.round(performance.now() - start.current))
      return
    }
    busy.current = true
    setMissed(next)
    setTimeout(() => {
      setOpen([])
      setMissed([])
      busy.current = false
    }, MISS_MS)
  }

  const urgent = left <= 10_000
  const allDone = matched.size === deck.length

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className={cx('led-well rounded-[4px] px-3 py-2', urgent && 'animate-pulse-fast')}>
          <Led value={(left / 1000).toFixed(1)} digits={4} className="text-[26px]" color={urgent ? 'var(--color-pink)' : undefined} />
        </span>
        <span className="flex flex-col items-end gap-1">
          <Bulbs count={PAIRS} lit={matched.size / 2} size={12} className="w-28" />
          <span className="text-[13px] font-bold text-mute">parejas</span>
        </span>
      </div>

      <div className="bezel grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2 rounded-machine p-2">
        {deck.map((sym, i) => {
          const Glyph = SYMBOLS[sym]!
          const isMatched = matched.has(i)
          const faceUp = isMatched || open.includes(i)
          const miss = missed.includes(i)
          return (
            <button
              key={i}
              onPointerDown={() => flip(i)}
              disabled={isMatched}
              className="relative touch-none [perspective:600px]"
              aria-label={faceUp ? `Carta: ${NAMES[sym]}` : `Carta ${i + 1}, tapada`}
            >
              <motion.span
                className="absolute inset-0 [transform-style:preserve-3d]"
                animate={{ rotateY: faceUp ? 180 : 0, scale: isMatched && allDone && !reduce ? [1, 1.06, 1] : 1 }}
                transition={{ duration: reduce ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Dorso: cristal apagado con la cruz de la botica serigrafiada (no es ningún símbolo del juego) */}
                <span className="glass-dim absolute inset-0 grid place-items-center rounded-[4px] [backface-visibility:hidden]">
                  <Plus size={30} weight="bold" className="text-cyan/25" aria-hidden />
                </span>
                {/* Cara: ámbar al destaparla, cristal encendido cuando ya es pareja, rosa si falla */}
                <span
                  className={cx(
                    'absolute inset-0 grid place-items-center rounded-[4px] text-print [backface-visibility:hidden] [transform:rotateY(180deg)]',
                    isMatched ? 'glass' : miss ? 'glass-rival' : 'bg-amber shadow-[inset_0_-5px_0_rgb(0_0_0/0.2),inset_0_2px_0_rgb(255_255_255/0.55)]',
                  )}
                >
                  <Glyph size={44} weight="fill" aria-hidden />
                </span>
              </motion.span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
