import { useNavigate } from './Router';
import { useLanguage } from '../lib/i18n';
import { Capacitor } from '@capacitor/core';
import { Lock } from 'lucide-react';

export default function Footer() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <footer className="relative border-t border-purple-500/20 bg-slate-950/50 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1.5rem, env(safe-area-inset-right))' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="hidden md:flex items-center gap-6 text-sm">
            {/* Play Store Button - Only show on web, hidden in native app */}
            {!isNativeApp && (
              <div className="relative group cursor-not-allowed">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-600/30 rounded-lg opacity-60">
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
                  </svg>
                  <span className="text-slate-400 text-xs font-medium">Google Play</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/80 rounded text-[10px] text-slate-300">
                    <Lock size={10} />
                    <span>{language === 'tr' ? 'Yakında' : 'Soon'}</span>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => navigate('/terms')}
              className="text-slate-400 hover:text-purple-400 transition-colors"
            >
              {t.footer.termsOfService}
            </button>
            <button
              onClick={() => navigate('/privacy')}
              className="text-slate-400 hover:text-purple-400 transition-colors"
            >
              {t.footer.privacyPolicy}
            </button>
            <button
              onClick={() => navigate('/feedback')}
              className="text-slate-400 hover:text-purple-400 transition-colors"
            >
              {t.footer.feedback}
            </button>
          </div>
          <div className="hidden sm:block text-slate-500 text-xs">
            © {new Date().getFullYear()} Submirra. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}


