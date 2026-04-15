import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://oracle-bet.fr';

export type AnalyzeRequest = {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  competition?: string;
  matchDate?: string;
  oddsHome?: string;
  oddsDraw?: string;
  oddsAway?: string;
};

export type AnalyzeResponse = {
  result: string;
  remaining: number | null;
  plan: string;
};

export type BadgeType = 'GOLD' | 'SILVER' | 'NO BET';

export function detectBadge(result: string): BadgeType {
  const upper = result.toUpperCase();
  // Look for the classification near the end
  const lastPart = upper.slice(-300);
  if (lastPart.includes('GOLD')) return 'GOLD';
  if (lastPart.includes('SILVER')) return 'SILVER';
  if (lastPart.includes('NO BET') || lastPart.includes('NO-BET')) return 'NO BET';
  // Check full text as fallback
  if (upper.includes('GOLD')) return 'GOLD';
  if (upper.includes('SILVER')) return 'SILVER';
  return 'NO BET';
}

async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Non authentifié');
  return session.access_token;
}

export async function analyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(req),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error || 'Erreur serveur', response.status, data);
  }

  return data;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isQuotaError() {
    return this.status === 403 && (this.data as { limitReached?: boolean })?.limitReached;
  }

  get isAuthError() {
    return this.status === 401;
  }

  get isSubscriptionError() {
    return this.status === 403 && !(this.data as { limitReached?: boolean })?.limitReached;
  }
}
