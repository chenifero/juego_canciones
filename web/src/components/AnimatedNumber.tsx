import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/** Número que "rueda" hasta su valor y lanza un +N flotante cuando sube. */
export function AnimatedNumber({ value, className = '', showDelta = true }: { value: number; className?: string; showDelta?: boolean }) {
  const spring = useSpring(value, { stiffness: 120, damping: 20 })
  const text = useTransform(spring, (v) => Math.round(v).toString())
  const prev = useRef(value)
  const [delta, setDelta] = useState<{ n: number; k: number } | null>(null)

  useEffect(() => {
    const diff = value - prev.current
    prev.current = value
    spring.set(value)
    if (showDelta && diff > 0) setDelta({ n: diff, k: Date.now() })
  }, [value, spring, showDelta])

  return (
    <span className={`relative inline-block tabular-nums ${className}`}>
      <motion.span>{text}</motion.span>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.k}
            initial={{ opacity: 0, y: 4, scale: 0.6 }}
            animate={{ opacity: 1, y: -22, scale: 1 }}
            exit={{ opacity: 0, y: -34 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            onAnimationComplete={() => setDelta((d) => (d?.k === delta.k ? null : d))}
            className="pointer-events-none absolute right-0 top-0 font-display text-sm font-bold text-green text-glow-green"
          >
            +{delta.n}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
