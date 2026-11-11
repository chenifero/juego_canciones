import { useEffect, useState } from 'react'
import { session } from '../lib/socket.ts'
import { connect, useStore } from '../lib/store.ts'
import { Home } from './Home.tsx'
import { Closed, Join, Splash } from './Screens.tsx'

/** Lee ?dosis=CODIGO (el QR que enseña la dueña) y lo quita de la URL. */
function takeDoseFromUrl(): string | null {
  const params = new URLSearchParams(location.search)
  const code = params.get('dosis')
  if (code) {
    params.delete('dosis')
    const qs = params.toString()
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`)
  }
  return code ? code.toUpperCase().slice(0, 16) : null
}

export function ClientApp() {
  const { state, me, connected, expired } = useStore()
  const [doseCode, setDoseCode] = useState(takeDoseFromUrl)

  useEffect(() => {
    connect()
  }, [])

  if (!state) return <Splash />
  if (!state.open) return <Closed />
  if (!me) {
    if (session.token && !expired) return <Splash text="Entrando…" />
    return <Join banned={!!expired?.banned} />
  }
  return <Home state={state} me={me} connected={connected} doseCode={doseCode} clearDose={() => setDoseCode(null)} />
}
