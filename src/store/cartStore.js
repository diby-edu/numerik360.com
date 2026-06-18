import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const items = get().items
        const existing = items.find(i => i.product.id === product.id)
        if (existing) {
          set({
            items: items.map(i =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          })
        } else {
          set({ items: [...items, { product, quantity }] })
        }
        get()._sync()
      },

      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.product.id !== productId) })
        get()._sync()
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
        get()._sync()
      },

      clearCart: () => {
        set({ items: [] })
        get()._clearRemote()
      },

      getTotal: () => get().items.reduce((sum, { product, quantity }) => {
        const price = product.promo_price && product.promo_price < product.price
          ? product.promo_price
          : product.price
        return sum + price * quantity
      }, 0),

      getCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

      // Sync local → Supabase (appelé après chaque mutation si connecté)
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
              quantity: i.quantity,
            }))
          )
        }
      },

      // Fusion Supabase + localStorage à la connexion
      loadFromSupabase: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('cart_items')
          .select('*, product:products(*)')
          .eq('user_id', user.id)

        if (!data || data.length === 0) {
          // Pas de panier distant → sync local vers Supabase
          get()._sync()
          return
        }

        // Fusionner : panier distant + panier local
        const local = get().items
        const remote = data.map(row => ({ product: row.product, quantity: row.quantity }))
        const merged = [...remote]
        local.forEach(localItem => {
          const exists = merged.find(r => r.product.id === localItem.product.id)
          if (exists) {
            exists.quantity = Math.max(exists.quantity, localItem.quantity)
          } else {
            merged.push(localItem)
          }
        })
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
