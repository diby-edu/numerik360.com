import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { THEMES } from '../../lib/themes'

/* ── Helpers ── */
async function fetchSettings() {
  const { data } = await supabase.from('settings').select('key, value')
  return Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
}

async function saveSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value) }, { onConflict: 'key' })
  if (error) throw error
}

/* ── Toggle switch ── */
function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

/* ── ThemeCard ── */
function ThemeCard({ theme, isActive, onClick }) {
  const p = theme.preview
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-105 text-left ${
        isActive ? 'border-blue-600 shadow-lg shadow-blue-200' : 'border-gray-200 hover:border-gray-400'
      }`}
    >
      {isActive && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: p.navbar, borderBottom: `1px solid ${p.navbarBorder}` }}>
        <div className="w-10 h-2 rounded" style={{ background: p.primary }} />
        <div className="flex gap-1">
          <div className="w-4 h-1.5 rounded-sm" style={{ background: p.navbarText, opacity: 0.4 }} />
          <div className="w-4 h-1.5 rounded-sm" style={{ background: p.navbarText, opacity: 0.4 }} />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-5 px-3 gap-2" style={{ background: `linear-gradient(135deg, ${p.heroFrom}, ${p.heroTo})` }}>
        <div className="w-20 h-2 rounded bg-white opacity-90" />
        <div className="w-14 h-1.5 rounded bg-white opacity-60" />
        <div className="mt-1 px-3 py-1 rounded-lg text-xs font-bold" style={{ background: p.primary === p.heroFrom ? 'white' : p.primary, color: p.heroFrom }}>CTA</div>
      </div>
      <div className="grid grid-cols-3 gap-1 p-2" style={{ background: p.bg }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-lg overflow-hidden" style={{ background: p.surface, border: `1px solid ${p.navbarBorder}` }}>
            <div className="h-7" style={{ background: p.primary, opacity: 0.25 }} />
            <div className="p-1 space-y-0.5">
              <div className="h-1 rounded" style={{ background: p.text, opacity: 0.4 }} />
              <div className="h-1 rounded w-2/3" style={{ background: p.primary }} />
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 bg-white border-t border-gray-100">
        <p className="font-semibold text-gray-900 text-sm">{theme.name}</p>
        <p className="text-xs text-gray-500">{theme.description}</p>
      </div>
    </button>
  )
}

/* ── HeroModeCard ── */
function HeroModeCard({ mode, label, description, icon, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        isActive ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
          {icon}
        </div>
        <div>
          <p className={`font-semibold text-sm ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  )
}

