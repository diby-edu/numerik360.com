import { Link } from 'react-router-dom'
import useCartStore from '../../store/cartStore'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
  const items = useCartStore(s => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const { user } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary">Boutique</Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link to="/" className="hover:text-gray-900 transition-colors">Accueil</Link>
          <Link to="/boutique" className="hover:text-gray-900 transition-colors">Catalogue</Link>
        </nav>

        <div className="flex items-center gap-4">
          {/* Compte client */}
          {user ? (
            <Link
              to="/mon-compte/commandes"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mon compte
            </Link>
          ) : (
            <Link
              to="/connexion"
              className="hidden sm:block text-sm font-medium text-gray-600 hover:text-primary transition-colors"
            >
              Connexion
            </Link>
          )}

          {/* Panier */}
          <Link to="/panier" className="relative flex items-center gap-1.5 text-gray-700 hover:text-primary transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
