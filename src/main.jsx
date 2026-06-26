import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

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
  }
}
window.addEventListener('error', e => handleChunkError(e.message))
window.addEventListener('unhandledrejection', e => handleChunkError(e.reason?.message))

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
