import type { ReactNode } from 'react'

/** Color según lo que queda: verde → cian → ámbar → rojo. */
export function urgencyColor(remainingMs: number, totalMs: number): string {
  const f = totalMs > 0 ? remainingMs / totalMs : 0
  if (remainingMs <= 10_000) return 'var(--color-red)'
  if (f < 0.25 || remainingMs <= 30_000) return 'var(--color-amber)'
  if (f < 0.6) return 'var(--color-cyan)'
  return 'var(--color-green)'
}

/** Anillo de cuenta atrás (SVG). `fraction` = lo que queda, de 0 a 1. */
export function CountdownRing({
  fraction,
  color,
  size = 64,
  stroke = 5,
  children,
  className = '',
}: {
  fraction: number
  color: string
  size?: number
  stroke?: number
  children?: ReactNode
  className?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const f = Math.max(0, Math.min(1, fraction))
  return (
    <div className={`relative grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        {/* Brillo: trazo ancho y translúcido (un filter CSS rompe el desenfoque del contenedor) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={0.28}
          strokeWidth={stroke * 2.6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          style={{ transition: 'stroke 0.6s' }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          style={{ transition: 'stroke 0.6s' }}
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  )
}
