import { Sparkles, Brain, Image as ImageIcon, ArrowRight, Zap, BookOpen, TrendingUp, Eye, Palette, Database, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from '../components/Router';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/i18n';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let rafId: number;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const newX = (e.clientX / window.innerWidth - 0.5) * 20;
        const newY = (e.clientY / window.innerHeight - 0.5) * 20;
        
        // Sadece önemli değişikliklerde güncelle
        if (Math.abs(newX - lastX) > 0.5 || Math.abs(newY - lastY) > 0.5) {
          setMousePosition({ x: newX, y: newY });
          lastX = newX;
          lastY = newY;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <style>{`
        @keyframes nebulaFlow {
          0%, 100% { 
            transform: translateY(0) scale(1); 
            opacity: 0.2; 
          }
          50% { 
            transform: translateY(-20px) scale(1.08); 
            opacity: 0.3; 
          }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Mevcut blur yıldızları - korunuyor */}
        <div 
          className="absolute top-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
          style={{
            transform: `translate3d(${mousePosition.x * 0.08}px, ${mousePosition.y * 0.08}px, 0)`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform'
          }}
        ></div>
        <div 
          className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl"
          style={{
            transform: `translate3d(${mousePosition.x * 0.12}px, ${mousePosition.y * 0.12}px, 0)`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform'
          }}
        ></div>

        {/* Nebula efektleri - Subtle */}
        <div 
          className="absolute top-[20%] right-[12%] w-[400px] h-[400px] md:w-[550px] md:h-[550px] opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(99, 102, 241, 0.2) 40%, transparent 100%)',
            filter: 'blur(70px)',
            transform: `translate3d(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px, 0)`,
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
            borderRadius: '50%'
          }}
        />

        {/* Enhanced Dreamy Cosmic Elements - Pastel Nebula Flows */}

        {/* Lavanta Nebula Flow - Sağ taraftan yukarı - Enhanced */}
        <svg 
          className="absolute top-[10%] right-[8%] w-[450px] h-[650px] md:w-[650px] md:h-[850px] opacity-20"
          viewBox="0 0 450 650"
          style={{
            transform: `translate3d(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px, 0)`,
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
            filter: 'blur(45px)',
            animation: 'nebulaFlow 14s ease-in-out infinite',
            animationDelay: '1.5s'
          }}
        >
          <defs>
            <linearGradient id="lavenderNebulaGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(167, 139, 250, 0.4)" />
              <stop offset="25%" stopColor="rgba(192, 132, 252, 0.32)" />
              <stop offset="50%" stopColor="rgba(196, 181, 253, 0.28)" />
              <stop offset="75%" stopColor="rgba(167, 139, 250, 0.2)" />
              <stop offset="100%" stopColor="rgba(192, 132, 252, 0.1)" />
            </linearGradient>
          </defs>
          <path
            d="M 400,600 Q 350,500 300,450 Q 250,400 200,350 Q 150,300 100,250 Q 50,200 0,150"
            stroke="url(#lavenderNebulaGrad)"
            strokeWidth="120"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 350,600 Q 300,500 250,450 Q 200,400 150,350 Q 100,300 50,250"
            stroke="url(#lavenderNebulaGrad)"
            strokeWidth="100"
            fill="none"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M 375,600 Q 325,500 275,450 Q 225,400 175,350 Q 125,300 75,250 Q 25,200 0,180"
            stroke="url(#lavenderNebulaGrad)"
            strokeWidth="85"
            fill="none"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>







      </div>

      <div className="relative pt-24 md:pt-32 pb-16 md:pb-20 px-4 md:px-6 z-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="mb-6 md:mb-8 inline-block animate-fade-in">
            <h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2"
              style={{
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
            >
              {t.home.title}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-200 font-light tracking-wide px-2">
              {t.home.subtitle}
            </p>
          </div>

          <p className="text-base md:text-lg text-slate-300 max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed px-4">
            {t.home.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button
              onClick={() => navigate(user ? '/analyze' : '/signin')}
              className="group px-8 md:px-10 py-4 md:py-5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold text-base md:text-lg hover:from-pink-500 hover:to-purple-500 transition-all duration-300 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-95"
              style={{
                transform: `translate3d(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px, 0)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
              }}
              aria-label={user ? t.home.cta : t.home.getStarted}
            >
              {user ? t.home.cta : t.home.getStarted}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <button
              onClick={() => navigate('/about')}
              className="px-8 md:px-10 py-4 md:py-5 rounded-lg bg-slate-900/50 backdrop-blur-sm border border-purple-500/30 text-slate-200 font-semibold text-base md:text-lg hover:border-purple-500/50 hover:text-white hover:bg-slate-800/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-95"
              style={{
                transform: `translate3d(${mousePosition.x * 0.05}px, ${mousePosition.y * 0.05}px, 0)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform'
              }}
              aria-label={t.home.learnMore}
            >
              {t.home.learnMore}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mt-12 md:mt-24 max-w-7xl mx-auto">
            {/* Deep Analysis */}
            <div 
              onClick={() => navigate('/analyze')}
              className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 hover:shadow-xl hover:shadow-pink-500/25 transition-all duration-500 relative overflow-hidden hover:-translate-y-2 focus-within:ring-2 focus-within:ring-pink-500/50 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 cursor-pointer"
              style={{
                transform: `translate3d(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px, 0)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
                boxShadow: '0 0 0 0.5px rgba(236, 72, 153, 0.12), inset 0 0 0 0.5px rgba(236, 72, 153, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 20px rgba(236, 72, 153, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(236, 72, 153, 0.25), inset 0 0 0 0.5px rgba(236, 72, 153, 0.12), 0 4px 12px rgba(236, 72, 153, 0.15), 0 0 30px rgba(236, 72, 153, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(236, 72, 153, 0.12), inset 0 0 0 0.5px rgba(236, 72, 153, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 20px rgba(236, 72, 153, 0.08)';
              }}
              tabIndex={0}
              role="article"
              aria-label={t.home.feature1Title}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500/30 to-pink-600/20 flex items-center justify-center border-2 border-pink-500/40 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-pink-500/40 group-hover:border-pink-400/60">
                  <Brain className="w-8 h-8 text-pink-400 group-hover:text-pink-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-pink-100 transition-colors">{t.home.feature1Title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4 group-hover:text-slate-200 transition-colors">
                  {t.home.feature1Desc}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {t.home.feature1Details.split(' • ').map((detail, index) => (
                    <div key={index} className="px-3 py-2 bg-pink-500/20 text-pink-300 text-xs font-medium rounded-md border border-pink-500/30 group-hover:bg-pink-500/30 group-hover:border-pink-400/50 transition-all text-center h-[2.25rem] flex items-center justify-center">
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
            <div 
              onClick={() => navigate('/analyze')}
              className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/25 transition-all duration-500 relative overflow-hidden hover:-translate-y-2 focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 cursor-pointer"
              style={{
                transform: `translate3d(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px, 0)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
                boxShadow: '0 0 0 0.5px rgba(167, 139, 250, 0.12), inset 0 0 0 0.5px rgba(167, 139, 250, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 20px rgba(167, 139, 250, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(167, 139, 250, 0.25), inset 0 0 0 0.5px rgba(167, 139, 250, 0.12), 0 4px 12px rgba(167, 139, 250, 0.15), 0 0 30px rgba(167, 139, 250, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(167, 139, 250, 0.12), inset 0 0 0 0.5px rgba(167, 139, 250, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 20px rgba(167, 139, 250, 0.08)';
              }}
              tabIndex={0}
              role="article"
              aria-label={t.home.feature2Title}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center border-2 border-purple-500/40 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-purple-500/40 group-hover:border-purple-400/60">
                  <ImageIcon className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-100 transition-colors">{t.home.feature2Title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-6 group-hover:text-slate-200 transition-colors">
                  {t.home.feature2Desc}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {t.home.feature2Details.split(' • ').map((detail, index) => (
                    <div key={index} className="px-3 py-2 bg-purple-500/20 text-purple-300 text-xs font-medium rounded-md border border-purple-500/30 group-hover:bg-purple-500/30 group-hover:border-purple-400/50 transition-all text-center h-[2.25rem] flex items-center justify-center">
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
            <div 
              onClick={() => navigate(user ? '/library' : '/signin')}
              className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-500 relative overflow-hidden hover:-translate-y-2 focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 cursor-pointer"
              style={{
                transform: `translate3d(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px, 0)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
                boxShadow: '0 0 0 0.5px rgba(6, 182, 212, 0.12), inset 0 0 0 0.5px rgba(6, 182, 212, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(6, 182, 212, 0.25), inset 0 0 0 0.5px rgba(6, 182, 212, 0.12), 0 4px 12px rgba(6, 182, 212, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(6, 182, 212, 0.12), inset 0 0 0 0.5px rgba(6, 182, 212, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1)';
              }}
              tabIndex={0}
              role="article"
              aria-label={t.home.feature3Title}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 flex items-center justify-center border-2 border-cyan-500/40 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-cyan-500/40 group-hover:border-cyan-400/60">
                  <BookOpen className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-100 transition-colors">{t.home.feature3Title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-5 group-hover:text-slate-200 transition-colors">
                  {t.home.feature3Desc}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {t.home.feature3Details.split(' • ').map((detail, index) => (
                    <div key={index} className="px-3 py-2 bg-cyan-500/20 text-cyan-300 text-xs font-medium rounded-md border border-cyan-500/30 group-hover:bg-cyan-500/30 group-hover:border-cyan-400/50 transition-all text-center h-[2.25rem] flex items-center justify-center">
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

            {/* Social Community */}
            <div 
              onClick={() => navigate(user ? '/social' : '/signin')}
              className="group bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 hover:shadow-xl hover:shadow-green-500/25 transition-all duration-500 relative overflow-hidden hover:-translate-y-2 focus-within:ring-2 focus-within:ring-green-500/50 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 cursor-pointer"
              style={{
                transform: `translate3d(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px, 0)`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
                boxShadow: '0 0 0 0.5px rgba(34, 197, 94, 0.12), inset 0 0 0 0.5px rgba(34, 197, 94, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 20px rgba(34, 197, 94, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(34, 197, 94, 0.25), inset 0 0 0 0.5px rgba(34, 197, 94, 0.12), 0 4px 12px rgba(34, 197, 94, 0.15), 0 0 30px rgba(34, 197, 94, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 0.5px rgba(34, 197, 94, 0.12), inset 0 0 0 0.5px rgba(34, 197, 94, 0.06), 0 1px 2px rgba(0, 0, 0, 0.1), 0 0 20px rgba(34, 197, 94, 0.08)';
              }}
              tabIndex={0}
              role="article"
              aria-label={t.home.feature4Title}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/30 to-green-600/20 flex items-center justify-center border-2 border-green-500/40 transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-green-500/40 group-hover:border-green-400/60">
                  <Users className="w-8 h-8 text-green-400 group-hover:text-green-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-100 transition-colors">{t.home.feature4Title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed mb-4 group-hover:text-slate-200 transition-colors">
                  {t.home.feature4Desc}
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {t.home.feature4Details.split(' • ').map((detail, index) => (
                    <div key={index} className="px-3 py-2 bg-green-500/20 text-green-300 text-xs font-medium rounded-md border border-green-500/30 group-hover:bg-green-500/30 group-hover:border-green-400/50 transition-all text-center h-[2.25rem] flex items-center justify-center">
                      {detail}
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <Users className="w-4 h-4 text-green-400" />
                  <Sparkles className="w-4 h-4 text-green-400" />
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
