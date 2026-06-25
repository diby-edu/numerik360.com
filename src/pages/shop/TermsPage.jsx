import { Link } from 'react-router-dom'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span>/</span>
          <span className="text-gray-900">Conditions générales</span>
        </nav>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 prose prose-gray max-w-none">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Conditions générales de vente</h1>
          <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : juin 2025</p>

          <h2>1. Objet</h2>
          <p>Les présentes conditions générales régissent les ventes de produits et services effectuées sur notre boutique en ligne. Toute commande passée implique l'acceptation pleine et entière de ces conditions.</p>

          <h2>2. Produits et services</h2>
          <p>Nous proposons trois types d'offres :</p>
          <ul>
            <li><strong>Produits physiques</strong> : livrés à l'adresse indiquée lors de la commande</li>
            <li><strong>Produits numériques</strong> : livrés par email sous 24h après confirmation du paiement</li>
            <li><strong>Services</strong> : démarrés après validation de votre demande et paiement convenu</li>
          </ul>

          <h2>3. Prix</h2>
          <p>Les prix sont indiqués en Francs CFA (XOF) toutes taxes comprises. Nous nous réservons le droit de modifier nos prix à tout moment, étant entendu que le prix applicable est celui en vigueur au moment de la commande.</p>

          <h2>4. Paiement</h2>
          <p>Nous acceptons les moyens de paiement suivants : Wave, Orange Money, carte bancaire (via PayDunya), et paiement à la livraison pour les produits physiques.</p>

          <h2>5. Livraison</h2>
          <p>Les délais de livraison pour les produits physiques varient selon votre localisation. Les produits numériques sont envoyés par email sous 24h. Les services démarrent après accord et paiement.</p>

          <h2>6. Droit de rétractation</h2>
          <p>Pour les produits physiques, vous disposez de 7 jours après réception pour retourner un article non utilisé dans son emballage d'origine. Les produits numériques téléchargés et les services commencés ne sont pas remboursables, sauf défaut avéré.</p>

          <h2>7. Garantie satisfaction</h2>
          <p>Pour nos services, nous offrons une garantie satisfaction de 7 jours après démarrage. Si vous n'êtes pas satisfait, contactez-nous pour trouver une solution.</p>

          <h2>8. Responsabilité</h2>
          <p>Notre responsabilité est limitée au montant de la commande concernée. Nous ne pouvons être tenus responsables des dommages indirects liés à l'utilisation de nos produits ou services.</p>

          <h2>9. Contact</h2>
          <p>Pour toute réclamation ou question, contactez-nous via notre <Link to="/contact" className="text-primary hover:underline">page de contact</Link>.</p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
