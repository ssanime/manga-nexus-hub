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
      background_download_queue: {
        Row: {
          attempts: number | null
          chapter_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          manga_id: string | null
          max_attempts: number | null
          priority: number | null
          source: string
          source_url: string
          status: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          manga_id?: string | null
          max_attempts?: number | null
          priority?: number | null
          source: string
          source_url: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          chapter_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          manga_id?: string | null
          max_attempts?: number | null
          priority?: number | null
          source?: string
          source_url?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "background_download_queue_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "background_download_queue_manga_id_fkey"
            columns: ["manga_id"]
            isOneToOne: false
            referencedRelation: "manga"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_pages: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          image_url: string
          page_number: number
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          image_url: string
          page_number: number
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          image_url?: string
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapter_pages_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_number: number
          created_at: string
          id: string
          manga_id: string
          release_date: string | null
          source_url: string
          team_id: string | null
          title: string | null
          updated_at: string
          views: number | null
        }
        Insert: {
          chapter_number: number
          created_at?: string
          id?: string
          manga_id: string
          release_date?: string | null
          source_url: string
          team_id?: string | null
          title?: string | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          chapter_number?: number
          created_at?: string
          id?: string
          manga_id?: string
          release_date?: string | null
          source_url?: string
          team_id?: string | null
          title?: string | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_manga_id_fkey"
            columns: ["manga_id"]
            isOneToOne: false
            referencedRelation: "manga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      manga: {
        Row: {
          alternative_titles: string[] | null
          artist: string | null
          author: string | null
          banner_url: string | null
          chapter_count: number | null
          comments_count: number | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          external_links: Json | null
          favorites: number | null
          gallery: string[] | null
          genres: string[] | null
          id: string
          is_featured: boolean | null
          language: string | null
          last_modified_by: string | null
          last_scraped_at: string | null
          publish_status: string | null
          publisher: string | null
          rating: number | null
          reading_direction: string | null
          release_date: string | null
          slug: string
          sort_order: number | null
          source: string
          source_url: string
          status: string | null
          tags: string[] | null
          team_id: string | null
          title: string
          trailer_url: string | null
          updated_at: string
          views: number | null
          year: number | null
        }
        Insert: {
          alternative_titles?: string[] | null
          artist?: string | null
          author?: string | null
          banner_url?: string | null
          chapter_count?: number | null
          comments_count?: number | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          external_links?: Json | null
          favorites?: number | null
          gallery?: string[] | null
          genres?: string[] | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          last_modified_by?: string | null
          last_scraped_at?: string | null
          publish_status?: string | null
          publisher?: string | null
          rating?: number | null
          reading_direction?: string | null
          release_date?: string | null
          slug: string
          sort_order?: number | null
          source?: string
          source_url: string
          status?: string | null
          tags?: string[] | null
          team_id?: string | null
          title: string
          trailer_url?: string | null
          updated_at?: string
          views?: number | null
          year?: number | null
        }
        Update: {
          alternative_titles?: string[] | null
          artist?: string | null
          author?: string | null
          banner_url?: string | null
          chapter_count?: number | null
          comments_count?: number | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          external_links?: Json | null
          favorites?: number | null
          gallery?: string[] | null
          genres?: string[] | null
          id?: string
          is_featured?: boolean | null
          language?: string | null
          last_modified_by?: string | null
          last_scraped_at?: string | null
          publish_status?: string | null
          publisher?: string | null
          rating?: number | null
          reading_direction?: string | null
          release_date?: string | null
          slug?: string
          sort_order?: number | null
          source?: string
          source_url?: string
          status?: string | null
          tags?: string[] | null
          team_id?: string | null
          title?: string
          trailer_url?: string | null
          updated_at?: string
          views?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manga_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      manga_favorites: {
        Row: {
          created_at: string
          id: string
          manga_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manga_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manga_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manga_favorites_manga_id_fkey"
            columns: ["manga_id"]
            isOneToOne: false
            referencedRelation: "manga"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          favorite_genres: string[] | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          favorite_genres?: string[] | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          favorite_genres?: string[] | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          chapter_id: string
          completed: boolean | null
          created_at: string
          id: string
          last_page_read: number | null
          manga_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          completed?: boolean | null
          created_at?: string
          id?: string
          last_page_read?: number | null
          manga_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          completed?: boolean | null
          created_at?: string
          id?: string
          last_page_read?: number | null
          manga_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_history_manga_id_fkey"
            columns: ["manga_id"]
            isOneToOne: false
            referencedRelation: "manga"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          job_type: string
          manga_id: string | null
          max_retries: number | null
          retry_count: number | null
          source: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          manga_id?: string | null
          max_retries?: number | null
          retry_count?: number | null
          source?: string
          status: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          manga_id?: string | null
          max_retries?: number | null
          retry_count?: number | null
          source?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_jobs_manga_id_fkey"
            columns: ["manga_id"]
            isOneToOne: false
            referencedRelation: "manga"
            referencedColumns: ["id"]
          },
        ]
      }
      scraper_sources: {
        Row: {
          base_url: string
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          base_url: string
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          base_url?: string
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      team_join_requests: {
        Row: {
          created_at: string
          custom_answers: Json | null
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_chapter_url: string | null
          status: Database["public"]["Enums"]["join_request_status"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_answers?: Json | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_chapter_url?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_answers?: Json | null
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_chapter_url?: string | null
          status?: Database["public"]["Enums"]["join_request_status"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_join_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          custom_questions: Json | null
          description: string | null
          id: string
          join_requirements: string | null
          logo_url: string | null
          name: string
          require_sample_chapter: boolean | null
          sample_chapter_instructions: string | null
          slug: string
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          custom_questions?: Json | null
          description?: string | null
          id?: string
          join_requirements?: string | null
          logo_url?: string | null
          name: string
          require_sample_chapter?: boolean | null
          sample_chapter_instructions?: string | null
          slug: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          custom_questions?: Json | null
          description?: string | null
          id?: string
          join_requirements?: string | null
          logo_url?: string | null
          name?: string
          require_sample_chapter?: boolean | null
          sample_chapter_instructions?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      join_request_status: "pending" | "approved" | "rejected"
      team_role: "leader" | "manager" | "member"
      team_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      join_request_status: ["pending", "approved", "rejected"],
      team_role: ["leader", "manager", "member"],
      team_status: ["pending", "approved", "rejected"],
    },
  },
} as const
