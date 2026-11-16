import { Lightning, MusicNotesPlus, Pill, Ranking as RankingIcon, type Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '../lib/util.ts'
import { Bulbs } from './machine.tsx'

const KEY = 'bg.tour'
const GAP = 14
const PAD = 6
const EDGE = 8
/** La escalera puede ser larga: el foco se queda con los primeros peldaños. */
const MAX_SPOT = 280
const MIN_SPOT = 64

/** ¿Este móvil ya vio el tour? (en modo privado puede fallar: entonces se enseña) */
export function tourSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
function markSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* sin persistencia: no pasa nada */
  }
}

/** En qué está el pulsador PIDE ahora, para que el rótulo no le contradiga. */
export type PideMode = 'ask' | 'mine' | 'wait'
type Step = { target: string; icon: Icon; tone: 'cyan' | 'amber'; title: string; body: string }

function steps(dosePoints: number, pide: PideMode): Step[] {
  const first: Record<PideMode, Pick<Step, 'title' | 'body'>> = {
    ask: { title: 'Pide tu canción', body: 'Búscala y entra en el ranking.' },
    mine: { title: 'Tu canción, en directo', body: 'Aquí ves su puesto. Tócalo para verla.' },
    wait: { title: 'Aquí se pide', body: 'Cuando acabe la espera, pide otra.' },
  }
  return [
    { target: 'pide', icon: MusicNotesPlus, tone: 'cyan', ...first[pide] },
    { target: 'ranking', icon: RankingIcon, tone: 'cyan', title: 'La 1.ª suena después', body: 'En el último minuto, VS: la 1.ª contra la 2.ª, con puntos ×2.' },
    { target: 'jugar', icon: Lightning, tone: 'amber', title: 'Juega y súmale puntos', body: 'Minijuegos de segundos. Lo que ganas va a tu canción.' },
    { target: 'dosis', icon: Pill, tone: 'cyan', title: `Consume: +${dosePoints}`, body: 'Pide tu dosis en la barra y escanéala aquí.' },
  ]
}

type Rect = { top: number; left: number; width: number; height: number }

