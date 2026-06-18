import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

export default function AccountProfilePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [form, setForm] = useState({ full_name: '', phone: '', address: '' })
  const [saved, setSaved] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  })

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        address: profile.address ?? '',
      })
    }
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: async (values) => {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...values, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile', user?.id] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    updateMutation.mutate(form)
  }

  if (isLoading) return <div className="animate-pulse h-64 bg-white rounded-xl border border-gray-200" />

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-5">Mon profil</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-5 pb-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium text-gray-900">{user?.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Votre nom"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+221 77 000 00 00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse par défaut</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Quartier, rue, repère..."
            />
          </div>

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-primary text-white hover:bg-blue-700'
            } disabled:opacity-60`}
          >
            {updateMutation.isPending ? 'Enregistrement...' : saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}
