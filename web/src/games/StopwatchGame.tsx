import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Led } from '../components/machine.tsx'
import { vibrate } from '../lib/util.ts'

const TARGET = 10_000
const VISIBLE_UNTIL = 2_000

/** Crono a ciegas: para el reloj justo en 10,00 s. Deja de verse a los 2 s. */
export function StopwatchGame({ durationMs, onDone }: { durationMs: number; onDone: (score: number) => void }) {
  const [elapsed, setElapsed] = useState(0)
  const [stopped, setStopped] = useState<number | null>(null)
  const start = useRef(performance.now())
  const done = useRef(false)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  function finish(at: number) {
    if (done.current) return
    done.current = true
    setStopped(at)
    vibrate(30)
    setTimeout(() => doneRef.current(Math.round(Math.abs(at - TARGET))), 1400)
  }

  useEffect(() => {
    let raf = 0
    const frame = () => {
      const e = performance.now() - start.current
      setElapsed(e)
      if (e >= durationMs) {
        finish(e)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [durationMs])

  const shown = stopped ?? elapsed
  const hidden = stopped === null && elapsed > VISIBLE_UNTIL
  const err = stopped !== null ? Math.abs(stopped - TARGET) : 0

  return (
    <div className="flex h-full flex-col items-center justify-between py-6">
      <p className="text-[17px] font-semibold text-mute">
        Para en <span className="font-display text-paper">10,00</span>
      </p>
      <div className="flex flex-col items-center">
        <span className="led-well rounded-[6px] px-5 py-4">
          <motion.span
            className="block"
            animate={hidden ? { opacity: 0.08 } : { opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Led value={(shown / 1000).toFixed(2)} digits={5} className="text-[64px]" />
          </motion.span>
        </span>
        {hidden && <p className="mt-4 font-display text-[16px] text-amber">Cuenta en tu cabeza</p>}
        {stopped !== null && (
          <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4 font-display text-[22px] text-cyan">
            {err <= 20 ? '¡Clavado!' : `${stopped > TARGET ? '+' : '-'}${(err / 1000).toFixed(2).replace('.', ',')} s`}
          </motion.p>
        )}
      </div>
      <button
        onPointerDown={() => finish(performance.now() - start.current)}
        disabled={stopped !== null}
        className="pulsador glass grid size-52 touch-none place-items-center rounded-full font-display text-[38px] [--pulsador-glow:rgb(25_195_255/0.5)]"
      >
        Stop
      </button>
    </div>
  )
}
