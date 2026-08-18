import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Navbar from '../../components/shop/Navbar'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet><title>Page introuvable — Numerik360</title></Helmet>
      <Navbar />
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="text-center">
          <p className="text-8xl font-black text-primary opacity-20 leading-none">404</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Page introuvable</h1>
          <p className="text-gray-500 mb-8">Cette page n'existe pas ou a été déplacée.</p>
          <Link to="/boutique" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Retour à la boutique
          </Link>
        </div>
      </div>
    </div>
  )
}
