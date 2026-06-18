import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  { value: 'delivery', label: 'Paiement à la livraison', icon: '🚚', desc: 'Payez en espèces à la réception' },
  { value: 'paydunya', label: 'PayDunya', icon: '💳', desc: 'Wave, Orange Money, carte bancaire...' },
]

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { items, total, clearCart } = useCartStore()
  const { user, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [paymentMethod, setPaymentMethod] = useState('delivery')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Paiement annulé depuis PayDunya
  const paymentCancelled = searchParams.get('payment') === 'annule'

  const { data: guestCheckoutAllowed, isLoading: settingLoading } = useQuery({
    queryKey: ['setting', 'guest_checkout'],
    queryFn: fetchGuestCheckout,
  })

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      return data
    },
  })

  useEffect(() => {
    if (profile) {
      setForm(f => ({
        ...f,
        name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
        email: user?.email ?? '',
      }))
    } else if (user) {
      setForm(f => ({ ...f, email: user.email ?? '' }))
    }
  }, [profile, user])

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
            <Link to="/connexion" state={{ from: '/checkout' }} className="block w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors text-center">
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
        price: product.promo_price && product.promo_price < product.price ? product.promo_price : product.price,
        quantity,
      }))

      // 1. Créer la commande dans Supabase
      const payload = {
        customer_name: form.name.trim(),
        customer_email: form.email.trim() || null,
        customer_phone: form.phone.trim(),
        customer_address: form.address.trim(),
        items: orderItems,
        total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'paydunya' ? 'pending' : 'cod',
        status: 'pending',
        ...(user ? { user_id: user.id } : {}),
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(payload)
        .select('id')
        .single()
      if (orderError) throw orderError

      // 2a. PayDunya → rediriger vers la page de paiement
      if (paymentMethod === 'paydunya') {
        const r = await fetch('/api/paydunya/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            total,
            customerName: form.name,
            customerEmail: form.email,
            items: orderItems,
          }),
        })
        const pd = await r.json()
        if (!r.ok) throw new Error(pd.error || 'Erreur PayDunya')
        clearCart()
        window.location.href = pd.invoice_url
        return
      }

      // 2b. Livraison → envoyer emails + page succès
      await fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: { ...payload, id: order.id } }),
      })

      clearCart()
      navigate('/commande-confirmee', { state: { orderId: order.id } })
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.')
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

        {paymentCancelled && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-5 text-sm text-orange-800">
            Le paiement a été annulé. Vous pouvez réessayer ou choisir un autre mode de paiement.
          </div>
        )}

        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-sm text-blue-800">
            <Link to="/connexion" state={{ from: '/checkout' }} className="font-medium underline">Connectez-vous</Link>
            {' '}pour retrouver vos informations automatiquement.
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-6">
          {/* Formulaire */}
          <div className="md:col-span-3 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Vos informations</h2>
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Votre nom" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                    <input type="tel" name="phone" value={form.phone} onChange={handleChange} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="+221 77 000 00 00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                    <span className="text-gray-400 font-normal ml-1">(pour recevoir la confirmation)</span>
                  </label>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="votre@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de livraison *</label>
                  <textarea name="address" value={form.address} onChange={handleChange} required rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Quartier, rue, repère..." />
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Mode de paiement</h2>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      paymentMethod === opt.value ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input type="radio" name="payment" value={opt.value} checked={paymentMethod === opt.value}
                      onChange={() => setPaymentMethod(opt.value)} className="text-primary" />
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
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
                {items.map(({ product, quantity }) => {
                  const price = product.promo_price && product.promo_price < product.price ? product.promo_price : product.price
                  return (
                    <div key={product.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 flex-1 pr-2 line-clamp-1">{product.name} × {quantity}</span>
                      <span className="font-medium text-gray-900 flex-shrink-0">{formatPrice(price * quantity)}</span>
                    </div>
                  )
                })}
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
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {paymentMethod === 'paydunya' ? 'Redirection...' : 'Envoi en cours...'}
                  </>
                ) : paymentMethod === 'paydunya' ? (
                  <>
                    <span>💳</span> Payer avec PayDunya
                  </>
                ) : (
                  'Confirmer la commande'
                )}
              </button>
              {paymentMethod === 'paydunya' && (
                <p className="text-xs text-center text-gray-400 mt-2">Vous serez redirigé vers PayDunya pour finaliser le paiement</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
