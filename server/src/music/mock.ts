import type { AlbumInfo, TrackInfo } from '../../../shared/types.ts'
import type { MusicProvider, PlaybackResult } from './provider.ts'

/**
 * Simulador de Spotify para desarrollar sin cuenta: canciones cortas (2–3 min),
 * cola real y una "playlist del bar" de reserva.
 */
const CATALOG: [string, string][] = [
  ['Sarandonga', 'Lolita'],
  ['Corazón Contento', 'Marisol'],
  ['Devuélveme a mi chica', 'Hombres G'],
  ['La Flaca', 'Jarabe de Palo'],
  ['Mediterráneo', 'Los Rebeldes'],
  ['Cómo hemos cambiado', 'Presuntos Implicados'],
  ['Bailando', 'Alaska y los Pegamoides'],
  ['Chica de ayer', 'Nacha Pop'],
  ['Princesas', 'Pereza'],
  ['Antes de que cuente diez', 'Fito & Fitipaldis'],
  ['Lucha de gigantes', 'Nacha Pop'],
  ['Ojalá que llueva café', 'Juan Luis Guerra'],
  ['La Bamba', 'Ritchie Valens'],
  ['Despacito', 'Luis Fonsi'],
  ['Mi gran noche', 'Raphael'],
  ['Escuela de calor', 'Radio Futura'],
  ['Vivir así es morir de amor', 'Camilo Sesto'],
  ['Rosas', 'La Oreja de Van Gogh'],
  ['Zapatillas', 'El Canto del Loco'],
  ['Salir', 'Extremoduro'],
  ['Maldito duende', 'Héroes del Silencio'],
  ['Tusa', 'Karol G'],
  ['Quevedo: Bzrp Music Sessions, Vol. 52', 'Bizarrap, Quevedo'],
  ['Mr. Brightside', 'The Killers'],
  ['Bohemian Rhapsody', 'Queen'],
  ['Dancing Queen', 'ABBA'],
  ['Livin’ on a Prayer', 'Bon Jovi'],
  ['Highway to Hell', 'AC/DC'],
  ['Pa’ la cama voy', 'Las Ketchup'],
  ['Aserejé', 'Las Ketchup'],
  ['Paquito el chocolatero', 'Banda'],
  ['Amiga mía', 'Alejandro Sanz'],
  ['Te estoy amando locamente', 'Las Grecas'],
  ['Me quedo contigo', 'Los Chunguitos'],
  ['Volando voy', 'Kiko Veneno'],
  ['Mil horas', 'Los Elegantes'],
  ['Robarte un beso', 'Carlos Vives, Sebastián Yatra'],
  ['Blinding Lights', 'The Weeknd'],
  ['La Macarena', 'Los del Río'],
  ['Nunca debí enamorarme', 'Camela'],
]

function hash(s: string): number {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

function cover(title: string, artist: string): string {
  const h = hash(title + artist)
  const h1 = h % 360
  const h2 = (h1 + 40 + (h % 80)) % 360
  const initials = title
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 85% 55%)"/><stop offset="1" stop-color="hsl(${h2} 80% 22%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="${60 + (h % 180)}" cy="${60 + ((h >> 8) % 180)}" r="${40 + (h % 70)}" fill="white" fill-opacity=".12"/><text x="24" y="270" font-family="Arial Black,Arial" font-weight="900" font-size="96" fill="white" fill-opacity=".92">${initials}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

const TRACKS: TrackInfo[] = CATALOG.map(([title, artist], i) => {
  const id = `mock${String(i).padStart(3, '0')}${hash(title).toString(36)}`
  return {
    id,
    uri: `spotify:track:${id}`,
    title,
    artist,
    album: `${artist} · Grandes éxitos`,
    cover: cover(title, artist),
    durationMs: 120_000 + (hash(artist + title) % 50_000),
    explicit: false,
  }
})

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

export class MockProvider implements MusicProvider {
  readonly kind = 'mock' as const
  private current: TrackInfo = TRACKS[0]!
  private startedAt = Date.now()
  private queue: TrackInfo[] = []
  private fallbackIndex = 0

  isConnected(): boolean {
    return true
  }

  accountName(): string | null {
    return 'Simulador'
  }

  private advance(): void {
    const now = Date.now()
    while (now - this.startedAt >= this.current.durationMs) {
      this.startedAt += this.current.durationMs
      this.fallbackIndex = (this.fallbackIndex + 7) % TRACKS.length
      this.current = this.queue.shift() ?? TRACKS[this.fallbackIndex]!
    }
  }

  async getPlayback(): Promise<PlaybackResult> {
    this.advance()
    return {
      status: 'mock',
      playback: { track: this.current, progressMs: Date.now() - this.startedAt, isPlaying: true, at: Date.now() },
    }
  }

  async search(query: string): Promise<TrackInfo[]> {
    const q = norm(query.trim())
    if (!q) return []
    return TRACKS.filter((t) => norm(`${t.title} ${t.artist}`).includes(q)).slice(0, 10)
  }

  async searchAlbums(name: string, artist: string): Promise<AlbumInfo[]> {
    return [{ name, artist, cover: cover(name, artist) }]
  }

  sampleTracks(): TrackInfo[] {
    return TRACKS
  }

  async getTrack(id: string): Promise<TrackInfo | null> {
    return TRACKS.find((t) => t.id === id) ?? null
  }

  async addToQueue(uri: string): Promise<void> {
    const t = TRACKS.find((x) => x.uri === uri)
    if (!t) throw new Error('Canción desconocida en el simulador')
    this.queue.push(t)
  }

  async skip(): Promise<void> {
    this.startedAt = Date.now() - this.current.durationMs
    this.advance()
  }
}
