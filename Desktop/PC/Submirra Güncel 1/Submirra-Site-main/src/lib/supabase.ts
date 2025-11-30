import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Silent warning - don't expose configuration details
  if (import.meta.env.DEV) {
    console.error('🚨 SUPABASE YAPILANDIRMASI EKSİK!');
    console.error('❌ VITE_SUPABASE_URL:', supabaseUrl ? '✅ Var' : '❌ Eksik');
    console.error('❌ VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Var' : '❌ Eksik');
    console.error('📝 Çözüm: Proje kök dizininde .env dosyası oluşturun:');
    console.error(`
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
    `);
  }
}

// Create Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          username: string | null;
          trial_start: string | null;
          trial_end: string | null;
          trial_used: boolean;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          username?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          trial_used?: boolean;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          username?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          trial_used?: boolean;
          avatar_url?: string | null;
          bio?: string | null;
          updated_at?: string;
        };
      };
      dreams: {
        Row: {
          id: string;
          user_id: string;
          dream_text: string;
          analysis_text: string | null;
          image_url: string | null;
          status: string;
          is_public: boolean;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dream_text: string;
          analysis_text?: string | null;
          image_url?: string | null;
          status?: string;
          is_public?: boolean;
          likes_count?: number;
          created_at?: string;
        };
        Update: {
          dream_text?: string;
          analysis_text?: string | null;
          image_url?: string | null;
          status?: string;
          is_public?: boolean;
          likes_count?: number;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          message_text: string;
          read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          message_text: string;
          read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          message_text?: string;
          read_at?: string | null;
          updated_at?: string;
        };
      };
    };
  };
};
