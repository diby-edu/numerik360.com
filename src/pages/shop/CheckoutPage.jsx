import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import useCartStore from '../../store/cartStore'
import { useAuth } from '../../hooks/useAuth'

async function fetchGuestCheckout() {
  const { data, error } = await supabase.from('settings').select('value').eq('key', 'guest_checkout').single()
  if (error || !data) return true   // par défaut : invités autorisés
  return data.value === 'true'
}

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

const PAYMENT_OPTIONS = [
  { value: 'cod', label: 'Paiement à la livraison', icon: '🚚', desc: 'Payez en espèces à la réception' },
  { value: 'paydunya', label: 'Payer en ligne', icon: '💳', desc: 'Wave, Orange Money, carte bancaire...' },
]

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { items, getTotal, clearCart } = useCartStore()
  const total = getTotal()
  const allNonPhysical = items.length > 0 && items.every(
    ({ product }) => product.product_type === 'digital' || product.product_type === 'service'
  )
  const { user, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [paymentMethod, setPaymentMethod] = useState('cod')
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

  const { data: waNumber = '' } = useQuery({
    queryKey: ['setting', 'whatsapp_number'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'whatsapp_number').single()
      return (data?.value || '').replace(/\D/g, '')
    },
    staleTime: 300000,
  })

  // Produits numériques → forcer paiement en ligne
  useEffect(() => {
    if (allNonPhysical) setPaymentMethod('paydunya')
  }, [allNonPhysical])

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
      const orderItems = items.map(({ product, quantity, variant }) => ({
        id: product.id,
        name: product.name,
        variant_id: variant?.id ?? null,
        variant_name: variant?.name ?? null,
        price: variant?.price ?? (product.promo_price && product.promo_price < product.price ? product.promo_price : product.price),
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
        const ctrl = new AbortController()
        const timeout = setTimeout(() => ctrl.abort(), 15000)
        let r
        try {
          r = await fetch('/api/paydunya/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.id,
              total,
              customerName: form.name,
              customerEmail: form.email,
              items: orderItems,
            }),
            signal: ctrl.signal,
          })
        } catch (fetchErr) {
          if (fetchErr.name === 'AbortError') {
            throw new Error('Le service de paiement ne répond pas. Veuillez réessayer ou choisir "Paiement à la livraison".')
          }
          throw new Error('Impossible de joindre le service de paiement. Vérifiez votre connexion.')
        } finally {
          clearTimeout(timeout)
        }
        const pd = await r.json()
        if (!r.ok) {
          const msg = pd.error || ''
          if (msg.includes('invalid') || msg.includes('clé') || msg.includes('key')) {
            throw new Error('Configuration paiement incorrecte. Contactez le support.')
          }
          if (msg.includes('montant') || msg.includes('amount')) {
            throw new Error('Montant invalide pour le paiement en ligne.')
          }
          throw new Error(msg || 'Erreur lors de la création du paiement. Réessayez ou choisissez "Paiement à la livraison".')
        }
        clearCart()
        window.location.href = pd.invoice_url
        return
      }

      // 2b. Livraison → envoyer emails + page succès (non-bloquant)
      fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: { ...payload, id: order.id } }),
      }).catch(() => {})

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
                {allNonPhysical ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">Produit numérique / service</span> — aucune adresse de livraison requise. Nous vous contacterons par téléphone ou email.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse de livraison *
                    </label>
                    <textarea id="address" name="address" value={form.address} onChange={handleChange} rows={3} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      placeholder="Quartier, rue, repère..." />
                  </div>
                )}
              </form>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Mode de paiement</h2>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.filter(opt => allNonPhysical ? opt.value === 'paydunya' : true).map(opt => (
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
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-2">
                <p className="text-sm text-red-700">{error}</p>
                {paymentMethod === 'paydunya' && waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Bonjour, je souhaite passer une commande (réf. #${Date.now().toString().slice(-6)}) d'un montant de ${formatPrice(total)}. Paiement en ligne indisponible.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white text-sm font-medium px-3 py-1.5 rounded-lg"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Commander via WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Récapitulatif */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20">
              <h2 className="font-semibold text-gray-900 mb-4">Récapitulatif</h2>
              <div className="space-y-3 mb-4">
                {items.map(({ product, quantity, variant }) => {
                  const price = variant?.price ?? (product.promo_price && product.promo_price < product.price ? product.promo_price : product.price)
                  const key = `${product.id}-${variant?.id ?? 'base'}`
                  return (
                    <div key={key} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 flex-1 pr-2 line-clamp-1">{product.name} × {quantity}</span>
                        <span className="font-medium text-gray-900 flex-shrink-0">{formatPrice(price * quantity)}</span>
                      </div>
                      {variant && (
                        <p className="text-xs text-gray-400 mt-0.5 pl-0">{variant.name}</p>
                      )}
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
                    <span>💳</span> Payer en ligne
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
