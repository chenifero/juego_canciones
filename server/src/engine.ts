import { randomBytes, randomInt } from 'node:crypto'
import type {
  AdminState,
  DuelInfo,
  GameId,
  GameResult,
  GameSession,
  MeState,
  Phase,
  PublicState,
  PublicUser,
  AlbumInfo,
  QuizAnswer,
  Settings,
  SongRequest,
  SpotifyStatus,
  TrackInfo,
} from '../../shared/types.ts'
import type { Playback } from './music/provider.ts'
import { buildCoverQuiz, buildTriviaQuiz, poolEntries, type BuiltRound } from './quiz.ts'
import { safeEqual, sha256 } from './ratelimit.ts'

/** Cuánto dura una sesión de la dueña antes de pedir el PIN otra vez. */
const ADMIN_SESSION_MS = 12 * 60 * 60_000
/** Tope de jugadores a la vez (un bar no pasa de aquí; frena las altas masivas). */
export const MAX_USERS = 400
/** Puntos máximos (antes de multiplicadores) que un jugador puede sacar jugando en una ronda. */
const GAME_POINTS_CAP = 15

export class GameError extends Error {
  code: string
  constructor(message: string, code = 'ERR') {
    super(message)
    this.code = code
  }
}

const MIN = 60_000
const HOUR = 60 * MIN

export const DEFAULT_SETTINGS: Settings = {
  basePoints: 10,
  votePoints: 1,
  loserKeepPct: 0.5,
  duelWindowMs: 60_000,
  lockBeforeEndMs: 20_000,
  cooldownMs: 15 * MIN,
  maxPerHour: 3,
  noRepeatMs: 2 * HOUR,
  maxDurationMs: 7 * MIN,
  energyPerRound: 3,
  waitBonus: 1,
  expireRounds: 8,
  blockExplicit: false,
  dosePoints: 15,
}

interface User {
  id: string
  token: string
  deviceId: string
  alias: string
  joinedAt: number
  requestTimes: number[]
  lastPlayedAt: number
  teamId: string | null
  /** Versión del selfie (0 = sin foto). Cambia cada vez que sube una nueva. */
  photoV?: number
}

interface Req {
  id: string
  track: TrackInfo
  userId: string
  points: number
  supporters: string[]
  createdAt: number
  status: 'waiting' | 'locked'
  roundsWaiting: number
  lockedRound: number
}

interface Played {
  track: TrackInfo
  userId: string | null
  by: PublicUser | null
  playedAt: number
}

interface Session {
  id: string
  userId: string
  game: GameId
  requestId: string
  startsAt: number
  durationMs: number
  /** Juegos de acertar: respuesta buena de cada ronda y lo que ha contestado. */
  quiz?: BuiltRound[]
  answers?: QuizAnswer[]
  /** Cuándo llegó la última respuesta (o el inicio): el servidor mide aquí, no se fía del reloj del móvil. */
  lastAnswerAt?: number
}

interface Dose {
  code: string
  points: number
  expiresAt: number
  used: boolean
}

/** Lo que se guarda en disco para sobrevivir a un reinicio del servidor. */
export interface EngineSnapshot {
  settings: Settings
  open: boolean
  users: User[]
  requests: Req[]
  history: Played[]
  bannedDevices: string[]
  /** Sesiones de la dueña: [hash del token, caducidad]. Nunca el token en claro. */
  adminTokens: [string, number][]
  /** Hash del PIN con que se crearon: si cambia el PIN, esas sesiones dejan de valer. */
  adminPinHash?: string
  /** Código de la noche (4 cifras): quien entra por primera vez lo necesita. */
  nightCode?: string
  round: number
}

/** Cuenta atrás para los minijuegos (3, 2, 1…). */
const GAME_COUNTDOWN_MS = 3_000
const GAME_DURATION: Record<GameId, number> = {
  tap: 10_000,
  reflex: 24_000,
  memory: 40_000,
  rhythm: 16_000,
  cover: 26_000,
  trivia: 48_000,
  stopwatch: 13_000,
}
const GAME_IDS = Object.keys(GAME_DURATION) as GameId[]

const id = (bytes = 8) => randomBytes(bytes).toString('hex')

export class Engine {
  settings: Settings = { ...DEFAULT_SETTINGS }
  open = false
  private users = new Map<string, User>()
  private tokens = new Map<string, string>()
  private requests = new Map<string, Req>()
  private history: Played[] = []
  private bannedDevices = new Set<string>()
  /** hash del token → caducidad */
  private adminTokens = new Map<string, number>()
  private adminPinHash = ''
  private nightCode = ''
  /** Códigos de un solo uso para ir a Spotify sin poner el token en la URL. */
  private linkCodes = new Map<string, number>()

  round = 0
  phase: Phase = 'idle'
  duel: DuelInfo | null = null
  spotify: SpotifyStatus = 'disconnected'
  playback: Playback | null = null
  private lastTrackId: string | null = null
  private lockAttemptRound = -1
  private lastLock: { winnerId: string; loserId: string | null; loserPoints: number; duel: DuelInfo | null } | null = null
  private voted = new Set<string>()
  private energyUsed = new Map<string, number>()
  /** Partidas del VS que lleva cada jugador (índice en duel.games). */
  private duelPlays = new Map<string, number>()
  /** Puntos de juego (antes de multiplicadores) que lleva cada jugador esta ronda. */
  private gamePoints = new Map<string, number>()
  private sessions = new Map<string, Session>()
  private doses = new Map<string, Dose>()

