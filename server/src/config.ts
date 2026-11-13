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
/** El teclado de la dueña solo tiene cifras: al menos 6 y nada tan evidente como 123456 o 000000. */
export function weakPin(pin: string | undefined): string | null {
  if (!pin) return 'falta ADMIN_PIN'
  if (!/^\d{6,12}$/.test(pin)) return 'ADMIN_PIN debe tener entre 6 y 12 cifras'
  if (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'ADMIN_PIN es demasiado evidente'
  return null
}

if (process.env.NODE_ENV === 'production') {
  // En producción no se arranca con un PIN ausente, corto o evidente: abriría el panel a cualquiera
  const problem = weakPin(env.ADMIN_PIN)
  if (problem) {
    console.error(`❌ ${problem}. Ponlo como secreto (fly secrets set ADMIN_PIN=...) antes de publicar.`)
    process.exit(1)
  }
} else if (config.adminPin === '1234') {
  console.warn('⚠️  ADMIN_PIN es 1234: sirve para pruebas, pero en producción hace falta uno de 6 a 12 cifras')
}
