import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'
import WhatsAppButton from '../../components/shop/WhatsAppButton'
import ProductCard from '../../components/shop/ProductCard'
import useCartStore from '../../store/cartStore'

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

export default function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore(s => s.addItem)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  // Sélection variantes
  const [selectedVariant, setSelectedVariant] = useState(null)      // pour SERVICE
  const [selectedAttributes, setSelectedAttributes] = useState({})  // pour PHYSIQUE

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return data
    },
  })

  // Variantes du produit
  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', product?.id],
    enabled: Boolean(product?.has_variants),
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

  // Produits similaires
  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar-products', product?.category_id, product?.id],
    enabled: Boolean(product?.category_id),
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category_id', product.category_id)
        .neq('id', product.id)
        .limit(4)
      return data ?? []
    },
  })

  // Sélectionner la 1ère variante de service par défaut
  useEffect(() => {
    if (product?.product_type === 'service' && variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0])
    }
  }, [variants, product?.product_type, selectedVariant])

  // SEO dynamique
  useEffect(() => {
    if (!product) return
    const title = product.seo_title || product.name
    const desc = product.seo_description || product.description || ''
    document.title = title
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = desc
    return () => { document.title = 'Boutique'; metaDesc.content = '' }
  }, [product])

  // Variante physique active (depuis attributs sélectionnés)
  const isPhysicalWithVariants = product?.product_type === 'physical' && variants.length > 0
  const attributeGroups = isPhysicalWithVariants
    ? variants.reduce((acc, v) => {
        Object.entries(v.attributes ?? {}).forEach(([key, val]) => {
          if (!acc[key]) acc[key] = []
          if (!acc[key].includes(val)) acc[key].push(val)
        })
        return acc
      }, {})
    : {}
  const attrKeys = Object.keys(attributeGroups)
  const hasAllAttributesSelected = attrKeys.length > 0 && attrKeys.every(k => selectedAttributes[k])
  const matchingVariant = isPhysicalWithVariants && hasAllAttributesSelected
    ? variants.find(v => attrKeys.every(k => v.attributes[k] === selectedAttributes[k])) ?? null
    : null

  // Variante active finale
  const activeVariant = product?.product_type === 'service'
    ? selectedVariant
    : product?.product_type === 'physical' && isPhysicalWithVariants
      ? matchingVariant
      : null

  // Prix et stock actifs
  const hasPromo = product?.promo_price && product?.promo_price < product?.price
  const hasRange = product?.price_max && product?.price_max > product?.price && !product?.has_variants
  const baseDisplayPrice = hasPromo ? product?.promo_price : product?.price
  const activePrice = activeVariant?.price ?? baseDisplayPrice ?? 0
  const activeStock = activeVariant?.stock ?? product?.stock ?? 0
  const discount = hasPromo && !activeVariant ? Math.round((1 - product.promo_price / product.price) * 100) : 0

  // Peut-on ajouter au panier ?
  const needsVariant = product?.has_variants && (
    (product?.product_type === 'service' && !selectedVariant) ||
    (product?.product_type === 'physical' && isPhysicalWithVariants && !matchingVariant)
  )
  const canAdd = activeStock > 0 && !needsVariant

  function handleAddToCart() {
    if (!canAdd) return
    addItem(product, quantity, activeVariant)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function handleOrderNow() {
    if (!canAdd) return
    if (!added) addItem(product, quantity, activeVariant)
    navigate('/panier')
  }

  const pageUrl = encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')
  const productName = encodeURIComponent(product?.name ?? '')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="animate-pulse grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/4" />
              <div className="h-24 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen bg-theme-bg">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-gray-500 mb-4">Produit introuvable.</p>
          <Link to="/boutique" className="text-primary hover:underline">Retour au catalogue</Link>
        </div>
      </div>
    )
  }

  const imageUrls = (product.images ?? []).map(path =>
    supabase.storage.from('products').getPublicUrl(path).data.publicUrl
  )

  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />

      {/* Lightbox */}
      {lightbox && imageUrls.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightbox(false)}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {activeImage > 0 && (
            <button className="absolute left-4 text-white/80 hover:text-white"
              onClick={e => { e.stopPropagation(); setActiveImage(i => i - 1) }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <img src={imageUrls[activeImage]} alt={product.name}
            className="max-h-[85vh] max-w-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          {activeImage < imageUrls.length - 1 && (
            <button className="absolute right-4 text-white/80 hover:text-white"
              onClick={e => { e.stopPropagation(); setActiveImage(i => i + 1) }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {imageUrls.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {imageUrls.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setActiveImage(i) }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === activeImage ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Fil d'Ariane */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span>/</span>
          <Link to="/boutique" className="hover:text-primary">Catalogue</Link>
          {product.categories && (
            <>
              <span>/</span>
              <Link to={`/boutique?categorie=${product.categories.slug ?? ''}`} className="hover:text-primary">
                {product.categories.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-900 truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Galerie */}
          <div>
            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3 relative group cursor-zoom-in"
              onClick={() => imageUrls.length > 0 && setLightbox(true)}>
              {imageUrls.length > 0 ? (
                <>
                  <img src={imageUrls[activeImage]} alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            {imageUrls.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {imageUrls.map((url, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
                      activeImage === i ? 'border-primary' : 'border-transparent hover:border-gray-300'
                    }`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infos produit */}
          <div>
            {product.categories && (
              <Link to={`/boutique?categorie=${product.categories.slug}`}
                className="text-sm text-primary font-medium mb-2 inline-block hover:underline">
                {product.categories.name}
              </Link>
            )}

            {/* Badge type */}
            {product.product_type !== 'physical' && (
              <span className={`inline-block mb-2 ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                product.product_type === 'service' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {product.product_type === 'service' ? '🛠️ Service' : '💾 Numérique'}
              </span>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>

            {/* Prix */}
            <div className="flex items-baseline gap-3 mb-2">
              {hasRange ? (
                <span className="text-3xl font-bold text-primary">
                  {formatPrice(product.price)} – {formatPrice(product.price_max)}
                </span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-primary">{formatPrice(activePrice)}</span>
                  {hasPromo && !activeVariant && (
                    <>
                      <span className="text-lg text-gray-400 line-through">{formatPrice(product.price)}</span>
                      <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-full">-{discount}%</span>
                    </>
                  )}
                </>
              )}
            </div>

            {hasPromo && !hasRange && !activeVariant && (
              <p className="text-sm text-red-600 font-medium mb-4">
                Vous économisez {formatPrice(product.price - product.promo_price)}
              </p>
            )}

            {/* Stock (uniquement si pas service et pas en attente de sélection) */}
            {product.product_type !== 'service' && !needsVariant && (
              <p className={`text-sm mb-5 font-medium flex items-center gap-1.5 ${activeStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                <span className={`w-2 h-2 rounded-full ${activeStock > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                {product.product_type === 'digital'
                  ? 'Disponible immédiatement'
                  : activeStock > 0 ? `En stock (${activeStock} disponibles)` : 'Rupture de stock'}
              </p>
            )}

            {product.description && (
              <div
                className="prose prose-sm max-w-none text-gray-600 mb-6 border-t border-gray-100 pt-5"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            )}

            {/* ── SÉLECTEUR SERVICE (onglets + description + CTA hors panier) ── */}
            {product.product_type === 'service' && variants.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-800 mb-3">Sélectionnez une formule</p>
                <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
                  {/* Onglets */}
                  <div className="flex border-b border-gray-100 overflow-x-auto">
                    {variants.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`flex-1 min-w-[90px] py-3 px-3 text-center text-xs font-semibold whitespace-nowrap transition-all ${
                          selectedVariant?.id === v.id
                            ? 'text-primary bg-blue-50 border-b-2 border-primary'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {v.name}<br />
                        <span className={`text-xs font-bold ${selectedVariant?.id === v.id ? 'text-blue-600' : 'text-gray-500'}`}>
                          {formatPrice(v.price)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* Panneau description */}
                  {selectedVariant && (
                    <>
                      <div className="p-4">
                        <p className="font-semibold text-gray-900 text-sm mb-1">{selectedVariant.name}</p>
                        {selectedVariant.description && (
                          <div
                            className="prose prose-sm max-w-none text-gray-600 [&_p]:m-0 [&_ul]:mt-1 [&_ul]:mb-0 [&_li]:m-0"
                            dangerouslySetInnerHTML={{ __html: selectedVariant.description }}
                          />
                        )}
                      </div>
                      {/* Barre prix + CTA */}
                      <div className="border-t border-blue-100 px-4 py-4" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)' }}>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-xs text-blue-400 font-semibold mb-0.5">{selectedVariant.name}</p>
                            <p className="text-xl font-black text-blue-700 whitespace-nowrap">{formatPrice(selectedVariant.price)}</p>
                          </div>
                          <span className="text-xs text-gray-400 text-right">Sans paiement<br/>maintenant</span>
                        </div>
                        <Link
                          to={`/demande-service/${product.slug}?variant=${selectedVariant.id}`}
                          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md hover:opacity-90 flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          Je suis intéressé
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── SÉLECTEUR PHYSIQUE ── */}
            {isPhysicalWithVariants && (
              <div className="mb-5 space-y-4">
                {Object.entries(attributeGroups).map(([attrName, values]) => (
                  <div key={attrName}>
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      {attrName}
                      {selectedAttributes[attrName] && (
                        <span className="ml-2 text-primary font-normal">{selectedAttributes[attrName]}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {values.map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelectedAttributes(prev => ({ ...prev, [attrName]: value }))}
                          className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedAttributes[attrName] === value
                              ? 'border-primary bg-blue-50 text-primary'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Résultat sélection */}
                {hasAllAttributesSelected && matchingVariant && (
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    En stock ({matchingVariant.stock} disponibles)
                  </p>
                )}
                {hasAllAttributesSelected && !matchingVariant && (
                  <p className="text-sm text-orange-600 font-medium">Cette combinaison n'est pas disponible.</p>
                )}
                {!hasAllAttributesSelected && (
                  <p className="text-sm text-gray-400">Sélectionnez toutes les options pour continuer.</p>
                )}
              </div>
            )}

            {/* ── AJOUT AU PANIER (physique / numérique uniquement) ── */}
            {product.product_type !== 'service' && canAdd ? (
              <>
                {/* Quantité : masquée pour les services */}
                {product.product_type !== 'service' && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-medium text-gray-700">Quantité :</span>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors font-bold">−</button>
                      <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
                      <button onClick={() => setQuantity(q => Math.min(activeStock, q + 1))}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors font-bold">+</button>
                    </div>
                  </div>
                )}

                <button onClick={handleAddToCart}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    added ? 'bg-green-600 text-white scale-95' : 'bg-primary text-white hover:bg-primary-dark'
                  }`}>
                  {added ? (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Ajouté au panier</>
                  ) : product.product_type === 'service' ? (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>Commander cette formule</>
                  ) : product.product_type === 'digital' ? (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Acheter</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>Ajouter au panier</>
                  )}
                </button>

                <Link to="/panier" className="block text-center mt-3 text-sm text-gray-500 hover:text-primary underline">
                  Voir le panier →
                </Link>
              </>
            ) : product.product_type !== 'service' && needsVariant ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Sélectionnez toutes les options pour ajouter au panier.</p>
              </div>
            ) : product.product_type !== 'service' ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-sm text-red-600 font-medium">Rupture de stock</p>
              </div>
            ) : null}

            {/* Partage */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Partager</p>
              <div className="flex gap-2">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-80 transition-opacity" title="Partager sur Facebook">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
                </a>
                <a href={`https://wa.me/?text=${productName}%20${pageUrl}`} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:opacity-80 transition-opacity" title="Partager sur WhatsApp">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                </a>
                <button onClick={() => navigator.clipboard?.writeText(window.location.href)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors" title="Copier le lien">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Produits similaires */}
        {similarProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Produits similaires</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {similarProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  )
}
