import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

// Clé unique pour identifier un item (produit + variante)
function itemKey(productId, variantId) {
  return `${productId}__${variantId ?? ''}`
}

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      // variant = { id, name, price, attributes } ou null
      addItem: (product, quantity = 1, variant = null) => {
        const items = get().items
        const key = itemKey(product.id, variant?.id)
        const existing = items.find(i => itemKey(i.product.id, i.variant?.id) === key)
        if (existing) {
          set({
            items: items.map(i =>
              itemKey(i.product.id, i.variant?.id) === key
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          })
        } else {
          set({ items: [...items, { product, quantity, variant: variant ?? null }] })
        }
        get()._sync()
      },

      removeItem: (productId, variantId = null) => {
        set({ items: get().items.filter(i => itemKey(i.product.id, i.variant?.id) !== itemKey(productId, variantId)) })
        get()._sync()
      },

      updateQuantity: (productId, quantity, variantId = null) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        set({
          items: get().items.map(i =>
            itemKey(i.product.id, i.variant?.id) === itemKey(productId, variantId) ? { ...i, quantity } : i
          ),
        })
        get()._sync()
      },

      clearCart: () => {
        set({ items: [] })
        get()._clearRemote()
      },

      // Le prix prioritaire : variante > promo > base
      getTotal: () => get().items.reduce((sum, { product, quantity, variant }) => {
        const price = variant?.price
          ?? (product.promo_price && product.promo_price < product.price ? product.promo_price : product.price)
        return sum + price * quantity
      }, 0),

      getCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      _sync: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const items = get().items
        await supabase.from('cart_items').delete().eq('user_id', user.id)
        if (items.length > 0) {
          await supabase.from('cart_items').insert(
            items.map(i => ({
              user_id: user.id,
              product_id: i.product.id,
              variant_id: i.variant?.id ?? null,
              quantity: i.quantity,
            }))
          )
        }
      },

      loadFromSupabase: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('cart_items')
          .select('*, product:products(*), variant:product_variants(*)')
          .eq('user_id', user.id)

        if (!data || data.length === 0) {
          get()._sync()
          return
        }

        const local = get().items
        const remote = data.map(row => ({ product: row.product, quantity: row.quantity, variant: row.variant ?? null }))
        // Déduplication par clé composite productId__variantId
        const localKeys = new Set(local.map(i => itemKey(i.product.id, i.variant?.id)))
        const remoteOnlyItems = remote.filter(r => !localKeys.has(itemKey(r.product.id, r.variant?.id)))
        const merged = [...local, ...remoteOnlyItems]
        set({ items: merged })
        get()._sync()
      },

      _clearRemote: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('cart_items').delete().eq('user_id', user.id)
      },
    }),
    {
      name: 'panier',
      partialize: (state) => ({ items: state.items }),
    }
  )
)

export default useCartStore
