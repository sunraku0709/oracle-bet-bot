import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string;
          user_id: string;
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
        };
        Insert: {
          user_id: string;
          home_team: string;
          away_team: string;
          sport: string;
          competition: string;
          match_date: string;
          odds_home?: string;
          odds_draw?: string;
          odds_away?: string;
          result: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          plan: string;
          analyses_used: number;
          billing_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
