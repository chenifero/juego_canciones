import { randomInt } from 'node:crypto'
import type { QuizRound, TrackInfo } from '../../shared/types.ts'

/** Pregunta lista para el cliente + la respuesta buena (que no sale del servidor). */
export interface BuiltRound {
  round: QuizRound
  correct: number
}

export const COVER_ROUNDS = 3
export const COVER_TIME_MS = 7_000
export const TRIVIA_ROUNDS = 5
export const TRIVIA_TIME_MS = 8_000

/** Lo que hace falta para montar una partida: canciones de artistas distintos. */
export const MIN_ARTISTS = 6

/** «Devuélveme a mi chica - Remasterizado 2007» → «Devuélveme a mi chica». */
export function cleanTitle(title: string): string {
  return title
    .split(' - ')[0]!
    .replace(/\s*[([](feat\.?|ft\.?|with|con|remaster|remastered|remasterizado|live|en directo|versión|version)[^)\]]*[)\]]/gi, '')
    .trim()
}

/** «Bizarrap, Quevedo» → «Bizarrap». */
export function mainArtist(artist: string): string {
  return artist.split(',')[0]!.trim()
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

interface Entry {
  title: string
  artist: string
  cover: string
  key: string
  artistKey: string
}

/** Quita repetidas y canciones con títulos imposibles; deja una por canción. */
export function poolEntries(tracks: TrackInfo[]): Entry[] {
  const seen = new Set<string>()
  const out: Entry[] = []
  for (const t of tracks) {
    const title = cleanTitle(t.title)
    const artist = mainArtist(t.artist)
    if (!title || !artist || title.length > 48) continue
    const key = `${norm(title)}|${norm(artist)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ title, artist, cover: t.cover, key, artistKey: norm(artist) })
  }
  return out
}

export function distinctArtists(entries: Entry[]): number {
  return new Set(entries.map((e) => e.artistKey)).size
}

/** Elige `n` canciones de artistas todos distintos (y distintos de `avoid`). */
function pickDistinct(entries: Entry[], n: number, avoid: Set<string>): Entry[] {
  const out: Entry[] = []
  const used = new Set(avoid)
  for (const e of shuffle(entries)) {
    if (used.has(e.artistKey)) continue
    used.add(e.artistKey)
    out.push(e)
    if (out.length === n) break
  }
  return out
}

/** Pone la buena en una posición al azar entre tres falsas. */
function withOptions(right: Entry, wrong: Entry[], label: (e: Entry) => { title: string; sub?: string }): { options: QuizRound['options']; correct: number } {
  const all = shuffle([right, ...wrong])
  return { options: all.map(label), correct: all.indexOf(right) }
}

/**
 * Carátula pixelada: 3 carátulas, 4 opciones (canción + artista).
 * `preferred` son las de esta noche (ranking, lo que ha sonado): salen antes que las de reserva.
 */
export function buildCoverQuiz(entries: Entry[], preferred: Set<string>): BuiltRound[] | null {
  const withCover = entries.filter((e) => e.cover)
  if (distinctArtists(withCover) < MIN_ARTISTS) return null
  const tonight = shuffle(withCover.filter((e) => preferred.has(e.key)))
  const rest = shuffle(withCover.filter((e) => !preferred.has(e.key)))
  const answers = pickDistinct([...tonight, ...rest].slice(0, 40), COVER_ROUNDS, new Set())
  if (answers.length < COVER_ROUNDS) return null
  return answers.map((right) => {
    const wrong = pickDistinct(withCover, 3, new Set([right.artistKey]))
    const { options, correct } = withOptions(right, wrong, (e) => ({ title: e.title, sub: e.artist }))
    return { round: { prompt: '¿Qué canción es?', cover: right.cover, options, timeMs: COVER_TIME_MS }, correct }
  })
}

/** Trivia: «¿Quién canta…?» y «¿Cuál es de…?», alternando. */
export function buildTriviaQuiz(entries: Entry[]): BuiltRound[] | null {
  if (distinctArtists(entries) < MIN_ARTISTS) return null
  const answers = pickDistinct(entries, TRIVIA_ROUNDS, new Set())
  if (answers.length < TRIVIA_ROUNDS) return null
  return answers.map((right, i) => {
    const wrong = pickDistinct(entries, 3, new Set([right.artistKey]))
    if (i % 2 === 0) {
      const { options, correct } = withOptions(right, wrong, (e) => ({ title: e.artist }))
      return { round: { prompt: `¿Quién canta «${right.title}»?`, options, timeMs: TRIVIA_TIME_MS }, correct }
    }
    const { options, correct } = withOptions(right, wrong, (e) => ({ title: e.title }))
    return { round: { prompt: `¿Cuál es de ${right.artist}?`, options, timeMs: TRIVIA_TIME_MS }, correct }
  })
}

/** Búsquedas de reserva para llenar el bote cuando la noche acaba de empezar. */
export const SEED_QUERIES = [
  'Hombres G',
  'Estopa',
  'El Canto del Loco',
  'La Oreja de Van Gogh',
  'Fito y Fitipaldis',
  'Alejandro Sanz',
  'Mecano',
  'Melendi',
  'Jarabe de Palo',
  'Pereza',
  'Rosalía',
  'Queen',
]
