import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { supabase } from './lib/supabase'
import ThemeProvider from './components/ThemeProvider'

// HomePage chargée immédiatement (above the fold)
import HomePage from './pages/shop/HomePage'

// Toutes les autres pages en lazy (code splitting)
const ShopPage             = lazy(() => import('./pages/shop/ShopPage'))
const ProductPage          = lazy(() => import('./pages/shop/ProductPage'))
const CartPage             = lazy(() => import('./pages/shop/CartPage'))
const CheckoutPage         = lazy(() => import('./pages/shop/CheckoutPage'))
const ServiceRequestPage   = lazy(() => import('./pages/shop/ServiceRequestPage'))
const OrderSuccessPage     = lazy(() => import('./pages/shop/OrderSuccessPage'))
const LoginPage            = lazy(() => import('./pages/shop/LoginPage'))
const RegisterPage         = lazy(() => import('./pages/shop/RegisterPage'))
const AboutPage            = lazy(() => import('./pages/shop/AboutPage'))
const ContactPage          = lazy(() => import('./pages/shop/ContactPage'))
const FavoritesPage        = lazy(() => import('./pages/shop/FavoritesPage'))
const PrivacyPage          = lazy(() => import('./pages/shop/PrivacyPage'))
const TermsPage            = lazy(() => import('./pages/shop/TermsPage'))
const RgpdPage             = lazy(() => import('./pages/shop/RgpdPage'))
const NotFoundPage         = lazy(() => import('./pages/shop/NotFoundPage'))

const AccountLayout           = lazy(() => import('./pages/shop/account/AccountLayout'))
const AccountOrdersPage       = lazy(() => import('./pages/shop/account/AccountOrdersPage'))
const AccountProfilePage      = lazy(() => import('./pages/shop/account/AccountProfilePage'))
const AccountOrderDetailPage  = lazy(() => import('./pages/shop/account/AccountOrderDetailPage'))

const AdminLogin       = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLayout      = lazy(() => import('./pages/admin/AdminLayout'))
const DashboardPage    = lazy(() => import('./pages/admin/DashboardPage'))
const ProductsPage     = lazy(() => import('./pages/admin/ProductsPage'))
const ProductFormPage  = lazy(() => import('./pages/admin/ProductFormPage'))
const OrdersPage       = lazy(() => import('./pages/admin/OrdersPage'))
const CategoriesPage   = lazy(() => import('./pages/admin/CategoriesPage'))
const SettingsPage     = lazy(() => import('./pages/admin/SettingsPage'))
const AttributesPage   = lazy(() => import('./pages/admin/AttributesPage'))
const TestimonialsPage = lazy(() => import('./pages/admin/TestimonialsPage'))
const NewsletterPage   = lazy(() => import('./pages/admin/NewsletterPage'))

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
)

function useIsAdmin(session) {
  const [isAdmin, setIsAdmin] = useState(null) // null = en cours

  useEffect(() => {
    let active = true
    if (session === undefined) { setIsAdmin(null); return }
    if (!session) { setIsAdmin(false); return }
    setIsAdmin(null)
    supabase.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => { if (active) setIsAdmin(data?.is_admin ?? false) })
    return () => { active = false }
  }, [session?.user?.id, session === undefined])

  return isAdmin
}

function ProtectedAdminRoute({ session, children }) {
  const isAdmin = useIsAdmin(session)
  if (session === null || isAdmin === false) return <Navigate to="/admin/login" replace />
  if (session === undefined || isAdmin === null) return null
  return children
}

// BUG-11 : ne rediriger vers le dashboard QUE si l'utilisateur est réellement admin
// (sinon un client connecté bouclait entre /admin/login et /admin/dashboard).
function AdminLoginRoute({ session }) {
  const isAdmin = useIsAdmin(session)
  if (session === undefined || (session && isAdmin === null)) return null
  if (session && isAdmin) return <Navigate to="/admin/dashboard" replace />
  return <AdminLogin />
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route element={<ThemeProvider />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/boutique" element={<ShopPage />} />
              <Route path="/produit/:slug" element={<ProductPage />} />
              <Route path="/panier" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/demande-service/:slug" element={<ServiceRequestPage />} />
              <Route path="/commande-confirmee" element={<OrderSuccessPage />} />
              <Route path="/connexion" element={<LoginPage />} />
              <Route path="/inscription" element={<RegisterPage />} />
              <Route path="/a-propos" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/favoris" element={<FavoritesPage />} />
              <Route path="/confidentialite" element={<PrivacyPage />} />
              <Route path="/conditions" element={<TermsPage />} />
              <Route path="/rgpd" element={<RgpdPage />} />

              <Route path="/mon-compte" element={<AccountLayout />}>
                <Route index element={<Navigate to="/mon-compte/commandes" replace />} />
                <Route path="commandes" element={<AccountOrdersPage />} />
                <Route path="commandes/:id" element={<AccountOrderDetailPage />} />
                <Route path="profil" element={<AccountProfilePage />} />
              </Route>
            </Route>

            <Route path="/admin/login" element={<AdminLoginRoute session={session} />} />
            <Route path="/admin" element={
              <ProtectedAdminRoute session={session}>
                <AdminLayout />
              </ProtectedAdminRoute>
            }>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="produits" element={<ProductsPage />} />
              <Route path="produits/nouveau" element={<ProductFormPage />} />
              <Route path="produits/:id/modifier" element={<ProductFormPage />} />
              <Route path="commandes" element={<OrdersPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="temoignages" element={<TestimonialsPage />} />
              <Route path="newsletter" element={<NewsletterPage />} />
              <Route path="attributs" element={<AttributesPage />} />
              <Route path="parametres" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </HelmetProvider>
  )
}
