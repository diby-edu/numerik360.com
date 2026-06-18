import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { generateProductDescription } from '../../lib/openai'

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    promo_price: '',
    stock: '',
    category_id: '',
    is_active: true,
  })
  const [images, setImages] = useState([])         // fichiers File à uploader
  const [existingImages, setExistingImages] = useState([])  // paths déjà en base
  const [keywords, setKeywords] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Catégories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name')
      if (error) throw error
      return data
    },
  })

  // Chargement produit si modification
  useEffect(() => {
    if (!isEdit) return
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return
      setForm({
        name: data.name,
        slug: data.slug,
        description: data.description ?? '',
        price: String(data.price),
        promo_price: data.promo_price != null ? String(data.promo_price) : '',
        stock: String(data.stock),
        category_id: data.category_id ?? '',
        is_active: data.is_active,
      })
      setExistingImages(data.images ?? [])
    })
  }, [id, isEdit])

  function handleNameChange(e) {
    const name = e.target.value
    setForm(f => ({ ...f, name, slug: slugify(name) }))
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleImageFiles(e) {
    const files = Array.from(e.target.files)
    const total = existingImages.length + images.length + files.length
    if (total > 5) {
      setError('Maximum 5 images par produit.')
      return
    }
    setImages(prev => [...prev, ...files])
  }

  function removeNewImage(idx) {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }

  function removeExistingImage(idx) {
    setExistingImages(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleGenerateDescription() {
    if (!form.name.trim()) {
      setError('Renseignez d\'abord le nom du produit.')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const desc = await generateProductDescription(form.name, keywords || form.name)
      setForm(f => ({ ...f, description: desc }))
    } catch {
      setError('Erreur lors de la génération. Vérifiez votre clé OpenAI.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Upload des nouvelles images
      const newImagePaths = []
      for (const file of images) {
        const ext = file.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        newImagePaths.push(path)
      }

      const allImages = [...existingImages, ...newImagePaths]

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        promo_price: form.promo_price !== '' ? parseFloat(form.promo_price) : null,
        stock: parseInt(form.stock, 10),
        category_id: form.category_id || null,
        is_active: form.is_active,
        images: allImages,
      }

      if (isEdit) {
        const { error } = await supabase.from('products').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
      }

      navigate('/admin/produits')
    } catch (err) {
      setError(err.message.includes('unique') ? 'Ce slug existe déjà. Modifiez le nom.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Informations générales</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleNameChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Chemise en coton blanc"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description + génération */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                placeholder="Mots-clés (optionnel)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={generating}
                className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Génération...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Générer avec ChatGPT
                  </>
                )}
              </button>
            </div>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Description du produit..."
            />
          </div>
        </div>

        {/* Prix, stock, catégorie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Prix & stock</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA) *</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                min="0"
                step="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix promo (FCFA)
                <span className="ml-1 text-xs text-gray-400 font-normal">— optionnel</span>
              </label>
              <input
                type="number"
                name="promo_price"
                value={form.promo_price}
                onChange={handleChange}
                min="0"
                step="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="3500"
              />
              {form.promo_price && form.price && parseFloat(form.promo_price) >= parseFloat(form.price) && (
                <p className="text-xs text-red-500 mt-1">Le prix promo doit être inférieur au prix normal.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                required
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sans catégorie</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
            <label htmlFor="is_active" className="text-sm text-gray-700">Produit actif (visible sur la boutique)</label>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Images <span className="text-sm font-normal text-gray-400">(max 5)</span></h2>

          {/* Images existantes */}
          {existingImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {existingImages.map((path, idx) => {
                const url = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
                return (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(idx)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Nouvelles images (preview) */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((file, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-dashed border-primary">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {existingImages.length + images.length < 5 && (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 cursor-pointer hover:border-primary transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-gray-500">Ajouter des images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageFiles}
                className="hidden"
              />
            </label>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3 pb-8">
          <button
            type="button"
            onClick={() => navigate('/admin/produits')}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </div>
  )
}
