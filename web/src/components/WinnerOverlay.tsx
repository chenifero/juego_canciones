import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { onDuelResult, type DuelResult } from '../lib/store.ts'
import { vibrate } from '../lib/util.ts'
import { Avatar } from './Avatar.tsx'
import { Bulbs, Stamp } from './machine.tsx'

const COLORS = ['var(--color-cyan)', 'var(--color-amber)', 'var(--color-paper)']

/** Lluvia de fichas al ganar. */
function Coins() {
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 1.6 + Math.random() * 1.2,
        size: 10 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
        spin: (Math.random() - 0.5) * 3,
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute top-0 rounded-full border-2 border-print/40"
          style={{ left: `${b.x}%`, width: b.size, height: b.size, background: b.color }}
          initial={{ y: -30, scaleX: 1, opacity: 1 }}
          animate={{ y: '108vh', scaleX: [1, 0.15, 1, 0.15, 1].map((v) => v * Math.sign(b.spin || 1)), opacity: [1, 1, 0.9] }}
          transition={{ duration: b.dur, delay: b.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

/** Premio: se decide qué canción suena después. */
export function WinnerOverlay() {
  const [res, setRes] = useState<DuelResult | null>(null)

  useEffect(
    () =>
      onDuelResult((r) => {
        setRes(r)
        vibrate([60, 40, 60, 40, 120])
      }),
    [],
  )
  useEffect(() => {
    if (!res) return
    const t = setTimeout(() => setRes(null), 4_500)
    return () => clearTimeout(t)
  }, [res])

  return (
    <AnimatePresence>
      {res && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-ink px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setRes(null)}
        >
          <Coins />
          <div className="relative w-full max-w-xs text-center">
            <motion.p
              initial={{ scale: 2.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="font-display text-[54px] leading-none text-amber"
              style={{ textShadow: '0 0 24px rgb(255 194 61 / 0.6)' }}
            >
              ¡Premio!
            </motion.p>
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.15 }}
              className="bezel relative mx-auto mt-6 w-fit rounded-machine p-3"
            >
              <Bulbs count={9} size={8} chase className="mb-3 w-full" />
              <img src={res.winner.track.cover} alt="" className="size-52 rounded-[4px] object-cover" />
              <Bulbs count={9} size={8} chase className="mt-3 w-full" />
              <span className="absolute -right-4 top-10">
                <Stamp tone="amber" rotate={8} className="bg-ink text-[13px]">
                  Suena después
                </Stamp>
              </span>
            </motion.div>
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <p className="mt-6 text-[24px] font-[900] leading-tight [font-stretch:88%]">{res.winner.track.title}</p>
              <p className="mt-2 flex items-center justify-center gap-2 text-[16px] text-mute">
                <Avatar user={res.winner.by} size={res.winner.by.photo ? 40 : 28} className="border-2" /> {res.winner.by.alias}
              </p>
              {res.loser && (
                <p className="mt-5 text-[14px] text-paper/70">
                  «{res.loser.track.title}» se queda con {res.loser.points} puntos para la revancha.
                </p>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
