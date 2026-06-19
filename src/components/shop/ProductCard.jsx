import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../store/cartStore'
import useFavoritesStore from '../../store/favoritesStore'

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

function isNew(createdAt) {
  const days = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  return days <= 30
}

export default function ProductCard({ product }) {
  const addItem = useCartStore(s => s.addItem)
  const isFav = useFavoritesStore(s => s.ids.includes(product.id))
  const toggleFav = useFavoritesStore(s => s.toggle)

  const imageUrl = product.images?.[0]
    ? supabase.storage.from('products').getPublicUrl(product.images[0]).data.publicUrl
    : null

  const hasPromo = product.promo_price && product.promo_price < product.price
  const hasRange = product.price_max && product.price_max > product.price
  const outOfStock = product.stock === 0
  const showNew = !hasPromo && !outOfStock && isNew(product.created_at)

  const displayPrice = hasPromo ? product.promo_price : product.price
  const discount = hasPromo
    ? Math.round((1 - product.promo_price / product.price) * 100)
    : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group relative flex flex-col">

      {/* Favori */}
      <button
        onClick={e => { e.preventDefault(); toggleFav(product.id) }}
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center transition-transform hover:scale-110"
        aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <svg className="w-4 h-4" fill={isFav ? '#ef4444' : 'none'} stroke={isFav ? '#ef4444' : '#9ca3af'} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {outOfStock && (
          <span className="bg-gray-700 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Rupture
          </span>
        )}
        {hasPromo && !outOfStock && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
        {showNew && (
          <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Nouveau
          </span>
        )}
      </div>

      {/* Image */}
      <Link to={`/produit/${product.slug}`} className="block">
        <div className="aspect-square bg-gray-100 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStock ? 'opacity-60' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Infos */}
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/produit/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 text-sm mb-2 hover:text-primary transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Prix */}
        <div className="flex items-baseline gap-2 mb-3">
          {hasRange ? (
            <span className="text-primary font-bold text-base">
              {formatPrice(product.price)} – {formatPrice(product.price_max)}
            </span>
          ) : (
            <>
              <span className="text-primary font-bold text-base">{formatPrice(displayPrice)}</span>
              {hasPromo && (
                <span className="text-gray-400 text-sm line-through">{formatPrice(product.price)}</span>
              )}
            </>
          )}
        </div>

        {/* Bouton */}
        <button
          onClick={() => addItem(product, 1)}
          disabled={outOfStock}
          className="mt-auto w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {outOfStock ? (
            'Rupture de stock'
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Ajouter au panier
            </>
          )}
        </button>
      </div>
    </div>
  )
}
