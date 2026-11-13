import type { AlbumInfo } from '../../shared/types.ts'
import type { MusicProvider } from './music/provider.ts'

/** Álbumes famosos para el juego de las carátulas: [álbum, artista]. Portadas que la gente reconoce. */
export const FAMOUS_ALBUMS: [string, string][] = [
  ['Abbey Road', 'The Beatles'],
  ['Sgt. Pepper\'s Lonely Hearts Club Band', 'The Beatles'],
  ['Thriller', 'Michael Jackson'],
  ['Bad', 'Michael Jackson'],
  ['The Dark Side of the Moon', 'Pink Floyd'],
  ['The Wall', 'Pink Floyd'],
  ['Back in Black', 'AC/DC'],
  ['Rumours', 'Fleetwood Mac'],
  ['Nevermind', 'Nirvana'],
  ['Born in the U.S.A.', 'Bruce Springsteen'],
  ['Hotel California', 'Eagles'],
  ['Appetite for Destruction', 'Guns N\' Roses'],
  ['Purple Rain', 'Prince'],
  ['A Night at the Opera', 'Queen'],
  ['Born to Die', 'Lana Del Rey'],
  ['21', 'Adele'],
  ['1989', 'Taylor Swift'],
  ['Random Access Memories', 'Daft Punk'],
  ['Discovery', 'Daft Punk'],
  ['Back to Black', 'Amy Winehouse'],
  ['The Marshall Mathers LP', 'Eminem'],
  ['Future Nostalgia', 'Dua Lipa'],
  ['Currents', 'Tame Impala'],
  ['AM', 'Arctic Monkeys'],
  ['Parachutes', 'Coldplay'],
  ['OK Computer', 'Radiohead'],
  ['Is This It', 'The Strokes'],
  ['Hybrid Theory', 'Linkin Park'],
  ['Californication', 'Red Hot Chili Peppers'],
  ['American Idiot', 'Green Day'],
  ['After Hours', 'The Weeknd'],
  ['Lemonade', 'Beyoncé'],
  ['Un Verano Sin Ti', 'Bad Bunny'],
  ['Motomami', 'Rosalía'],
  ['El Mal Querer', 'Rosalía'],
  ['Laundry Service', 'Shakira'],
  ['Descanso Dominical', 'Mecano'],
  ['Más', 'Alejandro Sanz'],
  ['Destrangis', 'Estopa'],
  ['Lo que te conté mientras te hacías la dormida', 'La Oreja de Van Gogh'],
  ['Agila', 'Extremoduro'],
  ['Super 8', 'Los Planetas'],
]

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

/** El mejor candidato: mismo álbum (sin ediciones raras) y mismo artista, con portada. */
export function bestAlbum(name: string, artist: string, found: AlbumInfo[]): AlbumInfo | null {
  const n = norm(name)
  const a = norm(artist)
  const ok = found.filter((f) => f.cover && norm(f.artist).includes(a))
  return ok.find((f) => norm(f.name) === n) ?? ok.find((f) => norm(f.name).startsWith(n)) ?? null
}

let cache: AlbumInfo[] = []
let at = 0
let loading: Promise<void> | null = null

/** Resuelve las portadas una vez y las guarda; si salieron pocas, reintenta pasada 1 h. */
export async function famousAlbums(music: MusicProvider, minNeeded: number): Promise<AlbumInfo[]> {
  if (cache.length < minNeeded && Date.now() - at > 60 * 60_000) {
    loading ??= (async () => {
      const res = await Promise.allSettled(
        FAMOUS_ALBUMS.map(async ([name, artist]): Promise<AlbumInfo | null> => {
          const hit = bestAlbum(name, artist, await music.searchAlbums(name, artist))
          // Se enseña el nombre limpio de la lista, no «(Deluxe Edition)»
          return hit ? { name, artist, cover: hit.cover } : null
        }),
      )
      const found = res.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []))
      at = Date.now()
      if (found.length) cache = found
    })().finally(() => (loading = null))
    await loading
  }
  return cache
}
