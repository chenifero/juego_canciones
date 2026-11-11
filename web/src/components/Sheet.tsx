import { X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'

/**
 * Hueco visible de verdad en el móvil. Con el teclado abierto, el navegador (sobre todo iOS)
 * encoge el «visual viewport» y desplaza la página; el cajón se pega a ese hueco para que
 * no se suba ni haya que hacer scroll para encontrar el buscador.
 */
function useVisibleArea(active: boolean) {
  const [area, setArea] = useState<{ top: number; height: number } | null>(null)
  useEffect(() => {
    if (!active) return
    const vv = window.visualViewport
    const body = document.body.style
    const prevOverflow = body.overflow
    body.overflow = 'hidden'
    if (!vv) return () => void (body.overflow = prevOverflow)
    let raf = 0
    const update = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setArea({ top: vv.offsetTop, height: vv.height }))
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(raf)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      body.overflow = prevOverflow
      setArea(null)
    }
  }, [active])
  return area
}

/** Cajón de la máquina que sube desde abajo. Se cierra arrastrando, tocando fuera o con la X. */
export function Sheet({
  open,
  onClose,
  children,
  title,
  tall = false,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
  tall?: boolean
}) {
  const drag = useDragControls()
  const area = useVisibleArea(open)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-x-0 top-0 z-50 h-dvh" style={area ? { top: area.top, height: area.height } : undefined}>
          <motion.div
            className="absolute inset-0 bg-ink/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={`absolute inset-x-0 bottom-0 mx-auto flex max-w-lg flex-col overflow-hidden rounded-t-[14px] bg-night shadow-[0_-24px_60px_-10px_rgb(0_0_0/0.8)] safe-bottom ${tall ? 'h-[92%]' : 'max-h-[88%]'}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
          >
            <div className="h-1 shrink-0 bg-cyan" aria-hidden />
            <div className="flex shrink-0 cursor-grab touch-none items-center gap-3 px-5 pb-3 pt-4" onPointerDown={(e) => drag.start(e)}>
              <div className="min-w-0 flex-1 font-display text-[20px] leading-none">{title}</div>
              <button
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                className="grid size-10 shrink-0 place-items-center rounded-machine bg-panel-2 text-paper active:scale-95"
                aria-label="Cerrar"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 no-scrollbar">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
