-- Migration 002 : ajouter les colonnes plan/analyses_used si la table existe déjà
-- À exécuter si vous avez déjà créé les tables avec la migration 001 originale

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan                 TEXT NOT NULL DEFAULT 'premium',
  ADD COLUMN IF NOT EXISTS analyses_used        INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMPTZ;
