import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../store/cartStore'
import { useAuth } from '../../hooks/useAuth'
import AnnouncementBar from './AnnouncementBar'

export default function Navbar() {
  const items = useCartStore(s => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: shopName = 'Boutique' } = useQuery({
    queryKey: ['shop-name'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'shop_name').single()
      return data?.value || 'Boutique'
    },
    staleTime: 60000,
  })

  const navLinkClass = ({ isActive }) =>
    `hover:text-gray-900 transition-colors ${isActive ? 'text-primary font-semibold' : ''}`

  return (
    <>
      <AnnouncementBar />
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">{shopName}</Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <NavLink to="/" end className={navLinkClass}>Accueil</NavLink>
            <NavLink to="/boutique" className={navLinkClass}>Catalogue</NavLink>
            <NavLink to="/a-propos" className={navLinkClass}>À propos</NavLink>
            <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
          </nav>

          <div className="flex items-center gap-4">
            {/* Compte */}
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

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-1 text-gray-600 hover:text-gray-900"
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <NavLink to="/" end className="block text-sm font-medium text-gray-700 py-1 hover:text-primary" onClick={() => setMenuOpen(false)}>Accueil</NavLink>
            <NavLink to="/boutique" className="block text-sm font-medium text-gray-700 py-1 hover:text-primary" onClick={() => setMenuOpen(false)}>Catalogue</NavLink>
            <NavLink to="/a-propos" className="block text-sm font-medium text-gray-700 py-1 hover:text-primary" onClick={() => setMenuOpen(false)}>À propos</NavLink>
            <NavLink to="/contact" className="block text-sm font-medium text-gray-700 py-1 hover:text-primary" onClick={() => setMenuOpen(false)}>Contact</NavLink>
            <div className="border-t border-gray-100 pt-3">
              {user ? (
                <NavLink to="/mon-compte/commandes" className="block text-sm font-medium text-gray-700 py-1 hover:text-primary" onClick={() => setMenuOpen(false)}>Mon compte</NavLink>

              ) : (
                <>
                  <NavLink to="/connexion" className="block text-sm font-medium text-gray-700 py-1 hover:text-primary" onClick={() => setMenuOpen(false)}>Connexion</NavLink>
                  <NavLink to="/inscription" className="block text-sm font-medium text-gray-700 py-1 hover:text-primary" onClick={() => setMenuOpen(false)}>Créer un compte</NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  )
}
