import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize authentication session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      // Silent error handling
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Generic error messages - don't expose Supabase
        const genericError = new Error(
          error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')
            ? 'Geçersiz e-posta veya şifre. Lütfen tekrar deneyin.'
            : error.message.includes('Email not confirmed')
            ? 'E-posta adresiniz henüz onaylanmamış. Lütfen e-postanızı kontrol edin.'
            : 'Giriş yapılamadı. Bilgilerinizi kontrol edip tekrar deneyin.'
        );
        return { error: genericError };
      }
      return { error: null };
    } catch (error) {
      return { error: new Error('Giriş yapılamadı. Lütfen daha sonra tekrar deneyin.') };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        return { error: new Error('Bu kullanıcı adı zaten alınmış. Lütfen farklı bir tane seçin.') };
      }

      // Ignore 'not found' errors (PGRST116) - means username is available
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Username check error:', checkError);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
          data: {
            full_name: fullName,
            username: username.toLowerCase(),
          },
        },
      });

      if (error) {
        // Log error in development for debugging
        if (import.meta.env.DEV) {
          console.error('SignUp error:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText
          });
        }
        
        // Generic error messages - don't expose Supabase
        const genericError = new Error(
          error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')
            ? 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya farklı bir e-posta kullanın.'
            : error.message.includes('Password should be at least')
            ? 'Şifre en az 6 karakter olmalıdır.'
            : 'Hesap oluşturulamadı. Lütfen tekrar deneyin.'
        );
        throw genericError;
      }

      // Profile will be created automatically by database trigger
      // If trigger doesn't work, try to create it manually
      if (data.user) {
        try {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
            username: username.toLowerCase(),
          }, {
            onConflict: 'id'
          });

          if (profileError) {
            // Log in development for debugging
            if (import.meta.env.DEV) {
              console.error('Profile creation error:', profileError);
            }
            // Don't throw - trigger should handle it
          }
        } catch (profileErr) {
          // Log in development for debugging
          if (import.meta.env.DEV) {
            console.error('Profile creation exception:', profileErr);
          }
        }
      }

      // If no session but user exists, it might be email confirmation
      // In that case, still return success - user can login after confirming
      if (data.user && !data.session) {
        // User created but needs email confirmation
        // Return success anyway - they can login after confirming
        return { error: null };
      }

      return { error: null };
    } catch (error) {
      // Log in development for debugging
      if (import.meta.env.DEV) {
        console.error('SignUp exception:', error);
      }
      return { error: error instanceof Error ? error : new Error('Hesap oluşturulamadı. Lütfen tekrar deneyin.') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
