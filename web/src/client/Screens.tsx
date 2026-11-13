import { Camera, Plus } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { SelfieInput } from '../components/Avatar.tsx'
import { Bulbs, Stamp } from '../components/machine.tsx'
import { toast } from '../components/Toasts.tsx'
import { uploadSelfie } from '../lib/photo.ts'
import { emit, session } from '../lib/socket.ts'
import { cx, vibrate } from '../lib/util.ts'

export function Splash({ text = 'Encendiendo la máquina' }: { text?: string }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center px-6">
      <div className="flex flex-col items-center gap-5">
        <img src="/brand/logo-mark.png" alt="BarmaGames" className="h-20 w-auto opacity-90" />
        <Bulbs count={7} chase size={10} className="w-44" />
        <p className="text-[15px] font-semibold text-mute">{text}</p>
      </div>
    </div>
  )
}

export function Closed() {
  return (
    <div className="grid min-h-[100dvh] place-items-center px-6 text-center">
      <div className="flex w-full max-w-xs flex-col items-center">
        <div className="bezel relative w-full rounded-machine p-5">
          <Bulbs count={9} size={8} className="w-full opacity-40" />
          <img src="/brand/logo-full.png" alt="BarmaGames" className="mx-auto mt-6 w-40 opacity-35 grayscale" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Stamp tone="pink" rotate={-8} className="bg-ink px-3 py-1 text-[26px]">
              Cerrado
            </Stamp>
          </span>
          <Bulbs count={9} size={8} className="mt-6 w-full opacity-40" />
        </div>
        <p className="mt-8 font-display text-[18px]">Abrimos sobre las 23:00</p>
        <p className="mt-2 text-[16px] text-mute">Cuando se encienda la barra, se enciende la máquina.</p>
      </div>
    </div>
  )
}

export function Join({ banned }: { banned: boolean }) {
  const [alias, setAlias] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const valid = alias.trim().length >= 2

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || sending) return
    setSending(true)
    try {
      const r = await emit<{ token: string }>('join', { alias: alias.trim() })
      session.setToken(r.token)
      vibrate([20, 30, 40])
      // El selfie es opcional: si no sube, entra igual, solo con su nombre
      if (photo) uploadSelfie(photo).catch(() => toast('No se pudo subir la foto. Prueba desde tu cara, arriba', 'error', 4500))
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 safe-top safe-bottom">
      <Bulbs count={15} size={7} chase className="px-1" />

      <div className="flex flex-1 flex-col items-center justify-center py-6">
        <motion.img
          src="/brand/logo-full.png"
          alt="BarmaGames"
          className="w-44"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
        <h1 className="mt-6 text-center font-display text-[24px] leading-[1.15]">
          Pide tu receta.
          <br />
          <span className="text-cyan">Juega.</span> <span className="text-amber">Hazla sonar.</span>
        </h1>
      </div>

      {banned ? (
        <p className="mb-10 rounded-machine bg-pink px-4 py-4 text-center text-[16px] font-bold text-print">
          Esta noche no puedes jugar. Habla con la barra si es un error.
        </p>
      ) : (
        <motion.form
          onSubmit={submit}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 24 }}
          className="bezel mb-2 rounded-machine p-4"
        >
          <SelfieInput
            onPhoto={setPhoto}
            label={photo ? 'Repetir el selfie' : 'Hacerte un selfie (opcional)'}
            className="group mx-auto flex flex-col items-center gap-2 active:scale-95"
          >
            <span className="bezel relative grid size-32 place-items-center rounded-full p-[3px]">
              <span className="grid size-full place-items-center overflow-hidden rounded-full bg-panel-2">
                {photo ? (
                  <img src={photo} alt="" className="size-full object-cover" />
                ) : (
                  <Camera size={52} weight="fill" className="text-cyan" aria-hidden />
                )}
              </span>
              <span className="absolute bottom-0.5 right-0.5 grid size-9 place-items-center rounded-full border-[3px] border-night bg-cyan text-print" aria-hidden>
                <Plus size={18} weight="bold" />
              </span>
            </span>
            <span className="font-display text-[13px] text-paper/80">{photo ? 'Repetir selfie' : 'Hazte un selfie (opcional)'}</span>
          </SelfieInput>
          <label className="mt-4 block text-[15px] font-bold text-paper/80" htmlFor="alias">
            Tu nombre en el bar
          </label>
          <input
            id="alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value.slice(0, 16))}
            placeholder="Ej.: Lucía"
            autoComplete="nickname"
            maxLength={16}
            className="mt-2 h-14 w-full rounded-machine bg-paper px-4 text-[18px] font-bold text-print outline-none placeholder:text-print/45 focus:ring-4 focus:ring-cyan/60"
          />
          <p className="mt-2.5 text-[13px] text-mute">La foto sale en el VS y se borra al cerrar. Si no quieres, entra solo con tu nombre.</p>
          <button
            disabled={!valid || sending}
            className={cx('pulsador glass mt-4 h-16 w-full font-display text-[20px] [--pulsador-glow:rgb(25_195_255/0.55)]', valid && !sending && 'animate-breathe')}
          >
            {sending ? 'Entrando' : 'Entrar'}
          </button>
        </motion.form>
      )}
    </div>
  )
}
