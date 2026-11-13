import { randomBytes } from 'node:crypto'
import type { AlbumInfo, TrackInfo } from '../../../shared/types.ts'
import { config } from '../config.ts'
import { readJson, writeJson } from '../store.ts'
import type { MusicProvider, PlaybackResult } from './provider.ts'

const ACCOUNTS = 'https://accounts.spotify.com'
const API = 'https://api.spotify.com/v1'
const SCOPES = ['user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing']
const TOKENS_FILE = 'spotify.json'

interface Tokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  account: string | null
}

interface SpotifyTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  explicit: boolean
  artists: { name: string }[]
  album: { name: string; images: { url: string; width: number | null }[] }
}

export class SpotifyError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** La imagen mediana (~300px) es suficiente y pesa poco. */
function pickCover(images: { url: string; width: number | null }[] | undefined): string {
  const imgs = [...(images ?? [])].sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
  return imgs.find((i) => (i.width ?? 0) >= 280)?.url ?? imgs.at(-1)?.url ?? ''
}

export function mapTrack(t: SpotifyTrack): TrackInfo {
  const cover = pickCover(t.album.images)
  return {
    id: t.id,
    uri: t.uri,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    cover,
    durationMs: t.duration_ms,
    explicit: t.explicit,
  }
}

export class SpotifyProvider implements MusicProvider {
  readonly kind = 'spotify' as const
  private tokens: Tokens | null = readJson<Tokens>(TOKENS_FILE)
  private pendingStates = new Map<string, number>()
  /**
   * Frenos por 429, separados: si las búsquedas de los clientes agotan el cupo, la reproducción
   * y la cola (lo que mantiene la música del bar) no se bloquean de antemano por culpa suya.
   */
  private backoffUntil = { player: 0, catalog: 0 }
  private refreshing: Promise<void> | null = null

  isConnected(): boolean {
    return !!this.tokens?.refreshToken
  }

  accountName(): string | null {
    return this.tokens?.account ?? null
  }

