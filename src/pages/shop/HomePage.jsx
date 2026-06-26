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

const PAGE_SIZE = 10

/* ── Univers métiers ── */
const UNIVERS = [
  {
    slug: 'developpement-web-mobile',
    label: 'Développement & IA',
    desc: 'Sites web, applications sur mesure et agents IA intelligents pour automatiser votre business.',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    services: ['Création de site web', "Application sur mesure", "Agent IA personnalisé"],
    accent: '#93c5fd',
  },
  {
    slug: 'logiciels-licences',
    label: 'Logiciels & Licences',
    desc: 'Licences Windows, Office, Adobe Creative Cloud livrées par email en moins de 24h.',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #8b5cf6 100%)',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    services: ['Windows 10/11', 'Microsoft Office', 'Adobe Creative Cloud'],
    accent: '#c4b5fd',
  },
  {
    slug: 'import-commerce',
    label: 'Import & Commerce',
    desc: 'Sourcing Alibaba, import-export Chine–Afrique–France. Vos marchandises, sans frontières.',
    gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    services: ['Sourcing Alibaba', 'Import Chine–Afrique', 'Logistique & dédouanement'],
    accent: '#fcd34d',
  },
  {
    slug: 'marketing-communication',
    label: 'Marketing Digital',
    desc: 'Réseaux sociaux, campagnes publicitaires, communication digitale pour booster votre visibilité.',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    services: ['Gestion réseaux sociaux', 'Publicité Facebook/Instagram', 'Stratégie digitale'],
    accent: '#6ee7b7',
  },
]

