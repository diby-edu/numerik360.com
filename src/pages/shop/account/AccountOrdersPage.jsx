import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

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

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function AccountOrdersPage() {
  const { user } = useAuth()
  const [selectedOrder, setSelectedOrder] = useState(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-5">Mes commandes</h1>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse h-20" />
          ))}
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 text-sm">Vous n'avez pas encore passé de commande.</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map(order => {
          const s = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
          return (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">
                    Commande du {formatDate(order.created_at)} · #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {(order.items ?? []).length} article(s) · {PAYMENT_LABELS[order.payment_method]}
                  </p>
                  <p className="font-bold text-gray-900 mt-1">{formatPrice(order.total)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                    {s.label}
                  </span>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Voir le détail
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal détail */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="font-bold text-gray-900">Détail de la commande</h2>
                <p className="text-xs text-gray-400">#{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Statut</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[selectedOrder.status]?.color}`}>
                    {STATUS_LABELS[selectedOrder.status]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Paiement</p>
                  <p className="font-medium">{PAYMENT_LABELS[selectedOrder.payment_method]}</p>
                </div>
                <div>
                  <p className="text-gray-500">Adresse</p>
                  <p className="font-medium text-xs">{selectedOrder.customer_address}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Articles</p>
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {(selectedOrder.items ?? []).map((item, i) => (
                    <div key={i} className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">x{item.quantity} · {formatPrice(item.price)} / unité</p>
                      </div>
                      <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total</span>
                <span className="text-primary">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
