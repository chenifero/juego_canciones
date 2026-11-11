import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SongRequest, TrackInfo } from '../../../shared/types.ts'
import { ActionError, emit } from '../lib/socket.ts'
import { fmtTime, vibrate } from '../lib/util.ts'
import { Sheet } from './Sheet.tsx'
import { toast } from './Toasts.tsx'

export function SearchSheet({
  open,
  onClose,
  onSupport,
}: {
  open: boolean
  onClose: () => void
  onSupport: (requestId: string) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<TrackInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const seq = useRef(0)
  const input = useRef<HTMLInputElement>(null)

  // Foco sin desplazar la página: con autoFocus el navegador hacía scroll hasta el buscador
  // mientras el cajón aún entraba desde abajo, y la pantalla se quedaba movida.
  useLayoutEffect(() => {
    if (open) input.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) {
      setQ('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const my = ++seq.current
    const t = setTimeout(async () => {
      try {
        const res = await emit<TrackInfo[]>('search', { q: term })
        if (my === seq.current) setResults(res)
      } catch (e) {
        if (my === seq.current && (e as ActionError).code !== 'RATE') toast((e as Error).message, 'error')
      } finally {
        if (my === seq.current) setLoading(false)
      }
    }, 380)
    return () => clearTimeout(t)
  }, [q])

  async function pick(t: TrackInfo) {
    if (sending) return
    setSending(t.id)
    try {
      await emit<SongRequest>('request', { trackId: t.id })
      vibrate([20, 40, 20])
      toast(`«${t.title}» ya está en el ranking`, 'ok')
      onClose()
    } catch (e) {
      const err = e as ActionError
      if (err.code?.startsWith('DUPLICATE:')) {
        toast('Ya la habían pedido: te unes a su equipo', 'info')
        onSupport(err.code.slice('DUPLICATE:'.length))
        onClose()
      } else toast(err.message, 'error', 4500)
    } finally {
      setSending(null)
    }
  }

  const term = q.trim()

  return (
    <Sheet open={open} onClose={onClose} tall title="Pide tu receta">
      <label htmlFor="buscar" className="sr-only">
        Canción o artista
      </label>
      <div className="sticky top-0 z-10 -mx-5 bg-night px-5 pb-3">
        <div className="flex h-14 items-center gap-3 rounded-machine bg-paper px-4 text-print focus-within:ring-4 focus-within:ring-cyan/60">
          <MagnifyingGlass size={22} weight="bold" aria-hidden />
          <input
            id="buscar"
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Canción o artista"
            enterKeyHint="search"
            autoComplete="off"
            className="h-full w-full bg-transparent text-[18px] font-bold outline-none placeholder:text-print/45"
          />
          {loading && <span className="size-5 shrink-0 animate-spin rounded-full border-[3px] border-print/80 border-t-transparent" aria-label="Buscando" />}
        </div>
      </div>

      {results.length === 0 && !loading && (
        <p className="py-12 text-center text-[16px] text-mute">
          {term.length < 2 ? 'Escribe el nombre de la canción' : 'No sale nada. Prueba con el artista.'}
        </p>
      )}

      <ul className="flex flex-col">
        {results.map((t, i) => (
          <motion.li key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025 }}>
            <button
              onClick={() => pick(t)}
              disabled={!!sending}
              className="flex w-full items-center gap-3 border-b border-line py-2.5 text-left active:bg-panel disabled:opacity-50"
            >
              <img src={t.cover} alt="" className="size-14 shrink-0 rounded-[3px] object-cover" loading="lazy" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-[800] [font-stretch:92%]">
                  {t.title}
                  {t.explicit && (
                    <span className="ml-1.5 rounded-[2px] bg-paper/20 px-1 align-middle text-[10px] font-black" title="Explícita">
                      E
                    </span>
                  )}
                </span>
                <span className="block truncate text-[14px] text-mute">
                  {t.artist} <span className="tabular-nums">{fmtTime(t.durationMs)}</span>
                </span>
              </span>
              <span className="pulsador glass grid size-11 shrink-0 place-items-center" aria-label={`Pedir ${t.title}`}>
                {sending === t.id ? (
                  <span className="size-5 animate-spin rounded-full border-[3px] border-print border-t-transparent" />
                ) : (
                  <Plus size={22} weight="bold" />
                )}
              </span>
            </button>
          </motion.li>
        ))}
      </ul>
    </Sheet>
  )
}
