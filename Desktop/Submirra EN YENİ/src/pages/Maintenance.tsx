import { useState, useEffect } from 'react';
import { Loader2, Shield, Sparkles, Moon, Settings } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

interface MaintenanceProps {
  message?: string;
}

export default function Maintenance({ message }: MaintenanceProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [checkingDev, setCheckingDev] = useState(true);

  useEffect(() => {
    checkDeveloperStatus();
  }, [user]);

  const checkDeveloperStatus = async () => {
    if (!user) {
      setCheckingDev(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_developer')
        .eq('id', user.id)
        .single();

      if (data) {
        setIsDeveloper(data.is_developer === true);
      }
    } catch (error) {
      console.error('Error checking developer status:', error);
    } finally {
      setCheckingDev(false);
    }
  };

  const endMaintenance = async () => {
    setIsEnding(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({
          maintenance_mode: false,
          maintenance_started_at: null,
          maintenance_started_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'global');

      if (error) throw error;

      // Reload the page to exit maintenance mode
      window.location.reload();
    } catch (error) {
      console.error('Error ending maintenance:', error);
      setIsEnding(false);
    }
  };

  const defaultMessage = language === 'tr' 
    ? 'Sitemiz şu an bakım aşamasındadır. En yakın zamanda hizmetinize açılacaktır.'
    : 'Our site is currently under maintenance. It will be available soon.';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-xl w-full">
        {/* Glass Card */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-8 md:p-12 shadow-2xl shadow-purple-500/10">
          
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 rotate-12">
                <Moon className="w-10 h-10 text-white -rotate-12" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                <Settings className="w-3 h-3 text-yellow-900 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>

          {/* Brand Name */}
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-2">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Submirra
            </span>
          </h1>
          
          <p className="text-slate-500 text-center text-sm mb-8">
            {language === 'tr' ? 'Rüya Analiz Platformu' : 'Dream Analysis Platform'}
          </p>

          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-full">
              <div className="relative">
                <div className="w-3 h-3 bg-amber-400 rounded-full" />
                <div className="absolute inset-0 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
              </div>
              <span className="text-amber-300 font-semibold tracking-wide">
                {language === 'tr' ? 'BAKIM MODU' : 'MAINTENANCE MODE'}
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="bg-slate-800/30 rounded-2xl p-6 mb-8 border border-slate-700/50">
            <p className="text-slate-300 text-center leading-relaxed">
              {message || defaultMessage}
            </p>
          </div>

          {/* Progress Animation */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>{language === 'tr' ? 'İşlem devam ediyor...' : 'Work in progress...'}</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-full animate-maintenance-progress" />
            </div>
          </div>

          {/* Developer Section */}
          {!checkingDev && isDeveloper && (
            <div className="border-t border-slate-700/50 pt-6 mt-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">
                  {language === 'tr' ? 'Geliştirici Erişimi' : 'Developer Access'}
                </span>
              </div>
              <button
                onClick={endMaintenance}
                disabled={isEnding}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-lg transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isEnding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {language === 'tr' ? 'Bakım Sonlandırılıyor...' : 'Ending Maintenance...'}
                  </>
                ) : (
                  <>
                    <Settings className="w-5 h-5" />
                    {language === 'tr' ? 'Bakımı Sonlandır' : 'End Maintenance'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-slate-600 text-sm mt-8">
            {language === 'tr' 
              ? 'Anlayışınız için teşekkür ederiz.' 
              : 'Thank you for your patience.'}
          </p>
        </div>
      </div>

      {/* Custom Animation Styles */}
      <style>{`
        @keyframes maintenance-progress {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 100%; margin-left: 0%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-maintenance-progress {
          animation: maintenance-progress 2.5s ease-in-out infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
