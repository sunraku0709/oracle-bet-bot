import Link from 'next/link'
import { getMigrationSQL } from '@/lib/db-init'
import { createClient } from '@supabase/supabase-js'

async function getStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const hasPostgresUrl = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL)
  const hasStripe = !!(process.env.STRIPE_SECRET_KEY)
  const hasAnthropicAI = !!(process.env.ANTHROPIC_API_KEY)

  let tablesExist = false
  if (url && key) {
    try {
      const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
      const { error } = await admin.from('subscriptions').select('id').limit(1)
      tablesExist = !error
    } catch { /* ignore */ }
  }

  return { tablesExist, hasPostgresUrl, hasStripe, hasAnthropicAI }
}

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const { tablesExist, hasPostgresUrl, hasStripe, hasAnthropicAI } = await getStatus()
  const sql = getMigrationSQL()
  const projectRef = 'jnyomioesinzwuwtmort'

  const Step = ({ num, done, title, children }: { num: number; done: boolean; title: string; children: React.ReactNode }) => (
    <div className={`card-dark rounded-2xl p-6 border-l-4 ${done ? 'border-l-[#AAFF00]' : 'border-l-[#C9A84C]'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${done ? 'bg-[#AAFF00] text-black' : 'bg-[#C9A84C] text-black'}`}
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          {done ? '✓' : num}
        </div>
        <h2 className="text-xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em', color: done ? '#AAFF00' : '#C9A84C' }}>
          {title}
        </h2>
        <span className={`ml-auto text-xs px-2 py-1 rounded font-bold ${done ? 'bg-[#AAFF00]/10 text-[#AAFF00]' : 'bg-[#C9A84C]/10 text-[#C9A84C]'}`}
          style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          {done ? '✓ OK' : '⚠ REQUIS'}
        </span>
      </div>
      <div style={{ fontFamily: "'Rajdhani', sans-serif" }} className="text-gray-300 text-sm space-y-2">
        {children}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="text-3xl tracking-widest">
            <span style={{ color: '#C9A84C' }}>⚡ ORACLE</span>
            <span className="text-white"> BET</span>
          </Link>
          <h1 className="text-4xl mt-4 mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            CONFIGURATION DU SITE
          </h1>
          <p className="text-gray-400" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Suivez ces étapes pour mettre le site en ligne à 100%
          </p>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Tables DB', ok: tablesExist },
            { label: 'Stripe', ok: hasStripe },
            { label: 'Anthropic AI', ok: hasAnthropicAI },
            { label: 'POSTGRES_URL', ok: hasPostgresUrl },
          ].map(({ label, ok }) => (
            <div key={label} className={`rounded-xl p-3 text-center border ${ok ? 'border-[#AAFF00]/30 bg-[#AAFF00]/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="text-lg">{ok ? '✅' : '❌'}</div>
              <div className="text-xs font-semibold mt-1" style={{ fontFamily: "'Rajdhani', sans-serif", color: ok ? '#AAFF00' : '#EF4444' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Step 1: Tables */}
          <Step num={1} done={tablesExist} title="CRÉER LES TABLES SUPABASE">
            {tablesExist ? (
              <p className="text-[#AAFF00]">✓ Les tables <code>subscriptions</code> et <code>analyses</code> existent déjà.</p>
            ) : (
              <>
                <p>Les tables de base de données n&apos;existent pas encore. <strong>Deux options :</strong></p>

                <div className="mt-3 p-4 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl">
                  <p className="font-bold text-[#C9A84C] mb-2">🚀 Option A — SQL Editor (30 secondes, recommandée)</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    <li>
                      Ouvrez{' '}
                      <a href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`}
                        target="_blank" rel="noopener"
                        className="text-[#C9A84C] underline">
                        Supabase SQL Editor ↗
                      </a>
                    </li>
                    <li>Copiez le SQL ci-dessous</li>
                    <li>Cliquez <strong>Run</strong> (▶)</li>
                    <li>Rafraîchissez cette page pour vérifier</li>
                  </ol>
                </div>

                <div className="mt-3 p-4 bg-white/3 border border-white/10 rounded-xl">
                  <p className="font-bold text-gray-300 mb-2">⚙️ Option B — Automatique via POSTGRES_URL</p>
                  <p className="text-gray-400 text-xs">
                    {hasPostgresUrl
                      ? <span className="text-[#AAFF00]">✓ POSTGRES_URL détectée.</span>
                      : 'Ajoutez POSTGRES_URL dans Vercel → Settings → Env Vars (récupérez-la dans Supabase → Settings → Database → URI).'
                    }{' '}
                    Puis appelez :{' '}
                    <a href="/api/setup-db?secret=oracle-setup-2025" className="text-[#C9A84C] underline font-mono">
                      /api/setup-db?secret=oracle-setup-2025
                    </a>
                  </p>
                </div>

                {/* SQL block */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 tracking-widest">SQL À EXÉCUTER</span>
                  </div>
                  <pre className="bg-black/50 border border-white/10 rounded-xl p-4 text-xs text-green-400 overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                    {sql}
                  </pre>
                </div>
              </>
            )}
          </Step>

          {/* Step 2: Vercel Protection */}
          <Step num={2} done={false} title="DÉSACTIVER VERCEL DEPLOYMENT PROTECTION">
            <p>Le site est actuellement <strong className="text-red-400">inaccessible au public</strong> (Vercel SSO activé).</p>
            <div className="mt-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <ol className="list-decimal list-inside space-y-1">
                <li>Ouvrez <span className="font-mono text-[#C9A84C]">vercel.com/dashboard</span> → votre projet <strong>oracle-bet-bot</strong></li>
                <li>Settings → <strong>Deployment Protection</strong></li>
                <li>Mettez <strong>Vercel Authentication</strong> sur <strong>Disabled</strong></li>
                <li>Sauvegardez</li>
              </ol>
            </div>
          </Step>

          {/* Step 3: Stripe */}
          <Step num={3} done={hasStripe} title="CONFIGURER STRIPE">
            {hasStripe ? (
              <p className="text-[#AAFF00]">✓ STRIPE_SECRET_KEY est définie.</p>
            ) : (
              <p>La clé Stripe actuelle est invalide ou manquante.</p>
            )}
            <div className="mt-3 p-4 bg-white/3 border border-white/10 rounded-xl">
              <ol className="list-decimal list-inside space-y-1">
                <li>Allez sur <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener" className="text-[#C9A84C] underline">dashboard.stripe.com/apikeys ↗</a></li>
                <li>Copiez la <strong>Secret key</strong> (sk_live_... ou sk_test_...)</li>
                <li>Vercel → Settings → Env Vars → Mettez à jour <code>STRIPE_SECRET_KEY</code></li>
                <li>Créez un webhook : <code>/api/stripe/webhook</code> avec les 4 events</li>
                <li>Ajoutez <code>STRIPE_WEBHOOK_SECRET</code> (whsec_...) dans Vercel</li>
              </ol>
            </div>
          </Step>

          {/* Step 4: Redeploy */}
          <Step num={4} done={false} title="REDÉPLOYER">
            <p>Après avoir mis à jour les variables dans Vercel, redéployez pour les appliquer.</p>
            <div className="mt-3 p-4 bg-white/3 border border-white/10 rounded-xl">
              <p className="text-gray-300">Vercel → votre projet → <strong>Deployments</strong> → <strong>Redeploy</strong> (bouton ···)</p>
            </div>
          </Step>
        </div>

        {/* Back */}
        <div className="mt-8 text-center">
          <Link href="/" className="btn-outline-gold px-6 py-3 rounded-xl text-sm tracking-widest inline-block">
            ← RETOUR À L&apos;ACCUEIL
          </Link>
        </div>
      </div>
    </div>
  )
}