/* ── Étapes "Comment ça marche" ── */
const STEPS = [
  {
    num: '01',
    title: 'Choisissez votre offre',
    desc: 'Parcourez nos services, logiciels et produits. Chaque offre dispose de formules adaptées à votre budget.',
    color: '#2563eb',
  },
  {
    num: '02',
    title: 'Envoyez votre demande',
    desc: 'Pour les services, remplissez notre formulaire en 2 minutes. Pour les licences, ajoutez au panier et payez en ligne.',
    color: '#7c3aed',
  },
  {
    num: '03',
    title: 'On s\'occupe de tout',
    desc: 'Notre équipe vous contacte sous 24h. Licences livrées par email, services démarrés après validation.',
    color: '#059669',
  },
]

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
        .limit(5)
      return data ?? []
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

  const subscribeMutation = useMutation({
    mutationFn: async (email) => {
      const { error } = await supabase.from('newsletter_subscribers').insert({ email })
      if (error) throw error
    },
    onSuccess: () => { setSubscribed(true); setEmail(''); setSubError('') },
    onError: (err) => {
      setSubError(err.message?.includes('unique') || err.code === '23505'
        ? 'Cet email est déjà inscrit.'
        : 'Une erreur est survenue. Réessayez.')
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

      {/* ══════════════════════════════════════
          NOS UNIVERS
      ══════════════════════════════════════ */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-primary text-sm font-bold uppercase tracking-widest mb-3">Ce que nous faisons</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">4 expertises, 1 partenaire</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Du digital au commerce international — des solutions concrètes pour entrepreneurs, PME et particuliers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {UNIVERS.map((u) => (
              <Link key={u.slug} to={`/boutique?categorie=${u.slug}`}
                className="group relative rounded-2xl overflow-hidden flex flex-col min-h-[320px] hover:scale-[1.02] transition-transform duration-300 cursor-pointer">

                {/* Fond gradient */}
                <div className="absolute inset-0" style={{ background: u.gradient }} />

                {/* Pattern décoratif */}
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '28px 28px',
                  }} />

                {/* Blob lumineux */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl opacity-30"
                  style={{ background: u.accent }} />

                <div className="relative z-10 p-7 flex flex-col h-full">
                  {/* Icône */}
                  <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white mb-5
                    group-hover:bg-white/25 transition-colors">
                    {u.icon}
                  </div>

                  {/* Titre */}
                  <h3 className="text-white font-black text-xl mb-2">{u.label}</h3>
                  <p className="text-white/75 text-sm leading-relaxed mb-5">{u.desc}</p>

                  {/* Liste services */}
                  <ul className="mt-auto space-y-1.5">
                    {u.services.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-medium"
                        style={{ color: u.accent }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>

                  {/* Arrow */}
                  <div className="mt-5 flex items-center gap-1 text-white/60 text-xs font-semibold group-hover:text-white group-hover:gap-2 transition-all">
                    Voir les offres
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          COMMENT ÇA MARCHE
      ══════════════════════════════════════ */}
      <section className="bg-gray-950 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">Simple & rapide</p>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Comment ça marche ?</h2>
            <p className="text-gray-400 max-w-lg mx-auto">
              En 3 étapes seulement, de votre besoin à la livraison.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Ligne de connexion */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 opacity-30" />

            {STEPS.map((step, i) => (
              <div key={i} className="relative text-center group">
                {/* Numéro */}
                <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center font-black text-2xl text-white relative"
                  style={{
                    background: `${step.color}22`,
                    border: `2px solid ${step.color}44`,
                    color: step.color,
                  }}>
                  {step.num}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ boxShadow: `0 0 30px ${step.color}40` }} />
                </div>
                <h3 className="text-white font-bold text-lg mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14">
            <Link to="/contact"
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-8 py-4 rounded-2xl hover:bg-gray-100 transition-colors text-sm">
              Démarrer un projet
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PROMOTIONS
      ══════════════════════════════════════ */}
      {promoProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="rounded-2xl p-6 mb-8 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
            <div>
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Offres limitées</p>
              <h2 className="text-2xl font-black text-white mt-1">Promotions en cours</h2>
            </div>
            <Link to="/boutique"
              className="bg-white text-red-500 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-red-50 transition-colors flex-shrink-0">
              Tout voir →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {promoProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════
          TOUS NOS PRODUITS
      ══════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">Catalogue complet</p>
            <h2 className="text-2xl font-black text-gray-900">Nos produits & services</h2>
          </div>
          <Link to="/boutique" className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
            Voir tout
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allProducts.map(p => <ProductCard key={p.id} product={p} />)}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Précédent
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                  n === page ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Suivant →
            </button>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════
          STATS BAND
      ══════════════════════════════════════ */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: `${stats?.products ?? '…'}+`, label: 'Produits & services', icon: '📦' },
            { value: `${stats?.orders ?? '…'}+`, label: 'Commandes traitées', icon: '✅' },
            { value: '3',                          label: 'Pays couverts',       icon: '🌍' },
            { value: '24h',                        label: 'Livraison numérique', icon: '⚡' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <p className="text-3xl font-black text-primary mb-1">{s.value}</p>
              <p className="text-gray-500 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden py-24 px-4"
        style={{ background: 'linear-gradient(-45deg, #0f172a, #1e3a8a, #1d4ed8, #0f172a)', backgroundSize: '400% 400%', animation: 'gradient-shift 10s ease infinite' }}>

        {/* Blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #0ea5e9, transparent)' }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="text-blue-300 text-sm font-bold uppercase tracking-widest mb-4">Prêt à démarrer ?</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Votre projet commence
            <span style={{
              background: 'linear-gradient(90deg, #93c5fd, #c4b5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}> ici.</span>
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Que vous ayez besoin d'un site web, d'un agent IA, d'une licence logicielle ou d'un import depuis la Chine — nous avons la solution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-900 font-bold px-10 py-4 rounded-2xl text-lg hover:scale-105 transition-transform"
              style={{ boxShadow: '0 0 40px rgba(255,255,255,0.2)' }}>
              Nous contacter
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </Link>
            <Link to="/boutique"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-10 py-4 rounded-2xl text-lg hover:bg-white/10 transition-colors">
              Voir le catalogue
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          NEWSLETTER
      ══════════════════════════════════════ */}
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
              <button type="submit" disabled={subscribeMutation.isPending}
                className="bg-primary text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-primary-dark transition-colors flex-shrink-0 disabled:opacity-60">
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
