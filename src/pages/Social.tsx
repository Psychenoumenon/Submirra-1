import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, User, Loader2, Send, TrendingUp, Clock, Filter, Search, Users, Share2, Trash2, Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';
import { getDreamText, getAnalysisText } from '../lib/translateDream';

interface PublicDream {
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
  user_id: string;
  status?: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    username?: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

type SortOption = 'recent' | 'popular' | 'trending';
type FilterOption = 'all' | 'following';

export default function Social() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [dreams, setDreams] = useState<PublicDream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDream, setSelectedDream] = useState<PublicDream | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastDreamElementRef = useRef<HTMLDivElement | null>(null);
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Helper function to get all available images for a dream
  const getDreamImages = (dream: PublicDream): string[] => {
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

  useEffect(() => {
    loadPublicDreams();
    if (user) {
      loadFollowingUsers();
    }
  }, [user, sortBy, filterBy]);

  useEffect(() => {
    // Infinite scroll observer
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreDreams();
        }
      },
      { threshold: 0.1 }
    );

    if (lastDreamElementRef.current) {
      observerRef.current.observe(lastDreamElementRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loadingMore, loading, dreams]);

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

  const loadFollowingUsers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (error) throw error;
      
      setFollowingUsers(new Set((data || []).map(f => f.following_id)));
    } catch (error) {
      console.error('Error loading following users:', error);
    }
  };

  const loadPublicDreams = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
        setDreams([]);
      } else {
        setLoadingMore(true);
      }
      
      const currentPage = reset ? 0 : page + 1;
      const limit = 10;
      const offset = currentPage * limit;

      // Build query
      let query = supabase
        .from('dreams')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('is_public', true)
        .in('status', ['completed', 'pending']); // Show both completed and pending public dreams

      // Apply filter
      if (filterBy === 'following' && user) {
        const followingIds = Array.from(followingUsers);
        if (followingIds.length === 0) {
          setDreams([]);
          setHasMore(false);
          setLoading(false);
          setLoadingMore(false);
          return;
        }
        query = query.in('user_id', followingIds);
      }

      // Apply search
      if (searchQuery.trim()) {
        query = query.or(`dream_text.ilike.%${searchQuery}%,analysis_text.ilike.%${searchQuery}%`);
      }

      // Apply sorting
      if (sortBy === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'popular') {
        // For popular, we'll need to join with likes count
        // For now, order by created_at and we'll sort client-side
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'trending') {
        // Trending: recent dreams with high engagement
        query = query.order('created_at', { ascending: false });
      }

      query = query.range(offset, offset + limit - 1);

      let { data: dreamsData, error: dreamsError } = await query;

      if (dreamsError) {
        // If error is about is_public column, try without it and filter client-side
        if (dreamsError.message?.includes('is_public') || dreamsError.code === '42703' || dreamsError.code === 'PGRST116') {
          console.warn('is_public column not found. Please run migration to enable public dreams feature.');
          
          let retryQuery = supabase
            .from('dreams')
            .select(`
              *,
              profiles:user_id (
                full_name,
                avatar_url,
                username
              )
            `)
            .in('status', ['completed', 'pending']); // Show both completed and pending public dreams
          
          // Apply filter
          if (filterBy === 'following' && user) {
            const followingIds = Array.from(followingUsers);
            if (followingIds.length === 0) {
              setDreams([]);
              setHasMore(false);
              setLoading(false);
              setLoadingMore(false);
              return;
            }
            retryQuery = retryQuery.in('user_id', followingIds);
          }

          // Apply search
          if (searchQuery.trim()) {
            retryQuery = retryQuery.or(`dream_text.ilike.%${searchQuery}%,analysis_text.ilike.%${searchQuery}%`);
          }

          // Apply sorting
          if (sortBy === 'recent') {
            retryQuery = retryQuery.order('created_at', { ascending: false });
          } else if (sortBy === 'popular') {
            retryQuery = retryQuery.order('created_at', { ascending: false });
          } else if (sortBy === 'trending') {
            retryQuery = retryQuery.order('created_at', { ascending: false });
          }

          retryQuery = retryQuery.range(offset, offset + limit - 1);
          
          const { data, error: retryError } = await retryQuery;
          
          if (retryError) {
            console.error('Error loading dreams:', retryError);
            throw retryError;
          }
          
          dreamsData = data;
          
          // Filter client-side - show all completed dreams if is_public column doesn't exist
          // This is a fallback for backward compatibility
          if (dreamsData) {
            dreamsData = dreamsData.filter(dream => {
              // If is_public exists, only show public ones
              // If it doesn't exist (undefined), show all (backward compatibility)
              return dream.is_public === true || dream.is_public === undefined;
            });
          }
        } else {
          console.error('Error loading dreams:', dreamsError);
          throw dreamsError;
        }
      }

      // Get likes count and check if user liked
      const dreamIds = (dreamsData || []).map(d => d.id);
      
      let likesData: any[] | null = null;
      let commentsData: any[] | null = null;

      if (dreamIds.length > 0) {
        // Try to get likes, but handle if table doesn't exist
        try {
          const { data: likes } = await supabase
            .from('dream_likes')
            .select('dream_id, user_id')
            .in('dream_id', dreamIds);
          likesData = likes;
        } catch (e) {
          // Table might not exist yet
          likesData = [];
        }

        try {
          const { data: comments } = await supabase
            .from('dream_comments')
            .select('dream_id')
            .in('dream_id', dreamIds);
          commentsData = comments;
        } catch (e) {
          // Table might not exist yet
          commentsData = [];
        }

        // Count likes and comments per dream
        const likesMap = new Map<string, number>();
        const commentsMap = new Map<string, number>();
        const userLikesSet = new Set<string>();

        (likesData || []).forEach(like => {
          likesMap.set(like.dream_id, (likesMap.get(like.dream_id) || 0) + 1);
          if (user && like.user_id === user.id) {
            userLikesSet.add(like.dream_id);
          }
        });

        (commentsData || []).forEach(comment => {
          commentsMap.set(comment.dream_id, (commentsMap.get(comment.dream_id) || 0) + 1);
        });

        const dreamsWithStats = (dreamsData || []).map(dream => ({
          ...dream,
          likes_count: likesMap.get(dream.id) || 0,
          comments_count: commentsMap.get(dream.id) || 0,
          is_liked: userLikesSet.has(dream.id),
          profiles: dream.profiles || { full_name: 'Anonymous', avatar_url: null, username: null }
        }));

        // Sort by popularity if needed
        if (sortBy === 'popular') {
          dreamsWithStats.sort((a, b) => {
            const aScore = a.likes_count * 2 + a.comments_count;
            const bScore = b.likes_count * 2 + b.comments_count;
            return bScore - aScore;
          });
        } else if (sortBy === 'trending') {
          // Trending: recent + engagement
          dreamsWithStats.sort((a, b) => {
            const aDate = new Date(a.created_at).getTime();
            const bDate = new Date(b.created_at).getTime();
            const daysDiff = (Date.now() - aDate) / (1000 * 60 * 60 * 24);
            const aScore = (a.likes_count * 2 + a.comments_count) / (daysDiff + 1);
            const bScore = (b.likes_count * 2 + b.comments_count) / (daysDiff + 1);
            return bScore - aScore;
          });
        }

        if (reset) {
          setDreams(dreamsWithStats);
        } else {
          setDreams(prev => [...prev, ...dreamsWithStats]);
        }

        setHasMore(dreamsWithStats.length === limit);
        setPage(currentPage);
      } else {
        if (reset) setDreams([]);
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error loading public dreams:', error);
      
      // More specific error messages
      if (error?.message?.includes('is_public') || error?.code === '42703' || error?.code === 'PGRST116') {
        showToast('Please run the database migration to enable social features', 'error');
      } else if (error?.message?.includes('permission') || error?.code === '42501') {
        showToast('Permission denied. Please check your database permissions.', 'error');
      } else {
        showToast('Failed to load dreams. Please try again later.', 'error');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreDreams = () => {
    if (!loadingMore && hasMore) {
      loadPublicDreams(false);
    }
  };

  const searchUsersByName = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      setSearchingUsers(true);
      
      // Get blocked users first
      let blockedUserIds: string[] = [];
      if (user) {
        const { data: blockedData } = await supabase
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);
        
        blockedUserIds = (blockedData || []).map(block => block.blocked_id);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out blocked users and current user
      const filteredUsers = (data || []).filter(userProfile => 
        userProfile.id !== user?.id && !blockedUserIds.includes(userProfile.id)
      );

      setSearchUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (showUserSearch) {
        searchUsersByName(userSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery, showUserSearch]);

  const handleLike = async (dreamId: string) => {
    if (!user) {
      navigate('/signin');
      return;
    }

    try {
      const dream = dreams.find(d => d.id === dreamId);
      if (!dream) return;

      if (dream.is_liked) {
        // Unlike
        const { error } = await supabase
          .from('dream_likes')
          .delete()
          .eq('dream_id', dreamId)
          .eq('user_id', user.id);

        if (error) throw error;

        setDreams(prev => prev.map(d =>
          d.id === dreamId
            ? { ...d, is_liked: false, likes_count: d.likes_count - 1 }
            : d
        ));
      } else {
        // Like
        const { error } = await supabase
          .from('dream_likes')
          .insert({
            dream_id: dreamId,
            user_id: user.id
          });

        if (error) throw error;

        setDreams(prev => prev.map(d =>
          d.id === dreamId
            ? { ...d, is_liked: true, likes_count: d.likes_count + 1 }
            : d
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      showToast('Failed to update like', 'error');
    }
  };

  const handleDeleteDream = async (dreamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/signin');
      return;
    }

    if (!confirm(t.social.deleteConfirm)) {
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

      // Delete the dream
      const { error } = await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId)
        .eq('user_id', user.id); // Only allow deleting own dreams

      if (error) throw error;

      // Remove from local state
      setDreams(prev => prev.filter(d => d.id !== dreamId));
      
      // Close modal if it's the deleted dream
      if (selectedDream?.id === dreamId) {
        setSelectedDream(null);
      }

      showToast(t.social.dreamDeleted, 'success');
    } catch (error) {
      console.error('Error deleting dream:', error);
      showToast(t.social.deleteFailed, 'error');
    }
  };

  const loadComments = async (dreamId: string) => {
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from('dream_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('dream_id', dreamId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setComments((data || []).map(comment => ({
        ...comment,
        profiles: comment.profiles || { full_name: 'Anonymous', avatar_url: null }
      })));
    } catch (error) {
      console.error('Error loading comments:', error);
      showToast('Failed to load comments', 'error');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleComment = async () => {
    if (!user) {
      navigate('/signin');
      return;
    }

    if (!selectedDream || !newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const { error } = await supabase
        .from('dream_comments')
        .insert({
          dream_id: selectedDream.id,
          user_id: user.id,
          comment_text: newComment.trim()
        });

      if (error) throw error;

      // Reload comments
      await loadComments(selectedDream.id);
      
      // Update comments count
      setDreams(prev => prev.map(d =>
        d.id === selectedDream.id
          ? { ...d, comments_count: d.comments_count + 1 }
          : d
      ));

      setNewComment('');
      showToast(t.social.commentAdded, 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast(t.social.commentFailed, 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !selectedDream) return;

    try {
      const { error } = await supabase
        .from('dream_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id); // Only allow deleting own comments

      if (error) throw error;

      // Reload comments
      await loadComments(selectedDream.id);
      
      // Update comments count in the dream
      if (selectedDream) {
        setSelectedDream({
          ...selectedDream,
          comments_count: Math.max(0, selectedDream.comments_count - 1)
        });
        
        // Update in dreams list
        setDreams(prev => prev.map(dream => 
          dream.id === selectedDream.id 
            ? { ...dream, comments_count: Math.max(0, dream.comments_count - 1) }
            : dream
        ));
      }
      
      showToast(t.social.commentDeleted, 'success');
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast(t.social.commentDeleteFailed, 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t.social.justNow;
    if (minutes < 60) return `${minutes}${t.social.minutesAgo}`;
    if (hours < 24) return `${hours}${t.social.hoursAgo}`;
    if (days < 7) return `${days}${t.social.daysAgo}`;
    
    const locale = language === 'tr' ? 'tr-TR' : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const openDreamModal = (dream: PublicDream) => {
    setSelectedDream(dream);
    setComments([]);
    setNewComment('');
    loadComments(dream.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen relative pt-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto z-10">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight" style={{WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility', fontFeatureSettings: '"kern" 1', WebkitTextStroke: '0.5px rgba(236, 72, 153, 0.3)'}}>
            {t.social.title}
          </h1>
          <p className="text-slate-400 text-lg">
            {t.social.subtitle}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Tabs */}
          <div className="flex gap-2 border-b border-purple-500/20">
            <button
              onClick={() => setShowUserSearch(false)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                !showUserSearch
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t.social.searchDreams}
            </button>
            <button
              onClick={() => setShowUserSearch(true)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                showUserSearch
                  ? 'text-purple-400 border-b-2 border-purple-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {t.social.searchUsers}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            {showUserSearch ? (
              <>
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={t.social.searchUsersPlaceholder}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 backdrop-blur-sm border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                />
                {userSearchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-purple-500/30 rounded-lg shadow-2xl max-h-96 overflow-y-auto z-50">
                    {searchingUsers ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-purple-400" size={24} />
                      </div>
                    ) : searchUsers.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <p>{t.social.noUsersFound}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-purple-500/10">
                        {searchUsers.map((userProfile) => (
                          <button
                            key={userProfile.id}
                            onClick={() => {
                              navigate(`/profile/${userProfile.id}`);
                              setShowUserSearch(false);
                              setUserSearchQuery('');
                            }}
                            className="w-full p-4 text-left hover:bg-slate-950/50 transition-colors flex items-center gap-3"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {userProfile.avatar_url ? (
                                <img
                                  src={userProfile.avatar_url}
                                  alt={userProfile.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="text-pink-400" size={20} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold truncate">
                                {userProfile.full_name || userProfile.username || t.social.anonymous}
                              </p>
                              {userProfile.username && (
                                <p className="text-slate-400 text-sm truncate">@{userProfile.username}</p>
                              )}
                              {userProfile.bio && (
                                <p className="text-slate-500 text-xs truncate mt-1">{userProfile.bio}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setTimeout(() => loadPublicDreams(true), 500);
                }}
                placeholder={t.social.searchDreamsPlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 backdrop-blur-sm border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
              />
            )}
          </div>

          {/* Filter and Sort */}
          <div className="flex flex-wrap gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-2">
              <Filter size={18} className="text-slate-400" />
              <button
                onClick={() => {
                  setFilterBy('all');
                  loadPublicDreams(true);
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  filterBy === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {t.social.all}
              </button>
              {user && (
                <button
                  onClick={() => {
                    setFilterBy('following');
                    loadPublicDreams(true);
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all flex items-center gap-1 ${
                    filterBy === 'following'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Users size={14} />
                  {t.social.following}
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-2">
              <button
                onClick={() => {
                  setSortBy('recent');
                  loadPublicDreams(true);
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-all flex items-center gap-1 ${
                  sortBy === 'recent'
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Clock size={14} />
                {t.social.recent}
              </button>
              <button
                onClick={() => {
                  setSortBy('popular');
                  loadPublicDreams(true);
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-all flex items-center gap-1 ${
                  sortBy === 'popular'
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Heart size={14} />
                {t.social.popular}
              </button>
              <button
                onClick={() => {
                  setSortBy('trending');
                  loadPublicDreams(true);
                }}
                className={`px-3 py-1 rounded text-sm font-medium transition-all flex items-center gap-1 ${
                  sortBy === 'trending'
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <TrendingUp size={14} />
                {t.social.trending}
              </button>
            </div>
          </div>
        </div>

        {dreams.length === 0 ? (
          <div className="text-center py-20">
            <User className="mx-auto mb-4 text-slate-600" size={64} />
            <p className="text-slate-400 text-lg mb-6">{t.social.noDreams}</p>
            <button
              onClick={() => navigate('/analyze')}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
            >
              {t.social.shareFirst}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {dreams.map((dream, index) => (
              <div
                key={dream.id}
                ref={index === dreams.length - 1 ? lastDreamElementRef : null}
                className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all duration-300 group"
              >
                {/* Dream Image - Instagram Style with Carousel */}
                <div 
                  className="relative aspect-square bg-slate-950 overflow-hidden group/image cursor-pointer"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => {
                    const images = getDreamImages(dream);
                    handleTouchEnd(dream.id, images);
                  }}
                  onClick={(e) => {
                    // Open modal when clicking on image container, but not on navigation buttons
                    const target = e.target as HTMLElement;
                    const isButton = target.closest('button') || target.tagName === 'BUTTON';
                    if (!isButton) {
                      openDreamModal(dream);
                    }
                  }}
                >
                  {(() => {
                    const images = getDreamImages(dream);
                    if (images.length === 0) {
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                          <Sparkles className="text-purple-400/50" size={48} />
                        </div>
                      );
                    }
                    
                    const currentIndex = carouselIndices[dream.id] || 0;
                    const currentImage = images[currentIndex];
                    
                    return (
                      <>
                        <img
                          src={currentImage}
                          alt="Dream visualization"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 image-clickable cursor-pointer"
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
                      </>
                    );
                  })()}
                  
                  
                  {/* Overlay on hover */}
                  <div 
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none"
                  >
                    <div className="flex items-center gap-6 text-white pointer-events-none">
                      <div className="flex items-center gap-2">
                        <Heart size={24} className={dream.is_liked ? 'fill-current text-pink-400' : ''} />
                        <span className="font-semibold">{dream.likes_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle size={24} />
                        <span className="font-semibold">{dream.comments_count}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {dream.status === 'pending' && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-yellow-500/90 text-yellow-900 text-xs font-semibold rounded-full backdrop-blur-sm">
                        {t.social.pending}
                      </span>
                    </div>
                  )}

                  {/* User info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${dream.user_id}`);
                        }}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-white/30 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform"
                      >
                        {dream.profiles.avatar_url ? (
                          <img
                            src={dream.profiles.avatar_url}
                            alt={dream.profiles.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="text-pink-400" size={16} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${dream.user_id}`);
                          }}
                          className="text-white font-semibold text-sm hover:text-purple-300 transition-colors truncate"
                        >
                          {dream.profiles.full_name || dream.profiles.username || t.social.anonymous}
                        </button>
                        <p className="text-white/70 text-xs">{formatDate(dream.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Bar - Instagram Style */}
                <div className="p-4 bg-slate-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(dream.id);
                        }}
                        className={`transition-all hover:scale-110 ${
                          dream.is_liked
                            ? 'text-pink-400'
                            : 'text-slate-400 hover:text-pink-400'
                        }`}
                      >
                        <Heart size={24} className={dream.is_liked ? 'fill-current' : ''} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDreamModal(dream);
                        }}
                        className="text-slate-400 hover:text-purple-400 transition-all hover:scale-110"
                      >
                        <MessageCircle size={24} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigator.share) {
                            navigator.share({
                              title: t.social.checkOutDream,
                              text: dream.dream_text.substring(0, 100),
                              url: window.location.href
                            });
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            showToast(t.social.linkCopied, 'success');
                          }
                        }}
                        className="text-slate-400 hover:text-cyan-400 transition-all hover:scale-110"
                      >
                        <Share2 size={24} />
                      </button>
                      {user && dream.user_id === user.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDream(dream.id, e);
                          }}
                          className="text-slate-400 hover:text-red-400 transition-all hover:scale-110 ml-auto"
                          title={t.social.deleteDream}
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Likes and Comments Count */}
                  <div className="mb-2">
                    {dream.likes_count > 0 && (
                      <p className="text-white font-semibold text-sm">
                        {dream.likes_count} {dream.likes_count === 1 ? t.social.like : t.social.likes}
                      </p>
                    )}
                  </div>

                  {/* Dream Text Preview */}
                  <div 
                    className="mb-2 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDreamModal(dream);
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${dream.user_id}`);
                      }}
                      className="text-white font-semibold text-sm hover:text-purple-300 transition-colors mr-2"
                    >
                      {dream.profiles.full_name || dream.profiles.username || t.social.anonymous}
                    </button>
                    <span className="text-white/80 text-sm line-clamp-2">
                      {getDreamText(dream, language)}
                    </span>
                  </div>

                  {/* View Comments */}
                  {dream.comments_count > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDreamModal(dream);
                      }}
                      className="text-white/70 hover:text-white text-sm transition-colors"
                    >
                      {t.social.viewAll} {dream.comments_count} {dream.comments_count === 1 ? t.social.comment : t.social.comments}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading More */}
        {loadingMore && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-purple-400" size={32} />
          </div>
        )}

        {/* End of Feed */}
        {!hasMore && dreams.length > 0 && (
          <div className="text-center py-8 text-slate-400">
            <p>{t.social.endOfFeed}</p>
          </div>
        )}
      </div>

      {/* Dream Modal */}
      {selectedDream && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
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
                  <Clock size={14} />
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
                        <Sparkles className="text-purple-400/50" size={64} />
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
                        onClick={() => {
                          // Could add lightbox here if needed
                        }}
                      />
                      
                      {/* Carousel indicators for modal */}
                      {images.length > 1 && (
                        <>
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                            {images.map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-2 rounded-full transition-all ${
                                  idx === modalIndex
                                    ? 'bg-white w-8'
                                    : 'bg-white/50 w-2'
                                }`}
                              />
                            ))}
                          </div>
                          
                          {/* Navigation arrows for modal */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (modalIndex > 0) {
                                setCarouselIndices({ ...carouselIndices, [`modal-${selectedDream.id}`]: modalIndex - 1 });
                              }
                            }}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-opacity"
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
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-opacity"
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
                  {/* Dream Text */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">{t.library.yourDream}</h3>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {getDreamText(selectedDream, language)}
                    </p>
                  </div>

                  {/* Analysis */}
                  {getAnalysisText(selectedDream, language) && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-pink-400 mb-2">{t.library.analysis}</h3>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {getAnalysisText(selectedDream, language)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="border-t border-purple-500/20 pt-6 px-6 pb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">{t.social.comments}</h3>
                  
                  {/* Comment Input */}
                  {user ? (
                    <div className="mb-6 flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <User className="text-pink-400" size={16} />
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
                          placeholder={t.social.writeComment}
                          className="flex-1 px-4 py-2 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                        />
                        <button
                          onClick={handleComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingComment ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <Send size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-slate-950/30 rounded-lg text-center">
                      <p className="text-slate-400 mb-2">{t.social.signInToComment}</p>
                      <button
                        onClick={() => {
                          setSelectedDream(null);
                          navigate('/signin');
                        }}
                        className="text-purple-400 hover:text-purple-300"
                      >
                        {t.social.signIn}
                      </button>
                    </div>
                  )}

                  {/* Comments List */}
                  {loadingComments ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-purple-400" size={24} />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">{t.social.noComments}</p>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                          <button
                            onClick={() => navigate(`/profile/${comment.user_id}`)}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden flex-shrink-0 hover:border-purple-400/50 transition-colors"
                          >
                            {comment.profiles.avatar_url ? (
                              <img
                                src={comment.profiles.avatar_url}
                                alt={comment.profiles.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="text-pink-400" size={16} />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <button
                                onClick={() => navigate(`/profile/${comment.user_id}`)}
                                className="text-white font-semibold text-sm hover:text-purple-400 transition-colors"
                              >
                                {comment.profiles.full_name || t.social.anonymous}
                              </button>
                              <p className="text-slate-500 text-xs">{formatDate(comment.created_at)}</p>
                              {user && comment.user_id === user.id && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-red-400"
                                  title={t.social.deleteComment}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <p className="text-slate-300 text-sm">{comment.comment_text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

