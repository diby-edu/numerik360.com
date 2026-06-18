import { useState, useEffect, useRef } from 'react'
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
  return (
    <section
      className="relative overflow-hidden text-white min-h-[560px] flex items-center"
      style={{
        background: 'linear-gradient(-45deg, var(--hero-from), var(--hero-to), var(--hero-from), var(--hero-to))',
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 10s ease infinite',
      }}
    >
      {/* Blobs décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'var(--hero-accent)', opacity: 0.15 }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ background: 'var(--hero-accent)', opacity: 0.1 }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-2xl"
          style={{ background: 'white', opacity: 0.04 }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-24 text-center relative z-10 w-full">
        <div
          className="inline-block mb-4 px-4 py-1.5 rounded-full text-sm font-semibold border"
          style={{
            borderColor: 'var(--hero-accent)',
            color: 'var(--hero-accent)',
            animation: 'fadeUp 0.6s ease forwards',
            opacity: 0,
          }}
        >
          ✦ Découvrez notre collection
        </div>

        <h1
          className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight"
          style={{ animation: 'fadeUp 0.8s ease 0.1s forwards', opacity: 0 }}
        >
          {title}
        </h1>

        <p
          className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
          style={{ color: 'var(--hero-accent)', animation: 'fadeUp 0.8s ease 0.25s forwards', opacity: 0 }}
        >
          {subtitle}
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          style={{ animation: 'fadeUp 0.8s ease 0.4s forwards', opacity: 0 }}
        >
          <Link
            to="/boutique"
            className="inline-block bg-white font-bold px-10 py-4 rounded-2xl text-lg hover:scale-105 transition-transform shadow-2xl"
            style={{
              color: 'var(--hero-from)',
              boxShadow: '0 0 40px rgba(255,255,255,0.25)',
            }}
          >
            Voir les produits →
          </Link>
          <Link
            to="/boutique"
            className="inline-block border-2 border-white/40 text-white font-semibold px-10 py-4 rounded-2xl text-lg hover:bg-white/10 transition-colors"
          >
            Nos catégories
          </Link>
        </div>
      </div>

      {/* Vague décorative bas */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60V30C360 0 720 60 1080 30C1260 15 1380 10 1440 8V60H0Z" fill="white" fillOpacity="0.06" />
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
