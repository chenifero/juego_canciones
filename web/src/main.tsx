import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import { ClientApp } from './client/ClientApp.tsx'
import { RotateLock } from './components/RotateLock.tsx'
import { Toasts } from './components/Toasts.tsx'
import { printConsoleSignature } from './lib/consoleSignature.ts'

// El panel y el cartel solo los abre la dueña: se cargan aparte
const AdminApp = lazy(() => import('./admin/AdminApp.tsx').then((m) => ({ default: m.AdminApp })))
const Poster = lazy(() => import('./Poster.tsx').then((m) => ({ default: m.Poster })))

printConsoleSignature()

const path = location.pathname.replace(/\/+$/, '')
const Page = path === '/admin' ? AdminApp : path === '/cartel' ? Poster : ClientApp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Suspense fallback={null}>
        <Page />
      </Suspense>
      <Toasts />
      {/* El cartel se ve en el ordenador para imprimirlo: ahí no se bloquea el giro */}
      {Page !== Poster && <RotateLock />}
    </MotionConfig>
  </StrictMode>,
)
