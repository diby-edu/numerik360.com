import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import useCartStore from '../../store/cartStore'

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

export default function ProductPage() {
  const { slug } = useParams()
  const addItem = useCartStore(s => s.addItem)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [added, setAdded] = useState(false)

  const { data: product, isLoading, isError } = useQuery({
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

  function handleAddToCart() {
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
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
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Fil d'Ariane */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
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
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Galerie */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3">
              {imageUrls.length > 0 ? (
                <img
                  src={imageUrls[activeImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            {imageUrls.length > 1 && (
              <div className="flex gap-2">
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImage === i ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infos produit */}
          <div>
            {product.categories && (
              <p className="text-sm text-primary font-medium mb-2">{product.categories.name}</p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>
            <p className="text-3xl font-bold text-primary mb-4">{formatPrice(product.price)}</p>

            <p className={`text-sm mb-6 font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {product.stock > 0 ? `En stock (${product.stock} disponibles)` : 'Rupture de stock'}
            </p>

            {product.description && (
              <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>
            )}

            {product.stock > 0 && (
              <>
                {/* Quantité */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-medium text-gray-700">Quantité :</span>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      −
                    </button>
                    <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                    added
                      ? 'bg-green-600 text-white'
                      : 'bg-primary text-white hover:bg-blue-700'
                  }`}
                >
                  {added ? '✓ Ajouté au panier' : 'Ajouter au panier'}
                </button>

                <Link
                  to="/panier"
                  className="block text-center mt-3 text-sm text-gray-500 hover:text-primary underline"
                >
                  Voir le panier
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
