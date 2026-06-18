import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function CategoriesPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })

  const addMutation = useMutation({
    mutationFn: async (name) => {
      const { error } = await supabase
        .from('categories')
        .insert({ name, slug: slugify(name) })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setName('')
      setError('')
    },
    onError: (e) => setError(e.message.includes('unique') ? 'Ce nom existe déjà.' : e.message),
  })

  const renameMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      const { error } = await supabase
        .from('categories')
        .update({ name, slug: slugify(name) })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      setEditId(null)
      setEditName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addMutation.mutate(name.trim())
  }

  function handleRename(e) {
    e.preventDefault()
    if (!editName.trim()) return
    renameMutation.mutate({ id: editId, name: editName.trim() })
  }

  function startEdit(cat) {
    setEditId(cat.id)
    setEditName(cat.name)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Catégories</h1>

      {/* Formulaire ajout */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Ajouter une catégorie</h2>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="Nom de la catégorie"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {addMutation.isPending ? '...' : 'Ajouter'}
          </button>
        </form>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading && (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Chargement...</p>
        )}
        {!isLoading && categories.length === 0 && (
          <p className="px-5 py-8 text-center text-gray-400 text-sm">Aucune catégorie</p>
        )}
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 px-5 py-3">
            {editId === cat.id ? (
              <form onSubmit={handleRename} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={renameMutation.isPending}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Annuler
                </button>
              </form>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>
                <span className="text-xs text-gray-400 font-mono">{cat.slug}</span>
                <button
                  onClick={() => startEdit(cat)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Renommer
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Supprimer "${cat.name}" ?`)) deleteMutation.mutate(cat.id)
                  }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Supprimer
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
