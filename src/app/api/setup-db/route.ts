import { NextRequest, NextResponse } from 'next/server'

const SQL = `
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'inactive',
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Users can read own subscription') THEN
    CREATE POLICY "Users can read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Service role can manage subscriptions') THEN
    CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.analyses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  home_team   TEXT NOT NULL,
  away_team   TEXT NOT NULL,
  sport       TEXT NOT NULL,
  competition TEXT,
  match_date  DATE,
  odds_home   TEXT,
  odds_draw   TEXT,
  odds_away   TEXT,
  result      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analyses' AND policyname='Users can read own analyses') THEN
    CREATE POLICY "Users can read own analyses" ON public.analyses FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analyses' AND policyname='Users can insert own analyses') THEN
    CREATE POLICY "Users can insert own analyses" ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analyses' AND policyname='Service role can manage analyses') THEN
    CREATE POLICY "Service role can manage analyses" ON public.analyses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
`

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const setupSecret = process.env.SETUP_SECRET || 'oracle-setup-2025'

  if (secret !== setupSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL

  if (!postgresUrl) {
    return NextResponse.json({
      error: 'POSTGRES_URL manquant',
      instructions: [
        '1. Allez dans Supabase Dashboard > Settings > Database',
        '2. Copiez la "Connection string" (URI) sous "Transaction pooler" (port 6543)',
        '3. Ajoutez POSTGRES_URL=postgresql://... dans vos variables Vercel',
        '4. Redéployez et appelez de nouveau /api/setup-db?secret=oracle-setup-2025',
      ],
      sql: SQL.trim(),
    }, { status: 400 })
  }

  try {
    const { Client } = await import('pg')
    const client = new Client({
      connectionString: postgresUrl,
      ssl: { rejectUnauthorized: false },
    })
    await client.connect()

    // Run statements one by one
    const statements = SQL.split(';').map(s => s.trim()).filter(Boolean)
    const results: string[] = []

    for (const stmt of statements) {
      try {
        await client.query(stmt)
        results.push(`✓ ${stmt.slice(0, 60).replace(/\n/g, ' ')}...`)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('already exists')) {
          results.push(`⚠ (already exists) ${stmt.slice(0, 50)}...`)
        } else {
          results.push(`✗ ERROR: ${msg} | ${stmt.slice(0, 50)}...`)
        }
      }
    }

    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Tables créées avec succès',
      results,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      error: 'Connexion DB échouée',
      details: msg,
      instructions: [
        'Vérifiez que POSTGRES_URL est correct dans vos variables Vercel.',
        'Format attendu: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres',
      ],
      sql: SQL.trim(),
    }, { status: 500 })
  }
}