  /** Se llama cuando algo cambia (para emitir estado y guardar). */
  onChange: () => void = () => {}
  /** Se llama cuando se decide un duelo (para animar el resultado). */
  onDuelResult: (r: { winner: SongRequest; loser: SongRequest | null }) => void = () => {}

  // ───────────────────────── persistencia ─────────────────────────

  snapshot(): EngineSnapshot {
    return {
      settings: this.settings,
      open: this.open,
      users: [...this.users.values()],
      requests: [...this.requests.values()],
      history: this.history,
      bannedDevices: [...this.bannedDevices],
      adminTokens: [...this.adminTokens],
      adminPinHash: this.adminPinHash,
      nightCode: this.nightCode,
      round: this.round,
    }
  }

  restore(s: EngineSnapshot): void {
    this.settings = { ...DEFAULT_SETTINGS, ...s.settings }
    this.open = s.open
    this.nightCode = /^\d{4}$/.test(s.nightCode ?? '') ? s.nightCode! : this.makeCode()
    this.users = new Map(s.users.map((u) => [u.id, u]))
    this.tokens = new Map(s.users.map((u) => [u.token, u.id]))
    this.requests = new Map(s.requests.map((r) => [r.id, r]))
    this.history = s.history ?? []
    this.bannedDevices = new Set(s.bannedDevices ?? [])
    // Formato nuevo: pares [hash, caducidad]. Las sesiones guardadas por versiones antiguas (tokens en claro) se descartan.
    const now = Date.now()
    this.adminTokens = new Map(
      (s.adminTokens ?? []).filter((t): t is [string, number] => Array.isArray(t) && typeof t[0] === 'string' && typeof t[1] === 'number' && t[1] > now),
    )
    this.adminPinHash = typeof s.adminPinHash === 'string' ? s.adminPinHash : ''
    this.round = s.round ?? 0
  }

  // ───────────────────────── usuarios ─────────────────────────

  private pub(u: User | undefined): PublicUser | null {
    if (!u) return null
    const base = { id: u.id, alias: u.alias }
    return u.photoV ? { ...base, photo: `/api/fotos/${u.id}.jpg?v=${u.photoV}` } : base
  }

  // ───────────────────────── selfies ─────────────────────────

  /** Marca que el usuario tiene foto nueva (el archivo lo guarda index.ts). */
  setPhoto(u: User): void {
    u.photoV = (u.photoV ?? 0) + 1
    this.onChange()
  }

  /** Quita la foto. Devuelve si tenía. */
  clearPhoto(userId: unknown): boolean {
    const u = typeof userId === 'string' ? this.users.get(userId) : undefined
    if (!u) throw new GameError('Usuario no encontrado')
    const had = !!u.photoV
    u.photoV = 0
    this.onChange()
    return had
  }

  auth(token: unknown): User | undefined {
    if (typeof token !== 'string') return undefined
    const uid = this.tokens.get(token)
    const u = uid ? this.users.get(uid) : undefined
    if (u && this.bannedDevices.has(u.deviceId)) return undefined
    return u
  }

  isBannedDevice(deviceId: string): boolean {
    return this.bannedDevices.has(deviceId)
  }

  private makeCode(): string {
    return String(randomInt(1000, 10000))
  }

  get code(): string {
    return this.nightCode
  }

  /** La dueña cambia el código; quien ya está dentro no se entera ni se ve afectado. */
  newCode(): string {
    this.nightCode = this.makeCode()
    this.onChange()
    return this.nightCode
  }

  join(aliasRaw: unknown, deviceIdRaw: unknown, codeRaw?: unknown): { token: string; user: PublicUser } {
    if (!this.open) throw new GameError('La Barmacia está cerrada ahora mismo', 'CLOSED')
    const deviceId = typeof deviceIdRaw === 'string' ? deviceIdRaw.slice(0, 64) : ''
    if (deviceId && this.bannedDevices.has(deviceId)) throw new GameError('No puedes jugar esta noche', 'BANNED')
    // Quien ya entró esta noche con este móvil vuelve sin código; los demás lo necesitan
    const known = !!deviceId && [...this.users.values()].some((u) => u.deviceId === deviceId)
    if (!known && !safeEqual(String(codeRaw ?? '').trim(), this.nightCode)) {
      throw new GameError('Ese código no es. Pídelo en la barra', 'BAD_CODE')
    }
    const alias = String(aliasRaw ?? '')
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (alias.length < 2 || alias.length > 16) throw new GameError('El alias debe tener entre 2 y 16 caracteres')
    const taken = [...this.users.values()].some(
      (u) => u.alias.toLowerCase() === alias.toLowerCase() && u.deviceId !== deviceId,
    )
    if (taken) throw new GameError('Ese alias ya está pillado esta noche', 'ALIAS_TAKEN')

    // Mismo móvil que vuelve a entrar → se recupera su usuario
    const existing = deviceId ? [...this.users.values()].find((u) => u.deviceId === deviceId) : undefined
    if (existing) {
      existing.alias = alias
      this.onChange()
      return { token: existing.token, user: this.pub(existing)! }
    }
    if (this.users.size >= MAX_USERS) throw new GameError('El bar está lleno ahora mismo. Prueba en un rato', 'FULL')
    const user: User = {
      id: id(6),
      token: id(24),
      deviceId: deviceId || id(8),
      alias,
      joinedAt: Date.now(),
      requestTimes: [],
      lastPlayedAt: 0,
      teamId: null,
    }
    this.users.set(user.id, user)
    this.tokens.set(user.token, user.id)
    this.onChange()
    return { token: user.token, user: this.pub(user)! }
  }

