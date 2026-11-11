import { memo } from 'react'

/**
 * La cruz verde LED de las farmacias, hecha de puntos que se encienden en ondas
 * desde el centro. Es la seña de identidad de La Barmacia.
 */
export const LedCross = memo(function LedCross({
  size = 120,
  color = 'var(--color-green)',
  speed = 1,
  className = '',
}: {
  size?: number
  color?: string
  speed?: number
  className?: string
}) {
  const n = 9
  const dots: { x: number; y: number; d: number }[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inCross = (r >= 3 && r <= 5) || (c >= 3 && c <= 5)
      if (inCross) dots.push({ x: c, y: r, d: Math.hypot(r - 4, c - 4) })
    }
  }
  const dur = 1.8 / speed
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-0.5 -0.5 ${n} ${n}`}
      className={`animate-glow ${className}`}
      aria-hidden
    >
      {dots.map(({ x, y, d }) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={0.36}
          fill={color}
          className="animate-led"
          style={{ animationDelay: `${(d * 0.14) / speed}s`, animationDuration: `${dur}s` }}
        />
      ))}
    </svg>
  )
})
