import { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, BookOpen, ArrowRight, Lock, Video, Mic, MicOff } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';
import { isDeveloperSync } from '../lib/developer';

export default function Analyze() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [dreamText, setDreamText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [textAnalysisType, setTextAnalysisType] = useState<'basic' | 'advanced' | null>('basic');
  const [isVisualSelected, setIsVisualSelected] = useState(false);
  const [lastAnalysisType, setLastAnalysisType] = useState<'basic' | 'advanced' | 'basic_visual' | 'advanced_visual' | null>(null);
  
  // Calculate final analysis type for backend
  const analysisType: 'basic' | 'advanced' | 'basic_visual' | 'advanced_visual' = (() => {
    if (isVisualSelected) {
      if (textAnalysisType === 'advanced') {
        return 'advanced_visual';
      } else {
        return 'basic_visual';
      }
    } else {
      return (textAnalysisType || 'basic') as 'basic' | 'advanced';
    }
  })();
  const [remainingAnalyses, setRemainingAnalyses] = useState<{ used: number; limit: number } | null>(null);
  const [planType, setPlanType] = useState<'free' | 'trial' | 'standard' | 'premium' | null>(null);
  const [visualAnalysesUsed, setVisualAnalysesUsed] = useState<{ used: number; limit: number } | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (loading) return;
    
    if (!user) {
      navigate('/signin');
    } else {
      loadRemainingAnalyses();
    }
  }, [user, loading, navigate]);

  const loadRemainingAnalyses = async () => {
    if (!user) return;

    try {
      // Check if user is developer (developers have unlimited analysis)
      const isDev = isDeveloperSync(user.id);
      setIsDeveloper(isDev);
      
      if (isDev) {
        // Developers have unlimited analysis - show infinity symbol
        setRemainingAnalyses({ used: 0, limit: Infinity });
        setPlanType('premium');
        return;
      }

      // Get user's subscription info and profile info
      const [subscriptionResult, profileResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('plan_type, trial_end_date')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('profiles')
          .select('trial_used')
          .eq('id', user.id)
          .single()
      ]);

      const { data: subscription, error: subError } = subscriptionResult;
      const { data: profile } = profileResult;
      
      // Set trial used status
      if (profile && profile.trial_used !== undefined) {
        setTrialUsed(profile.trial_used);
      }

      if (!subError && subscription) {
        const userPlanType = subscription.plan_type as 'free' | 'trial' | 'standard' | 'premium' | null;
        setPlanType(userPlanType);
        
        // Check if trial has expired
        if (userPlanType === 'free' || userPlanType === 'trial') {
          if (subscription.trial_end_date) {
            const trialEnd = new Date(subscription.trial_end_date);
            const now = new Date();
            if (trialEnd < now) {
              setTrialExpired(true);
              // If trial expired and user is on free plan, they can't use advanced/visual
              if (userPlanType === 'free') {
                // Already on free plan after trial expiration
              }
            } else {
              setTrialExpired(false);
            }
          }
        } else {
          setTrialExpired(false);
        }

        // Load visual analysis limit for trial, standard and premium users
        if (userPlanType === 'trial' || userPlanType === 'standard' || userPlanType === 'premium') {
          try {
            const { data: visualLimitData, error: visualLimitError } = await supabase.rpc('check_visual_analysis_limit', {
              p_user_id: user.id
            });

            if (!visualLimitError && visualLimitData) {
              setVisualAnalysesUsed({ 
                used: visualLimitData.used || 0, 
                limit: visualLimitData.limit || 7 
              });
            }
          } catch (error) {
            console.error('Error loading visual analysis limit:', error);
            // Set default limits based on plan type
            const limit = userPlanType === 'trial' ? 7 : userPlanType === 'premium' ? 5 : 3;
            setVisualAnalysesUsed({ used: 0, limit });
          }
        } else {
          // Clear visual analyses used for free plan and null plan users
          setVisualAnalysesUsed(null);
        }
      }

      // Use the check_daily_analysis_limit function to get accurate data
      const { data: limitData, error: limitError } = await supabase.rpc('check_daily_analysis_limit', {
        p_user_id: user.id
      });

      if (limitError) {
        console.error('Error loading remaining analyses:', limitError);
        setRemainingAnalyses({ used: 0, limit: 5 });
        return;
      }

      if (limitData) {
        setRemainingAnalyses({ 
          used: limitData.used || 0, 
          limit: limitData.limit || 5 
        });
      } else {
        setRemainingAnalyses({ used: 0, limit: 5 });
      }
    } catch (error) {
      console.error('Error loading remaining analyses:', error);
      setRemainingAnalyses({ used: 0, limit: 5 });
    }
  };

  async function sendDreamToN8N(dreamText: string, userId: string, language: 'tr' | 'en' = 'tr', analysisType: 'basic' | 'advanced' | 'basic_visual' | 'advanced_visual' = 'basic') {
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
          // For standard plan users, if visual analysis is selected, use 1 visualization per analysis
          // For premium plan users, if visual analysis is selected, use 3 visualizations per analysis
          if (subscription.plan_type === 'standard' && (analysisType === 'basic_visual' || analysisType === 'advanced_visual')) {
            visualizationsPerAnalysis = 1;
          } else if (subscription.plan_type === 'premium' && (analysisType === 'basic_visual' || analysisType === 'advanced_visual')) {
            visualizationsPerAnalysis = 3;
          } else {
            visualizationsPerAnalysis = subscription.visualizations_per_analysis || 1;
          }
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
          language: language,
          analysis_type: analysisType
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

    // CRITICAL: Block users without any plan from analyzing
    if (!isDeveloper && planType === null) {
      setError('Analiz yapmak için lütfen bir plan satın alın.');
      showToast('Analiz yapmak için lütfen bir plan satın alın. Pricing sayfasına gidin.', 'error');
      navigate('/pricing');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // TEMPORARILY DISABLED: Check if user has any pending or processing dreams
      // This check is disabled for testing purposes
      /*
      const { data: pendingDreams, error: pendingError } = await supabase
        .from('dreams')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing']);

      if (pendingError) {
        console.error('Error checking pending dreams:', pendingError);
      } else if (pendingDreams && pendingDreams.length > 0) {
        const errorMessage = language === 'tr' 
          ? 'Lütfen önce mevcut rüya analizinizin tamamlanmasını bekleyin. Analiz tamamlandıktan sonra yeni bir rüya analiz edebilirsiniz.'
          : 'Please wait for your current dream analysis to complete first. You can analyze a new dream after the current analysis is finished.';
        setError(errorMessage);
        showToast(errorMessage, 'error');
        setIsSubmitting(false);
        return;
      }
      */

      // Check if user is developer first (developers have unlimited analysis)
      const isDevSync = isDeveloperSync(user.id);
      let isDev = isDevSync;
      
      // Also verify with RPC if sync check says not developer
      if (!isDevSync) {
        try {
          const { data: isDevRpc, error: rpcError } = await supabase.rpc('is_developer', {
            p_user_id: user.id
          });
          if (!rpcError && isDevRpc === true) {
            isDev = true;
          }
        } catch (error) {
          console.log('Error checking developer status with RPC, using sync check:', error);
        }
      }

      // Skip all permission and limit checks if user is developer
      if (!isDev) {
        // Check library storage limit before allowing new dreams
        const { count: dreamCount, error: countError } = await supabase
          .from('dreams')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (countError) {
          console.error('Error counting dreams:', countError);
        } else {
          // Define storage limits per plan
          const storageLimits: Record<string, number> = {
            'free': 10,
            'trial': 10, // Trial uses same limit as free
            'standard': 30,
            'premium': 60,
            'ruyagezer': 999999 // Unlimited for ruyagezer
          };
          
          const currentLimit = storageLimits[planType || 'free'] || 10;
          
          if ((dreamCount || 0) >= currentLimit) {
            const errorMsg = language === 'tr'
              ? `Kütüphane limitiniz doldu (${currentLimit} rüya). Yeni rüya eklemek için eski rüyalarınızı silin veya daha yüksek bir plana geçin.`
              : `Your library storage limit is full (${currentLimit} dreams). Delete old dreams or upgrade to a higher plan to add new ones.`;
            setError(errorMsg);
            showToast(errorMsg, 'error');
            setIsSubmitting(false);
            return;
          }
        }

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
        // Check analysis limits based on analysis type
        if (analysisType === 'advanced' || analysisType === 'advanced_visual') {
          // Check advanced analysis limit (unlimited for trial/standard/premium, but trial expires after 7 days)
          const { data: advancedLimitData, error: advancedLimitError } = await supabase.rpc('check_advanced_analysis_limit', {
            p_user_id: user.id
          });

          if (advancedLimitError) {
            console.error('Error checking advanced analysis limit:', advancedLimitError);
          } else if (advancedLimitData && !advancedLimitData.can_analyze) {
            // Check if trial expired
            if (advancedLimitData.trial_expired) {
              setError('Trial süreniz dolmuş. Analiz yapmak için lütfen standart veya premium paket satın alın.');
              showToast('Trial süreniz dolmuş. Paket satın almak için Pricing sayfasına gidin.', 'error');
            } else {
              setError('Bu analiz tipi için standart plan veya üzeri gereklidir.');
              showToast('Bu analiz tipi için standart plan veya üzeri gereklidir.', 'error');
            }
            setIsSubmitting(false);
            return;
          }
        } else if (analysisType === 'basic_visual' || analysisType === 'advanced_visual') {
          // Check visual analysis limit
          const { data: visualLimitData, error: visualLimitError } = await supabase.rpc('check_visual_analysis_limit', {
            p_user_id: user.id
          });

          if (visualLimitError) {
            console.error('Error checking visual analysis limit:', visualLimitError);
          } else if (visualLimitData && !visualLimitData.can_analyze) {
            // Check if trial expired
            if (visualLimitData.trial_expired) {
              setError('Trial süreniz dolmuş. Analiz yapmak için lütfen standart veya premium paket satın alın.');
              showToast('Trial süreniz dolmuş. Paket satın almak için Pricing sayfasına gidin.', 'error');
            } else {
              const limitText = planType === 'trial' 
                ? `7/7 (${language === 'tr' ? 'toplam' : 'total'})`
                : planType === 'premium' 
                  ? '5/5' 
                  : '3/3';
              const errorMsg = planType === 'trial'
                ? `Trial görselli analiz hakkınız doldu (${limitText}).`
                : `Günlük görselli analiz limitiniz doldu (${limitText}). Yarın tekrar deneyin.`;
              setError(errorMsg);
              showToast(errorMsg, 'error');
            }
            setIsSubmitting(false);
            return;
          }
        }

        // For free plan users, block advanced and visual analysis (trial users can use them)
        if (planType === 'free' && (analysisType === 'advanced' || analysisType === 'basic_visual' || analysisType === 'advanced_visual')) {
          setError('Bu analiz tipi için standart plan veya üzeri gereklidir.');
          showToast('Bu analiz tipi için standart plan veya üzeri gereklidir.', 'error');
          setIsSubmitting(false);
          return;
        }
        // For expired trial users, block advanced and visual analysis
        if (planType === 'trial' && trialExpired && (analysisType === 'advanced' || analysisType === 'basic_visual' || analysisType === 'advanced_visual')) {
          setError('Trial süreniz dolmuş. Bu analiz tipi için standart plan veya üzeri gereklidir.');
          showToast('Trial süreniz dolmuş. Bu analiz tipi için standart plan veya üzeri gereklidir.', 'error');
          setIsSubmitting(false);
          return;
        }
      }

      // First, save to database with multilingual support
      const insertData: any = {
        user_id: user.id,
        dream_text: dreamText, // Keep for backward compatibility
        status: 'pending',
        is_public: isPublic,
        analysis_type: analysisType, // Add analysis type
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
        // Log the full error for debugging
        console.error('Dream insert error:', insertError);
        console.error('Insert data:', insertData);
        
        // If is_public column doesn't exist, try without it
        if (insertError.message?.includes('is_public') || insertError.code === '42703' || insertError.code === 'PGRST116') {
          console.warn('is_public column not found, saving without it. Please run migration.');
          const { data: retryData, error: retryError } = await supabase
            .from('dreams')
            .insert({
              user_id: user.id,
              dream_text: dreamText,
              status: 'pending',
              analysis_type: analysisType,
              ...(language === 'tr' ? { dream_text_tr: dreamText } : { dream_text_en: dreamText }),
            })
            .select()
            .single();
          
          if (retryError) {
            console.error('Retry insert error:', retryError);
            throw retryError;
          }
        } else if (insertError.message?.includes('analysis_type') || insertError.message?.includes('check constraint')) {
          // If analysis_type constraint fails, try with 'basic' as fallback
          console.warn('analysis_type constraint failed, trying with basic. Please run migration.');
          const { data: retryData, error: retryError } = await supabase
            .from('dreams')
            .insert({
              user_id: user.id,
              dream_text: dreamText,
              status: 'pending',
              is_public: isPublic,
              analysis_type: 'basic',
              ...(language === 'tr' ? { dream_text_tr: dreamText } : { dream_text_en: dreamText }),
            })
            .select()
            .single();
          
          if (retryError) {
            console.error('Retry insert error:', retryError);
            throw retryError;
          }
        } else {
          throw insertError;
        }
      }

      // Only increment counters if user is not a developer (isDev already checked above)
      if (!isDev) {
        // Increment visual analysis count if visual analysis is selected
        if (analysisType === 'basic_visual' || analysisType === 'advanced_visual') {
          try {
            await supabase.rpc('increment_visual_analysis', {
              p_user_id: user.id
            });
          } catch (visualIncrementError) {
            // Log error but don't fail the submission
            console.error("Failed to increment visual analysis:", visualIncrementError);
          }
        }
        // Note: Advanced and basic analyses are unlimited, so no increment needed
      }

      // Then send to N8N webhook with language info
      try {
        await sendDreamToN8N(dreamText, user.id, language, analysisType);
      } catch (n8nError) {
        // Log error but don't fail the submission
        console.error("Failed to send to N8N:", n8nError);
      }

      setAnalysis(t.analyze.savedMessage);
      // Black placeholder image (1x1 black pixel as data URL)
      setImageUrl('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwMDAwMDAiLz48L3N2Zz4=');

      // Save analysis type for navigation
      setLastAnalysisType(analysisType);

      setDreamText('');
      showToast('Dream saved successfully! Analysis will be ready soon.', 'success');
      
      // Reload remaining analyses after successful submission
      await loadRemainingAnalyses();
      
      // Reload visual analysis limit after submission (for trial, standard, premium users)
      if ((analysisType === 'basic_visual' || analysisType === 'advanced_visual') && (planType === 'trial' || planType === 'standard' || planType === 'premium')) {
        try {
          const { data: visualLimitData, error: visualLimitError } = await supabase.rpc('check_visual_analysis_limit', {
            p_user_id: user.id
          });

          if (!visualLimitError && visualLimitData) {
            setVisualAnalysesUsed({ 
              used: visualLimitData.used || 0, 
              limit: visualLimitData.limit || 7 
            });
          }
        } catch (error) {
          console.error('Error reloading visual analysis limit:', error);
        }
      }
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

  // Voice recording with Whisper API
  const toggleRecording = async () => {
    // If already recording, stop and transcribe
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    // Request microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio recorded, size:', audioBlob.size);
        
        if (audioBlob.size < 1000) {
          showToast(language === 'tr' ? 'Ses kaydı çok kısa' : 'Recording too short', 'error');
          return;
        }

        // Send to Whisper API
        setIsTranscribing(true);
        showToast(language === 'tr' ? 'Ses metne çevriliyor...' : 'Transcribing...', 'info');

        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', language);

          const response = await fetch('https://soewlqmskqmpycaevhoc.supabase.co/functions/v1/whisper-transcribe', {
            method: 'POST',
            body: formData,
          });

          const result = await response.json();
          
          if (result.error) {
            throw new Error(result.error);
          }

          if (result.text) {
            setDreamText(prev => {
              const newText = prev ? prev + ' ' + result.text : result.text;
              return newText.trim().slice(0, maxCharacters);
            });
            showToast(language === 'tr' ? 'Ses metne çevrildi!' : 'Transcription complete!', 'success');
          }
        } catch (error) {
          console.error('Transcription error:', error);
          showToast(language === 'tr' ? 'Ses çevrilemedi' : 'Transcription failed', 'error');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      showToast(language === 'tr' ? 'Kayıt başladı... Bitince tekrar tıklayın' : 'Recording... Click again when done', 'info');
      
    } catch (error) {
      console.error('Microphone access error:', error);
      showToast(language === 'tr' ? 'Mikrofon erişimi reddedildi' : 'Microphone access denied', 'error');
    }
  };

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
              {/* Show free trial button only if user hasn't used trial OR not on standard/premium plans, and NOT developer */}
              {!isDeveloper && (!trialUsed || (planType !== 'standard' && planType !== 'premium')) && (
                <div className="absolute -top-3 right-4 md:right-6 flex gap-2 items-center">
                  <button
                    onClick={() => navigate('/pricing')}
                    className="px-2 md:px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-full shadow-lg animate-pulse hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 cursor-pointer"
                    title="Satın Al sayfasına git"
                  >
                    {t.analyze.trialBadge}
                  </button>
                </div>
              )}

              <div className="mb-5 md:mb-6">
                <label className="block text-white font-semibold mb-2 md:mb-3 text-sm md:text-base">
                  {t.analyze.analysisTypeLabel}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 md:mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      // Block users without any plan (planType === null means no plan activated)
                      if (!isDeveloper && planType === null) {
                        showToast('Analiz yapmak için lütfen bir plan satın alın.', 'error');
                        navigate('/pricing');
                        return;
                      }
                      // If advanced is selected, remove it and select basic
                      if (textAnalysisType === 'advanced') {
                        setTextAnalysisType('basic');
                      } else if (textAnalysisType === 'basic') {
                        // Toggle off if already selected (but not if visual is selected - must keep a text type)
                        if (!isVisualSelected) {
                          setTextAnalysisType(null);
                        }
                      } else {
                        // Select basic
                        setTextAnalysisType('basic');
                      }
                    }}
                    disabled={!isDeveloper && planType === null}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left relative ${
                      !isDeveloper && planType === null
                        ? 'border-slate-600/30 bg-slate-950/20 opacity-50 cursor-not-allowed'
                        : textAnalysisType === 'basic'
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-purple-500/30 bg-slate-950/30 hover:border-purple-500/50'
                    }`}
                  >
                    {!isDeveloper && planType === null && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-semibold rounded">🔒</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        textAnalysisType === 'basic' ? 'border-pink-400 bg-pink-400' : 'border-slate-400'
                      }`}>
                        {textAnalysisType === 'basic' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <span className={`font-semibold ${textAnalysisType === 'basic' ? 'text-pink-400' : 'text-slate-300'}`}>
                        {t.analyze.analysisTypeBasic}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t.analyze.analysisTypeBasicDesc}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Block users without any plan (planType === null means no plan activated)
                      if (!isDeveloper && planType === null) {
                        showToast('Analiz yapmak için lütfen bir plan satın alın.', 'error');
                        navigate('/pricing');
                        return;
                      }
                      // Block free plan users from advanced analysis
                      if (!isDeveloper && planType === 'free') {
                        showToast('Gelişmiş analiz için trial planını aktifleştirin veya standart plan satın alın', 'info');
                        navigate('/pricing');
                        return;
                      }
                      // Block expired trial users
                      if (!isDeveloper && planType === 'trial' && trialExpired) {
                        showToast('Trial süreniz dolmuş. Gelişmiş analiz için standart plan satın alın', 'info');
                        navigate('/pricing');
                        return;
                      }
                      // If basic is selected, remove it and select advanced
                      if (textAnalysisType === 'basic') {
                        setTextAnalysisType('advanced');
                      } else if (textAnalysisType === 'advanced') {
                        // Toggle off if already selected (but not if visual is selected - must keep a text type)
                        if (!isVisualSelected) {
                          setTextAnalysisType(null);
                        }
                      } else {
                        // Select advanced
                        setTextAnalysisType('advanced');
                      }
                    }}
                    disabled={!isDeveloper && (planType === null || planType === 'free' || (planType === 'trial' && trialExpired))}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left relative ${
                      !isDeveloper && (planType === null || planType === 'free' || (planType === 'trial' && trialExpired))
                        ? 'border-slate-600/30 bg-slate-950/20 opacity-50 cursor-not-allowed'
                        : textAnalysisType === 'advanced'
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-purple-500/30 bg-slate-950/30 hover:border-purple-500/50'
                    }`}
                  >
                    {!isDeveloper && (planType === null || planType === 'free' || (planType === 'trial' && trialExpired)) && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-semibold rounded">🔒</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        textAnalysisType === 'advanced' ? 'border-pink-400 bg-pink-400' : 'border-slate-400'
                      }`}>
                        {textAnalysisType === 'advanced' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <span className={`font-semibold ${textAnalysisType === 'advanced' ? 'text-pink-400' : 'text-slate-300'}`}>
                        {t.analyze.analysisTypeAdvanced}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{t.analyze.analysisTypeAdvancedDesc}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Block users without any plan (planType === null means no plan activated)
                      if (!isDeveloper && planType === null) {
                        showToast('Analiz yapmak için lütfen bir plan satın alın.', 'error');
                        navigate('/pricing');
                        return;
                      }
                      // Block free plan users from visual analysis
                      if (!isDeveloper && planType === 'free') {
                        showToast('Görselli analiz için trial planını aktifleştirin veya standart plan satın alın', 'info');
                        navigate('/pricing');
                        return;
                      }
                      // Block expired trial users
                      if (!isDeveloper && planType === 'trial' && trialExpired) {
                        showToast('Trial süreniz dolmuş. Görselli analiz için standart plan satın alın', 'info');
                        navigate('/pricing');
                        return;
                      }
                      // Check daily limit for standard users
                      if (!isDeveloper && planType === 'standard' && visualAnalysesUsed && visualAnalysesUsed.used >= visualAnalysesUsed.limit) {
                        showToast('Günlük görselli analiz limitiniz doldu (3/3). Yarın tekrar deneyin.', 'error');
                        return;
                      }
                      // Check daily limit for premium users
                      if (!isDeveloper && planType === 'premium' && visualAnalysesUsed && visualAnalysesUsed.used >= visualAnalysesUsed.limit) {
                        showToast('Günlük görselli analiz limitiniz doldu (5/5). Yarın tekrar deneyin.', 'error');
                        return;
                      }
                      // Check trial limit (7 total visual analyses during 7-day trial)
                      if (!isDeveloper && planType === 'trial' && !trialExpired && visualAnalysesUsed && visualAnalysesUsed.used >= 7) {
                        showToast('Trial görselli analiz hakkınız doldu (7/7).', 'error');
                        return;
                      }
                      // Toggle visual selection (can be combined with basic or advanced)
                      setIsVisualSelected(!isVisualSelected);
                    }}
                    disabled={!isDeveloper && (
                      planType === null || 
                      planType === 'free' || 
                      (planType === 'trial' && trialExpired) ||
                      (planType === 'trial' && !trialExpired && visualAnalysesUsed && visualAnalysesUsed.used >= 7) ||
                      (planType === 'standard' && visualAnalysesUsed && visualAnalysesUsed.used >= visualAnalysesUsed.limit) ||
                      (planType === 'premium' && visualAnalysesUsed && visualAnalysesUsed.used >= visualAnalysesUsed.limit)
                    )}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left relative ${
                      !isDeveloper && (
                        planType === null || 
                        planType === 'free' || 
                        (planType === 'trial' && trialExpired) ||
                        (planType === 'trial' && !trialExpired && visualAnalysesUsed && visualAnalysesUsed.used >= 7) ||
                        (planType === 'standard' && visualAnalysesUsed && visualAnalysesUsed.used >= visualAnalysesUsed.limit) ||
                        (planType === 'premium' && visualAnalysesUsed && visualAnalysesUsed.used >= visualAnalysesUsed.limit)
                      )
                        ? 'border-slate-600/30 bg-slate-950/20 opacity-50 cursor-not-allowed'
                        : isVisualSelected
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-purple-500/30 bg-slate-950/30 hover:border-purple-500/50'
                    }`}
                  >
                    {/* Visual analysis limit badge on border - for trial, standard, premium users and developers */}
                    {isDeveloper && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-cyan-500/95 to-blue-500/95 border-2 border-cyan-300/60 rounded-full text-white text-sm font-bold shadow-xl shadow-cyan-500/30 flex items-center justify-center min-w-[40px]">
                        <span className="text-cyan-100">∞</span>
                      </div>
                    )}
                    {!isDeveloper && planType === 'trial' && !trialExpired && visualAnalysesUsed && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-green-500/95 to-emerald-500/95 border-2 border-green-300/60 rounded-full text-white text-xs font-bold shadow-xl shadow-green-500/30 flex items-center justify-center min-w-[50px]">
                        {visualAnalysesUsed.used}/7
                      </div>
                    )}
                    {!isDeveloper && (planType === 'standard' || planType === 'premium') && visualAnalysesUsed && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-cyan-500/95 to-blue-500/95 border-2 border-cyan-300/60 rounded-full text-white text-xs font-bold shadow-xl shadow-cyan-500/30 flex items-center justify-center min-w-[50px]">
                        {visualAnalysesUsed.used}/{visualAnalysesUsed.limit}
                      </div>
                    )}
                    {!isDeveloper && (
                      planType === null || 
                      planType === 'free' || 
                      (planType === 'trial' && trialExpired) ||
                      (planType === 'trial' && !trialExpired && visualAnalysesUsed && visualAnalysesUsed.used >= 7) ||
                      (planType === 'standard' && visualAnalysesUsed && visualAnalysesUsed.used >= visualAnalysesUsed.limit) ||
                      (planType === 'premium' && visualAnalysesUsed && visualAnalysesUsed.used >= visualAnalysesUsed.limit)
                    ) && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-semibold rounded">🔒</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isVisualSelected ? 'border-pink-400 bg-pink-400' : 'border-slate-400'
                      }`}>
                        {isVisualSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <span className={`font-semibold ${isVisualSelected ? 'text-pink-400' : 'text-slate-300'}`}>
                        {t.analyze.analysisTypeVisual}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{t.analyze.analysisTypeVisualDesc}</p>
                    {/* Show upgrade button only for expired trial users (free users already have button at top right) */}
                    {(planType === 'trial' && trialExpired) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/pricing');
                        }}
                        className="w-full mt-2 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-semibold rounded-lg hover:from-green-500 hover:to-emerald-500 transition-all duration-300"
                      >
                        {t.analyze.trialBadge}
                      </button>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={true}
                    className="p-4 rounded-xl border-2 transition-all duration-300 text-left relative border-yellow-500/30 bg-slate-950/20 opacity-60 cursor-not-allowed"
                  >
                    <div className="absolute -top-2.5 right-4">
                      <span className="px-2 py-0.5 bg-yellow-600/40 text-yellow-200 text-[10px] font-semibold rounded flex items-center gap-1 border border-yellow-500/50">
                        <Lock size={10} />
                        {t.analyze.comingSoon}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center border-yellow-400/50">
                        <Lock className="text-yellow-400/60" size={10} />
                      </div>
                      <span className="font-semibold text-yellow-300/70">
                        {t.analyze.analysisTypeVideo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{t.analyze.analysisTypeVideoDesc}</p>
                    <div className="mt-2 flex items-center justify-center">
                      <Video className="text-yellow-400/40" size={20} />
                    </div>
                  </button>
                </div>
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
                  onKeyDown={(e) => {
                    // Submit form when Enter is pressed (Ctrl+Enter for new line)
                    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
                      e.preventDefault();
                      // Trigger form submit by creating a submit event
                      const form = e.currentTarget.form;
                      if (form && !isSubmitting && dreamText.trim()) {
                        form.requestSubmit();
                      }
                    }
                  }}
                  placeholder={!isDeveloper && planType === null ? (language === 'tr' ? 'Analiz yapmak için lütfen bir plan satın alın...' : 'Please purchase a plan to analyze...') : t.analyze.placeholder}
                  disabled={!isDeveloper && planType === null}
                  className={`w-full h-48 md:h-64 px-3 md:px-4 py-2 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none text-sm md:text-base ${
                    !isDeveloper && planType === null ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  maxLength={maxCharacters}
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-xs md:text-sm ${characterCount > maxCharacters * 0.9 ? 'text-pink-400' : 'text-slate-500'}`}>
                    {characterCount} / {maxCharacters} {t.analyze.characters}
                  </span>
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={(!isDeveloper && planType === null) || isTranscribing}
                    className={`p-2 rounded-lg transition-all duration-300 ${
                      isTranscribing
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400 animate-pulse'
                        : isRecording 
                        ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse' 
                        : 'bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/30'
                    } ${(!isDeveloper && planType === null) || isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isTranscribing ? (language === 'tr' ? 'Çevriliyor...' : 'Transcribing...') : isRecording ? (language === 'tr' ? 'Kaydı Durdur' : 'Stop Recording') : (language === 'tr' ? 'Sesli Giriş' : 'Voice Input')}
                  >
                    {isTranscribing ? <Loader2 size={18} className="animate-spin" /> : isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-5 md:mb-6 p-3 md:p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm md:text-base">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !dreamText.trim() || (!isDeveloper && planType === null) || (!textAnalysisType && !isVisualSelected)}
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
                <div className="flex items-center justify-center gap-4 mb-6">
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
                    onClick={() => {
                      // Navigate to appropriate tab based on analysis type
                      const tab = (lastAnalysisType === 'basic' || lastAnalysisType === 'advanced') ? 'text' : 'visual';
                      navigate(`/library?tab=${tab}`);
                    }}
                    className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30 hover:scale-105"
                  >
                    <BookOpen size={18} />
                    <span>{t.analyze.goToLibrary}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
