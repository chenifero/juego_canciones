import { AnimatePresence, motion } from 'motion/react'
import { useSyncExternalStore } from 'react'

type Tone = 'ok' | 'error' | 'info'
interface Toast {
  id: number
  text: string
  tone: Tone
}

let toasts: Toast[] = []
const subs = new Set<() => void>()
let seq = 0

export function toast(text: string, tone: Tone = 'info', ms = 3200): void {
  const t = { id: ++seq, text, tone }
  toasts = [...toasts.slice(-2), t]
  subs.forEach((s) => s())
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id)
    subs.forEach((s) => s())
  }, ms)
}

/** Avisos como el rótulo luminoso de la máquina: tira de color con letra impresa. */
const TONE: Record<Tone, string> = {
  ok: 'bg-amber text-print',
  error: 'bg-pink text-print',
  info: 'bg-paper text-print',
}

export function Toasts() {
  const list = useSyncExternalStore(
    (l) => {
      subs.add(l)
      return () => subs.delete(l)
    },
    () => toasts,
  )
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex flex-col items-center gap-2 px-4 safe-top" role="status" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -24, scaleY: 0.6 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 460, damping: 30 }}
            className={`max-w-sm rounded-machine px-4 py-3 text-center text-[15px] font-[800] shadow-[0_14px_30px_-10px_rgb(0_0_0/0.8)] ${TONE[t.tone]}`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
