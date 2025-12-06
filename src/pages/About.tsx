import { Brain, Sparkles, Shield } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen relative pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto z-10">
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
            {t.about.title}
          </h1>
          <p className="text-slate-400 text-base md:text-lg px-2">
            {t.about.subtitle}
          </p>
        </div>

        <div className="space-y-6 md:space-y-12">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-5 md:p-8 hover:border-pink-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-pink-500/10 hover:-translate-y-1 animate-fade-in-delay">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center border border-pink-500/30 flex-shrink-0">
                <Brain className="text-pink-400" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-2 md:mb-3">{t.about.missionTitle}</h2>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                  {t.about.missionDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-5 md:p-8 hover:border-purple-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 animate-fade-in-delay-2">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center border border-purple-500/30 flex-shrink-0">
                <Sparkles className="text-purple-400" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-2 md:mb-3">{t.about.howItWorksTitle}</h2>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-3 md:mb-4">
                  {t.about.howItWorksDesc}
                </p>
                <ul className="space-y-2 text-sm md:text-base text-slate-300">
                  <li className="flex gap-2">
                    <span className="text-purple-400 flex-shrink-0">•</span>
                    <span>{t.about.step1}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 flex-shrink-0">•</span>
                    <span>{t.about.step2}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 flex-shrink-0">•</span>
                    <span>{t.about.step3}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 flex-shrink-0">•</span>
                    <span>{t.about.step4}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 flex-shrink-0">•</span>
                    <span>{t.about.step5}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-5 md:p-8 hover:border-cyan-500/30 transition-all duration-500 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 animate-fade-in-delay-3">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center border border-cyan-500/30 flex-shrink-0">
                <Shield className="text-cyan-400" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl md:text-2xl font-semibold text-white mb-2 md:mb-3">{t.about.privacyTitle}</h2>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                  {t.about.privacyDesc}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pt-6 md:pt-8">
            <p className="text-sm md:text-base text-slate-400 italic px-4">
              {t.about.quote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