  /** URL para que la dueña (o Sergio) autorice la app con su cuenta. */
  authorizeUrl(): string {
    const state = randomBytes(12).toString('hex')
    this.pendingStates.set(state, Date.now() + 10 * 60_000)
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.spotify.clientId,
      scope: SCOPES.join(' '),
      redirect_uri: config.spotify.redirectUri,
      state,
      show_dialog: 'true',
    })
    return `${ACCOUNTS}/authorize?${params}`
  }

  async handleCallback(code: string, state: string): Promise<void> {
    const exp = this.pendingStates.get(state)
    this.pendingStates.delete(state)
    if (!exp || exp < Date.now()) throw new Error('Enlace caducado: vuelve a pulsar "Conectar Spotify"')
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.spotify.redirectUri,
    })
    const json = await this.tokenRequest(body)
    if (!json.refresh_token) throw new Error('Spotify no devolvió refresh_token')
    const tokens: Tokens = {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: Date.now() + json.expires_in * 1000,
      account: null,
    }
    this.tokens = tokens
    try {
      const me = (await this.api('GET', '/me')) as { display_name?: string; id: string } | null
      if (me) tokens.account = me.display_name || me.id
    } catch {
      /* no es imprescindible */
    }
    this.save()
  }

  disconnect(): void {
    this.tokens = null
    writeJson(TOKENS_FILE, null)
  }

  async getPlayback(): Promise<PlaybackResult> {
    if (!this.isConnected()) return { status: 'disconnected', playback: null }
    const res = (await this.api('GET', '/me/player?additional_types=track')) as
      | null
      | { is_playing: boolean; progress_ms: number | null; item: SpotifyTrack | null; currently_playing_type?: string }
    if (!res) return { status: 'no-device', playback: null }
    const track = res.item && res.currently_playing_type !== 'episode' ? mapTrack(res.item) : null
    return {
      status: 'ok',
      playback: { track, progressMs: res.progress_ms ?? 0, isPlaying: res.is_playing, at: Date.now() },
    }
  }

  async search(query: string): Promise<TrackInfo[]> {
    const params = new URLSearchParams({ q: query, type: 'track', limit: '10', market: config.spotify.market })
    const res = (await this.api('GET', `/search?${params}`)) as { tracks: { items: SpotifyTrack[] } }
    return (res?.tracks?.items ?? []).filter(Boolean).map(mapTrack)
  }

  async searchAlbums(name: string, artist: string): Promise<AlbumInfo[]> {
    const params = new URLSearchParams({ q: `album:${name} artist:${artist}`, type: 'album', limit: '8', market: config.spotify.market })
    const res = (await this.api('GET', `/search?${params}`)) as {
      albums: { items: { name: string; artists: { name: string }[]; images: { url: string; width: number | null }[] }[] }
    } | null
    return (res?.albums?.items ?? [])
      .filter(Boolean)
      .map((a) => ({ name: a.name, artist: a.artists.map((x) => x.name).join(', '), cover: pickCover(a.images) }))
  }

  async getTrack(id: string): Promise<TrackInfo | null> {
    if (!/^[A-Za-z0-9]{10,30}$/.test(id)) return null
    const res = (await this.api('GET', `/tracks/${id}?market=${config.spotify.market}`)) as SpotifyTrack | null
    return res ? mapTrack(res) : null
  }

  async addToQueue(uri: string): Promise<void> {
    await this.api('POST', `/me/player/queue?uri=${encodeURIComponent(uri)}`)
  }

  async skip(): Promise<void> {
    await this.api('POST', '/me/player/next')
  }

  // ───────────────────────── interno ─────────────────────────

  private save(): void {
    writeJson(TOKENS_FILE, this.tokens)
  }

  private async tokenRequest(body: URLSearchParams): Promise<{
    access_token: string
    refresh_token?: string
    expires_in: number
  }> {
    const basic = Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString('base64')
    const res = await fetch(`${ACCOUNTS}/api/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) throw new SpotifyError(res.status, `Spotify token: ${json.error_description ?? json.error ?? res.status}`)
    return json as never
  }

  private async ensureToken(): Promise<string> {
    if (!this.tokens) throw new SpotifyError(401, 'Spotify no está conectado')
    if (Date.now() < this.tokens.expiresAt - 60_000) return this.tokens.accessToken
    if (!this.refreshing) {
      this.refreshing = (async () => {
        const json = await this.tokenRequest(
          new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.tokens!.refreshToken }),
        )
        this.tokens = {
          ...this.tokens!,
          accessToken: json.access_token,
          refreshToken: json.refresh_token ?? this.tokens!.refreshToken,
          expiresAt: Date.now() + json.expires_in * 1000,
        }
        this.save()
      })().finally(() => {
        this.refreshing = null
      })
    }
    await this.refreshing
    return this.tokens.accessToken
  }

  private async api(method: string, path: string, retried = false): Promise<unknown> {
    const scope = path.startsWith('/me/player') ? 'player' : 'catalog'
    if (scope === 'catalog' && Date.now() < this.backoffUntil.catalog) throw new SpotifyError(429, 'Spotify pide esperar un poco')
    if (scope === 'player' && Date.now() < this.backoffUntil.player) throw new SpotifyError(429, 'Spotify pide esperar un poco')
    const token = await this.ensureToken()
    const res = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 401 && !retried && this.tokens) {
      this.tokens.expiresAt = 0
      return this.api(method, path, true)
    }
    if (res.status === 429) {
      // Con tope: un Retry-After enorme no puede dejar la música sin gestionar durante minutos
      const wait = Math.min(30, Math.max(1, Number(res.headers.get('retry-after') ?? 5) || 5))
      this.backoffUntil[scope] = Date.now() + wait * 1000
      throw new SpotifyError(429, `Spotify limita peticiones (${wait}s)`)
    }
    if (res.status === 204) return null
    const text = await res.text()
    let json: unknown = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      /* algunas respuestas de Spotify no son JSON */
    }
    if (!res.ok) {
      const msg = (json as { error?: { message?: string; reason?: string } })?.error
      if (res.status === 404 && msg?.reason === 'NO_ACTIVE_DEVICE') {
        throw new SpotifyError(404, 'No hay ningún Spotify activo: abre Spotify en el móvil del bar y dale al play')
      }
      if (res.status === 403 && msg?.reason === 'PREMIUM_REQUIRED') {
        throw new SpotifyError(403, 'Esta función necesita Spotify Premium')
      }
      throw new SpotifyError(res.status, `Spotify ${res.status}: ${msg?.message ?? text.slice(0, 120)}`)
    }
    return json
  }
}
