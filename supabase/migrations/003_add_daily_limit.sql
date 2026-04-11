-- Migration 003 : colonne daily_limit + suppression du plan starter
-- À coller dans : Supabase Dashboard > SQL Editor > New Query

-- 1. Ajouter la colonne daily_limit (-1 = illimité)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS daily_limit INT NOT NULL DEFAULT -1;

-- 2. Mettre à jour les lignes existantes selon le plan
UPDATE public.subscriptions SET daily_limit = 5  WHERE plan = 'standard';
UPDATE public.subscriptions SET daily_limit = -1 WHERE plan = 'premium';
-- Les anciens abonnés starter basculent vers standard (daily_limit = 5)
UPDATE public.subscriptions SET plan = 'standard', daily_limit = 5 WHERE plan = 'starter';

-- 3. Index composite pour le comptage journalier (perf)
CREATE INDEX IF NOT EXISTS idx_analyses_user_created
  ON public.analyses(user_id, created_at DESC);
