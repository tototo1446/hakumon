import { createClient } from '@supabase/supabase-js';

// 環境変数からSupabaseのURLとキーを取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabaseクライアントの作成（環境変数がない場合でもダミークライアントを作成してエラーを防ぐ）
let supabaseClient: ReturnType<typeof createClient<Database>>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase環境変数が設定されていません。VITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを設定してください。');
  // ダミーのURLとキーでクライアントを作成（エラーを防ぐため）
  supabaseClient = createClient<Database>('https://placeholder.supabase.co', 'dummy-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
} else {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = supabaseClient;

// データベースの型定義（Supabaseのスキーマに基づく）
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          account_id: string;
          password: string;
          email: string;
          min_required_respondents: number;
          logo: string | null;
          description: string | null;
          website: string | null;
          address: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
          password_reset_token: string | null;
          password_reset_expires_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          account_id: string;
          password: string;
          email: string;
          min_required_respondents?: number;
          logo?: string | null;
          description?: string | null;
          website?: string | null;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
          password_reset_token?: string | null;
          password_reset_expires_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          account_id?: string;
          password?: string;
          email?: string;
          min_required_respondents?: number;
          logo?: string | null;
          description?: string | null;
          website?: string | null;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
          password_reset_token?: string | null;
          password_reset_expires_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string;
          role: string;
          scores: unknown;
          department: string | null;
          position: string | null;
          pending_password: boolean;
          invitation_token: string | null;
          invitation_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email: string;
          role?: string;
          scores?: unknown;
          department?: string | null;
          position?: string | null;
          pending_password?: boolean;
          invitation_token?: string | null;
          invitation_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string;
          role?: string;
          scores?: unknown;
          department?: string | null;
          position?: string | null;
          pending_password?: boolean;
          invitation_token?: string | null;
          invitation_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      surveys: {
        Row: {
          id: string;
          title: string;
          description: string;
          questions: unknown;
          organization_id: string;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          questions: unknown;
          organization_id: string;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          questions?: unknown;
          organization_id?: string;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      survey_responses: {
        Row: {
          id: string;
          survey_id: string;
          organization_id: string;
          respondent_name: string;
          submitted_at: string;
          answers: unknown;
        };
        Insert: {
          id?: string;
          survey_id: string;
          organization_id: string;
          respondent_name: string;
          submitted_at?: string;
          answers: unknown;
        };
        Update: {
          id?: string;
          survey_id?: string;
          organization_id?: string;
          respondent_name?: string;
          submitted_at?: string;
          answers?: unknown;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
