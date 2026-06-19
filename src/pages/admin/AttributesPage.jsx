import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

async function fetchAttributes() {
  const { data, error } = await supabase.from('attributes').select('*').order('sort_order').order('name')
  if (error) throw error
  return data ?? []
}

export default function AttributesPage() {
  const qc = useQueryClient()
  const { data: attributes = [], isLoading } = useQuery({ queryKey: ['db-attributes'], queryFn: fetchAttributes })

  // Formulaire nouvel attribut
  const [newName, setNewName] = useState('')
  const [newValues, setNewValues] = useState([])
  const [newValueInput, setNewValueInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Edition attribut existant
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editValues, setEditValues] = useState([])
  const [editValueInput, setEditValueInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!newName.trim() || newValues.length === 0) {
      setError('Nom et au moins une valeur requis.')
      return
    }
    setAdding(true); setError('')
    try {
      const { error } = await supabase.from('attributes').insert({ name: newName.trim(), values: newValues })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['db-attributes'] })
      setNewName(''); setNewValues([]); setNewValueInput(''); setShowForm(false)
    } catch (e) {
      setError(e.message.includes('unique') ? 'Cet attribut existe déjà.' : e.message)
    } finally { setAdding(false) }
  }

  async function handleSaveEdit(id) {
    if (!editName.trim() || editValues.length === 0) {
      setError('Nom et au moins une valeur requis.')
      return
    }
    setSaving(true); setError('')
    try {
      const { error } = await supabase.from('attributes').update({ name: editName.trim(), values: editValues }).eq('id', id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['db-attributes'] })
      setEditingId(null)
    } catch (e) {
      setError(e.message.includes('unique') ? 'Cet attribut existe déjà.' : e.message)
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer cet attribut ?')) return
    const { error } = await supabase.from('attributes').delete().eq('id', id)
    if (error) { setError(error.message); return }
    qc.invalidateQueries({ queryKey: ['db-attributes'] })
  }

  function startEdit(attr) {
    setEditingId(attr.id)
    setEditName(attr.name)
    setEditValues([...attr.values])
    setEditValueInput('')
    setError('')
  }

  function addNewValue() {
    const v = newValueInput.trim()
    if (!v || newValues.includes(v)) return
    setNewValues(prev => [...prev, v])
    setNewValueInput('')
  }

  function addEditValue() {
    const v = editValueInput.trim()
    if (!v || editValues.includes(v)) return
    setEditValues(prev => [...prev, v])
    setEditValueInput('')
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attributs produit</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez la bibliothèque d'attributs réutilisables (Taille, Couleur, etc.)</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvel attribut
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">{error}</p>
      )}

      {/* Formulaire nouvel attribut */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Nouvel attribut</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'attribut *</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Taille, Couleur, Matière..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Valeurs *</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newValueInput}
                onChange={e => setNewValueInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewValue() } }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: S, M, L, XL... (Entrée pour ajouter)"
              />
              <button type="button" onClick={addNewValue}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Ajouter
              </button>
            </div>
            {newValues.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newValues.map(v => (
                  <span key={v} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-sm">
                    {v}
                    <button type="button" onClick={() => setNewValues(prev => prev.filter(x => x !== v))}
                      className="text-blue-400 hover:text-blue-700 ml-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setShowForm(false); setNewName(''); setNewValues([]); setError('') }}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="button" onClick={handleAdd} disabled={adding}
              className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              {adding ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste des attributs */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : attributes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-gray-500 text-sm">Aucun attribut. Créez votre premier attribut ci-dessus.</p>
          <p className="text-gray-400 text-xs mt-1">Ex: Taille (S, M, L, XL) — Couleur (rouge, bleu, vert)</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attributes.map(attr => (
            <div key={attr.id} className="bg-white rounded-xl border border-gray-200 p-5">
              {editingId === attr.id ? (
                // Mode édition
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valeurs</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={editValueInput}
                        onChange={e => setEditValueInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditValue() } }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Nouvelle valeur (Entrée pour ajouter)"
                      />
                      <button type="button" onClick={addEditValue}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                        Ajouter
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editValues.map(v => (
                        <span key={v} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-sm">
                          {v}
                          <button type="button" onClick={() => setEditValues(prev => prev.filter(x => x !== v))}
                            className="text-blue-400 hover:text-blue-700 ml-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setEditingId(null)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                      Annuler
                    </button>
                    <button type="button" onClick={() => handleSaveEdit(attr.id)} disabled={saving}
                      className="flex-1 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              ) : (
                // Mode affichage
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 mb-2">{attr.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {attr.values.map(v => (
                        <span key={v} className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(attr)}
                      className="text-sm text-gray-500 hover:text-primary font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(attr.id)}
                      className="text-sm text-red-400 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
