import { Component } from 'react'

// Attrape les erreurs de rendu React : affiche un écran propre au lieu
// d'une page blanche, et signale l'erreur au serveur (journalisée côté VPS).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          type: 'react',
          message: String(error?.message || error).slice(0, 500),
          stack: String(error?.stack || '').slice(0, 1500),
          component: String(info?.componentStack || '').slice(0, 1000),
          url: location.href,
          ua: navigator.userAgent,
        }),
      }).catch(() => {})
    } catch { /* ne jamais casser sur le report */ }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center', background: '#f6f7f9' }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>😕</div>
          <h1 style={{ fontSize: 22, margin: '0 0 8px', color: '#0e141f' }}>Une erreur est survenue</h1>
          <p style={{ color: '#5a6577', margin: '0 0 20px' }}>
            Désolé, quelque chose s'est mal passé. Vous pouvez recharger la page ou revenir à l'accueil.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => location.reload()} style={{ background: '#fff', border: '1px solid #c9d0da', color: '#0e141f', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
              Recharger
            </button>
            <a href="/" style={{ background: '#2563EB', color: '#fff', padding: '10px 18px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>
              Accueil
            </a>
          </div>
        </div>
      </div>
    )
  }
}
