// Génère public/sitemap.xml au build : pages statiques + toutes les fiches
// produit + les catégories. Lancé automatiquement avant `vite build` (prebuild).
// Résilient : si Supabase est injoignable, on garde le sitemap existant.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const BASE = 'https://numerik360.com'
const OUT = resolve(ROOT, 'public', 'sitemap.xml')

// Récupère les variables d'env (process.env sinon .env à la racine)
function env(key) {
  if (process.env[key]) return process.env[key]
  try {
    const raw = readFileSync(resolve(ROOT, '.env'), 'utf8')
    const line = raw.split('\n').find(l => l.startsWith(key + '='))
    if (line) return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
  } catch { /* pas de .env */ }
  return undefined
}

const URL = env('VITE_SUPABASE_URL')
const KEY = env('VITE_SUPABASE_ANON_KEY')

// Pages statiques indexables (chemin, priorité, fréquence)
const STATIC = [
  ['/', '1.0', 'daily'],
  ['/boutique', '0.9', 'daily'],
  ['/contact', '0.6', 'monthly'],
  ['/a-propos', '0.5', 'monthly'],
  ['/confidentialite', '0.2', 'yearly'],
  ['/conditions', '0.2', 'yearly'],
]

function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]
  ))
}

function urlTag(loc, priority, changefreq) {
  return `  <url><loc>${xmlEscape(loc)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`
}

async function sbGet(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!r.ok) throw new Error(`Supabase ${r.status}`)
  return r.json()
}

async function main() {
  if (!URL || !KEY) {
    console.warn('[sitemap] Variables Supabase absentes — sitemap existant conservé.')
    return
  }
  let products = []
  let categories = []
  try {
    ;[products, categories] = await Promise.all([
      sbGet('products?select=slug&is_active=eq.true'),
      sbGet('categories?select=slug'),
    ])
  } catch (e) {
    console.warn('[sitemap] Supabase injoignable (' + e.message + ') — sitemap existant conservé.')
    return
  }

  const lines = STATIC.map(([p, pr, cf]) => urlTag(BASE + p, pr, cf))
  for (const c of categories) {
    if (c.slug) lines.push(urlTag(`${BASE}/boutique?categorie=${encodeURIComponent(c.slug)}`, '0.7', 'weekly'))
  }
  for (const p of products) {
    if (p.slug) lines.push(urlTag(`${BASE}/produit/${encodeURIComponent(p.slug)}`, '0.8', 'weekly'))
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join('\n')}
</urlset>
`
  writeFileSync(OUT, xml, 'utf8')
  console.log(`[sitemap] ${STATIC.length} pages + ${categories.length} catégories + ${products.length} produits écrits.`)
}

main().catch(e => {
  console.warn('[sitemap] échec non bloquant :', e.message)
  process.exit(0)
})
