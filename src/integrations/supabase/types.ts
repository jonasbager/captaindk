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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          company_id: string
          created_at: string
          energy_levy: string | null
          id: string
          kind: string
          name: string
          number: number
          tax_line: string | null
          updated_at: string
          vat_code: string
        }
        Insert: {
          company_id: string
          created_at?: string
          energy_levy?: string | null
          id?: string
          kind: string
          name: string
          number: number
          tax_line?: string | null
          updated_at?: string
          vat_code?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          energy_levy?: string | null
          id?: string
          kind?: string
          name?: string
          number?: number
          tax_line?: string | null
          updated_at?: string
          vat_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_auth_states: {
        Row: {
          aspsp_name: string
          company_id: string
          created_at: string
          state: string
          user_id: string
        }
        Insert: {
          aspsp_name: string
          company_id: string
          created_at?: string
          state?: string
          user_id: string
        }
        Update: {
          aspsp_name?: string
          company_id?: string
          created_at?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_auth_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connections: {
        Row: {
          account_name: string | null
          account_uid: string
          aspsp_country: string
          aspsp_name: string | null
          company_id: string
          created_at: string
          currency: string
          iban: string | null
          id: string
          last_synced_at: string | null
          provider: string
          session_id: string
          status: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          account_name?: string | null
          account_uid: string
          aspsp_country?: string
          aspsp_name?: string | null
          company_id: string
          created_at?: string
          currency?: string
          iban?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          account_name?: string | null
          account_uid?: string
          aspsp_country?: string
          aspsp_name?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          iban?: string | null
          id?: string
          last_synced_at?: string | null
          provider?: string
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          company_id: string
          content: string
          created_at: string
          id: string
          role: string
          structured_data: Json | null
          tool_calls: Json | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          company_id: string
          content?: string
          created_at?: string
          id?: string
          role: string
          structured_data?: Json | null
          tool_calls?: Json | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          structured_data?: Json | null
          tool_calls?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_type: string
          created_at: string
          cvr: string | null
          fiscal_year_start: string
          id: string
          name: string
          owner_id: string
          updated_at: string
          vat_period: string
        }
        Insert: {
          company_type?: string
          created_at?: string
          cvr?: string | null
          fiscal_year_start?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
          vat_period?: string
        }
        Update: {
          company_type?: string
          created_at?: string
          cvr?: string | null
          fiscal_year_start?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          vat_period?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          cvr: string | null
          default_payment_terms: number
          email: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          cvr?: string | null
          default_payment_terms?: number
          email?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          cvr?: string | null
          default_payment_terms?: number
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          amount: number | null
          attachment_id: string | null
          company_id: string
          created_at: string
          currency: string | null
          date: string | null
          file_url: string | null
          id: string
          mime_type: string | null
          ocr_confidence: number | null
          ocr_data: Json | null
          ocr_status: string
          outlook_message_id: string | null
          received_at: string | null
          source: string
          status: string
          storage_path: string | null
          subject: string | null
          updated_at: string
          vat_amount: number | null
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          attachment_id?: string | null
          company_id: string
          created_at?: string
          currency?: string | null
          date?: string | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          ocr_confidence?: number | null
          ocr_data?: Json | null
          ocr_status?: string
          outlook_message_id?: string | null
          received_at?: string | null
          source?: string
          status?: string
          storage_path?: string | null
          subject?: string | null
          updated_at?: string
          vat_amount?: number | null
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          attachment_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string | null
          date?: string | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          ocr_confidence?: number | null
          ocr_data?: Json | null
          ocr_status?: string
          outlook_message_id?: string | null
          received_at?: string | null
          source?: string
          status?: string
          storage_path?: string | null
          subject?: string | null
          updated_at?: string
          vat_amount?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_connections: {
        Row: {
          connected_at: string
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          id: string
          last_scanned_at: string | null
          provider: string
          scopes: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          last_scanned_at?: string | null
          provider: string
          scopes?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          last_scanned_at?: string | null
          provider?: string
          scopes?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string
          customer: string
          customer_id: string | null
          date: string
          due_date: string
          id: string
          journal_entry_id: string | null
          lines: Json
          number: number
          paid_at: string | null
          payment_journal_entry_id: string | null
          pdf_url: string | null
          sent_at: string | null
          status: string
          total: number
          total_excl_vat: number
          total_vat: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer: string
          customer_id?: string | null
          date: string
          due_date: string
          id?: string
          journal_entry_id?: string | null
          lines?: Json
          number: number
          paid_at?: string | null
          payment_journal_entry_id?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          total?: number
          total_excl_vat?: number
          total_vat?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer?: string
          customer_id?: string | null
          date?: string
          due_date?: string
          id?: string
          journal_entry_id?: string | null
          lines?: Json
          number?: number
          paid_at?: string | null
          payment_journal_entry_id?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          total?: number
          total_excl_vat?: number
          total_vat?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          account: string
          account_id: string | null
          account_number: number | null
          amount: number
          company_id: string
          created_at: string
          date: string
          description: string
          has_document: boolean
          id: string
          net_amount: number | null
          status: string
          updated_at: string
          vat_amount: number
          vat_code: string
        }
        Insert: {
          account: string
          account_id?: string | null
          account_number?: number | null
          amount: number
          company_id: string
          created_at?: string
          date: string
          description: string
          has_document?: boolean
          id?: string
          net_amount?: number | null
          status?: string
          updated_at?: string
          vat_amount?: number
          vat_code?: string
        }
        Update: {
          account?: string
          account_id?: string | null
          account_number?: number | null
          amount?: number
          company_id?: string
          created_at?: string
          date?: string
          description?: string
          has_document?: boolean
          id?: string
          net_amount?: number | null
          status?: string
          updated_at?: string
          vat_amount?: number
          vat_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank_connection_id: string | null
          company_id: string
          counterparty: string | null
          created_at: string
          currency: string
          date: string
          description: string
          external_id: string | null
          id: string
          matched_document_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_connection_id?: string | null
          company_id: string
          counterparty?: string | null
          created_at?: string
          currency?: string
          date: string
          description: string
          external_id?: string | null
          id?: string
          matched_document_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_connection_id?: string | null
          company_id?: string
          counterparty?: string | null
          created_at?: string
          currency?: string
          date?: string
          description?: string
          external_id?: string | null
          id?: string
          matched_document_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_matched_document_id_fkey"
            columns: ["matched_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          source: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_default_kontoplan: {
        Args: { p_company_id: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
