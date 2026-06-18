import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { name: '', text: '', rating: 5, avatar: '', is_active: true }

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${n <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function TestimonialsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: id => supabase.from('testimonials').delete().eq('id', id),
    onSuccess: () => qc.invalidateQueries(['admin-testimonials', 'testimonials-public']),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => supabase.from('testimonials').update({ is_active }).eq('id', id),
    onSuccess: () => qc.invalidateQueries(['admin-testimonials', 'testimonials-public']),
  })

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function openNew() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(true)
    setError('')
  }

  function openEdit(t) {
    setForm({ name: t.name, text: t.text, rating: t.rating, avatar: t.avatar, is_active: t.is_active })
    setEditId(t.id)
    setShowForm(true)
    setError('')
  }

  function cancel() {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        text: form.text.trim(),
        rating: Number(form.rating),
        avatar: form.avatar.trim() || form.name.trim()[0]?.toUpperCase() || 'A',
        is_active: form.is_active,
      }
      if (editId) {
        const { error } = await supabase.from('testimonials').update(payload).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('testimonials').insert(payload)
        if (error) throw error
      }
      qc.invalidateQueries(['admin-testimonials'])
      qc.invalidateQueries(['testimonials-public'])
      cancel()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Témoignages</h1>
        {!showForm && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau témoignage
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{editId ? 'Modifier' : 'Nouveau témoignage'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du client *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Aminata D."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lettre avatar
                  <span className="text-gray-400 font-normal ml-1">(auto si vide)</span>
                </label>
                <input
                  type="text"
                  name="avatar"
                  value={form.avatar}
                  onChange={handleChange}
                  maxLength={1}
                  placeholder="A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Témoignage *</label>
              <textarea
                name="text"
                value={form.text}
                onChange={handleChange}
                required
                rows={3}
                placeholder="Ce que dit le client..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
              <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="w-4 h-4 text-primary rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Visible sur la boutique</label>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancel}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
              >
                {saving ? 'Enregistrement...' : editId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : testimonials.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p>Aucun témoignage. Cliquez sur "Nouveau témoignage" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {testimonials.map(t => (
            <div
              key={t.id}
              className={`bg-white rounded-xl border p-5 flex gap-4 items-start transition-opacity ${t.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {t.avatar}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xs">★</span>
                    ))}
                  </div>
                  {!t.is_active && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Masqué</span>
                  )}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 italic">"{t.text}"</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: t.id, is_active: !t.is_active })}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
                    t.is_active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {t.is_active ? 'Visible' : 'Masqué'}
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="text-gray-400 hover:text-primary transition-colors p-1"
                  title="Modifier"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => { if (confirm('Supprimer ce témoignage ?')) deleteMutation.mutate(t.id) }}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
