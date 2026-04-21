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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          wallet_address?: string
        }
        Relationships: []
      }
      grill_leaderboard: {
        Row: {
          created_at: string
          dishes: number
          id: string
          name: string
          score: number
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          dishes?: number
          id: string
          name: string
          score?: number
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          dishes?: number
          id?: string
          name?: string
          score?: number
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          avatar_url: string | null
          bait: number
          bonus_bait_granted_total: number
          coins: number
          cooked_dishes: Json
          created_at: string
          daily_free_bait: number
          daily_free_bait_reset_at: string | null
          game_progress: Json
          equipped_rod: number
          id: string
          inventory: Json
          last_login: string | null
          level: number
          login_streak: number
          nft_rods: Json
          nickname: string | null
          referral_reward_granted: boolean
          referrer_wallet_address: string | null
          rewarded_referral_count: number
          rod_level: number
          total_catches: number
          updated_at: string
          wallet_address: string
          wallet_bait_bonus_claimed: boolean
          xp: number
          xp_to_next: number
        }
        Insert: {
          avatar_url?: string | null
          bait?: number
          bonus_bait_granted_total?: number
          coins?: number
          cooked_dishes?: Json
          created_at?: string
          daily_free_bait?: number
          daily_free_bait_reset_at?: string | null
          game_progress?: Json
          equipped_rod?: number
          id?: string
          inventory?: Json
          last_login?: string | null
          level?: number
          login_streak?: number
          nft_rods?: Json
          nickname?: string | null
          referral_reward_granted?: boolean
          referrer_wallet_address?: string | null
          rewarded_referral_count?: number
          rod_level?: number
          total_catches?: number
          updated_at?: string
          wallet_address: string
          wallet_bait_bonus_claimed?: boolean
          xp?: number
          xp_to_next?: number
        }
        Update: {
          avatar_url?: string | null
          bait?: number
          bonus_bait_granted_total?: number
          coins?: number
          cooked_dishes?: Json
          created_at?: string
          daily_free_bait?: number
          daily_free_bait_reset_at?: string | null
          game_progress?: Json
          equipped_rod?: number
          id?: string
          inventory?: Json
          last_login?: string | null
          level?: number
          login_streak?: number
          nft_rods?: Json
          nickname?: string | null
          referral_reward_granted?: boolean
          referrer_wallet_address?: string | null
          rewarded_referral_count?: number
          rod_level?: number
          total_catches?: number
          updated_at?: string
          wallet_address?: string
          wallet_bait_bonus_claimed?: boolean
          xp?: number
          xp_to_next?: number
        }
        Relationships: []
      }
      player_messages: {
        Row: {
          body: string
          created_at: string
          created_by_wallet: string
          delivered_at: string
          id: string
          player_id: string
          read_at: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by_wallet: string
          delivered_at?: string
          id?: string
          player_id: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by_wallet?: string
          delivered_at?: string
          id?: string
          player_id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_mon_rewards: {
        Row: {
          amount_mon: number
          created_at: string
          hold_until: string
          id: string
          player_id: string
          source_ref: string | null
          source_type: string
          wallet_address: string
        }
        Insert: {
          amount_mon: number
          created_at?: string
          hold_until: string
          id?: string
          player_id: string
          source_ref?: string | null
          source_type: string
          wallet_address: string
        }
        Update: {
          amount_mon?: number
          created_at?: string
          hold_until?: string
          id?: string
          player_id?: string
          source_ref?: string | null
          source_type?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_mon_rewards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      mon_withdraw_requests: {
        Row: {
          admin_note: string | null
          amount_mon: number
          id: string
          payout_tx_hash: string | null
          player_id: string
          processed_at: string | null
          processed_by_wallet: string | null
          requested_at: string
          status: string
          wallet_address: string
        }
        Insert: {
          admin_note?: string | null
          amount_mon: number
          id?: string
          payout_tx_hash?: string | null
          player_id: string
          processed_at?: string | null
          processed_by_wallet?: string | null
          requested_at?: string
          status?: string
          wallet_address: string
        }
        Update: {
          admin_note?: string | null
          amount_mon?: number
          id?: string
          payout_tx_hash?: string | null
          player_id?: string
          processed_at?: string | null
          processed_by_wallet?: string | null
          requested_at?: string
          status?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "mon_withdraw_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _wallet: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
