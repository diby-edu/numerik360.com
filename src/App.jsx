import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Theme
import ThemeProvider from './components/ThemeProvider'

// Pages boutique
import HomePage from './pages/shop/HomePage'
import ShopPage from './pages/shop/ShopPage'
import ProductPage from './pages/shop/ProductPage'
import CartPage from './pages/shop/CartPage'
import CheckoutPage from './pages/shop/CheckoutPage'
import ServiceRequestPage from './pages/shop/ServiceRequestPage'
import OrderSuccessPage from './pages/shop/OrderSuccessPage'
import LoginPage from './pages/shop/LoginPage'
import RegisterPage from './pages/shop/RegisterPage'
import AboutPage from './pages/shop/AboutPage'
import ContactPage from './pages/shop/ContactPage'
import FavoritesPage from './pages/shop/FavoritesPage'
import PrivacyPage from './pages/shop/PrivacyPage'
import TermsPage from './pages/shop/TermsPage'
import RgpdPage from './pages/shop/RgpdPage'

// Espace client
import AccountLayout from './pages/shop/account/AccountLayout'
import AccountOrdersPage from './pages/shop/account/AccountOrdersPage'
import AccountProfilePage from './pages/shop/account/AccountProfilePage'

// Pages admin
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import DashboardPage from './pages/admin/DashboardPage'
import ProductsPage from './pages/admin/ProductsPage'
import ProductFormPage from './pages/admin/ProductFormPage'
import OrdersPage from './pages/admin/OrdersPage'
import CategoriesPage from './pages/admin/CategoriesPage'
import SettingsPage from './pages/admin/SettingsPage'
import AttributesPage from './pages/admin/AttributesPage'
import TestimonialsPage from './pages/admin/TestimonialsPage'
import NewsletterPage from './pages/admin/NewsletterPage'

// Espace client - détail commande
import AccountOrderDetailPage from './pages/shop/account/AccountOrderDetailPage'

function ProtectedAdminRoute({ session, children }) {
  if (session === null) return <Navigate to="/admin/login" replace />
  if (session === undefined) return null
  return children
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
    <BrowserRouter>
      <Routes>
        {/* Boutique — ThemeProvider applique le thème choisi dans l'admin */}
        <Route element={<ThemeProvider />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/boutique" element={<ShopPage />} />
          <Route path="/produit/:slug" element={<ProductPage />} />
          <Route path="/panier" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/demande-service/:slug" element={<ServiceRequestPage />} />
          <Route path="/commande-confirmee" element={<OrderSuccessPage />} />

          {/* Auth client */}
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/a-propos" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/favoris" element={<FavoritesPage />} />
          <Route path="/confidentialite" element={<PrivacyPage />} />
          <Route path="/conditions" element={<TermsPage />} />
          <Route path="/rgpd" element={<RgpdPage />} />

          {/* Espace client */}
          <Route path="/mon-compte" element={<AccountLayout />}>
            <Route index element={<Navigate to="/mon-compte/commandes" replace />} />
            <Route path="commandes" element={<AccountOrdersPage />} />
            <Route path="commandes/:id" element={<AccountOrderDetailPage />} />
            <Route path="profil" element={<AccountProfilePage />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={
          session ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />
        } />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
