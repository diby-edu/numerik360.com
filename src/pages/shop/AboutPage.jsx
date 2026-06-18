import { Link } from 'react-router-dom'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'
import WhatsAppButton from '../../components/shop/WhatsAppButton'

const VALUES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Qualité avant tout',
    desc: 'Chaque produit est sélectionné avec soin pour garantir votre satisfaction.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Service client',
    desc: 'Une équipe disponible 7j/7 pour répondre à toutes vos questions.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    title: 'Livraison fiable',
    desc: 'Des délais de livraison respectés pour que vous receviez vos commandes à temps.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: 'Satisfaction garantie',
    desc: 'Votre satisfaction est notre priorité. Retour et remboursement simplifiés.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20 px-4 text-center">
        <h1 className="text-4xl font-black mb-4">À propos de nous</h1>
        <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
          Votre boutique en ligne de confiance, engagée à vous offrir la meilleure expérience shopping.
        </p>
      </section>

      {/* Notre histoire */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Notre histoire</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Née de la passion du commerce et du désir d'offrir aux consommateurs une alternative fiable et accessible,
              notre boutique a été fondée avec une mission claire : rendre le shopping en ligne simple, agréable et sécurisé.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Nous sélectionnons chaque produit avec le plus grand soin, en nous assurant qu'il répond aux attentes
              de nos clients en termes de qualité, de durabilité et de rapport qualité-prix.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Aujourd'hui, nous sommes fiers de servir des milliers de clients satisfaits et de continuer à grandir
              grâce à leur confiance renouvelée.
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-10 text-center">
            <div className="text-6xl font-black text-primary mb-2">100%</div>
            <div className="text-gray-600 font-medium mb-8">Clients satisfaits</div>
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-3xl font-black text-primary">24h</div>
                <div className="text-xs text-gray-500 mt-1">Délai de livraison</div>
              </div>
              <div>
                <div className="text-3xl font-black text-primary">7j/7</div>
                <div className="text-xs text-gray-500 mt-1">Support client</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nos valeurs */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Nos valeurs</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            {VALUES.map((v, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mx-auto mb-4">
                  {v.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{v.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Prêt à découvrir nos produits ?</h2>
        <p className="text-gray-500 mb-8">Explorez notre catalogue et trouvez ce qui vous correspond.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/boutique"
            className="bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-primary-dark transition-colors"
          >
            Voir le catalogue
          </Link>
          <Link
            to="/contact"
            className="border border-gray-300 text-gray-700 font-bold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Nous contacter
          </Link>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  )
}