function useViewport(): { w: number; h: number } {
  const [vp, setVp] = useState(() => ({ w: innerWidth, h: innerHeight }))
  useEffect(() => {
    const on = () => setVp({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  return vp
}

/**
 * Sigue la pieza señalada (la pantalla se mueve en directo: el ranking cambia, el usuario hace scroll).
 * Devuelve `'missing'` si la pieza no está en pantalla, para saltar el paso.
 */
function useTargetRect(target: string | null, tipH: number, vp: { w: number; h: number }, reduce: boolean): Rect | null | 'missing' {
  // Lo medido va unido a su paso: lo de un paso anterior no vale para el siguiente
  const [state, setState] = useState<{ target: string | null; rect: Rect | null | 'missing' }>({ target: null, rect: null })
  const setRect = (rect: Rect | null | 'missing') => setState({ target, rect })
  const tipRef = useRef(tipH)
  tipRef.current = tipH

  useLayoutEffect(() => {
    if (!target) return setRect(null)
    const find = () => document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
    let el = find()
    if (!el) return setRect('missing')
    // Que se vea antes de iluminarla. PIDE y JUGAR van en la botonera fija: ahí no se mueve la página.
    if (!el.closest('.fixed')) el.scrollIntoView({ block: 'start', behavior: reduce ? 'instant' : 'smooth' })
    let raf = 0
    let last = ''
    const tick = () => {
      if (!el?.isConnected) el = find()
      if (!el) return setRect('missing')
      const r = el.getBoundingClientRect()
      // Lo que cabe del foco: la pantalla menos el rótulo que va debajo (cuenta en móviles bajos o girados)
      const cap = Math.max(MIN_SPOT, Math.min(MAX_SPOT, innerHeight - r.top - PAD * 2 - GAP - tipRef.current - EDGE))
      let height = r.height
      if (height > cap) {
        // Se corta al final de un peldaño entero, nunca a media fila o a media frase
        let bottom = 0
        for (const li of el.querySelectorAll('li')) {
          const b = li.getBoundingClientRect().bottom
          if (b <= r.top + cap && b > bottom) bottom = b
        }
        height = bottom ? bottom - r.top + 3 : cap
      }
      const next = { top: r.top, left: r.left, width: r.width, height }
      const key = `${Math.round(next.top)}:${Math.round(next.left)}:${Math.round(next.width)}:${Math.round(next.height)}`
      if (key !== last) {
        last = key
        setRect(next)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
    // Al girar el móvil se vuelve a colocar
  }, [target, vp.w, vp.h, reduce])
  return state.target === target ? state.rect : null
}

/**
 * Tour de bienvenida sobre la pantalla real: oscurece todo menos una pieza
 * (PIDE, la escalera, JUGAR, la dosis) y le pone al lado un rótulo con su icono.
 * La pieza encendida funciona: tocarla hace lo suyo y cierra el tour.
 * Sale una vez por móvil; se vuelve a ver con el botón «?».
 */
export function Tour({
  open,
  onClose,
  dosePoints,
  pide,
}: {
  open: boolean
  onClose: () => void
  dosePoints: number
  pide: PideMode
}) {
  const reduce = !!useReducedMotion()
  const vp = useViewport()
  const [i, setI] = useState(0)
  const [tipH, setTipH] = useState(180)
  const list = steps(dosePoints, pide)
  const step = open ? list[i] : undefined
  const found = useTargetRect(step?.target ?? null, tipH, vp, reduce)
  const rect = found === 'missing' ? null : found
  const nextBtn = useRef<HTMLButtonElement>(null)
  const skipBtn = useRef<HTMLButtonElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)
  const tip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setI(0)
    returnTo.current = document.activeElement as HTMLElement | null
  }, [open])

  // El foco va al «Vale» en cuanto existe (en el primer pintado aún no hay rótulo)
  useEffect(() => {
    if (open && rect) nextBtn.current?.focus({ preventScroll: true })
  }, [open, i, !!rect])

  // Alto real del rótulo, para que quepa con el hueco (móvil girado o pequeño)
  useLayoutEffect(() => {
    const el = tip.current
    if (!el) return
    const ro = new ResizeObserver(() => setTipH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  })

  function close({ toTop }: { toTop: boolean }) {
    markSeen()
    onClose()
    if (toTop) {
      scrollTo({ top: 0, behavior: reduce ? 'instant' : 'smooth' })
      returnTo.current?.focus?.({ preventScroll: true })
    }
  }
  const finish = () => close({ toTop: true })
  function advance() {
    if (i + 1 >= list.length) finish()
    else setI(i + 1)
  }

  // Si una pieza no está (p. ej. se ha desmontado), se pasa a la siguiente
  useEffect(() => {
    if (open && found === 'missing') advance()
  })

  // Tocar la pieza encendida hace lo suyo (abre la búsqueda, los juegos…) y da el tour por visto
  useEffect(() => {
    if (!open || !step) return
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
    if (!el) return
    const onTap = () => close({ toTop: false })
    el.addEventListener('click', onTap, { capture: true, once: true })
    return () => el.removeEventListener('click', onTap, { capture: true })
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight') advance()
      else if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
      else if (e.key === 'Tab') {
        // El foco se queda en el rótulo: Saltar ↔ Vale
        e.preventDefault()
        ;(document.activeElement === nextBtn.current ? skipBtn : nextBtn).current?.focus()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const spot = rect && { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
  // Rótulo encima de la pieza si está en la mitad de abajo; si no, debajo. Siempre dentro de la pantalla.
  const above = !!spot && spot.top + spot.height / 2 > vp.h / 2
  const tipTop = spot
    ? Math.min(vp.h - tipH - EDGE, Math.max(EDGE, above ? spot.top - GAP - tipH : spot.top + spot.height + GAP))
    : 0
  const arrowX = spot ? spot.left + spot.width / 2 : 0
  const Glyph = step?.icon

  return (
    <AnimatePresence>
      {open && step && spot && Glyph && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[65]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-body"
        >
          {/* Tocar fuera avanza (nadie se queda atascado); el hueco queda libre para tocar la pieza */}
          {[
            { top: 0, left: 0, right: 0, height: Math.max(0, spot.top) },
            { top: spot.top + spot.height, left: 0, right: 0, bottom: 0 },
            { top: spot.top, left: 0, width: Math.max(0, spot.left), height: spot.height },
            { top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height },
          ].map((style, k) => (
            <div key={k} className="pointer-events-auto absolute" style={style} onClick={advance} aria-hidden />
          ))}

          {/* El foco: un hueco en el velo con el filo de luz ámbar */}
          <motion.div
            aria-hidden
            className="absolute rounded-[10px]"
            initial={false}
            animate={spot}
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
            style={{
              boxShadow:
                '0 0 0 3px var(--color-amber), 0 0 22px 2px rgb(255 194 61 / 0.55), 0 0 0 9999px rgb(5 6 7 / 0.84)',
            }}
          />

          {/* El rótulo */}
          <div className="absolute inset-x-0 mx-auto max-w-lg px-4" style={{ top: tipTop }}>
            <motion.div
              ref={tip}
              key={i}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: above ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="bezel pointer-events-auto relative rounded-machine p-[3px]"
            >
              {/* Pico que apunta a la pieza */}
              <span
                aria-hidden
                className={cx('absolute size-3.5 rotate-45 bg-[#1b1e24]', above ? '-bottom-[6px]' : '-top-[6px]')}
                style={{ left: `clamp(18px, calc(${arrowX}px - 16px - 7px - max(0px, (100vw - 512px) / 2)), calc(100% - 32px))` }}
              />
              <div className="relative flex flex-col gap-4 rounded-[4px] bg-[#1b1e24] p-4">
                <div className="flex items-center gap-3.5">
                  <span
                    className={cx(
                      'grid size-14 shrink-0 place-items-center rounded-machine',
                      step.tone === 'amber' ? 'bg-amber text-print' : 'glass',
                    )}
                  >
                    <Glyph size={32} weight="fill" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p id="tour-title" className="font-display text-[19px] leading-[1.05]">
                      {step.title}
                    </p>
                    <p id="tour-body" className="mt-1.5 text-[15px] font-semibold leading-snug text-paper/75">
                      {step.body}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Bulbs count={list.length} lit={i + 1} size={9} className="w-16" />
                  <span id="tour-step" className="sr-only">
                    Paso {i + 1} de {list.length}
                  </span>
                  <button
                    ref={skipBtn}
                    onClick={finish}
                    className="ml-auto min-h-11 px-2 text-[14px] font-bold text-mute active:text-paper"
                  >
                    Saltar
                  </button>
                  <button
                    ref={nextBtn}
                    onClick={advance}
                    aria-describedby="tour-title tour-body tour-step"
                    className="pulsador min-h-12 min-w-[112px] bg-amber px-4 font-display text-[15px] leading-none text-print [--pulsador-glow:rgb(255_194_61/0.4)]"
                  >
                    {i + 1 >= list.length ? '¡A jugar!' : 'Vale'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
