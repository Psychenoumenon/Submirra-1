import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getUserIP, checkIPExists, saveUserIP } from './ipControl';

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkTrialExpiration(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    }).catch(() => {
      // Silent error handling
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkTrialExpiration(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
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
      
      // Check IP address before signup
      console.log('🔍 Checking IP address...');
      const userIP = await getUserIP();
      
      if (userIP) {
        console.log('📍 User IP:', userIP);
        const ipCheck = await checkIPExists(userIP);
        
        if (ipCheck.exists) {
          console.warn('⚠️ IP already has an account:', userIP);
          throw new Error('Bu cihazdan zaten bir hesap oluşturulmuş. Lütfen giriş yapın veya destek ekibiyle iletişime geçin.');
        }
        
        console.log('✅ IP check passed');
      } else {
        console.warn('⚠️ Could not detect IP - proceeding with signup');
      }
      
      // Check if username is already taken (case-insensitive)
      console.log('🔍 Checking if username is available:', username);
      const { data: existingUser, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

      if (usernameCheckError) {
        console.error('Username check error:', usernameCheckError);
      }

      if (existingUser) {
        console.warn('⚠️ Username already taken:', username);
        throw new Error('Bu kullanıcı adı zaten alınmış. Lütfen farklı bir kullanıcı adı seçin.');
      }
      console.log('✅ Username is available:', username);

      console.log('Attempting Supabase auth.signUp...');
      
      // Gerçek Supabase auth (RLS kapalı olduğu için artık çalışmalı)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
          data: {
            full_name: fullName,
            username: username, // Username without @ symbol (case preserved)
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
        
        // Save IP address to profile if we have it
        if (userIP) {
          console.log('💾 Saving IP to profile...');
          await saveUserIP(data.user.id, userIP);
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
    try {
      // Sign out from Supabase (clears all sessions)
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear local state
      setUser(null);
      
      // Clear all local storage and session storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Force reload to login page (this ensures all state is cleared)
      window.location.replace('/signin');
    } catch (error) {
      console.error('Sign out exception:', error);
      
      // Force clear even if error
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/signin');
    }
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
