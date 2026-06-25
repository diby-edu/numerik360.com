import { Link } from 'react-router-dom'
import Navbar from '../../components/shop/Navbar'
import Footer from '../../components/shop/Footer'

export default function RgpdPage() {
  return (
    <div className="min-h-screen bg-theme-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span>/</span>
          <span className="text-gray-900">Protection des données (RGPD)</span>
        </nav>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 prose prose-gray max-w-none">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Protection des données personnelles</h1>
          <p className="text-sm text-gray-400 mb-8">Dernière mise à jour : juin 2025</p>

          <h2>1. Responsable du traitement</h2>
          <p>Le responsable du traitement des données personnelles collectées sur ce site est l'exploitant de la boutique. Pour toute demande, utilisez notre <Link to="/contact" className="text-primary hover:underline">formulaire de contact</Link>.</p>

          <h2>2. Données collectées</h2>
          <p>Nous collectons uniquement les données nécessaires au bon fonctionnement de nos services :</p>
          <ul>
            <li><strong>Nom et prénom</strong> : identification et livraison</li>
            <li><strong>Adresse email</strong> : confirmation de commande et communication</li>
            <li><strong>Numéro de téléphone</strong> : contact et livraison</li>
            <li><strong>Adresse postale</strong> : livraison des produits physiques (optionnel)</li>
          </ul>

          <h2>3. Base légale du traitement</h2>
          <p>Le traitement de vos données est fondé sur :</p>
          <ul>
            <li>L'exécution du contrat (traitement de vos commandes)</li>
            <li>Votre consentement (newsletter, si applicable)</li>
            <li>Notre intérêt légitime (amélioration du service)</li>
          </ul>

          <h2>4. Durée de conservation</h2>
          <p>Vos données sont conservées pendant la durée nécessaire à la réalisation des services commandés, et au maximum 3 ans après votre dernière interaction avec notre boutique.</p>

          <h2>5. Vos droits</h2>
          <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
            <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
            <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
            <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format standard</li>
            <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
          </ul>
          <p>Pour exercer ces droits, contactez-nous via notre <Link to="/contact" className="text-primary hover:underline">page de contact</Link>. Nous répondrons dans un délai de 30 jours.</p>

          <h2>6. Sécurité des données</h2>
          <p>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou divulgation.</p>

          <h2>7. Transferts de données</h2>
          <p>Vos données sont hébergées sur des serveurs sécurisés. Elles peuvent être transmises à nos prestataires de paiement uniquement dans le cadre du traitement de vos transactions.</p>
        </div>
      </div>
      <Footer />
    </div>
  )
}
