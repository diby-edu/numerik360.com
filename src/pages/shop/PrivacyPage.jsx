import { Link } from 'react-router-dom'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span>/</span>
          <span className="text-gray-900">Politique de confidentialité</span>
        </nav>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 prose prose-gray max-w-none">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Politique de confidentialité</h1>
          <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : juin 2025</p>

          <h2>1. Collecte des données</h2>
          <p>Nous collectons les informations que vous nous fournissez directement lors de votre inscription, de vos commandes ou de vos demandes de service : nom, adresse email, numéro de téléphone et adresse de livraison.</p>

          <h2>2. Utilisation des données</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Traiter et livrer vos commandes</li>
            <li>Vous envoyer des confirmations et mises à jour de commande</li>
            <li>Vous contacter suite à une demande de service</li>
            <li>Améliorer notre service client</li>
          </ul>

          <h2>3. Partage des données</h2>
          <p>Nous ne vendons ni ne louons vos données personnelles à des tiers. Elles peuvent être partagées uniquement avec nos prestataires de paiement (Wave, Orange Money) dans le cadre du traitement de vos transactions.</p>

          <h2>4. Sécurité</h2>
          <p>Vos données sont stockées de manière sécurisée via Supabase. Les paiements en ligne sont traités par des prestataires certifiés et nous ne stockons jamais vos informations bancaires.</p>

          <h2>5. Vos droits</h2>
          <p>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Pour exercer ces droits, contactez-nous via la <Link to="/contact" className="text-primary hover:underline">page Contact</Link>.</p>

          <h2>6. Cookies</h2>
          <p>Nous utilisons des cookies techniques nécessaires au fonctionnement du site (panier, session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>

          <h2>7. Contact</h2>
          <p>Pour toute question relative à la confidentialité de vos données, contactez-nous via notre <Link to="/contact" className="text-primary hover:underline">page de contact</Link>.</p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
