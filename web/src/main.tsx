import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import { ClientApp } from './client/ClientApp.tsx'
import { RotateLock } from './components/RotateLock.tsx'
import { Toasts } from './components/Toasts.tsx'
import { printConsoleSignature } from './lib/consoleSignature.ts'

// El panel solo lo abre la dueña: se carga aparte
const AdminApp = lazy(() => import('./admin/AdminApp.tsx').then((m) => ({ default: m.AdminApp })))

printConsoleSignature()

const path = location.pathname.replace(/\/+$/, '')
const Page = path === '/admin' ? AdminApp : ClientApp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Suspense fallback={null}>
        <Page />
      </Suspense>
      <Toasts />
      <RotateLock />
    </MotionConfig>
  </StrictMode>,
)
