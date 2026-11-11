import { useEffect, useState, useSyncExternalStore } from 'react'
import type { MeState, PublicState, SongRequest } from '../../../shared/types.ts'
import { session, socket } from './socket.ts'

export interface DuelResult {
  winner: SongRequest
  loser: SongRequest | null
}

interface Store {
  state: PublicState | null
  me: MeState | null
  connected: boolean
  /** serverTime - Date.now() (suavizado). */
  offset: number
  expired: null | { banned: boolean }
}

let store: Store = { state: null, me: null, connected: false, offset: 0, expired: null }
const listeners = new Set<() => void>()
const duelListeners = new Set<(r: DuelResult) => void>()
let samples = 0

function set(patch: Partial<Store>): void {
  store = { ...store, ...patch }
  for (const l of listeners) l()
}

socket.on('connect', () => set({ connected: true }))
socket.on('disconnect', () => set({ connected: false }))
socket.on('state', (s: PublicState) => {
  const sample = s.serverTime - Date.now()
  const offset = samples++ === 0 ? sample : store.offset * 0.8 + sample * 0.2
  set({ state: s, offset })
})
socket.on('me', (m: MeState) => set({ me: m, expired: null }))
socket.on('session:expired', (p?: { banned?: boolean }) => {
  session.setToken(null)
  set({ me: null, expired: { banned: !!p?.banned } })
})
socket.on('duel:result', (r: DuelResult) => {
  for (const l of duelListeners) l(r)
})

export function connect(): void {
  if (!socket.connected) socket.connect()
}

export function useStore(): Store {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => store,
  )
}

export function getOffset(): number {
  return store.offset
}

/** Hora del servidor. */
export function serverNow(): number {
  return Date.now() + store.offset
}

export function onDuelResult(fn: (r: DuelResult) => void): () => void {
  duelListeners.add(fn)
  return () => duelListeners.delete(fn)
}

/** Re-renderiza a ~fps mientras el componente está montado. Devuelve la hora del servidor. */
export function useServerNow(fps = 30): number {
  const [now, setNow] = useState(serverNow)
  useEffect(() => {
    let raf = 0
    let last = 0
    const frame = (t: number) => {
      if (t - last >= 1000 / fps) {
        last = t
        setNow(serverNow())
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [fps])
  return now
}

/** Progreso actual (ms) de la canción que suena, interpolado. */
export function progressAt(state: PublicState, now: number): number {
  const { now: np } = state
  if (!np.track) return 0
  const p = np.progressMs + (np.isPlaying ? now - np.at : 0)
  return Math.max(0, Math.min(np.track.durationMs, p))
}
