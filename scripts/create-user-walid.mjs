import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
)

const SUPABASE_URL      = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_ROLE_KEY  = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 1. Create auth user ───────────────────────────────────────────────────────
console.log('Creating auth user walidacherkii@gmail.com …')
const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email: 'walidacherkii@gmail.com',
  password: 'Walid260696@',
  email_confirm: true,
})
if (createError) {
  console.error('✗ createUser failed:', createError.message)
  process.exit(1)
}
const userId = created.user.id
console.log(`✓ User created — UUID: ${userId}`)

// ── 2. Insert subscription row ────────────────────────────────────────────────
const now          = new Date()
const tenYearsOut  = new Date(now)
tenYearsOut.setFullYear(tenYearsOut.getFullYear() + 10)

console.log('Inserting subscription row …')
const { data: sub, error: subError } = await supabase
  .from('subscriptions')
  .insert({
    user_id:              userId,
    status:               'active',
    plan:                 'premium',
    analyses_used:        0,
    billing_period_start: now.toISOString(),
    current_period_end:   tenYearsOut.toISOString(),
    updated_at:           now.toISOString(),
  })
  .select()
  .single()

if (subError) {
  console.error('✗ subscription insert failed:', subError.message)
  process.exit(1)
}

console.log('✓ Subscription row inserted:')
console.log(JSON.stringify(sub, null, 2))

console.log('\n─────────────────────────────────────────')
console.log('SUCCESS')
console.log(`  UUID:               ${userId}`)
console.log(`  Email:              walidacherkii@gmail.com`)
console.log(`  Plan:               ${sub.plan}`)
console.log(`  Status:             ${sub.status}`)
console.log(`  current_period_end: ${sub.current_period_end}`)
console.log('─────────────────────────────────────────')
