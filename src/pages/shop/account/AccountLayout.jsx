import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import Navbar from '../../../components/shop/Navbar'

const navItems = [
  {
    to: '/mon-compte/commandes',
    label: 'Mes commandes',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: '/mon-compte/profil',
    label: 'Mon profil',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function AccountLayout() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null) // null = chargement

  useEffect(() => {
    if (!session) { setIsAdmin(false); return }
    supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false))
  }, [session])

  if (loading || isAdmin === null) return null
  if (!session) return <Navigate to="/connexion" state={{ from: '/mon-compte' }} replace />
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-4 border-b border-gray-100">
                <p className="text-xs text-gray-500">Connecté en tant que</p>
                <p className="text-sm font-medium text-gray-900 truncate">{session.user.email}</p>
              </div>
              <nav className="p-2 space-y-0.5">
                {navItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-primary'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="p-2 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Déconnexion
                </button>
              </div>
            </div>
          </aside>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
