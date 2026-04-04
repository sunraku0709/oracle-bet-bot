import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      analyses: {
        Row: {
          id: string
          user_id: string
          home_team: string
          away_team: string
          sport: string
          competition: string
          match_date: string
          odds_home: string | null
          odds_draw: string | null
          odds_away: string | null
          result: string
          created_at: string
        }
        Insert: {
          user_id: string
          home_team: string
          away_team: string
          sport: string
          competition: string
          match_date: string
          odds_home?: string
          odds_draw?: string
          odds_away?: string
          result: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          status: string
          current_period_end: string
          created_at: string
        }
      }
    }
  }
}
