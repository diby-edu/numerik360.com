import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

async function fetchFooterSettings() {
  const keys = ['social_facebook', 'social_instagram', 'social_twitter', 'contact_email', 'contact_phone', 'contact_address', 'shop_name']
  const { data } = await supabase.from('settings').select('key, value').in('key', keys)
  return Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
}

export default function Footer() {
  const { data: s = {} } = useQuery({
    queryKey: ['footer-settings'],
    queryFn: fetchFooterSettings,
    staleTime: 60000,
  })

  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

          {/* Colonne 1 — Marque */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">{s.shop_name || 'Boutique'}</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Votre destination shopping en ligne. Produits de qualité, livrés chez vous.
            </p>
            {/* Réseaux sociaux */}
            <div className="flex gap-3">
              {s.social_facebook && (
                <a href={s.social_facebook} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary transition-colors flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  </svg>
                </a>
              )}
              {s.social_instagram && (
                <a href={s.social_instagram} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary transition-colors flex items-center justify-center">
                  <svg className="w-4 h-4 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
              )}
              {s.social_twitter && (
                <a href={s.social_twitter} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-gray-800 hover:bg-primary transition-colors flex items-center justify-center">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Colonne 2 — Navigation */}
          <div>
            <h3 className="text-white font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Accueil</Link></li>
              <li><Link to="/boutique" className="hover:text-white transition-colors">Catalogue</Link></li>
              <li><Link to="/a-propos" className="hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Colonne 3 — Mon compte */}
          <div>
            <h3 className="text-white font-semibold mb-4">Mon compte</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/connexion" className="hover:text-white transition-colors">Connexion</Link></li>
              <li><Link to="/inscription" className="hover:text-white transition-colors">Créer un compte</Link></li>
              <li><Link to="/mon-compte/commandes" className="hover:text-white transition-colors">Mes commandes</Link></li>
              <li><Link to="/panier" className="hover:text-white transition-colors">Mon panier</Link></li>
            </ul>
          </div>

          {/* Colonne 4 — Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              {s.contact_phone && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{s.contact_phone}</span>
                </li>
              )}
              {s.contact_email && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${s.contact_email}`} className="hover:text-white transition-colors">{s.contact_email}</a>
                </li>
              )}
              {s.contact_address && (
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{s.contact_address}</span>
                </li>
              )}
              {!s.contact_phone && !s.contact_email && !s.contact_address && (
                <li className="text-gray-500 text-xs">Configurez vos infos dans l'admin → Paramètres</li>
              )}
            </ul>
          </div>
        </div>

        {/* Barre bas */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {year} {s.shop_name || 'Boutique'}. Tous droits réservés.</p>
          <div className="flex gap-4">
            <span>Paiement sécurisé</span>
            <span>•</span>
            <span>Livraison rapide</span>
            <span>•</span>
            <span>Support client</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
