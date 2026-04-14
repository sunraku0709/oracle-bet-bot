import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
)

const SUPABASE_URL     = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const USER_ID       = '6aa5e753-4616-4abd-b04b-8fae24721245'
const NEW_PASSWORD  = 'Walid260696@'

console.log(`Resetting password for UUID ${USER_ID} …`)

const { data, error } = await supabase.auth.admin.updateUserById(USER_ID, {
  password: NEW_PASSWORD,
  email_confirm: true,
})

if (error) {
  console.error('✗ updateUserById failed:', error.message)
  process.exit(1)
}

console.log('✓ Password reset successfully')
console.log(`  UUID:  ${data.user.id}`)
console.log(`  Email: ${data.user.email}`)
console.log(`  Updated at: ${data.user.updated_at}`)
