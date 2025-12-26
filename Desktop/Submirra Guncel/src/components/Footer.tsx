import { useNavigate } from './Router';
import { useLanguage } from '../lib/i18n';

export default function Footer() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <footer className="relative border-t border-purple-500/20 bg-slate-950/50 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1.5rem, env(safe-area-inset-right))' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="hidden md:flex items-center gap-6 text-sm">
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


