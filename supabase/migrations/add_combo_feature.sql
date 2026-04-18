-- Feedback loop fields
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS classification TEXT,
  ADD COLUMN IF NOT EXISTS score INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_bet TEXT,
  ADD COLUMN IF NOT EXISTS predicted_odds TEXT,
  ADD COLUMN IF NOT EXISTS edge_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_result TEXT,
  ADD COLUMN IF NOT EXISTS bet_won BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_analyses_classification ON analyses(classification);
CREATE INDEX IF NOT EXISTS idx_analyses_bet_won ON analyses(bet_won);
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON analyses(user_id, created_at DESC);

-- Combo access addon (8.99€/mois)
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS combo_access BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS combo_access_until TIMESTAMPTZ;

-- Daily combos table
CREATE TABLE IF NOT EXISTS daily_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_combos_date ON daily_combos(date DESC);

-- RLS pour daily_combos
ALTER TABLE daily_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read daily combos" ON daily_combos FOR SELECT USING (true);
