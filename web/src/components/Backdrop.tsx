import { AnimatePresence, motion } from 'motion/react'

/** Fondo: la carátula que suena, muy desenfocada, con un degradado encima. */
export function Backdrop({ cover }: { cover?: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink grain">
      <AnimatePresence>
        {cover && (
          <motion.img
            key={cover}
            src={cover}
            alt=""
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 0.55, scale: 1.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute inset-0 h-full w-full object-cover blur-3xl saturate-150"
          />
        )}
      </AnimatePresence>
      <div className="absolute -left-1/4 top-[-10%] h-[60vh] w-[80vw] rounded-full bg-cyan/10 blur-[90px]" />
      <div className="absolute -right-1/4 bottom-[-10%] h-[50vh] w-[70vw] rounded-full bg-green/8 blur-[90px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/75 to-ink" />
    </div>
  )
}
