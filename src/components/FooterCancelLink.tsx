'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function FooterCancelLink() {
  const [hasActiveSub, setHasActiveSub] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      if (data) setHasActiveSub(true)
    })
  }, [])

  if (!hasActiveSub) return null

  return (
    <li>
      <a
        href="/dashboard"
        className="text-white/40 text-sm hover:text-red-400 transition-colors"
      >
        Se désabonner
      </a>
    </li>
  )
}

export default FooterCancelLink
