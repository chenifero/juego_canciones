import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import { Server, type Socket } from 'socket.io'
import type { Ack, TrackInfo } from '../../shared/types.ts'
import { config } from './config.ts'
import { Engine, GameError, type EngineSnapshot } from './engine.ts'
import { MockProvider } from './music/mock.ts'
import type { MusicProvider } from './music/provider.ts'
import { SpotifyProvider } from './music/spotify.ts'
import { PHOTO_DIR, deleteAllPhotos, deletePhoto, savePhoto } from './photos.ts'
import { MIN_ARTISTS, SEED_QUERIES, distinctArtists, poolEntries } from './quiz.ts'
import { debounced, readJson, writeJson } from './store.ts'

// ───────────────────────── motor + reproductor ─────────────────────────

const music: MusicProvider = config.mock ? new MockProvider() : new SpotifyProvider()
const spotify = music instanceof SpotifyProvider ? music : null
const engine = new Engine()
const STATE_FILE = 'state.json'

const saved = readJson<EngineSnapshot>(STATE_FILE)
if (saved) engine.restore(saved)
if (config.mock && !engine.open) engine.openNight() // en el simulador la noche arranca abierta

const persist = debounced(() => writeJson(STATE_FILE, engine.snapshot()), 1_000)

/** Errores recientes de Spotify para enseñárselos a la dueña. */
let lastMusicError: { message: string; at: number } | null = null

// ───────────────────────── HTTP ─────────────────────────

const app = express()
app.disable('x-powered-by')

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mock: config.mock, spotify: music.isConnected(), open: engine.open })
})

/** La dueña pulsa "Conectar Spotify" en su panel → aquí → Spotify. */
app.get('/auth/login', (req, res) => {
  if (!spotify) return res.status(400).send('Estás en modo simulador (MOCK_SPOTIFY=1)')
  if (!engine.isAdmin(req.query.admin)) return res.status(403).send('Solo desde el panel de la dueña')
  if (!config.spotify.clientId) return res.status(500).send('Falta SPOTIFY_CLIENT_ID en .env')
  res.redirect(spotify.authorizeUrl())
})

/** Vuelta desde Spotify (debe coincidir con la Redirect URI de la app). */
app.get('/callback', async (req, res) => {
  const back = `${config.webOrigin}/admin`
  if (!spotify) return res.redirect(back)
  const { code, state, error } = req.query as Record<string, string | undefined>
  if (error || !code || !state) return res.redirect(`${back}?spotify=${encodeURIComponent(error ?? 'error')}`)
  try {
    await spotify.handleCallback(code, state)
    lastMusicError = null
    void tick()
    res.redirect(`${back}?spotify=ok`)
  } catch (err) {
    console.error('Callback de Spotify:', err)
    res.redirect(`${back}?spotify=${encodeURIComponent((err as Error).message)}`)
  }
})

// Selfies de la noche (la URL lleva versión, así que se pueden cachear)
app.use('/api/fotos', express.static(PHOTO_DIR, { maxAge: '1d' }), (_req, res) => void res.status(404).end())

// En producción el servidor sirve también la web compilada
if (existsSync(config.webDist)) {
  app.use(express.static(config.webDist, { index: false, maxAge: '1h' }))
  app.get(/^\/(?!api|auth|callback|socket\.io).*/, (_req, res) => {
    res.sendFile(join(config.webDist, 'index.html'))
  })
}

const http = createServer(app)
const io = new Server(http, {
  cors: config.webOrigin ? { origin: config.webOrigin } : undefined,
  pingInterval: 20_000,
  pingTimeout: 25_000,
})

// ───────────────────────── difusión de estado ─────────────────────────

function onlineUserIds(): Set<string> {
  const ids = new Set<string>()
  for (const s of io.sockets.sockets.values()) if (s.data.userId) ids.add(s.data.userId as string)
  return ids
}

let broadcastTimer: NodeJS.Timeout | null = null
function broadcast(): void {
  if (broadcastTimer) return
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    const online = onlineUserIds()
    io.emit('state', engine.publicState(online.size))
    for (const uid of online) {
      const u = engine.userById(uid)
      if (u) io.to(`user:${uid}`).emit('me', engine.meState(u))
    }
    if (io.sockets.adapter.rooms.get('admin')?.size) {
      io.to('admin').emit('admin:state', {
        ...engine.adminState(online, music.accountName()),
        musicError: lastMusicError,
        mock: config.mock,
        spotifyConfigured: config.mock || !!config.spotify.clientId,
      })
    }
  }, 60)
}

engine.onChange = () => {
  persist()
  broadcast()
}
engine.onDuelResult = (r) => io.emit('duel:result', r)

// ───────────────────────── bucle del reproductor ─────────────────────────

