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

/** Un álbum con su portada (para el juego de las carátulas). */
export interface AlbumInfo {
  name: string
  artist: string
  cover: string
}

export interface PublicUser {
  id: string
  alias: string
  /** URL del selfie (se borra al cerrar la noche). Sin foto, se usa la inicial del alias. */
  photo?: string
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
  /** Juegos sorpresa del VS, en orden: la partida n de cada jugador es games[n]. Igual para los dos equipos. */
  games: GameId[]
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
  nightCode: string
  history: { track: TrackInfo; by: PublicUser | null; playedAt: number }[]
  spotifyAccount: string | null
}

export type GameId = 'tap' | 'reflex' | 'memory' | 'rhythm' | 'cover' | 'trivia' | 'stopwatch'

/** Una pregunta de los juegos de acertar (carátula y trivia). La respuesta buena solo la sabe el servidor. */
export interface QuizRound {
  prompt: string
  /** Carátula que se va despixelando (solo en «cover»). */
  cover?: string
  options: { title: string; sub?: string }[]
  /** Tiempo para contestar. */
  timeMs: number
}

/** Respuesta a una ronda: opción elegida (-1 si se acabó el tiempo) y cuánto tardó. */
export interface QuizAnswer {
  choice: number
  ms: number
}

export interface GameSession {
  sessionId: string
  game: GameId
  requestId: string
  startsAt: number
  durationMs: number
  quiz?: QuizRound[]
  /** Partida sorpresa del VS (no gasta créditos). */
  duel?: boolean
}

export interface GameResult {
  points: number
  score: number
  message: string
}

/** Respuesta estándar de los "ack" de Socket.IO. */
export type Ack<T = undefined> = { ok: true; data: T } | { ok: false; error: string; code?: string }
