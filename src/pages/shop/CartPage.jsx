import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import useCartStore from '../../store/cartStore'

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-500 mb-4">Votre panier est vide.</p>
          <Link to="/boutique" className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Voir le catalogue
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon panier</h1>

        <div className="space-y-3 mb-6">
          {items.map(({ product, quantity }) => {
            const imageUrl = product.images?.[0]
              ? supabase.storage.from('products').getPublicUrl(product.images[0]).data.publicUrl
              : null

            return (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link to={`/produit/${product.slug}`} className="font-medium text-gray-900 hover:text-primary text-sm line-clamp-1">
                    {product.name}
                  </Link>
                  <p className="text-primary font-bold text-sm mt-0.5">{formatPrice(product.price)}</p>
                </div>

                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                  >
                    −
                  </button>
                  <span className="px-3 py-1.5 text-sm font-medium min-w-[2.5rem] text-center">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(product.id, quantity + 1)}
                    className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                  >
                    +
                  </button>
                </div>

                <p className="font-bold text-gray-900 text-sm w-24 text-right">
                  {formatPrice(product.price * quantity)}
                </p>

                <button
                  onClick={() => removeItem(product.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>

        {/* Total + bouton commander */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex justify-between items-center text-lg font-bold text-gray-900 mb-4">
            <span>Total</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
          <Link
            to="/checkout"
            className="block w-full bg-primary text-white py-3 rounded-xl font-bold text-center hover:bg-blue-700 transition-colors"
          >
            Commander
          </Link>
          <Link to="/boutique" className="block text-center mt-3 text-sm text-gray-500 hover:text-primary">
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  )
}