  // ───────────────────────── ranking ─────────────────────────

  private waiting(): Req[] {
    return [...this.requests.values()]
      .filter((r) => r.status === 'waiting')
      .sort((a, b) => b.points - a.points || a.createdAt - b.createdAt)
  }

  private lockedQueue(): Req[] {
    return [...this.requests.values()].filter((r) => r.status === 'locked').sort((a, b) => a.lockedRound - b.lockedRound)
  }

  private toPublic(r: Req): SongRequest {
    return {
      id: r.id,
      track: r.track,
      by: this.pub(this.users.get(r.userId)) ?? { id: '?', alias: 'Alguien' },
      points: r.points,
      supporters: r.supporters.length,
      team: r.supporters
        .filter((s) => s !== r.userId)
        .slice(-8)
        .map((s) => this.pub(this.users.get(s)))
        .filter((u): u is PublicUser => !!u),
      createdAt: r.createdAt,
      status: r.status,
      roundsWaiting: r.roundsWaiting,
    }
  }

  /** ¿Puede esta canción recibir puntos ahora? (en el duelo solo las dos finalistas) */
  private frozen(r: Req): boolean {
    if (r.status !== 'waiting') return true
    if (this.phase === 'duel' && this.duel) return r.id !== this.duel.aId && r.id !== this.duel.bId
    return false
  }

  private addPoints(r: Req, base: number): number {
    const inDuel = this.phase === 'duel' && this.duel && (r.id === this.duel.aId || r.id === this.duel.bId)
    const pts = Math.round(base * (inDuel ? 2 : 1))
    r.points += pts
    return pts
  }

  private activeRequestOf(u: User): Req | undefined {
    return [...this.requests.values()].find((r) => r.userId === u.id)
  }

  requestSong(u: User, track: TrackInfo): SongRequest {
    if (!this.open) throw new GameError('La Barmacia está cerrada ahora mismo', 'CLOSED')
    const now = Date.now()
    const s = this.settings
    if (this.activeRequestOf(u)) throw new GameError('Ya tienes una canción en el ranking. Espera a que suene.', 'HAS_ACTIVE')
    if (u.lastPlayedAt && now - u.lastPlayedAt < s.cooldownMs) {
      const mins = Math.ceil((s.cooldownMs - (now - u.lastPlayedAt)) / MIN)
      throw new GameError(`Acaba de sonar la tuya. Podrás pedir otra en ${mins} min`, 'COOLDOWN')
    }
    u.requestTimes = u.requestTimes.filter((t) => now - t < HOUR)
    if (u.requestTimes.length >= s.maxPerHour) {
      const mins = Math.ceil((u.requestTimes[0]! + HOUR - now) / MIN)
      throw new GameError(`Máximo ${s.maxPerHour} canciones por hora. Vuelve a probar en ${mins} min`, 'MAX_HOUR')
    }
    if (track.durationMs > s.maxDurationMs) throw new GameError('Esa canción es demasiado larga (máx. 7 min)', 'TOO_LONG')
    if (s.blockExplicit && track.explicit) throw new GameError('Esta noche no se admiten canciones explícitas', 'EXPLICIT')
    const dup = [...this.requests.values()].find((r) => r.track.id === track.id)
    if (dup) throw new GameError('Esa canción ya está en el ranking: ¡apóyala!', `DUPLICATE:${dup.id}`)
    if (this.playback?.track?.id === track.id) throw new GameError('¡Esa canción está sonando ahora mismo!', 'PLAYING')
    const recent = this.history.find((h) => h.track.id === track.id && now - h.playedAt < s.noRepeatMs)
    if (recent) {
      const mins = Math.ceil((recent.playedAt + s.noRepeatMs - now) / MIN)
      throw new GameError(`Esa ya sonó hace poco. Podrá volver a pedirse en ${mins} min`, 'RECENT')
    }

    const r: Req = {
      id: id(6),
      track,
      userId: u.id,
      points: s.basePoints,
      supporters: [u.id],
      createdAt: now,
      status: 'waiting',
      roundsWaiting: 0,
      lockedRound: 0,
    }
    this.leaveTeam(u)
    this.requests.set(r.id, r)
    u.teamId = r.id
    u.requestTimes.push(now)
    this.onChange()
    return this.toPublic(r)
  }

  private leaveTeam(u: User): void {
    if (!u.teamId) return
    const prev = this.requests.get(u.teamId)
    if (prev && prev.userId !== u.id) prev.supporters = prev.supporters.filter((s) => s !== u.id)
    u.teamId = null
  }

