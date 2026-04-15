import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Subscription = {
  id: string;
  status: string;
  plan: string;
  analyses_used: number;
  current_period_end: string | null;
};

export type PlanId = 'starter' | 'standard' | 'premium';

export const PLAN_LIMITS: Record<PlanId, number | null> = {
  starter: 1,
  standard: 3,
  premium: null,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  starter: 'STARTER',
  standard: 'STANDARD',
  premium: 'PREMIUM',
};

export const PLAN_PRICES: Record<PlanId, string> = {
  starter: '4,99€/mois',
  standard: '9,99€/mois',
  premium: '19,99€/mois',
};

export function useSubscription(userId: string | undefined) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, status, plan, analyses_used, current_period_end')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        setError(error.message);
      } else {
        setSubscription(data);
        setError(null);
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'abonnement');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const planId = (subscription?.plan as PlanId) ?? 'starter';
  const limit = PLAN_LIMITS[planId];
  const isActive = subscription?.status === 'active';

  const todayCount = subscription?.analyses_used ?? 0;
  const remaining = limit === null ? null : Math.max(0, limit - todayCount);
  const quotaReached = limit !== null && todayCount >= limit;

  return {
    subscription,
    loading,
    error,
    planId,
    limit,
    isActive,
    remaining,
    quotaReached,
    refresh: fetchSubscription,
  };
}
