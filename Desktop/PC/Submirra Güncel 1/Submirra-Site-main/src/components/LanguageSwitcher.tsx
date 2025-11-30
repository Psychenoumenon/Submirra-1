import { Globe } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/50 border border-purple-500/20">
      <Globe size={16} className="text-slate-400" />
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
          language === 'en'
            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
            : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('tr')}
        className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
          language === 'tr'
            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
            : 'text-slate-400 hover:text-slate-300'
        }`}
      >
        TR
      </button>
    </div>
  );
}
