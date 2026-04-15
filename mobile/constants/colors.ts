export const Colors = {
  // Backgrounds
  bgPrimary: '#0a0a0a',
  bgSecondary: '#111111',
  bgCard: '#1a1a1a',
  bgCardHover: '#222222',

  // Borders
  borderSubtle: '#2a2a2a',
  borderGold: '#FFD70040',

  // Gold accent
  gold: '#FFD700',
  goldDark: '#C9A84C',
  goldMuted: '#FFD70020',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Badge colors
  badgeGold: '#FFD700',
  badgeSilver: '#9CA3AF',
  badgeNoBet: '#EF4444',

  // Plan colors
  planStarter: '#9CA3AF',
  planStandard: '#C9A84C',
  planPremium: '#AAFF00',

  // Status
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',

  // Sports
  football: '#22C55E',
  basketball: '#F97316',
  tennis: '#EAB308',
} as const;

export type BadgeType = 'GOLD' | 'SILVER' | 'NO BET';

export const BADGE_COLORS: Record<BadgeType, { bg: string; text: string; border: string }> = {
  GOLD: { bg: '#FFD70020', text: '#FFD700', border: '#FFD700' },
  SILVER: { bg: '#9CA3AF20', text: '#9CA3AF', border: '#9CA3AF' },
  'NO BET': { bg: '#EF444420', text: '#EF4444', border: '#EF4444' },
};

export const PLAN_COLORS: Record<string, string> = {
  starter: '#9CA3AF',
  standard: '#C9A84C',
  premium: '#AAFF00',
};
