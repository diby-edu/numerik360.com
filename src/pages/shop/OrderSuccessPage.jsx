import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import useCartStore from '../../store/cartStore'

export default function OrderSuccessPage() {
  const { state } = useLocation()
  const orderId = state?.orderId
  const clearCart = useCartStore(s => s.clearCart)

  useEffect(() => { clearCart() }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande confirmée !</h1>
        <p className="text-gray-600 mb-4">
          Merci pour votre commande. Nous vous contacterons bientôt pour la livraison.
        </p>
        {orderId && (
          <p className="text-sm text-gray-500 mb-6">
            Numéro de commande : <span className="font-mono font-medium text-gray-800">{orderId.slice(0, 8).toUpperCase()}</span>
          </p>
        )}
        <Link to="/boutique" className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Continuer mes achats
        </Link>
      </div>
    </div>
  )
}