  /** Unirse al equipo de una canción. El voto gratis de la ronda va con él. */
  support(u: User, requestId: unknown): { points: number; message: string } {
    const r = typeof requestId === 'string' ? this.requests.get(requestId) : undefined
    if (!r) throw new GameError('Esa canción ya no está en el ranking')
    const own = this.activeRequestOf(u)
    if (own && own.id !== r.id) throw new GameError('Tu equipo es tu canción: no puedes cambiarte mientras esté en el ranking')
    if (u.teamId !== r.id) {
      this.leaveTeam(u)
      u.teamId = r.id
      if (!r.supporters.includes(u.id)) r.supporters.push(u.id)
    }
    let points = 0
    let message = `Te has unido al equipo de «${r.track.title}»`
    if (!this.voted.has(u.id)) {
      if (this.frozen(r)) {
        message = this.phase === 'duel' ? '¡Duelo final! Solo suman las dos finalistas' : 'Esta canción ya no admite votos'
      } else {
        points = this.addPoints(r, this.settings.votePoints)
        this.voted.add(u.id)
        message = `+${points} para «${r.track.title}»`
      }
    }
    this.onChange()
    return { points, message }
  }

  // ───────────────────────── minijuegos ─────────────────────────

  /** Orden aleatorio de los juegos que caben en el VS (con su cuenta atrás). */
  private duelGames(): GameId[] {
    const fit = GAME_IDS.filter((g) => GAME_COUNTDOWN_MS + GAME_DURATION[g] <= this.settings.duelWindowMs)
    for (let i = fit.length - 1; i > 0; i--) {
      const j = randomInt(i + 1)
      ;[fit[i], fit[j]] = [fit[j]!, fit[i]!]
    }
    return fit
  }

  /** ¿Juega este usuario en el VS (su equipo es una de las dos finalistas)? */
  inDuel(u: User): boolean {
    return this.phase === 'duel' && !!this.duel && !!u.teamId && (u.teamId === this.duel.aId || u.teamId === this.duel.bId)
  }

  energyLeft(u: User): number {
    return Math.max(0, this.settings.energyPerRound - (this.energyUsed.get(u.id) ?? 0))
  }

  /** Las canciones de esta noche (ranking, cola y lo que ha sonado): salen antes en la carátula pixelada. */
  tracksTonight(): TrackInfo[] {
    return [
      ...[...this.requests.values()].map((r) => r.track),
      ...this.history.map((h) => h.track),
      ...(this.playback?.track ? [this.playback.track] : []),
    ]
  }

  /** `pool`: canciones de reserva para montar las preguntas (solo en carátula y trivia). */
  startGame(u: User, game: unknown, pool: TrackInfo[] = [], albums: AlbumInfo[] = []): GameSession {
    const duel = this.inDuel(u)
    if (!duel && !GAME_IDS.includes(game as GameId)) throw new GameError('Juego desconocido')
    const r = u.teamId ? this.requests.get(u.teamId) : undefined
    if (!r) throw new GameError('Primero pide una canción o únete a un equipo', 'NO_TEAM')
    if (this.frozen(r)) {
      throw new GameError(
        this.phase === 'duel' ? '¡Duelo final! Únete a una de las dos finalistas para jugar' : 'Tu canción ya no admite puntos',
        'FROZEN',
      )
    }
    if (!duel && this.energyLeft(u) <= 0) throw new GameError('Sin energía: se recarga con la siguiente canción', 'NO_ENERGY')

    const buildQuiz = (g: GameId): BuiltRound[] | null | undefined => {
      if (g === 'cover') return buildCoverQuiz(albums)
      if (g === 'trivia') return buildTriviaQuiz(poolEntries([...this.tracksTonight(), ...pool]))
      return undefined
    }

    let g: GameId
    let quiz: BuiltRound[] | undefined
    if (duel) {
      // VS: el siguiente de la lista sorpresa. Si es de preguntas y no hay datos, se pasa al siguiente
      // (los datos son los mismos para todos, así que los dos equipos saltan igual)
      const games = this.duel!.games
      if (!games.length) throw new GameError('El VS es demasiado corto para jugar', 'NO_TIME')
      let k = this.duelPlays.get(u.id) ?? 0
      let picked: { g: GameId; quiz: BuiltRound[] | undefined } | null = null
      for (let tries = 0; tries < games.length && !picked; tries++, k++) {
        const cand = games[k % games.length]!
        const built = buildQuiz(cand)
        if (built !== null) picked = { g: cand, quiz: built }
      }
      if (!picked) throw new GameError('Aún no hay datos suficientes para jugar', 'NO_POOL')
      g = picked.g
      quiz = picked.quiz
      // Solo se empieza si da tiempo a terminarla antes de que se acabe el VS
      const end = this.lockAt() ?? this.duel!.startsAt + this.settings.duelWindowMs
      if (Date.now() + GAME_COUNTDOWN_MS + GAME_DURATION[g] > end) {
        throw new GameError('No da tiempo a otro juego antes de que acabe el VS', 'NO_TIME')
      }
      // Las partidas del VS no gastan créditos: saltan solas
      this.duelPlays.set(u.id, k)
    } else {
      g = game as GameId
      const built = buildQuiz(g)
      if (built === null) throw new GameError('Aún no hay datos suficientes para este juego. Prueba otro', 'NO_POOL')
      quiz = built
      this.energyUsed.set(u.id, (this.energyUsed.get(u.id) ?? 0) + 1)
    }
    const s: Session = {
      id: id(8),
      userId: u.id,
      game: g,
      requestId: r.id,
      startsAt: Date.now() + GAME_COUNTDOWN_MS,
      durationMs: GAME_DURATION[g],
      quiz,
      answers: quiz ? [] : undefined,
    }
    this.sessions.set(s.id, s)
    this.onChange()
    return {
      sessionId: s.id,
      game: g,
      requestId: r.id,
      startsAt: s.startsAt,
      durationMs: s.durationMs,
      quiz: quiz?.map((q) => q.round),
      duel: duel || undefined,
    }
  }

