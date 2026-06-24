import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'

const START_OPTIONS = [
  { value: 'now', label: 'Dès maintenant' },
  { value: 'this_week', label: 'Cette semaine' },
  { value: 'this_month', label: 'Ce mois-ci' },
]
const CONTACT_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'phone', label: 'Appel téléphonique', icon: '📞' },
  { value: 'email', label: 'Email', icon: '✉️' },
]

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

export default function ServiceRequestPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const variantId = searchParams.get('variant')
  const navigate = useNavigate()

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_brief: '',
    start_preference: 'now',
    contact_preference: 'whatsapp',
  })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Charger le produit
  const { data: product } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return data
    },
  })

  // Charger les variantes
  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', product?.id],
    enabled: Boolean(product?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .order('sort_order')
      return data ?? []
    },
  })

  // Pré-remplir email si connecté
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setForm(f => ({ ...f, customer_email: user.email }))
    })
  }, [])

  const selectedVariant = variants.find(v => v.id === variantId) ?? variants[0] ?? null

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setError('Nom et téléphone sont obligatoires.')
      return
    }
    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('service_requests').insert({
        product_id: product?.id ?? null,
        product_name: product?.name ?? slug,
        variant_name: selectedVariant?.name ?? null,
        variant_price: selectedVariant?.price ?? null,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_email: form.customer_email.trim() || null,
        customer_brief: form.customer_brief.trim() || null,
        start_preference: form.start_preference,
        contact_preference: form.contact_preference,
        status: 'new',
      })
      if (insertError) throw insertError
      setSubmitted(true)
    } catch (err) {
      setError('Une erreur est survenue. Réessayez ou contactez-nous directement.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Succès ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Demande envoyée !</h1>
          <p className="text-gray-500 mb-2">
            Merci <strong>{form.customer_name}</strong>. Votre demande pour
          </p>
          <p className="text-blue-700 font-bold mb-1">{product?.name}</p>
          {selectedVariant && <p className="text-purple-600 font-semibold text-sm mb-4">Formule {selectedVariant.name}</p>}
          <p className="text-gray-500 mb-8">
            a bien été reçue. Nous vous contacterons sous <strong>24h</strong> via{' '}
            <strong>{CONTACT_OPTIONS.find(c => c.value === form.contact_preference)?.label}</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/boutique" className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">
              Continuer mes achats
            </Link>
            <Link to="/" className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
              Retour à l'accueil
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Formulaire ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Fil d'Ariane */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span>/</span>
          <Link to="/boutique" className="hover:text-primary">Catalogue</Link>
          <span>/</span>
          {product && <Link to={`/produit/${slug}`} className="hover:text-primary">{product.name}</Link>}
          {product && <span>/</span>}
          <span className="text-gray-900">Je suis intéressé</span>
        </nav>

        <div className="grid md:grid-cols-[1fr_300px] gap-6">

          {/* ── Formulaire principal ── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">

            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-5">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🛠️</div>
              <div>
                <h1 className="font-bold text-gray-900">Je suis intéressé par ce service</h1>
                <p className="text-xs text-gray-500 mt-0.5">Gratuit · Sans engagement · Nous vous répondons sous 24h</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Infos client */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom complet *</label>
                  <input
                    type="text"
                    value={form.customer_name}
                    onChange={e => set('customer_name', e.target.value)}
                    placeholder="Votre nom"
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Téléphone *</label>
                  <input
                    type="tel"
                    value={form.customer_phone}
                    onChange={e => set('customer_phone', e.target.value)}
                    placeholder="+221 77 000 00 00"
                    required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Email <span className="font-normal text-gray-400">(pour recevoir notre réponse)</span>
                </label>
                <input
                  type="email"
                  value={form.customer_email}
                  onChange={e => set('customer_email', e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Besoin */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Décrivez votre activité et vos objectifs <span className="font-normal text-gray-400">(recommandé)</span>
                </label>
                <textarea
                  rows={4}
                  value={form.customer_brief}
                  onChange={e => set('customer_brief', e.target.value)}
                  placeholder="Ex : J'ai une boutique de vêtements à Dakar. J'ai 800 abonnés sur Instagram mais peu de ventes en ligne. Je veux développer ma présence sur TikTok..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Ces informations nous permettent de mieux préparer votre accompagnement.</p>
              </div>

              {/* Délai */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Quand souhaitez-vous démarrer ?</label>
                <div className="grid grid-cols-3 gap-2">
                  {START_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('start_preference', opt.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border-2 ${
                        form.start_preference === opt.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact préféré */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Comment préférez-vous être contacté ?</label>
                <div className="grid grid-cols-3 gap-2">
                  {CONTACT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('contact_preference', opt.value)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border-2 flex items-center justify-center gap-1.5 ${
                        form.contact_preference === opt.value
                          ? opt.value === 'whatsapp'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Envoi en cours...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Envoyer ma demande — Gratuit</>
                )}
              </button>
              <p className="text-xs text-gray-400 text-center">Aucun paiement maintenant · Nous vous contactons sous 24h</p>
            </form>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">

            {/* Service sélectionné */}
            {product && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Service sélectionné</p>
                <p className="font-bold text-gray-900">{product.name}</p>
                {selectedVariant && (
                  <>
                    <p className="text-sm text-purple-700 font-semibold mt-1">{selectedVariant.name}</p>
                    <p className="text-xl font-black text-blue-700 mt-1">{formatPrice(selectedVariant.price)}</p>
                  </>
                )}
                <Link to={`/produit/${slug}`} className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                  ← Modifier la formule
                </Link>
              </div>
            )}

            {/* Comment ça marche */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Comment ça marche ?</h3>
              <div className="space-y-3">
                {[
                  { n: '1', title: 'Vous envoyez votre demande', sub: 'Gratuit, sans engagement' },
                  { n: '2', title: 'On vous contacte sous 24h', sub: 'Pour discuter de votre projet' },
                  { n: '3', title: 'Vous payez et on démarre', sub: 'Paiement sécurisé Wave / OM' },
                ].map(step => (
                  <div key={step.n} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {step.n}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <span className="text-xl">🛡️</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Satisfait ou remboursé</p>
                <p className="text-xs text-green-600 mt-0.5">Garantie 7 jours après démarrage</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
