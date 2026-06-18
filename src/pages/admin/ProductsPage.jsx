import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

export default function ProductsPage() {
  const qc = useQueryClient()

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, price_max, stock, is_active, images, categories(name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products-admin'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products-admin'] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Produits</h1>
        <Link
          to="/admin/produits/nouveau"
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Ajouter un produit
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Prix</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chargement...</td>
                </tr>
              )}
              {!isLoading && products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    Aucun produit.{' '}
                    <Link to="/admin/produits/nouveau" className="text-primary hover:underline">
                      Créer le premier
                    </Link>
                  </td>
                </tr>
              )}
              {products.map(p => {
                const imageUrl = p.images?.[0]
                  ? supabase.storage.from('products').getPublicUrl(p.images[0]).data.publicUrl
                  : null

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.categories?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">
                      {p.price_max && p.price_max > p.price
                        ? `${formatPrice(p.price)} – ${formatPrice(p.price_max)}`
                        : formatPrice(p.price)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.stock}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/admin/produits/${p.id}/modifier`}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          Modifier
                        </Link>
                        <button
                          onClick={() => toggleMutation.mutate({ id: p.id, is_active: p.is_active })}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                          {p.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer "${p.name}" ?`)) deleteMutation.mutate(p.id)
                          }}
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