const HERO_MODES = [
  {
    id: 'default',
    label: 'Désactivé',
    description: 'Gradient simple, pas d\'effet',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
  },
  {
    id: 'animation',
    label: 'Animation CSS',
    description: 'Dégradé animé + effets d\'entrée du texte',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
  {
    id: 'video',
    label: 'Vidéo fond',
    description: 'Vidéo en arrière-plan avec texte par-dessus',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.88v6.24a1 1 0 01-1.447.889L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  },
  {
    id: 'slider',
    label: 'Défilement d\'images',
    description: 'Carrousel automatique jusqu\'à 5 images',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
]

/* ── Bouton Sauvegarder réutilisable ── */
function SaveButton({ onClick, saving }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
    >
      {saving ? (
        <>
          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          Sauvegarde...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Sauvegarder
        </>
      )}
    </button>
  )
}

/* ── Page principale ── */
export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [local, setLocal] = useState({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploading, setUploading] = useState(false)
  const initialized = useRef(false)
  const fileInputRef = useRef(null)

  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchSettings,
  })

  // Initialiser l'état local une seule fois après chargement
  useEffect(() => {
    if (!isLoading && !initialized.current) {
      initialized.current = true
      setLocal({ ...settings })
    }
  }, [isLoading, settings])

  // Mutation uniquement pour les slides (sauvegarde immédiate)
  const mutation = useMutation({
    mutationFn: ({ key, value }) => saveSetting(key, value),
  })

  function setLocalKey(key, value) {
    setLocal(prev => ({ ...prev, [key]: String(value) }))
  }

  // Sauvegarde immédiate pour les slides uniquement
  function set(key, value) {
    mutation.mutate({ key, value })
    setLocal(prev => ({ ...prev, [key]: String(value) }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const entries = Object.entries(local).filter(([, v]) => v != null)
      await Promise.all(entries.map(([key, value]) => saveSetting(key, String(value))))
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['active-theme'] })
      queryClient.invalidateQueries({ queryKey: ['hero-settings'] })
      queryClient.invalidateQueries({ queryKey: ['setting', 'guest_checkout'] })
      queryClient.invalidateQueries({ queryKey: ['announcement'] })
      queryClient.invalidateQueries({ queryKey: ['footer-settings'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-number'] })
      queryClient.invalidateQueries({ queryKey: ['shop-name'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function uploadSlideImage(file) {
    const ext = file.name.split('.').pop()
    const path = `slides/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('hero').upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('hero').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSlideUpload(e) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      let current = []
      try { current = JSON.parse(local.hero_slides ?? '[]') } catch {}
      const remaining = 5 - current.length
      const toUpload = files.slice(0, remaining)
      const urls = await Promise.all(toUpload.map(uploadSlideImage))
      set('hero_slides', JSON.stringify([...current, ...urls]))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeSlide(idx) {
    let slides = []
    try { slides = JSON.parse(local.hero_slides ?? '[]') } catch {}
    slides.splice(idx, 1)
    set('hero_slides', JSON.stringify(slides))
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  let slides = []
  try { slides = JSON.parse(local.hero_slides ?? '[]') } catch {}

  return (
    <div className="max-w-4xl space-y-8 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-200">
              ✓ Sauvegardé
            </span>
          )}
          {saveError && (
            <span className="text-sm text-red-600 font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
              ✗ {saveError}
            </span>
          )}
          <SaveButton onClick={handleSave} saving={saving} />
        </div>
      </div>

      {/* ═══ SECTION : APPARENCE ═══ */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Apparence — Template</h2>
        <p className="text-sm text-gray-500 mb-4">Choisissez le thème visuel de votre boutique. Cliquez sur Sauvegarder pour appliquer.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {THEMES.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={local.active_theme === theme.id}
              onClick={() => setLocalKey('active_theme', theme.id)}
            />
          ))}
        </div>
      </section>

      {/* ═══ SECTION : HERO ═══ */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Bannière d'accueil (Hero)</h2>
          <p className="text-sm text-gray-500">Personnalisez l'apparence du bandeau en haut de la page d'accueil.</p>
        </div>

        {/* Textes */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={local.hero_title ?? ''}
              onChange={e => setLocalKey('hero_title', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bienvenue sur notre boutique"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
            <input
              type="text"
              value={local.hero_subtitle ?? ''}
              onChange={e => setLocalKey('hero_subtitle', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Votre sous-titre..."
            />
          </div>
        </div>

        {/* Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Mode du hero</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {HERO_MODES.map(mode => (
              <HeroModeCard
                key={mode.id}
                {...mode}
                isActive={local.hero_mode === mode.id}
                onClick={() => setLocalKey('hero_mode', mode.id)}
              />
            ))}
          </div>
        </div>

        {/* Config vidéo */}
        {local.hero_mode === 'video' && (
          <div className="border-t border-gray-100 pt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de la vidéo</label>
            <p className="text-xs text-gray-400 mb-2">Lien direct vers un fichier vidéo .mp4 (ex : depuis Supabase Storage, Cloudinary, etc.)</p>
            <input
              type="url"
              value={local.hero_video_url ?? ''}
              onChange={e => setLocalKey('hero_video_url', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/video.mp4"
            />
          </div>
        )}

        {/* Config slider */}
        {local.hero_mode === 'slider' && (
          <div className="border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Images du slider</label>
                <p className="text-xs text-gray-400">{slides.length}/5 images • Format recommandé : 1920×600px</p>
              </div>
              {slides.length < 5 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {uploading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  Ajouter
                </button>
              )}
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleSlideUpload} />
            </div>

            {slides.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {slides.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden aspect-video bg-gray-100">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <button
                        onClick={() => removeSlide(idx)}
                        className="opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <span className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">{idx + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500">Cliquez pour ajouter des images</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG • Max 5 images</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══ SECTION : NOM DE LA BOUTIQUE ═══ */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Nom de la boutique</h2>
        <p className="text-sm text-gray-500 mb-4">Apparaît dans la navbar, le footer et les emails.</p>
        <input
          type="text"
          value={local.shop_name ?? ''}
          onChange={e => setLocalKey('shop_name', e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ex: Ma Boutique"
        />
      </section>

      {/* ═══ SECTION : BARRE D'ANNONCE ═══ */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Barre d'annonce</h2>
          <p className="text-sm text-gray-500">Bandeau coloré affiché en haut de toutes les pages de la boutique.</p>
        </div>

        <div className="flex items-center justify-between">
          <p className="font-medium text-gray-900 text-sm">Activer la barre d'annonce</p>
          <Toggle
            enabled={local.announcement_enabled === 'true'}
            onChange={v => setLocalKey('announcement_enabled', v)}
          />
        </div>

        {local.announcement_enabled === 'true' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texte de l'annonce</label>
              <input
                type="text"
                value={local.announcement_text ?? ''}
                onChange={e => setLocalKey('announcement_text', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Livraison gratuite dès 50 000 FCFA ✦ Paiement sécurisé"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Couleur de fond</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={local.announcement_bg ?? '#2563EB'}
                  onChange={e => setLocalKey('announcement_bg', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <span className="text-sm text-gray-500">{local.announcement_bg ?? '#2563EB'}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ═══ SECTION : BOUTIQUE ═══ */}
      <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="flex items-center justify-between p-5">
          <div className="flex-1 pr-6">
            <p className="font-medium text-gray-900">Achat sans compte (invité)</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Permet aux visiteurs de passer commande sans créer de compte.
              Si désactivé, la connexion est obligatoire au checkout.
            </p>
          </div>
          <Toggle
            enabled={local.guest_checkout === 'true'}
            onChange={v => setLocalKey('guest_checkout', v)}
          />
        </div>
      </section>

      {/* ═══ SECTION : CONTACT & RÉSEAUX SOCIAUX ═══ */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Contact & réseaux sociaux</h2>
          <p className="text-sm text-gray-500">Ces informations apparaissent dans le footer et sur la page Contact.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={local.contact_phone ?? ''}
              onChange={e => setLocalKey('contact_phone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+221 XX XXX XX XX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
            <input
              type="email"
              value={local.contact_email ?? ''}
              onChange={e => setLocalKey('contact_email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@boutique.com"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={local.contact_address ?? ''}
              onChange={e => setLocalKey('contact_address', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dakar, Sénégal"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 fill-current text-[#25D366]" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Numéro WhatsApp
            </span>
          </label>
          <input
            type="tel"
            value={local.whatsapp_number ?? ''}
            onChange={e => setLocalKey('whatsapp_number', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+221XXXXXXXXX (avec indicatif pays)"
          />
          <p className="text-xs text-gray-400 mt-1">Le bouton WhatsApp flottant apparaît sur la boutique si ce champ est renseigné.</p>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Réseaux sociaux</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Facebook (URL)</label>
              <input
                type="url"
                value={local.social_facebook ?? ''}
                onChange={e => setLocalKey('social_facebook', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Instagram (URL)</label>
              <input
                type="url"
                value={local.social_instagram ?? ''}
                onChange={e => setLocalKey('social_instagram', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Twitter / X (URL)</label>
              <input
                type="url"
                value={local.social_twitter ?? ''}
                onChange={e => setLocalKey('social_twitter', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://twitter.com/..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Bouton bas de page */}
      <div className="flex justify-end pt-2 pb-4">
        <SaveButton onClick={handleSave} saving={saving} />
      </div>
    </div>
  )
}
