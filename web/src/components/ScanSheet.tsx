import { CameraSlash } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { cx, vibrate } from '../lib/util.ts'
import { Sheet } from './Sheet.tsx'

/** Saca el código de dosis de lo que lleve el QR: la URL `/?dosis=…` o el código suelto. */
export function doseFromText(text: string): string | null {
  const raw = text.trim()
  try {
    const u = new URL(raw)
    const c = u.searchParams.get('dosis')
    if (c) return c.toUpperCase().slice(0, 16)
  } catch {
    /* no es una URL */
  }
  const plain = raw.toUpperCase().replace(/[\s-]/g, '')
  return /^[A-Z0-9]{6,16}$/.test(plain) ? plain : null
}

type Detect = (v: HTMLVideoElement) => Promise<string | null>

interface BarcodeDetectorLike {
  detect(src: CanvasImageSource): Promise<{ rawValue: string }[]>
}

/** Lector nativo si el navegador lo trae (Chrome en Android); si no (Safari en iPhone), jsQR. */
async function makeDetector(): Promise<Detect> {
  const BD = (window as unknown as { BarcodeDetector?: new (o: object) => BarcodeDetectorLike }).BarcodeDetector
  if (BD) {
    try {
      const bd = new BD({ formats: ['qr_code'] })
      return async (v) => (await bd.detect(v))[0]?.rawValue ?? null
    } catch {
      /* sin soporte de QR: seguimos con jsQR */
    }
  }
  const { default: jsQR } = await import('jsqr')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  return async (v) => {
    const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight))
    const w = Math.round(v.videoWidth * scale)
    const h = Math.round(v.videoHeight * scale)
    if (!w || !h) return null
    canvas.width = w
    canvas.height = h
    ctx.drawImage(v, 0, 0, w, h)
    return jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
}

/**
 * Lector de QR dentro de la web: el cliente escanea la dosis de la barra sin salir
 * del navegador en el que juega. Si no hay cámara o permiso, se escribe el código.
 */
export function ScanSheet({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [wrong, setWrong] = useState(false)
  const [manual, setManual] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    setWrong(false)
    setManual('')
    let stream: MediaStream | null = null
    let stopped = false
    let timer = 0

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no deja usar la cámara aquí. Escribe el código que sale bajo el QR.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      } catch (e) {
        const name = (e as DOMException).name
        setError(
          name === 'NotAllowedError'
            ? 'Sin permiso para la cámara. Actívalo en los ajustes del navegador o escribe el código.'
            : 'No se pudo abrir la cámara. Escribe el código que sale bajo el QR.',
        )
        return
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop())
      const v = video.current!
      v.srcObject = stream
      await v.play().catch(() => {})
      const detect = await makeDetector()

      const tick = async () => {
        if (stopped) return
        if (v.readyState >= 2) {
          const text = await detect(v).catch(() => null)
          if (stopped) return
          if (text) {
            const code = doseFromText(text)
            if (code) {
              vibrate([30, 30, 60])
              onCode(code)
              return
            }
            setWrong(true)
          }
        }
        timer = window.setTimeout(tick, 180)
      }
      void tick()
    }
    void start()

    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [open, onCode])

  const typed = doseFromText(manual)

  return (
    <Sheet open={open} onClose={onClose} title="Escanea tu dosis">
      {error ? (
        <div className="glass-dim mb-4 flex flex-col items-center gap-3 rounded-machine px-4 py-6 text-center">
          <CameraSlash size={40} weight="bold" aria-hidden />
          <p className="text-[15px] font-bold leading-snug">{error}</p>
        </div>
      ) : (
        <div className="bezel relative mb-3 overflow-hidden rounded-machine p-[3px]">
          <video ref={video} playsInline muted className="aspect-square w-full rounded-[4px] bg-print object-cover" />
          {/* Marco de apuntar */}
          <span className="pointer-events-none absolute inset-[18%] rounded-[10px] border-[3px] border-cyan shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" aria-hidden />
        </div>
      )}
      <p className={cx('mb-4 text-center text-[14px] font-bold', wrong ? 'text-pink' : 'text-mute')} role="status">
        {error ? '' : wrong ? 'Ese QR no es una dosis. Apunta al del móvil de la barra.' : 'Apunta al QR que te enseñan en la barra.'}
      </p>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (typed) onCode(typed)
        }}
      >
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.toUpperCase().slice(0, 16))}
          placeholder="O escribe el código"
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Código de la dosis"
          className="h-12 min-w-0 flex-1 rounded-machine bg-paper px-3 font-mono text-[16px] font-bold tracking-[0.15em] text-print outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-print/45 focus:ring-4 focus:ring-cyan/60"
        />
        <button disabled={!typed} className="pulsador glass px-4 font-display text-[15px] disabled:opacity-50">
          Canjear
        </button>
      </form>
    </Sheet>
  )
}
