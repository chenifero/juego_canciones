import {
  ArrowRight,
  Backspace,
  ListNumbers,
  Martini,
  ImageBroken,
  Minus,
  Pill,
  Plus,
  Power,
  Printer,
  Prohibit,
  SignOut,
  SkipForward,
  SlidersHorizontal,
  SpotifyLogo,
  Timer,
  UsersThree,
  Warning,
  X,
  type Icon,
} from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import QRCode from 'qrcode'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { AdminState, PublicState, Settings } from '../../../shared/types.ts'
import { Avatar } from '../components/Avatar.tsx'
import { Bulbs, Led, Stamp } from '../components/machine.tsx'
import { Sheet } from '../components/Sheet.tsx'
import { toast } from '../components/Toasts.tsx'
import { emit, session, socket } from '../lib/socket.ts'
import { connect, progressAt, useServerNow, useStore } from '../lib/store.ts'
import { cx, fmtTime, vibrate } from '../lib/util.ts'

type AdminFull = AdminState & {
  musicError: { message: string; at: number } | null
  mock: boolean
  spotifyConfigured: boolean
}

const adminEmit = <T,>(ev: string, p: object = {}) => emit<T>(ev, { ...p, adminToken: session.adminToken })

export function AdminApp() {
  const { state, connected } = useStore()
  const [authed, setAuthed] = useState(!!session.adminToken)
  const [admin, setAdmin] = useState<AdminFull | null>(null)

  useEffect(() => {
    connect()
    const onState = (s: AdminFull) => setAdmin(s)
    socket.on('admin:state', onState)
    return () => {
      socket.off('admin:state', onState)
    }
  }, [])

  // Al (re)conectar, comprobamos que la sesión de la dueña sigue valiendo
  useEffect(() => {
    if (!authed) return
    const hello = () =>
      adminEmit('admin:hello').catch(() => {
        session.setAdminToken(null)
        setAuthed(false)
      })
    if (socket.connected) void hello()
    socket.on('connect', hello)
    return () => {
      socket.off('connect', hello)
    }
  }, [authed])

  // Vuelta de Spotify: /admin?spotify=ok
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sp = params.get('spotify')
    if (!sp) return
    if (sp === 'ok') toast('Spotify conectado', 'ok', 4000)
    else toast(`Spotify: ${sp}`, 'error', 6000)
    history.replaceState(null, '', location.pathname)
  }, [])

  if (!authed) return <PinScreen onOk={() => setAuthed(true)} />
  if (!state || !admin)
    return (
      <div className="grid min-h-[100dvh] place-items-center">
        <Bulbs count={7} chase size={10} className="w-44" />
      </div>
    )
  return (
    <Panel
      state={state}
      admin={admin}
      connected={connected}
      onLogout={() => {
        session.setAdminToken(null)
        setAuthed(false)
      }}
    />
  )
}

// ───────────────────────── PIN ─────────────────────────

