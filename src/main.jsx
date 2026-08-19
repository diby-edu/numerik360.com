import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Rechargement automatique si un chunk Vite est introuvable après déploiement
function handleChunkError(msg) {
  if (
    typeof msg === 'string' && (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Unable to preload CSS')
    )
  ) {
    if (!sessionStorage.getItem('chunk-reload')) {
      sessionStorage.setItem('chunk-reload', '1')
      window.location.reload()
    }
    return true
  }
  return false
}

// Report des erreurs client vers le serveur (journalisées côté VPS).
// Plafonné à 10 par chargement de page pour ne pas inonder.
let _errCount = 0
function reportError(payload) {
  if (_errCount >= 10) return
  _errCount++
  try {
    fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ ...payload, url: location.href, ua: navigator.userAgent }),
    }).catch(() => {})
  } catch { /* ne jamais casser sur le report */ }
}

window.addEventListener('error', e => {
  if (handleChunkError(e.message)) return
  reportError({ type: 'error', message: String(e.message || '').slice(0, 500), source: e.filename, line: e.lineno })
})
window.addEventListener('unhandledrejection', e => {
  const msg = e.reason?.message || String(e.reason)
  if (handleChunkError(msg)) return
  reportError({ type: 'unhandledrejection', message: String(msg || '').slice(0, 500), stack: String(e.reason?.stack || '').slice(0, 1200) })
})

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
