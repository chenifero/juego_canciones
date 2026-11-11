export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* iOS no vibra: sin más */
  }
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

export const EMOJIS = ['🦊', '🐸', '🐙', '🦄', '🐯', '🐼', '🦖', '👽', '🤖', '🔥', '💀', '🍺', '🎸', '🪩', '🌵', '🍕']

export const GAMES = {
  tap: { name: 'Machaca el botón', level: 1, max: 3, desc: '10 segundos tocando sin parar.' },
  reflex: { name: 'Reflejos', level: 1, max: 3, desc: 'Toca en cuanto se encienda la luz.' },
  stopwatch: { name: 'Crono a ciegas', level: 3, max: 10, desc: 'Para el reloj justo en 10,00.' },
} as const
