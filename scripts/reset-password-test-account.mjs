import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
)

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'],
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EMAIL       = 'test@oracle-bet.app'
const NEW_PASSWORD = 'Admin1234!'

console.log(`Looking up ${EMAIL} …`)
const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
if (listErr) { console.error('listUsers:', listErr.message); process.exit(1) }

const user = users?.find(u => u.email === EMAIL)
if (!user) { console.error(`User ${EMAIL} not found`); process.exit(1) }
console.log(`Found UUID: ${user.id}`)

const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
  password: NEW_PASSWORD,
  email_confirm: true,
})
if (error) { console.error('updateUserById:', error.message); process.exit(1) }

console.log(`✓ Password reset`)
console.log(`  Email:    ${data.user.email}`)
console.log(`  UUID:     ${data.user.id}`)
console.log(`  Password: ${NEW_PASSWORD}`)
