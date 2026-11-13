import { Camera, Trash } from '@phosphor-icons/react'
import { useRef, useState, type ReactNode } from 'react'
import type { PublicUser } from '../../../shared/types.ts'
import { removeSelfie, shrinkSelfie, uploadSelfie } from '../lib/photo.ts'
import { cx, vibrate } from '../lib/util.ts'
import { Sheet } from './Sheet.tsx'
import { toast } from './Toasts.tsx'

/** Primera letra del alias, en mayúscula. */
function initial(alias: string): string {
  return ([...alias.trim()][0] ?? '?').toUpperCase()
}

/** Cara redonda: el selfie si lo hay; si no, la inicial de su nombre sobre metal. */
export function Avatar({
  user,
  size,
  className = '',
  ring = 'border-ink',
}: {
  user: Pick<PublicUser, 'photo' | 'alias'>
  size: number
  className?: string
  /** Color del filete que la separa de lo que tiene debajo. */
  ring?: string
}) {
  return (
    <span
      title={user.alias}
      className={cx('grid shrink-0 place-items-center overflow-hidden rounded-full bg-panel-2 font-display leading-none text-cyan', ring, className)}
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      {user.photo ? (
        <img src={user.photo} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        <span aria-hidden>{initial(user.alias)}</span>
      )}
    </span>
  )
}

/**
 * Botón que abre la cámara frontal. Devuelve la foto ya recortada (data URL)
 * o null si se arrepiente.
 */
export function SelfieInput({
  onPhoto,
  className,
  children,
  label = 'Hacerte un selfie',
}: {
  onPhoto: (dataUrl: string) => void | Promise<void>
  className?: string
  children: ReactNode
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={className} aria-label={label}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          try {
            await onPhoto(await shrinkSelfie(file))
          } catch (err) {
            toast((err as Error).message, 'error')
          } finally {
            setBusy(false)
          }
        }}
      />
    </>
  )
}

/** Cajón «Tu cara»: hacerse el selfie que sale en el VS y en el equipo, o quitarlo. */
export function FaceSheet({ open, onClose, user }: { open: boolean; onClose: () => void; user: PublicUser }) {
  async function upload(data: string) {
    await uploadSelfie(data)
    vibrate([20, 40, 20])
    toast('¡Ya tienes cara en el VS!', 'ok')
  }
  async function remove() {
    try {
      await removeSelfie()
      toast('Foto quitada', 'info')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Tu cara">
      <div className="flex flex-col items-center gap-5 pb-2 pt-1">
        <div className="bezel rounded-full p-[3px]">
          <Avatar user={user} size={148} ring="border-0" />
        </div>
        <p className="max-w-xs text-center text-[16px] text-paper/80">
          Sale en el VS y en las burbujas de tu equipo. Se borra al cerrar la noche.
        </p>
        <div className="grid w-full gap-3">
          <SelfieInput
            onPhoto={upload}
            className="pulsador glass flex h-16 items-center justify-center gap-3 font-display text-[18px] [--pulsador-glow:rgb(25_195_255/0.5)]"
          >
            <Camera size={24} weight="fill" aria-hidden /> {user.photo ? 'Repetir selfie' : 'Hacer selfie'}
          </SelfieInput>
          {user.photo && (
            <button onClick={remove} className="pulsador flex h-14 items-center justify-center gap-2 bg-panel-2 font-display text-[15px]">
              <Trash size={20} weight="bold" aria-hidden /> Quitar foto
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
