import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import ProductCard from '../../components/shop/ProductCard'

const PAGE_SIZE = 12

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categorieSlug = searchParams.get('categorie') || ''
  const [page, setPage] = useState(1)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-public'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (error) throw error
      return data
    },
  })

  const selectedCat = categories.find(c => c.slug === categorieSlug)

  const { data, isLoading } = useQuery({
    queryKey: ['products-shop', categorieSlug, page],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (selectedCat) query = query.eq('category_id', selectedCat.id)

      const { data, count, error } = await query
      if (error) throw error
      return { products: data, total: count }
    },
    enabled: !categorieSlug || Boolean(selectedCat),
  })

  const products = data?.products ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleCategory(slug) {
    setPage(1)
    if (slug) setSearchParams({ categorie: slug })
    else setSearchParams({})
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Catalogue</h1>

        {/* Filtres catégorie */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => handleCategory('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !categorieSlug ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategory(cat.slug)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categorieSlug === cat.slug ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grille produits */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-8 bg-gray-200 rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            Aucun produit dans cette catégorie.
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50"
            >
              ← Précédent
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
