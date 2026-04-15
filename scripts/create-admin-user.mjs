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

const EMAIL    = 'admin@oracle-bet.com'
const PASSWORD = 'Admin1234!'

// ── 1. Delete existing user if present ───────────────────────────────────────
console.log(`Checking for existing user ${EMAIL} …`)
const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
const existing = users?.find(u => u.email === EMAIL)

if (existing) {
  console.log(`  Found UUID ${existing.id} — deleting …`)
  const { error: delErr } = await supabase.auth.admin.deleteUser(existing.id)
  if (delErr) { console.error('  ✗ Delete failed:', delErr.message); process.exit(1) }
  console.log('  ✓ Deleted (subscription cascades via FK)')
}

// ── 2. Create new admin user ──────────────────────────────────────────────────
console.log(`Creating ${EMAIL} …`)
const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
})
if (createErr) { console.error('✗ createUser:', createErr.message); process.exit(1) }

const userId = created.user.id
console.log(`✓ User created — UUID: ${userId}`)

// ── 3. Insert premium subscription ───────────────────────────────────────────
console.log('Inserting premium subscription …')
const now         = new Date()
const tenYearsOut = new Date(now)
tenYearsOut.setFullYear(now.getFullYear() + 10)

const { data: sub, error: subErr } = await supabase
  .from('subscriptions')
  .insert({
    user_id:              userId,
    plan:                 'premium',
    status:               'active',
    analyses_used:        0,
    billing_period_start: now.toISOString(),
    current_period_end:   tenYearsOut.toISOString(),
    updated_at:           now.toISOString(),
  })
  .select()
  .single()

if (subErr) { console.error('✗ subscription insert:', subErr.message); process.exit(1) }

console.log('\n─────────────────────────────────────────')
console.log('✓ DONE')
console.log(`  Email:    ${EMAIL}`)
console.log(`  Password: ${PASSWORD}`)
console.log(`  UUID:     ${userId}`)
console.log(`  Plan:     ${sub.plan}`)
console.log(`  Valid until: ${tenYearsOut.toISOString().split('T')[0]}`)
console.log('─────────────────────────────────────────')
