import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

async function fetchAnnouncement() {
  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['announcement_enabled', 'announcement_text', 'announcement_bg'])
  return Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
}

export default function AnnouncementBar() {
  const { data: s = {} } = useQuery({
    queryKey: ['announcement'],
    queryFn: fetchAnnouncement,
    staleTime: 60000,
  })

  if (s.announcement_enabled !== 'true') return null

  return (
    <div
      className="text-white text-sm font-medium py-2 px-4 text-center"
      style={{ backgroundColor: s.announcement_bg || '#2563EB' }}
    >
      {s.announcement_text || ''}
    </div>
  )
}
