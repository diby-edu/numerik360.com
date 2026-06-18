import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

const STATUS_LABELS = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
}

const PAYMENT_LABELS = {
  delivery: 'À la livraison',
  wave: 'Wave',
  orange_money: 'Orange Money',
}

export default function AccountOrderDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (error) throw error
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Commande introuvable.</p>
        <Link to="/mon-compte/commandes" className="text-primary hover:underline text-sm">
          ← Retour à mes commandes
        </Link>
      </div>
    )
  }

  const status = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-800' }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/mon-compte/commandes" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Détail de la commande</h1>
      </div>

      {/* Infos générales */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Numéro de commande</p>
            <p className="font-mono text-xs text-gray-700 break-all">{order.id}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Date</p>
            <p className="font-medium text-gray-800">{formatDate(order.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Statut</p>
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Paiement</p>
            <p className="font-medium text-gray-800">{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</p>
          </div>
        </div>
      </div>

      {/* Adresse livraison */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Livraison</h2>
        <div className="text-sm space-y-1 text-gray-700">
          <p><span className="text-gray-500">Nom :</span> {order.customer_name}</p>
          <p><span className="text-gray-500">Téléphone :</span> {order.customer_phone}</p>
          <p><span className="text-gray-500">Adresse :</span> {order.customer_address}</p>
        </div>
      </div>

      {/* Articles commandés */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Articles commandés</h2>
        <div className="divide-y divide-gray-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-3 text-sm">
              <div>
                <p className="font-medium text-gray-800">{item.name}</p>
                <p className="text-gray-500">Qté : {item.quantity}</p>
              </div>
              <p className="font-semibold text-gray-900">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-4 mt-2 flex justify-between font-bold text-gray-900">
          <span>Total</span>
          <span className="text-primary">{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  )
}
