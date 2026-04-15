// Current active plans (shown in UI)
export type PlanId = 'starter' | 'standard' | 'premium' | 'essential' | 'unlimited' | 'gold'

export const PLANS: Record<PlanId, {
  id: PlanId
  name: string
  priceEur: number          // cents
  priceLabel: string
  analysesPerDay: number | null  // null = unlimited
  badge: string | null
  color: string
  features: string[]
}> = {
  // ── Active plans ────────────────────────────────────────────────────────────
  starter: {
    id: 'starter',
    name: 'STARTER',
    priceEur: 999,
    priceLabel: '9,99€',
    analysesPerDay: 1,
    badge: null,
    color: '#9CA3AF',
    features: [
      '1 analyse complète par jour',
      '1 pronostic structuré par jour',
      'Classification GOLD / SILVER / NO BET',
      'Football, Basketball, Tennis',
      'Dashboard sécurisé 24h/24',
    ],
  },
  standard: {
    id: 'standard',
    name: 'STANDARD',
    priceEur: 1999,
    priceLabel: '19,99€',
    analysesPerDay: 4,
    badge: 'POPULAIRE',
    color: '#C9A84C',
    features: [
      '4 analyses complètes par jour',
      '4 pronostics par jour',
      'Classification GOLD / SILVER / NO BET',
      'Historique des analyses',
      'Dashboard sécurisé 24h/24',
      'Support prioritaire',
    ],
  },
  premium: {
    id: 'premium',
    name: 'PREMIUM',
    priceEur: 2999,
    priceLabel: '29,99€',
    analysesPerDay: null,
    badge: 'MEILLEUR CHOIX',
    color: '#F0D080',
    features: [
      'Analyses & pronostics illimités',
      'Double IA : Claude + DeepSeek',
      'Classification GOLD / SILVER / NO BET',
      'Historique complet des analyses',
      'Dashboard sécurisé 24h/24',
      'Support prioritaire VIP',
    ],
  },

  // ── Legacy plans (kept for existing subscribers) ─────────────────────────
  essential: {
    id: 'essential',
    name: 'ESSENTIAL',
    priceEur: 999,
    priceLabel: '9,99€',
    analysesPerDay: 1,
    badge: null,
    color: '#9CA3AF',
    features: ['1 analyse par jour', 'Football, Basketball, Tennis', 'Dashboard 24h/24'],
  },
  unlimited: {
    id: 'unlimited',
    name: 'UNLIMITED',
    priceEur: 2990,
    priceLabel: '29,90€',
    analysesPerDay: null,
    badge: null,
    color: '#C9A84C',
    features: ['Analyses illimitées', 'Tout le contenu Premium', 'Support prioritaire'],
  },
  gold: {
    id: 'gold',
    name: 'GOLD',
    priceEur: 3000,
    priceLabel: '30€',
    analysesPerDay: null,
    badge: null,
    color: '#C9A84C',
    features: ['Analyses illimitées — Claude + DeepSeek', 'Double IA en parallèle', 'Support prioritaire'],
  },
}

export function getPlanById(id: string | null | undefined): PlanId {
  if (id === 'starter' || id === 'standard' || id === 'premium') return id
  if (id === 'essential') return 'essential'
  if (id === 'unlimited') return 'unlimited'
  if (id === 'gold') return 'gold'
  return 'premium'
}

export function getAnalysesLimit(plan: PlanId): number | null {
  return PLANS[plan].analysesPerDay
}