  /** Contestar una ronda de carátula o trivia. Devuelve cuál era la buena para enseñarla. */
  answerQuiz(u: User, sessionId: unknown, choiceRaw: unknown, msRaw: unknown): { correct: number; right: boolean } {
    const s = typeof sessionId === 'string' ? this.sessions.get(sessionId) : undefined
    if (!s || s.userId !== u.id || !s.quiz || !s.answers) throw new GameError('Partida no encontrada')
    const q = s.quiz[s.answers.length]
    if (!q) throw new GameError('Ya has contestado todo')
    if (Date.now() < s.startsAt) throw new GameError('Aún no ha empezado')
    const n = Number(choiceRaw)
    const choice = Number.isInteger(n) && n >= 0 && n < q.round.options.length ? n : -1
    const now = Date.now()
    // El tiempo que declara el móvil no puede ser mayor que el que ha pasado de verdad desde la pregunta
    // anterior (la pausa de 1,2 s entre preguntas solo juega en contra de quien responde).
    const since = now - (s.lastAnswerAt ?? s.startsAt)
    s.lastAnswerAt = now
    // Fuera de plazo (con margen para la pausa y la red): cuenta como no contestada
    const late = since > q.round.timeMs + 3_500
    // Menos de 250 ms no da ni para leer: se cuenta como 250
    const claimed = Math.max(250, Number(msRaw) || q.round.timeMs)
    const ms = Math.round(Math.min(q.round.timeMs, claimed, Math.max(250, since)))
    s.answers.push({ choice: late ? -1 : choice, ms })
    return { correct: q.correct, right: !late && choice === q.correct }
  }

  finishGame(u: User, sessionId: unknown, scoreRaw: unknown): GameResult {
    const s = typeof sessionId === 'string' ? this.sessions.get(sessionId) : undefined
    if (!s || s.userId !== u.id) throw new GameError('Partida no encontrada')
    this.sessions.delete(s.id)
    const now = Date.now()
    const score = Number(scoreRaw)
    if (!Number.isFinite(score)) throw new GameError('Resultado no válido')
    if (now > s.startsAt + s.durationMs + 15_000) throw new GameError('La partida caducó')

    let base = 0
    let shown = score
    let label = ''
    switch (s.game) {
      case 'tap': {
        // 10 s machacando: más de ~18 toques/s no es humano
        const elapsed = now - s.startsAt
        if (elapsed < s.durationMs - 1_500) throw new GameError('Has terminado demasiado pronto')
        shown = Math.max(0, Math.min(Math.round(score), 180))
        base = shown >= 105 ? 3 : shown >= 70 ? 2 : shown >= 35 ? 1 : 0
        label = `${shown} toques`
        break
      }
      case 'reflex': {
        // Media de 5 reacciones en ms. Por debajo de 120 ms no es humano.
        // Cinco rondas con espera de 1 s como mínimo más las pausas no caben en menos de 8 s.
        if (now - s.startsAt < 8_000) throw new GameError('Has terminado demasiado pronto')
        shown = Math.round(Math.max(120, Math.min(score, 2_000)))
        base = shown <= 240 ? 3 : shown <= 300 ? 2 : shown <= 400 ? 1 : 0
        label = `${shown} ms de media`
        break
      }
      case 'stopwatch': {
        // Error absoluto en ms al parar el crono en 10,00 s
        const elapsed = now - s.startsAt
        if (elapsed < 8_000) throw new GameError('Has terminado demasiado pronto')
        shown = Math.round(Math.max(0, Math.min(Math.abs(score), 10_000)))
        base = shown <= 20 ? 10 : shown <= 60 ? 7 : shown <= 120 ? 5 : shown <= 250 ? 3 : shown <= 500 ? 1 : 0
        label = `a ${(shown / 1000).toFixed(2)} s del 10,00`
        break
      }
      case 'memory': {
        // Tiempo en ms para emparejar las 12 cartas (0 = no terminó)
        const elapsed = now - s.startsAt
        if (score > 0 && elapsed < 5_000) throw new GameError('Has terminado demasiado pronto')
        shown = Math.round(Math.max(0, Math.min(score, s.durationMs)))
        base = shown <= 0 ? 0 : shown <= 18_000 ? 4 : shown <= 25_000 ? 3 : shown <= 32_000 ? 2 : 1
        label = shown > 0 ? `${(shown / 1000).toFixed(1).replace('.', ',')} s` : 'Sin terminar'
        break
      }
      case 'rhythm': {
        // Suma de los 18 círculos: 3 clavado, 2 bien, 1 justo
        const elapsed = now - s.startsAt
        if (elapsed < 11_000) throw new GameError('Has terminado demasiado pronto')
        shown = Math.round(Math.max(0, Math.min(score, 54)))
        base = shown >= 46 ? 5 : shown >= 38 ? 4 : shown >= 30 ? 3 : shown >= 22 ? 2 : shown >= 14 ? 1 : 0
        label = `${shown} de 54 de ritmo`
        break
      }
      case 'cover':
      case 'trivia': {
        const quiz = s.quiz ?? []
        let hits = 0
        for (const [i, a] of (s.answers ?? []).entries()) {
          const q = quiz[i]
          if (!q || a.choice !== q.correct) continue
          hits++
          // Carátula: 2 si la sacas antes de 3 s (aún muy pixelada); trivia: 1 por acierto
          base += s.game === 'cover' ? (a.ms <= 3_000 ? 2 : 1) : 1
        }
        shown = hits
        label = `${hits} de ${quiz.length} acertadas`
        break
      }
    }

    const r = this.requests.get(s.requestId)
    if (!r || r.status !== 'waiting') return { points: 0, score: shown, message: `${label}. Tu canción ya no está en juego` }
    if (base === 0) return { points: 0, score: shown, message: `${label}. ¡Casi! Esta vez no suma` }
    // Tope de puntos de juego por jugador y ronda: aunque alguien reporte marcas perfectas, no se lleva toda la escalera
    const used = this.gamePoints.get(u.id) ?? 0
    const room = Math.max(0, GAME_POINTS_CAP - used)
    const granted = Math.min(base, room)
    if (granted === 0) return { points: 0, score: shown, message: `${label}. Ya has sumado todo lo que se puede jugando esta ronda` }
    this.gamePoints.set(u.id, used + granted)
    const points = this.addPoints(r, granted)
    this.onChange()
    return { points, score: shown, message: `${label} → +${points} para «${r.track.title}»` }
  }

