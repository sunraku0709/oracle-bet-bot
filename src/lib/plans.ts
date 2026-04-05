export type PlanId = 'starter' | 'standard' | 'premium'

export const PLANS: Record<PlanId, {
  id: PlanId
  name: string
  priceEur: number          // cents
  priceLabel: string
  analysesPerMonth: number | null  // null = unlimited
  badge: string | null
  color: string
  features: string[]
}> = {
  starter: {
    id: 'starter',
    name: 'STARTER',
    priceEur: 499,
    priceLabel: '4,99€',
    analysesPerMonth: 1,
    badge: null,
    color: '#9CA3AF',
    features: [
      '1 analyse complète par mois',
      '1 pronostic structuré (10 points)',
      'Classification GOLD / SILVER / NO BET',
      'Football, Basketball, Tennis',
      'Accès dashboard 24h/24',
    ],
  },
  standard: {
    id: 'standard',
    name: 'STANDARD',
    priceEur: 999,
    priceLabel: '9,99€',
    analysesPerMonth: 3,
    badge: 'POPULAIRE',
    color: '#C9A84C',
    features: [
      '3 analyses complètes par mois',
      '3 pronostics structurés (10 points)',
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
    analysesPerMonth: null,
    badge: 'ILLIMITÉ',
    color: '#AAFF00',
    features: [
      'Analyses & pronostics illimités',
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
  if (id === 'starter' || id === 'standard' || id === 'premium') return id
  return 'premium' // default
}

export function getAnalysesLimit(plan: PlanId): number | null {
  return PLANS[plan].analysesPerMonth
}
