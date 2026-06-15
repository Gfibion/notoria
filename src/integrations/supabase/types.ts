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
      admin_device_links: {
        Row: {
          admin_id: string
          created_at: string
          created_by_device: string
          expires_at: string
          token: string
          used_at: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          created_by_device: string
          expires_at?: string
          token: string
          used_at?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          created_by_device?: string
          expires_at?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_device_links_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_devices: {
        Row: {
          admin_id: string
          claimed_at: string
          device_id: string
          ip: string | null
          last_seen_at: string
          user_agent: string | null
        }
        Insert: {
          admin_id: string
          claimed_at?: string
          device_id: string
          ip?: string | null
          last_seen_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_id?: string
          claimed_at?: string
          device_id?: string
          ip?: string | null
          last_seen_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_devices_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_escrow: {
        Row: {
          created_at: string
          created_by: string
          id: number
          public_key_jwk: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: number
          public_key_jwk: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: number
          public_key_jwk?: Json
        }
        Relationships: []
      }
      admin_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      admin_seeds: {
        Row: {
          created_at: string
          email: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          role?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          created_at: string
          email: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cloud_backups: {
        Row: {
          ciphertext: string
          client_updated_at: string
          created_at: string
          escrow_wrapped_key: string | null
          id: string
          nonce: string
          note_id: string
          updated_at: string
          user_hash: string
        }
        Insert: {
          ciphertext: string
          client_updated_at: string
          created_at?: string
          escrow_wrapped_key?: string | null
          id?: string
          nonce: string
          note_id: string
          updated_at?: string
          user_hash: string
        }
        Update: {
          ciphertext?: string
          client_updated_at?: string
          created_at?: string
          escrow_wrapped_key?: string | null
          id?: string
          nonce?: string
          note_id?: string
          updated_at?: string
          user_hash?: string
        }
        Relationships: []
      }
      coffee_supports: {
        Row: {
          amount: number | null
          checkout_id: string
          created_at: string
          currency: string | null
          customer_email: string | null
          id: string
          product_id: string | null
          product_name: string | null
          status: string
        }
        Insert: {
          amount?: number | null
          checkout_id: string
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          status: string
        }
        Update: {
          amount?: number | null
          checkout_id?: string
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          status?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          published: boolean
          question: string
          sort_order: number
          source_ticket_id: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          published?: boolean
          question: string
          sort_order?: number
          source_ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          published?: boolean
          question?: string
          sort_order?: number
          source_ticket_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          access_token: string
          contact_email: string | null
          created_at: string
          id: string
          reason: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          user_hash: string | null
        }
        Insert: {
          access_token: string
          contact_email?: string | null
          created_at?: string
          id?: string
          reason: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          user_hash?: string | null
        }
        Update: {
          access_token?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          reason?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_hash?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_master_admin: { Args: { _uid: string }; Returns: boolean }
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
