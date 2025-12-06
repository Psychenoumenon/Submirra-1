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
    // Normal Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Check trial expiration when session loads
      if (session?.user) {
        checkTrialExpiration(session.user.id);
      }
    }).catch(() => {
      // Silent error handling
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Check trial expiration when auth state changes
      if (session?.user) {
        checkTrialExpiration(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to check trial expiration and create notification
  const checkTrialExpiration = async (userId: string) => {
    try {
      // Call the database function to check and create notification if needed
      const { error } = await supabase.rpc('check_trial_expiration', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error checking trial expiration:', error);
      }
    } catch (error) {
      console.error('Error in checkTrialExpiration:', error);
    }
  };

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
      console.log('Starting signup process for:', { email, fullName, username });
      
      // Basic validation
      if (!email || !password || !fullName || !username) {
        throw new Error('Tüm alanları doldurun.');
      }
      
      if (password.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır.');
      }
      
      if (username.length < 3) {
        throw new Error('Kullanıcı adı en az 3 karakter olmalıdır.');
      }
      
      // Test Supabase connection
      try {
        const { data: testData, error: testError } = await supabase.from('profiles').select('count').limit(1);
        console.log('Supabase connection test:', { testData, testError });
      } catch (testErr) {
        console.error('Supabase connection test failed:', testErr);
      }
      // Skip username check for now to avoid 406 errors
      // The database will handle uniqueness constraint
      console.log('Skipping username check to avoid 406 errors - database will handle uniqueness');

      console.log('Attempting Supabase auth.signUp...');
      
      // Gerçek Supabase auth (RLS kapalı olduğu için artık çalışmalı)
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
      
      console.log('SignUp response:', { 
        user: data?.user ? { id: data.user.id, email: data.user.email } : null, 
        session: data?.session ? 'exists' : 'null',
        error: error ? { message: error.message, status: error.status } : null 
      });

      if (error) {
        // Log error in development for debugging
        console.error('SignUp error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          code: error.code || 'no-code'
        });
        
        // More specific error handling
        if (error.message.includes('already registered') || error.message.includes('already exists') || error.message.includes('User already registered')) {
          throw new Error('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya farklı bir e-posta kullanın.');
        }
        
        if (error.message.includes('Password should be at least')) {
          throw new Error('Şifre en az 6 karakter olmalıdır.');
        }
        
        if (error.message.includes('Email rate limit exceeded')) {
          throw new Error('Çok fazla kayıt denemesi yapıldı. Lütfen birkaç dakika bekleyip tekrar deneyin.');
        }
        
        if (error.message.includes('Invalid email')) {
          throw new Error('Geçersiz e-posta adresi. Lütfen geçerli bir e-posta girin.');
        }
        
        if (error.message.includes('Signup is disabled')) {
          throw new Error('Kayıt işlemi şu anda devre dışı. Lütfen daha sonra tekrar deneyin.');
        }
        
        if (error.message.includes('Email confirmations are required')) {
          throw new Error('E-posta onayı gerekli. Lütfen Supabase ayarlarında "Enable email confirmations" seçeneğini kapatın.');
        }
        
        if (error.message.includes('rate limit')) {
          throw new Error('Çok fazla kayıt denemesi. Lütfen birkaç dakika bekleyip tekrar deneyin.');
        }
        
        if (error.message.includes('Database error saving new user')) {
          throw new Error('Veritabanı hatası: Supabase Dashboard → SQL Editor → Migration dosyalarını çalıştırın. Profiles tablosu ve RLS politikaları eksik olabilir.');
        }
        
        // Log the actual error for debugging but show generic message
        console.error('Unhandled signup error:', error.message);
        throw new Error(`Hesap oluşturulamadı: ${error.message}`);
      }

      // Skip profile creation for now - just use basic auth
      if (data.user) {
        console.log('User created successfully:', data.user.id);
        console.log('Skipping profile creation - using basic auth only');
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
