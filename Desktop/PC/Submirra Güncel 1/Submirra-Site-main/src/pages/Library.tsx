import { useState, useEffect } from 'react';
import { BookOpen, Calendar, Loader2, Search, Trash2, Heart } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';

interface Dream {
  id: string;
  dream_text: string;
  analysis_text: string;
  image_url: string;
  created_at: string;
  status: string;
  is_favorite?: boolean;
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

    // Set up real-time subscription
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
          loadDreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

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

          {/* Search and Filter */}
          <div className="max-w-2xl mx-auto mb-8 space-y-4 animate-fade-in-delay">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your dreams..."
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
            <p className="text-slate-400 text-lg mb-6">No dreams found matching your search</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDreams.map((dream) => (
              <div
                key={dream.id}
                className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300 relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <button
                    onClick={(e) => toggleFavorite(dream.id, e)}
                    className={`p-2 rounded-lg border transition-all duration-300 hover:scale-110 ${
                      dream.is_favorite
                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                        : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-pink-500/50 hover:text-pink-400'
                    }`}
                    title={dream.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart size={16} className={dream.is_favorite ? 'fill-current' : ''} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteDream(dream.id, e)}
                    className="p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-400 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/30"
                    title="Delete dream"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <div
                  onClick={() => setSelectedDream(dream)}
                  className="cursor-pointer relative z-10"
                >
                  {dream.image_url && (
                    <div className="overflow-hidden rounded-lg mb-4">
                      <img
                        src={dream.image_url}
                        alt="Dream visualization"
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                    <Calendar size={14} />
                    {formatDate(dream.created_at)}
                  </div>
                  <p className="text-slate-300 line-clamp-3 group-hover:text-slate-200 transition-colors">
                    {dream.dream_text}
                  </p>
                  {dream.status === 'pending' && (
                    <span className="inline-block mt-3 px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full animate-pulse">
                      {t.library.pending}
                    </span>
                  )}
                </div>
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
            className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                    <Calendar size={14} />
                    {formatDate(selectedDream.created_at)}
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Dream Entry</h2>
                </div>
                <button
                  onClick={() => setSelectedDream(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {selectedDream.image_url && (
                <img
                  src={selectedDream.image_url}
                  alt="Dream visualization"
                  className="w-full h-auto rounded-xl mb-6 shadow-2xl"
                />
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">{t.library.yourDream}</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedDream.dream_text}
                </p>
              </div>

              {selectedDream.analysis_text && (
                <div>
                  <h3 className="text-lg font-semibold text-pink-400 mb-2">{t.library.analysis}</h3>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedDream.analysis_text}
                  </p>
                </div>
              )}

              {selectedDream.status === 'pending' && (
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400">
                  {t.library.processingMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
