import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Bulbs, Led } from '../components/machine.tsx'
import { cx, vibrate } from '../lib/util.ts'

const COUNT = 18
/** Un círculo por pulso: unos 92 golpes por minuto. */
const BEAT_MS = 650
/** Lo que tarda el aro en cerrarse sobre el círculo. */
const APPROACH_MS = 1000
const FIRST_AT = 1200
/** Ventanas: clavado, bien y justo. Fuera de la última, cuenta como fallo. */
const WINDOWS = [70, 140, 230] as const

interface Target {
  id: number
  x: number
  y: number
  at: number
}

type Grade = 3 | 2 | 1 | 0
const LABEL: Record<Grade, string> = { 3: '¡Clavado!', 2: 'Bien', 1: 'Justo', 0: 'Fuera' }

/** Posiciones al azar, cada una lejos de la anterior para que haya que mover el dedo. */
function layout(): Target[] {
  const out: Target[] = []
  let px = 50
  let py = 50
  for (let i = 0; i < COUNT; i++) {
    let x = 0
    let y = 0
    do {
      x = 22 + Math.random() * 56
      y = 16 + Math.random() * 68
    } while (Math.hypot(x - px, (y - py) * 0.6) < 22)
    px = x
    py = y
    out.push({ id: i, x, y, at: FIRST_AT + i * BEAT_MS })
  }
  return out
}

/**
 * Círculos al ritmo: el aro ámbar se cierra sobre el círculo y hay que tocarlo justo cuando encaja.
 * El ritmo se ve en las bombillas, que laten con cada golpe: no hace falta oír nada.
 */
export function RhythmGame({ onDone }: { durationMs: number; onDone: (score: number) => void }) {
  const reduce = useReducedMotion()
  const [targets] = useState(layout)
  const [t, setT] = useState(0)
  const [graded, setGraded] = useState<Map<number, Grade>>(() => new Map())
  const [pops, setPops] = useState<{ id: number; x: number; y: number; g: Grade }[]>([])
  const gradedRef = useRef(graded)
  const start = useRef(performance.now())
  const done = useRef(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  const score = [...graded.values()].reduce<number>((a, g) => a + g, 0)

  function grade(target: Target, g: Grade) {
    if (gradedRef.current.has(target.id)) return
    const next = new Map(gradedRef.current).set(target.id, g)
    gradedRef.current = next
    setGraded(next)
    setPops((p) => [...p.slice(-4), { id: target.id, x: target.x, y: target.y, g }])
    if (g === 3) vibrate(14)
    else if (g === 0) vibrate([30, 20, 30])
  }

  useEffect(() => {
    let raf = 0
    const end = targets[targets.length - 1]!.at + WINDOWS[2] + 300
    const frame = () => {
      const now = performance.now() - start.current
      setT(now)
      // Los que se pasaron sin tocar
      for (const tg of targets) if (now > tg.at + WINDOWS[2] && !gradedRef.current.has(tg.id)) grade(tg, 0)
      if (now >= end) {
        if (!done.current) {
          done.current = true
          const total = [...gradedRef.current.values()].reduce<number>((a, g) => a + g, 0)
          setTimeout(() => doneRef.current(total), 500)
        }
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [targets])

  function hit(tg: Target) {
    const err = performance.now() - start.current - tg.at
    const abs = Math.abs(err)
    // Tocar antes de que el aro llegue ni a la última ventana es fallo
    const g: Grade = err < -WINDOWS[2] ? 0 : abs <= WINDOWS[0] ? 3 : abs <= WINDOWS[1] ? 2 : abs <= WINDOWS[2] ? 1 : 0
    grade(tg, g)
  }

  // El paso cae justo en el golpe (cuando el aro encaja), y la bombilla destella 120 ms
  const sinceFirst = t - FIRST_AT
  const beat = Math.floor(sinceFirst / BEAT_MS)
  const flash = (((sinceFirst % BEAT_MS) + BEAT_MS) % BEAT_MS) < 120
  const visible = targets.filter((tg) => !graded.has(tg.id) && t >= tg.at - APPROACH_MS && t <= tg.at + WINDOWS[2])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        {/* El metrónomo: la luz avanza una bombilla en cada golpe; con movimiento reducido, destellan todas a la vez */}
        <span className="flex gap-1.5" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => {
            const on = reduce ? flash : ((beat % 6) + 6) % 6 === i
            return <span key={i} className={cx('size-3', on ? 'bulb-on' : 'bulb')} />
          })}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-mute">ritmo</span>
          <span className="led-well rounded-[4px] px-2.5 py-1.5">
            <Led value={score} digits={2} className="text-[24px]" flashOnChange />
          </span>
        </span>
      </div>

      <div className="bezel relative min-h-0 flex-1 overflow-hidden rounded-machine p-[3px]">
        <div className="glass-dim relative size-full touch-none overflow-hidden rounded-[4px]">
          {visible.map((tg, k) => {
            const toHit = tg.at - t
            const ring = 1 + Math.max(0, toHit / APPROACH_MS) * 1.3
            const ripe = Math.abs(toHit) <= WINDOWS[1]
            return (
              <button
                key={tg.id}
                onPointerDown={() => hit(tg)}
                className="absolute grid size-[84px] -translate-x-1/2 -translate-y-1/2 touch-none place-items-center"
                // El que toca antes, encima
                style={{ left: `${tg.x}%`, top: `${tg.y}%`, zIndex: 50 - k }}
                aria-label={`Círculo ${tg.id + 1}`}
              >
                <span className={cx('glass grid size-[72px] place-items-center rounded-full', ripe && 'brightness-125')}>
                  <span className="font-display text-[26px] leading-none text-print">{tg.id + 1}</span>
                </span>
                <span
                  className="pointer-events-none absolute inset-[6px] rounded-full border-[5px] border-amber shadow-[0_0_14px_rgb(255_194_61/0.6)]"
                  style={{ transform: `scale(${ring})`, opacity: Math.min(1, (APPROACH_MS - toHit) / 250) }}
                  aria-hidden
                />
              </button>
            )
          })}

          {pops.map((p) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 0, y: 0, scale: 0.7 }}
                animate={{ opacity: [0, 1, 1, 0], y: [0, -24, -28, -34], scale: [0.7, 1, 1, 1] }}
                transition={{ duration: 0.75, times: [0, 0.25, 0.7, 1], ease: 'easeOut' }}
                onAnimationComplete={() => setPops((all) => all.filter((x) => x.id !== p.id))}
                className={cx(
                  'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[18px]',
                  p.g === 3 ? 'text-amber' : p.g === 0 ? 'text-pink' : 'text-paper',
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                {LABEL[p.g]}
              </motion.span>
            ))}
        </div>
      </div>

      <Bulbs count={COUNT} lit={graded.size} size={7} className="px-1" />
    </div>
  )
}

