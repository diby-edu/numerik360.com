import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import ProductCard from '../../components/shop/ProductCard'
import HeroSection from '../../components/shop/HeroSection'

export default function HomePage() {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (error) throw error
      return data
    },
  })

  const { data: newProducts = [] } = useQuery({
    queryKey: ['products-new'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      return data
    },
  })

  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />

      <HeroSection />

      {/* Catégories */}
      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Catégories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/boutique?categorie=${cat.slug}`}
                className="bg-white border border-gray-200 rounded-xl px-4 py-5 text-center font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Nouveautés */}
      {newProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Nouveautés</h2>
            <Link to="/boutique" className="text-primary text-sm font-medium hover:underline">
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {newProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {newProducts.length === 0 && categories.length === 0 && (
        <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400">
          La boutique est en cours de préparation...
        </div>
      )}
    </div>
  )
}