function PinScreen({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(0)

  useEffect(() => {
    connect()
  }, [])

  async function submit(p: string) {
    try {
      const r = await emit<{ token: string }>('admin:login', { pin: p })
      session.setAdminToken(r.token)
      vibrate(30)
      onOk()
    } catch (e) {
      setShake((s) => s + 1)
      vibrate([50, 40, 50])
      setPin('')
      toast((e as Error).message, 'error')
    }
  }

  const press = (d: string) => {
    if (d === 'del') return setPin((p) => p.slice(0, -1))
    if (d === 'ok') return pin.length >= 4 && void submit(pin)
    setPin((p) => (p.length < 8 ? p + d : p))
  }

  const slots = Math.max(4, pin.length)
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center px-5 safe-top safe-bottom">
      <img src="/brand/logo-mark.png" alt="BarmaGames" className="mx-auto h-16 w-auto" />
      <h1 className="mt-5 text-center font-display text-[22px]">Mando de la barra</h1>
      <motion.div key={shake} animate={shake ? { x: [0, -12, 12, -8, 8, 0] } : {}} className="mx-auto mt-6">
        <span className="led-well flex items-center gap-3 rounded-machine px-4 py-3" aria-label={`${pin.length} cifras`}>
          <Bulbs count={slots} lit={pin.length} size={14} className="gap-3" />
        </span>
      </motion.div>
      <div className="bezel mt-6 grid grid-cols-3 gap-2.5 rounded-machine p-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            aria-label={d === 'del' ? 'Borrar' : d === 'ok' ? 'Entrar' : d}
            className={cx(
              'pulsador grid h-16 place-items-center font-display text-[24px]',
              d === 'ok' ? 'glass' : 'bg-panel-2',
            )}
          >
            {d === 'del' ? <Backspace size={26} weight="bold" /> : d === 'ok' ? <ArrowRight size={28} weight="bold" /> : d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ───────────────────────── piezas ─────────────────────────

/** Pide un segundo toque para confirmar (sin diálogos del navegador). */
function ConfirmButton({
  onConfirm,
  children,
  armedChildren,
  className = '',
  label,
}: {
  onConfirm: () => void
  children: ReactNode
  armedChildren: ReactNode
  className?: string
  label?: string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      aria-label={label}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
          vibrate(15)
        }
      }}
      className={cx(className, armed && '!bg-pink !text-print')}
    >
      {armed ? armedChildren : children}
    </button>
  )
}

/** Ajuste con botones − / + y su valor en LED (sin deslizadores del navegador). */
function Stepper({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  const set = (v: number) => {
    const n = Math.min(max, Math.max(min, Math.round(v * 100) / 100))
    if (n !== value) onChange(n)
  }
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
      <span className="text-[15px] font-bold leading-tight">{label}</span>
      <span className="flex shrink-0 items-center gap-2">
        <button disabled={value <= min} onClick={() => set(value - step)} className="pulsador grid size-11 place-items-center bg-panel-2" aria-label={`Bajar: ${label}`}>
          <Minus size={18} weight="bold" />
        </button>
        <span className="led-well min-w-[58px] rounded-[4px] px-2 py-1.5 text-center">
          <Led value={format(value)} className="text-[18px]" />
        </span>
        <button disabled={value >= max} onClick={() => set(value + step)} className="pulsador grid size-11 place-items-center bg-panel-2" aria-label={`Subir: ${label}`}>
          <Plus size={18} weight="bold" />
        </button>
      </span>
    </div>
  )
}

/** Tecla de cajón del mando: icono, nombre y contador. */
function DrawerKey({ icon: Glyph, label, count, onClick }: { icon: Icon; label: string; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="pulsador bezel flex h-[84px] flex-col items-center justify-center gap-1.5">
      <span className="flex h-6 items-center gap-2">
        <Glyph size={22} weight="bold" aria-hidden />
        {count !== undefined && (
          <span className="led-well rounded-[3px] px-1.5 py-0.5">
            <Led value={count} digits={2} className="text-[13px]" />
          </span>
        )}
      </span>
      <span className="font-display text-[13px] leading-none">{label}</span>
    </button>
  )
}

// ───────────────────────── mando ─────────────────────────

