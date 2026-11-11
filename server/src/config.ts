import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const env = process.env

export const config = {
  port: Number(env.PORT ?? 3000),
  mock: process.argv.includes('--mock') || env.MOCK_SPOTIFY === '1',
  adminPin: env.ADMIN_PIN ?? '1234',
  /** Origen de la web. En desarrollo es Vite; en producción, el propio servidor. */
  webOrigin: env.WEB_ORIGIN ?? '',
  dataDir: resolve(env.DATA_DIR ?? resolve(import.meta.dirname, '../../data')),
  webDist: resolve(import.meta.dirname, '../../web/dist'),
  spotify: {
    clientId: env.SPOTIFY_CLIENT_ID ?? '',
    clientSecret: env.SPOTIFY_CLIENT_SECRET ?? '',
    redirectUri: env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:3000/callback',
    /** País del catálogo (solo canciones disponibles allí). `from_token` exigiría otro permiso. */
    market: env.SPOTIFY_MARKET ?? 'ES',
  },
}

mkdirSync(config.dataDir, { recursive: true })

if (!config.mock && (!config.spotify.clientId || !config.spotify.clientSecret)) {
  console.warn('⚠️  Faltan SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET en .env (o arranca con npm run dev:mock)')
}
if (config.adminPin === '1234') {
  console.warn('⚠️  ADMIN_PIN es 1234: cámbialo en .env antes de llevarlo al bar')
}
