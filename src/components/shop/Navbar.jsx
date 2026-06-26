import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../store/cartStore'
import useFavoritesStore from '../../store/favoritesStore'
import { useAuth } from '../../hooks/useAuth'
import AnnouncementBar from './AnnouncementBar'

export default function Navbar() {
  const items = useCartStore(s => s.items)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const favoriteIds = useFavoritesStore(s => s.ids)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  function handleSearch(e) {
    e.preventDefault()
    const q = searchVal.trim()
    if (q) navigate(`/boutique?q=${encodeURIComponent(q)}`)
    setSearchOpen(false)
    setSearchVal('')
  }

  const { data: shopName = 'Boutique' } = useQuery({
    queryKey: ['shop-name'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'shop_name').single()
      return data?.value || 'Boutique'
    },
    staleTime: 60000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-nav'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id,name,slug').order('name')
      return data ?? []
    },
    staleTime: 300000,
  })

  const navLinkClass = ({ isActive }) =>
    `hover:text-gray-900 transition-colors ${isActive ? 'text-primary font-semibold' : ''}`

  return (
    <>
      <AnnouncementBar />
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        {/* Barre de recherche déroulante */}
        {searchOpen && (
          <div className="border-b border-gray-100 bg-white px-4 py-2">
            <form onSubmit={handleSearch} className="max-w-lg mx-auto flex gap-2">
              <div className="relative flex-1">
                <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
                  placeholder="Rechercher un produit..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
                Rechercher
              </button>
              <button type="button" onClick={() => setSearchOpen(false)} className="text-gray-400 hover:text-gray-600 px-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary">{shopName}</Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600">
            <NavLink to="/" end className={navLinkClass}>Accueil</NavLink>
            <NavLink to="/boutique" className={navLinkClass}>Catalogue</NavLink>
            {categories.map(cat => (
              <NavLink key={cat.id} to={`/boutique?categorie=${cat.slug}`} className={navLinkClass}>
                {cat.name}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* Recherche */}
            <button
              onClick={() => setSearchOpen(o => !o)}
              className="text-gray-600 hover:text-primary transition-colors"
              aria-label="Rechercher"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Favoris */}
            <Link to="/favoris" className="relative text-gray-600 hover:text-primary transition-colors" aria-label="Favoris">
              <svg className="w-5 h-5" fill={favoriteIds.length > 0 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"
                style={favoriteIds.length > 0 ? { color: '#ef4444' } : {}}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {favoriteIds.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                  {favoriteIds.length}
                </span>
              )}
            </Link>

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

            {/* Contact */}
            <Link to="/contact" className="hidden sm:flex text-gray-600 hover:text-primary transition-colors" aria-label="Contact">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
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
            {categories.map(cat => (
              <NavLink key={cat.id} to={`/boutique?categorie=${cat.slug}`} className="block text-sm font-medium text-gray-700 py-1 hover:text-primary" onClick={() => setMenuOpen(false)}>
                {cat.name}
              </NavLink>
            ))}
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
