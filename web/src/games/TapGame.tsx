import { motion, useAnimationControls } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Bulbs, Led } from '../components/machine.tsx'
import { vibrate } from '../lib/util.ts'

/** Machaca el botón: 10 s tocando lo más rápido posible. */
export function TapGame({ durationMs, onDone }: { durationMs: number; onDone: (score: number) => void }) {
  const [taps, setTaps] = useState(0)
  const [left, setLeft] = useState(durationMs)
  const tapsRef = useRef(0)
  const done = useRef(false)
  const btn = useAnimationControls()

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const frame = () => {
      const l = durationMs - (performance.now() - start)
      setLeft(Math.max(0, l))
      if (l <= 0) {
        if (!done.current) {
          done.current = true
          onDone(tapsRef.current)
        }
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [durationMs, onDone])

  function tap() {
    if (done.current) return
    tapsRef.current++
    setTaps(tapsRef.current)
    void btn.start({ y: [5, 0], transition: { duration: 0.12 } })
    if (tapsRef.current % 10 === 0) vibrate(8)
  }

  const level = taps >= 105 ? 3 : taps >= 70 ? 2 : taps >= 35 ? 1 : 0

  return (
    <div className="flex h-full flex-col items-center justify-between py-4">
      <div className="flex w-full items-center justify-between">
        <span className="led-well rounded-[4px] px-3 py-2">
          <Led value={(left / 1000).toFixed(1)} className="text-[26px]" />
        </span>
        <span className="flex flex-col items-end gap-1">
          <Bulbs count={3} lit={level} size={14} className="w-20" />
          <span className="text-[13px] font-bold text-mute">puntos</span>
        </span>
      </div>

      <span className="led-well rounded-[6px] px-5 py-3">
        <Led value={taps} digits={3} className="text-[72px]" />
      </span>

      <motion.button
        animate={btn}
        onPointerDown={tap}
        className="relative grid size-64 touch-none place-items-center rounded-full bg-amber font-display text-[34px] text-print shadow-[inset_0_-12px_0_rgb(0_0_0/0.22),inset_0_4px_0_rgb(255_255_255/0.6),0_0_0_10px_#1f232a,0_0_0_14px_#0b0c0e,0_24px_50px_-10px_rgb(255_194_61/0.5)]"
      >
        ¡Dale!
      </motion.button>
    </div>
  )
}
