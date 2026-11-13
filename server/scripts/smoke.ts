/**
 * Prueba de humo con el simulador: arranca el servidor en un puerto aparte,
 * conecta varios jugadores falsos y recorre una ronda completa
 * (pedir → apoyar → minijuego → dosis → duelo → cierre → suena la ganadora).
 *
 *   node server/scripts/smoke.ts
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { io, type Socket } from 'socket.io-client'
import type { Ack, PublicState, MeState, TrackInfo, SongRequest, GameSession, GameResult } from '../../shared/types.ts'

const PORT = 3999
const URL = `http://127.0.0.1:${PORT}`
const dataDir = mkdtempSync(join(tmpdir(), 'barma-'))
const server = spawn(process.execPath, [join(import.meta.dirname, '../src/index.ts'), '--mock'], {
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, ADMIN_PIN: '9999', WEB_ORIGIN: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stderr.on('data', (d) => {
  const s = String(d)
  if (!s.includes('ExperimentalWarning') && !s.includes('ADMIN_PIN')) process.stderr.write(`[server] ${s}`)
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let failures = 0
function check(cond: unknown, msg: string): void {
  console.log(`${cond ? '✅' : '❌'} ${msg}`)
  if (!cond) failures++
}

interface Client {
  socket: Socket
  state: PublicState | null
  me: MeState | null
  expired: boolean
  emit<T>(ev: string, p?: object): Promise<Ack<T>>
}

function client(auth: object = {}): Client {
  const socket = io(URL, { auth, transports: ['websocket'] })
  const c: Client = {
    socket,
    state: null,
    me: null,
    expired: false,
    emit: (ev, p = {}) => new Promise((res) => socket.emit(ev, p, res)),
  }
  socket.on('state', (s: PublicState) => (c.state = s))
  socket.on('me', (m: MeState) => (c.me = m))
  socket.on('session:expired', () => {
    c.me = null
    c.expired = true
  })
  return c
}

async function ok<T>(p: Promise<Ack<T>>, label: string): Promise<T> {
  const r = await p
  check(r.ok, `${label}${r.ok ? '' : ` → ${r.error}`}`)
  if (!r.ok) throw new Error(label)
  return r.data
}

async function waitFor(cond: () => boolean, ms = 15_000): Promise<boolean> {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (cond()) return true
    await sleep(100)
  }
  return false
}

async function main() {
  // Espera a que el servidor responda
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${URL}/api/health`)).ok) break
    } catch {}
    await sleep(200)
  }

  const boss = client()
  const bad = await boss.emit('admin:login', { pin: '0000' })
  check(!bad.ok, 'PIN incorrecto rechazado')
  const { token: adminToken } = await ok<{ token: string }>(boss.emit('admin:login', { pin: '9999' }), 'La dueña entra con su PIN')

  const ana = client({ deviceId: 'dev-ana' })
  const bea = client({ deviceId: 'dev-bea' })
  const carlos = client({ deviceId: 'dev-carlos' })
  await sleep(300)

  await ok(ana.emit('join', { alias: 'Ana', emoji: '🦊' }), 'Ana entra')
  await ok(bea.emit('join', { alias: 'Bea', emoji: '🐸' }), 'Bea entra')
  await ok(carlos.emit('join', { alias: 'Carlos', emoji: '🐙' }), 'Carlos entra')
  const dupAlias = await client({ deviceId: 'otro' }).emit('join', { alias: 'ana', emoji: '🐙' })
  check(!dupAlias.ok, 'Alias repetido rechazado')

  const r1 = await ok<TrackInfo[]>(ana.emit('search', { q: 'hombres' }), 'Ana busca "hombres"')
  check(r1.length > 0 && r1[0]!.artist === 'Hombres G', `Encuentra: ${r1[0]?.title}`)
  await sleep(450)
  const r2 = await ok<TrackInfo[]>(bea.emit('search', { q: 'ketchup' }), 'Bea busca "ketchup"')

  const reqA = await ok<SongRequest>(ana.emit('request', { trackId: r1[0]!.id }), 'Ana pide su canción')
  const twice = await ana.emit('request', { trackId: r2[0]!.id })
  check(!twice.ok, `Segunda petición de Ana rechazada (${!twice.ok && twice.error})`)
  const reqB = await ok<SongRequest>(bea.emit('request', { trackId: r2[0]!.id }), 'Bea pide su canción')
  const dup = await carlos.emit('request', { trackId: r2[0]!.id })
  check(!dup.ok && dup.code?.startsWith('DUPLICATE'), 'Carlos no puede pedir la misma: se le invita a apoyarla')

  await ok(carlos.emit('support', { requestId: reqB.id }), 'Carlos se une al equipo de Bea (+1)')
  const again = await ok<{ points: number }>(carlos.emit('support', { requestId: reqB.id }), 'Carlos vuelve a apoyar')
  check(again.points === 0, 'Solo 1 voto gratis por ronda')

  // Minijuego: machacar botón
  const s = await ok<GameSession>(carlos.emit('game:start', { game: 'tap' }), 'Carlos empieza "Machaca el botón"')
  await sleep(s.startsAt + s.durationMs - Date.now() + 50)
  const g = await ok<GameResult>(carlos.emit('game:finish', { sessionId: s.sessionId, score: 110 }), 'Carlos termina')
  check(g.points === 3, `110 toques → ${g.points} puntos (${g.message})`)
  const cheat = await ok<GameSession>(carlos.emit('game:start', { game: 'tap' }), 'Carlos empieza otra')
  const early = await carlos.emit('game:finish', { sessionId: cheat.sessionId, score: 500 })
  check(!early.ok, 'Terminar antes de tiempo se rechaza (anti-trampas)')

  // Juegos de acertar: las preguntas vienen del servidor y él sabe la buena
  const cov = await ok<GameSession>(bea.emit('game:start', { game: 'cover' }), 'Bea empieza "Carátula"')
  check(cov.quiz?.length === 3 && cov.quiz.every((q) => !!q.cover && q.options.length === 4), 'Carátula: 3 rondas con carátula y 4 opciones')
  check(!JSON.stringify(cov).includes('correct'), 'La respuesta buena no viaja al móvil')
  const soon = await bea.emit('game:answer', { sessionId: cov.sessionId, choice: 0, ms: 900 })
  check(!soon.ok, 'No se puede contestar durante la cuenta atrás')
  await sleep(cov.startsAt - Date.now() + 50)
  for (const _ of cov.quiz!) {
    const a = await ok<{ correct: number; right: boolean }>(
      bea.emit('game:answer', { sessionId: cov.sessionId, choice: -1, ms: 7000 }),
      'Bea deja correr el tiempo',
    )
    check(a.correct >= 0 && a.correct < 4 && !a.right, `El servidor enseña la buena (${a.correct})`)
  }
  const extra = await bea.emit('game:answer', { sessionId: cov.sessionId, choice: 0, ms: 900 })
  check(!extra.ok, 'No se puede contestar más rondas de las que hay')
  const covEnd = await ok<GameResult>(bea.emit('game:finish', { sessionId: cov.sessionId, score: 99 }), 'Bea termina la carátula')
  check(covEnd.points === 0 && covEnd.score === 0, `Sin aciertos no suma, aunque el móvil mande 99 (${covEnd.message})`)

  const triv = await ok<GameSession>(bea.emit('game:start', { game: 'trivia' }), 'Bea empieza "Trivia"')
  check(triv.quiz?.length === 5 && triv.quiz.every((q) => !q.cover && q.options.length === 4), 'Trivia: 5 preguntas de 4 opciones')
  const mem = await ok<GameSession>(bea.emit('game:start', { game: 'memory' }), 'Bea empieza "Memoria"')
  const memCheat = await bea.emit('game:finish', { sessionId: mem.sessionId, score: 1000 })
  check(!memCheat.ok, 'Memoria terminada en 1 s se rechaza (anti-trampas)')

  // Selfie: un JPEG pequeño de verdad (cabecera FF D8 FF)
  const beaId = bea.me!.user.id
  const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString('base64')}`
  const notJpeg = await bea.emit('photo:set', { data: 'data:image/jpeg;base64,aGVsbG8=' })
  check(!notJpeg.ok, 'Una foto que no es JPEG se rechaza')
  const withPhoto = await ok<{ photo?: string }>(bea.emit('photo:set', { data: jpeg }), 'Bea se hace un selfie')
  check(!!withPhoto.photo && (await fetch(`${URL}${withPhoto.photo}`)).ok, 'La foto se puede ver')
  check(
    await waitFor(() => !!ana.state?.ranking.find((r) => r.id === reqB.id)?.by.photo),
    'Su canción sale con su cara en el ranking',
  )
  await ok(boss.emit('admin:photo', { adminToken, userId: beaId }), 'La dueña quita la foto de Bea')
  check(await waitFor(() => !ana.state?.ranking.find((r) => r.id === reqB.id)?.by.photo), 'Bea vuelve a salir con su emoji')
  await sleep(3_100)
  await ok(bea.emit('photo:set', { data: jpeg }), 'Bea se hace otro (se borrará al cerrar)')

  // Dosis de la barra
  const dose = await ok<{ code: string; points: number }>(boss.emit('admin:dose', { adminToken }), 'La dueña genera una dosis')
  await ok(ana.emit('dose:redeem', { code: dose.code, requestId: reqA.id }), 'Ana canjea la dosis para su canción')
  const reuse = await bea.emit('dose:redeem', { code: dose.code, requestId: reqB.id })
  check(!reuse.ok, 'La dosis no se puede reutilizar')

  await sleep(300)
  const ranking = ana.state!.ranking
  console.log('   Ranking:', ranking.map((r) => `${r.track.title} (${r.points})`).join(' · '))
  check(ranking[0]!.id === reqA.id, 'Ana va primera gracias a la dosis')
  check(ranking.find((r) => r.id === reqB.id)!.supporters === 2, 'El equipo de Bea tiene 2 miembros')
  check(carlos.me?.energy === 1, `Carlos tiene ${carlos.me?.energy} de energía (gastó 2 de 3)`)

  // Forzar el duelo: lo que queda de canción ≈ lock + 6 s, ventana de duelo 30 s
  const st = ana.state!
  const remaining = st.now.track!.durationMs - st.now.progressMs - (Date.now() - st.now.at)
  await ok(
    boss.emit('admin:settings', { adminToken, settings: { lockBeforeEndMs: Math.max(1000, remaining - 6000), duelWindowMs: 30_000 } }),
    'Ajustes de prueba: duelo ya y cierre en ~6 s',
  )
  check(await waitFor(() => ana.state?.phase === 'duel'), 'Empieza el DUELO')
  const d = ana.state!.duel!
  check(d.aId === reqA.id && d.bId === reqB.id, 'Duelo: Ana VS Bea')

  // Bea remonta en el duelo con puntos x2
  const before = ana.state!.ranking.find((r) => r.id === reqB.id)!.points
  const sup = await ok<{ points: number }>(bea.emit('support', { requestId: reqB.id }), 'Bea vota en el duelo')
  check(sup.points === 2, `Voto en duelo vale x2 (+${sup.points})`)
  await sleep(200)
  check(ana.state!.ranking.find((r) => r.id === reqB.id)!.points === before + 2, 'Puntos actualizados en tiempo real')

  let result: { winner: SongRequest; loser: SongRequest | null } | null = null
  ana.socket.on('duel:result', (r) => (result = r))
  check(await waitFor(() => ana.state?.phase === 'locked'), 'Votaciones cerradas')
  check(await waitFor(() => !!result), 'Llega el resultado del duelo')
  const res = result as unknown as { winner: SongRequest; loser: SongRequest | null }
  check(res.winner.id === reqA.id, `Gana: ${res.winner.track.title}`)
  check(
    res.loser?.points === Math.max(10, Math.ceil((before + 2) * 0.5)),
    `La perdedora conserva el 50 %, pero nunca menos que una canción nueva (${res.loser?.points}, antes ${before + 2})`,
  )
  check(ana.state!.locked?.id === reqA.id, 'La ganadora aparece como "siguiente"')

  // Saltamos para que suene ya
  await ok(boss.emit('admin:skip', { adminToken }), 'La dueña salta la canción')
  check(await waitFor(() => ana.state?.now.track?.id === r1[0]!.id), `Suena la de Ana: ${ana.state?.now.track?.title}`)
  check(ana.state!.now.requestedBy?.alias === 'Ana', 'Se muestra quién la pidió')
  check(await waitFor(() => ana.me?.activeRequestId === null && ana.me.nextRequestAt > 0), 'Ana entra en espera de 15 min')
  check(carlos.me?.energy === 3, 'La energía se recarga con la nueva canción')
  const again2 = await ana.emit('request', { trackId: r2[0]!.id })
  check(!again2.ok, `Ana no puede pedir aún (${!again2.ok && again2.error})`)

  // Bloqueo y cierre de la noche
  const users = await new Promise<{ users: { id: string; alias: string }[] }>((r) => boss.socket.once('admin:state', r))
  const carlosId = users.users.find((u) => u.alias === 'Carlos')!.id
  let kicked = false
  carlos.socket.on('session:expired', () => (kicked = true))
  await ok(boss.emit('admin:ban', { adminToken, userId: carlosId }), 'La dueña bloquea a Carlos')
  check(await waitFor(() => kicked, 3000), 'A Carlos le cierra la sesión')
  const back = await carlos.emit('join', { alias: 'Carlitos', emoji: '🐙' })
  check(!back.ok, 'Carlos no puede volver a entrar con otro alias')

  await ok(boss.emit('admin:night', { adminToken, open: false }), 'La dueña cierra la noche')
  check(await waitFor(() => ana.state?.open === false && ana.state.ranking.length === 0), 'Todo borrado y bar cerrado')
  const late = await client({ deviceId: 'x' }).emit('join', { alias: 'Tarde', emoji: '🌙' })
  check(!late.ok, 'Con el bar cerrado no se puede entrar')
  check(await waitFor(() => ana.expired && bea.expired && carlos.me === null), 'Al cerrar, cada móvil pierde su usuario')
  check(!(await fetch(`${URL}/api/fotos/${beaId}.jpg`)).ok, 'Al cerrar, los selfies se borran')
  await ok(boss.emit('admin:night', { adminToken, open: true }), 'La dueña reabre la noche enseguida')
  const stale = await ana.emit('search', { q: 'hombres' })
  check(!stale.ok && stale.code === 'NO_SESSION', 'Ana tiene que volver a poner alias para jugar')
  await ok(ana.emit('join', { alias: 'Ana', emoji: '🎸' }), 'Ana entra de nuevo con alias (el de anoche está libre)')
}

main()
  .catch((e) => {
    console.error('💥', e)
    failures++
  })
  .finally(() => {
    server.kill()
    rmSync(dataDir, { recursive: true, force: true })
    console.log(failures ? `\n${failures} fallo(s)` : '\nTodo OK')
    process.exit(failures ? 1 : 0)
  })
