import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './config.ts'

/** Lee un JSON de la carpeta data/ (o devuelve null). */
export function readJson<T>(name: string): T | null {
  const file = join(config.dataDir, name)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch (err) {
    console.error(`No se pudo leer ${name}:`, err)
    return null
  }
}

/** Escribe un JSON de forma atómica (archivo temporal + rename). */
export function writeJson(name: string, data: unknown): void {
  const file = join(config.dataDir, name)
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(data))
  renameSync(tmp, file)
}

/** Devuelve una función que guarda como mucho una vez cada `ms`. */
export function debounced(fn: () => void, ms: number): () => void {
  let timer: NodeJS.Timeout | null = null
  return () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      try {
        fn()
      } catch (err) {
        console.error('Error guardando:', err)
      }
    }, ms)
  }
}