let ticking = false
async function tick(): Promise<void> {
  if (ticking) return
  ticking = true
  try {
    let result
    try {
      result = await music.getPlayback()
    } catch (err) {
      lastMusicError = { message: (err as Error).message, at: Date.now() }
      result = { status: 'error' as const, playback: null }
    }
    const toQueue = engine.onPlayback(result.status, result.playback)
    if (toQueue) {
      try {
        await music.addToQueue(toQueue.track.uri)
        engine.confirmLock(toQueue.id)
        console.log(`🎶 A la cola: ${toQueue.track.title} — ${toQueue.track.artist}`)
      } catch (err) {
        lastMusicError = { message: `No se pudo añadir a la cola: ${(err as Error).message}`, at: Date.now() }
        console.error(lastMusicError.message)
        engine.unlock(toQueue.id)
      }
    }
    broadcast()
  } finally {
    ticking = false
  }
}

function loop(): void {
  const lockAt = engine.lockAt()
  const soon = lockAt !== null && lockAt - Date.now() < 12_000
  void tick().finally(() => setTimeout(loop, soon ? 1_000 : 2_500))
}

// ───────────────────────── sockets ─────────────────────────

type Handler<T> = (payload: Record<string, unknown>) => T | Promise<T>

/** Envuelve un handler para devolver siempre { ok, data | error } por el ack. */
function on<T>(socket: Socket, event: string, handler: Handler<T>): void {
  socket.on(event, async (payload: unknown, ack?: (r: Ack<T>) => void) => {
    const reply = typeof ack === 'function' ? ack : () => {}
    try {
      const data = await handler((payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>)
      reply({ ok: true, data })
    } catch (err) {
      if (err instanceof GameError) reply({ ok: false, error: err.message, code: err.code })
      else {
        console.error(`Error en ${event}:`, err)
        reply({ ok: false, error: (err as Error).message || 'Algo ha fallado' })
      }
    }
  })
}

/** Caché de resultados de búsqueda: al pedir, el cliente solo manda el id. */
const trackCache = new Map<string, { track: TrackInfo; at: number }>()
function cacheTracks(tracks: TrackInfo[]): void {
  const now = Date.now()
  for (const t of tracks) trackCache.set(t.id, { track: t, at: now })
  if (trackCache.size > 2_000) for (const [k, v] of trackCache) if (now - v.at > 30 * 60_000) trackCache.delete(k)
}

/**
 * Bote de canciones para la carátula pixelada y la trivia: lo que se ha buscado esta noche
 * y, si aún hay poco, unas búsquedas de reserva (se hacen una vez y se guardan 1 h).
 */
let seedTracks: TrackInfo[] = []
let seedAt = 0
let seeding: Promise<void> | null = null
function quizPool(): TrackInfo[] {
  return [...[...trackCache.values()].map((v) => v.track), ...seedTracks, ...(music.sampleTracks?.() ?? [])]
}
async function ensureQuizPool(): Promise<TrackInfo[]> {
  const enough = distinctArtists(poolEntries([...engine.tracksTonight(), ...quizPool()])) >= MIN_ARTISTS * 2
  if (!enough && Date.now() - seedAt > 60 * 60_000) {
    seeding ??= (async () => {
      const found = await Promise.allSettled(SEED_QUERIES.map((q) => music.search(q)))
      const tracks = found.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      if (tracks.length) {
        seedTracks = tracks
        seedAt = Date.now()
      }
    })().finally(() => (seeding = null))
    await seeding
  }
  return quizPool()
}

io.on('connection', (socket) => {
  const auth = socket.handshake.auth as { token?: string; deviceId?: string; adminToken?: string }
  const deviceId = typeof auth.deviceId === 'string' ? auth.deviceId.slice(0, 64) : ''

  const bindUser = (token: unknown) => {
    const u = engine.auth(token)
    if (u) {
      socket.data.userId = u.id
      void socket.join(`user:${u.id}`)
    }
    return u
  }
  bindUser(auth.token)
  if (engine.isAdmin(auth.adminToken)) void socket.join('admin')

  const me = () => {
    const u = socket.data.userId ? engine.userById(socket.data.userId as string) : undefined
    if (!u) throw new GameError('Tu sesión ha caducado: vuelve a entrar', 'NO_SESSION')
    return u
  }
  const admin = (p: Record<string, unknown>) => {
    if (!engine.isAdmin(p.adminToken)) throw new GameError('Sesión de administración caducada', 'NO_ADMIN')
  }

  socket.emit('state', engine.publicState(onlineUserIds().size))
  if (socket.data.userId) socket.emit('me', engine.meState(me()))
  else if (auth.token) socket.emit('session:expired')
  broadcast()

  // ── clientes ──
  on(socket, 'join', (p) => {
    const res = engine.join(p.alias, p.emoji, deviceId)
    bindUser(res.token)
    broadcast()
    return res
  })

  let lastSearch = 0
  on(socket, 'search', async (p) => {
    me()
    const q = String(p.q ?? '').trim().slice(0, 80)
    if (q.length < 2) return []
    const now = Date.now()
    if (now - lastSearch < 400) throw new GameError('Más despacio 🙂', 'RATE')
    lastSearch = now
    const tracks = await music.search(q)
    cacheTracks(tracks)
    return tracks
  })

  on(socket, 'request', async (p) => {
    const u = me()
    const trackId = String(p.trackId ?? '')
    const track = trackCache.get(trackId)?.track ?? (await music.getTrack(trackId))
    if (!track) throw new GameError('No encuentro esa canción')
    return engine.requestSong(u, track)
  })

  on(socket, 'support', (p) => engine.support(me(), p.requestId))
  on(socket, 'game:start', async (p) => {
    const u = me()
    const pool = p.game === 'cover' || p.game === 'trivia' ? await ensureQuizPool() : []
    return engine.startGame(u, p.game, pool)
  })
  on(socket, 'game:answer', (p) => engine.answerQuiz(me(), p.sessionId, p.choice, p.ms))
  on(socket, 'game:finish', (p) => engine.finishGame(me(), p.sessionId, p.score))

  let lastPhoto = 0
  on(socket, 'photo:set', (p) => {
    const u = me()
    if (Date.now() - lastPhoto < 3_000) throw new GameError('Espera un momento antes de cambiarla', 'RATE')
    savePhoto(u.id, p.data)
    lastPhoto = Date.now()
    engine.setPhoto(u)
    return engine.meState(u).user
  })
  on(socket, 'photo:clear', () => {
    const u = me()
    deletePhoto(u.id)
    engine.clearPhoto(u.id)
    return true
  })
  on(socket, 'dose:redeem', (p) => engine.redeemDose(me(), p.code, p.requestId))

  // ── panel de la dueña ──
  on(socket, 'admin:login', (p) => {
    const token = engine.adminLogin(p.pin, config.adminPin)
    void socket.join('admin')
    broadcast()
    return { token }
  })
  on(socket, 'admin:hello', (p) => {
    admin(p)
    void socket.join('admin')
    broadcast()
    return true
  })
  on(socket, 'admin:night', (p) => {
    admin(p)
    if (p.open) engine.openNight()
    else {
      engine.closeNight()
      deleteAllPhotos()
      // Los usuarios se han borrado: cada móvil conectado olvida el suyo y, al reabrir, pide alias nuevo.
      for (const s of io.sockets.sockets.values()) {
        const uid = s.data.userId as string | undefined
        if (!uid) continue
        s.data.userId = undefined
        void s.leave(`user:${uid}`)
        s.emit('session:expired')
      }
    }
    io.emit('night', { open: engine.open })
    void tick()
    return engine.open
  })
  on(socket, 'admin:remove', (p) => {
    admin(p)
    engine.removeRequest(p.requestId)
    return true
  })
  on(socket, 'admin:ban', (p) => {
    admin(p)
    const uid = String(p.userId ?? '')
    engine.ban(uid)
    deletePhoto(uid)
    for (const s of io.sockets.sockets.values()) {
      if (s.data.userId === uid) {
        s.data.userId = undefined
        void s.leave(`user:${uid}`)
        s.emit('session:expired', { banned: true })
      }
    }
    return true
  })
  on(socket, 'admin:photo', (p) => {
    admin(p)
    const uid = String(p.userId ?? '')
    engine.clearPhoto(uid)
    deletePhoto(uid)
    return true
  })
  on(socket, 'admin:clearBans', (p) => {
    admin(p)
    engine.clearBans()
    return true
  })
  on(socket, 'admin:settings', (p) => {
    admin(p)
    engine.updateSettings(p.settings)
    return engine.settings
  })
  on(socket, 'admin:skip', async (p) => {
    admin(p)
    await music.skip()
    setTimeout(() => void tick(), 800)
    return true
  })
  on(socket, 'admin:dose', (p) => {
    admin(p)
    return engine.createDose()
  })
  on(socket, 'admin:doseStatus', (p) => {
    admin(p)
    return engine.doseStatus(String(p.code ?? ''))
  })
  on(socket, 'admin:spotifyLogout', (p) => {
    admin(p)
    spotify?.disconnect()
    void tick()
    return true
  })

  socket.on('disconnect', () => broadcast())
})

http.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`
❌ El puerto ${config.port} ya está en uso: ¿tienes otra copia arrancada (npm run dev y dev:mock a la vez)?
`)
    process.exit(1)
  }
  throw err
})

http.listen(config.port, () => {
  console.log(`\n🧪 BarmaGames escuchando en http://127.0.0.1:${config.port}`)
  console.log(`   Reproductor: ${config.mock ? 'SIMULADOR' : 'Spotify'} · Noche ${engine.open ? 'ABIERTA' : 'cerrada'}\n`)
  loop()
})
