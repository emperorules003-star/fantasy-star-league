export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contest_entries: {
        Row: {
          contest_id: string
          created_at: string
          entry_fee: number
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          entry_fee: number
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          entry_fee?: number
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_entries_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "fantasy_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          category: string
          contest_name: string
          created_at: string
          entry_fee: number
          id: string
          is_flexible: boolean
          match_id: string
          max_teams_per_user: number
          prize_pool: number
          spots_filled: number
          status: string
          total_spots: number
          winners_count: number
        }
        Insert: {
          category?: string
          contest_name: string
          created_at?: string
          entry_fee: number
          id?: string
          is_flexible?: boolean
          match_id: string
          max_teams_per_user?: number
          prize_pool: number
          spots_filled?: number
          status?: string
          total_spots: number
          winners_count?: number
        }
        Update: {
          category?: string
          contest_name?: string
          created_at?: string
          entry_fee?: number
          id?: string
          is_flexible?: boolean
          match_id?: string
          max_teams_per_user?: number
          prize_pool?: number
          spots_filled?: number
          status?: string
          total_spots?: number
          winners_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "contests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_teams: {
        Row: {
          captain_id: string | null
          contest_id: string | null
          created_at: string
          id: string
          match_id: string
          players: Json
          points: number
          team_name: string
          total_credits_used: number
          user_id: string
          vice_captain_id: string | null
        }
        Insert: {
          captain_id?: string | null
          contest_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          players?: Json
          points?: number
          team_name?: string
          total_credits_used?: number
          user_id: string
          vice_captain_id?: string | null
        }
        Update: {
          captain_id?: string | null
          contest_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          players?: Json
          points?: number
          team_name?: string
          total_credits_used?: number
          user_id?: string
          vice_captain_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_teams_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_teams_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_number: string | null
          document_type: string
          document_url: string | null
          id: string
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          document_number?: string | null
          document_type: string
          document_url?: string | null
          id?: string
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          document_number?: string | null
          document_type?: string
          document_url?: string | null
          id?: string
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          commentary: Json
          created_at: string
          id: string
          lineups_out: boolean
          match_time: string
          result: string | null
          score_team1: string | null
          score_team2: string | null
          status: string
          team1: string
          team1_short: string | null
          team2: string
          team2_short: string | null
          tournament: string | null
        }
        Insert: {
          commentary?: Json
          created_at?: string
          id?: string
          lineups_out?: boolean
          match_time: string
          result?: string | null
          score_team1?: string | null
          score_team2?: string | null
          status?: string
          team1: string
          team1_short?: string | null
          team2: string
          team2_short?: string | null
          tournament?: string | null
        }
        Update: {
          commentary?: Json
          created_at?: string
          id?: string
          lineups_out?: boolean
          match_time?: string
          result?: string | null
          score_team1?: string | null
          score_team2?: string | null
          status?: string
          team1?: string
          team1_short?: string | null
          team2?: string
          team2_short?: string | null
          tournament?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string
          credits: number
          id: string
          name: string
          points: number
          role: string
          runs: number
          team: string
          wickets: number
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          name: string
          points?: number
          role: string
          runs?: number
          team: string
          wickets?: number
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          name?: string
          points?: number
          role?: string
          runs?: number
          team?: string
          wickets?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          contests_played: number
          contests_won: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_kyc_verified: boolean
          name: string | null
          phone: string | null
          referral_code: string
          referred_by: string | null
          total_deposits: number
          total_winnings: number
        }
        Insert: {
          balance?: number
          contests_played?: number
          contests_won?: number
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          is_kyc_verified?: boolean
          name?: string | null
          phone?: string | null
          referral_code: string
          referred_by?: string | null
          total_deposits?: number
          total_winnings?: number
        }
        Update: {
          balance?: number
          contests_played?: number
          contests_won?: number
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_kyc_verified?: boolean
          name?: string | null
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          total_deposits?: number
          total_winnings?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_amount: number
          created_at: string
          id: string
          referred_name: string | null
          referred_user_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_amount?: number
          created_at?: string
          id?: string
          referred_name?: string | null
          referred_user_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          id?: string
          referred_name?: string | null
          referred_user_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          method: string | null
          status: string
          transaction_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          method?: string | null
          status?: string
          transaction_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          method?: string | null
          status?: string
          transaction_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_holder: string
          admin_note: string | null
          amount: number
          bank_account: string
          created_at: string
          id: string
          ifsc_code: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_holder: string
          admin_note?: string | null
          amount: number
          bank_account: string
          created_at?: string
          id?: string
          ifsc_code: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          admin_note?: string | null
          amount?: number
          bank_account?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_analytics: { Args: never; Returns: Json }
      admin_set_active: {
        Args: { _active: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_kyc: {
        Args: { _approved: boolean; _user_id: string }
        Returns: undefined
      }
      admin_users: {
        Args: never
        Returns: {
          balance: number
          contests_played: number
          contests_won: number
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_kyc_verified: boolean
          name: string | null
          phone: string | null
          referral_code: string
          referred_by: string | null
          total_deposits: number
          total_winnings: number
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      confirm_deposit: {
        Args: { _amount: number; _gateway_ref: string; _method: string }
        Returns: string
      }
      get_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          contests_played: number
          contests_won: number
          display_name: string
          rank: number
          total_investment: number
          total_winnings: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_contest: {
        Args: { _contest_id: string; _team_id: string }
        Returns: string
      }
      process_withdrawal: {
        Args: { _approve: boolean; _id: string; _note: string }
        Returns: undefined
      }
      request_withdrawal: {
        Args: {
          _amount: number
          _bank_account: string
          _holder: string
          _ifsc: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
