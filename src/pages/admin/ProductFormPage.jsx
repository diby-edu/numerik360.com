import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { generateProductDescription, generateProductSEO } from '../../lib/openai'

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Génère toutes les combinaisons possibles d'attributs
function generateCombinations(attributes) {
  const valid = attributes.filter(a => a.name.trim() && a.values.filter(v => v.trim()).length > 0)
  if (valid.length === 0) return []

  function combine(idx) {
    const attr = valid[idx]
    const vals = attr.values.filter(v => v.trim())
    if (idx === valid.length - 1) {
      return vals.map(v => ({ name: v, attributes: { [attr.name]: v } }))
    }
    const subCombos = combine(idx + 1)
    return vals.flatMap(v =>
      subCombos.map(c => ({
        name: `${v} / ${c.name}`,
        attributes: { [attr.name]: v, ...c.attributes },
      }))
    )
  }
  return combine(0)
}

export default function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  // ── Formulaire principal ──
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    price_max: '',
    promo_price: '',
    stock: '',
    category_id: '',
    product_type: 'physical',
    digital_delivery_type: '',
    digital_file_path: '',
    is_active: true,
    seo_title: '',
    seo_description: '',
  })

  // ── Images ──
  const [images, setImages] = useState([])
  const [existingImages, setExistingImages] = useState([])

  // ── Variantes SERVICE ──
  const [serviceOptions, setServiceOptions] = useState([])
  // [{ id?, name, description, price }]

  // ── Variantes PHYSIQUE ──
  const [attributes, setAttributes] = useState([])
  // [{ name, values: ['S','M','L'] }]
  const [physicalVariants, setPhysicalVariants] = useState([])
  // [{ id?, name, attributes: {}, price, stock }]

  // ── Numérique ──
  const [codesText, setCodesText] = useState('')
  const [codesCount, setCodesCount] = useState(0)
  const [digitalFile, setDigitalFile] = useState(null)
  const [digitalFileUploading, setDigitalFileUploading] = useState(false)

  // ── IA / Chargement ──
  const [generating, setGenerating] = useState(false)
  const [generatingSEO, setGeneratingSEO] = useState(false)
  const [descError, setDescError] = useState('')
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

  // Chargement produit en édition
  useEffect(() => {
    if (!isEdit) return
    supabase.from('products').select('*').eq('id', id).single().then(({ data }) => {
      if (!data) return
      setForm({
        name: data.name,
        slug: data.slug,
        description: data.description ?? '',
        price: String(data.price),
        price_max: data.price_max != null ? String(data.price_max) : '',
        promo_price: data.promo_price != null ? String(data.promo_price) : '',
        stock: String(data.stock),
        category_id: data.category_id ?? '',
        product_type: data.product_type ?? 'physical',
        digital_delivery_type: data.digital_delivery_type ?? '',
        digital_file_path: data.digital_file_path ?? '',
        is_active: data.is_active,
        seo_title: data.seo_title ?? '',
        seo_description: data.seo_description ?? '',
      })
      setExistingImages(data.images ?? [])
    })
  }, [id, isEdit])

  // Chargement variantes existantes en édition
  const { data: existingVariants } = useQuery({
    queryKey: ['product-variants-admin', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data } = await supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order')
      return data ?? []
    },
  })

  useEffect(() => {
    if (!existingVariants || !isEdit || existingVariants.length === 0) return
    const pt = form.product_type
    if (pt === 'service') {
      setServiceOptions(existingVariants.map(v => ({
        id: v.id, name: v.name, description: v.description ?? '', price: String(v.price),
      })))
    } else if (pt === 'physical') {
      setPhysicalVariants(existingVariants.map(v => ({
        id: v.id, name: v.name, attributes: v.attributes ?? {}, price: String(v.price), stock: String(v.stock),
      })))
      // Reconstruire les attributs depuis les variantes existantes
      const attrMap = {}
      existingVariants.forEach(v => {
        Object.entries(v.attributes ?? {}).forEach(([key, val]) => {
          if (!attrMap[key]) attrMap[key] = []
          if (!attrMap[key].includes(val)) attrMap[key].push(val)
        })
      })
      setAttributes(Object.entries(attrMap).map(([name, values]) => ({ name, values })))
    }
  }, [existingVariants, isEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  // Codes numériques existants
  const { data: existingCodesCount = 0 } = useQuery({
    queryKey: ['product-codes-count', id],
    enabled: isEdit && form.digital_delivery_type === 'codes',
    queryFn: async () => {
      const { count } = await supabase.from('product_codes').select('id', { count: 'exact', head: true })
        .eq('product_id', id).is('order_id', null)
      return count ?? 0
    },
  })

  useEffect(() => { setCodesCount(existingCodesCount) }, [existingCodesCount])

  /* ── Handlers formulaire principal ── */
  function handleNameChange(e) {
    const name = e.target.value
    setForm(f => ({ ...f, name, slug: slugify(name) }))
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  /* ── Handlers images ── */
  function handleImageFiles(e) {
    const files = Array.from(e.target.files)
    const total = existingImages.length + images.length + files.length
    if (total > 5) { setError('Maximum 5 images par produit.'); return }
    setImages(prev => [...prev, ...files])
  }
  function removeNewImage(idx) { setImages(prev => prev.filter((_, i) => i !== idx)) }
  function removeExistingImage(idx) { setExistingImages(prev => prev.filter((_, i) => i !== idx)) }

  /* ── Handlers variantes SERVICE ── */
  function addServiceOption() {
    setServiceOptions(prev => [...prev, { name: '', description: '', price: '' }])
  }
  function updateServiceOption(idx, field, value) {
    setServiceOptions(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o))
  }
  function removeServiceOption(idx) {
    setServiceOptions(prev => prev.filter((_, i) => i !== idx))
  }

  /* ── Handlers attributs PHYSIQUES ── */
  function addAttribute() {
    setAttributes(prev => [...prev, { name: '', values: [''] }])
  }
  function updateAttributeName(idx, name) {
    setAttributes(prev => prev.map((a, i) => i === idx ? { ...a, name } : a))
  }
  function addAttributeValue(attrIdx) {
    setAttributes(prev => prev.map((a, i) => i === attrIdx ? { ...a, values: [...a.values, ''] } : a))
  }
  function updateAttributeValue(attrIdx, valIdx, value) {
    setAttributes(prev => prev.map((a, i) =>
      i === attrIdx ? { ...a, values: a.values.map((v, vi) => vi === valIdx ? value : v) } : a
    ))
  }
  function removeAttributeValue(attrIdx, valIdx) {
    setAttributes(prev => prev.map((a, i) =>
      i === attrIdx ? { ...a, values: a.values.filter((_, vi) => vi !== valIdx) } : a
    ))
  }
  function removeAttribute(idx) {
    setAttributes(prev => prev.filter((_, i) => i !== idx))
  }

  function handleGenerateVariants() {
    const combos = generateCombinations(attributes)
    if (combos.length === 0) return
    // Préserver prix/stock des variantes déjà définies
    const byName = Object.fromEntries(physicalVariants.map(v => [v.name, v]))
    setPhysicalVariants(combos.map(c => ({
      ...(byName[c.name] ?? { price: '', stock: '' }),
      name: c.name,
      attributes: c.attributes,
    })))
  }

  function updatePhysicalVariant(idx, field, value) {
    setPhysicalVariants(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  /* ── IA ── */
  async function handleGenerateDescription() {
    if (!form.name.trim()) { setDescError('Renseignez d\'abord le nom du produit.'); return }
    setGenerating(true); setDescError('')
    try {
      const desc = await generateProductDescription(form.name, form.name)
      setForm(f => ({ ...f, description: desc }))
    } catch (err) {
      setDescError(err.message || 'Erreur génération. Vérifiez la clé OpenAI sur le VPS.')
    } finally { setGenerating(false) }
  }

  async function handleGenerateSEO() {
    if (!form.name.trim()) { setError('Renseignez d\'abord le nom du produit.'); return }
    setGeneratingSEO(true); setError('')
    try {
      const seo = await generateProductSEO(form.name, form.description)
      setForm(f => ({ ...f, seo_title: seo.title, seo_description: seo.description }))
    } catch (err) {
      setError(err.message || 'Erreur génération SEO.')
    } finally { setGeneratingSEO(false) }
  }

  /* ── Prix auto depuis variantes ── */
  function getAutoPrice() {
    if (form.product_type === 'service' && serviceOptions.length > 0) {
      const prices = serviceOptions.map(o => parseFloat(o.price)).filter(p => !isNaN(p) && p > 0)
      return prices.length > 0 ? Math.min(...prices) : null
    }
    if (form.product_type === 'physical' && physicalVariants.length > 0) {
      const prices = physicalVariants.map(v => parseFloat(v.price)).filter(p => !isNaN(p) && p > 0)
      return prices.length > 0 ? Math.min(...prices) : null
    }
    return null
  }

  /* ── Soumission ── */
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      // Upload images
      const newImagePaths = []
      for (const file of images) {
        const ext = file.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('products').upload(path, file, { cacheControl: '3600', upsert: false })
        if (uploadError) throw uploadError
        newImagePaths.push(path)
      }
      const allImages = [...existingImages, ...newImagePaths]

      // Upload fichier numérique
      let digitalFilePath = form.digital_file_path
      if (form.product_type === 'digital' && form.digital_delivery_type === 'file' && digitalFile) {
        setDigitalFileUploading(true)
        const ext = digitalFile.name.split('.').pop()
        const path = `digital/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('products').upload(path, digitalFile, { upsert: false })
        setDigitalFileUploading(false)
        if (uploadError) throw uploadError
        digitalFilePath = path
      }

      const autoPrice = getAutoPrice()
      const hasVariants =
        (form.product_type === 'service' && serviceOptions.filter(o => o.name && o.price).length > 0) ||
        (form.product_type === 'physical' && physicalVariants.filter(v => v.price !== '').length > 0)

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        price: autoPrice ?? parseFloat(form.price),
        price_max: form.price_max !== '' && !hasVariants ? parseFloat(form.price_max) : null,
        promo_price: form.promo_price !== '' && !hasVariants ? parseFloat(form.promo_price) : null,
        stock: form.product_type === 'digital' ? 999 : form.product_type === 'service' ? 999 : parseInt(form.stock, 10),
        category_id: form.category_id || null,
        product_type: form.product_type,
        digital_delivery_type: form.product_type === 'digital' ? (form.digital_delivery_type || null) : null,
        digital_file_path: form.product_type === 'digital' ? digitalFilePath : null,
        has_variants: hasVariants,
        is_active: form.is_active,
        images: allImages,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
      }

      let productId = id
      if (isEdit) {
        const { error } = await supabase.from('products').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data: newProduct, error } = await supabase.from('products').insert(payload).select('id').single()
        if (error) throw error
        productId = newProduct.id
      }

      // Sauvegarder variantes SERVICE
      if (form.product_type === 'service') {
        await supabase.from('product_variants').delete().eq('product_id', productId)
        const validOpts = serviceOptions.filter(o => o.name.trim() && o.price)
        if (validOpts.length > 0) {
          const { error } = await supabase.from('product_variants').insert(
            validOpts.map((o, idx) => ({
              product_id: productId,
              name: o.name.trim(),
              description: o.description?.trim() || null,
              price: parseFloat(o.price),
              stock: 999,
              attributes: {},
              sort_order: idx,
            }))
          )
          if (error) throw error
        }
      }

      // Sauvegarder variantes PHYSIQUES
      if (form.product_type === 'physical' && physicalVariants.length > 0) {
        await supabase.from('product_variants').delete().eq('product_id', productId)
        const valid = physicalVariants.filter(v => v.price !== '')
        if (valid.length > 0) {
          const { error } = await supabase.from('product_variants').insert(
            valid.map((v, idx) => ({
              product_id: productId,
              name: v.name,
              description: null,
              price: parseFloat(v.price),
              stock: parseInt(v.stock, 10) || 0,
              attributes: v.attributes,
              sort_order: idx,
            }))
          )
          if (error) throw error
        }
      }

      // Sauvegarder codes NUMÉRIQUES (ajouter nouveaux uniquement)
      if (form.product_type === 'digital' && form.digital_delivery_type === 'codes' && codesText.trim()) {
        const newCodes = codesText.split('\n').map(c => c.trim()).filter(c => c.length > 0)
        if (newCodes.length > 0) {
          const { error } = await supabase.from('product_codes').insert(
            newCodes.map(code => ({ product_id: productId, code }))
          )
          if (error) throw error
        }
        setCodesText('')
      }

      navigate('/admin/produits')
    } catch (err) {
      setError(err.message.includes('unique') ? 'Ce slug existe déjà. Modifiez le nom.' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const autoPrice = getAutoPrice()

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Informations générales ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Informations générales</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit *</label>
            <input type="text" value={form.name} onChange={handleNameChange} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Création de site web" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <input type="text" name="slug" value={form.slug} onChange={handleChange} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <button type="button" onClick={handleGenerateDescription} disabled={generating}
                className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-60">
                {generating ? (
                  <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Génération...</>
                ) : (
                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Générer avec ChatGPT</>
                )}
              </button>
            </div>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Description du produit..." />
            {descError && <p className="text-xs text-red-600 mt-1">{descError}</p>}
          </div>
        </div>

        {/* ── Type de produit ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Type de produit *</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'physical', label: 'Physique', desc: 'Livraison requise', icon: '📦' },
              { value: 'digital',  label: 'Numérique', desc: 'Fichier / lien', icon: '💾' },
              { value: 'service',  label: 'Service', desc: 'Prestation', icon: '🛠️' },
            ].map(t => (
              <label key={t.value}
                className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${
                  form.product_type === t.value ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input type="radio" name="product_type" value={t.value} checked={form.product_type === t.value}
                  onChange={handleChange} className="sr-only" />
                <div className="text-xl mb-1">{t.icon}</div>
                <p className={`text-sm font-semibold ${form.product_type === t.value ? 'text-primary' : 'text-gray-700'}`}>{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
              </label>
            ))}
          </div>
        </div>

        {/* ── OPTIONS DE SERVICE ── */}
        {form.product_type === 'service' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Formules / Options</h2>
                <p className="text-xs text-gray-400 mt-0.5">Chaque formule a son propre prix. Le client choisit sur la page produit.</p>
              </div>
              <button type="button" onClick={addServiceOption}
                className="flex items-center gap-1.5 text-sm text-primary font-medium border border-primary rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            </div>

            {serviceOptions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400 text-sm">Aucune formule. Cliquez sur Ajouter pour commencer.</p>
                <p className="text-xs text-gray-300 mt-1">Ex: Site vitrine → 100 000 FCFA</p>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceOptions.map((opt, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                        {idx + 1}
                      </span>
                      <input value={opt.name} onChange={e => updateServiceOption(idx, 'name', e.target.value)}
                        placeholder="Nom de la formule (ex: Site vitrine)*"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      <button type="button" onClick={() => removeServiceOption(idx)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex gap-2 pl-7">
                      <input value={opt.description} onChange={e => updateServiceOption(idx, 'description', e.target.value)}
                        placeholder="Description courte (optionnel)"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      <div className="relative flex-shrink-0 w-36">
                        <input type="number" value={opt.price} onChange={e => updateServiceOption(idx, 'price', e.target.value)}
                          placeholder="Prix*" min="0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary pr-14" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">FCFA</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {serviceOptions.length > 0 && autoPrice && (
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                Prix affiché dans la boutique : <strong>à partir de {Number(autoPrice).toLocaleString('fr-FR')} FCFA</strong>
              </p>
            )}
          </div>
        )}

        {/* ── VARIANTES PHYSIQUES ── */}
        {form.product_type === 'physical' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Variantes (optionnel)</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tailles, couleurs, poids... Laissez vide si le produit n'a pas de variantes.</p>
            </div>

            {/* Attributs */}
            <div className="space-y-3">
              {attributes.map((attr, ai) => (
                <div key={ai} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2 items-center">
                    <input value={attr.name} onChange={e => updateAttributeName(ai, e.target.value)}
                      placeholder="Nom de l'attribut (ex: Taille)"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium" />
                    <button type="button" onClick={() => removeAttribute(ai)}
                      className="text-red-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-0">
                    {attr.values.map((val, vi) => (
                      <div key={vi} className="flex items-center gap-1">
                        <input value={val} onChange={e => updateAttributeValue(ai, vi, e.target.value)}
                          placeholder={`Valeur ${vi + 1}`}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                        {attr.values.length > 1 && (
                          <button type="button" onClick={() => removeAttributeValue(ai, vi)}
                            className="text-gray-300 hover:text-red-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addAttributeValue(ai)}
                      className="text-xs text-primary font-medium hover:underline">
                      + valeur
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={addAttribute}
                className="flex items-center gap-1.5 text-sm text-gray-600 font-medium border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter un attribut
              </button>
              {attributes.length > 0 && (
                <button type="button" onClick={handleGenerateVariants}
                  className="flex items-center gap-1.5 text-sm text-white font-medium bg-primary rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Générer les combinaisons
                </button>
              )}
            </div>

            {/* Tableau des variantes générées */}
            {physicalVariants.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">{physicalVariants.length} combinaison(s) — renseignez le prix et le stock pour chacune</p>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Variante</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Prix (FCFA) *</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {physicalVariants.map((v, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-700 font-medium">{v.name}</td>
                          <td className="px-3 py-2">
                            <input type="number" value={v.price} onChange={e => updatePhysicalVariant(idx, 'price', e.target.value)}
                              placeholder="5000" min="0"
                              className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={v.stock} onChange={e => updatePhysicalVariant(idx, 'stock', e.target.value)}
                              placeholder="0" min="0"
                              className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {autoPrice && (
                  <p className="text-xs text-blue-600 mt-2">
                    Prix minimum : <strong>{Number(autoPrice).toLocaleString('fr-FR')} FCFA</strong> (affiché dans la boutique)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── LIVRAISON NUMÉRIQUE ── */}
        {form.product_type === 'digital' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Livraison numérique</h2>
            <p className="text-xs text-gray-400">Le contenu est envoyé automatiquement par email après paiement.</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'file', label: 'Fichier unique', desc: 'PDF, ZIP, vidéo...', icon: '📄' },
                { value: 'codes', label: 'Codes / Licences', desc: 'Pool de codes uniques', icon: '🔑' },
              ].map(t => (
                <label key={t.value}
                  className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${
                    form.digital_delivery_type === t.value ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <input type="radio" name="digital_delivery_type" value={t.value}
                    checked={form.digital_delivery_type === t.value} onChange={handleChange} className="sr-only" />
                  <div className="text-2xl mb-1">{t.icon}</div>
                  <p className={`text-sm font-semibold ${form.digital_delivery_type === t.value ? 'text-primary' : 'text-gray-700'}`}>{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                </label>
              ))}
            </div>

            {form.digital_delivery_type === 'file' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fichier à livrer</label>
                {form.digital_file_path ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-green-700 flex-1 truncate">{form.digital_file_path.split('/').pop()}</span>
                    <button type="button" onClick={() => { setForm(f => ({ ...f, digital_file_path: '' })); setDigitalFile(null) }}
                      className="text-xs text-red-500 hover:underline">Changer</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-primary transition-colors">
                    {digitalFile ? (
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{digitalFile.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{(digitalFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button type="button" onClick={e => { e.preventDefault(); setDigitalFile(null) }}
                          className="text-xs text-red-500 mt-2 hover:underline">Retirer</button>
                      </div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-500">Cliquez pour choisir un fichier</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, ZIP, MP4, etc.</p>
                      </>
                    )}
                    <input type="file" className="hidden" onChange={e => setDigitalFile(e.target.files?.[0] ?? null)} />
                  </label>
                )}
                {digitalFileUploading && (
                  <p className="text-xs text-blue-600 mt-1 animate-pulse">Envoi du fichier en cours...</p>
                )}
              </div>
            )}

            {form.digital_delivery_type === 'codes' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nouveaux codes à ajouter
                    <span className="text-gray-400 font-normal ml-1">(un par ligne)</span>
                  </label>
                  {codesCount > 0 && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                      {codesCount} code(s) disponible(s) en stock
                    </span>
                  )}
                </div>
                <textarea
                  value={codesText}
                  onChange={e => setCodesText(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder={'ABC-123-XYZ\nDEF-456-UVW\nGHI-789-RST\n...'}
                />
                {codesText.trim() && (
                  <p className="text-xs text-blue-600 mt-1">
                    {codesText.split('\n').filter(c => c.trim()).length} nouveaux codes seront ajoutés au stock existant.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Prix & stock ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Prix & stock</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix (FCFA) *
                {autoPrice !== null && <span className="ml-1 text-xs text-blue-600 font-normal">— auto</span>}
              </label>
              <input type="number" name="price"
                value={autoPrice !== null ? autoPrice : form.price}
                onChange={handleChange}
                disabled={autoPrice !== null}
                required={autoPrice === null}
                min="0" step="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="5000" />
              {autoPrice !== null && (
                <p className="text-xs text-blue-600 mt-0.5">Calculé depuis vos formules/variantes</p>
              )}
            </div>

            {/* Prix max : masqué si variantes */}
            {!autoPrice && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix max (FCFA)
                  <span className="ml-1 text-xs text-gray-400 font-normal">— optionnel</span>
                </label>
                <input type="number" name="price_max" value={form.price_max} onChange={handleChange}
                  min="0" step="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="150000" />
                {form.price_max && form.price && parseFloat(form.price_max) <= parseFloat(form.price) && (
                  <p className="text-xs text-red-500 mt-1">Le prix max doit être supérieur au prix min.</p>
                )}
              </div>
            )}

            {/* Promo : masqué si variantes */}
            {!autoPrice && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix promo (FCFA)
                  <span className="ml-1 text-xs text-gray-400 font-normal">— optionnel</span>
                </label>
                <input type="number" name="promo_price" value={form.promo_price} onChange={handleChange}
                  min="0" step="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="3500" />
              </div>
            )}

            {/* Stock : uniquement physique sans variantes */}
            {form.product_type === 'physical' && physicalVariants.length === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                <input type="number" name="stock" value={form.stock} onChange={handleChange} required min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select name="category_id" value={form.category_id} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Sans catégorie</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" name="is_active" checked={form.is_active} onChange={handleChange}
              className="w-4 h-4 text-primary rounded" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Produit actif (visible sur la boutique)</label>
          </div>
        </div>

        {/* ── Images ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Images <span className="text-sm font-normal text-gray-400">(max 5)</span></h2>

          {existingImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {existingImages.map((path, idx) => {
                const url = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
                return (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeExistingImage(idx)}
                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                  </div>
                )
              })}
            </div>
          )}

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((file, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-dashed border-primary">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNewImage(idx)}
                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
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
              <input type="file" accept="image/*" multiple onChange={handleImageFiles} className="hidden" />
            </label>
          )}
        </div>

        {/* ── SEO ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">SEO</h2>
              <p className="text-xs text-gray-400 mt-0.5">Balises meta affichées dans les moteurs de recherche</p>
            </div>
            <button type="button" onClick={handleGenerateSEO} disabled={generatingSEO}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors disabled:opacity-60">
              {generatingSEO ? (
                <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Génération...</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Générer avec ChatGPT</>
              )}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Titre SEO</label>
              <span className={`text-xs ${form.seo_title.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>{form.seo_title.length}/60</span>
            </div>
            <input type="text" name="seo_title" value={form.seo_title} onChange={handleChange} maxLength={80}
              placeholder="Titre affiché dans Google (max 60 caractères)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Meta description</label>
              <span className={`text-xs ${form.seo_description.length > 155 ? 'text-red-500' : 'text-gray-400'}`}>{form.seo_description.length}/155</span>
            </div>
            <textarea name="seo_description" value={form.seo_description} onChange={handleChange} rows={2} maxLength={200}
              placeholder="Description affichée sous le titre dans Google (max 155 caractères)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>

          {(form.seo_title || form.seo_description) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Aperçu Google</p>
              <p className="text-[#1a0dab] text-base font-medium leading-tight hover:underline cursor-pointer truncate">{form.seo_title || form.name}</p>
              <p className="text-[#006621] text-xs mt-0.5">numerik360.com/produit/{form.slug}</p>
              <p className="text-[#545454] text-sm mt-1 leading-relaxed line-clamp-2">{form.seo_description || form.description || 'Aucune description.'}</p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => navigate('/admin/produits')}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </div>
  )
}
