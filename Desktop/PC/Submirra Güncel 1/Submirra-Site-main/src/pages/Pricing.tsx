import { Check, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubscribe = () => {
    if (!user) {
      navigate('/signin');
      return;
    }
    alert('Payment integration coming soon! This will redirect to Stripe checkout.');
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
              <li className="flex items-start gap-2 text-slate-300 text-sm">
                <Check className="text-cyan-400 flex-shrink-0 mt-1" size={16} />
                <span>{t.pricing.standard.feature5}</span>
              </li>
            </ul>

            <button
              onClick={handleSubscribe}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/30"
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

            <button
              onClick={handleSubscribe}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/40 hover:scale-105"
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
