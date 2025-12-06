import { useState, useEffect } from 'react';
import { Sparkles, Loader2, BookOpen, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';

export default function Analyze() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
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

  async function sendDreamToN8N(dreamText: string, userId: string, language: 'tr' | 'en' = 'tr') {
    try {
      // Get user's subscription info to determine visualization count
      let planType = 'trial';
      let visualizationsPerAnalysis = 1;
      
      try {
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('plan_type, visualizations_per_analysis')
          .eq('user_id', userId)
          .single();
        
        if (!subError && subscription) {
          planType = subscription.plan_type || 'trial';
          visualizationsPerAnalysis = subscription.visualizations_per_analysis || 1;
        }
      } catch (subError) {
        console.warn('Could not fetch subscription info, using defaults:', subError);
      }

      const res = await fetch("https://borablt.app.n8n.cloud/webhook/dream-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          dream_text: dreamText,
          plan_type: planType,
          visualizations_per_analysis: visualizationsPerAnalysis,
          language: language
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
      // Check if user can submit analysis (trial expired check)
      const { data: canSubmit, error: checkError } = await supabase.rpc('can_user_submit_analysis', {
        p_user_id: user.id
      });

      if (checkError) {
        console.error('Error checking analysis permission:', checkError);
        // Continue anyway, but log the error
      } else if (canSubmit === false) {
        setError('Trial süreniz dolmuş. Analiz yapmak için lütfen standart veya premium paket satın alın.');
        showToast('Trial süreniz dolmuş. Paket satın almak için Pricing sayfasına gidin.', 'error');
        setIsSubmitting(false);
        return;
      }

      // Check trial analysis limit (for trial users)
      const { data: trialLimitOk, error: trialLimitError } = await supabase.rpc('check_trial_analysis_limit', {
        p_user_id: user.id
      });

      if (trialLimitError) {
        console.error('Error checking trial limit:', trialLimitError);
      } else if (trialLimitOk === false) {
        setError('Trial analiz hakkınız dolmuş. Daha fazla analiz için lütfen standart veya premium paket satın alın.');
        showToast('Trial analiz hakkınız dolmuş. Paket satın almak için Pricing sayfasına gidin.', 'error');
        setIsSubmitting(false);
        return;
      }

      // First, save to database with multilingual support
      const insertData: any = {
        user_id: user.id,
        dream_text: dreamText, // Keep for backward compatibility
        status: 'pending',
        is_public: isPublic,
      };
      
      // Add language-specific columns
      if (language === 'tr') {
        insertData.dream_text_tr = dreamText;
      } else {
        insertData.dream_text_en = dreamText;
      }

      const { data: dreamData, error: insertError } = await supabase
        .from('dreams')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        // If is_public column doesn't exist, try without it
        if (insertError.message?.includes('is_public') || insertError.code === '42703' || insertError.code === 'PGRST116') {
          console.warn('is_public column not found, saving without it. Please run migration.');
          const { data: retryData, error: retryError } = await supabase
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

      // Increment trial analyses used (if trial user)
      try {
        await supabase.rpc('increment_trial_analyses_used', {
          p_user_id: user.id
        });
      } catch (trialIncrementError) {
        // Log error but don't fail the submission
        console.error("Failed to increment trial analyses:", trialIncrementError);
      }

      // Then send to N8N webhook with language info
      try {
        await sendDreamToN8N(dreamText, user.id, language);
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
                  onClick={() => navigate('/pricing')}
                  className="px-2 md:px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full shadow-lg animate-pulse hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 cursor-pointer"
                  title="Satın Al sayfasına git"
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
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center border border-pink-500/30">
                    <Sparkles className="text-pink-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {t.analyze.processingTitle}
                    </h3>
                    <p className="text-sm md:text-base text-pink-300 leading-relaxed">
                      {t.analyze.pendingMessage}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-start">
                  <button
                    onClick={() => navigate('/library')}
                    className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30 hover:scale-105"
                  >
                    <BookOpen size={18} />
                    <span>{t.analyze.goToLibrary}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setAnalysis(null);
                      setImageUrl(null);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500/90 hover:to-pink-500/90 text-white border border-purple-500/30 hover:border-purple-400/50 rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105"
                  >
                    <Sparkles size={18} />
                    <span>{t.analyze.analyzeAnother}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
