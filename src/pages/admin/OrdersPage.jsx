import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

// ── Commandes physiques / numériques ──────────────────────
const ORDER_STATUSES = [
  { value: '', label: 'Tous' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'shipped', label: 'Expédiée' },
  { value: 'delivered', label: 'Livrée' },
  { value: 'cancelled', label: 'Annulée' },
]
const ORDER_STATUS_LABELS = {
  pending:   { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmée',  color: 'bg-blue-100 text-blue-800' },
  shipped:   { label: 'Expédiée',   color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Livrée',     color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulée',    color: 'bg-red-100 text-red-800' },
}
const NEXT_ORDER_STATUS = { pending: 'confirmed', confirmed: 'shipped', shipped: 'delivered' }
const PAYMENT_LABELS = { delivery: 'À la livraison', paydunya: 'PayDunya', wave: 'Wave', orange_money: 'Orange Money' }
const PAYMENT_STATUS_LABELS = {
  paid:    { label: 'Payé',             color: 'bg-green-100 text-green-700' },
  pending: { label: 'En attente',       color: 'bg-yellow-100 text-yellow-700' },
  cod:     { label: 'À la livraison',   color: 'bg-gray-100 text-gray-600' },
  unpaid:  { label: 'Non payé',         color: 'bg-red-100 text-red-700' },
}

// ── Demandes de service ───────────────────────────────────
const SR_STATUSES = [
  { value: '', label: 'Toutes' },
  { value: 'new', label: 'Nouvelles' },
  { value: 'contacted', label: 'Contacté' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminées' },
  { value: 'cancelled', label: 'Annulées' },
]
const SR_STATUS_LABELS = {
  new:         { label: 'Nouvelle',  color: 'bg-blue-100 text-blue-700' },
  contacted:   { label: 'Contacté',  color: 'bg-yellow-100 text-yellow-700' },
  in_progress: { label: 'En cours',  color: 'bg-purple-100 text-purple-700' },
  done:        { label: 'Terminée',  color: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Annulée',   color: 'bg-red-100 text-red-700' },
}
const NEXT_SR_STATUS = { new: 'contacted', contacted: 'in_progress', in_progress: 'done' }
const START_LABELS = { now: 'Dès maintenant', this_week: 'Cette semaine', this_month: 'Ce mois-ci' }
const CONTACT_LABELS = { whatsapp: 'WhatsApp', phone: 'Appel', email: 'Email' }
const CONTACT_ICONS = {
  whatsapp: '💬',
  phone: '📞',
  email: '✉️',
}

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ════════════════════════════════════════════════════════
export default function OrdersPage() {
  const qc = useQueryClient()
  const [mainTab, setMainTab] = useState('physical') // 'physical' | 'digital' | 'service'
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedSR, setSelectedSR] = useState(null)
  const [adminNotes, setAdminNotes] = useState('')

  // ── Commandes physiques ──
  const { data: physicalOrders = [], isLoading: loadingPhys } = useQuery({
    queryKey: ['orders-physical', filterStatus],
    enabled: mainTab === 'physical',
    queryFn: async () => {
      let q = supabase.from('orders').select('*').order('created_at', { ascending: false })
      q = q.or('order_type.eq.physical,order_type.is.null')
      if (filterStatus) q = q.eq('status', filterStatus)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  // ── Commandes numériques ──
  const { data: digitalOrders = [], isLoading: loadingDigital } = useQuery({
    queryKey: ['orders-digital', filterStatus],
    enabled: mainTab === 'digital',
    queryFn: async () => {
      let q = supabase.from('orders').select('*').eq('order_type', 'digital').order('created_at', { ascending: false })
      if (filterStatus) q = q.eq('status', filterStatus)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  // ── Demandes service ──
  const { data: serviceRequests = [], isLoading: loadingSR } = useQuery({
    queryKey: ['service-requests', filterStatus],
    enabled: mainTab === 'service',
    queryFn: async () => {
      let q = supabase.from('service_requests').select('*').order('created_at', { ascending: false })
      if (filterStatus) q = q.eq('status', filterStatus)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })

  // ── Mutation statut commande ──
  const orderStatusMutation = useMutation({
    mutationFn: async ({ id, status, order }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id)
      if (error) throw error
      if (order?.customer_email) {
        await fetch('/api/notify-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order, newStatus: status }),
        })
      }
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['orders-physical'] })
      qc.invalidateQueries({ queryKey: ['orders-digital'] })
      if (selectedOrder) setSelectedOrder(prev => ({ ...prev, status }))
    },
  })

  // ── Mutation statut demande service ──
  const srStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const update = { status }
      if (notes !== undefined) update.admin_notes = notes
      const { error } = await supabase.from('service_requests').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status, notes }) => {
      qc.invalidateQueries({ queryKey: ['service-requests'] })
      if (selectedSR) setSelectedSR(prev => ({ ...prev, status, admin_notes: notes ?? prev.admin_notes }))
    },
  })

  function switchTab(tab) {
    setMainTab(tab)
    setFilterStatus('')
    setSelectedOrder(null)
    setSelectedSR(null)
  }

  const currentStatuses = mainTab === 'service' ? SR_STATUSES : ORDER_STATUSES
  const currentOrders = mainTab === 'physical' ? physicalOrders : mainTab === 'digital' ? digitalOrders : []
  const isLoadingOrders = mainTab === 'physical' ? loadingPhys : mainTab === 'digital' ? loadingDigital : false

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Commandes & Demandes</h1>
      </div>

      {/* ── Onglets principaux ── */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'physical', label: '📦 Physique', desc: 'Livraison' },
          { key: 'digital',  label: '💾 Numérique', desc: 'Email' },
          { key: 'service',  label: '🛠️ Services', desc: 'Demandes' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
              mainTab === t.key
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs font-normal ${mainTab === t.key ? 'text-blue-200' : 'text-gray-400'}`}>
              {t.desc}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filtres statut ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {currentStatuses.map(s => (
          <button
            key={s.value}
            onClick={() => setFilterStatus(s.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s.value
                ? 'bg-gray-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* TAB PHYSIQUE & NUMÉRIQUE                 */}
      {/* ══════════════════════════════════════════ */}
      {mainTab !== 'service' && (
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
                {isLoadingOrders && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Chargement...</td></tr>
                )}
                {!isLoadingOrders && currentOrders.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">Aucune commande</td></tr>
                )}
                {currentOrders.map(order => {
                  const s  = ORDER_STATUS_LABELS[order.status] ?? ORDER_STATUS_LABELS.pending
                  const ps = PAYMENT_STATUS_LABELS[order.payment_status] ?? PAYMENT_STATUS_LABELS.unpaid
                  const next = NEXT_ORDER_STATUS[order.status]
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{order.customer_name}</p>
                        <p className="text-xs text-gray-400">{order.customer_phone}</p>
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
                          <button onClick={() => setSelectedOrder(order)} className="text-xs text-blue-600 hover:underline font-medium">
                            Détail
                          </button>
                          {next && (
                            <button
                              onClick={() => orderStatusMutation.mutate({ id: order.id, status: next, order })}
                              disabled={orderStatusMutation.isPending}
                              className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                            >
                              → {ORDER_STATUS_LABELS[next].label}
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
      )}

      {/* ══════════════════════════════════════════ */}
      {/* TAB SERVICE                              */}
      {/* ══════════════════════════════════════════ */}
      {mainTab === 'service' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Service & Formule</th>
                  <th className="px-4 py-3 font-medium">Besoin décrit</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Délai</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingSR && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Chargement...</td></tr>
                )}
                {!loadingSR && serviceRequests.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Aucune demande de service</td></tr>
                )}
                {serviceRequests.map(sr => {
                  const s = SR_STATUS_LABELS[sr.status] ?? SR_STATUS_LABELS.new
                  const next = NEXT_SR_STATUS[sr.status]
                  return (
                    <tr key={sr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{sr.customer_name}</p>
                        <p className="text-xs text-gray-400">{sr.customer_phone}</p>
                        {sr.customer_email && <p className="text-xs text-blue-500">{sr.customer_email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{sr.product_name}</p>
                        {sr.variant_name && <p className="text-xs text-purple-600 font-semibold">{sr.variant_name}</p>}
                        {sr.variant_price && <p className="text-xs text-blue-600 font-bold">{formatPrice(sr.variant_price)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {sr.customer_brief ? (
                          <p className="text-xs text-gray-600 max-w-[180px] truncate" title={sr.customer_brief}>
                            {sr.customer_brief}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">{CONTACT_ICONS[sr.contact_preference] ?? '📞'}</span>
                        <span className="text-xs text-gray-600 ml-1">{CONTACT_LABELS[sr.contact_preference] ?? sr.contact_preference}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {START_LABELS[sr.start_preference] ?? sr.start_preference}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(sr.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => { setSelectedSR(sr); setAdminNotes(sr.admin_notes ?? '') }}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            Détail
                          </button>
                          {next && (
                            <button
                              onClick={() => srStatusMutation.mutate({ id: sr.id, status: next })}
                              disabled={srStatusMutation.isPending}
                              className="text-xs text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap"
                            >
                              → {SR_STATUS_LABELS[next].label}
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
      )}

      {/* ══════════════════════════════════════════ */}
      {/* MODAL DÉTAIL — COMMANDE                  */}
      {/* ══════════════════════════════════════════ */}
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
                <div><p className="text-gray-500">Client</p><p className="font-medium">{selectedOrder.customer_name}</p></div>
                <div><p className="text-gray-500">Téléphone</p><p className="font-medium">{selectedOrder.customer_phone}</p></div>
                {selectedOrder.customer_email && (
                  <div className="col-span-2"><p className="text-gray-500">Email</p><p className="font-medium">{selectedOrder.customer_email}</p></div>
                )}
                {selectedOrder.customer_address && (
                  <div className="col-span-2"><p className="text-gray-500">Adresse</p><p className="font-medium">{selectedOrder.customer_address}</p></div>
                )}
                <div><p className="text-gray-500">Mode de paiement</p><p className="font-medium">{PAYMENT_LABELS[selectedOrder.payment_method] ?? selectedOrder.payment_method}</p></div>
                <div>
                  <p className="text-gray-500">Statut paiement</p>
                  {(() => { const ps = PAYMENT_STATUS_LABELS[selectedOrder.payment_status] ?? PAYMENT_STATUS_LABELS.unpaid; return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>{ps.label}</span> })()}
                </div>
                <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(selectedOrder.created_at)}</p></div>
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
              {NEXT_ORDER_STATUS[selectedOrder.status] && (
                <button
                  onClick={() => { const next = NEXT_ORDER_STATUS[selectedOrder.status]; orderStatusMutation.mutate({ id: selectedOrder.id, status: next, order: selectedOrder }) }}
                  disabled={orderStatusMutation.isPending}
                  className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {orderStatusMutation.isPending ? 'Mise à jour...' : `Passer à : ${ORDER_STATUS_LABELS[NEXT_ORDER_STATUS[selectedOrder.status]].label}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* MODAL DÉTAIL — DEMANDE SERVICE           */}
      {/* ══════════════════════════════════════════ */}
      {selectedSR && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="font-bold text-gray-900">Demande de service</h2>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(selectedSR.created_at)}</p>
              </div>
              <button onClick={() => setSelectedSR(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">

              {/* Service */}
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs text-purple-500 font-semibold uppercase tracking-wide mb-1">Service demandé</p>
                <p className="font-bold text-gray-900">{selectedSR.product_name}</p>
                {selectedSR.variant_name && <p className="text-sm text-purple-700 font-semibold">{selectedSR.variant_name}</p>}
                {selectedSR.variant_price && <p className="text-lg font-black text-blue-700 mt-1">{formatPrice(selectedSR.variant_price)}</p>}
              </div>

              {/* Client */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 text-xs">Client</p><p className="font-semibold">{selectedSR.customer_name}</p></div>
                <div>
                  <p className="text-gray-500 text-xs">Téléphone</p>
                  <a href={`tel:${selectedSR.customer_phone}`} className="font-semibold text-blue-600 hover:underline">{selectedSR.customer_phone}</a>
                </div>
                {selectedSR.customer_email && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs">Email</p>
                    <a href={`mailto:${selectedSR.customer_email}`} className="font-semibold text-blue-600 hover:underline">{selectedSR.customer_email}</a>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs">Contact préféré</p>
                  <p className="font-semibold">{CONTACT_ICONS[selectedSR.contact_preference]} {CONTACT_LABELS[selectedSR.contact_preference]}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Délai souhaité</p>
                  <p className="font-semibold">{START_LABELS[selectedSR.start_preference] ?? selectedSR.start_preference}</p>
                </div>
              </div>

              {/* Besoin */}
              {selectedSR.customer_brief && (
                <div>
                  <p className="text-xs text-gray-500 font-semibold mb-1">Besoin décrit par le client</p>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedSR.customer_brief}
                  </div>
                </div>
              )}

              {/* Statut */}
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-2">Statut actuel</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SR_STATUS_LABELS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => srStatusMutation.mutate({ id: selectedSR.id, status: key })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                        selectedSR.status === key
                          ? `${val.color} border-current`
                          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes admin */}
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Notes internes</p>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Notes sur ce client, avancement, devis envoyé..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                />
                <button
                  onClick={() => srStatusMutation.mutate({ id: selectedSR.id, status: selectedSR.status, notes: adminNotes })}
                  disabled={srStatusMutation.isPending}
                  className="mt-2 w-full py-2 bg-gray-800 text-white rounded-lg text-xs font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60"
                >
                  Sauvegarder les notes
                </button>
              </div>

              {/* Actions rapides */}
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                {selectedSR.customer_phone && (
                  <a href={`https://wa.me/${selectedSR.customer_phone.replace(/\s/g,'')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors">
                    💬 WhatsApp
                  </a>
                )}
                {selectedSR.customer_phone && (
                  <a href={`tel:${selectedSR.customer_phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors">
                    📞 Appeler
                  </a>
                )}
                {selectedSR.customer_email && (
                  <a href={`mailto:${selectedSR.customer_email}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-600 text-white rounded-xl text-xs font-bold hover:bg-gray-700 transition-colors">
                    ✉️ Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
