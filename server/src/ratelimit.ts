import { createHash, timingSafeEqual } from 'node:crypto'
import type { Socket } from 'socket.io'

/**
 * IP real del visitante. Detrás de Fly, el proxy pone `Fly-Client-IP` y lo sobrescribe,
 * así que solo nos fiamos de esa cabecera cuando corremos en Fly (en local sería falsificable).
 */
export function clientIp(socket: Socket): string {
  if (process.env.FLY_APP_NAME) {
    const h = socket.handshake.headers['fly-client-ip']
    const v = Array.isArray(h) ? h[0] : h
    if (v) return v.trim()
  }
  return socket.handshake.address
}

/** Comparación de PIN sin pistas de tiempo (se comparan los hashes, que miden lo mismo). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex')

/** Cuenta eventos por clave en una ventana deslizante. */
export class WindowCounter {
  private hits = new Map<string, number[]>()
  private readonly max: number
  private readonly windowMs: number
  constructor(max: number, windowMs: number) {
    this.max = max
    this.windowMs = windowMs
  }

  /** Anota un evento. Devuelve false si ya se superó el máximo en la ventana. */
  take(key: string, now = Date.now()): boolean {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs)
    if (list.length >= this.max) {
      this.hits.set(key, list)
      return false
    }
    list.push(now)
    this.hits.set(key, list)
    if (this.hits.size > 5_000) this.prune(now)
    return true
  }

  private prune(now: number): void {
    for (const [k, list] of this.hits) {
      if (!list.some((t) => now - t < this.windowMs)) this.hits.delete(k)
    }
  }
}

/**
 * Freno de intentos de PIN: cada fallo de una IP la bloquea más tiempo (2^n segundos, hasta 15 min),
 * y además hay un tope global de fallos por minuto para que repartir el ataque entre IPs no sirva.
 */
export class LoginGuard {
  private fails = new Map<string, { n: number; until: number; last: number }>()
  private global: number[] = []
  private readonly freeTries: number
  private readonly globalMaxPerMin: number
  constructor(freeTries = 3, globalMaxPerMin = 30) {
    this.freeTries = freeTries
    this.globalMaxPerMin = globalMaxPerMin
  }

  /** Segundos que debe esperar esta IP (0 = puede intentarlo). */
  wait(ip: string, now = Date.now()): number {
    const g = this.global.filter((t) => now - t < 60_000)
    this.global = g
    if (g.length >= this.globalMaxPerMin) return Math.ceil((60_000 - (now - g[0]!)) / 1000)
    const f = this.fails.get(ip)
    if (!f || f.until <= now) return 0
    return Math.ceil((f.until - now) / 1000)
  }

  fail(ip: string, now = Date.now()): void {
    this.global.push(now)
    const f = this.fails.get(ip) ?? { n: 0, until: 0, last: now }
    f.n += 1
    f.last = now
    if (f.n > this.freeTries) f.until = now + Math.min(15 * 60_000, 2 ** (f.n - this.freeTries) * 1_000)
    this.fails.set(ip, f)
    if (this.fails.size > 2_000) for (const [k, v] of this.fails) if (now - v.last > 3_600_000) this.fails.delete(k)
  }

  ok(ip: string): void {
    this.fails.delete(ip)
  }
}
