import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import { ClientApp } from './client/ClientApp.tsx'
import { Toasts } from './components/Toasts.tsx'

// El panel y el cartel solo los abre la dueña: se cargan aparte
const AdminApp = lazy(() => import('./admin/AdminApp.tsx').then((m) => ({ default: m.AdminApp })))
const Poster = lazy(() => import('./Poster.tsx').then((m) => ({ default: m.Poster })))

const path = location.pathname.replace(/\/+$/, '')
const Page = path === '/admin' ? AdminApp : path === '/cartel' ? Poster : ClientApp

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Suspense fallback={null}>
        <Page />
      </Suspense>
      <Toasts />
    </MotionConfig>
  </StrictMode>,
)
