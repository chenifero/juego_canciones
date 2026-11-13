import { emit } from './socket.ts'

const SIZE = 320

/**
 * Recorta el selfie al cuadrado del centro y lo deja en 320×320 JPEG (unos 25 KB),
 * para que suba rápido con la wifi del bar.
 */
export async function shrinkSelfie(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Eso no es una foto')
  let source: CanvasImageSource
  let w: number
  let h: number
  try {
    // Respeta la orientación de la cámara del móvil
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    source = bmp
    w = bmp.width
    h = bmp.height
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      source = img
      w = img.naturalWidth
      h = img.naturalHeight
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  const side = Math.min(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Este móvil no deja procesar la foto')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, SIZE, SIZE)
  return canvas.toDataURL('image/jpeg', 0.8)
}

export async function uploadSelfie(dataUrl: string): Promise<void> {
  await emit('photo:set', { data: dataUrl })
}

export async function removeSelfie(): Promise<void> {
  await emit('photo:clear')
}
