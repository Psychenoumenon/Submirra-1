import { useState, useEffect, useRef } from 'react';
import { BookOpen, Calendar, Loader2, Search, Trash2, Heart, ChevronLeft, ChevronRight, X, Download, Globe, Lock, Star } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';
import { getDreamText, getAnalysisText } from '../lib/translateDream';
import { isDeveloperSync } from '../lib/developer';

interface Dream {
  id: string;
  dream_text: string;
  analysis_text: string;
  dream_text_tr?: string | null;
  dream_text_en?: string | null;
  analysis_text_tr?: string | null;
  analysis_text_en?: string | null;
  image_url: string;
  image_url_2?: string | null;
  image_url_3?: string | null;
  primary_image_index?: number | null;
  analysis_type?: 'basic' | 'advanced' | 'basic_visual' | 'advanced_visual' | null;
  created_at: string;
  status: string;
  is_favorite?: boolean;
  is_public?: boolean;
}

export default function Library() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'favorites'>('all');
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState<'visual' | 'text'>('visual');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({
    total: 0,
    public: 0,
    private: 0,
  });
  const [isPremium, setIsPremium] = useState(false);
  const [planType, setPlanType] = useState<'free' | 'trial' | 'standard' | 'premium' | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;
    
    if (!user) {
      navigate('/signin');
      return;
    }

    // Check URL for tab parameter
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'text' || tabParam === 'visual') {
      setAnalysisTypeFilter(tabParam);
    }

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem(`favorites_${user.id}`);
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }

    // Check if user is premium/developer and get plan type
    const checkPremium = async () => {
      // Check developer status
      const isDev = isDeveloperSync(user.id);
      setIsDeveloper(isDev);
      
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_type')
        .eq('user_id', user.id)
        .single();
      
      const userPlanType = subscription?.plan_type as 'free' | 'trial' | 'standard' | 'premium' | null;
      setPlanType(userPlanType);
      setIsPremium(userPlanType === 'premium');
    };
    
    checkPremium();
    loadDreams();

    // Set up real-time subscription for instant updates
    const channel = supabase
      .channel('dreams-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dreams',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Dream change received:', payload);
          // Immediately reload dreams when status changes
          loadDreams();
        }
      )
      .subscribe();

    // Also poll for updates every 3 seconds as a fallback (only if real-time fails)
    const pollInterval = setInterval(() => {
      loadDreams();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, navigate]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedDream) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [selectedDream]);

  const loadDreams = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Reload favorites to ensure sync
      const savedFavorites = localStorage.getItem(`favorites_${user.id}`);
      const currentFavorites = savedFavorites ? new Set<string>(JSON.parse(savedFavorites) as string[]) : favorites;
      
      const dreamsWithFavorites = (data || []).map(dream => ({
        ...dream,
        is_favorite: currentFavorites.has(dream.id)
      }));
      setDreams(dreamsWithFavorites);
      setFavorites(currentFavorites);

      // Calculate stats
      const total = dreamsWithFavorites.length;
      const publicCount = dreamsWithFavorites.filter(d => d.is_public === true).length;
      const privateCount = total - publicCount;
      setStats({
        total,
        public: publicCount,
        private: privateCount,
      });

      // Auto-switch to 'text' tab if no visual dreams exist and currently on 'visual' tab
      // Only if URL doesn't have a tab parameter (to respect user's navigation)
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (!tabParam && analysisTypeFilter === 'visual') {
        const hasVisualDreams = dreamsWithFavorites.some(dream => {
          const images: string[] = [];
          if (dream.image_url && dream.image_url.trim() !== '') images.push(dream.image_url);
          if (dream.image_url_2 && dream.image_url_2.trim() !== '') images.push(dream.image_url_2);
          if (dream.image_url_3 && dream.image_url_3.trim() !== '') images.push(dream.image_url_3);
          return images.length > 0;
        });
        if (!hasVisualDreams && dreamsWithFavorites.length > 0) {
          setAnalysisTypeFilter('text');
        }
      }
    } catch (error) {
      console.error('Error loading dreams:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'tr' ? 'tr-TR' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDeleteDream = async (dreamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      showToast('You must be logged in to delete dreams', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this dream? This will also delete all likes and comments.')) {
      return;
    }

    try {
      // Delete related likes first
      try {
        await supabase
          .from('dream_likes')
          .delete()
          .eq('dream_id', dreamId);
      } catch (e) {
        console.log('Error deleting likes:', e);
      }

      // Delete related comments
      try {
        await supabase
          .from('dream_comments')
          .delete()
          .eq('dream_id', dreamId);
      } catch (e) {
        console.log('Error deleting comments:', e);
      }

      // Check if user is developer (developers can delete any dream)
      const isDev = isDeveloperSync(user.id);
      
      // Build delete query - developers can delete any dream, others can only delete their own
      let deleteQuery = supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId);
      
      if (!isDev) {
        deleteQuery = deleteQuery.eq('user_id', user.id); // Only allow deleting own dreams
      }

      const { error } = await deleteQuery;

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Remove from local state immediately
      setDreams((prev) => prev.filter((dream) => dream.id !== dreamId));
      
      // Close modal if it's the deleted dream
      if (selectedDream?.id === dreamId) {
        setSelectedDream(null);
      }
      
      // Remove from favorites if it was favorited
      const newFavorites = new Set(favorites);
      newFavorites.delete(dreamId);
      setFavorites(newFavorites);
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(Array.from(newFavorites)));
      
      showToast('Dream deleted successfully', 'success');
      
      // Reload dreams to ensure sync with database
      setTimeout(async () => {
        await loadDreams();
      }, 100);
    } catch (error: any) {
      console.error('Error deleting dream:', error);
      const errorMessage = error?.message || 'Failed to delete dream. You can only delete your own dreams.';
      showToast(errorMessage, 'error');
    }
  };

  const toggleFavorite = (dreamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(dreamId)) {
      newFavorites.delete(dreamId);
      showToast('Removed from favorites', 'info');
    } else {
      newFavorites.add(dreamId);
      showToast('Added to favorites', 'success');
    }
    setFavorites(newFavorites);
    if (user) {
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(Array.from(newFavorites)));
    }
    const isFavorite = newFavorites.has(dreamId);
    setDreams((prev) =>
      prev.map((dream) =>
        dream.id === dreamId ? { ...dream, is_favorite: isFavorite } : dream
      )
    );
    // Update selectedDream if it's the one being toggled
    if (selectedDream?.id === dreamId) {
      setSelectedDream({ ...selectedDream, is_favorite: isFavorite });
    }
  };

  const handleTogglePrivacy = async (dreamId: string, currentPrivacy: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const newPrivacy = !currentPrivacy;
      const { error } = await supabase
        .from('dreams')
        .update({ is_public: newPrivacy })
        .eq('id', dreamId)
        .eq('user_id', user.id);

      if (error) throw error;

      setDreams(prev =>
        prev.map(dream =>
          dream.id === dreamId ? { ...dream, is_public: newPrivacy } : dream
        )
      );

      // Update selectedDream if it's the one being toggled
      if (selectedDream?.id === dreamId) {
        setSelectedDream({ ...selectedDream, is_public: newPrivacy });
      }

      showToast(t.library.privacyUpdated, 'success');
    } catch (error) {
      console.error('Error toggling privacy:', error);
      showToast(t.library.privacyUpdateError, 'error');
    }
  };

  const handleDownloadImage = async (imageUrl: string, dreamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!imageUrl) {
      showToast(t.library.imageNotFound, 'error');
      return;
    }

    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Görsel yüklenemedi');
      }

      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get file extension from URL or default to png
      const extension = imageUrl.split('.').pop()?.split('?')[0] || 'png';
      link.download = `ruya-gorseli-${dreamId}.${extension}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast(t.library.downloadSuccess, 'success');
    } catch (error) {
      console.error('Error downloading image:', error);
      showToast(t.library.downloadError, 'error');
    }
  };

  // Helper function to get original images in order (without reordering)
  const getOriginalImages = (dream: Dream): string[] => {
    const images: string[] = [];
    if (dream.image_url && dream.image_url.trim() !== '') images.push(dream.image_url);
    if (dream.image_url_2 && dream.image_url_2.trim() !== '') images.push(dream.image_url_2);
    if (dream.image_url_3 && dream.image_url_3.trim() !== '') images.push(dream.image_url_3);
    return images;
  };

  // Helper function to get all available images for a dream
  // Primary image (if set) will be first in the array
  const getDreamImages = (dream: Dream): string[] => {
    const images = getOriginalImages(dream);
    
    // If primary_image_index is set, reorder images to put primary first
    if (dream.primary_image_index !== null && dream.primary_image_index !== undefined && dream.primary_image_index >= 0 && dream.primary_image_index < images.length) {
      const primaryImage = images[dream.primary_image_index];
      images.splice(dream.primary_image_index, 1);
      images.unshift(primaryImage);
    }
    
    return images;
  };

  // Function to set primary image for premium users
  const setPrimaryImage = async (dreamId: string, imageIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!user) return;
    
    try {
      // Check if user is premium
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan_type')
        .eq('user_id', user.id)
        .single();
      
      if (subscription?.plan_type !== 'premium') {
        showToast('Bu özellik sadece Premium kullanıcılar için geçerlidir.', 'error');
        return;
      }
      
      // Update primary_image_index
      const { error } = await supabase
        .from('dreams')
        .update({ primary_image_index: imageIndex })
        .eq('id', dreamId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setDreams(prev => prev.map(dream => 
        dream.id === dreamId 
          ? { ...dream, primary_image_index: imageIndex }
          : dream
      ));
      
      // Update selectedDream if it's the one being updated
      if (selectedDream?.id === dreamId) {
        setSelectedDream({ ...selectedDream, primary_image_index: imageIndex });
      }
      
      // Reset carousel index to 0 (primary image)
      setCarouselIndices(prev => ({ ...prev, [dreamId]: 0 }));
      if (selectedDream?.id === dreamId) {
        setCarouselIndices(prev => ({ ...prev, [`modal-${dreamId}`]: 0 }));
      }
      
      showToast('Kapak görseli güncellendi', 'success');
    } catch (error) {
      console.error('Error setting primary image:', error);
      showToast('Kapak görseli güncellenemedi', 'error');
    }
  };

  // Handle touch events for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (dreamId: string, images: string[]) => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    
    if (Math.abs(distance) > minSwipeDistance) {
      const currentIndex = carouselIndices[dreamId] || 0;
      if (distance > 0 && currentIndex < images.length - 1) {
        // Swipe left - next image
        setCarouselIndices({ ...carouselIndices, [dreamId]: currentIndex + 1 });
      } else if (distance < 0 && currentIndex > 0) {
        // Swipe right - previous image
        setCarouselIndices({ ...carouselIndices, [dreamId]: currentIndex - 1 });
      }
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const filteredDreams = dreams.filter((dream) => {
    const matchesSearch = searchQuery === '' || 
      dream.dream_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dream.analysis_text && dream.analysis_text.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'favorites' && dream.is_favorite);

    // Filter by analysis type
    const matchesAnalysisType = analysisTypeFilter === 'visual' 
      ? (dream.analysis_type === 'basic_visual' || dream.analysis_type === 'advanced_visual') // Show visual analyses
      : (dream.analysis_type === 'basic' || dream.analysis_type === 'advanced'); // Show text analyses

    return matchesSearch && matchesFilter && matchesAnalysisType;
  });

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen relative pt-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-10 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto z-10">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight">
            {t.library.title}
          </h1>
          <p className="text-slate-400 text-lg mb-6">
            {t.library.subtitle}
          </p>

          {/* Stats Cards - Small and compact */}
          <div className="flex justify-center gap-3 mb-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-lg px-4 py-2">
              <div className="text-lg font-semibold text-white">{stats.total}</div>
              <div className="text-xs text-slate-400">{t.library.totalDreams}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg px-4 py-2">
              <div className="text-lg font-semibold text-white">{stats.public}</div>
              <div className="text-xs text-slate-400">{t.library.publicDreams}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-pink-500/20 rounded-lg px-4 py-2">
              <div className="text-lg font-semibold text-white">{stats.private}</div>
              <div className="text-xs text-slate-400">{t.library.privateDreams}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-lg px-4 py-2">
              <div className="text-lg font-semibold text-white">
                {isDeveloper ? '∞' : planType === 'free' ? 30 : planType === 'standard' ? 60 : planType === 'premium' ? 90 : '-'}
              </div>
              <div className="text-xs text-slate-400">{t.library.maxDreamLimit}</div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="max-w-2xl mx-auto mb-8 space-y-4 animate-fade-in-delay">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.library.searchPlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 backdrop-blur-sm border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-lg"
              />
            </div>

            {/* Analysis Type Tabs */}
            <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-1">
              <button
                onClick={() => {
                  setAnalysisTypeFilter('visual');
                }}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-all ${
                  analysisTypeFilter === 'visual'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {t.social.visualAnalyses}
              </button>
              <button
                onClick={() => {
                  setAnalysisTypeFilter('text');
                }}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-all ${
                  analysisTypeFilter === 'text'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {t.social.textAnalyses}
              </button>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                }`}
              >
                {t.library.all}
              </button>
              <button
                onClick={() => setFilterStatus('favorites')}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  filterStatus === 'favorites'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                }`}
              >
                <Heart size={14} className={filterStatus === 'favorites' ? 'fill-current' : ''} />
                {t.library.favorites}
              </button>
            </div>
          </div>
        </div>

        {dreams.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="mx-auto mb-4 text-slate-600" size={64} />
            <p className="text-slate-400 text-lg mb-6">{t.library.empty}</p>
            <button
              onClick={() => navigate('/analyze')}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
            >
              {t.library.analyzeFirst}
            </button>
          </div>
        ) : filteredDreams.length === 0 ? (
          <div className="text-center py-20">
            <Search className="mx-auto mb-4 text-slate-600" size={64} />
            <p className="text-slate-400 text-lg mb-6">{t.library.noDreamsFound}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDreams.map((dream) => (
              <div
                key={dream.id}
                onClick={() => {
                  if (dream.status === 'completed') {
                    setSelectedDream(dream);
                  }
                }}
                className={`bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300 relative group overflow-hidden min-h-[400px] ${
                  dream.status === 'completed' ? 'cursor-pointer' : ''
                }`}
              >
                {/* Pending/Processing durumunda loading ikonu göster - Tüm analizler için */}
                {(dream.status === 'pending' || dream.status === 'processing') ? (
                  <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-900/95 backdrop-blur-md rounded-xl h-full">
                    <div className="relative flex flex-col items-center justify-center gap-4 p-8">
                      {/* Glow effect */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-48 bg-gradient-to-br from-purple-500/70 via-pink-500/70 to-purple-500/70 rounded-full blur-3xl animate-pulse"></div>
                      </div>
                      
                      {/* Main loading icon */}
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <Loader2 
                          size={80} 
                          className="animate-spin text-purple-400 relative z-10" 
                          strokeWidth={3.5}
                          style={{ 
                            filter: 'drop-shadow(0 0 20px rgba(196, 181, 253, 0.9)) drop-shadow(0 0 40px rgba(236, 72, 153, 0.7))',
                            animationDuration: '1s'
                          }} 
                        />
                        {/* Outer rotating ring */}
                        <div className="absolute inset-0 -m-6 border-4 border-transparent border-t-purple-400/60 border-r-pink-400/60 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
                        <div className="absolute inset-0 -m-8 border-4 border-transparent border-b-purple-400/40 border-l-pink-400/40 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div
                      onClick={() => setSelectedDream(dream)}
                      className="cursor-pointer relative z-10"
                    >
                      {/* Show images for analyses with images */}
                      {(() => {
                        const images = getDreamImages(dream);
                        return images.length > 0;
                      })() && (() => {
                        const images = getDreamImages(dream);
                        if (images.length === 0) return null;
                        
                        const currentIndex = carouselIndices[dream.id] || 0;
                        const currentImage = images[currentIndex];
                        
                        // Calculate original image index
                        const originalImages = getOriginalImages(dream);
                        const currentImageUrl = currentImage;
                        let originalImageIndex = originalImages.findIndex(img => img === currentImageUrl);
                        if (originalImageIndex === -1) originalImageIndex = 0;
                        
                        // Check if current image is primary
                        const isPrimary = dream.primary_image_index === originalImageIndex;
                        
                        return (
                          <div 
                            className="overflow-hidden rounded-lg relative group/image"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={() => handleTouchEnd(dream.id, images)}
                            onClick={(e) => {
                              // Only open lightbox if clicking on the image itself, not on buttons
                              const target = e.target as HTMLElement;
                              if (target.tagName === 'IMG') {
                                e.stopPropagation();
                                setLightboxImage(currentImage);
                              }
                            }}
                          >
                            <img
                              src={currentImage}
                              alt="Dream visualization"
                              className="w-full h-64 md:h-80 object-contain group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                            />
                            
                            {/* Carousel indicators */}
                            {images.length > 1 && (
                              <>
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
                                  {images.map((_, idx) => (
                                    <div
                                      key={idx}
                                      className={`h-1.5 rounded-full transition-all ${
                                        idx === currentIndex
                                          ? 'bg-white w-6'
                                          : 'bg-white/50 w-1.5'
                                      }`}
                                    />
                                  ))}
                                </div>
                                
                                {/* Navigation arrows - always visible when multiple images */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (currentIndex > 0) {
                                      setCarouselIndices({ ...carouselIndices, [dream.id]: currentIndex - 1 });
                                    }
                                  }}
                                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all z-20 md:block hidden"
                                  disabled={currentIndex === 0}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                >
                                  <ChevronLeft size={20} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (currentIndex < images.length - 1) {
                                      setCarouselIndices({ ...carouselIndices, [dream.id]: currentIndex + 1 });
                                    }
                                  }}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all z-20 md:block hidden"
                                  disabled={currentIndex === images.length - 1}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                >
                                  <ChevronRight size={20} />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* For text analyses (no images), show dream and analysis text */}
                      {(() => {
                        const images = getDreamImages(dream);
                        if (images.length === 0 && dream.status === 'completed') {
                          return (
                            <>
                              <div className="flex items-center gap-2 text-slate-500 text-sm mb-3">
                                <Calendar size={14} />
                                {formatDate(dream.created_at)}
                              </div>
                              <div className="mb-4">
                                <h3 className="text-sm font-semibold text-purple-400 mb-2">{t.library.yourDream}</h3>
                                <p className="text-slate-300 text-sm leading-relaxed line-clamp-4 group-hover:text-slate-200 transition-colors">
                                  {getDreamText(dream, language)}
                                </p>
                              </div>
                              {getAnalysisText(dream, language) && (
                                <div className="mb-4">
                                  <h3 className="text-sm font-semibold text-pink-400 mb-2">{t.library.analysis}</h3>
                                  <p className="text-slate-300 text-sm leading-relaxed line-clamp-4 group-hover:text-slate-200 transition-colors">
                                    {getAnalysisText(dream, language)}
                                  </p>
                                </div>
                              )}
                            </>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Butonlar görselin altında, kompakt - sadece completed durumunda göster */}
                      {dream.status === 'completed' && (
                        <div className="flex gap-1.5 mt-4 mb-4 justify-end flex-wrap">
                          {/* Primary Image Button - Only for premium users with multiple images */}
                          {(() => {
                            const images = getDreamImages(dream);
                            if (isPremium && images.length > 1) {
                              const originalImages = getOriginalImages(dream);
                              const currentIndex = carouselIndices[dream.id] || 0;
                              const currentImage = images[currentIndex];
                              let originalImageIndex = originalImages.findIndex(img => img === currentImage);
                              if (originalImageIndex === -1) originalImageIndex = 0;
                              const isPrimary = dream.primary_image_index === originalImageIndex;
                              
                              return (
                                <button
                                  onClick={(e) => {
                                    if (!isPrimary) {
                                      setPrimaryImage(dream.id, originalImageIndex, e);
                                    } else {
                                      e.stopPropagation();
                                    }
                                  }}
                                  className={`p-2 rounded-lg border transition-all duration-300 hover:scale-110 ${
                                    isPrimary
                                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30'
                                      : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-yellow-500/50 hover:text-yellow-400 hover:bg-slate-700/50'
                                  }`}
                                  title={isPrimary ? 'Kapak görseli' : 'Kapak görseli olarak ayarla'}
                                >
                                  <Star size={16} className={isPrimary ? 'fill-current' : ''} />
                                </button>
                              );
                            }
                            return null;
                          })()}
                          {(() => {
                            const images = getDreamImages(dream);
                            return images.length > 0;
                          })() && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const images = getDreamImages(dream);
                                const currentIndex = carouselIndices[dream.id] || 0;
                                const currentImage = images[currentIndex];
                                handleDownloadImage(currentImage, dream.id, e);
                              }}
                              className="p-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg text-purple-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/30"
                              title={t.library.download}
                            >
                              <Download size={16} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleTogglePrivacy(dream.id, dream.is_public || false, e)}
                            className={`p-2 rounded-lg border transition-all duration-300 hover:scale-110 ${
                              dream.is_public
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                                : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-slate-700/50'
                            }`}
                            title={dream.is_public ? t.library.makePrivate : t.library.makePublic}
                          >
                            {dream.is_public ? <Globe size={16} /> : <Lock size={16} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(dream.id, e);
                            }}
                            className={`p-2 rounded-lg border transition-all duration-300 hover:scale-110 ${
                              dream.is_favorite
                                ? 'bg-pink-500/20 border-pink-500/50 text-pink-400 hover:bg-pink-500/30'
                                : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-pink-500/50 hover:text-pink-400 hover:bg-slate-700/50'
                            }`}
                            title={dream.is_favorite ? t.library.removeFromFavorites : t.library.addToFavorites}
                          >
                            <Heart size={16} className={dream.is_favorite ? 'fill-current' : ''} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDream(dream.id, e);
                            }}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/30"
                            title={t.library.delete}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      
                      {/* For visual analyses, show date and dream text preview */}
                      {(() => {
                        const images = getDreamImages(dream);
                        if (images.length > 0) {
                          return (
                            <>
                              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                <Calendar size={14} />
                                {formatDate(dream.created_at)}
                              </div>
                              <p className="text-slate-300 line-clamp-3 group-hover:text-slate-200 transition-colors">
                                {getDreamText(dream, language)}
                              </p>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDream && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setSelectedDream(null)}
        >
          <div
            className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-500/20 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Calendar size={14} />
                  {formatDate(selectedDream.created_at)}
                </div>
                <h2 className="text-xl font-semibold text-white">{t.library.dreamEntry}</h2>
              </div>
              <button
                onClick={() => setSelectedDream(null)}
                className="text-slate-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* Layout: Image Left (if has images), Content Right */}
            <div className={`flex flex-1 overflow-hidden ${(() => {
              const images = getDreamImages(selectedDream);
              return images.length === 0 ? '' : '';
            })()}`}>
              {/* Dream Image - Left Side (only for analyses with images) */}
              {(() => {
                const images = getDreamImages(selectedDream);
                return images.length > 0;
              })() && (
                <div className="w-1/2 flex-shrink-0 bg-slate-950 overflow-hidden relative">
                  {(() => {
                    const images = getDreamImages(selectedDream);
                    if (images.length === 0) {
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                          <BookOpen className="text-purple-400/50" size={64} />
                        </div>
                      );
                    }
                    
                    const modalIndex = carouselIndices[`modal-${selectedDream.id}`] || 0;
                    const currentImage = images[modalIndex];
                    
                    // Calculate original image index for modal
                    const originalImages = getOriginalImages(selectedDream);
                    const currentImageUrl = currentImage;
                    let originalImageIndex = originalImages.findIndex(img => img === currentImageUrl);
                    if (originalImageIndex === -1) originalImageIndex = 0;
                    
                    // Check if current image is primary
                    const isPrimary = selectedDream.primary_image_index === originalImageIndex;
                    
                    return (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <img
                          src={currentImage}
                          alt="Dream visualization"
                          className="max-w-full max-h-full object-contain cursor-zoom-in"
                          onClick={() => setLightboxImage(currentImage)}
                        />
                        
                        {images.length > 1 && (
                          <>
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                              {images.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCarouselIndices({ ...carouselIndices, [`modal-${selectedDream.id}`]: idx });
                                  }}
                                  className={`h-2 rounded-full transition-all ${
                                    idx === modalIndex
                                      ? 'bg-white w-8'
                                      : 'bg-white/50 w-2 hover:bg-white/75'
                                  }`}
                                />
                              ))}
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (modalIndex > 0) {
                                  setCarouselIndices({ ...carouselIndices, [`modal-${selectedDream.id}`]: modalIndex - 1 });
                                }
                              }}
                              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={modalIndex === 0}
                            >
                              <ChevronLeft size={24} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (modalIndex < images.length - 1) {
                                  setCarouselIndices({ ...carouselIndices, [`modal-${selectedDream.id}`]: modalIndex + 1 });
                                }
                              }}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={modalIndex === images.length - 1}
                            >
                              <ChevronRight size={24} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Content Right Side (or Full Width for basic analysis) */}
              <div className={`flex flex-col overflow-y-auto ${(selectedDream.analysis_type === 'basic' || selectedDream.analysis_type === 'advanced') ? 'w-full' : 'flex-1'}`}>
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">{t.library.yourDream}</h3>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {getDreamText(selectedDream, language)}
                    </p>
                  </div>

                  {getAnalysisText(selectedDream, language) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-pink-400 mb-2">{t.library.analysis}</h3>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {getAnalysisText(selectedDream, language)}
                      </p>
                    </div>
                  )}

                  {/* Action buttons in modal */}
                  <div className="pt-6 border-t border-purple-500/20 flex gap-2 flex-wrap">
                    {/* Primary Image Button - Only for premium users with multiple images */}
                    {(() => {
                      const images = getDreamImages(selectedDream);
                      if (isPremium && images.length > 1) {
                        const modalIndex = carouselIndices[`modal-${selectedDream.id}`] || 0;
                        const originalImages = getOriginalImages(selectedDream);
                        const currentImage = images[modalIndex];
                        let originalImageIndex = originalImages.findIndex(img => img === currentImage);
                        if (originalImageIndex === -1) originalImageIndex = 0;
                        const isPrimary = selectedDream.primary_image_index === originalImageIndex;
                        
                        return (
                          <button
                            onClick={(e) => {
                              if (!isPrimary) {
                                setPrimaryImage(selectedDream.id, originalImageIndex, e);
                              } else {
                                e.stopPropagation();
                              }
                            }}
                            className={`p-2.5 rounded-lg border transition-all duration-300 hover:scale-110 ${
                              isPrimary
                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30'
                                : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-yellow-500/50 hover:text-yellow-400 hover:bg-slate-700/50'
                            }`}
                            title={isPrimary ? 'Kapak görseli' : 'Kapak görseli olarak ayarla'}
                          >
                            <Star size={18} className={isPrimary ? 'fill-current' : ''} />
                          </button>
                        );
                      }
                      return null;
                    })()}
                    {/* Download Button - Only for dreams with images */}
                    {(() => {
                      const images = getDreamImages(selectedDream);
                      if (images.length > 0) {
                        const modalIndex = carouselIndices[`modal-${selectedDream.id}`] || 0;
                        const currentImage = images[modalIndex];
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadImage(currentImage, selectedDream.id, e);
                            }}
                            className="p-2.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg text-purple-400 transition-all duration-300 hover:scale-110"
                            title={t.library.download}
                          >
                            <Download size={18} />
                          </button>
                        );
                      }
                      return null;
                    })()}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePrivacy(selectedDream.id, selectedDream.is_public || false, e);
                      }}
                      className={`p-2.5 rounded-lg border transition-all duration-300 hover:scale-110 ${
                        selectedDream.is_public
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                          : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-slate-700/50'
                      }`}
                      title={selectedDream.is_public ? t.library.makePrivate : t.library.makePublic}
                    >
                      {selectedDream.is_public ? <Globe size={18} /> : <Lock size={18} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(selectedDream.id, e);
                      }}
                      className={`p-2.5 rounded-lg border transition-all duration-300 hover:scale-110 ${
                        selectedDream.is_favorite
                          ? 'bg-pink-500/20 border-pink-500/50 text-pink-400 hover:bg-pink-500/30'
                          : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-pink-500/50 hover:text-pink-400 hover:bg-slate-700/50'
                      }`}
                      title={selectedDream.is_favorite ? t.library.removeFromFavorites : t.library.addToFavorites}
                    >
                      <Heart size={18} className={selectedDream.is_favorite ? 'fill-current' : ''} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDream(selectedDream.id, e);
                      }}
                      className="p-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/30"
                      title={t.library.delete}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Dream visualization - full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
