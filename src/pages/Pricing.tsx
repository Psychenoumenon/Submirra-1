import { useState } from 'react';
import { Check, Sparkles, Zap, Loader2 } from 'lucide-react';
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

  const handleSubscribe = async (planType: 'standard' | 'premium') => {
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

      showToast(
        planType === 'premium' 
          ? 'Premium plan activated successfully! 🎉' 
          : 'Standard plan activated successfully! 🎉',
        'success'
      );

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-5 md:p-6 hover:border-purple-500/40 transition-all duration-500 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 animate-fade-in-delay">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-purple-400" size={18} />
              <h3 className="text-lg md:text-xl font-semibold text-white">{t.pricing.freeTrial.title}</h3>
            </div>
            <div className="mb-3 md:mb-4">
              <span className="text-2xl md:text-3xl font-bold text-white">{t.pricing.freeTrial.price}</span>
            </div>
            <p className="text-slate-400 text-sm mb-6">{t.pricing.freeTrial.description}</p>

            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-purple-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freeTrial.feature1}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-purple-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freeTrial.feature2}</span>
              </li>
              {t.pricing.freeTrial.feature3 && (
                <li className="flex items-start gap-2 text-slate-300 text-sm">
                  <Check className="text-purple-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.freeTrial.feature3}</span>
                </li>
              )}
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-purple-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.freeTrial.feature4}</span>
              </li>
            </ul>

            <button
              onClick={() => navigate(user ? '/activate-trial' : '/signin')}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-all duration-200"
            >
              {user ? t.pricing.freeTrial.cta : t.pricing.freeTrial.signUp}
            </button>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-5 md:p-6 hover:border-cyan-500/40 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10 md:hover:-translate-y-2 animate-fade-in-delay-2">
            <div className="flex items-center gap-2 mb-3">
              <Check className="text-cyan-400" size={18} />
              <h3 className="text-lg md:text-xl font-semibold text-white">{t.pricing.standard.title}</h3>
            </div>
            <div className="mb-3 md:mb-4">
              <span className="text-2xl md:text-3xl font-bold text-white">{t.pricing.standard.price}</span>
              <span className="text-slate-400 text-sm">/{t.pricing.standard.period}</span>
            </div>
            <p className="text-slate-300 text-sm mb-6">{t.pricing.standard.description}</p>

            <ul className="space-y-2 mb-6">
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
              {t.pricing.standard.feature5 && (
                <li className="flex items-start gap-2 text-slate-300 text-sm">
                  <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                  <span>{t.pricing.standard.feature5}</span>
                </li>
              )}
            </ul>

            {/* TEMPORARILY DISABLED: Standard plan button disabled - can be re-enabled later */}
            <button
              onClick={() => handleSubscribe('standard')}
              disabled={true}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600/50 to-blue-600/50 text-white/50 text-sm font-semibold transition-all duration-300 opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.pricing.standard.cta}
            </button>
          </div>

          <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 backdrop-blur-sm border-2 border-pink-500/40 rounded-2xl p-5 md:p-6 hover:border-pink-500/60 transition-all duration-500 hover:shadow-2xl hover:shadow-pink-500/20 relative md:hover:-translate-y-3 animate-fade-in-delay-3">
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
            <p className="text-slate-300 text-sm mb-6 font-medium">{t.pricing.premium.description}</p>

            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span className="font-medium">{t.pricing.premium.feature1}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span className="font-medium">{t.pricing.premium.feature2}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span className="font-medium">{t.pricing.premium.feature3}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature4}</span>
              </li>
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-pink-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.premium.feature5}</span>
              </li>
            </ul>

            {/* TEMPORARILY DISABLED: Premium plan button disabled - can be re-enabled later */}
            <button
              onClick={() => handleSubscribe('premium')}
              disabled={true}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-600/50 to-purple-600/50 text-white/50 font-semibold transition-all duration-300 opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t.pricing.premium.cta}
            </button>
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
