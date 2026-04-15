/**
 * Updates Supabase Auth URL configuration via the Management API.
 *
 * Requirements:
 *   SUPABASE_ACCESS_TOKEN — personal access token from
 *   https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/update-auth-redirect-urls.mjs
 */

const PROJECT_REF   = 'jnyomioesizwuwtmort'
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN

if (!ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env var.')
  console.error('Generate one at: https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`

console.log('Updating Supabase Auth URL configuration …')

const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    site_url: 'https://oracle-bet-bot.vercel.app',
    additional_redirect_urls: [
      'https://oracle-bet-bot.vercel.app/**',
      'https://www.oracle-bet.fr/**',
    ],
  }),
})

const data = await res.json()

if (!res.ok) {
  console.error('✗ API error:', res.status, JSON.stringify(data, null, 2))
  process.exit(1)
}

console.log('✓ Auth URL config updated:')
console.log(`  site_url:                  ${data.site_url}`)
console.log(`  additional_redirect_urls:  ${data.additional_redirect_urls?.join(', ')}`)