function Panel({ state, admin, connected, onLogout }: { state: PublicState; admin: AdminFull; connected: boolean; onLogout: () => void }) {
  const now = useServerNow(4)
  const [dose, setDose] = useState<{ code: string; points: number; expiresAt: number } | null>(null)
  const [drawer, setDrawer] = useState<null | 'ranking' | 'gente' | 'ajustes'>(null)
  const s = admin.settings

  const act = useCallback(async (ev: string, p: object = {}, ok?: string) => {
    try {
      await adminEmit(ev, p)
      if (ok) toast(ok, 'ok')
    } catch (e) {
      toast((e as Error).message, 'error', 5000)
    }
  }, [])
  const setSettings = (patch: Partial<Settings>) => act('admin:settings', { settings: patch })

  async function giveDose() {
    try {
      setDose(await adminEmit('admin:dose'))
      vibrate(20)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const track = state.now.track
  const toLock = state.lockAt ? Math.max(0, state.lockAt - now) : 0
  const remaining = track && state.now.isPlaying ? track.durationMs - progressAt(state, now) : null
  const ledText = !state.open ? '-:--' : toLock > 0 ? fmtTime(toLock) : remaining !== null ? fmtTime(remaining) : '-:--'
  const musicOk = state.spotify === 'ok' || state.spotify === 'mock'
  const recentError = admin.musicError && now - admin.musicError.at < 120_000 ? admin.musicError.message : null
  const problem =
    state.spotify === 'disconnected'
      ? 'Spotify sin conectar'
      : state.spotify === 'no-device'
        ? 'Spotify parado: dale al play en el móvil'
        : state.spotify === 'error'
          ? 'No llego a Spotify. Reintentando.'
          : recentError

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 safe-top safe-bottom">
      <header className="pb-3">
        <Bulbs count={15} size={7} chase={state.phase === 'duel' || s.happyHour} className="px-1" />
        <div className="mt-3 flex items-center gap-2.5">
          <img src="/brand/logo-mark.png" alt="" className="h-9 w-auto" />
          <span className="font-display text-[17px] leading-none">Mando de la barra</span>
          <button onClick={onLogout} className="ml-auto grid size-10 place-items-center rounded-machine bg-panel-2" aria-label="Salir del mando">
            <SignOut size={20} weight="bold" />
          </button>
        </div>
      </header>

      {/* Tira SUENA */}
      <section className="bezel rounded-machine p-[3px]" aria-label="Estado de la música">
        <div className={cx('flex items-center gap-3 rounded-[4px] p-2.5', state.open && track ? 'glass' : 'glass-dim')}>
          <span className="flex shrink-0 flex-col items-center gap-1" aria-label={musicOk && connected ? 'Spotify funciona' : 'Spotify con problemas'}>
            <SpotifyLogo size={20} weight="fill" aria-hidden />
            <span className={cx('size-2.5', musicOk && connected ? 'bulb-on' : 'rounded-full bg-pink shadow-[0_0_8px_rgb(255_61_139/0.9)]')} />
          </span>
          {track ? (
            <img src={track.cover} alt="" className="size-12 shrink-0 rounded-[3px] object-cover ring-2 ring-print/70" />
          ) : (
            <span className="size-12 shrink-0 rounded-[3px] bg-print/40" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-[850] leading-tight [font-stretch:90%]">{track?.title ?? 'Nada sonando'}</p>
            {state.open ? (
              <p className="truncate text-[13px] font-semibold opacity-75">
                {state.locked ? `Después: ${state.locked.track.title}` : (track?.artist ?? '')}
              </p>
            ) : (
              <Stamp tone="pink" rotate={-3} className="mt-1">
                Cerrado
              </Stamp>
            )}
          </div>
          <span className="led-well shrink-0 rounded-[4px] px-2 py-1.5">
            <Led value={ledText} className="text-[18px]" />
          </span>
        </div>
      </section>

      <AnimatePresence>
        {problem && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center gap-3 rounded-machine bg-pink p-3 text-print" role="alert">
              <Warning size={22} weight="fill" aria-hidden />
              <p className="flex-1 text-[15px] font-bold leading-tight">{problem}</p>
              {state.spotify === 'disconnected' && !admin.mock && admin.spotifyConfigured && (
                <a href={`/auth/login?admin=${encodeURIComponent(session.adminToken ?? '')}`} className="rounded-[4px] bg-print px-3 py-2 text-[13px] font-bold text-paper">
                  Conectar
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* La botonera */}
      <div className="bezel mt-auto rounded-machine p-3">
        <div className="grid h-[190px] grid-cols-[1fr_1.55fr_1fr] gap-3">
          <button
            onClick={() => setSettings({ happyHour: !s.happyHour })}
            className={cx(
              'pulsador flex flex-col items-center justify-center gap-2',
              s.happyHour ? 'bg-amber text-print [--pulsador-glow:rgb(255_194_61/0.55)]' : 'bg-panel-2',
            )}
            aria-pressed={s.happyHour}
          >
            <Martini size={30} weight={s.happyHour ? 'fill' : 'bold'} aria-hidden />
            <span className="font-display text-[14px] leading-none">Happy</span>
            <span className={cx('rounded-full px-2 py-1', s.happyHour ? 'bg-print' : 'bg-ink')}>
              <Bulbs count={2} lit={s.happyHour ? 2 : 0} size={7} className="w-6" />
            </span>
          </button>

          <button
            disabled={!state.open}
            onClick={giveDose}
            className={cx(
              'pulsador glass flex flex-col items-center justify-center gap-2 [--pulsador-glow:rgb(25_195_255/0.6)]',
              state.open && 'animate-breathe',
            )}
          >
            <Pill size={44} weight="fill" aria-hidden />
            <span className="font-display text-[26px] leading-none">Dosis</span>
            <span className="led-well rounded-[4px] px-2 py-1">
              <Led value={s.dosePoints * (s.happyHour ? 2 : 1)} digits={2} className="text-[18px]" />
            </span>
          </button>

          <ConfirmButton
            onConfirm={() => act('admin:skip')}
            className="pulsador flex flex-col items-center justify-center gap-2 bg-panel-2"
            label="Saltar canción"
            armedChildren={
              <>
                <SkipForward size={30} weight="fill" aria-hidden />
                <span className="font-display text-[14px] leading-tight">¿Saltar?</span>
              </>
            }
          >
            <SkipForward size={30} weight="bold" aria-hidden />
            <span className="font-display text-[14px] leading-none">Saltar</span>
          </ConfirmButton>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <DrawerKey icon={ListNumbers} label="Ranking" count={state.ranking.length} onClick={() => setDrawer('ranking')} />
          <DrawerKey icon={UsersThree} label="Gente" count={admin.users.length} onClick={() => setDrawer('gente')} />
          <DrawerKey icon={SlidersHorizontal} label="Ajustes" onClick={() => setDrawer('ajustes')} />
        </div>

        <div className="mt-3">
          {state.open ? (
            <ConfirmButton
              onConfirm={() => act('admin:night', { open: false }, 'Noche cerrada. Todo borrado.')}
              className="pulsador flex h-16 w-full items-center justify-center gap-3 bg-panel-2 font-display text-[16px]"
              armedChildren={<span>Se borra todo. ¿Cerrar?</span>}
            >
              <Power size={22} weight="bold" aria-hidden /> Cerrar la noche
            </ConfirmButton>
          ) : (
            <button
              onClick={() => act('admin:night', { open: true }, 'Barra abierta')}
              className="pulsador glass animate-breathe flex h-20 w-full items-center justify-center gap-3 font-display text-[20px]"
            >
              <Power size={26} weight="bold" aria-hidden /> Abrir la barra
            </button>
          )}
        </div>
      </div>

      <p className="mb-1 mt-3 flex items-center justify-center gap-2 text-[13px] text-mute">
        <span className={cx('size-2.5', connected ? 'bulb-on' : 'rounded-full bg-pink')} aria-hidden />
        {connected ? `${state.online} ${state.online === 1 ? 'conectado' : 'conectados'}, ronda ${state.round}` : 'Reconectando con el servidor'}
      </p>

      <RankingDrawer open={drawer === 'ranking'} onClose={() => setDrawer(null)} state={state} admin={admin} act={act} />
      <PeopleDrawer open={drawer === 'gente'} onClose={() => setDrawer(null)} admin={admin} act={act} />
      <SettingsDrawer open={drawer === 'ajustes'} onClose={() => setDrawer(null)} state={state} admin={admin} setSettings={setSettings} act={act} />
      <DoseModal dose={dose} mult={s.happyHour ? 2 : 1} onClose={() => setDose(null)} />
    </div>
  )
}

type Act = (ev: string, p?: object, ok?: string) => Promise<void>

function RankingDrawer({ open, onClose, state, admin, act }: { open: boolean; onClose: () => void; state: PublicState; admin: AdminFull; act: Act }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ranking">
      {state.locked && (
        <div className="glass mb-3 flex items-center gap-3 rounded-machine p-2.5">
          <Stamp tone="print">Después</Stamp>
          <p className="truncate text-[15px] font-[850]">{state.locked.track.title}</p>
        </div>
      )}
      {state.ranking.length === 0 ? (
        <p className="py-6 text-center text-[16px] text-mute">Nadie ha pedido nada todavía.</p>
      ) : (
        <ol className="bezel rounded-machine p-[3px]">
          <AnimatePresence initial={false}>
            {state.ranking.map((r, i) => (
              <motion.li
                key={r.id}
                layout
                exit={{ opacity: 0, x: 30 }}
                className="glass-dim flex items-center gap-2.5 border-b border-print/60 p-2 first:rounded-t-[4px] last:rounded-b-[4px] last:border-b-0"
              >
                <span className="w-6 text-center font-display text-[18px] text-cyan">{i + 1}</span>
                <img src={r.track.cover} alt="" className="size-11 rounded-[3px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[15px] font-[800] leading-tight [font-stretch:90%]">{r.track.title}</p>
                  <p className="truncate text-[13px] text-paper/65">
                    {r.by.alias}
                  </p>
                </div>
                <span className="led-well rounded-[4px] px-1.5 py-1">
                  <Led value={r.points} digits={3} className="text-[14px]" />
                </span>
                <ConfirmButton
                  onConfirm={() => act('admin:remove', { requestId: r.id }, 'Canción quitada')}
                  className="pulsador grid size-11 shrink-0 place-items-center bg-ink"
                  label={`Quitar ${r.track.title}`}
                  armedChildren={<span className="font-display text-[11px]">¿Sí?</span>}
                >
                  <X size={18} weight="bold" />
                </ConfirmButton>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}

      {admin.history.length > 0 && (
        <>
          <h3 className="mb-2 mt-6 font-display text-[16px]">Ha sonado</h3>
          <ul className="flex flex-col">
            {admin.history.slice(0, 12).map((h, i) => (
              <li key={`${h.track.id}-${h.playedAt}-${i}`} className="flex items-center gap-3 border-b border-line py-2 text-[14px]">
                <span className="w-11 shrink-0 tabular-nums text-mute">
                  {new Date(h.playedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{h.track.title}</span>
                <span className="shrink-0 text-[13px] text-mute">{h.by ? h.by.alias : 'Lista del bar'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}

function PeopleDrawer({ open, onClose, admin, act }: { open: boolean; onClose: () => void; admin: AdminFull; act: Act }) {
  return (
    <Sheet open={open} onClose={onClose} title="Gente">
      {admin.users.length === 0 ? (
        <p className="py-6 text-center text-[16px] text-mute">Todavía no ha entrado nadie.</p>
      ) : (
        <ul className="flex flex-col">
          {admin.users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 border-b border-line py-2">
              <span className="relative shrink-0">
                <Avatar user={u} size={44} ring="border-0" />
                {u.online && <span className="bulb-on absolute -right-0.5 -top-0.5 size-3" aria-label="Conectado" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold">{u.alias}</p>
                <p className="text-[13px] text-mute">{u.requests === 1 ? '1 canción pedida' : `${u.requests} canciones pedidas`}</p>
              </div>
              {u.photo && (
                <ConfirmButton
                  onConfirm={() => act('admin:photo', { userId: u.id }, `Foto de ${u.alias} quitada`)}
                  className="pulsador grid size-11 shrink-0 place-items-center bg-panel-2"
                  label={`Quitar la foto de ${u.alias}`}
                  armedChildren={<span className="text-[12px] font-bold">¿Quitar?</span>}
                >
                  <ImageBroken size={20} weight="bold" aria-hidden />
                </ConfirmButton>
              )}
              <ConfirmButton
                onConfirm={() => act('admin:ban', { userId: u.id }, `${u.alias} bloqueado`)}
                className="pulsador flex h-11 shrink-0 items-center gap-2 bg-panel-2 px-3 text-[14px] font-bold"
                label={`Bloquear a ${u.alias}`}
                armedChildren={<span>¿Bloquear?</span>}
              >
                <Prohibit size={18} weight="bold" aria-hidden /> Bloquear
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
      {admin.bannedCount > 0 && (
        <ConfirmButton
          onConfirm={() => act('admin:clearBans', {}, 'Bloqueos borrados')}
          className="pulsador mt-5 h-12 w-full bg-panel-2 text-[15px] font-bold"
          armedChildren={<span>¿Desbloquear a todos?</span>}
        >
          {admin.bannedCount === 1 ? '1 móvil bloqueado: desbloquear' : `${admin.bannedCount} móviles bloqueados: desbloquear`}
        </ConfirmButton>
      )}
    </Sheet>
  )
}

function SettingsDrawer({
  open,
  onClose,
  state,
  admin,
  setSettings,
}: {
  open: boolean
  onClose: () => void
  state: PublicState
  admin: AdminFull
  setSettings: (p: Partial<Settings>) => void
  act: Act
}) {
  const s = admin.settings
  return (
    <Sheet open={open} onClose={onClose} title="Ajustes" tall>
      <section className="bezel rounded-machine p-3">
        <div className="flex items-center gap-3">
          <SpotifyLogo size={28} weight="fill" className="text-[#1ed760]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">{admin.mock ? 'Simulador' : (admin.spotifyAccount ?? 'Sin cuenta conectada')}</p>
            <p className="text-[13px] text-mute">
              {state.spotify === 'ok' ? 'Conectado' : state.spotify === 'mock' ? 'Modo de pruebas' : state.spotify === 'no-device' ? 'Conectado, pero en pausa' : 'Sin conectar'}
            </p>
          </div>
          {!admin.mock && admin.spotifyConfigured && (
            <a
              href={`/auth/login?admin=${encodeURIComponent(session.adminToken ?? '')}`}
              className="pulsador grid h-11 place-items-center bg-[#1ed760] px-3 text-[13px] font-black text-print"
            >
              {state.spotify === 'disconnected' ? 'Conectar' : 'Cambiar'}
            </a>
          )}
        </div>
        <p className="mt-3 text-[13px] leading-snug text-paper/70">
          Pon el móvil en No molestar (si no, los avisos suenan por el altavoz) y no añadas canciones a mano a la cola de Spotify.
        </p>
      </section>

      <div className="mt-4">
        <Stepper label="La perdedora del duelo conserva (%)" value={Math.round(s.loserKeepPct * 100)} min={0} max={100} step={10} format={(v) => `${v}`} onChange={(v) => setSettings({ loserKeepPct: v / 100 })} />
        <Stepper label="Puntos por dosis" value={s.dosePoints} min={5} max={50} step={5} format={(v) => `${v}`} onChange={(v) => setSettings({ dosePoints: v })} />
        <Stepper label="Duración del duelo (s)" value={s.duelWindowMs / 1000} min={30} max={120} step={10} format={(v) => `${v}`} onChange={(v) => setSettings({ duelWindowMs: v * 1000 })} />
        <Stepper label="Espera tras sonar la tuya (min)" value={s.cooldownMs / 60_000} min={0} max={60} step={5} format={(v) => `${v}`} onChange={(v) => setSettings({ cooldownMs: v * 60_000 })} />
        <Stepper label="Canciones por persona y hora" value={s.maxPerHour} min={1} max={10} step={1} format={(v) => `${v}`} onChange={(v) => setSettings({ maxPerHour: v })} />
        <Stepper label="Partidas por ronda" value={s.energyPerRound} min={1} max={6} step={1} format={(v) => `${v}`} onChange={(v) => setSettings({ energyPerRound: v })} />
      </div>

      <button
        onClick={() => setSettings({ blockExplicit: !s.blockExplicit })}
        aria-pressed={s.blockExplicit}
        className="mt-2 flex w-full items-center justify-between gap-3 border-t border-line py-4 text-left"
      >
        <span>
          <span className="block text-[15px] font-bold">Bloquear canciones explícitas</span>
          <span className="block text-[13px] text-mute">Las marcadas con E en Spotify</span>
        </span>
        <span className={cx('pulsador grid h-9 w-16 shrink-0 place-items-center font-display text-[13px]', s.blockExplicit ? 'bg-amber text-print' : 'bg-panel-2')}>
          {s.blockExplicit ? 'Sí' : 'No'}
        </span>
      </button>

      <a href="/cartel" target="_blank" rel="noreferrer" className="pulsador bezel mt-4 flex h-14 items-center justify-center gap-3 font-display text-[15px]">
        <Printer size={22} weight="bold" aria-hidden /> Imprimir el cartel
      </a>
    </Sheet>
  )
}

/** QR de un solo uso para la consumición. Se cierra solo al canjearse. */
function DoseModal({
  dose,
  mult,
  onClose,
}: {
  dose: { code: string; points: number; expiresAt: number } | null
  mult: number
  onClose: () => void
}) {
  const [img, setImg] = useState<string | null>(null)
  const [status, setStatus] = useState<'pending' | 'used' | 'expired'>('pending')
  const now = useServerNow(4)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!dose) return
    setStatus('pending')
    const url = `${location.origin}/?dosis=${dose.code}`
    QRCode.toDataURL(url, { margin: 1, width: 640, color: { dark: '#06121a', light: '#f4f7fa' } })
      .then(setImg)
      .catch(() => setImg(null))
    const t = setInterval(async () => {
      try {
        const st = await adminEmit<'pending' | 'used' | 'expired' | 'unknown'>('admin:doseStatus', { code: dose.code })
        if (st === 'used') {
          setStatus('used')
          vibrate([30, 40, 60])
          clearInterval(t)
          setTimeout(() => closeRef.current(), 1600)
        } else if (st === 'expired' || st === 'unknown') {
          setStatus('expired')
          clearInterval(t)
        }
      } catch {
        /* reintenta */
      }
    }, 1500)
    return () => clearInterval(t)
  }, [dose])

  const left = dose ? Math.max(0, dose.expiresAt - now) : 0

  return (
    <AnimatePresence>
      {dose && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal
          aria-label="Dosis"
        >
          <motion.div
            initial={{ scale: 0.88, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="bezel w-full max-w-sm rounded-machine p-4"
          >
            <div className="flex items-center gap-3">
              <Pill size={30} weight="fill" className="text-cyan" aria-hidden />
              <p className="flex-1 font-display text-[22px] leading-none">Dosis</p>
              <span className="led-well rounded-[4px] px-2 py-1">
                <Led value={dose.points * mult} digits={2} className="text-[20px]" />
              </span>
              <span className="font-display text-[13px] text-amber">pts</span>
            </div>
            <div className="relative mt-4 overflow-hidden rounded-[4px] bg-paper p-4">
              {img && <img src={img} alt={`Código ${dose.code}`} className={cx('aspect-square w-full transition-opacity', status !== 'pending' && 'opacity-10')} />}
              <AnimatePresence>
                {status !== 'pending' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center">
                    <Stamp tone={status === 'used' ? 'print' : 'pink'} rotate={-8} className="bg-paper px-3 py-1 text-[28px]">
                      {status === 'used' ? '¡Canjeada!' : 'Caducada'}
                    </Stamp>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="font-mono text-[14px] font-bold tracking-[0.25em] text-paper/70">{dose.code}</p>
              {status === 'pending' && (
                <span className="flex items-center gap-2" aria-label="Tiempo para canjearla">
                  <Timer size={20} weight="bold" className="text-amber" aria-hidden />
                  <span className="led-well rounded-[4px] px-2 py-1">
                    <Led value={fmtTime(left)} className="text-[16px]" />
                  </span>
                </span>
              )}
            </div>
            <p className="mt-2 text-[14px] text-paper/70">Que lo escanee con la cámara del móvil.</p>
            <button onClick={onClose} className="pulsador mt-4 h-14 w-full bg-panel-2 font-display text-[16px]">
              Cerrar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
