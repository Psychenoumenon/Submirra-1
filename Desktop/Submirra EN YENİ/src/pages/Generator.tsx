import { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, Wand2, Loader2, Download, Trash2, Lock, Eye, EyeOff, X, ZoomIn } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';
import VoiceRecorder from '../components/VoiceRecorder';

interface DreamImage {
  id: string;
  image_url: string;
  image_url_2?: string | null;
  image_url_3?: string | null;
  dream_text: string;
  created_at: string;
}

interface Generation {
  id: string;
  user_id: string;
  source_image_url: string;
  generated_image_url: string;
  prompt: string;
  is_public: boolean;
  status?: string;
  created_at: string;
}

export default function Generator() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dreamImages, setDreamImages] = useState<DreamImage[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingImages, setLoadingImages] = useState<{[key: string]: boolean}>({});
  const [modalImage, setModalImage] = useState<{ imageUrl: string; prompt: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/signin');
      return;
    }

    const checkPremiumAndLoadData = async () => {
      try {
        // Check premium status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan_type')
          .eq('user_id', user.id)
          .single();
        
        const isPremiumUser = subscription?.plan_type === 'premium' || subscription?.plan_type === 'ruyagezer';
        setIsPremium(isPremiumUser);

        if (!isPremiumUser) {
          setLoading(false);
          return;
        }

        // Load dream images
        const { data: dreams, error: dreamsError } = await supabase
          .from('dreams')
          .select('id, image_url, image_url_2, image_url_3, dream_text, created_at')
          .eq('user_id', user.id)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false });

        if (dreamsError) throw dreamsError;
        setDreamImages(dreams || []);

        // Load generations
        const { data: gens, error: gensError } = await supabase
          .from('dream_generations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (gensError) throw gensError;
        setGenerations(gens || []);
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data', 'error');
      } finally {
        setLoading(false);
      }
    };

    checkPremiumAndLoadData();
  }, [user, authLoading, navigate]);

  // Subscribe to realtime updates for dream_generations
  useEffect(() => {
    if (!user || !isPremium) return;

    const channel = supabase
      .channel('dream-generations-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dream_generations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Generation updated:', payload);
          const updatedGen = payload.new as Generation;
          setGenerations(prev => 
            prev.map(g => g.id === updatedGen.id ? updatedGen : g)
          );
          
          // Show toast if generation completed
          if (updatedGen.status === 'completed' && updatedGen.generated_image_url) {
            showToast('Image generation completed!', 'success');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isPremium, showToast]);

  const handleGenerate = async () => {
    if (!selectedImage || !prompt.trim()) {
      showToast('Please select an image and enter a prompt', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Create a pending generation record in Supabase
      const { data: genRecord, error: insertError } = await supabase
        .from('dream_generations')
        .insert({
          user_id: user!.id,
          source_image_url: selectedImage,
          generated_image_url: '', // Will be filled by n8n workflow
          prompt: prompt.trim(),
          is_public: false,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw new Error(`Database error: ${insertError.message}`);
      }
      
      if (!genRecord) {
        throw new Error('Failed to create generation record');
      }

      console.log('✅ Generation record created:', genRecord.id);

      // 2. Call n8n webhook to start generation
      const webhookUrl = import.meta.env.VITE_N8N_GENERATOR_WEBHOOK_URL;
      
      if (webhookUrl) {
        console.log('🔄 Calling webhook:', webhookUrl);
        try {
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user!.id,
              source_image_url: selectedImage,
              prompt: prompt.trim(),
              generation_id: genRecord.id,
            }),
          });
          
          if (!webhookResponse.ok) {
            console.warn(`⚠️ Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
          } else {
            console.log('✅ Webhook called successfully');
          }
        } catch (webhookError) {
          console.warn('⚠️ Webhook call failed:', webhookError);
          // Don't throw, just log the error and continue
        }
      } else {
        console.warn('⚠️ VITE_N8N_GENERATOR_WEBHOOK_URL is not configured.');
        console.log('ℹ️ To enable automatic image generation, add this to your .env file:');
        console.log('ℹ️ VITE_N8N_GENERATOR_WEBHOOK_URL=your_webhook_url');
      }

      // 3. Poll for completion (check every 5 seconds for up to 60 seconds)
      let attempts = 0;
      const maxAttempts = 12;
      
      const pollForCompletion = async (): Promise<Generation | null> => {
        const { data, error } = await supabase
          .from('dream_generations')
          .select('*')
          .eq('id', genRecord.id)
          .single();
        
        if (error) return null;
        
        if (data.status === 'completed' && data.generated_image_url) {
          return data;
        }
        
        if (data.status === 'failed') {
          throw new Error('Generation failed');
        }
        
        if (attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000));
          return pollForCompletion();
        }
        
        return null;
      };

      // Add the record immediately to show it in the list
      setGenerations([genRecord, ...generations]);
      setPrompt('');
      setSelectedImage(null);
      
      showToast('Generation started! Processing in background...', 'success');
      
      // If webhook is configured, try to poll for completion in background
      if (webhookUrl) {
        // Poll in background without blocking
        pollForCompletion().then(completedGen => {
          if (completedGen && completedGen.status === 'completed') {
            setGenerations(prev => prev.map(g => g.id === completedGen.id ? completedGen : g));
            showToast('Image generation completed!', 'success');
          }
        }).catch(err => {
          console.error('Polling error:', err);
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showToast(`Generation failed: ${errorMessage}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePublic = async (genId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('dream_generations')
        .update({ is_public: !currentStatus })
        .eq('id', genId);

      if (error) throw error;

      setGenerations(generations.map(g => 
        g.id === genId ? { ...g, is_public: !currentStatus } : g
      ));
      showToast(!currentStatus ? 'Made public' : 'Made private', 'success');
    } catch (error) {
      console.error('Error toggling public status:', error);
      showToast('Error updating status', 'error');
    }
  };

  const deleteGeneration = async (genId: string) => {
    if (!confirm(t.generator.deleteConfirm)) return;

    try {
      const { error } = await supabase
        .from('dream_generations')
        .delete()
        .eq('id', genId);

      if (error) throw error;

      setGenerations(generations.filter(g => g.id !== genId));
      showToast('Generation deleted', 'success');
    } catch (error) {
      console.error('Error deleting generation:', error);
      showToast('Error deleting generation', 'error');
    }
  };

  const downloadImage = async (imageUrl: string) => {
    try {
      showToast('Downloading image...', 'info');
      
      // Fetch the image as a blob to avoid CORS issues
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = `submirra-generation-${Date.now()}.png`;
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      showToast('Image downloaded successfully!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: try direct download without fetch
      try {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `submirra-generation-${Date.now()}.png`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Download started...', 'success');
      } catch (fallbackError) {
        console.error('Fallback download error:', fallbackError);
        showToast('Opening image in new tab...', 'info');
        window.open(imageUrl, '_blank');
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={48} />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen relative pt-24 pb-16 px-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-full mb-8">
            <Lock className="text-pink-400" size={20} />
            <span className="text-pink-400 font-semibold">{t.generator.premiumOnly}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 pb-4 leading-tight bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 text-transparent bg-clip-text">
            {t.generator.title}
          </h1>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            {t.generator.subtitle}
          </p>

          <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-purple-500/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-purple-500/5"></div>
            <div className="relative">
              <Wand2 className="mx-auto mb-6 text-purple-400" size={64} />
              <p className="text-slate-300 mb-8 text-lg">
                {t.generator.lockMessage}
              </p>
              <button
                onClick={() => navigate('/pricing')}
                className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30 hover:scale-105"
              >
                {t.generator.upgradeToPremium}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get all available images from dreams
  const allImages: Array<{ url: string; dreamId: string; dreamText: string }> = [];
  dreamImages.forEach(dream => {
    if (dream.image_url) allImages.push({ url: dream.image_url, dreamId: dream.id, dreamText: dream.dream_text });
    if (dream.image_url_2) allImages.push({ url: dream.image_url_2, dreamId: dream.id, dreamText: dream.dream_text });
    if (dream.image_url_3) allImages.push({ url: dream.image_url_3, dreamId: dream.id, dreamText: dream.dream_text });
  });

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-4 overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-yellow-500/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 border border-yellow-500/40 rounded-full mb-8 shadow-lg shadow-yellow-500/20 animate-fade-in">
            <Sparkles className="text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]" size={22} />
            <span className="text-yellow-300 font-bold text-sm tracking-wide drop-shadow-[0_0_4px_rgba(253,224,71,0.6)]">Premium Feature</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 pb-6 leading-tight bg-gradient-to-r from-pink-400 via-purple-400 via-cyan-400 to-pink-400 text-transparent bg-clip-text animate-fade-in bg-[length:200%_auto] animate-gradient">
            {t.generator.title}
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {t.generator.subtitle}
          </p>
        </div>

        {/* Enhanced Generator Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16 items-stretch">
          {/* Enhanced Image Selection */}
          <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500 hover:border-purple-500/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                <ImageIcon className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {t.generator.selectImage}
                </h2>
                <p className="text-slate-400 text-sm mt-1">{t.generator.selectImageDesc}</p>
              </div>
            </div>

            {allImages.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-slate-900/50 to-slate-800/30 rounded-2xl border border-purple-500/10">
                <ImageIcon className="mx-auto mb-4 text-slate-500" size={48} />
                <p className="text-slate-300 mb-2 font-medium">{t.generator.noImages}</p>
                <p className="text-slate-500 text-sm">{t.generator.analyzeFirst}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 pb-2 scrollbar-hide custom-scrollbar flex-1" style={{ maxHeight: '600px', gridAutoRows: 'min-content' }}>
                {allImages.map((img, index) => (
                  <div key={`${img.dreamId}-${index}`} className="w-full" style={{ aspectRatio: '1 / 1' }}>
                    <button
                      onClick={() => setSelectedImage(img.url)}
                      className={`relative group rounded-2xl overflow-hidden transition-all duration-500 w-full h-full ${
                        selectedImage === img.url
                          ? 'ring-4 ring-pink-500 ring-offset-2 ring-offset-slate-900 scale-[0.98] shadow-2xl shadow-pink-500/50'
                          : 'hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20'
                      }`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                    {loadingImages[`select-${index}`] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-md z-10 rounded-2xl">
                        <Loader2 className="animate-spin text-pink-400" size={28} />
                      </div>
                    )}
                    <img
                      src={img.url}
                      alt="Dream"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onLoadStart={() => setLoadingImages(prev => ({ ...prev, [`select-${index}`]: true }))}
                      onLoad={() => setLoadingImages(prev => ({ ...prev, [`select-${index}`]: false }))}
                      onError={() => setLoadingImages(prev => ({ ...prev, [`select-${index}`]: false }))}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-all duration-500 ${
                      selectedImage === img.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-xs font-medium line-clamp-2 drop-shadow-lg">{img.dreamText.substring(0, 60)}...</p>
                      </div>
                    </div>
                    {selectedImage === img.url && (
                      <div className="absolute top-3 right-3 bg-gradient-to-br from-pink-500 to-purple-500 text-white rounded-full p-2 shadow-lg shadow-pink-500/50 animate-pulse">
                        <Sparkles size={18} className="drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                      </div>
                    )}
                    {selectedImage === img.url && (
                      <div className="absolute inset-0 border-2 border-pink-400/50 rounded-2xl animate-pulse"></div>
                    )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enhanced Prompt & Generate */}
          <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-xl border border-pink-500/30 rounded-3xl p-8 shadow-2xl shadow-pink-500/10 hover:shadow-pink-500/20 transition-all duration-500 hover:border-pink-500/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl border border-pink-500/30">
                <Wand2 className="text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {t.generator.promptLabel}
                </h2>
                <p className="text-slate-400 text-sm mt-1">Describe your transformation</p>
              </div>
            </div>

            <div className="relative mb-6">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isGenerating && selectedImage && prompt.trim()) {
                      handleGenerate();
                    }
                  }
                }}
                placeholder={t.generator.promptPlaceholder}
                className="w-full flex-1 min-h-[200px] px-5 py-4 pr-14 bg-slate-950/70 border-2 border-purple-500/30 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/30 resize-none transition-all duration-300 text-sm leading-relaxed shadow-lg shadow-purple-500/5"
                disabled={isGenerating}
              />
              <div className="absolute right-3 bottom-3">
                <VoiceRecorder
                  onTranscription={(text) => setPrompt(prev => prev + ' ' + text)}
                  language={language}
                  mode="transcribe"
                  disabled={isGenerating}
                  showToast={showToast}
                />
              </div>
            </div>

            {selectedImage && (
              <div className="mb-6 p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20">
                <p className="text-slate-300 text-sm mb-3 font-medium flex items-center gap-2">
                  <Sparkles className="text-pink-400" size={16} />
                  Selected Image:
                </p>
                <div className="relative bg-slate-900/50 rounded-xl overflow-hidden border-2 border-purple-500/30 shadow-lg" style={{ aspectRatio: '1 / 1', maxWidth: '300px' }}>
                  {loadingImages['selected-preview'] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-md z-10 rounded-xl">
                      <Loader2 className="animate-spin text-pink-400" size={32} />
                    </div>
                  )}
                  <img 
                    src={selectedImage} 
                    alt="Selected" 
                    className="w-full h-full object-cover"
                    onLoadStart={() => setLoadingImages(prev => ({ ...prev, 'selected-preview': true }))}
                    onLoad={() => setLoadingImages(prev => ({ ...prev, 'selected-preview': false }))}
                    onError={() => setLoadingImages(prev => ({ ...prev, 'selected-preview': false }))}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedImage || !prompt.trim()}
              className={`w-full px-8 py-5 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 text-white font-bold rounded-2xl transition-all duration-500 hover:from-pink-500 hover:via-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg shadow-2xl shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98] ${
                !selectedImage || !prompt.trim() ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-2xl'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  <span>{t.generator.generating}</span>
                </>
              ) : (
                <>
                  <Wand2 size={24} className="drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  <span>{t.generator.generateButton}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Enhanced My Generations */}
        <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-xl border border-yellow-500/30">
              <Sparkles className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">
                {t.generator.myGenerations}
              </h2>
              <p className="text-slate-400 text-sm mt-1">{generations.length} {generations.length === 1 ? 'generation' : 'generations'}</p>
            </div>
          </div>

          {generations.length === 0 ? (
            <div className="text-center py-12">
              <Wand2 className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400 mb-2">{t.generator.empty}</p>
              <p className="text-slate-500 text-sm">{t.generator.startGenerating}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generations.map((gen, index) => (
                <div
                  key={gen.id}
                  className="group bg-gradient-to-br from-slate-950/50 to-slate-900/30 rounded-2xl overflow-hidden border border-purple-500/20 hover:border-purple-500/40 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative">
                    {(!gen.generated_image_url || gen.status === 'processing') ? (
                      <div className="w-full aspect-square flex flex-col items-center justify-center bg-slate-900/50">
                        <div className="relative w-20 h-20 mb-4">
                          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                        </div>
                        <p className="text-slate-400 text-sm">{t.generator.processing}</p>
                        <p className="text-slate-500 text-xs mt-1">{t.generator.pleaseWait}</p>
                      </div>
                    ) : (
                      <>
                        {loadingImages[gen.id] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                            <Loader2 className="animate-spin text-pink-400" size={32} />
                          </div>
                        )}
                        <div 
                          className="relative cursor-pointer group/image"
                          onClick={() => setModalImage({ imageUrl: gen.generated_image_url, prompt: gen.prompt })}
                        >
                          <img
                            src={gen.generated_image_url}
                            alt="Generated"
                            className="w-full aspect-square object-cover transition-transform group-hover/image:scale-105"
                            onLoadStart={() => setLoadingImages(prev => ({ ...prev, [gen.id]: true }))}
                            onLoad={() => setLoadingImages(prev => ({ ...prev, [gen.id]: false }))}
                            onError={() => setLoadingImages(prev => ({ ...prev, [gen.id]: false }))}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/40 transition-colors flex items-center justify-center">
                            <ZoomIn className="text-white opacity-0 group-hover/image:opacity-100 transition-opacity" size={32} />
                          </div>
                        </div>
                      </>
                    )}
                    {gen.generated_image_url && gen.status !== 'processing' && (
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => togglePublic(gen.id, gen.is_public)}
                          className="p-2 bg-slate-900/80 backdrop-blur-sm rounded-lg hover:bg-slate-800 transition-colors"
                          title={gen.is_public ? t.generator.makePrivate : t.generator.makePublic}
                        >
                          {gen.is_public ? <Eye size={16} className="text-green-400" /> : <EyeOff size={16} className="text-slate-400" />}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-5 bg-gradient-to-br from-slate-950/50 to-slate-900/30">
                    <p className="text-slate-200 text-sm mb-3 line-clamp-2 font-medium leading-relaxed">{gen.prompt}</p>
                    <p className="text-slate-400 text-xs mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      {t.generator.generatedAt}: {new Date(gen.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => downloadImage(gen.generated_image_url)}
                        disabled={!gen.generated_image_url || gen.status === 'processing'}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/40 hover:to-pink-600/40 text-purple-300 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/20 border border-purple-500/20"
                      >
                        <Download size={18} />
                        {t.generator.download}
                      </button>
                      <button
                        onClick={() => deleteGeneration(gen.id)}
                        className="px-4 py-2.5 bg-gradient-to-r from-red-600/20 to-red-500/20 hover:from-red-600/30 hover:to-red-500/30 text-red-400 rounded-xl transition-all duration-300 border border-red-500/20 hover:shadow-lg hover:shadow-red-500/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal - Gallery Style */}
      {modalImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={() => setModalImage(null)}
        >
          <button
            onClick={() => setModalImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2"
            aria-label="Close modal"
          >
            <X className="text-white" size={24} />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={modalImage.imageUrl}
              alt="Full size"
              className="w-full max-h-[70vh] object-contain rounded-lg mb-4"
            />
            <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <Wand2 size={18} className="text-purple-400" />
                Generation Prompt
              </h3>
              <p className="text-slate-300 leading-relaxed">{modalImage.prompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
