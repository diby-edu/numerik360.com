import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

async function fetchHeroSettings() {
  const keys = ['hero_mode', 'hero_video_url', 'hero_slides', 'hero_title', 'hero_subtitle']
  const { data } = await supabase.from('settings').select('key, value').in('key', keys)
  return Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
}

/* ── Hero par défaut ── */
function DefaultHero({ title, subtitle }) {
  return (
    <section
      className="text-white"
      style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
        <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'var(--hero-accent)' }}>
          {subtitle}
        </p>
        <Link
          to="/boutique"
          className="inline-block bg-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all shadow-lg"
          style={{ color: 'var(--hero-from)' }}
        >
          Voir les produits
        </Link>
      </div>
    </section>
  )
}

/* ── Hero animé CSS ── */
function AnimationHero({ title, subtitle }) {
  const particles = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
    id: i,
    size: (((i * 7 + 3) % 5) + 2),
    x: (i * 17 + 5) % 100,
    y: (i * 13 + 10) % 100,
    duration: (((i * 3 + 8) % 10) + 8),
    delay: (i * 0.4) % 5,
    shape: i % 3,
  })), [])

  const sparks = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: (i * 23 + 10) % 90,
    y: (i * 19 + 5) % 80,
    delay: i * 0.7,
    size: i % 2 === 0 ? 12 : 8,
  })), [])

  return (
    <section className="relative overflow-hidden text-white min-h-[620px] flex items-center">
      {/* Fond gradient multi-couleurs animé */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(-45deg, #0f172a, #1e3a8a, #1d4ed8, #0ea5e9, #6366f1, #1e3a8a)',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 8s ease infinite',
      }} />

      {/* Grille animée */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        animation: 'grid-scroll 8s linear infinite',
      }} />

      {/* Particules flottantes */}
      {particles.map(p => (
        <div key={p.id} className="absolute pointer-events-none" style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.shape === 0 ? `${p.size}px` : undefined,
          height: p.shape === 0 ? `${p.size}px` : undefined,
          fontSize: p.shape !== 0 ? `${p.size + 6}px` : undefined,
          borderRadius: p.shape === 0 ? '50%' : undefined,
          background: p.shape === 0 ? 'rgba(255,255,255,0.5)' : undefined,
          color: 'rgba(255,255,255,0.4)',
          animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
        }}>
          {p.shape === 0 ? '' : p.shape === 1 ? '✦' : '◆'}
        </div>
      ))}

      {/* Sparks / flash */}
      {sparks.map(s => (
        <div key={s.id} className="absolute pointer-events-none" style={{
          left: `${s.x}%`,
          top: `${s.y}%`,
          fontSize: `${s.size}px`,
          color: '#93c5fd',
          animation: `sparkle ${2 + s.delay * 0.5}s ease-in-out ${s.delay}s infinite`,
        }}>★</div>
      ))}

      {/* Blob violet */}
      <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
        animation: 'blob-move 12s ease-in-out infinite',
      }} />
      {/* Blob cyan */}
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)',
        animation: 'blob-move 15s ease-in-out 2s infinite reverse',
      }} />
      {/* Blob central subtil */}
      <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        animation: 'pulse-ring 6s ease-in-out infinite',
      }} />

      {/* Contenu */}
      <div className="max-w-6xl mx-auto px-4 py-20 text-center relative z-10 w-full">

        {/* Badge animé */}
        <div style={{ animation: 'fadeUp 0.6s ease forwards', opacity: 0 }}
          className="inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-sm font-semibold">
          <span style={{ animation: 'flash-in 2s ease-in-out infinite' }}>✦</span>
          Votre partenaire digital — Afrique &amp; France
          <span style={{ animation: 'flash-in 2s ease-in-out 1s infinite' }}>✦</span>
        </div>

        {/* Titre avec effet shimmer */}
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight"
          style={{ animation: 'fadeUp 0.8s ease 0.15s forwards', opacity: 0 }}>
          <span style={{
            background: 'linear-gradient(90deg, #ffffff 0%, #bfdbfe 30%, #ffffff 50%, #c7d2fe 70%, #ffffff 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'shimmer 4s linear 1s infinite',
          }}>
            {title}
          </span>
        </h1>

        {/* Sous-titre */}
        <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed text-white/75"
          style={{ animation: 'fadeUp 0.8s ease 0.3s forwards', opacity: 0 }}>
          {subtitle}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center"
          style={{ animation: 'fadeUp 0.8s ease 0.45s forwards', opacity: 0 }}>
          <Link to="/boutique"
            className="relative inline-block bg-white font-bold px-10 py-4 rounded-2xl text-lg hover:scale-105 transition-transform overflow-hidden group"
            style={{
              color: '#1e3a8a',
              animation: 'glow-pulse 3s ease-in-out infinite',
            }}>
            <span className="relative z-10">Voir les produits →</span>
            {/* shimmer sweep on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-blue-100/60 to-transparent" />
          </Link>
          <Link to="/contact"
            className="inline-block border-2 border-white/30 text-white font-semibold px-10 py-4 rounded-2xl text-lg hover:bg-white/10 hover:border-white/60 transition-all backdrop-blur-sm">
            Nous contacter
          </Link>
        </div>

        {/* Stats inline dans le hero */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-16 mt-16 pt-12 border-t border-white/10"
          style={{ animation: 'fadeUp 0.8s ease 0.6s forwards', opacity: 0 }}>
          {[
            { num: '10+', label: 'Services & produits' },
            { num: '3',   label: 'Pays couverts' },
            { num: '24h', label: 'Livraison numérique' },
            { num: '100%', label: 'Satisfaction garantie' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-black text-white"
                style={{ textShadow: '0 0 20px rgba(255,255,255,0.4)' }}>{s.num}</p>
              <p className="text-white/50 text-xs mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vagues basses */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full">
          <path d="M0 80V45C240 10 480 70 720 45C960 20 1200 65 1440 40V80H0Z" fill="white" fillOpacity="0.04" />
          <path d="M0 80V60C360 35 720 75 1080 55C1260 45 1380 40 1440 38V80H0Z" fill="white" fillOpacity="0.06" />
        </svg>
      </div>
    </section>
  )
}

/* ── Hero vidéo ── */
function VideoHero({ title, subtitle, videoUrl }) {
  return (
    <section className="relative overflow-hidden text-white min-h-[560px] flex items-center">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        src={videoUrl}
      />
      {/* Overlay dégradé */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.65) 100%)' }} />

      <div className="max-w-6xl mx-auto px-4 py-24 text-center relative z-10 w-full">
        <h1
          className="text-5xl md:text-7xl font-black mb-6 leading-tight"
          style={{ animation: 'fadeUp 0.8s ease forwards', opacity: 0, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
        >
          {title}
        </h1>
        <p
          className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-white/85"
          style={{ animation: 'fadeUp 0.8s ease 0.2s forwards', opacity: 0 }}
        >
          {subtitle}
        </p>
        <div style={{ animation: 'fadeUp 0.8s ease 0.4s forwards', opacity: 0 }}>
          <Link
            to="/boutique"
            className="inline-block bg-white text-gray-900 font-bold px-10 py-4 rounded-2xl text-lg hover:scale-105 transition-transform shadow-2xl"
          >
            Voir les produits →
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── Hero slider d'images ── */
function SliderHero({ title, subtitle, slides }) {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const intervalRef = useRef(null)

  function goTo(idx) {
    if (transitioning || idx === current) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrent(idx)
      setTransitioning(false)
    }, 400)
  }

  function next() {
    goTo((current + 1) % slides.length)
  }

  useEffect(() => {
    if (slides.length <= 1) return
    intervalRef.current = setInterval(next, 5000)
    return () => clearInterval(intervalRef.current)
  }, [current, slides.length])

  if (!slides || slides.length === 0) {
    return <DefaultHero title={title} subtitle={subtitle} />
  }

  return (
    <section className="relative overflow-hidden text-white min-h-[560px] flex items-center">
      {/* Images */}
      {slides.map((url, idx) => (
        <img
          key={idx}
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: idx === current ? (transitioning ? 0 : 1) : 0 }}
        />
      ))}

      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)' }} />

      {/* Contenu */}
      <div className="max-w-6xl mx-auto px-4 py-24 text-center relative z-10 w-full">
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
          {title}
        </h1>
        <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto text-white/85">
          {subtitle}
        </p>
        <Link
          to="/boutique"
          className="inline-block bg-white text-gray-900 font-bold px-10 py-4 rounded-2xl text-lg hover:scale-105 transition-transform shadow-2xl"
        >
          Voir les produits →
        </Link>
      </div>

      {/* Flèches navigation */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => goTo((current - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => goTo((current + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: idx === current ? '24px' : '8px',
                height: '8px',
                background: idx === current ? 'white' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ── Composant principal ── */
export default function HeroSection() {
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['hero-settings'],
    queryFn: fetchHeroSettings,
    staleTime: 30000,
  })

  const mode     = settings.hero_mode     ?? 'default'
  const title    = settings.hero_title    ?? 'Bienvenue sur notre boutique'
  const subtitle = settings.hero_subtitle ?? 'Découvrez notre sélection de produits de qualité, livrés directement chez vous.'
  const videoUrl = settings.hero_video_url ?? ''

  let slides = []
  try { slides = JSON.parse(settings.hero_slides ?? '[]') } catch {}

  if (isLoading) {
    return (
      <div
        className="min-h-[560px] flex items-center justify-center text-white"
        style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
      >
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    )
  }

  if (mode === 'animation') return <AnimationHero title={title} subtitle={subtitle} />
  if (mode === 'video' && videoUrl) return <VideoHero title={title} subtitle={subtitle} videoUrl={videoUrl} />
  if (mode === 'slider') return <SliderHero title={title} subtitle={subtitle} slides={slides} />
  return <DefaultHero title={title} subtitle={subtitle} />
}
