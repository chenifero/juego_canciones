import { io } from 'socket.io-client'
import type { Ack } from '../../../shared/types.ts'

const KEYS = { token: 'bg.token', device: 'bg.device', admin: 'bg.admin' }

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* modo privado: sin persistencia, no pasa nada */
  }
}

/** Identificador del móvil (sobrevive a que se borre la noche). */
export const deviceId: string = (() => {
  let id = read(KEYS.device)
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    write(KEYS.device, id)
  }
  return id
})()

let token = read(KEYS.token)
let adminToken = read(KEYS.admin)

export const session = {
  get token() {
    return token
  },
  setToken(t: string | null) {
    token = t
    write(KEYS.token, t)
  },
  get adminToken() {
    return adminToken
  },
  setAdminToken(t: string | null) {
    adminToken = t
    write(KEYS.admin, t)
  },
}

export const socket = io({
  autoConnect: false,
  transports: ['websocket', 'polling'],
  auth: (cb) => cb({ token, deviceId, adminToken }),
})

export class ActionError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

/** Emite un evento y espera el ack. Rechaza con ActionError si el servidor dice que no. */
export function emit<T>(event: string, payload: object = {}, timeoutMs = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new ActionError('Sin conexión con el bar. Reintentando…', 'OFFLINE'))
      return
    }
    socket.timeout(timeoutMs).emit(event, payload, (err: Error | null, res: Ack<T>) => {
      if (err) reject(new ActionError('El servidor no responde', 'TIMEOUT'))
      else if (res.ok) resolve(res.data)
      else reject(new ActionError(res.error, res.code))
    })
  })
}
