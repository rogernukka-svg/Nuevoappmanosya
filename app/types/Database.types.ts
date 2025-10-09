export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // ==========================
      // 👷 TABLA: worker_profiles
      // ==========================
      worker_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          skills: string[] | null;
          is_verified: boolean | null;
          is_active: boolean | null;
          radius_km: number | null;
          lat: number | null;
          lng: number | null;
          last_active_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          skills?: string[] | null;
          is_verified?: boolean | null;
          is_active?: boolean | null;
          radius_km?: number | null;
          lat?: number | null;
          lng?: number | null;
          last_active_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["worker_profiles"]["Insert"]>;
      };

      // ==========================
      // 💼 TABLA: jobs
      // ==========================
      jobs: {
        Row: {
          id: string;
          client_id: string | null;
          worker_id: string | null;
          status: "open" | "assigned" | "in_progress" | "completed" | "cancelled";
          title: string | null;
          description: string | null;
          service_slug: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          worker_id?: string | null;
          status?: "open" | "assigned" | "in_progress" | "completed" | "cancelled";
          title?: string | null;
          description?: string | null;
          service_slug?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["jobs"]["Insert"]>;
      };

      // ==========================
      // ⭐ TABLA: reviews
      // ==========================
      reviews: {
        Row: {
          id: string;
          worker_id: string;
          client_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          worker_id: string;
          client_id?: string | null;
          rating: number;
          comment?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };

      // ==========================
      // 👤 TABLA: profiles (usuarios)
      // ==========================
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: "user" | "worker" | "admin" | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "user" | "worker" | "admin" | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };

      // ==========================
      // 🔍 VISTA: map_workers_view
      // ==========================
      map_workers_view: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          skills: string[] | null;
          radius_km: number | null;
          lat: number | null;
          lng: number | null;
          last_active_at: string | null;
          is_verified: boolean | null;
          rating_avg: number | null;
          rating_count: number | null;
        };
      };
    };

    Views: {};
    Functions: {};
    Enums: {};
  };
}
