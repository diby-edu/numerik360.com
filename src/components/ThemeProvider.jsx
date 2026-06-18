import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

async function fetchActiveTheme() {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'active_theme')
    .single()
  return data?.value ?? 'ocean'
}

export default function ThemeProvider() {
  const { data: theme = 'ocean' } = useQuery({
    queryKey: ['active-theme'],
    queryFn: fetchActiveTheme,
    staleTime: 30000,
  })

  useEffect(() => {
    if (theme === 'ocean') {
      document.body.removeAttribute('data-theme')
    } else {
      document.body.setAttribute('data-theme', theme)
    }
    return () => {
      document.body.removeAttribute('data-theme')
    }
  }, [theme])

  return <Outlet />
}
