import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'
import WhatsAppButton from '../../components/shop/WhatsAppButton'
import ProductCard from '../../components/shop/ProductCard'

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'name_asc', label: 'Nom A → Z' },
]

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categorieSlug = searchParams.get('categorie') || ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [sort, setSort] = useState('newest')

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
    queryKey: ['products-shop', categorieSlug, page, search, sort],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      if (selectedCat) query = query.eq('category_id', selectedCat.id)
      if (search.trim()) query = query.ilike('name', `%${search.trim()}%`)

      switch (sort) {
        case 'price_asc':  query = query.order('price', { ascending: true }); break
        case 'price_desc': query = query.order('price', { ascending: false }); break
        case 'name_asc':   query = query.order('name', { ascending: true }); break
        default:           query = query.order('created_at', { ascending: false })
      }

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

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catalogue</h1>
            {!isLoading && (
              <p className="text-sm text-gray-500 mt-0.5">
                {total} produit{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
                {search && <span> pour « {search} »</span>}
              </p>
            )}
          </div>

          {/* Recherche + Tri */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Rechercher..."
                  className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-52"
                />
                <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1) }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

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
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="font-medium">Aucun produit trouvé.</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-sm text-primary hover:underline">
                Effacer la recherche
              </button>
            )}
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
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white disabled:opacity-40 hover:bg-gray-50"
            >
              ← Précédent
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
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

      <Footer />
      <WhatsAppButton />
    </div>
  )
}
