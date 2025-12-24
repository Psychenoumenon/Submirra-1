import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, User, Loader2, Send, TrendingUp, Clock, Filter, Search, Users, Share2, Trash2, Sparkles, X, ChevronLeft, ChevronRight, Zap, BookOpen, Lock, Wand2, Download } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';
import { getDreamText, getAnalysisText } from '../lib/translateDream';
import { isDeveloperSync } from '../lib/developer';
import EmojiPicker from '../components/EmojiPicker';

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
  primary_image_index?: number | null;
  analysis_type?: 'basic' | 'advanced' | 'basic_visual' | 'advanced_visual' | null;
  created_at: string;
  user_id: string;
  status?: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    username?: string;
  };
  subscriptions?: {
    plan_type?: 'trial' | 'standard' | 'premium' | null;
  } | null;
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

interface Generation {
  id: string;
  user_id: string;
  source_image_url: string;
  generated_image_url: string;
  prompt: string;
  is_public: boolean;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    username?: string;
  };
  subscriptions?: {
    plan_type?: 'trial' | 'standard' | 'premium' | null;
  } | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

type SortOption = 'recent' | 'popular' | 'trending';
type FilterOption = 'all' | 'following';
type AnalysisTypeFilter = 'visual' | 'text' | 'generators';

export default function Social() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [dreams, setDreams] = useState<PublicDream[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGenerations, setLoadingGenerations] = useState(false);
  const [selectedDream, setSelectedDream] = useState<PublicDream | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [generationComments, setGenerationComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newGenerationComment, setNewGenerationComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingGenerationComments, setLoadingGenerationComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingGenerationComment, setSubmittingGenerationComment] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [analysisTypeFilter, setAnalysisTypeFilter] = useState<AnalysisTypeFilter>('visual');
  const [searchQuery, setSearchQuery] = useState('');
  const [actualSearchQuery, setActualSearchQuery] = useState('');
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const generationCommentInputRef = useRef<HTMLTextAreaElement>(null);
  const [planType, setPlanType] = useState<'free' | 'trial' | 'standard' | 'premium' | 'ruyagezer' | null | undefined>(undefined);
  const [checkingPlan, setCheckingPlan] = useState(true);

  // Helper function to get original images in order (without reordering)
  const getOriginalImages = (dream: PublicDream): string[] => {
    const images: string[] = [];
    if (dream.image_url && dream.image_url.trim() !== '') images.push(dream.image_url);
    if (dream.image_url_2 && dream.image_url_2.trim() !== '') images.push(dream.image_url_2);
    if (dream.image_url_3 && dream.image_url_3.trim() !== '') images.push(dream.image_url_3);
    return images;
  };

  // Helper function to get all available images for a dream
  // Primary image (if set) will be first in the array
  const getDreamImages = (dream: PublicDream): string[] => {
    const images = getOriginalImages(dream);
    
    // If primary_image_index is set, reorder images to put primary first
    if (dream.primary_image_index !== null && dream.primary_image_index !== undefined && dream.primary_image_index >= 0 && dream.primary_image_index < images.length) {
      const primaryImage = images[dream.primary_image_index];
      images.splice(dream.primary_image_index, 1);
      images.unshift(primaryImage);
    }
    
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

  // Check user's plan type
  useEffect(() => {
    const checkPlan = async () => {
      if (!user) {
        setCheckingPlan(false);
        return;
      }

      try {
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('plan_type')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking subscription:', error);
          setPlanType(null);
        } else {
          setPlanType(subscription?.plan_type || null);
        }
      } catch (error) {
        console.error('Error checking plan:', error);
        setPlanType(null);
      } finally {
        setCheckingPlan(false);
      }
    };

    checkPlan();
  }, [user]);

  useEffect(() => {
    // Load following users first if needed, then load dreams
    const loadData = async () => {
      if (user && filterBy === 'following') {
        await loadFollowingUsers();
      }
      await loadPublicDreams();
    };
    loadData();
  }, [user, sortBy, filterBy, actualSearchQuery, analysisTypeFilter]);


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

  // Handle URL parameters for opening specific dream modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dreamId = params.get('dream');
    const commentId = params.get('comment');

    if (dreamId && dreams.length > 0) {
      const dream = dreams.find(d => d.id === dreamId);
      if (dream) {
        setSelectedDream(dream);
        // Clear URL params after opening
        window.history.replaceState({}, '', window.location.pathname);
        
        // If there's a comment ID, we'll scroll to it after comments load
        if (commentId) {
          // Wait for comments to load then scroll to the comment
          setTimeout(() => {
            const commentElement = document.getElementById(`comment-${commentId}`);
            if (commentElement) {
              commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight the comment briefly
              commentElement.classList.add('bg-pink-500/20');
              setTimeout(() => {
                commentElement.classList.remove('bg-pink-500/20');
              }, 2000);
            }
          }, 1000);
        }
      }
    }
  }, [dreams]);

  const loadFollowingUsers = async () => {
    if (!user) {
      setFollowingUsers(new Set());
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      
      if (error) throw error;
      
      setFollowingUsers(new Set((data || []).map(f => f.following_id)));
    } catch (error) {
      console.error('Error loading following users:', error);
      setFollowingUsers(new Set()); // Set empty set on error
    }
  };

  const loadPublicDreams = async () => {
    try {
      setLoading(true);
      // Don't clear dreams immediately - show loading overlay instead
      if (dreams.length === 0) {
        setDreams([]);
      }

      // Build query - Load dreams with limit for better performance
      let query = supabase
        .from('dreams')
        .select(`
          id,
          dream_text,
          dream_text_tr,
          dream_text_en,
          analysis_text,
          analysis_text_tr,
          analysis_text_en,
          image_url,
          image_url_2,
          image_url_3,
          primary_image_index,
          analysis_type,
          created_at,
          user_id,
          status,
          is_public
        `)
        .eq('is_public', true)
        .in('status', ['completed', 'pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(50); // Limit to 50 dreams initially for faster loading

      // Apply filter
      if (filterBy === 'following' && user) {
        const followingIds = Array.from(followingUsers);
        if (followingIds.length === 0) {
          setDreams([]);
          setLoading(false);
          return;
        }
        query = query.in('user_id', followingIds);
      }

      // Apply search
      if (actualSearchQuery.trim()) {
        query = query.or(`dream_text.ilike.%${actualSearchQuery}%,analysis_text.ilike.%${actualSearchQuery}%`);
      }

      // Apply sorting (already ordered by created_at, will sort client-side for popular/trending)
      // Note: order is already applied above, but we can override if needed
      if (sortBy !== 'recent') {
        // For popular and trending, we'll sort client-side after getting likes/comments
        // Keep the query order as created_at for now
      }

      let { data: dreamsData, error: dreamsError } = await query;

      if (dreamsError) {
        // If error is about is_public column, try without it and filter client-side
        if (dreamsError.message?.includes('is_public') || dreamsError.code === '42703' || dreamsError.code === 'PGRST116') {
          console.warn('is_public column not found. Please run migration to enable public dreams feature.');
          
          let retryQuery = supabase
            .from('dreams')
            .select(`
              id,
              dream_text,
              dream_text_tr,
              dream_text_en,
              analysis_text,
              analysis_text_tr,
              analysis_text_en,
              image_url,
              image_url_2,
              image_url_3,
              primary_image_index,
              analysis_type,
              created_at,
              user_id,
              status,
              is_public
            `)
            .in('status', ['completed', 'pending', 'processing'])
            .order('created_at', { ascending: false })
            .limit(50);
          
          // Apply filter
          if (filterBy === 'following' && user) {
            const followingIds = Array.from(followingUsers);
            if (followingIds.length === 0) {
              setDreams([]);
              setLoading(false);
              return;
            }
            retryQuery = retryQuery.in('user_id', followingIds);
          }

          // Apply search
          if (actualSearchQuery.trim()) {
            retryQuery = retryQuery.or(`dream_text.ilike.%${actualSearchQuery}%,analysis_text.ilike.%${actualSearchQuery}%`);
          }

          // Sorting already applied above
          
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

      // Get unique user IDs and fetch profiles + subscriptions
      const userIds = [...new Set((dreamsData || []).map(d => d.user_id))];
      console.log('🔍 User IDs to fetch:', userIds.length, userIds);
      let profilesData: any[] = [];
      let subscriptionsData: any[] = [];

      if (userIds.length > 0) {
        const [profilesResult, subscriptionsResult] = await Promise.allSettled([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, username')
            .in('id', userIds),
          supabase
            .from('subscriptions')
            .select('user_id, plan_type')
            .in('user_id', userIds)
        ]);

        if (profilesResult.status === 'fulfilled' && profilesResult.value.data) {
          profilesData = profilesResult.value.data;
          console.log('✅ Loaded profiles:', profilesData.length, profilesData);
        } else {
          console.error('❌ Failed to load profiles:', profilesResult);
        }
        if (subscriptionsResult.status === 'fulfilled' && subscriptionsResult.value.data) {
          subscriptionsData = subscriptionsResult.value.data;
        }
      }

      // Get likes count and check if user liked
      const dreamIds = (dreamsData || []).map(d => d.id);
      
      let likesData: any[] | null = null;
      let commentsData: any[] | null = null;

      if (dreamIds.length > 0) {
        // Load likes and comments in parallel for better performance
        const [likesResult, commentsResult] = await Promise.allSettled([
          supabase
            .from('dream_likes')
            .select('dream_id, user_id')
            .in('dream_id', dreamIds),
          supabase
            .from('dream_comments')
            .select('dream_id')
            .in('dream_id', dreamIds)
        ]);

        if (likesResult.status === 'fulfilled' && !likesResult.value.error) {
          likesData = likesResult.value.data || [];
        } else {
          likesData = [];
        }

        if (commentsResult.status === 'fulfilled' && !commentsResult.value.error) {
          commentsData = commentsResult.value.data || [];
        } else {
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

        const dreamsWithStats = (dreamsData || []).map(dream => {
          // Find profile and subscription for this dream's user
          const profile = profilesData.find(p => p.id === dream.user_id);
          const subscription = subscriptionsData.find(s => s.user_id === dream.user_id);
          
          return {
            ...dream,
            likes_count: likesMap.get(dream.id) || 0,
            comments_count: commentsMap.get(dream.id) || 0,
            is_liked: userLikesSet.has(dream.id),
            profiles: profile || { full_name: 'Anonymous', avatar_url: null, username: null },
            subscriptions: subscription || null
          };
        });

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
            const aDaysDiff = (Date.now() - aDate) / (1000 * 60 * 60 * 24);
            const bDaysDiff = (Date.now() - bDate) / (1000 * 60 * 60 * 24);
            const aScore = (a.likes_count * 2 + a.comments_count) / (aDaysDiff + 1);
            const bScore = (b.likes_count * 2 + b.comments_count) / (bDaysDiff + 1);
            return bScore - aScore;
          });
        }

        // Filter by visual presence (not analysis type)
        let filteredDreams = dreamsWithStats;
        if (analysisTypeFilter === 'visual') {
          // Show all analyses that have images (any type with images)
          filteredDreams = dreamsWithStats.filter(dream => {
            const images = getDreamImages(dream);
            return images.length > 0;
          });
        } else if (analysisTypeFilter === 'text') {
          // Show only completed analyses without images (exclude pending)
          filteredDreams = dreamsWithStats.filter(dream => {
            const images = getDreamImages(dream);
            return images.length === 0 && dream.status === 'completed';
          });
        }

        setDreams(filteredDreams);
      } else {
        setDreams([]);
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

  const loadGenerations = async () => {
    try {
      setLoadingGenerations(true);
      
      // Load public generations
      const { data: generationsData, error: genError } = await supabase
        .from('dream_generations')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (genError) throw genError;

      // Get unique user IDs
      const userIds = [...new Set(generationsData?.map(g => g.user_id) || [])];

      // Load profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', userIds);

      // Load subscriptions
      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('user_id, plan_type')
        .in('user_id', userIds);

      // Get generation IDs
      const genIds = generationsData?.map(g => g.id) || [];

      // Load likes count for each generation
      const { data: likesData } = await supabase
        .from('generation_likes')
        .select('generation_id')
        .in('generation_id', genIds);

      // Load comments count for each generation
      const { data: commentsData } = await supabase
        .from('generation_comments')
        .select('generation_id')
        .in('generation_id', genIds);

      // Check if current user liked these generations
      let userLikesData: any[] = [];
      if (user) {
        const { data } = await supabase
          .from('generation_likes')
          .select('generation_id')
          .in('generation_id', genIds)
          .eq('user_id', user.id);
        userLikesData = data || [];
      }

      // Count likes and comments per generation
      const likesCounts = (likesData || []).reduce((acc: any, like: any) => {
        acc[like.generation_id] = (acc[like.generation_id] || 0) + 1;
        return acc;
      }, {});

      const commentsCounts = (commentsData || []).reduce((acc: any, comment: any) => {
        acc[comment.generation_id] = (acc[comment.generation_id] || 0) + 1;
        return acc;
      }, {});

      const userLikedSet = new Set(userLikesData.map((like: any) => like.generation_id));

      // Map profiles, subscriptions, likes, and comments to generations
      const generationsWithProfiles = (generationsData || []).map(gen => ({
        ...gen,
        profiles: profilesData?.find(p => p.id === gen.user_id) || null,
        subscriptions: subscriptionsData?.find(s => s.user_id === gen.user_id) || null,
        likes_count: likesCounts[gen.id] || 0,
        comments_count: commentsCounts[gen.id] || 0,
        is_liked: userLikedSet.has(gen.id),
      }));

      setGenerations(generationsWithProfiles);
    } catch (error) {
      console.error('Error loading generations:', error);
      showToast(language === 'tr' ? 'Görseller yüklenemedi' : 'Failed to load generations', 'error');
    } finally {
      setLoadingGenerations(false);
    }
  };

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
      showToast(language === 'tr' ? 'Beğeni güncellenemedi' : 'Failed to update like', 'error');
    }
  };

  const handleGenerationLike = async (generationId: string) => {
    if (!user) {
      navigate('/signin');
      return;
    }

    try {
      const generation = generations.find(g => g.id === generationId);
      if (!generation) return;

      if (generation.is_liked) {
        // Unlike
        const { error } = await supabase
          .from('generation_likes')
          .delete()
          .eq('generation_id', generationId)
          .eq('user_id', user.id);

        if (error) throw error;

        setGenerations(prev => prev.map(g =>
          g.id === generationId
            ? { ...g, is_liked: false, likes_count: g.likes_count - 1 }
            : g
        ));
      } else {
        // Like
        const { error } = await supabase
          .from('generation_likes')
          .insert({
            generation_id: generationId,
            user_id: user.id
          });

        if (error) throw error;

        setGenerations(prev => prev.map(g =>
          g.id === generationId
            ? { ...g, is_liked: true, likes_count: g.likes_count + 1 }
            : g
        ));
      }
    } catch (error) {
      console.error('Error toggling generation like:', error);
      showToast(language === 'tr' ? 'Beğeni güncellenemedi' : 'Failed to update like', 'error');
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

      // Check if user is developer (developers can delete any dream)
      // Use sync check first for immediate response
      const isDevSync = isDeveloperSync(user.id);
      let isDev = isDevSync;
      
      // Also check with RPC for additional verification (but don't block if it fails)
      if (!isDevSync) {
        // Only check RPC if sync check says not developer (double-check)
        try {
          const { data: isDevRpc, error: rpcError } = await supabase.rpc('is_developer', {
            p_user_id: user.id
          });
          if (!rpcError && isDevRpc === true) {
            isDev = true;
          }
        } catch (error) {
          console.log('Error checking developer status with RPC, using sync check:', error);
          // If RPC fails, use sync check result
        }
      }
      
      console.log('Developer check:', { userId: user.id, isDevSync, isDev });

      // Build delete query - developers can delete any dream, others can only delete their own
      let deleteQuery = supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId);
      
      if (!isDev) {
        deleteQuery = deleteQuery.eq('user_id', user.id); // Only allow deleting own dreams
      }

      const { error } = await deleteQuery;

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
      showToast(language === 'tr' ? 'Yorumlar yüklenemedi' : 'Failed to load comments', 'error');
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

  const openGenerationModal = async (generation: Generation) => {
    setSelectedGeneration(generation);
    setGenerationComments([]);
    setNewGenerationComment('');
    
    // Load comments for this generation
    try {
      setLoadingGenerationComments(true);
      const { data, error } = await supabase
        .from('generation_comments')
        .select('id, comment_text, created_at, user_id')
        .eq('generation_id', generation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get user profiles for these comments
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        // Map profiles to comments
        const commentsWithProfiles = data.map(comment => ({
          ...comment,
          profiles: profilesData?.find(p => p.id === comment.user_id) || null
        }));

        setGenerationComments(commentsWithProfiles as any);
      } else {
        setGenerationComments([]);
      }
    } catch (error) {
      console.error('Error loading generation comments:', error);
    } finally {
      setLoadingGenerationComments(false);
    }
  };

  const submitGenerationComment = async () => {
    if (!user) {
      navigate('/signin');
      return;
    }

    if (!newGenerationComment.trim() || !selectedGeneration) return;

    try {
      setSubmittingGenerationComment(true);
      const { data, error } = await supabase
        .from('generation_comments')
        .insert({
          generation_id: selectedGeneration.id,
          user_id: user.id,
          comment_text: newGenerationComment.trim()
        })
        .select('id, comment_text, created_at, user_id')
        .single();

      if (error) throw error;

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      const commentWithProfile = {
        ...data,
        profiles: profileData || null
      };

      setGenerationComments([...generationComments, commentWithProfile as any]);
      setNewGenerationComment('');
      
      // Update comment count
      setGenerations(prev => prev.map(g =>
        g.id === selectedGeneration.id
          ? { ...g, comments_count: g.comments_count + 1 }
          : g
      ));

      showToast(language === 'tr' ? 'Yorum eklendi!' : 'Comment posted!', 'success');
    } catch (error) {
      console.error('Error posting comment:', error);
      showToast(language === 'tr' ? 'Yorum eklenemedi' : 'Failed to post comment', 'error');
    } finally {
      setSubmittingGenerationComment(false);
    }
  };

  const deleteGenerationComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('generation_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      setGenerationComments(prev => prev.filter(c => c.id !== commentId));
      
      // Update comment count
      if (selectedGeneration) {
        setGenerations(prev => prev.map(g =>
          g.id === selectedGeneration.id
            ? { ...g, comments_count: Math.max(0, g.comments_count - 1) }
            : g
        ));
      }

      showToast(language === 'tr' ? 'Yorum silindi' : 'Comment deleted', 'success');
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast(language === 'tr' ? 'Yorum silinemedi' : 'Failed to delete comment', 'error');
    }
  };

  if (loading || checkingPlan) {
    return (
      <div className="min-h-screen relative pt-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={48} />
      </div>
    );
  }

  // Check if user is developer
  const isDeveloper = user ? isDeveloperSync(user.id) : false;
  
  // Check if user is not logged in or has no plan (null means no plan)
  // Developers can always access, even without a plan
  const hasNoPlan = user && planType === null && !isDeveloper;
  const isNotLoggedIn = !user;
  const shouldBlur = (hasNoPlan || isNotLoggedIn) && !isDeveloper;

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-4 md:px-6">
      {/* No Plan Overlay */}
      {shouldBlur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md mx-4 p-8 bg-gradient-to-br from-slate-900/90 to-purple-900/90 border border-purple-500/30 rounded-2xl shadow-2xl text-center">
            <Lock className="mx-auto mb-4 text-purple-400" size={48} />
            <h2 className="text-2xl font-bold text-white mb-4">
              {isNotLoggedIn ? t.social.signIn : 'Plan Gerekli'}
            </h2>
            <p className="text-slate-300 mb-6">
              {t.social.noPlanMessage}
            </p>
            <button
              onClick={() => navigate(isNotLoggedIn ? '/signin' : '/pricing')}
              className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30"
            >
              {isNotLoggedIn ? t.social.signIn : 'Planları Görüntüle'}
            </button>
          </div>
        </div>
      )}

      {/* Blurred background content */}
      <div className={`${shouldBlur ? 'blur-lg pointer-events-none select-none' : ''} transition-all duration-300`}>
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
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setActualSearchQuery(searchQuery);
                  }
                }}
                placeholder={t.social.searchDreamsPlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 backdrop-blur-sm border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
              />
            )}
          </div>

          {/* Analysis Type Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-1 mb-4">
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
            <button
              onClick={() => {
                if (planType !== 'premium' && planType !== 'ruyagezer') {
                  // Premium değilse göster ama içerik yükleme
                  showToast(t.social.generatorsPremiumOnly, 'error');
                  return;
                }
                setAnalysisTypeFilter('generators');
                loadGenerations();
              }}
              className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-all relative group ${
                analysisTypeFilter === 'generators'
                  ? 'bg-gradient-to-r from-pink-600 to-yellow-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                {planType !== 'premium' && planType !== 'ruyagezer' && (
                  <Lock size={14} className="text-yellow-400" />
                )}
                <Sparkles size={14} className={planType === 'premium' || planType === 'ruyagezer' ? 'text-yellow-400' : ''} />
                {t.social.generators}
              </span>
            </button>
          </div>

          {/* Filter and Sort */}
          <div className="flex flex-wrap gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-lg p-2">
              <Filter size={18} className="text-slate-400" />
              <button
                onClick={() => {
                  setFilterBy('all');
                  loadPublicDreams();
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
                    loadPublicDreams();
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
                  loadPublicDreams();
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
                  loadPublicDreams();
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
                  loadPublicDreams();
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

        {/* Show Generators Content when generators tab is active */}
        {analysisTypeFilter === 'generators' ? (
          <>
            {/* Premium Lock Screen for non-premium users */}
            {planType !== 'premium' && planType !== 'ruyagezer' ? (
              <div className="text-center py-20">
                <div className="relative inline-block mb-8">
                  <Sparkles className="mx-auto text-yellow-400 animate-pulse" size={64} />
                  <Lock className="absolute -top-2 -right-2 text-pink-400" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t.social.generatorsPremiumOnly}</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  Upgrade to Premium to view and create AI-generated dream art
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-600 to-yellow-600 text-white font-semibold hover:from-pink-500 hover:to-yellow-500 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30 hover:scale-105"
                >
                  {t.social.upgradeForGenerators}
                </button>
              </div>
            ) : loadingGenerations ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-purple-400" size={48} />
              </div>
            ) : generations.length === 0 ? (
              <div className="text-center py-20">
                <Wand2 className="mx-auto mb-4 text-slate-600" size={64} />
                <p className="text-slate-400 text-lg mb-6">{t.social.noGenerations}</p>
                <button
                  onClick={() => navigate('/generator')}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-yellow-600 text-white font-semibold hover:from-pink-500 hover:to-yellow-500 transition-all duration-300"
                >
                  Create Your First Generation
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {generations.map((gen) => (
                  <div
                    key={gen.id}
                    className="group bg-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl overflow-hidden hover:border-yellow-500/40 transition-all duration-300"
                  >
                    {/* Generated Image */}
                    <div className="relative aspect-square overflow-hidden bg-slate-950 cursor-pointer">
                      <img
                        src={gen.generated_image_url}
                        alt="Generated dream"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onClick={() => setLightboxImage(gen.generated_image_url)}
                      />
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                        <div className="flex items-center gap-6 text-white pointer-events-none">
                          <div className="flex items-center gap-2">
                            <Heart size={24} className={gen.is_liked ? 'fill-current text-pink-400' : ''} />
                            <span className="font-semibold">{gen.likes_count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageCircle size={24} />
                            <span className="font-semibold">{gen.comments_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Generation Info */}
                    <div className="p-4">
                      {/* User Profile */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-pink-500/50 transition-all"
                          onClick={() => navigate(`/profile/${gen.user_id}`)}
                        >
                          {gen.profiles?.avatar_url ? (
                            <img
                              src={gen.profiles.avatar_url}
                              alt={gen.profiles.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="text-pink-400" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-semibold text-white truncate cursor-pointer hover:text-pink-400 transition-colors"
                            onClick={() => navigate(`/profile/${gen.user_id}`)}
                          >
                            {gen.profiles?.full_name || 'Anonymous'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(gen.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerationLike(gen.id);
                            }}
                            className={`flex items-center gap-1.5 transition-all hover:scale-110 ${
                              gen.is_liked
                                ? 'text-pink-400'
                                : 'text-slate-400 hover:text-pink-400'
                            }`}
                          >
                            <Heart size={20} className={gen.is_liked ? 'fill-current' : ''} />
                            <span className="text-sm font-medium">{gen.likes_count}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openGenerationModal(gen);
                            }}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-purple-400 transition-all hover:scale-110"
                          >
                            <MessageCircle size={20} />
                            <span className="text-sm font-medium">{gen.comments_count}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : dreams.length === 0 ? (
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
            {dreams.map((dream) => (
              <div
                key={dream.id}
                className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-all duration-300 group"
              >
                {/* Dream Image - Instagram Style with Carousel (for analyses with images) */}
                {(() => {
                  const images = getDreamImages(dream);
                  return images.length > 0;
                })() && (
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(currentImage);
                          }}
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
                              title={t.social.previousImage || "Previous image"}
                              aria-label={t.social.previousImage || "Previous image"}
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
                              title={t.social.nextImage}
                              aria-label={t.social.nextImage}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${dream.user_id}`);
                            }}
                            className="text-white font-semibold text-sm hover:text-purple-300 transition-colors truncate"
                          >
                            {dream.profiles.full_name || dream.profiles.username || t.social.anonymous}
                          </button>
                        </div>
                        <p className="text-white/70 text-xs">{formatDate(dream.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                )}

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
                        title={dream.is_liked ? t.social.likes : t.social.like}
                        aria-label={dream.is_liked ? t.social.likes : t.social.like}
                      >
                        <Heart size={24} className={dream.is_liked ? 'fill-current' : ''} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDreamModal(dream);
                        }}
                        className="text-slate-400 hover:text-purple-400 transition-all hover:scale-110"
                        title={t.social.comments}
                        aria-label={t.social.comments}
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
                        title={t.social.checkOutDream}
                        aria-label={t.social.checkOutDream}
                      >
                        <Share2 size={24} />
                      </button>
                      {user && (dream.user_id === user.id || isDeveloperSync(user.id)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDream(dream.id, e);
                          }}
                          className="text-slate-400 hover:text-red-400 transition-all hover:scale-110 ml-auto"
                          title={dream.user_id === user.id ? t.social.deleteDream : 'Delete dream (Developer)'}
                          aria-label={dream.user_id === user.id ? t.social.deleteDream : 'Delete dream (Developer)'}
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

                  {/* For text analyses (no images), show dream and analysis text */}
                  {(() => {
                    const images = getDreamImages(dream);
                    if (images.length === 0 && dream.status === 'completed') {
                      return (
                        <div 
                          className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors rounded-lg"
                          onClick={() => setSelectedDream(dream)}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${dream.user_id}`);
                              }}
                              className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-white/30 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform flex-shrink-0"
                            >
                              {dream.profiles.avatar_url ? (
                                <img
                                  src={dream.profiles.avatar_url}
                                  alt={dream.profiles.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User size={12} className="text-white/60" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${dream.user_id}`);
                              }}
                              className="text-white font-semibold text-sm hover:text-purple-300 transition-colors"
                            >
                              {dream.profiles.full_name || dream.profiles.username || t.social.anonymous}
                            </button>
                            <span className="text-white/50 text-xs">{formatDate(dream.created_at)}</span>
                          </div>
                          <div className="mb-3">
                            <h3 className="text-xs font-semibold text-purple-400 mb-1.5">{t.library.yourDream}</h3>
                            <p className="text-white/80 text-sm leading-relaxed line-clamp-4">
                              {getDreamText(dream, language)}
                            </p>
                          </div>
                          {getAnalysisText(dream, language) && (
                            <div className="mb-3">
                              <h3 className="text-xs font-semibold text-pink-400 mb-1.5">{t.library.analysis}</h3>
                              <p className="text-white/80 text-sm leading-relaxed line-clamp-4">
                                {getAnalysisText(dream, language)}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Dream Text Preview - Only for visual analyses */}
                  {(() => {
                    const images = getDreamImages(dream);
                    if (images.length > 0) {
                      return (
                        <div 
                          className="mb-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDreamModal(dream);
                          }}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/profile/${dream.user_id}`);
                              }}
                              className="text-white font-semibold text-sm hover:text-purple-300 transition-colors"
                            >
                              {dream.profiles.full_name || dream.profiles.username || t.social.anonymous}
                            </button>
                          </div>
                          <span className="text-white/80 text-sm line-clamp-2">
                            {getDreamText(dream, language)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

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
                <h2 className="text-xl font-semibold text-white">{t.library.dreamEntry}</h2>
              </div>
              <div className="flex items-center gap-2">
                {user && (selectedDream.user_id === user.id || isDeveloperSync(user.id)) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDream(selectedDream.id, e);
                    }}
                    className="text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg"
                    title={selectedDream.user_id === user.id ? t.social.deleteDream : 'Delete dream (Developer)'}
                    aria-label={selectedDream.user_id === user.id ? t.social.deleteDream : 'Delete dream (Developer)'}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedDream(null)}
                  className="text-slate-400 hover:text-white transition-colors text-xl"
                >
                  ✕
                </button>
              </div>
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
                          <Sparkles className="text-purple-400/50" size={64} />
                        </div>
                      );
                    }
                    
                    const modalIndex = carouselIndices[`modal-${selectedDream.id}`] || 0;
                    const currentImage = images[modalIndex];
                    
                    return (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <img
                          src={currentImage}
                          alt="Dream visualization"
                          className="max-w-full max-h-full object-contain cursor-zoom-in"
                          onClick={() => setLightboxImage(currentImage)}
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
                              title={t.social.previousImage}
                              aria-label={t.social.previousImage}
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
                              title={t.social.nextImage}
                              aria-label={t.social.nextImage}
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
                      <div className="flex-1 flex items-center gap-2">
                        <EmojiPicker 
                          onEmojiSelect={(emoji) => setNewComment(prev => prev + emoji)}
                          position="top"
                          inputRef={commentInputRef}
                        />
                        <input
                          ref={commentInputRef}
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
                        <div key={comment.id} id={`comment-${comment.id}`} className="flex gap-3 group transition-colors duration-300">
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2"
            title={t.social.close}
            aria-label={t.social.close}
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

      {/* Generation Comments Modal */}
      {selectedGeneration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-purple-500/20">
              <h3 className="text-xl font-bold text-white">Comments</h3>
              <button
                onClick={() => setSelectedGeneration(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingGenerationComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-purple-400" size={32} />
                </div>
              ) : generationComments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="mx-auto mb-4 text-slate-600" size={48} />
                  <p className="text-slate-400">No comments yet</p>
                  <p className="text-slate-500 text-sm mt-2">Be the first to comment!</p>
                </div>
              ) : (
                generationComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {comment.profiles?.avatar_url ? (
                        <img
                          src={comment.profiles.avatar_url}
                          alt={comment.profiles.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="text-pink-400" size={20} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white text-sm">
                          {comment.profiles?.full_name || 'Anonymous'}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                        {user && comment.user_id === user.id && (
                          <button
                            onClick={() => deleteGenerationComment(comment.id)}
                            className="ml-auto text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm">{comment.comment_text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <div className="p-6 border-t border-purple-500/20">
              {user ? (
                <div className="flex gap-3 items-start">
                  <EmojiPicker 
                    onEmojiSelect={(emoji) => setNewGenerationComment(prev => prev + emoji)}
                    position="top"
                    inputRef={generationCommentInputRef}
                  />
                  <textarea
                    ref={generationCommentInputRef}
                    value={newGenerationComment}
                    onChange={(e) => setNewGenerationComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newGenerationComment.trim()) {
                          submitGenerationComment();
                        }
                      }
                    }}
                    placeholder="Write a comment..."
                    className="flex-1 px-4 py-3 bg-slate-950/50 border border-purple-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 resize-none"
                    rows={2}
                    disabled={submittingGenerationComment}
                  />
                  <button
                    onClick={submitGenerationComment}
                    disabled={!newGenerationComment.trim() || submittingGenerationComment}
                    className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submittingGenerationComment ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-400 mb-4">Sign in to comment</p>
                  <button
                    onClick={() => navigate('/signin')}
                    className="px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No Plan or Not Logged In Overlay */}
      {(hasNoPlan || isNotLoggedIn) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="mb-6">
              <Lock className="mx-auto text-purple-400 mb-4" size={48} />
              <h2 className="text-2xl font-bold text-white mb-2">
                {isNotLoggedIn 
                  ? (language === 'tr' ? 'Giriş Gerekli' : 'Login Required')
                  : (language === 'tr' ? 'Plan Gerekli' : 'Plan Required')
                }
              </h2>
              <p className="text-slate-400">
                {isNotLoggedIn
                  ? (language === 'tr' 
                      ? 'Sosyal sayfasına erişim için önce kaydolmanız veya giriş yapmanız gerekmektedir.'
                      : 'You must sign up or log in first to access the social page.')
                  : (language === 'tr' 
                      ? 'Sosyal kısmına erişim sağlayabilmek için en azından bedava plana sahip olmalısınız.'
                      : 'You must have at least a free plan to access the social section.')
                }
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {isNotLoggedIn ? (
                <button
                  onClick={() => navigate('/signin')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  {language === 'tr' ? 'Kaydol / Giriş Yap' : 'Sign Up / Log In'}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/pricing')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  {language === 'tr' ? 'Satın Al Sayfasına Git' : 'Go to Pricing Page'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

