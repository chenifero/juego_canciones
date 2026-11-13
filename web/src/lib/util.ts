import type { GameId } from '../../../shared/types.ts'

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

let tickSwitch: HTMLLabelElement | null = null

/**
 * iPhone no tiene `navigator.vibrate`, pero Safari (17.4+) da un toque háptico
 * al cambiar un interruptor nativo (`<input switch>`). Lo accionamos a mano.
 */
function iosTick(): void {
  if (!tickSwitch) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    document.body.appendChild(label)
    tickSwitch = label
  }
  tickSwitch.click()
}

export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
      return
    }
    // Sin vibración del navegador: un toque háptico por cada pulso del patrón
    const steps = Array.isArray(pattern) ? pattern : [pattern]
    let at = 0
    steps.forEach((ms, i) => {
      if (i % 2 === 0) setTimeout(iosTick, at)
      at += ms
    })
  } catch {
    /* sin vibración posible */
  }
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** En este orden salen en el selector; el último (el premio gordo) va a todo lo ancho. */
export const GAMES = {
  tap: { name: 'Machaca el botón', level: 1, max: 3, desc: '10 segundos tocando sin parar.' },
  reflex: { name: 'Reflejos', level: 1, max: 3, desc: 'Toca en cuanto se encienda la luz.' },
  memory: { name: 'Memoria', level: 2, max: 4, desc: 'Empareja las 12 cartas. Cuanto antes, más puntos.' },
  rhythm: { name: 'Al ritmo', level: 2, max: 5, desc: 'Toca cada círculo cuando el aro encaje. Las bombillas marcan el ritmo.' },
  cover: { name: 'Carátula', level: 2, max: 6, desc: '¿Qué canción es? Si la sacas aún pixelada, vale doble.' },
  trivia: { name: 'Trivia', level: 2, max: 5, desc: '5 preguntas de música. 8 segundos cada una.' },
  stopwatch: { name: 'Crono a ciegas', level: 3, max: 10, desc: 'Para el reloj justo en 10,00.' },
} as const satisfies Record<GameId, { name: string; level: number; max: number; desc: string }>
