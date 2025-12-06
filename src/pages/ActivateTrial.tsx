import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';
import { Sparkles, Check, ArrowRight } from 'lucide-react';

export default function ActivateTrial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    checkTrialStatus();
  }, [user, navigate]);

  const checkTrialStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('trial_used, trial_start, trial_end')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.trial_used) {
        setAlreadyUsed(true);
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  // Get user's IP address
  const getUserIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching IP address:', error);
      // Fallback: try another service
      try {
        const response = await fetch('https://api64.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
      } catch (fallbackError) {
        console.error('Error fetching IP from fallback service:', fallbackError);
        throw new Error('Could not determine IP address');
      }
    }
  };

  const activateTrial = async () => {
    if (!user || alreadyUsed) {
      showToast('Kullanıcı bulunamadı veya deneme zaten kullanılmış.', 'error');
      return;
    }

    setActivating(true);

    try {
      // Get user's IP address
      const userIP = await getUserIP();
      
      // Check if this IP address has already used a trial
      const { data: ipCheckData, error: ipCheckError } = await supabase.rpc(
        'check_ip_trial_eligibility',
        { p_ip_address: userIP }
      );

      if (ipCheckError) {
        console.error('Error checking IP eligibility:', ipCheckError);
        throw new Error(t.trial.ipCheckFailed);
      }

      // If IP has already used a trial, block the activation
      if (ipCheckData === false) {
        showToast(t.trial.ipAlreadyUsed, 'error');
        setActivating(false);
        return;
      }
      // Önce profil var mı kontrol et
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profil yoksa oluştur
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: '',
            trial_used: false,
            trial_start: null,
            trial_end: null,
          });

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }
      } else if (profileError) {
        console.error('Error checking profile:', profileError);
        throw profileError;
      }

      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

      console.log('Activating trial for user:', user.id);
      console.log('Trial start:', trialStart.toISOString());
      console.log('Trial end:', trialEnd.toISOString());

      const { data, error } = await supabase
        .from('profiles')
        .update({
          trial_used: true,
          trial_start: trialStart.toISOString(),
          trial_end: trialEnd.toISOString(),
        })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Profil güncellenemedi. Lütfen tekrar deneyin.');
      }

      console.log('Trial activated successfully:', data);

      // Record the trial activation with IP address
      const { error: recordError } = await supabase.rpc(
        'record_trial_activation',
        {
          p_ip_address: userIP,
          p_user_id: user.id
        }
      );

      if (recordError) {
        console.error('Error recording trial activation:', recordError);
        // Don't fail the whole process if recording fails, but log it
      }

      setActivated(true);
      showToast(t.trial.activated, 'success');
      
      // Sayfanın yukarısına scroll et
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error('Error activating trial:', error);
      let errorMessage = 'Ücretsiz deneme başlatılamadı. Lütfen tekrar deneyin.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === 'PGRST301') {
        errorMessage = 'Yetkiniz yok. Lütfen giriş yapın.';
      } else if (error?.code === '23505') {
        errorMessage = 'Bu işlem zaten yapılmış.';
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setActivating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-2xl mx-auto z-10">
        {alreadyUsed ? (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-yellow-400" size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-white">
              {t.trial.alreadyUsed}
            </h1>
            <p className="text-slate-400 mb-8">
              {t.trial.alreadyUsedDesc}
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
            >
              {t.trial.viewPlans}
            </button>
          </div>
        ) : activated ? (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="text-green-400" size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              {t.trial.activated}
            </h1>
            <p className="text-slate-300 text-lg mb-2">
              {t.trial.activatedDesc}
            </p>
            <p className="text-slate-400 mb-8">
              {t.trial.enjoy3Days}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-950/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">{t.trial.duration}</p>
                <p className="text-white font-semibold">{t.trial.threeDays}</p>
              </div>
              <div className="bg-slate-950/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">{t.trial.analyses}</p>
                <p className="text-white font-semibold">{t.trial.threeAnalyses}</p>
              </div>
              <div className="bg-slate-950/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">{t.trial.features}</p>
                <p className="text-white font-semibold">{t.trial.fullAccess}</p>
              </div>
            </div>

            <button
              onClick={() => navigate('/analyze')}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 inline-flex items-center gap-2"
            >
              {t.trial.startAnalyzing}
              <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-purple-400" size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {t.trial.activateTitle}
            </h1>
            <p className="text-slate-300 text-lg mb-8">
              {t.trial.activateDesc}
            </p>

            <div className="bg-slate-950/50 rounded-lg p-6 mb-8 text-left">
              <h3 className="text-white font-semibold mb-4">{t.trial.whatsIncluded}</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                  <span className="text-slate-300">{t.trial.feature1}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                  <span className="text-slate-300">{t.trial.feature2}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                  <span className="text-slate-300">{t.trial.feature3}</span>
                </li>
              </ul>
            </div>

            <button
              onClick={activateTrial}
              disabled={activating}
              className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activating ? t.trial.activating : t.trial.activateNow}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
