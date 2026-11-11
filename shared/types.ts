// Tipos compartidos entre servidor y web. Solo tipos: no generan código.

export interface TrackInfo {
  id: string
  uri: string
  title: string
  artist: string
  album: string
  cover: string
  durationMs: number
  explicit: boolean
}

export interface PublicUser {
  id: string
  alias: string
  emoji: string
}

/** Fases de una ronda (la ronda es la canción que está sonando). */
export type Phase =
  | 'idle' // no suena nada / Spotify en pausa
  | 'open' // ranking abierto
  | 'duel' // últimos segundos: #1 VS #2 con puntos dobles
  | 'locked' // votaciones cerradas: la ganadora ya está en la cola

export type SpotifyStatus = 'ok' | 'no-device' | 'disconnected' | 'error' | 'mock'

export interface SongRequest {
  id: string
  track: TrackInfo
  by: PublicUser
  points: number
  supporters: number
  /** Unos pocos seguidores para pintar burbujas. */
  team: PublicUser[]
  createdAt: number
  status: 'waiting' | 'locked'
  roundsWaiting: number
}

export interface NowPlaying {
  track: TrackInfo | null
  progressMs: number
  isPlaying: boolean
  /** Momento (reloj del servidor) en que se midió progressMs. */
  at: number
  /** Si la canción que suena salió del juego, quién la pidió. */
  requestedBy: PublicUser | null
}

export interface DuelInfo {
  aId: string
  bId: string
  startsAt: number
}

export interface PublicState {
  open: boolean
  spotify: SpotifyStatus
  now: NowPlaying
  phase: Phase
  round: number
  ranking: SongRequest[]
  locked: SongRequest | null
  duel: DuelInfo | null
  /** Momento (reloj del servidor) en que se cierran las votaciones. */
  lockAt: number | null
  multiplier: number
  happyHour: boolean
  dosePoints: number
  online: number
  serverTime: number
}

export interface MeState {
  user: PublicUser
  activeRequestId: string | null
  votedThisRound: boolean
  teamId: string | null
  /** Epoch ms a partir del cual puede volver a pedir (0 = ya puede). */
  nextRequestAt: number
  requestsLastHour: number
  energy: number
  maxEnergy: number
}

export interface Settings {
  basePoints: number
  votePoints: number
  loserKeepPct: number
  duelWindowMs: number
  lockBeforeEndMs: number
  cooldownMs: number
  maxPerHour: number
  noRepeatMs: number
  maxDurationMs: number
  energyPerRound: number
  waitBonus: number
  expireRounds: number
  blockExplicit: boolean
  happyHour: boolean
  dosePoints: number
}

export interface AdminUserRow extends PublicUser {
  joinedAt: number
  requests: number
  online: boolean
}

export interface AdminState {
  settings: Settings
  users: AdminUserRow[]
  bannedCount: number
  history: { track: TrackInfo; by: PublicUser | null; playedAt: number }[]
  spotifyAccount: string | null
}

export type GameId = 'tap' | 'reflex' | 'stopwatch'

export interface GameSession {
  sessionId: string
  game: GameId
  requestId: string
  startsAt: number
  durationMs: number
}

export interface GameResult {
  points: number
  score: number
  message: string
}

/** Respuesta estándar de los "ack" de Socket.IO. */
export type Ack<T = undefined> = { ok: true; data: T } | { ok: false; error: string; code?: string }
