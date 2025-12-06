import { useState, useEffect, useRef } from 'react';
import { BookOpen, Calendar, Loader2, Search, Trash2, Heart, ChevronLeft, ChevronRight, X, Download, Globe, Lock } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';
import { getDreamText, getAnalysisText } from '../lib/translateDream';

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
  created_at: string;
  status: string;
  is_favorite?: boolean;
  is_public?: boolean;
}

export default function Library() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({
    total: 0,
    public: 0,
    private: 0,
  });
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem(`favorites_${user.id}`);
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }

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

      // Delete the dream - only allow deleting own dreams
      const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId)
        .eq('user_id', user.id);

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
    setDreams((prev) =>
      prev.map((dream) =>
        dream.id === dreamId ? { ...dream, is_favorite: newFavorites.has(dreamId) } : dream
      )
    );
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

  // Helper function to get all available images for a dream
  const getDreamImages = (dream: Dream): string[] => {
    const images: string[] = [];
    if (dream.image_url) images.push(dream.image_url);
    if (dream.image_url_2) images.push(dream.image_url_2);
    if (dream.image_url_3) images.push(dream.image_url_3);
    return images;
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
      (filterStatus === 'completed' && dream.status === 'completed') ||
      (filterStatus === 'pending' && dream.status === 'pending') ||
      (filterStatus === 'favorites' && dream.is_favorite);

    return matchesSearch && matchesFilter;
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
              <div className="text-xs text-slate-400">Total Dreams</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-lg px-4 py-2">
              <div className="text-lg font-semibold text-white">{stats.public}</div>
              <div className="text-xs text-slate-400">Public Dreams</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-pink-500/20 rounded-lg px-4 py-2">
              <div className="text-lg font-semibold text-white">{stats.private}</div>
              <div className="text-xs text-slate-400">Private Dreams</div>
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
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                }`}
              >
                All
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
                Favorites
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'completed'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'pending'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
                }`}
              >
                Pending
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
                className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300 relative group overflow-hidden"
              >
                {/* Pending/Processing durumunda sadece büyük loading ikonu göster */}
                {(dream.status === 'pending' || dream.status === 'processing') ? (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="relative">
                      {/* Outer glow rings */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/40 via-pink-500/40 to-blue-500/40 rounded-full blur-2xl animate-pulse scale-150"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-blue-400/30 rounded-full blur-xl animate-pulse scale-125" style={{ animationDelay: '0.5s' }}></div>
                      
                      {/* Main icon container */}
                      <div className="relative p-8 bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-blue-500/30 rounded-full backdrop-blur-md shadow-2xl border-2 border-purple-400/50">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/25 via-pink-400/25 to-blue-400/25 rounded-full animate-spin" style={{ animationDuration: '4s' }}></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/15 via-purple-400/15 to-pink-400/15 rounded-full animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                        <Loader2 size={80} className="relative animate-spin text-purple-200" strokeWidth={3.5} style={{ 
                          filter: 'drop-shadow(0 0 16px rgba(196, 181, 253, 0.9)) drop-shadow(0 0 32px rgba(236, 72, 153, 0.7)) drop-shadow(0 0 48px rgba(96, 165, 250, 0.5))',
                          animationDuration: '1.2s'
                        }} />
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
                      {(() => {
                        const images = getDreamImages(dream);
                        if (images.length === 0) return null;
                        
                        const currentIndex = carouselIndices[dream.id] || 0;
                        const currentImage = images[currentIndex];
                        
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
                      
                      {/* Butonlar görselin altında, kompakt - sadece completed durumunda göster */}
                      {dream.status === 'completed' && (
                        <div className="flex gap-1.5 mt-4 mb-4 justify-end flex-wrap">
                          {(() => {
                            const images = getDreamImages(dream);
                            if (images.length > 0) {
                              const currentIndex = carouselIndices[dream.id] || 0;
                              const currentImage = images[currentIndex];
                              return (
                                <button
                                  onClick={(e) => handleDownloadImage(currentImage, dream.id, e)}
                                  className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/30"
                                  title={t.library.download}
                                >
                                  <Download size={16} />
                                </button>
                              );
                            }
                            return null;
                          })()}
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
                      
                      <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                        <Calendar size={14} />
                        {formatDate(dream.created_at)}
                      </div>
                      <p className="text-slate-300 line-clamp-3 group-hover:text-slate-200 transition-colors">
                        {getDreamText(dream, language)}
                      </p>
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
                <h2 className="text-xl font-semibold text-white">Dream Entry</h2>
              </div>
              <button
                onClick={() => setSelectedDream(null)}
                className="text-slate-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* Horizontal Layout: Image Left, Content Right */}
            <div className="flex flex-1 overflow-hidden">
              {/* Dream Image - Left Side */}
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
                  
                  return (
                    <div className="w-full h-full flex items-center justify-center">
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

              {/* Content Right Side */}
              <div className="flex-1 flex flex-col overflow-y-auto">
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

                  {selectedDream.status === 'pending' && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400">
                      {t.library.processingMessage}
                    </div>
                  )}

                  {/* Action buttons in modal */}
                  <div className="pt-6 border-t border-purple-500/20 flex gap-2 flex-wrap">
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
