export type PlanId = 'essential' | 'premium' | 'unlimited' | 'gold'

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
  // Legacy plans kept for backward-compat with existing subscribers
  essential: {
    id: 'essential',
    name: 'ESSENTIAL',
    priceEur: 999,
    priceLabel: '9,99\u20ac',
    analysesPerDay: 1,
    badge: null,
    color: '#9CA3AF',
    features: [
      '1 analyse complete par jour',
      '1 pronostic structure par jour',
      'Classification GOLD / SILVER / NO BET',
      'Football, Basketball, Tennis',
      'Dashboard 24h/24',
    ],
  },
  premium: {
    id: 'premium',
    name: 'PREMIUM',
    priceEur: 1990,
    priceLabel: '19,90\u20ac',
    analysesPerDay: 4,
    badge: 'POPULAIRE',
    color: '#C9A84C',
    features: [
      '4 analyses par jour',
      '4 pronostics par jour',
      'Classification GOLD / SILVER / NO BET',
      'Historique des analyses',
      'Dashboard 24h/24',
    ],
  },
  unlimited: {
    id: 'unlimited',
    name: 'UNLIMITED',
    priceEur: 2990,
    priceLabel: '29,90\u20ac',
    analysesPerDay: null,
    badge: 'MEILLEUR CHOIX',
    color: '#AAFF00',
    features: [
      'Analyses illimitees',
      'Pronostics illimites',
      'Tout le contenu Premium',
      'Support prioritaire',
    ],
  },
  // Current active plan
  gold: {
    id: 'gold',
    name: 'GOLD',
    priceEur: 3000,
    priceLabel: '30\u20ac',
    analysesPerDay: null,
    badge: 'MEILLEUR CHOIX',
    color: '#C9A84C',
    features: [
      'Analyses illimitees — Claude + DeepSeek',
      'Double IA en parallele',
      'Classification GOLD / SILVER / NO BET',
      'Historique complet des analyses',
      'Dashboard securise 24h/24',
      'Support prioritaire',
    ],
  },
}

export function getPlanById(id: string | null | undefined): PlanId {
  if (id === 'essential' || id === 'premium' || id === 'unlimited' || id === 'gold') return id
  return 'gold'
}

export function getAnalysesLimit(plan: PlanId): number | null {
  return PLANS[plan].analysesPerDay
}
