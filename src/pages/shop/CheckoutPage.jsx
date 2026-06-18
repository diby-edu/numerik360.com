import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import useCartStore from '../../store/cartStore'
import { useAuth } from '../../hooks/useAuth'

async function fetchGuestCheckout() {
  const { data } = await supabase.from('settings').select('value').eq('key', 'guest_checkout').single()
  return data?.value === 'true'
}

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

const PAYMENT_OPTIONS = [
  { value: 'delivery', label: 'À la livraison', icon: '🚚' },
  { value: 'wave', label: 'Wave', icon: '🌊' },
  { value: 'orange_money', label: 'Orange Money', icon: '🟠' },
]

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, total, clearCart } = useCartStore()
  const { user, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [paymentMethod, setPaymentMethod] = useState('delivery')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Lire le paramètre guest_checkout
  const { data: guestCheckoutAllowed, isLoading: settingLoading } = useQuery({
    queryKey: ['setting', 'guest_checkout'],
    queryFn: fetchGuestCheckout,
  })

  // Charger le profil si connecté pour pré-remplir
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      return data
    },
  })

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
      })
    }
  }, [profile])

  // Panier vide
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">Votre panier est vide.</p>
          <Link to="/boutique" className="text-primary hover:underline">Retour au catalogue</Link>
        </div>
      </div>
    )
  }

  // Attendre chargement auth + paramètre
  if (authLoading || settingLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  // Achat invité désactivé et utilisateur non connecté
  if (guestCheckoutAllowed === false && !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <svg className="w-12 h-12 text-primary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion requise</h2>
            <p className="text-gray-500 mb-6 text-sm">Vous devez être connecté pour finaliser votre commande.</p>
            <Link
              to="/connexion"
              state={{ from: '/checkout' }}
              className="block w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors text-center"
            >
              Se connecter
            </Link>
            <Link to="/inscription" state={{ from: '/checkout' }} className="block mt-3 text-sm text-primary hover:underline">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    )
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const orderItems = items.map(({ product, quantity }) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
      }))

      const payload = {
        customer_name: form.name.trim(),
        customer_phone: form.phone.trim(),
        customer_address: form.address.trim(),
        items: orderItems,
        total,
        payment_method: paymentMethod,
        status: 'pending',
        ...(user ? { user_id: user.id } : {}),
      }

      const { data, error } = await supabase.from('orders').insert(payload).select('id').single()
      if (error) throw error

      clearCart()
      navigate('/commande-confirmee', { state: { orderId: data.id } })
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Finaliser la commande</h1>

        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-sm text-blue-800">
            <Link to="/connexion" state={{ from: '/checkout' }} className="font-medium underline">Connectez-vous</Link>
            {' '}pour retrouver vos informations automatiquement et suivre vos commandes.
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-6">
          {/* Formulaire */}
          <div className="md:col-span-3 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Vos informations</h2>
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+221 77 000 00 00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de livraison *</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Quartier, rue, repère..."
                  />
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Mode de paiement</h2>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      paymentMethod === opt.value ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={() => setPaymentMethod(opt.value)}
                      className="text-primary"
                    />
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
            )}
          </div>

          {/* Récapitulatif */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
              <h2 className="font-semibold text-gray-900 mb-4">Récapitulatif</h2>
              <div className="space-y-3 mb-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 flex-1 pr-2 line-clamp-1">{product.name} × {quantity}</span>
                    <span className="font-medium text-gray-900 flex-shrink-0">{formatPrice(product.price * quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 pt-3 mb-5">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>
              <button
                type="submit"
                form="checkout-form"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Envoi en cours...' : 'Confirmer la commande'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
