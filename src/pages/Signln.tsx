import { useState, useRef, useEffect } from 'react';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { testSupabaseConfig } from '../lib/supabase';

export default function SignIn() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.oninvalid = (e) => {
        e.preventDefault();
        const input = e.target as HTMLInputElement;
        if (input.validity.valueMissing) {
          input.setCustomValidity(t.auth.validationRequired);
        } else if (input.validity.typeMismatch) {
          input.setCustomValidity(t.auth.validationEmail);
        }
      };
      emailRef.current.oninput = (e) => {
        (e.target as HTMLInputElement).setCustomValidity('');
      };
    }
    if (passwordRef.current) {
      passwordRef.current.oninvalid = (e) => {
        e.preventDefault();
        (e.target as HTMLInputElement).setCustomValidity(t.auth.validationRequired);
      };
      passwordRef.current.oninput = (e) => {
        (e.target as HTMLInputElement).setCustomValidity('');
      };
    }
    if (fullNameRef.current) {
      fullNameRef.current.oninvalid = (e) => {
        e.preventDefault();
        (e.target as HTMLInputElement).setCustomValidity(t.auth.validationRequired);
      };
      fullNameRef.current.oninput = (e) => {
        (e.target as HTMLInputElement).setCustomValidity('');
      };
    }
  }, [t, isSignUp]);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const testConfig = async () => {
    console.log('Testing Supabase configuration...');
    const result = await testSupabaseConfig();
    console.log('Config test result:', result);
    if (!result.success) {
      setError(`Supabase yapılandırma hatası: ${result.error?.message || 'Bilinmeyen hata'}`);
    } else {
      setError('Supabase yapılandırması çalışıyor!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        if (!username.trim()) {
          throw new Error('Please enter a username');
        }
        if (username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }
        if (!acceptedTerms) {
          setError(t.auth.mustAcceptTerms);
          setLoading(false);
          return;
        }
        if (!acceptedPrivacy) {
          setError(t.auth.mustAcceptPrivacy);
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName, username);
        if (error) {
          console.error('SignUp UI Error:', error);
          console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('already registered') || errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
            setError(t.auth.emailAlreadyExists);
          } else if (errorMessage.includes('configuration')) {
            setError('Supabase yapılandırması eksik. .env dosyasını kontrol edin.');
          } else if (errorMessage.includes('email confirmations are required')) {
            setError('E-posta onayı gerekli. Supabase Dashboard → Authentication → Settings → "Enable email confirmations" seçeneğini kapatın.');
          } else if (errorMessage.includes('rate limit')) {
            setError('Çok fazla kayıt denemesi. Lütfen 5-10 dakika bekleyip tekrar deneyin.');
          } else {
            // Show the actual error message for debugging
            setError(error.message);
          }
          setLoading(false);
          return;
        }

        // Directly navigate to analyze page - no email confirmation needed
        navigate('/analyze');
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          const errorMessage = error.message.toLowerCase();
          if (errorMessage.includes('invalid') || errorMessage.includes('credentials')) {
            setError(t.auth.invalidCredentials);
          } else {
            setError(error.message);
          }
          setLoading(false);
          return;
        }
        navigate('/analyze');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen relative pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-6 flex items-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md mx-auto w-full z-10">
        <div className="text-center mb-6 md:mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
            {isSignUp ? t.auth.createAccount : t.auth.welcomeBack}
          </h1>
          <p className="text-slate-400 text-sm md:text-base px-2">
            {isSignUp ? t.auth.startJourney : t.auth.continueExploring}
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-5 md:p-8 hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 animate-fade-in-delay">
          <div className="flex gap-2 mb-6 md:mb-8">
            <button
              onClick={() => {
                setIsSignUp(false);
                setError(null);
                setAcceptedTerms(false);
                setAcceptedPrivacy(false);
              }}
              className={`flex-1 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 text-sm md:text-base ${
                !isSignUp
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              {t.auth.signIn}
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setError(null);
                setAcceptedTerms(false);
                setAcceptedPrivacy(false);
              }}
              className={`flex-1 py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 text-sm md:text-base ${
                isSignUp
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
              }`}
            >
              {t.auth.signUp}
            </button>
          </div>

          {error && (
            <div className="mb-5 md:mb-6 p-3 md:p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs md:text-sm">
              {error}
            </div>
          )}


          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-slate-300 font-medium mb-2 text-sm md:text-base">
                    {t.auth.fullName}
                  </label>
                  <input
                    ref={fullNameRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    placeholder={t.auth.enterFullName}
                    required={isSignUp}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-2 text-sm md:text-base">
                    Username
                  </label>
                  <input
                    ref={usernameRef}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                    placeholder="username"
                    required={isSignUp}
                    minLength={3}
                    maxLength={20}
                  />
                  <p className="text-xs text-slate-500 mt-1">Only lowercase letters, numbers, and underscores</p>
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm md:text-base">
                {t.auth.email}
              </label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                placeholder={t.auth.enterEmail}
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm md:text-base">
                {t.auth.password}
              </label>
              <input
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                placeholder={t.auth.enterPassword}
                required
                minLength={6}
              />
            </div>

            {isSignUp && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-purple-500/30 bg-slate-950/50 text-purple-600 focus:ring-purple-500/50 focus:ring-2 cursor-pointer"
                  />
                  <label htmlFor="acceptTerms" className="text-slate-300 text-sm md:text-base cursor-pointer flex-1">
                    {t.auth.acceptTerms}{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/terms');
                      }}
                      className="text-purple-400 hover:text-purple-300 underline transition-colors"
                    >
                      ({t.auth.readTerms})
                    </button>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptPrivacy"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-purple-500/30 bg-slate-950/50 text-purple-600 focus:ring-purple-500/50 focus:ring-2 cursor-pointer"
                  />
                  <label htmlFor="acceptPrivacy" className="text-slate-300 text-sm md:text-base cursor-pointer flex-1">
                    {t.auth.acceptPrivacy}{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/privacy');
                      }}
                      className="text-purple-400 hover:text-purple-300 underline transition-colors"
                    >
                      ({t.auth.readPrivacy})
                    </button>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-5 md:px-6 py-3 md:py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  {isSignUp ? t.auth.creatingAccount : t.auth.signingIn}
                </>
              ) : (
                <>
                  {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                  {isSignUp ? t.auth.signUp : t.auth.signIn}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
