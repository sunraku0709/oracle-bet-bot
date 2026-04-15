import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jnyomioesizwuwtmort.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpueW9taW9lc2luend1d3Rtb3J0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI3ODAxOSwiZXhwIjoyMDkwODU0MDE5fQ.I6GujLnLY5YgK_5YnT8tC6f08xs95-Xq5YIjXmfewhU'

const OLD_USER_UUID = '91d8c1ea-6d0d-402e-b338-6fe9f187b6b2'
const ADMIN_EMAIL    = 'admin@oracle-bet.com'
const ADMIN_PASSWORD = 'Admin1234!'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 1. Delete old test user (subscription cascades via FK ON DELETE CASCADE) ──
console.log(`\n1. Deleting old test user ${OLD_USER_UUID}…`)
const { error: delError } = await supabase.auth.admin.deleteUser(OLD_USER_UUID)
if (delError) {
  if (delError.message?.includes('not found') || delError.status === 404) {
    console.log('   → User not found, skipping delete.')
  } else {
    console.error('   ✗ Delete error:', delError.message)
    process.exit(1)
  }
} else {
  console.log('   ✓ Old user deleted (subscription row cascaded).')
}

// ── 2. Create new admin user ──────────────────────────────────────────────────
console.log(`\n2. Creating user ${ADMIN_EMAIL}…`)
const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
  email_confirm: true,
})

if (createError) {
  console.error('   ✗ Create error:', createError.message)
  process.exit(1)
}

const userId = created.user.id
console.log(`   ✓ User created. UUID: ${userId}`)

// ── 3. Insert subscription row ────────────────────────────────────────────────
console.log('\n3. Inserting subscription row…')
const now = new Date().toISOString()

const { data: sub, error: subError } = await supabase
  .from('subscriptions')
  .insert({
    user_id:                userId,
    plan:                   'premium',
    status:                 'active',
    daily_analyses_used:    0,
    daily_pronostics_used:  0,
    daily_analyses_limit:   9999,
    daily_pronostics_limit: 9999,
    analyses_used:          0,
    billing_period_start:   now,
    updated_at:             now,
  })
  .select()
  .single()

if (subError) {
  console.error('   ✗ Subscription insert error:', subError.message)
  process.exit(1)
}

console.log('   ✓ Subscription row inserted:')
console.log(JSON.stringify(sub, null, 2))

// ── 4. Confirm ────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────')
console.log('DONE')
console.log(`  Email:    ${ADMIN_EMAIL}`)
console.log(`  Password: ${ADMIN_PASSWORD}`)
console.log(`  UUID:     ${userId}`)
console.log(`  Plan:     ${sub.plan}`)
console.log(`  Status:   ${sub.status}`)
console.log('─────────────────────────────────────────────\n')
