/**
 * Prueba de los juegos sorpresa del VS, directamente sobre el motor (sin servidor):
 * los dos equipos juegan al mismo juego y en el mismo orden, sin gastar créditos,
 * y no empieza un juego que no da tiempo a terminar.
 */
import { Engine } from '../src/engine.ts'

let failures = 0
const check = (cond: unknown, msg: string) => {
  console.log(`${cond ? '✅' : '❌'} ${msg}`)
  if (!cond) failures++
}
const track = (id: string, durationMs = 200_000) => ({ id, title: id, artist: 'x', album: 'x', cover: '', durationMs, explicit: false, uri: `spotify:track:${id}` })

const e = new Engine()
e.openNight()
const code = e.code
const ana = e.join('Ana', 'd-ana', code)
const bea = e.join('Bea', 'd-bea', code)
const uA = e.auth(ana.token)!
const uB = e.auth(bea.token)!
const now = Date.now()
// Suena una canción, y en la ronda siguiente entran las dos peticiones
e.onPlayback('ok', { track: track('t0'), progressMs: 0, isPlaying: true, at: now })
const ra = e.requestSong(uA, track('a') as never)
const rb = e.requestSong(uB, track('b') as never)

// VS de 60 s que acaba de empezar (cierre a 20 s del final)
e.updateSettings({ duelWindowMs: 60_000, lockBeforeEndMs: 20_000 })
const dur = 200_000
e.onPlayback('ok', { track: track('t0'), progressMs: dur - 20_000 - 59_000, isPlaying: true, at: Date.now() })
check(e.phase === 'duel', 'Empieza el VS')
const games = e.duel!.games
check(games.length > 0, `El VS tiene juegos sorpresa: ${games.join(', ')}`)

const energyA = e.energyLeft(uA)
const sA = e.startGame(uA, 'trivia', [], [{ id: 'x', name: 'x', artist: 'y', cover: '' }] as never)
const sB = e.startGame(uB, 'tap', [], [{ id: 'x', name: 'x', artist: 'y', cover: '' }] as never)
// Sin datos para preguntas (prueba sin Spotify), Carátula y Trivia se saltan igual para los dos
const playable = games.filter((g) => g !== 'cover' && g !== 'trivia')
check(sA.game === sB.game && sA.game === playable[0], `Los dos equipos juegan al mismo: ${sA.game} / ${sB.game}`)
const sA2 = e.startGame(uA, 'memory')
const sB2 = e.startGame(uB, 'reflex')
check(sA2.game === sB2.game && sA2.game === playable[1], `El siguiente también es el mismo para los dos: ${sA2.game} / ${sB2.game}`)
check(sA.duel === true, 'La partida va marcada como del VS')
check(e.energyLeft(uA) === energyA, 'Las partidas del VS no gastan créditos')
check(sA.requestId === ra.id && sB.requestId === rb.id, 'Cada uno juega para su canción')

// A falta de 10 s ya no da tiempo a ningún juego
e.onPlayback('ok', { track: track('t0'), progressMs: dur - 20_000 - 10_000, isPlaying: true, at: Date.now() })
let noTime = ''
try {
  e.startGame(uA, 'tap')
} catch (err) {
  noTime = (err as { code: string }).code
}
check(noTime === 'NO_TIME', 'Si no da tiempo a terminarlo, no empieza otro juego')

if (failures) {
  console.log(`\n${failures} fallos`)
  process.exit(1)
}
console.log('\nJuegos del VS OK')
