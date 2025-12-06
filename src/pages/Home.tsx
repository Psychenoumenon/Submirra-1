import { Sparkles, Brain, Image as ImageIcon, ArrowRight, Zap, BookOpen, TrendingUp, Eye, Palette, Database } from 'lucide-react';
import { useNavigate } from '../components/Router';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/i18n';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative pt-24 md:pt-32 pb-16 md:pb-20 px-4 md:px-6 z-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6 md:mb-8 inline-block animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
              {t.home.title}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-300 font-light tracking-wide px-2">
              {t.home.subtitle}
            </p>
          </div>

          <p className="text-base md:text-lg text-slate-400 max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-4">
            {t.home.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={() => navigate(user ? '/analyze' : '/signin')}
              className="group px-8 md:px-10 py-4 md:py-5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold text-base md:text-lg hover:from-pink-500 hover:to-purple-500 transition-all duration-300 flex items-center gap-2"
            >
              {user ? t.home.cta : t.home.getStarted}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/about')}
              className="px-8 md:px-10 py-4 md:py-5 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-purple-500/30 text-slate-300 font-semibold text-base md:text-lg hover:border-purple-500/50 hover:text-white transition-all duration-300"
            >
              {t.home.learnMore}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12 md:mt-24 max-w-5xl mx-auto">
            {/* Deep Analysis */}
            <div className="group bg-slate-900/70 backdrop-blur-sm border-2 border-pink-500/30 rounded-2xl p-6 hover:border-pink-500/60 hover:shadow-xl hover:shadow-pink-500/25 transition-all duration-500 relative overflow-hidden hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500/30 to-pink-600/20 flex items-center justify-center border-2 border-pink-500/40 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-pink-500/40 group-hover:border-pink-400/60">
                  <Brain className="w-8 h-8 text-pink-400 group-hover:text-pink-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-pink-100 transition-colors">{t.home.feature1Title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4 group-hover:text-slate-200 transition-colors">
                  {t.home.feature1Desc}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {t.home.feature1Details.split(' • ').map((detail, index) => (
                    <div key={index} className="px-3 py-2 bg-pink-500/20 text-pink-300 text-xs font-medium rounded-lg border border-pink-500/30 group-hover:bg-pink-500/30 group-hover:border-pink-400/50 transition-all text-center">
                      {detail}
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <Zap className="w-4 h-4 text-pink-400" />
                  <Eye className="w-4 h-4 text-pink-400" />
                  <TrendingUp className="w-4 h-4 text-pink-400" />
                </div>
              </div>
            </div>

            {/* Visual Generation */}

            <div className="group bg-slate-900/70 backdrop-blur-sm border-2 border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/25 transition-all duration-500 relative overflow-hidden hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center border-2 border-purple-500/40 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-purple-500/40 group-hover:border-purple-400/60">
                  <ImageIcon className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-100 transition-colors">{t.home.feature2Title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4 group-hover:text-slate-200 transition-colors">
                  {t.home.feature2Desc}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {t.home.feature2Details.split(' • ').map((detail, index) => (
                    <div key={index} className="px-3 py-2 bg-purple-500/20 text-purple-300 text-xs font-medium rounded-lg border border-purple-500/30 group-hover:bg-purple-500/30 group-hover:border-purple-400/50 transition-all text-center">
                      {detail}
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Personal Library */}

            <div className="group bg-slate-900/70 backdrop-blur-sm border-2 border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-500 relative overflow-hidden hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 flex items-center justify-center border-2 border-cyan-500/40 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-cyan-500/40 group-hover:border-cyan-400/60">
                  <BookOpen className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-100 transition-colors">{t.home.feature3Title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4 group-hover:text-slate-200 transition-colors">
                  {t.home.feature3Desc}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {t.home.feature3Details.split(' • ').map((detail, index) => (
                    <div key={index} className="px-3 py-2 bg-cyan-500/20 text-cyan-300 text-xs font-medium rounded-lg border border-cyan-500/30 group-hover:bg-cyan-500/30 group-hover:border-cyan-400/50 transition-all text-center">
                      {detail}
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
