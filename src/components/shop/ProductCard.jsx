import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import useCartStore from '../../store/cartStore'

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

export default function ProductCard({ product }) {
  const addItem = useCartStore(s => s.addItem)

  const imageUrl = product.images?.[0]
    ? supabase.storage.from('products').getPublicUrl(product.images[0]).data.publicUrl
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
      <Link to={`/produit/${product.slug}`}>
        <div className="aspect-square bg-gray-100 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
      <div className="p-4">
        <Link to={`/produit/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 text-sm mb-1 hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
        </Link>
        <p className="text-primary font-bold mb-3">{formatPrice(product.price)}</p>
        <button
          onClick={() => addItem(product, 1)}
          disabled={product.stock === 0}
          className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {product.stock === 0 ? 'Rupture de stock' : 'Ajouter au panier'}
        </button>
      </div>
    </div>
  )
}
