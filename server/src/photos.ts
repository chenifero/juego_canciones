import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './config.ts'
import { GameError } from './engine.ts'

/** Selfies de la noche: un JPEG pequeño por usuario en data/fotos. Se borran al cerrar la noche. */
export const PHOTO_DIR = join(config.dataDir, 'fotos')
mkdirSync(PHOTO_DIR, { recursive: true })

/** El móvil ya la recorta a 320×320; con 120 KB sobra. */
const MAX_BYTES = 120_000

const fileOf = (userId: string) => join(PHOTO_DIR, `${userId.replace(/[^a-z0-9]/gi, '')}.jpg`)

export function savePhoto(userId: string, dataUrl: unknown): void {
  if (typeof dataUrl !== 'string') throw new GameError('Foto no válida')
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!m) throw new GameError('Foto no válida')
  const buf = Buffer.from(m[1]!, 'base64')
  if (buf.length > MAX_BYTES) throw new GameError('La foto pesa demasiado')
  // Cabecera JPEG (FF D8 FF): que sea una imagen de verdad
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) throw new GameError('Foto no válida')
  writeFileSync(fileOf(userId), buf)
}

export function deletePhoto(userId: string): void {
  const f = fileOf(userId)
  if (existsSync(f)) rmSync(f)
}

export function deleteAllPhotos(): void {
  for (const f of readdirSync(PHOTO_DIR)) rmSync(join(PHOTO_DIR, f), { force: true })
}
