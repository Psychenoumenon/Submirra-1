import { useState, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, Wand2, Loader2, Download, Trash2, Lock, Eye, EyeOff, X, ZoomIn } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';

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
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dreamImages, setDreamImages] = useState<DreamImage[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingImages, setLoadingImages] = useState<{[key: string]: boolean}>({});
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [modalImage, setModalImage] = useState<string | null>(null);

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
        setIsFirstLoad(false);
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data', 'error');
        setIsFirstLoad(false);
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
    <div className="min-h-screen relative pt-24 pb-16 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-full mb-6">
            <Sparkles className="text-yellow-400" size={20} />
            <span className="text-yellow-400 font-semibold">Premium Feature</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 pb-4 leading-tight bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 text-transparent bg-clip-text">
            {t.generator.title}
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {t.generator.subtitle}
          </p>
        </div>

        {/* Generator Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Image Selection */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="text-purple-400" size={24} />
              {t.generator.selectImage}
            </h2>
            <p className="text-slate-400 text-sm mb-6">{t.generator.selectImageDesc}</p>

            {allImages.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="mx-auto mb-4 text-slate-600" size={48} />
                <p className="text-slate-400 mb-2">{t.generator.noImages}</p>
                <p className="text-slate-500 text-sm">{t.generator.analyzeFirst}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 pb-2 scrollbar-hide auto-rows-max items-start">
                {allImages.map((img, index) => (
                  <button
                    key={`${img.dreamId}-${index}`}
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative group rounded-xl overflow-hidden transition-all duration-300 aspect-square w-full ${
                      selectedImage === img.url
                        ? 'ring-4 ring-pink-500 scale-95'
                        : 'hover:scale-105'
                    }`}
                  >
                    {loadingImages[`select-${index}`] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin text-pink-400" size={24} />
                      </div>
                    )}
                    <img
                      src={img.url}
                      alt="Dream"
                      className="w-full h-full object-cover"
                      onLoadStart={() => setLoadingImages(prev => ({ ...prev, [`select-${index}`]: true }))}
                      onLoad={() => setLoadingImages(prev => ({ ...prev, [`select-${index}`]: false }))}
                      onError={() => setLoadingImages(prev => ({ ...prev, [`select-${index}`]: false }))}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity ${
                      selectedImage === img.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-xs line-clamp-2">{img.dreamText.substring(0, 60)}...</p>
                      </div>
                    </div>
                    {selectedImage === img.url && (
                      <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full p-1.5">
                        <Sparkles size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Prompt & Generate */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Wand2 className="text-pink-400" size={24} />
              {t.generator.promptLabel}
            </h2>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.generator.promptPlaceholder}
              className="w-full h-32 px-4 py-3 bg-slate-950/50 border border-purple-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 resize-none mb-4 transition-all"
              disabled={isGenerating}
            />

            {selectedImage && (
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-2">Selected Image:</p>
                <div className="relative bg-slate-900/50 rounded-lg overflow-hidden aspect-square">
                  {loadingImages['selected-preview'] && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
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
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                !selectedImage || !prompt.trim() ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t.generator.generating}
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  {t.generator.generateButton}
                </>
              )}
            </button>
          </div>
        </div>

        {/* My Generations */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={24} />
            {t.generator.myGenerations}
          </h2>

          {isFirstLoad ? (
            <div className="text-center py-12">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
              </div>
              <p className="text-slate-400 mb-2">Loading generations...</p>
              <p className="text-slate-500 text-sm">Please wait</p>
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center py-12">
              <Wand2 className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400 mb-2">{t.generator.empty}</p>
              <p className="text-slate-500 text-sm">{t.generator.startGenerating}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="group bg-slate-950/30 rounded-xl overflow-hidden border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300"
                >
                  <div className="relative">
                    {(!gen.generated_image_url || gen.status === 'processing') ? (
                      <div className="w-full aspect-square flex flex-col items-center justify-center bg-slate-900/50">
                        <div className="relative w-20 h-20 mb-4">
                          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
                          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                        </div>
                        <p className="text-slate-400 text-sm">Processing...</p>
                        <p className="text-slate-500 text-xs mt-1">Please wait</p>
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
                          onClick={() => setModalImage(gen.generated_image_url)}
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
                  <div className="p-4">
                    <p className="text-slate-300 text-sm mb-3 line-clamp-2">{gen.prompt}</p>
                    <p className="text-slate-500 text-xs mb-4">
                      {t.generator.generatedAt}: {new Date(gen.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadImage(gen.generated_image_url)}
                        disabled={!gen.generated_image_url || gen.status === 'processing'}
                        className="flex-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download size={16} />
                        {t.generator.download}
                      </button>
                      <button
                        onClick={() => deleteGeneration(gen.id)}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
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
          <img
            src={modalImage}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
