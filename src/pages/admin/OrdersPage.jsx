import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

const STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'cancelled', label: 'Annulée' },
]

const STATUS_LABELS = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Expédiée', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
}

const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'shipped',
  shipped: 'delivered',
}

const PAYMENT_LABELS = {
  delivery: 'À la livraison',
  paydunya: 'PayDunya',
  wave: 'Wave',
  orange_money: 'Orange Money',
}

const PAYMENT_STATUS_LABELS = {
  paid:   { label: 'Payé',     color: 'bg-green-100 text-green-700' },
  pending:{ label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  cod:    { label: 'À la livraison', color: 'bg-gray-100 text-gray-600' },
  unpaid: { label: 'Non payé', color: 'bg-red-100 text-red-700' },
}

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrdersPage() {
  const qc = useQueryClient()
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (filterStatus) query = query.eq('status', filterStatus)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, order }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
      // Envoyer email si le client a une adresse email
      if (order?.customer_email) {
        await fetch('/api/notify-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order, newStatus: status }),
        })
      }
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['orders-all'] })
      if (selectedOrder) {
        setSelectedOrder(prev => ({ ...prev, status }))
      }
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Commandes</h1>
      </div>

      {/* Filtres statut */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s.value
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Paiement</th>
                <th className="px-4 py-3 font-medium">Paiement statut</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chargement...</td></tr>
              )}
              {!isLoading && orders.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucune commande</td></tr>
              )}
              {orders.map(order => {
                const s = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending
                const ps = PAYMENT_STATUS_LABELS[order.payment_status] ?? PAYMENT_STATUS_LABELS.unpaid
                const next = NEXT_STATUS[order.status]
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{order.customer_name}</p>
                        <p className="text-xs text-gray-400">{order.customer_phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-gray-500">{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>
                        {ps.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Détail
                        </button>
                        {next && (
                          <button
                            onClick={() => statusMutation.mutate({ id: order.id, status: next, order })}
                            disabled={statusMutation.isPending}
                            className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                          >
                            → {STATUS_LABELS[next].label}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détail commande */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">Détail commande</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-medium">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Téléphone</p>
                  <p className="font-medium">{selectedOrder.customer_phone}</p>
                </div>
                {selectedOrder.customer_email && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{selectedOrder.customer_email}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-gray-500">Adresse</p>
                  <p className="font-medium">{selectedOrder.customer_address}</p>
                </div>
                <div>
                  <p className="text-gray-500">Mode de paiement</p>
                  <p className="font-medium">{PAYMENT_LABELS[selectedOrder.payment_method] ?? selectedOrder.payment_method}</p>
                </div>
                <div>
                  <p className="text-gray-500">Statut paiement</p>
                  {(() => {
                    const ps = PAYMENT_STATUS_LABELS[selectedOrder.payment_status] ?? PAYMENT_STATUS_LABELS.unpaid
                    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>{ps.label}</span>
                  })()}
                </div>
                <div>
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Articles commandés</p>
                <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {(selectedOrder.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.variant_name && <p className="text-xs text-blue-500">{item.variant_name}</p>}
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                      <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total</span>
                <span>{formatPrice(selectedOrder.total)}</span>
              </div>

              {/* Changer statut */}
              {NEXT_STATUS[selectedOrder.status] && (
                <button
                  onClick={() => {
                    const next = NEXT_STATUS[selectedOrder.status]
                    statusMutation.mutate({ id: selectedOrder.id, status: next, order: selectedOrder })
                  }}
                  disabled={statusMutation.isPending}
                  className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {statusMutation.isPending ? 'Mise à jour...' : `Passer à : ${STATUS_LABELS[NEXT_STATUS[selectedOrder.status]].label}`}
                </button>
              )}
              {!selectedOrder.customer_email && (
                <p className="text-xs text-gray-400 text-center">Pas d'email — aucune notification ne sera envoyée</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
