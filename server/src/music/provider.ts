import type { AlbumInfo, SpotifyStatus, TrackInfo } from '../../../shared/types.ts'

export interface Playback {
  track: TrackInfo | null
  progressMs: number
  isPlaying: boolean
  /** Epoch ms en que se midió progressMs. */
  at: number
}

export interface PlaybackResult {
  status: SpotifyStatus
  playback: Playback | null
}

/** Lo que el juego necesita del reproductor (Spotify real o simulador). */
export interface MusicProvider {
  readonly kind: 'spotify' | 'mock'
  isConnected(): boolean
  accountName(): string | null
  getPlayback(): Promise<PlaybackResult>
  search(query: string): Promise<TrackInfo[]>
  /** Álbumes que encajan con ese nombre y artista (el primero es el mejor). Para el juego de carátulas. */
  searchAlbums(name: string, artist: string): Promise<AlbumInfo[]>
  getTrack(id: string): Promise<TrackInfo | null>
  addToQueue(uri: string): Promise<void>
  skip(): Promise<void>
  /** Solo el simulador: todo su catálogo, para las preguntas de los minijuegos. */
  sampleTracks?(): TrackInfo[]
}
