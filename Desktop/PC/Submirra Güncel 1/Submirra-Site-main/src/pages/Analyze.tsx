import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';

export default function Analyze() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [dreamText, setDreamText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  async function sendDreamToN8N(dreamText: string, userId: string) {
    try {
      const res = await fetch("https://borablt.app.n8n.cloud/webhook/dream-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          dream_text: dreamText
        })
      });

      const data = await res.json();
      console.log("N8N response:", data);
      return data;
    } catch (error) {
      console.error("N8N webhook error:", error);
      throw error;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dreamText.trim() || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // First, save to database
      const insertData: any = {
        user_id: user.id,
        dream_text: dreamText,
        status: 'pending',
        is_public: isPublic,
      };

      const { error: insertError } = await supabase
        .from('dreams')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        // If is_public column doesn't exist, try without it
        if (insertError.message?.includes('is_public') || insertError.code === '42703' || insertError.code === 'PGRST116') {
          console.warn('is_public column not found, saving without it. Please run migration.');
          const { error: retryError } = await supabase
            .from('dreams')
            .insert({
              user_id: user.id,
              dream_text: dreamText,
              status: 'pending',
            })
            .select()
            .single();
          
          if (retryError) throw retryError;
        } else {
          throw insertError;
        }
      }

      // Then send to N8N webhook
      try {
        await sendDreamToN8N(dreamText, user.id);
      } catch (n8nError) {
        // Log error but don't fail the submission
        console.error("Failed to send to N8N:", n8nError);
      }

      setAnalysis(t.analyze.savedMessage);
      // Black placeholder image (1x1 black pixel as data URL)
      setImageUrl('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwMDAwMDAiLz48L3N2Zz4=');

      setDreamText('');
      showToast('Dream saved successfully! Analysis will be ready soon.', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save dream';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = dreamText.length;
  const maxCharacters = 5000;

  if (!user) return null;

  return (
    <div className="min-h-screen relative pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-6xl mx-auto z-10">
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
            {t.analyze.title}
          </h1>
          <p className="text-slate-400 text-base md:text-lg px-2">
            {t.analyze.subtitle}
          </p>
        </div>

        {!analysis ? (
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto animate-fade-in-delay">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-5 md:p-8 relative hover:border-pink-500/30 transition-all duration-300 shadow-xl shadow-pink-500/5">
              <div className="absolute -top-3 right-4 md:right-6">
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className="px-2 md:px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full shadow-lg animate-pulse hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/50 cursor-pointer"
                >
                  {t.analyze.trialBadge}
                </button>
              </div>

              <div className="mb-5 md:mb-6">
                <label className="block text-white font-semibold mb-2 md:mb-3 text-sm md:text-base">
                  {t.analyze.privacyLabel}
                </label>
                <div className="grid grid-cols-2 gap-4 mb-5 md:mb-6">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                      isPublic
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-purple-500/30 bg-slate-950/30 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isPublic ? 'border-pink-400 bg-pink-400' : 'border-slate-400'
                      }`}>
                        {isPublic && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <span className={`font-semibold ${isPublic ? 'text-pink-400' : 'text-slate-300'}`}>
                        {t.analyze.privacyPublic}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t.analyze.privacyPublicDesc}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                      !isPublic
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-purple-500/30 bg-slate-950/30 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        !isPublic ? 'border-pink-400 bg-pink-400' : 'border-slate-400'
                      }`}>
                        {!isPublic && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <span className={`font-semibold ${!isPublic ? 'text-pink-400' : 'text-slate-300'}`}>
                        {t.analyze.privacyPrivate}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t.analyze.privacyPrivateDesc}</p>
                  </button>
                </div>
              </div>

              <div className="mb-5 md:mb-6">
                <label className="block text-white font-semibold mb-2 md:mb-3 text-sm md:text-base">
                  {t.analyze.label}
                </label>
                <textarea
                  value={dreamText}
                  onChange={(e) => setDreamText(e.target.value.slice(0, maxCharacters))}
                  placeholder={t.analyze.placeholder}
                  className="w-full h-48 md:h-64 px-3 md:px-4 py-2 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none text-sm md:text-base"
                  maxLength={maxCharacters}
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs md:text-sm ${characterCount > maxCharacters * 0.9 ? 'text-pink-400' : 'text-slate-500'}`}>
                    {characterCount} / {maxCharacters} {t.analyze.characters}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-5 md:mb-6 p-3 md:p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm md:text-base">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !dreamText.trim()}
                className="w-full px-5 md:px-6 py-3 md:py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {t.analyze.saving}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    {t.analyze.submit}
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => {
                  setAnalysis(null);
                  setImageUrl(null);
                }}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 text-pink-300 hover:border-pink-400/50 hover:text-pink-200 hover:bg-gradient-to-r hover:from-pink-600/30 hover:to-purple-600/30 transition-all duration-200 text-sm md:text-base"
              >
                {t.analyze.analyzeAnother}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-5 md:p-8 hover:border-purple-500/30 transition-all duration-300 shadow-xl shadow-purple-500/5">
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-3 md:mb-4">
                {t.analyze.analysisTitle}
              </h2>
                <div className="bg-slate-950/30 rounded-lg p-4">
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {analysis}
                  </p>
                </div>
              </div>

              {imageUrl && (
                <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-5 md:p-8 hover:border-cyan-500/30 transition-all duration-300 shadow-xl shadow-cyan-500/5">
                  <h2 className="text-xl md:text-2xl font-semibold text-white mb-3 md:mb-4">
                    {t.analyze.visualizationTitle}
                  </h2>
                  <div className="w-full aspect-video bg-black rounded-xl shadow-2xl shadow-cyan-500/20 flex items-center justify-center overflow-hidden group">
                    <img
                      src={imageUrl}
                      alt="Dream visualization"
                      className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
