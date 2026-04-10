import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { detectBadge, BadgeType } from '../lib/api';

export type Analysis = {
  id: string;
  home_team: string;
  away_team: string;
  sport: string;
  competition: string;
  match_date: string;
  odds_home: string | null;
  odds_draw: string | null;
  odds_away: string | null;
  result: string;
  created_at: string;
  badge: BadgeType;
};

export function useAnalyses(userId: string | undefined) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        setError(error.message);
      } else {
        const parsed = (data ?? []).map((a) => ({
          ...a,
          badge: detectBadge(a.result),
        }));
        setAnalyses(parsed);
        setError(null);
      }
    } catch (err) {
      setError('Erreur lors du chargement des analyses');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const todayAnalyses = analyses.filter((a) => {
    const today = new Date().toDateString();
    return new Date(a.created_at).toDateString() === today;
  });

  return {
    analyses,
    todayAnalyses,
    loading,
    error,
    refresh: fetchAnalyses,
  };
}
