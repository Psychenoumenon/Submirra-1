import { useState, useEffect, useRef } from 'react';
import { User, Mail, Calendar, Edit2, Save, X, Upload, Loader2, Users, Heart, MessageCircle, BookOpen, UserPlus, UserCheck, Grid3x3, Sparkles, Settings, Ban, Trash2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [blockedUsers, setBlockedUsers] = useState<Array<{id: string; full_name: string; username: string | null; avatar_url: string | null}>>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
      loadOtherUserProfile(userId);
      loadOtherUserStats(userId);
      loadPublicDreams(userId);
      if (user) {
        checkFollowingStatus(userId);
      }
    } else {
      // Viewing own profile
      if (!user) {
        navigate('/signin');
        return;
      }
      setProfileUserId(user.id);
      setIsOwnProfile(true);
      loadProfile();
      loadStats();
      loadPublicDreams(user.id);
    }
  }, [user, navigate, currentPage, window.location.pathname]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        full_name: data.full_name || '',
        email: data.email || user.email || '',
        created_at: data.created_at || user.created_at || '',
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
        username: data.username || null,
      });
      setEditedName(data.full_name || '');
      setEditedBio(data.bio || '');
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOtherUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile({
        full_name: data.full_name || '',
        email: '', // Don't show email for other users
        created_at: data.created_at || '',
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
        username: data.username || null,
      });
    } catch (error) {
      console.error('Error loading other user profile:', error);
      showToast('Failed to load profile', 'error');
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
        // Manual calculation
        const [dreamsRes, followersRes, followingRes] = await Promise.all([
          supabase.from('dreams').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_public', true),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
        ]);

        setStats({
          public_dreams_count: dreamsRes.count || 0,
          total_likes_received: 0,
          total_comments_received: 0,
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
      const { data: dreamsData, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .in('status', ['completed', 'pending'])
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      const dreamIds = (dreamsData || []).map(d => d.id);
      
      let likesData: any[] = [];
      let commentsData: any[] = [];

      if (dreamIds.length > 0) {
        try {
          const { data: likes } = await supabase
            .from('dream_likes')
            .select('dream_id')
            .in('dream_id', dreamIds);
          likesData = likes || [];
        } catch (e) {
          console.log('Error loading likes:', e);
        }

        try {
          const { data: comments } = await supabase
            .from('dream_comments')
            .select('dream_id')
            .in('dream_id', dreamIds);
          commentsData = comments || [];
        } catch (e) {
          console.log('Error loading comments:', e);
        }
      }

      const likesMap = new Map<string, number>();
      const commentsMap = new Map<string, number>();

      likesData.forEach(like => {
        likesMap.set(like.dream_id, (likesMap.get(like.dream_id) || 0) + 1);
      });

      commentsData.forEach(comment => {
        commentsMap.set(comment.dream_id, (commentsMap.get(comment.dream_id) || 0) + 1);
      });

      const dreamsWithStats = (dreamsData || []).map(dream => ({
        ...dream,
        likes_count: likesMap.get(dream.id) || 0,
        comments_count: commentsMap.get(dream.id) || 0,
      }));

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
        // Manual calculation if view doesn't exist
        const [dreamsRes, _likesRes, _commentsRes, followersRes, followingRes] = await Promise.all([
          supabase.from('dreams').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_public', true),
          supabase.from('dream_likes').select('dream_id').eq('dreams.user_id', user.id),
          supabase.from('dream_comments').select('dream_id').eq('dreams.user_id', user.id),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
          supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        ]);

        setStats({
          public_dreams_count: dreamsRes.count || 0,
          total_likes_received: 0, // Would need join
          total_comments_received: 0, // Would need join
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

    try {
      const updateData: any = { 
        full_name: editedName.trim(),
        updated_at: new Date().toISOString()
      };
      
      if (editedBio !== undefined) {
        updateData.bio = editedBio.trim() || null;
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
        bio: editedBio.trim() || null 
      } : null);
      
      setIsEditing(false);
      showToast(t.profile.profileSaved, 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast(t.profile.profileSaveFailed, 'error');
    }
  };

  const handleCancel = () => {
    setEditedName(profile?.full_name || '');
    setEditedBio(profile?.bio || '');
    setIsEditing(false);
  };

  const loadFollowers = async () => {
    if (!profileUserId) return;

    setLoadingFollows(true);
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          follower:follower_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('following_id', profileUserId);

      if (error) throw error;

      const followers = (data || []).map((item: any) => item.follower).filter(Boolean);
      setFollowersList(followers);
      setShowFollowersModal(true);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoadingFollows(false);
    }
  };

  const loadFollowing = async () => {
    if (!profileUserId) return;

    setLoadingFollows(true);
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(`
          following_id,
          following:following_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('follower_id', profileUserId);

      if (error) throw error;

      const following = (data || []).map((item: any) => item.following).filter(Boolean);
      setFollowingList(following);
      setShowFollowingModal(true);
    } catch (error) {
      console.error('Error loading following:', error);
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

  const loadBlockedUsers = async () => {
    if (!user) return;

    setLoadingBlocked(true);
    try {
      // Get blocked user IDs
      const { data: blocks, error: blocksError } = await supabase
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      if (blocksError) throw blocksError;

      if (blocks && blocks.length > 0) {
        // Get profiles of blocked users
        const blockedIds = blocks.map(b => b.blocked_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', blockedIds);

        if (profilesError) throw profilesError;

        setBlockedUsers(profiles || []);
      } else {
        setBlockedUsers([]);
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
      showToast('Failed to load blocked users', 'error');
    } finally {
      setLoadingBlocked(false);
    }
  };

  const unblockUser = async (blockedUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;

      // Update local state
      setBlockedUsers(prev => prev.filter(u => u.id !== blockedUserId));
      showToast('User unblocked successfully', 'success');
    } catch (error) {
      console.error('Error unblocking user:', error);
      showToast('Failed to unblock user', 'error');
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

      // Check if avatars bucket exists, create if it doesn't
      const { data: buckets } = await supabase.storage.listBuckets();
      const avatarsBucketExists = buckets?.some(b => b.name === 'avatars');
      
      if (!avatarsBucketExists) {
        console.log('Avatars bucket not found, attempting to create...');
        
        // Try to create the bucket
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        });

        if (createError) {
          console.error('Failed to create avatars bucket:', createError);
          throw new Error('Storage bucket not found. Please create "avatars" bucket in Supabase Storage Dashboard (Settings > Storage) and make it public.');
        }
        
        console.log('Avatars bucket created successfully:', newBucket);
      }

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
          throw new Error('Permission denied. Please check storage permissions in Supabase Dashboard.');
        } else if (uploadErr.message?.includes('Bucket not found') || uploadErr.message?.includes('bucket') || uploadErr.message?.includes('Not found')) {
          throw new Error('Storage bucket error. Please try refreshing the page and trying again.');
        } else {
          throw new Error(uploadErr.message || 'Failed to upload avatar. Please try again.');
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

        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8">
          <div className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-center gap-6 pb-6 border-b border-purple-500/20">
              <div className="relative group">
                {isOwnProfile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="relative w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden cursor-pointer disabled:cursor-not-allowed transition-all hover:border-pink-500/50"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
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
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
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
                <div className="flex items-center gap-3 mb-2">
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
                  {profile?.username && (
                    <span className="text-slate-500 text-sm">@{profile.username}</span>
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

            {/* Tab Navigation - Only show for own profile */}
            {isOwnProfile && (
              <div className="flex gap-4 border-b border-purple-500/20 mb-6">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`pb-3 px-4 font-medium transition-all ${
                    activeTab === 'profile'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    loadBlockedUsers();
                  }}
                  className={`pb-3 px-4 font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'settings'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Settings size={18} />
                  Settings
                </button>
              </div>
            )}

            {/* Stats */}
            {stats && activeTab === 'profile' && (
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
            {isOwnProfile && activeTab === 'profile' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-950/30 rounded-lg">
                  <Mail className="text-purple-400" size={20} />
                  <div className="flex-1">
                    <p className="text-slate-400 text-sm">{t.profile.email}</p>
                    <p className="text-white">{profile?.email}</p>
                  </div>
                </div>

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
            {activeTab === 'profile' && (
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
                      onClick={() => setIsEditing(true)}
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
            )}

            {/* Settings Tab Content */}
            {activeTab === 'settings' && isOwnProfile && (
              <div className="space-y-6">
                <div className="border-b border-purple-500/20 pb-4 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Ban className="text-red-400" size={24} />
                    <h3 className="text-xl font-semibold text-white">Blocked Users</h3>
                  </div>
                  <p className="text-slate-400 text-sm">Users you have blocked will not be able to message you or interact with your content.</p>
                </div>

                {loadingBlocked ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-purple-400" size={32} />
                  </div>
                ) : blockedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Ban className="mx-auto mb-4 text-slate-600" size={48} />
                    <p className="text-slate-400">No blocked users</p>
                    <p className="text-slate-500 text-sm mt-2">When you block someone, they'll appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blockedUsers.map((blockedUser) => (
                      <div
                        key={blockedUser.id}
                        className="flex items-center gap-4 p-4 bg-slate-950/30 rounded-lg hover:bg-slate-950/50 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {blockedUser.avatar_url ? (
                            <img src={blockedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{blockedUser.full_name}</p>
                          {blockedUser.username && (
                            <p className="text-slate-400 text-sm truncate">@{blockedUser.username}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Unblock ${blockedUser.full_name}?`)) {
                              unblockUser(blockedUser.id);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 size={16} />
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Public Dreams Grid - Instagram Style */}
        {((!isOwnProfile) || (isOwnProfile && activeTab === 'profile')) && (
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
                <p className="text-slate-400 text-center py-8">No followers yet</p>
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
                <p className="text-slate-400 text-center py-8">Not following anyone yet</p>
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


