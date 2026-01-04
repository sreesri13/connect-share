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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      business_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_products: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          discount_price: number | null
          display_order: number
          id: string
          image_url: string
          name: string
          original_price: number
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          discount_price?: number | null
          display_order?: number
          id?: string
          image_url: string
          name: string
          original_price: number
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          discount_price?: number | null
          display_order?: number
          id?: string
          image_url?: string
          name?: string
          original_price?: number
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          category_id: string
          content: string
          created_at: string
          display_order: number
          id: string
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          content: string
          created_at?: string
          display_order?: number
          id?: string
          title: string
          type: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["item_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_business_page_products: {
        Row: {
          display_order: number
          id: string
          product_id: string
          qr_page_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          product_id: string
          qr_page_id: string
        }
        Update: {
          display_order?: number
          id?: string
          product_id?: string
          qr_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_business_page_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_business_page_products_qr_page_id_fkey"
            columns: ["qr_page_id"]
            isOneToOne: false
            referencedRelation: "qr_business_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_business_pages: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_locked: boolean | null
          location_name: string | null
          public_id: string
          style_config: Json | null
          style_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_locked?: boolean | null
          location_name?: string | null
          public_id: string
          style_config?: Json | null
          style_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_locked?: boolean | null
          location_name?: string | null
          public_id?: string
          style_config?: Json | null
          style_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_business_pages_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "qr_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_page_items: {
        Row: {
          display_order: number
          id: string
          item_id: string
          qr_page_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          item_id: string
          qr_page_id: string
        }
        Update: {
          display_order?: number
          id?: string
          item_id?: string
          qr_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_page_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_page_items_qr_page_id_fkey"
            columns: ["qr_page_id"]
            isOneToOne: false
            referencedRelation: "qr_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_pages: {
        Row: {
          created_at: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          is_deleted: boolean | null
          location_lat: number | null
          location_lng: number | null
          location_locked: boolean | null
          location_name: string | null
          password_hash: string | null
          public_id: string
          style_config: Json | null
          style_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_deleted?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_locked?: boolean | null
          location_name?: string | null
          password_hash?: string | null
          public_id: string
          style_config?: Json | null
          style_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_deleted?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          location_locked?: boolean | null
          location_name?: string | null
          password_hash?: string | null
          public_id?: string
          style_config?: Json | null
          style_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_pages_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "qr_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          city: string | null
          country: string | null
          device_type: string | null
          id: string
          ip_hash: string | null
          qr_business_page_id: string | null
          qr_page_id: string | null
          scanned_at: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          qr_business_page_id?: string | null
          qr_page_id?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_hash?: string | null
          qr_business_page_id?: string | null
          qr_page_id?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_qr_business_page_id_fkey"
            columns: ["qr_business_page_id"]
            isOneToOne: false
            referencedRelation: "qr_business_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_scans_qr_page_id_fkey"
            columns: ["qr_page_id"]
            isOneToOne: false
            referencedRelation: "qr_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_styles: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upi_payments: {
        Row: {
          amount: number | null
          created_at: string
          display_name: string | null
          id: string
          public_code: string
          updated_at: string
          upi_id: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          public_code: string
          updated_at?: string
          upi_id: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          public_code?: string
          updated_at?: string
          upi_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      hash_qr_password: { Args: { password: string }; Returns: string }
      verify_qr_password: {
        Args: { password: string; qr_public_id: string }
        Returns: boolean
      }
    }
    Enums: {
      item_type: "url" | "text" | "pdf" | "image" | "video" | "audio" | "others"
      product_status: "active" | "disabled"
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
      item_type: ["url", "text", "pdf", "image", "video", "audio", "others"],
      product_status: ["active", "disabled"],
    },
  },
} as const
