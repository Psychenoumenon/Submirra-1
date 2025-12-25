import { Globe } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5">
      <Globe size={14} className="text-slate-500" />
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-all duration-200 ${
          language === 'en'
            ? 'bg-pink-600 text-white'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('tr')}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-all duration-200 ${
          language === 'tr'
            ? 'bg-pink-600 text-white'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        TR
      </button>
    </div>
  );
}
