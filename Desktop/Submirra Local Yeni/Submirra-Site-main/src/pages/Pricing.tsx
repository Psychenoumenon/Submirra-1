import { useState, useEffect } from 'react';
import { Check, Sparkles, Zap, Loader2, Lock, Star } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [trialUsed, setTrialUsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const checkTrialStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('trial_used')
          .eq('id', user.id)
          .single();

        if (!error && data?.trial_used) {
          setTrialUsed(true);
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      }
    };

    checkTrialStatus();
  }, [user]);

  const handleSubscribe = async (planType: 'free' | 'standard' | 'premium') => {
    // TEMPORARILY DISABLED: Standard and Premium plans are disabled for now
    // TODO: Re-enable when user requests it by removing this check
    if (planType === 'standard' || planType === 'premium') {
      showToast(
        planType === 'premium' 
          ? 'Premium plan is currently unavailable. Please try again later.' 
          : 'Standard plan is currently unavailable. Please try again later.',
        'info'
      );
      return;
    }

    if (!user) {
      navigate('/signin');
      return;
    }

    setIsProcessing(planType);

    try {
      // Supabase RPC fonksiyonunu çağırarak subscription'ı güncelle
      const { error } = await supabase.rpc('update_subscription_plan', {
        p_user_id: user.id,
        p_plan_type: planType
      });

      if (error) {
        console.error('Subscription update error:', error);
        throw error;
      }

      let successMessage = '';
      if (planType === 'free') {
        successMessage = 'Free plan activated successfully! 🎉';
      } else if (planType === 'premium') {
        successMessage = 'Premium plan activated successfully! 🎉';
      } else {
        successMessage = 'Standard plan activated successfully! 🎉';
      }

      showToast(successMessage, 'success');

      // Kısa bir gecikme sonrası sayfayı yenile (subscription bilgilerini güncellemek için)
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      showToast(
        error?.message || 'Failed to update subscription. Please try again.',
        'error'
      );
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen relative pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative max-w-7xl mx-auto z-10">
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
            {t.pricing.title}
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto px-2">
            {t.pricing.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-start">
          {/* Free Plan and Free Trial - Stacked */}
          <div className="flex flex-col gap-6">
            {/* Free Plan */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-500/30 rounded-2xl p-5 md:p-6 hover:border-slate-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-slate-500/10 hover:-translate-y-1 animate-fade-in-delay">
            <div className="flex items-center gap-2 mb-3">
              <Check className="text-slate-400" size={18} />
              <h3 className="text-lg md:text-xl font-semibold text-white">{t.pricing.freePlan.title}</h3>
            </div>
            <div className="mb-3 md:mb-4">
              <span className="text-2xl md:text-3xl font-bold text-white">{t.pricing.freePlan.price}</span>
            </div>
            <p className="text-slate-400 text-sm mb-6">{t.pricing.freePlan.description}</p>

            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-slate-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freePlan.feature1}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-slate-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freePlan.feature2}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-slate-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freePlan.feature3}</span>
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe('free')}
              disabled={isProcessing === 'free'}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing === 'free' ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Processing...
                </>
              ) : (
                t.pricing.freePlan.cta
              )}
            </button>
            </div>

            {/* Free Trial */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-green-500/30 rounded-2xl p-5 md:p-6 hover:border-green-500/50 transition-all duration-500 hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1 animate-fade-in-delay">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-green-400" size={18} />
              <h3 className="text-lg md:text-xl font-semibold text-white">{t.pricing.freeTrial.title}</h3>
            </div>
            <div className="mb-3 md:mb-4">
              <span className="text-2xl md:text-3xl font-bold text-white">{t.pricing.freeTrial.price}</span>
            </div>
            <p className="text-slate-400 text-sm mb-6">{t.pricing.freeTrial.description}</p>

            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-green-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freeTrial.feature1}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-green-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freeTrial.feature2}</span>
              </li>
              {t.pricing.freeTrial.feature3 && (
                <li className="flex items-start gap-2 text-slate-300 text-sm">
                  <Check className="text-green-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.freeTrial.feature3}</span>
                </li>
              )}
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-green-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freeTrial.feature4}</span>
              </li>
            </ul>

            <button
              onClick={() => {
                if (trialUsed) {
                  showToast('You have already used the free trial', 'info');
                  return;
                }
                navigate(user ? '/activate-trial' : '/signin');
              }}
              disabled={trialUsed}
              className={`w-full px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-all duration-200 ${
                trialUsed
                  ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
              }`}
            >
              {trialUsed ? 'Already Used' : (user ? t.pricing.freeTrial.cta : t.pricing.freeTrial.signUp)}
            </button>
            </div>
          </div>

          {/* Standard Plan */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-5 md:p-6 hover:border-cyan-500/40 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10 md:hover:-translate-y-2 animate-fade-in-delay-2 flex flex-col min-h-[600px] mt-16">
            <div className="flex items-center gap-2 mb-3">
              <Check className="text-cyan-400" size={18} />
              <h3 className="text-lg md:text-xl font-semibold text-white">{t.pricing.standard.title}</h3>
            </div>
            <div className="mb-3 md:mb-4">
              <span className="text-2xl md:text-3xl font-bold text-white">{t.pricing.standard.price}</span>
              <span className="text-slate-400 text-sm">/{t.pricing.standard.period}</span>
            </div>
            <p className="text-slate-300 text-sm mb-4">{t.pricing.standard.description}</p>

            <ul className="space-y-3 mb-4 flex-grow">
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.standard.feature1}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.standard.feature2}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.standard.feature3}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.standard.feature4}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.standard.feature5}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.standard.feature6}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.standard.feature7}</span>
              </li>
            </ul>

            {/* TEMPORARILY DISABLED: Standard plan button disabled - can be re-enabled later */}
            <button
              onClick={() => handleSubscribe('standard')}
              disabled={true}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600/50 to-blue-600/50 text-white/50 text-sm font-semibold transition-all duration-300 opacity-50 cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
            >
              {t.pricing.standard.cta}
            </button>
          </div>

          <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-sm border-2 border-pink-500/40 rounded-2xl p-5 md:p-6 hover:border-pink-500/60 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-500/20 relative md:hover:-translate-y-3 animate-fade-in-delay-3 flex flex-col min-h-[600px] mt-16">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="px-2 md:px-3 py-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                {t.pricing.premium.badge}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Zap className="text-pink-400" size={18} />
              <h3 className="text-lg md:text-xl font-semibold text-white">{t.pricing.premium.title}</h3>
            </div>
            <div className="mb-3 md:mb-4">
              <span className="text-2xl md:text-3xl font-bold text-white">{t.pricing.premium.price}</span>
              <span className="text-slate-400 text-sm">/{t.pricing.premium.period}</span>
            </div>
            <p className="text-slate-300 text-sm mb-4">{t.pricing.premium.description}</p>

            <ul className="space-y-3 mb-4 flex-grow">
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature1}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature2}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature3}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature4}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature5}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature6}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature7}</span>
              </li>
            </ul>

            {/* TEMPORARILY DISABLED: Premium plan button disabled - can be re-enabled later */}
            <button
              onClick={() => handleSubscribe('premium')}
              disabled={true}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-600/50 to-purple-600/50 text-white/50 font-semibold transition-all duration-300 opacity-50 cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
            >
              {t.pricing.premium.cta}
            </button>
          </div>

          {/* Rüyagezer Plan - Coming Soon */}
          <div className="bg-gradient-to-br from-yellow-500/20 via-amber-500/15 to-yellow-600/20 backdrop-blur-sm border-2 border-yellow-400/50 rounded-2xl p-5 md:p-6 relative overflow-hidden animate-fade-in-delay-3 hover:border-yellow-400/70 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/30 flex flex-col min-h-[600px] mt-16">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-amber-500/10 animate-pulse"></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            <div className="relative z-10 flex flex-col flex-grow">
              <div className="flex items-center gap-2 mb-3">
                <Star className="text-yellow-400" size={18} fill="currentColor" />
                <h3 className="text-lg md:text-xl font-semibold text-white">{t.pricing.ruyagezer.title}</h3>
              </div>
              <div className="mb-3">
                <p className="text-yellow-300/80 text-xs font-semibold">{t.pricing.ruyagezer.badge}</p>
              </div>
              <p className="text-slate-200 text-sm mb-4">{t.pricing.ruyagezer.description}</p>

              <ul className="space-y-3 mb-4 flex-grow">
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature1}</span>
                </li>
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature2}</span>
                </li>
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature3}</span>
                </li>
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature4}</span>
                </li>
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature5}</span>
                </li>
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature6}</span>
                </li>
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature7}</span>
                </li>
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature9}</span>
                </li>
                <li className="flex items-start gap-2 text-slate-200 text-sm">
                  <Check className="text-yellow-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.ruyagezer.feature10}</span>
                </li>
              </ul>

              {/* Coming Soon Button */}
              <button
                disabled={true}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-yellow-600/50 to-amber-600/50 text-white/50 font-semibold transition-all duration-300 opacity-50 cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
              >
                <Lock size={16} />
                {t.pricing.ruyagezer.badge}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center max-w-3xl mx-auto bg-slate-900/30 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-8 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 animate-fade-in">
          <h3 className="text-2xl font-semibold text-white mb-4">{t.pricing.whySubmirra.title}</h3>
          <p className="text-slate-300 leading-relaxed">
            {t.pricing.whySubmirra.description}
          </p>
        </div>
      </div>
    </div>
  );
}
