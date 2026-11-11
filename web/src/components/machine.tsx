import { motion, useReducedMotion } from 'motion/react'
import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../lib/util.ts'

/**
 * Contador LED de 7 segmentos. Detrás se ven los segmentos apagados ("8"),
 * como en las ventanillas de crédito de las máquinas.
 */
export function Led({
  value,
  digits,
  className = '',
  color = 'var(--color-amber)',
  flashOnChange = false,
}: {
  value: string | number
  digits?: number
  className?: string
  color?: string
  flashOnChange?: boolean
}) {
  let text = String(value)
  if (digits && text.length < digits) text = text.padStart(digits, '!')
  const ghost = text.replace(/[0-9!\-]/g, '8')
  const prev = useRef(text)
  const [flash, setFlash] = useState(0)
  useEffect(() => {
    if (flashOnChange && prev.current !== text) setFlash((f) => f + 1)
    prev.current = text
  }, [text, flashOnChange])

  return (
    <span className={cx('relative inline-block font-led leading-none', className)} aria-label={String(value)}>
      <span aria-hidden className="opacity-[0.09]" style={{ color }}>
        {ghost}
      </span>
      <motion.span
        key={flash}
        aria-hidden
        className="absolute inset-0"
        style={{ color, textShadow: `0 0 8px ${color}` }}
        initial={flash ? { filter: 'brightness(2.2)' } : false}
        animate={{ filter: 'brightness(1)' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {text}
      </motion.span>
    </span>
  )
}

/** Hilera de bombillas. `chase` hace que la luz corra; si no, quedan encendidas alternas. */
export const Bulbs = memo(function Bulbs({
  count,
  chase = false,
  size = 8,
  className = '',
  lit,
}: {
  count: number
  chase?: boolean
  size?: number
  className?: string
  /** Cuántas encendidas (de izquierda a derecha). Si se da, ignora chase. */
  lit?: number
}) {
  const reduce = useReducedMotion()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!chase || reduce || lit !== undefined) return
    const t = setInterval(() => setTick((x) => x + 1), 140)
    return () => clearInterval(t)
  }, [chase, reduce, lit])
  return (
    <span className={cx('flex items-center justify-between', className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const on = lit !== undefined ? i < lit : chase && !reduce ? (i + tick) % 3 === 0 : i % 2 === 0
        return <span key={i} className={on ? 'bulb-on' : 'bulb'} style={{ width: size, height: size }} />
      })}
    </span>
  )
})

/** Sello de estado (EN DUELO, EN COLA…): se estampa con un pequeño golpe. */
export function Stamp({
  children,
  tone = 'paper',
  className = '',
  rotate = -4,
}: {
  children: ReactNode
  tone?: 'paper' | 'amber' | 'cyan' | 'pink' | 'print'
  className?: string
  rotate?: number
}) {
  const tones = {
    paper: 'border-paper text-paper',
    amber: 'border-amber text-amber',
    cyan: 'border-cyan text-cyan',
    pink: 'border-pink text-pink',
    print: 'border-print text-print',
  }
  return (
    <motion.span
      initial={{ scale: 1.8, opacity: 0, rotate: rotate * 2 }}
      animate={{ scale: 1, opacity: 1, rotate }}
      transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      className={cx(
        'inline-block whitespace-nowrap rounded-[3px] border-2 px-1.5 py-[1px] font-display text-[10px] leading-tight',
        tones[tone],
        className,
      )}
    >
      {children}
    </motion.span>
  )
}

/**
 * Círculo de rotulador alrededor de lo tuyo: un solo trazo a mano que se dibuja una vez.
 * Se coloca absoluto sobre el elemento que marca.
 */
export function MarkerCircle({ className = '', color = 'var(--color-paper)' }: { className?: string; color?: string }) {
  const reduce = useReducedMotion()
  return (
    <svg
      viewBox="0 0 400 100"
      preserveAspectRatio="none"
      className={cx('pointer-events-none absolute -inset-x-1.5 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)]', className)}
      aria-hidden
    >
      <motion.path
        d="M28 18 C 120 4, 300 2, 382 16 C 402 22, 398 70, 372 86 C 300 100, 90 100, 22 84 C 2 76, 2 30, 30 16 C 60 8, 110 6, 150 8"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 0.9 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  )
}