  // ───────────────────────── dosis (consumición) ─────────────────────────

  createDose(): Dose {
    const now = Date.now()
    for (const [k, d] of this.doses) if (d.expiresAt < now - 10 * MIN) this.doses.delete(k)
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 10; i++) code += alphabet[randomInt(alphabet.length)]
    const dose: Dose = { code, points: this.settings.dosePoints, expiresAt: now + 90_000, used: false }
    this.doses.set(code, dose)
    return dose
  }

  doseStatus(code: string): 'pending' | 'used' | 'expired' | 'unknown' {
    const d = this.doses.get(code)
    if (!d) return 'unknown'
    if (d.used) return 'used'
    return d.expiresAt < Date.now() ? 'expired' : 'pending'
  }

  redeemDose(u: User, codeRaw: unknown, requestId: unknown): { points: number; message: string } {
    const code = String(codeRaw ?? '').toUpperCase()
    const d = this.doses.get(code)
    if (!d) throw new GameError('Ese código no existe')
    if (d.used) throw new GameError('Esa dosis ya se ha usado')
    if (d.expiresAt < Date.now()) throw new GameError('Esa dosis ha caducado: pide otra en la barra')
    const r = typeof requestId === 'string' ? this.requests.get(requestId) : undefined
    if (!r || r.status !== 'waiting') throw new GameError('Elige una canción que esté en el ranking')
    if (this.frozen(r)) throw new GameError('¡Duelo final! Solo puedes dársela a una de las dos finalistas')
    d.used = true
    const points = this.addPoints(r, d.points)
    this.onChange()
    return { points, message: `💊 Dosis aplicada: +${points} para «${r.track.title}»` }
  }

  // ───────────────────────── Spotify / rondas ─────────────────────────

  /**
   * Se llama en cada consulta al reproductor. Devuelve la canción que hay que
   * mandar a la cola de Spotify (si toca cerrar votaciones).
   */
  onPlayback(status: SpotifyStatus, pb: Playback | null): Req | null {
    this.spotify = status
    this.playback = pb
    if (!this.open) {
      this.phase = 'idle'
      this.duel = null
      return null
    }
    const track = pb?.track ?? null
    if (track && track.id !== this.lastTrackId) {
      const first = this.lastTrackId === null
      this.lastTrackId = track.id
      if (!first) this.newRound(track)
      else this.markIfLocked(track)
    }
    if (!track || !pb?.isPlaying) {
      this.phase = this.lockedQueue().length && this.phase === 'locked' ? 'locked' : 'idle'
      this.duel = null
      return null
    }
    if (this.phase === 'locked') return null

    const s = this.settings
    const remaining = track.durationMs - pb.progressMs
    const ranking = this.waiting()

    if (remaining <= s.lockBeforeEndMs) {
      if (this.lockAttemptRound === this.round) {
        this.phase = 'locked'
        return null
      }
      this.lockAttemptRound = this.round
      return this.lock(ranking)
    }
    if (remaining <= s.lockBeforeEndMs + s.duelWindowMs && ranking.length >= 2) {
      const stillValid =
        this.duel && this.requests.get(this.duel.aId)?.status === 'waiting' && this.requests.get(this.duel.bId)?.status === 'waiting'
      if (!stillValid) {
        const lockAt = pb.at + remaining - s.lockBeforeEndMs
        this.duel = { aId: ranking[0]!.id, bId: ranking[1]!.id, startsAt: lockAt - s.duelWindowMs, games: this.duelGames() }
        this.duelPlays.clear()
      }
      this.phase = 'duel'
      return null
    }
    this.phase = 'open'
    this.duel = null
    return null
  }

  private lock(ranking: Req[]): Req | null {
    const duelBefore = this.duel
    let winner: Req | undefined
    let loser: Req | undefined
    if (this.duel) {
      const a = this.requests.get(this.duel.aId)
      const b = this.requests.get(this.duel.bId)
      if (a && b) {
        ;[winner, loser] = a.points > b.points || (a.points === b.points && a.createdAt <= b.createdAt) ? [a, b] : [b, a]
      }
    }
    if (!winner) winner = ranking[0]
    this.phase = 'locked'
    this.duel = null
    if (!winner) {
      this.onChange()
      return null
    }
    winner.status = 'locked'
    winner.lockedRound = this.round
    this.lastLock = { winnerId: winner.id, loserId: loser?.id ?? null, loserPoints: loser?.points ?? 0, duel: duelBefore }
    // Conserva parte de sus puntos, pero nunca menos de lo que vale una canción nueva:
    // así una recién llegada no se cuela por delante de la que perdió el duelo
    if (loser) loser.points = Math.max(this.settings.basePoints, Math.ceil(loser.points * this.settings.loserKeepPct))
    // Quien apoyaba a la ganadora queda libre para elegir otro equipo
    this.onChange()
    return winner
  }

  /** Spotify aceptó la canción: se celebra y se libera a su equipo. */
  confirmLock(reqId: string): void {
    const winner = this.requests.get(reqId)
    if (!winner) return
    const loserId = this.lastLock?.winnerId === reqId ? this.lastLock.loserId : null
    const loser = loserId ? this.requests.get(loserId) : undefined
    for (const u of this.users.values()) if (u.teamId === winner.id) u.teamId = null
    this.onDuelResult({ winner: this.toPublic(winner), loser: loser ? this.toPublic(loser) : null })
    this.onChange()
  }

  /**
   * Si Spotify no aceptó la canción en la cola, se deshace el cierre
   * (la perdedora recupera sus puntos) y se reintenta en la siguiente consulta.
   */
  unlock(reqId: string): void {
    const r = this.requests.get(reqId)
    if (!r || r.status !== 'locked') return
    r.status = 'waiting'
    const last = this.lastLock
    if (last?.winnerId === reqId) {
      const loser = last.loserId ? this.requests.get(last.loserId) : undefined
      if (loser) loser.points = last.loserPoints
      this.duel = last.duel
      this.lastLock = null
    }
    this.lockAttemptRound = -1
    this.phase = this.duel ? 'duel' : 'open'
    this.onChange()
  }

  private markIfLocked(track: TrackInfo): boolean {
    const r = this.lockedQueue().find((x) => x.track.id === track.id)
    if (!r) return false
    const u = this.users.get(r.userId)
    if (u) u.lastPlayedAt = Date.now()
    this.history.unshift({ track: r.track, userId: r.userId, by: this.pub(u), playedAt: Date.now() })
    this.requests.delete(r.id)
    for (const x of this.users.values()) if (x.teamId === r.id) x.teamId = null
    return true
  }

  private newRound(track: TrackInfo): void {
    const fromGame = this.markIfLocked(track)
    if (!fromGame) this.history.unshift({ track, userId: null, by: null, playedAt: Date.now() })
    this.history = this.history.slice(0, 60)
    this.round++
    this.voted.clear()
    this.energyUsed.clear()
    this.duelPlays.clear()
    this.gamePoints.clear()
    this.sessions.clear()
    this.phase = 'open'
    this.duel = null

    // Las bloqueadas que llevan 3 rondas sin sonar se perdieron (alguien tocó la cola): vuelven al ranking
    for (const r of this.lockedQueue()) if (this.round - r.lockedRound > 3) r.status = 'waiting'

    for (const r of this.waiting()) {
      r.roundsWaiting++
      r.points += this.settings.waitBonus
      if (r.roundsWaiting > this.settings.expireRounds) {
        this.requests.delete(r.id)
        for (const u of this.users.values()) if (u.teamId === r.id) u.teamId = null
      }
    }
    this.onChange()
  }

  lockAt(): number | null {
    const pb = this.playback
    if (!pb?.track || !pb.isPlaying || !this.open) return null
    return pb.at + (pb.track.durationMs - pb.progressMs) - this.settings.lockBeforeEndMs
  }

  // ───────────────────────── estados públicos ─────────────────────────

  publicState(online: number): PublicState {
    const pb = this.playback
    const current = pb?.track ? this.history.find((h) => h.track.id === pb.track!.id) : undefined
    const locked = this.lockedQueue()[0]
    return {
      open: this.open,
      spotify: this.spotify,
      now: {
        track: pb?.track ?? null,
        progressMs: pb?.progressMs ?? 0,
        isPlaying: pb?.isPlaying ?? false,
        at: pb?.at ?? Date.now(),
        requestedBy: current?.by ?? null,
      },
      phase: this.phase,
      round: this.round,
      ranking: this.waiting().map((r) => this.toPublic(r)),
      locked: locked ? this.toPublic(locked) : null,
      duel: this.duel,
      lockAt: this.lockAt(),
      dosePoints: this.settings.dosePoints,
      online,
      serverTime: Date.now(),
    }
  }

  meState(u: User): MeState {
    const now = Date.now()
    const recent = u.requestTimes.filter((t) => now - t < HOUR)
    let next = u.lastPlayedAt ? u.lastPlayedAt + this.settings.cooldownMs : 0
    if (recent.length >= this.settings.maxPerHour) next = Math.max(next, recent[0]! + HOUR)
    return {
      user: this.pub(u)!,
      activeRequestId: this.activeRequestOf(u)?.id ?? null,
      votedThisRound: this.voted.has(u.id),
      teamId: u.teamId,
      nextRequestAt: next > now ? next : 0,
      requestsLastHour: recent.length,
      energy: this.energyLeft(u),
      maxEnergy: this.settings.energyPerRound,
    }
  }

  userById(uid: string): User | undefined {
    return this.users.get(uid)
  }

  // ───────────────────────── admin ─────────────────────────

  /** Comprueba el PIN (sin pistas de tiempo) y abre una sesión que caduca. Los intentos los frena index.ts. */
  adminLogin(pin: unknown, realPin: string): string {
    if (typeof pin !== 'string' || !safeEqual(pin, realPin)) throw new GameError('PIN incorrecto', 'BAD_PIN')
    const now = Date.now()
    for (const [h, exp] of this.adminTokens) if (exp <= now) this.adminTokens.delete(h)
    const token = id(24)
    this.adminTokens.set(sha256(token), now + ADMIN_SESSION_MS)
    this.onChange()
    return token
  }

  isAdmin(token: unknown): boolean {
    if (typeof token !== 'string') return false
    const h = sha256(token)
    const exp = this.adminTokens.get(h)
    if (exp === undefined) return false
    if (exp <= Date.now()) {
      this.adminTokens.delete(h)
      return false
    }
    return true
  }

  /** «Salir del mando»: la sesión deja de valer también en el servidor. */
  adminLogout(token: unknown): void {
    if (typeof token === 'string' && this.adminTokens.delete(sha256(token))) this.onChange()
  }

  /**
   * Se llama al arrancar con el PIN actual: si ha cambiado desde la última vez,
   * todas las sesiones de la dueña se cierran (una sesión robada no sobrevive al cambio de PIN).
   */
  bindAdminPin(pin: string): void {
    const h = sha256(`barma-pin:${pin}`)
    if (this.adminPinHash !== h) {
      if (this.adminPinHash) this.adminTokens.clear()
      this.adminPinHash = h
    }
  }

  /** Código de un solo uso (60 s) para abrir el enlace de Spotify sin dejar el token en la URL. */
  createLinkCode(): string {
    const now = Date.now()
    for (const [c, exp] of this.linkCodes) if (exp <= now) this.linkCodes.delete(c)
    const code = id(16)
    this.linkCodes.set(code, now + 60_000)
    return code
  }

  consumeLinkCode(code: unknown): boolean {
    if (typeof code !== 'string') return false
    const exp = this.linkCodes.get(code)
    this.linkCodes.delete(code)
    return exp !== undefined && exp > Date.now()
  }

  adminState(onlineIds: Set<string>, account: string | null): AdminState {
    return {
      settings: this.settings,
      users: [...this.users.values()]
        .map((u) => ({
          ...this.pub(u)!,
          joinedAt: u.joinedAt,
          requests: u.requestTimes.length,
          online: onlineIds.has(u.id),
        }))
        .sort((a, b) => Number(b.online) - Number(a.online) || b.joinedAt - a.joinedAt),
      bannedCount: this.bannedDevices.size,
      nightCode: this.nightCode,
      history: this.history.slice(0, 30),
      spotifyAccount: account,
    }
  }

  openNight(): void {
    this.open = true
    this.nightCode = this.makeCode()
    this.lastTrackId = null
    this.phase = 'idle'
    this.onChange()
  }

  /** Cerrar la noche: se borra todo menos los bloqueos y la configuración. */
  closeNight(): void {
    this.open = false
    this.users.clear()
    this.tokens.clear()
    this.requests.clear()
    this.history = []
    this.voted.clear()
    this.energyUsed.clear()
    this.gamePoints.clear()
    this.sessions.clear()
    this.doses.clear()
    this.phase = 'idle'
    this.duel = null
    this.lastTrackId = null
    this.round = 0
    this.onChange()
  }

  removeRequest(reqId: unknown): void {
    const r = typeof reqId === 'string' ? this.requests.get(reqId) : undefined
    if (!r) throw new GameError('Esa canción ya no está')
    this.requests.delete(r.id)
    for (const u of this.users.values()) if (u.teamId === r.id) u.teamId = null
    if (this.duel && (this.duel.aId === r.id || this.duel.bId === r.id)) this.duel = null
    this.onChange()
  }

  ban(userId: unknown): void {
    const u = typeof userId === 'string' ? this.users.get(userId) : undefined
    if (!u) throw new GameError('Usuario no encontrado')
    this.bannedDevices.add(u.deviceId)
    for (const r of [...this.requests.values()]) if (r.userId === u.id && r.status === 'waiting') this.removeRequest(r.id)
    this.leaveTeam(u)
    this.tokens.delete(u.token)
    this.users.delete(u.id)
    this.onChange()
  }

  clearBans(): void {
    this.bannedDevices.clear()
    this.onChange()
  }

  updateSettings(patch: unknown): void {
    if (!patch || typeof patch !== 'object') throw new GameError('Ajustes no válidos')
    const next = { ...this.settings }
    for (const [k, v] of Object.entries(patch)) {
      if (!(k in DEFAULT_SETTINGS)) continue
      const def = DEFAULT_SETTINGS[k as keyof Settings]
      if (typeof def === 'boolean' && typeof v === 'boolean') (next as Record<string, unknown>)[k] = v
      if (typeof def === 'number' && typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        ;(next as Record<string, unknown>)[k] = v
      }
    }
    next.loserKeepPct = Math.min(1, next.loserKeepPct)
    this.settings = next
    this.onChange()
  }
}
