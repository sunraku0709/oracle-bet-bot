export type PlanId = 'standard' | 'premium'

export const PLANS: Record<PlanId, {
  id: PlanId
  name: string
  priceEur: number          // cents
  priceLabel: string
  analysesPerDay: number | null  // null = unlimited
  dailyLimit: number            // -1 = unlimited (DB value)
  badge: string | null
  color: string
  features: string[]
}> = {
  standard: {
    id: 'standard',
    name: 'STANDARD',
    priceEur: 999,
    priceLabel: '9,99€',
    analysesPerDay: 5,
    dailyLimit: 5,
    badge: 'POPULAIRE',
    color: '#C9A84C',
    features: [
      '5 analyses complètes par jour',
      '5 pronostics structurés (10 points) par jour',
      'Classification GOLD / SILVER / NO BET',
      'Football, Basketball, Tennis',
      'Historique des analyses',
      'Accès dashboard 24h/24',
    ],
  },
  premium: {
    id: 'premium',
    name: 'PREMIUM',
    priceEur: 1999,
    priceLabel: '19,99€',
    analysesPerDay: null,
    dailyLimit: -1,
    badge: 'ILLIMITÉ',
    color: '#AAFF00',
    features: [
      'Analyses & pronostics illimités par jour',
      'Rapports structurés en 10 points',
      'Classification GOLD / SILVER / NO BET',
      'Football, Basketball, Tennis',
      'Historique complet',
      'Détection value bets',
      'Accès dashboard 24h/24',
      'Support prioritaire',
    ],
  },
}

export function getPlanById(id: string | null | undefined): PlanId {
  if (id === 'standard' || id === 'premium') return id
  return 'premium' // default (covers old 'starter' rows → upgrade to premium)
}

export function getAnalysesLimit(plan: PlanId): number | null {
  return PLANS[plan].analysesPerDay
}

/** Maps plan → daily_limit value stored in DB (-1 = unlimited) */
export const PLAN_DAILY_LIMITS: Record<PlanId, number> = {
  standard: 5,
  premium: -1,
}
