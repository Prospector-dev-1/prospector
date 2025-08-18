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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_analysis_cache: {
        Row: {
          created_at: string
          expires_at: string
          hash: string
          id: string
          model: string | null
          response: Json
        }
        Insert: {
          created_at?: string
          expires_at: string
          hash: string
          id?: string
          model?: string | null
          response: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          hash?: string
          id?: string
          model?: string | null
          response?: Json
        }
        Relationships: []
      }
      ai_replays: {
        Row: {
          created_at: string
          id: string
          improvement: number | null
          new_score: number | null
          original_call_id: string | null
          original_score: number | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          improvement?: number | null
          new_score?: number | null
          original_call_id?: string | null
          original_score?: number | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          improvement?: number | null
          new_score?: number | null
          original_call_id?: string | null
          original_score?: number | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_replays_original_call_id_fkey"
            columns: ["original_call_id"]
            isOneToOne: false
            referencedRelation: "call_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          metadata: Json | null
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          metadata?: Json | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          target_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      business_types: {
        Row: {
          category: string
          common_pain_points: string[]
          created_at: string
          id: string
          name: string
          typical_roles: string[]
        }
        Insert: {
          category: string
          common_pain_points: string[]
          created_at?: string
          id?: string
          name: string
          typical_roles: string[]
        }
        Update: {
          category?: string
          common_pain_points?: string[]
          created_at?: string
          id?: string
          name?: string
          typical_roles?: string[]
        }
        Relationships: []
      }
      call_objectives: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          scoring_categories: Json
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          scoring_categories: Json
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          scoring_categories?: Json
        }
        Relationships: []
      }
      call_uploads: {
        Row: {
          ai_analysis: Json | null
          better_responses: Json | null
          call_moments: Json | null
          confidence_score: number | null
          created_at: string
          fallback_used: boolean | null
          file_size: number
          file_type: string
          id: string
          objection_handling_scores: Json | null
          original_filename: string
          psychological_insights: string | null
          status: string
          strengths: string[] | null
          transcript: string | null
          updated_at: string
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          ai_analysis?: Json | null
          better_responses?: Json | null
          call_moments?: Json | null
          confidence_score?: number | null
          created_at?: string
          fallback_used?: boolean | null
          file_size: number
          file_type: string
          id?: string
          objection_handling_scores?: Json | null
          original_filename: string
          psychological_insights?: string | null
          status?: string
          strengths?: string[] | null
          transcript?: string | null
          updated_at?: string
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          ai_analysis?: Json | null
          better_responses?: Json | null
          call_moments?: Json | null
          confidence_score?: number | null
          created_at?: string
          fallback_used?: boolean | null
          file_size?: number
          file_type?: string
          id?: string
          objection_handling_scores?: Json | null
          original_filename?: string
          psychological_insights?: string | null
          status?: string
          strengths?: string[] | null
          transcript?: string | null
          updated_at?: string
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          ai_feedback: string | null
          business_type: string | null
          call_objective: string | null
          call_status: string
          clarity_score: number | null
          closing_score: number | null
          confidence_score: number | null
          created_at: string
          custom_instructions: string | null
          difficulty_level: number
          duration_seconds: number | null
          id: string
          objection_handling_score: number | null
          overall_pitch_score: number | null
          overall_score: number | null
          persuasiveness_score: number | null
          prospect_role: string | null
          scenario_data: Json | null
          successful_sale: boolean | null
          tone_score: number | null
          transcript: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          business_type?: string | null
          call_objective?: string | null
          call_status?: string
          clarity_score?: number | null
          closing_score?: number | null
          confidence_score?: number | null
          created_at?: string
          custom_instructions?: string | null
          difficulty_level: number
          duration_seconds?: number | null
          id?: string
          objection_handling_score?: number | null
          overall_pitch_score?: number | null
          overall_score?: number | null
          persuasiveness_score?: number | null
          prospect_role?: string | null
          scenario_data?: Json | null
          successful_sale?: boolean | null
          tone_score?: number | null
          transcript?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          business_type?: string | null
          call_objective?: string | null
          call_status?: string
          clarity_score?: number | null
          closing_score?: number | null
          confidence_score?: number | null
          created_at?: string
          custom_instructions?: string | null
          difficulty_level?: number
          duration_seconds?: number | null
          id?: string
          objection_handling_score?: number | null
          overall_pitch_score?: number | null
          overall_score?: number | null
          persuasiveness_score?: number | null
          prospect_role?: string | null
          scenario_data?: Json | null
          successful_sale?: boolean | null
          tone_score?: number | null
          transcript?: string | null
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenge_type: string
          created_at: string
          description: string
          end_date: string
          id: string
          name: string
          reward_credits: number
          start_date: string
          target_value: number
        }
        Insert: {
          challenge_type: string
          created_at?: string
          description: string
          end_date: string
          id?: string
          name: string
          reward_credits?: number
          start_date?: string
          target_value: number
        }
        Update: {
          challenge_type?: string
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          name?: string
          reward_credits?: number
          start_date?: string
          target_value?: number
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          stripe_session_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          stripe_session_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          stripe_session_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      moment_replays: {
        Row: {
          call_upload_id: string
          coaching_feedback: Json | null
          created_at: string
          duration_seconds: number | null
          id: string
          improvement: number | null
          moment_id: string
          original_score: number | null
          replay_score: number | null
          session_transcript: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          call_upload_id: string
          coaching_feedback?: Json | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          improvement?: number | null
          moment_id: string
          original_score?: number | null
          replay_score?: number | null
          session_transcript?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          call_upload_id?: string
          coaching_feedback?: Json | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          improvement?: number | null
          moment_id?: string
          original_score?: number | null
          replay_score?: number | null
          session_transcript?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_cycle_start: string | null
          created_at: string
          credits: number
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          monthly_coaching_unlimited: boolean | null
          monthly_credits_limit: number | null
          monthly_credits_used: number | null
          monthly_custom_scripts_limit: number | null
          monthly_custom_scripts_used: number | null
          phone_number: string | null
          subscription_end: string | null
          subscription_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          billing_cycle_start?: string | null
          created_at?: string
          credits?: number
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          monthly_coaching_unlimited?: boolean | null
          monthly_credits_limit?: number | null
          monthly_credits_used?: number | null
          monthly_custom_scripts_limit?: number | null
          monthly_custom_scripts_used?: number | null
          phone_number?: string | null
          subscription_end?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          billing_cycle_start?: string | null
          created_at?: string
          credits?: number
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          monthly_coaching_unlimited?: boolean | null
          monthly_credits_limit?: number | null
          monthly_credits_used?: number | null
          monthly_custom_scripts_limit?: number | null
          monthly_custom_scripts_used?: number | null
          phone_number?: string | null
          subscription_end?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_health: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          last_error: string | null
          open_until: string | null
          provider: string
          state: string
          success_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          last_error?: string | null
          open_until?: string | null
          provider: string
          state?: string
          success_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          last_error?: string | null
          open_until?: string | null
          provider?: string
          state?: string
          success_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          claimed_at: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          credits_claimed: boolean
          current_progress: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          claimed_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          credits_claimed?: boolean
          current_progress?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          claimed_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          credits_claimed?: boolean
          current_progress?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_stats: {
        Row: {
          calls_completed: number | null
          consecutive_days: number | null
          created_at: string
          date: string
          highest_score: number | null
          id: string
          successful_closes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calls_completed?: number | null
          consecutive_days?: number | null
          created_at?: string
          date?: string
          highest_score?: number | null
          id?: string
          successful_closes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calls_completed?: number | null
          consecutive_days?: number | null
          created_at?: string
          date?: string
          highest_score?: number | null
          id?: string
          successful_closes?: number | null
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      cleanup_old_api_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      deduct_credits: {
        Args: { amount_param: number; user_id_param: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_monthly_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_consecutive_days: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
