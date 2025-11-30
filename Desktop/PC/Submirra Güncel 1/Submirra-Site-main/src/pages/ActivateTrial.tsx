import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { Sparkles, Check, ArrowRight } from 'lucide-react';

export default function ActivateTrial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
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

  const activateTrial = async () => {
    if (!user || alreadyUsed) return;

    setActivating(true);

    try {
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

      const { error } = await supabase
        .from('profiles')
        .update({
          trial_used: true,
          trial_start: trialStart.toISOString(),
          trial_end: trialEnd.toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setActivated(true);
    } catch (error) {
      console.error('Error activating trial:', error);
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
