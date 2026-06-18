import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useCartStore from '../store/cartStore'

export function useAuth() {
  const [session, setSession] = useState(undefined)
  const loadFromSupabase = useCartStore(s => s.loadFromSupabase)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadFromSupabase()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN') loadFromSupabase()
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, user: session?.user ?? null, loading: session === undefined }
}
