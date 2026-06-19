import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'
import WhatsAppButton from '../../components/shop/WhatsAppButton'
import ProductCard from '../../components/shop/ProductCard'
import useFavoritesStore from '../../store/favoritesStore'

export default function FavoritesPage() {
  const ids = useFavoritesStore(s => s.ids)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['favorites-products', ids],
    queryFn: async () => {
      if (!ids.length) return []
      const { data } = await supabase
        .from('products')
        .select('*')
        .in('id', ids)
        .eq('is_active', true)
      return data ?? []
    },
  })

  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Mes favoris
          {ids.length > 0 && (
            <span className="ml-2 text-base font-normal text-gray-400">({ids.length})</span>
          )}
        </h1>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-gray-500 mb-4">Aucun favori pour l'instant.</p>
            <Link
              to="/boutique"
              className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              Parcourir le catalogue
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
