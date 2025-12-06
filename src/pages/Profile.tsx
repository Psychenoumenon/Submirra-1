import { useState, useEffect, useRef } from 'react';
import { User, Mail, Calendar, Edit2, Save, X, Upload, Loader2, Users, Heart, MessageCircle, BookOpen, UserPlus, UserCheck, Grid3x3, Sparkles, MoreVertical, Ban, Star, StarOff, Flag, Zap } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate, useCurrentPage } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';

interface ProfileData {
  full_name: string;
  email: string;
  created_at: string;
  avatar_url: string | null;
  bio: string | null;
  username: string | null;
  is_developer?: boolean;
  plan_type?: 'trial' | 'standard' | 'premium' | null;
}

interface UserStats {
  public_dreams_count: number;
  total_likes_received: number;
  total_comments_received: number;
  followers_count: number;
  following_count: number;
}

interface PublicDream {
  id: string;
  dream_text: string;
  analysis_text: string;
  dream_text_tr?: string | null;
  dream_text_en?: string | null;
  analysis_text_tr?: string | null;
  analysis_text_en?: string | null;
  image_url: string;
  created_at: string;
  status: string;
  likes_count: number;
  comments_count: number;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentPage = useCurrentPage();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedUsername, setEditedUsername] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [publicDreams, setPublicDreams] = useState<PublicDream[]>([]);
  const [loadingDreams, setLoadingDreams] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<Array<{id: string; full_name: string; username: string | null; avatar_url: string | null}>>([]);
  const [followingList, setFollowingList] = useState<Array<{id: string; full_name: string; username: string | null; avatar_url: string | null}>>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [reportCount, setReportCount] = useState<number>(0);
  const [dangerLevel, setDangerLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      // Get user ID from URL
      const path = window.location.pathname;
      let userId: string | null = null;
      
      if (path.startsWith('/profile/')) {
        const parts = path.split('/');
        userId = parts[2] || null;
      }

      if (userId) {
        // Viewing another user's profile
        setProfileUserId(userId);
        setIsOwnProfile(user ? userId === user.id : false);
        
        // Load all critical data in parallel for faster loading
        await Promise.all([
          loadOtherUserProfile(userId),
          loadOtherUserStats(userId),
          loadPublicDreams(userId),
          ...(user ? [
            checkFollowingStatus(userId),
            checkBlockStatus(userId),
            checkFavoriteStatus(userId),
          ] : []),
        ]);
        
        // Load report info in background (non-critical, only for admins)
        loadReportInfo(userId).catch(err => console.error('Report info load error:', err));
      } else {
        // Viewing own profile
        if (!user) {
          navigate('/signin');
          return;
        }
        setProfileUserId(user.id);
        setIsOwnProfile(true);
        
        // Load all critical data in parallel
        await Promise.all([
          loadProfile(),
          loadStats(),
          loadPublicDreams(user.id),
        ]);
        
        // Load report info in background (non-critical)
        loadReportInfo(user.id).catch(err => console.error('Report info load error:', err));
      }
      setLoading(false);
    };

    setLoading(true);
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentPage]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      // Load profile and subscription in parallel for faster loading
      const [profileResult, subscriptionResult] = await Promise.allSettled([
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, bio, username, created_at, is_developer')
          .eq('id', user.id)
          .single(),
        supabase
          .from('subscriptions')
          .select('plan_type')
          .eq('user_id', user.id)
          .single(),
      ]);

      if (profileResult.status === 'rejected' || profileResult.value.error) {
        throw profileResult.status === 'rejected' ? profileResult.reason : profileResult.value.error;
      }

      const data = profileResult.value.data;
      let planType: 'trial' | 'standard' | 'premium' | null = null;
      
      if (subscriptionResult.status === 'fulfilled' && subscriptionResult.value.data?.plan_type) {
        planType = subscriptionResult.value.data.plan_type as 'trial' | 'standard' | 'premium';
      }

      setProfile({
        full_name: data.full_name || '',
        email: data.email || user.email || '',
        created_at: data.created_at || user.created_at || '',
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
        username: data.username || null,
        is_developer: data.is_developer || false,
        plan_type: planType,
      });
      setEditedName(data.full_name || '');
      setEditedBio(data.bio || '');
      setEditedUsername(data.username || '');
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOtherUserProfile = async (userIdOrUsername: string) => {
    try {
      setLoading(true);
      // Only select necessary columns
      let query = supabase.from('profiles').select('id, full_name, avatar_url, bio, username, created_at, is_developer');
      
      // Check if it's a UUID (user ID) or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdOrUsername);
      
      if (isUUID) {
        query = query.eq('id', userIdOrUsername);
      } else {
        query = query.eq('username', userIdOrUsername);
      }
      
      // Load profile and subscription in parallel
      const [profileResult, subscriptionResult] = await Promise.allSettled([
        query.single(),
        isUUID ? supabase
          .from('subscriptions')
          .select('plan_type')
          .eq('user_id', userIdOrUsername)
          .single() : Promise.resolve({ data: null, error: null }),
      ]);

      if (profileResult.status === 'rejected' || profileResult.value.error) {
        throw profileResult.status === 'rejected' ? profileResult.reason : profileResult.value.error;
      }

      const data = profileResult.value.data;
      let planType: 'trial' | 'standard' | 'premium' | null = null;
      
      if (subscriptionResult.status === 'fulfilled' && subscriptionResult.value.data?.plan_type) {
        planType = subscriptionResult.value.data.plan_type as 'trial' | 'standard' | 'premium';
      }

      setProfile({
        full_name: data.full_name || '',
        email: '', // Don't show email for other users
        created_at: data.created_at || '',
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
        username: data.username || null,
        is_developer: data.is_developer || false,
        plan_type: planType,
      });
      
      // Set the actual user ID for other operations
      setProfileUserId(data.id);
    } catch (error) {
      console.error('Error loading other user profile:', error);
      showToast('Kullanıcı profili bulunamadı', 'error');
      navigate('/social');
    } finally {
      setLoading(false);
    }
  };

  const loadOtherUserStats = async (userId: string) => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!statsError && statsData) {
        setStats({
          public_dreams_count: statsData.public_dreams_count || 0,
          total_likes_received: statsData.total_likes_received || 0,
          total_comments_received: statsData.total_comments_received || 0,
          followers_count: statsData.followers_count || 0,
          following_count: statsData.following_count || 0,
        });
      } else {
        // Manual calculation - get all public dreams first, then count likes and comments
        const { data: publicDreams } = await supabase
          .from('dreams')
          .select('id')
          .eq('user_id', userId)
          .eq('is_public', true);

        const dreamIds = (publicDreams || []).map(d => d.id);
        const publicDreamsCount = dreamIds.length;

        // Count likes for user's public dreams
        let totalLikes = 0;
        if (dreamIds.length > 0) {
          try {
            const { data: likes, error: likesError } = await supabase
              .from('dream_likes')
              .select('id', { count: 'exact', head: true })
              .in('dream_id', dreamIds);
            
            if (!likesError && likes !== null) {
              totalLikes = likes.length || 0;
            } else {
              // Fallback: count manually
              const { count } = await supabase
                .from('dream_likes')
                .select('*', { count: 'exact', head: true })
                .in('dream_id', dreamIds);
              totalLikes = count || 0;
            }
          } catch (e) {
            console.error('Error counting likes:', e);
          }
        }

        // Count comments for user's public dreams
        let totalComments = 0;
        if (dreamIds.length > 0) {
          try {
            const { data: comments, error: commentsError } = await supabase
              .from('dream_comments')
              .select('id', { count: 'exact', head: true })
              .in('dream_id', dreamIds);
            
            if (!commentsError && comments !== null) {
              totalComments = comments.length || 0;
            } else {
              // Fallback: count manually
              const { count } = await supabase
                .from('dream_comments')
                .select('*', { count: 'exact', head: true })
                .in('dream_id', dreamIds);
              totalComments = count || 0;
            }
          } catch (e) {
            console.error('Error counting comments:', e);
          }
        }

        // Get followers and following counts
        const [followersRes, followingRes] = await Promise.all([
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
        ]);

        setStats({
          public_dreams_count: publicDreamsCount,
          total_likes_received: totalLikes,
          total_comments_received: totalComments,
          followers_count: followersRes.count || 0,
          following_count: followingRes.count || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPublicDreams = async (userId: string) => {
    try {
      setLoadingDreams(true);
      // Only select necessary columns for faster loading
      const { data: dreamsData, error } = await supabase
        .from('dreams')
        .select('id, image_url, image_url_2, image_url_3, created_at, status, likes_count, dream_text, dream_text_tr, dream_text_en, analysis_text, analysis_text_tr, analysis_text_en')
        .eq('user_id', userId)
        .eq('is_public', true)
        .in('status', ['completed', 'pending'])
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error('Error loading dreams:', error);
        throw error;
      }

      if (!dreamsData || dreamsData.length === 0) {
        setPublicDreams([]);
        setLoadingDreams(false);
        return;
      }

      const dreamIds = dreamsData.map(d => d.id);
      
      // Load likes and comments in parallel for better performance
      const [likesResult, commentsResult] = await Promise.allSettled([
        supabase
          .from('dream_likes')
          .select('dream_id')
          .in('dream_id', dreamIds),
        supabase
          .from('dream_comments')
          .select('dream_id')
          .in('dream_id', dreamIds),
      ]);

      let likesData: any[] = [];
      let commentsData: any[] = [];

      if (likesResult.status === 'fulfilled' && !likesResult.value.error) {
        likesData = likesResult.value.data || [];
      }

      if (commentsResult.status === 'fulfilled' && !commentsResult.value.error) {
        commentsData = commentsResult.value.data || [];
      }

      // Count likes and comments per dream
      const likesMap = new Map<string, number>();
      const commentsMap = new Map<string, number>();

      likesData.forEach(like => {
        if (like && like.dream_id) {
          likesMap.set(like.dream_id, (likesMap.get(like.dream_id) || 0) + 1);
        }
      });

      commentsData.forEach(comment => {
        if (comment && comment.dream_id) {
          commentsMap.set(comment.dream_id, (commentsMap.get(comment.dream_id) || 0) + 1);
        }
      });

      const dreamsWithStats = dreamsData.map(dream => {
        const calculatedLikesCount = likesMap.get(dream.id) || 0;
        const calculatedCommentsCount = commentsMap.get(dream.id) || 0;
        const dbLikesCount = dream.likes_count || 0;
        
        return {
          ...dream,
          likes_count: Math.max(dbLikesCount, calculatedLikesCount),
          comments_count: calculatedCommentsCount,
          // Ensure analysis_text exists (fallback to empty string)
          analysis_text: dream.analysis_text || '',
        };
      });

      setPublicDreams(dreamsWithStats);
    } catch (error) {
      console.error('Error loading public dreams:', error);
    } finally {
      setLoadingDreams(false);
    }
  };

  const checkFollowingStatus = async (userId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();

      setIsFollowing(!!data && !error);
    } catch (error) {
      setIsFollowing(false);
    }
  };

  const checkBlockStatus = async (targetUserId: string) => {
    if (!user) return;

    try {
      // Check if current user blocked the target user
      const { data: blockedData, error: blockedError } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetUserId)
        .single();

      if (blockedError && blockedError.code !== 'PGRST116') {
        console.error('Error checking block status:', blockedError);
      }

      setIsBlocked(!!blockedData);

      // Check if target user blocked the current user
      const { data: blockedByData, error: blockedByError } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', targetUserId)
        .eq('blocked_id', user.id)
        .single();

      if (blockedByError && blockedByError.code !== 'PGRST116') {
        console.error('Error checking blocked by status:', blockedByError);
      }

      setIsBlockedBy(!!blockedByData);
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const checkFavoriteStatus = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('favorite_user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite status:', error);
      }

      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!user || !profileUserId) return;

    if (!confirm('Bu kullanıcıyı engellemek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: profileUserId,
        });

      if (error) throw error;

      setIsBlocked(true);
      setShowProfileMenu(false);
      showToast('Kullanıcı engellendi', 'success');
    } catch (error) {
      console.error('Error blocking user:', error);
      showToast('Kullanıcı engellenemedi', 'error');
    }
  };

  const handleUnblockUser = async () => {
    if (!user || !profileUserId) return;

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', profileUserId);

      if (error) throw error;

      setIsBlocked(false);
      setShowProfileMenu(false);
      showToast('Kullanıcının engeli kaldırıldı', 'success');
    } catch (error) {
      console.error('Error unblocking user:', error);
      showToast('Engel kaldırılamadı', 'error');
    }
  };

  const handleToggleFavorite = async () => {
    if (!user || !profileUserId) {
      console.log('Missing user or profileUserId:', { user: !!user, profileUserId });
      return;
    }

    console.log('Toggling favorite for:', profileUserId, 'Current status:', isFavorite);

    try {
      if (isFavorite) {
        // Remove from favorites
        console.log('Removing from favorites...');
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('favorite_user_id', profileUserId);

        if (error) {
          console.error('Error removing favorite:', error);
          throw error;
        }

        setIsFavorite(false);
        showToast('Favori arkadaşlardan çıkarıldı', 'success');
        console.log('Successfully removed from favorites');
      } else {
        // Add to favorites
        console.log('Adding to favorites...');
        const { data, error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            favorite_user_id: profileUserId,
          })
          .select();

        if (error) {
          console.error('Error adding favorite:', error);
          throw error;
        }

        console.log('Successfully added to favorites:', data);
        setIsFavorite(true);
        showToast('Favori arkadaşlara eklendi', 'success');
      }
      setShowProfileMenu(false);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showToast(`İşlem başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, 'error');
    }
  };

  const handleReportUser = async () => {
    if (!user || !profileUserId) return;

    const reason = prompt('Şikayet sebebinizi yazın (isteğe bağlı):');
    if (reason === null) return; // User cancelled

    if (!confirm('Bu kullanıcıyı şikayet etmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      console.log('Reporting user:', profileUserId);
      
      // Check if user already reported this person
      const { data: existingReport } = await supabase
        .from('user_reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('reported_user_id', profileUserId)
        .single();

      if (existingReport) {
        showToast('Bu kullanıcıyı zaten şikayet etmişsiniz', 'error');
        setShowProfileMenu(false);
        return;
      }

      // Add report
      const { error: reportError } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: profileUserId,
          reason: reason || null,
        });

      if (reportError) throw reportError;

      // Check total reports for this user
      const { data: reports, error: countError } = await supabase
        .from('user_reports')
        .select('id')
        .eq('reported_user_id', profileUserId);

      if (countError) throw countError;

      const reportCount = reports?.length || 0;
      console.log('Total reports for user:', reportCount);

      // If 10 or more reports, suspend the user
      if (reportCount >= 10) {
        const { error: suspendError } = await supabase
          .from('profiles')
          .update({ 
            is_suspended: true,
            suspended_at: new Date().toISOString(),
            suspension_reason: 'Çok sayıda şikayet nedeniyle otomatik askıya alındı'
          })
          .eq('id', profileUserId);

        if (suspendError) {
          console.error('Error suspending user:', suspendError);
        } else {
          console.log('User suspended due to reports');
        }
      }

      setShowProfileMenu(false);
      showToast('Şikayet gönderildi', 'success');
    } catch (error) {
      console.error('Error reporting user:', error);
      showToast('Şikayet gönderilemedi', 'error');
    }
  };

  const loadReportInfo = async (userId: string) => {
    try {
      const { data: reports, error } = await supabase
        .from('user_reports')
        .select('id')
        .eq('reported_user_id', userId);

      if (error) throw error;

      const count = reports?.length || 0;
      setReportCount(count);

      // Determine danger level based on report count
      // 0 reports = Low Risk (Safe)
      // 1-3 reports = Medium Risk (Caution)
      // 4-9 reports = High Risk (Warning)
      // 10+ reports = Critical Risk (Danger)
      if (count === 0) {
        setDangerLevel('low');
      } else if (count >= 1 && count <= 3) {
        setDangerLevel('medium');
      } else if (count >= 4 && count <= 9) {
        setDangerLevel('high');
      } else {
        setDangerLevel('critical');
      }
    } catch (error) {
      console.error('Error loading report info:', error);
      // Set default values on error
      setReportCount(0);
      setDangerLevel('low');
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      // Try to get stats from view, fallback to manual calculation
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!statsError && statsData) {
        setStats({
          public_dreams_count: statsData.public_dreams_count || 0,
          total_likes_received: statsData.total_likes_received || 0,
          total_comments_received: statsData.total_comments_received || 0,
          followers_count: statsData.followers_count || 0,
          following_count: statsData.following_count || 0,
        });
      } else {
        // Manual calculation - get all public dreams first, then count likes and comments
        const { data: publicDreams } = await supabase
          .from('dreams')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_public', true);

        const dreamIds = (publicDreams || []).map(d => d.id);
        const publicDreamsCount = dreamIds.length;

        // Count likes for user's public dreams
        let totalLikes = 0;
        if (dreamIds.length > 0) {
          try {
            const { data: likes, error: likesError } = await supabase
              .from('dream_likes')
              .select('id', { count: 'exact', head: true })
              .in('dream_id', dreamIds);
            
            if (!likesError && likes !== null) {
              totalLikes = likes.length || 0;
            } else {
              // Fallback: count manually
              const { count } = await supabase
                .from('dream_likes')
                .select('*', { count: 'exact', head: true })
                .in('dream_id', dreamIds);
              totalLikes = count || 0;
            }
          } catch (e) {
            console.error('Error counting likes:', e);
          }
        }

        // Count comments for user's public dreams
        let totalComments = 0;
        if (dreamIds.length > 0) {
          try {
            const { data: comments, error: commentsError } = await supabase
              .from('dream_comments')
              .select('id', { count: 'exact', head: true })
              .in('dream_id', dreamIds);
            
            if (!commentsError && comments !== null) {
              totalComments = comments.length || 0;
            } else {
              // Fallback: count manually
              const { count } = await supabase
                .from('dream_comments')
                .select('*', { count: 'exact', head: true })
                .in('dream_id', dreamIds);
              totalComments = count || 0;
            }
          } catch (e) {
            console.error('Error counting comments:', e);
          }
        }

        // Get followers and following counts
        const [followersRes, followingRes] = await Promise.all([
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        ]);

        console.log(`Stats for user ${user.id}:`, {
          public_dreams_count: publicDreamsCount,
          total_likes_received: totalLikes,
          total_comments_received: totalComments,
          followers_count: followersRes.count || 0,
          following_count: followingRes.count || 0,
        });

        setStats({
          public_dreams_count: publicDreamsCount,
          total_likes_received: totalLikes,
          total_comments_received: totalComments,
          followers_count: followersRes.count || 0,
          following_count: followingRes.count || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSave = async () => {
    if (!user) {
      showToast('You must be logged in to save', 'error');
      return;
    }

    if (!editedName.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }

    // Username validation
    if (editedUsername.trim()) {
      if (editedUsername.length < 3) {
        showToast('Username must be at least 3 characters', 'error');
        return;
      }
      if (!/^[a-z0-9_]+$/.test(editedUsername.toLowerCase())) {
        showToast('Username can only contain lowercase letters, numbers, and underscores', 'error');
        return;
      }
    }

    try {
      const updateData: any = { 
        full_name: editedName.trim(),
        updated_at: new Date().toISOString()
      };
      
      if (editedBio !== undefined) {
        updateData.bio = editedBio.trim() || null;
      }

      // Update username if changed
      if (editedUsername.trim() && editedUsername.toLowerCase() !== profile?.username?.toLowerCase()) {
        // Check if username is already taken
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', editedUsername.toLowerCase())
          .neq('id', user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking username:', checkError);
          throw checkError;
        }

        if (existingUser) {
          showToast('This username is already taken', 'error');
          return;
        }

        updateData.username = editedUsername.toLowerCase().trim();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      // Update local state
      setProfile((prev) => prev ? { 
        ...prev, 
        full_name: editedName.trim(), 
        bio: editedBio.trim() || null,
        username: editedUsername.trim() || prev?.username || null
      } : null);
      
      setIsEditing(false);
      setEditedUsername('');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(t.profile.profileSaved, 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast(t.profile.profileSaveFailed, 'error');
    }
  };

  const handleChangePassword = async () => {
    if (!user) {
      showToast('You must be logged in to change password', 'error');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    try {
      // First, verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email || '',
        password: currentPassword
      });

      if (signInError) {
        showToast('Current password is incorrect', 'error');
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        throw updateError;
      }

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      showToast('Password changed successfully', 'success');
    } catch (error: any) {
      console.error('Error changing password:', error);
      showToast(error?.message || 'Failed to change password', 'error');
    }
  };

  const handleCancel = () => {
    setEditedName(profile?.full_name || '');
    setEditedBio(profile?.bio || '');
    setEditedUsername(profile?.username || '');
    setIsEditing(false);
    setIsChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const loadFollowers = async () => {
    if (!profileUserId) return;

    setLoadingFollows(true);
    try {
      // Get all follows where this user is being followed
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', profileUserId);

      if (followsError) throw followsError;

      if (!followsData || followsData.length === 0) {
        setFollowersList([]);
        setShowFollowersModal(true);
        return;
      }

      // Get all follower profiles
      const followerIds = followsData.map(f => f.follower_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', followerIds);

      if (profilesError) throw profilesError;

      setFollowersList(profilesData || []);
      setShowFollowersModal(true);
    } catch (error) {
      console.error('Error loading followers:', error);
      showToast('Failed to load followers', 'error');
    } finally {
      setLoadingFollows(false);
    }
  };

  const loadFollowing = async () => {
    if (!profileUserId) return;

    setLoadingFollows(true);
    try {
      // Get all follows where this user is following others
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profileUserId);

      if (followsError) throw followsError;

      if (!followsData || followsData.length === 0) {
        setFollowingList([]);
        setShowFollowingModal(true);
        return;
      }

      // Get all following profiles
      const followingIds = followsData.map(f => f.following_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', followingIds);

      if (profilesError) throw profilesError;

      setFollowingList(profilesData || []);
      setShowFollowingModal(true);
    } catch (error) {
      console.error('Error loading following:', error);
      showToast('Failed to load following', 'error');
    } finally {
      setLoadingFollows(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/signin');
      return;
    }

    if (!profileUserId) return;

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profileUserId);

        if (error) throw error;
        setIsFollowing(false);
        if (stats) {
          setStats({ ...stats, followers_count: Math.max(0, stats.followers_count - 1) });
        }
        showToast(t.profile.unfollowSuccess, 'info');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profileUserId,
          });

        if (error) throw error;
        setIsFollowing(true);
        if (stats) {
          setStats({ ...stats, followers_count: stats.followers_count + 1 });
        }
        showToast(t.profile.followSuccess, 'success');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      showToast(t.profile.followFailed, 'error');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Skip bucket check for now - assume it exists
      console.log('Skipping bucket check, proceeding with upload...');

      // Delete old avatar if exists (try to delete, but don't fail if it doesn't exist)
      if (profile?.avatar_url) {
        try {
          // Extract file path from URL - handle both full URLs and paths
          let fileName = '';
          if (profile.avatar_url.includes('/avatars/')) {
            const urlParts = profile.avatar_url.split('/avatars/');
            fileName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
          } else {
            const urlParts = profile.avatar_url.split('/');
            fileName = urlParts[urlParts.length - 1].split('?')[0];
          }
          
          if (fileName && fileName.includes('.')) {
            console.log('Attempting to delete old avatar:', fileName);
            const { error: deleteErr } = await supabase.storage.from('avatars').remove([fileName]);
            if (deleteErr) {
              console.log('Could not delete old avatar (may not exist):', deleteErr);
            } else {
              console.log('Old avatar deleted successfully');
            }
          }
        } catch (deleteError) {
          // Ignore delete errors - file might not exist
          console.log('Could not delete old avatar:', deleteError);
        }
      }

      // Upload new avatar with unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log('Uploading avatar:', { fileName, fileSize: file.size, fileType: file.type });

      // Try to upload
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Allow overwriting
          contentType: file.type
        });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        
        // Provide more specific error messages
        if (uploadErr.message?.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please check RLS policies for avatars bucket. Make sure you ran the storage migration.');
        } else if (uploadErr.message?.includes('Bucket not found')) {
          throw new Error('Avatars bucket not found. Please create "avatars" bucket in Supabase Storage and make it public.');
        } else {
          throw new Error(uploadErr.message || 'Failed to upload avatar. Error: ' + JSON.stringify(uploadErr));
        }
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for avatar');
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error details:', updateError);
        throw new Error(updateError.message || 'Failed to update profile with new avatar');
      }

      console.log('Profile updated successfully');

      // Reload profile to get updated data
      if (isOwnProfile) {
        const { data: updatedProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching updated profile:', fetchError);
        }
        
        if (updatedProfile) {
          setProfile(updatedProfile);
        } else {
          setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null);
        }
      } else {
        setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null);
      }

      showToast(t.profile.avatarUploaded, 'success');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error?.message || t.profile.avatarUploadFailed;
      showToast(errorMessage, 'error');
      
      // Also log to console for debugging
      console.error('Full error details:', {
        message: error?.message,
        error: error,
        user: user?.id,
        file: file?.name
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isOwnProfile && !user) {
    // Allow viewing other profiles without login
  } else if (isOwnProfile && !user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen relative pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  // Show blocked user message if user is blocked
  if (isBlocked && !isOwnProfile) {
    return (
      <div className="min-h-screen relative pt-24 pb-16 px-4 md:px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto z-10">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <User className="text-red-400" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Engellediğiniz Kullanıcı</h2>
            <p className="text-slate-400 mb-6">
              Bu kullanıcıyı engellemişsiniz. Profilini görüntüleyemezsiniz.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/social')}
                className="px-6 py-3 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                Geri Dön
              </button>
              <button
                onClick={async () => {
                  if (!user || !profileUserId) return;
                  try {
                    const { error } = await supabase
                      .from('user_blocks')
                      .delete()
                      .eq('blocker_id', user.id)
                      .eq('blocked_id', profileUserId);
                    
                    if (error) throw error;
                    
                    setIsBlocked(false);
                    showToast('Kullanıcının engeli kaldırıldı', 'success');
                    // Reload the page to show normal profile
                    window.location.reload();
                  } catch (error) {
                    console.error('Error unblocking user:', error);
                    showToast('Engel kaldırılamadı', 'error');
                  }
                }}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-500 hover:to-purple-500 transition-all"
              >
                Engeli Kaldır
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto z-10">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight">
            {t.profile.title}
          </h1>
          <p className="text-slate-400 text-lg">
            {isOwnProfile ? t.profile.manageAccount : t.profile.userProfile}
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 relative">
          {/* Profile Menu - Top Right Corner */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200"
            >
              <MoreVertical size={16} />
            </button>
            
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 top-10 w-48 bg-slate-900 border border-purple-500/30 rounded-lg shadow-2xl z-50 overflow-hidden">
                  {!isOwnProfile && user && (
                    <>
                      <button
                        onClick={handleToggleFavorite}
                        className="w-full px-3 py-2.5 text-left hover:bg-slate-950/50 transition-colors flex items-center gap-2 text-white text-sm"
                      >
                        {isFavorite ? (
                          <>
                            <StarOff size={16} className="text-yellow-400" />
                            <span>Favorilerden Çıkar</span>
                          </>
                        ) : (
                          <>
                            <Star size={16} className="text-yellow-400" />
                            <span>Favorilere Ekle</span>
                          </>
                        )}
                      </button>
                      
                      {isBlocked ? (
                        <button
                          onClick={handleUnblockUser}
                          className="w-full px-3 py-2.5 text-left hover:bg-slate-950/50 transition-colors flex items-center gap-2 text-green-400 text-sm"
                        >
                          <Ban size={16} />
                          <span>Engeli Kaldır</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleBlockUser}
                          className="w-full px-3 py-2.5 text-left hover:bg-slate-950/50 transition-colors flex items-center gap-2 text-red-400 text-sm"
                        >
                          <Ban size={16} />
                          <span>Kullanıcıyı Engelle</span>
                        </button>
                      )}
                      
                      <button
                        onClick={handleReportUser}
                        className="w-full px-3 py-2.5 text-left hover:bg-slate-950/50 transition-colors flex items-center gap-2 text-orange-400 text-sm border-t border-slate-700/50"
                      >
                        <Flag size={16} />
                        <span>Şikayet Et</span>
                      </button>
                    </>
                  )}
                  
                  {/* Report Info - Compact version in menu */}
                  {profileUserId && (
                    <div className="px-3 py-2 border-t border-slate-700/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Flag className={
                            dangerLevel === 'low' ? 'text-green-400' :
                            dangerLevel === 'medium' ? 'text-yellow-400' :
                            dangerLevel === 'high' ? 'text-orange-400' :
                            'text-red-400'
                          } size={12} />
                          <span className="text-xs text-slate-400">{t.profile.reportCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{reportCount}</span>
                          <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{
                            backgroundColor: dangerLevel === 'low' ? 'rgba(34, 197, 94, 0.2)' :
                                             dangerLevel === 'medium' ? 'rgba(234, 179, 8, 0.2)' :
                                             dangerLevel === 'high' ? 'rgba(249, 115, 22, 0.2)' :
                                             'rgba(239, 68, 68, 0.2)',
                            color: dangerLevel === 'low' ? 'rgb(34, 197, 94)' :
                                   dangerLevel === 'medium' ? 'rgb(234, 179, 8)' :
                                   dangerLevel === 'high' ? 'rgb(249, 115, 22)' :
                                   'rgb(239, 68, 68)'
                          }}>
                            {dangerLevel === 'low' ? t.profile.dangerLow :
                             dangerLevel === 'medium' ? t.profile.dangerMedium :
                             dangerLevel === 'high' ? t.profile.dangerHigh :
                             t.profile.dangerCritical}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-center gap-6 pb-6 border-b border-purple-500/20">
              <div className="relative group">
                {isOwnProfile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="relative w-32 h-32 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-pink-500/40 flex items-center justify-center overflow-hidden cursor-pointer disabled:cursor-not-allowed transition-all hover:border-pink-500/60 hover:scale-105 shadow-lg"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="text-pink-400" size={40} />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                      {uploadingAvatar ? (
                        <Loader2 className="animate-spin text-white" size={24} />
                      ) : (
                        <Upload className="text-white" size={24} />
                      )}
                    </div>
                  </button>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-2 border-pink-500/40 flex items-center justify-center overflow-hidden shadow-lg">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="text-pink-400" size={40} />
                    )}
                  </div>
                )}
                {isOwnProfile && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-2xl font-semibold text-white">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="bg-slate-950/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/60"
                        autoFocus
                      />
                    ) : (
                      profile?.full_name || profile?.username || 'User'
                    )}
                  </h2>
                  {!isEditing && profile?.username && (
                    <span className="text-slate-500 text-sm">@{profile.username}</span>
                  )}
                  {!isEditing && profile?.is_developer && (
                    <span className="px-2.5 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-lg text-cyan-400 text-xs font-semibold flex items-center gap-1.5">
                      <Sparkles size={12} />
                      {t.profile.developer}
                    </span>
                  )}
                  {!isEditing && profile?.plan_type && profile.plan_type !== 'trial' && (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      profile.plan_type === 'premium'
                        ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 text-yellow-400'
                        : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/40 text-blue-400'
                    }`}>
                      <Zap size={12} />
                      {profile.plan_type === 'premium' ? 'Premium' : 'Standard'}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <textarea
                    value={editedBio}
                    onChange={(e) => setEditedBio(e.target.value)}
                    placeholder={t.profile.bioPlaceholder}
                    className="w-full mt-2 bg-slate-950/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 resize-none"
                    rows={3}
                  />
                ) : (
                  profile?.bio && (
                    <p className="text-slate-300 mb-2">{profile.bio}</p>
                  )
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="mt-2 text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? t.profile.uploading : t.profile.changeAvatar}
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 pb-6 border-b border-purple-500/20">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <BookOpen className="text-purple-400" size={18} />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.public_dreams_count}</p>
                  <p className="text-slate-400 text-xs">{t.profile.publicDreams}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Heart className="text-pink-400" size={18} />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.total_likes_received}</p>
                  <p className="text-slate-400 text-xs">{t.profile.likesReceived}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <MessageCircle className="text-cyan-400" size={18} />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.total_comments_received}</p>
                  <p className="text-slate-400 text-xs">{t.profile.comments}</p>
                </div>
                <button
                  onClick={loadFollowers}
                  className="text-center hover:bg-slate-950/30 rounded-lg p-2 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Users className="text-purple-400" size={18} />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.followers_count}</p>
                  <p className="text-slate-400 text-xs">{t.profile.followers}</p>
                </button>
                <button
                  onClick={loadFollowing}
                  className="text-center hover:bg-slate-950/30 rounded-lg p-2 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <User className="text-pink-400" size={18} />
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.following_count}</p>
                  <p className="text-slate-400 text-xs">{t.profile.following}</p>
                </button>
              </div>
            )}


            {/* Profile Details */}
            {isOwnProfile && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-950/30 rounded-lg">
                  <Mail className="text-purple-400" size={20} />
                  <div className="flex-1">
                    <p className="text-slate-400 text-sm">{t.profile.email}</p>
                    <p className="text-white">{profile?.email}</p>
                  </div>
                </div>

                {/* Username */}
                <div className="p-4 bg-slate-950/30 rounded-lg">
                  <div className="flex items-center gap-4 mb-2">
                    <Grid3x3 className="text-cyan-400" size={20} />
                    <div className="flex-1">
                      <p className="text-slate-400 text-sm mb-2">Username</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedUsername}
                          onChange={(e) => setEditedUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="username"
                          className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                          maxLength={30}
                        />
                      ) : (
                        <p className="text-white">@{profile?.username || 'No username'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password Change - Only visible when editing */}
                {isOwnProfile && isEditing && (
                  <div className="p-4 bg-slate-950/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <User className="text-pink-400" size={20} />
                        <div>
                          <p className="text-slate-400 text-sm">Password</p>
                          <p className="text-white text-sm">••••••••</p>
                        </div>
                      </div>
                      {!isChangingPassword ? (
                        <button
                          onClick={() => setIsChangingPassword(true)}
                          className="px-4 py-2 text-sm bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg text-purple-400 transition-all"
                        >
                          Change Password
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setIsChangingPassword(false);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    {isChangingPassword && (
                      <div className="space-y-3 mt-4">
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                        />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password (min 6 characters)"
                          className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                        />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                        />
                        <button
                          onClick={handleChangePassword}
                          className="w-full px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-lg hover:from-pink-500 hover:to-purple-500 transition-all"
                        >
                          Update Password
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 p-4 bg-slate-950/30 rounded-lg">
                  <Calendar className="text-pink-400" size={20} />
                  <div className="flex-1">
                    <p className="text-slate-400 text-sm">{t.profile.memberSince}</p>
                    <p className="text-white">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-purple-500/20">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                  >
                    <Save size={18} />
                    {t.profile.saveChanges}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-all duration-300"
                  >
                    <X size={18} />
                    {t.profile.cancel}
                  </button>
                </>
              ) : (
                <>
                  {isOwnProfile ? (
                    <button
                      onClick={() => {
                        setEditedName(profile?.full_name || '');
                        setEditedBio(profile?.bio || '');
                        setEditedUsername(profile?.username || '');
                        setIsEditing(true);
                      }}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 text-pink-300 hover:border-pink-400/50 hover:text-pink-200 transition-all duration-300"
                    >
                      <Edit2 size={18} />
                      {t.profile.editProfile}
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={handleFollow}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                          isFollowing
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                            : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-500 hover:to-purple-500'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck size={18} />
                            {t.profile.followingButton}
                          </>
                        ) : (
                          <>
                            <UserPlus size={18} />
                            {t.profile.follow}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => navigate(`/messages?user=${profileUserId}`)}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 transition-all duration-300"
                      >
                        <MessageCircle size={18} />
                        {t.profile.message}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Public Dreams Grid - Instagram Style */}
        {!isOwnProfile && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-purple-500/20">
              <Grid3x3 className="text-purple-400" size={20} />
              <h2 className="text-2xl font-semibold text-white">{t.profile.publicDreamsTitle}</h2>
            </div>

            {loadingDreams ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-purple-400" size={32} />
              </div>
            ) : publicDreams.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto mb-4 text-slate-600" size={48} />
                <p className="text-slate-400">{t.profile.noPublicDreams}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {publicDreams.map((dream) => (
                  <div
                    key={dream.id}
                    onClick={() => navigate(`/social`)}
                    className="group relative aspect-square bg-slate-900/50 border border-purple-500/20 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500/40 transition-all"
                  >
                    {dream.image_url ? (
                      <img
                        src={dream.image_url}
                        alt="Dream"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                        <Sparkles className="text-purple-400/50" size={32} />
                      </div>
                    )}
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-6 text-white">
                        <div className="flex items-center gap-2">
                          <Heart size={20} />
                          <span className="font-semibold">{dream.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle size={20} />
                          <span className="font-semibold">{dream.comments_count}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    {dream.status === 'pending' && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-yellow-500/90 text-yellow-900 text-xs font-semibold rounded backdrop-blur-sm">
                          {t.social.pending}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowFollowersModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t.profile.followers}</h3>
              <button
                onClick={() => setShowFollowersModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {loadingFollows ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-purple-400" size={32} />
                </div>
              ) : followersList.length === 0 ? (
                <p className="text-slate-400 text-center py-8">{t.profile.noFollowers}</p>
              ) : (
                <div className="space-y-3">
                  {followersList.map((follower) => (
                    <button
                      key={follower.id}
                      onClick={() => {
                        setShowFollowersModal(false);
                        navigate(`/profile/${follower.id}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-950/50 rounded-lg transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden">
                        {follower.avatar_url ? (
                          <img src={follower.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium">{follower.full_name}</p>
                        {follower.username && (
                          <p className="text-slate-400 text-sm">@{follower.username}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowFollowingModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl z-50 max-h-[70vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t.profile.following}</h3>
              <button
                onClick={() => setShowFollowingModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {loadingFollows ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-purple-400" size={32} />
                </div>
              ) : followingList.length === 0 ? (
                <p className="text-slate-400 text-center py-8">{t.profile.noFollowing}</p>
              ) : (
                <div className="space-y-3">
                  {followingList.map((following) => (
                    <button
                      key={following.id}
                      onClick={() => {
                        setShowFollowingModal(false);
                        navigate(`/profile/${following.id}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-950/50 rounded-lg transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden">
                        {following.avatar_url ? (
                          <img src={following.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-medium">{following.full_name}</p>
                        {following.username && (
                          <p className="text-slate-400 text-sm">@{following.username}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


