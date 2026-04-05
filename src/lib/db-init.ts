/**
 * Auto-initialisation des tables Supabase.
 * - Si POSTGRES_URL est définie : crée les tables via pg directement
 * - Sinon : retourne le SQL brut pour exécution manuelle
 */

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'inactive',
  plan                   TEXT NOT NULL DEFAULT 'premium',
  analyses_used          INT  NOT NULL DEFAULT 0,
  billing_period_start   TIMESTAMPTZ,
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

CREATE INDEX IF NOT EXISTS idx_analyses_user_id    ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_user_id        ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe_sub     ON public.subscriptions(stripe_subscription_id);
`

let initialized = false

export async function ensureTablesExist(): Promise<{ ok: boolean; method?: string; error?: string }> {
  if (initialized) return { ok: true, method: 'cached' }

  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL

  if (!postgresUrl) {
    return { ok: false, error: 'POSTGRES_URL non définie' }
  }

  try {
    const { Client } = await import('pg')
    const client = new Client({
      connectionString: postgresUrl,
      ssl: { rejectUnauthorized: false },
    })
    await client.connect()

    // Execute the full migration
    await client.query(MIGRATION_SQL)
    await client.end()

    initialized = true
    return { ok: true, method: 'pg-auto' }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}

export function getMigrationSQL(): string {
  return MIGRATION_SQL.trim()
}

/** Check if a Supabase error is a "table not found" error */
export function isTableMissing(error: unknown): boolean {
  if (!error) return false
  const msg = typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error)
  return msg.includes('PGRST205') || msg.includes('does not exist') || msg.includes('relation') && msg.includes('exist')
}
