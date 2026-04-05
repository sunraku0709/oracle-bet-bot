-- Oracle Bet – Migration complète
-- À coller dans : Supabase Dashboard > SQL Editor > New Query

-- =====================
-- TABLE : subscriptions
-- =====================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  status                 TEXT NOT NULL DEFAULT 'inactive',
  plan                   TEXT NOT NULL DEFAULT 'premium',   -- starter | standard | premium
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
    CREATE POLICY "Users can read own subscription"
      ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscriptions' AND policyname='Service role can manage subscriptions') THEN
    CREATE POLICY "Service role can manage subscriptions"
      ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =====================
-- TABLE : analyses
-- =====================
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
    CREATE POLICY "Users can read own analyses"
      ON public.analyses FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analyses' AND policyname='Users can insert own analyses') THEN
    CREATE POLICY "Users can insert own analyses"
      ON public.analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analyses' AND policyname='Service role can manage analyses') THEN
    CREATE POLICY "Service role can manage analyses"
      ON public.analyses FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analyses_user_id    ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_user_id        ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_stripe_sub     ON public.subscriptions(stripe_subscription_id);
