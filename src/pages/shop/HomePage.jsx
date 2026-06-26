import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'
import WhatsAppButton from '../../components/shop/WhatsAppButton'
import ProductCard from '../../components/shop/ProductCard'
import HeroSection from '../../components/shop/HeroSection'

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

/* ── Pourquoi nous choisir ── */
const WHY_US = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    title: 'Livraison rapide',
    desc: 'Recevez vos commandes en 24 à 48h directement à votre porte.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Paiement sécurisé',
    desc: 'Transactions protégées. Paiement à la livraison disponible.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: 'Qualité garantie',
    desc: 'Produits sélectionnés avec soin. Satisfait ou remboursé.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: 'Support 7j/7',
    desc: 'Notre équipe est disponible pour vous aider à tout moment.',
  },
]

const PAGE_SIZE = 10

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [subError, setSubError] = useState('')
  const [page, setPage] = useState(1)

  const { data: allProductsData } = useQuery({
    queryKey: ['products-all', page],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to)
      return { products: data ?? [], total: count ?? 0 }
    },
  })

  const allProducts = allProductsData?.products ?? []
  const totalPages = Math.ceil((allProductsData?.total ?? 0) / PAGE_SIZE)

  const { data: promoProducts = [] } = useQuery({
    queryKey: ['products-promo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .not('promo_price', 'is', null)
        .order('created_at', { ascending: false })
        .limit(4)
      return data ?? []
    },
  })

  const { data: testimonials = [] } = useQuery({
    queryKey: ['testimonials-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('testimonials')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6)
      return data ?? []
    },
  })

  const subscribeMutation = useMutation({
    mutationFn: async (email) => {
      const { error } = await supabase.from('newsletter_subscribers').insert({ email })
      if (error) throw error
    },
    onSuccess: () => {
      setSubscribed(true)
      setEmail('')
      setSubError('')
    },
    onError: (err) => {
      if (err.message?.includes('unique') || err.code === '23505') {
        setSubError('Cet email est déjà inscrit.')
      } else {
        setSubError('Une erreur est survenue. Réessayez.')
      }
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['shop-stats'],
    queryFn: async () => {
      const [{ count: products }, { count: orders }] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
      ])
      return { products: products ?? 0, orders: orders ?? 0 }
    },
  })

  function handleNewsletter(e) {
    e.preventDefault()
    setSubError('')
    subscribeMutation.mutate(email)
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />
      <HeroSection />


      {/* ── Promotions ── */}
      {promoProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 mb-6 flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium uppercase tracking-wide">Offres spéciales</p>
              <h2 className="text-2xl font-black text-white">Promotions en cours 🔥</h2>
            </div>
            <Link to="/boutique" className="bg-white text-red-500 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors flex-shrink-0">
              Voir tout
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {promoProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── Tous les produits ── */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Nos produits</h2>
          <Link to="/boutique" className="text-primary text-sm font-medium hover:underline">Voir tout →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Précédent
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  n === page ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </section>

      {/* ── Pourquoi nous choisir ── */}
      <section className="bg-white border-y border-gray-100 py-14 mt-8">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Pourquoi nous choisir ?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {WHY_US.map((item, i) => (
              <div key={i} className="text-center group">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-3 gap-6">
          {[
            { value: stats?.products ?? '...', label: 'Produits disponibles' },
            { value: stats?.orders ?? '...', label: 'Commandes passées' },
            { value: '100%', label: 'Clients satisfaits' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-black text-primary mb-1">{stat.value}+</p>
              <p className="text-gray-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Témoignages ── */}
      {testimonials.length > 0 && (
        <section className="bg-gray-50 py-14">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Ce que disent nos clients</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <svg key={j} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      {t.avatar}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Newsletter ── */}
      <section className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Restez informé</h2>
        <p className="text-gray-500 mb-6 text-sm">Recevez nos offres exclusives et nouveautés directement dans votre boîte mail.</p>
        {subscribed ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4 text-green-700 font-medium">
            ✓ Merci pour votre inscription !
          </div>
        ) : (
          <>
            <form onSubmit={handleNewsletter} className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setSubError('') }}
                required
                placeholder="votre@email.com"
                className={`flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${subError ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button
                type="submit"
                disabled={subscribeMutation.isPending}
                className="bg-primary text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-primary-dark transition-colors flex-shrink-0 disabled:opacity-60"
              >
                {subscribeMutation.isPending ? '...' : "S'inscrire"}
              </button>
            </form>
            {subError && <p className="text-red-500 text-sm mt-2">{subError}</p>}
          </>
        )}
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  )
}
