import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Shield, User, Loader2, Bell, Lock, Star, UserX } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { useLanguage } from '../lib/i18n';

interface BlockedUser {
  id: string;
  blocked_id: string;
  blocked_user: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

interface FavoriteUser {
  id: string;
  favorite_user_id: string;
  favorite_user: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocked' | 'favorites' | 'privacy' | 'notifications'>('blocked');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [favoriteUsers, setFavoriteUsers] = useState<FavoriteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [loadingReadReceipts, setLoadingReadReceipts] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadBlockedUsers();
      loadFavoriteUsers();
      loadReadReceiptsSetting();
    }
  }, [isOpen, user]);

  const loadBlockedUsers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Loading blocked users for user:', user.id);
      
      // First get the blocked user IDs
      const { data: blocksData, error: blocksError } = await supabase
        .from('user_blocks')
        .select('id, blocked_id')
        .eq('blocker_id', user.id);

      if (blocksError) {
        console.error('Error loading blocks:', blocksError);
        throw blocksError;
      }

      console.log('Found blocks:', blocksData);

      if (!blocksData || blocksData.length === 0) {
        setBlockedUsers([]);
        return;
      }

      // Then get the profile information for each blocked user
      const blockedUserIds = blocksData.map(block => block.blocked_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', blockedUserIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      console.log('Found profiles:', profilesData);

      // Combine the data
      const formattedData = blocksData.map(block => {
        const profile = profilesData?.find(p => p.id === block.blocked_id);
        return {
          id: block.id,
          blocked_id: block.blocked_id,
          blocked_user: profile || {
            id: block.blocked_id,
            full_name: 'Unknown User',
            username: null,
            avatar_url: null
          }
        };
      }).filter(item => item.blocked_user);

      console.log('Final formatted data:', formattedData);
      setBlockedUsers(formattedData);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      showToast('Failed to load blocked users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteUsers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Loading favorite users for user:', user.id);
      
      // First get the favorite user IDs
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('user_favorites')
        .select('id, favorite_user_id')
        .eq('user_id', user.id);

      if (favoritesError) {
        console.error('Error loading favorites:', favoritesError);
        throw favoritesError;
      }

      console.log('Found favorites:', favoritesData);

      if (!favoritesData || favoritesData.length === 0) {
        setFavoriteUsers([]);
        return;
      }

      // Then get the profile information for each favorite user
      const favoriteUserIds = favoritesData.map(fav => fav.favorite_user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', favoriteUserIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      console.log('Found profiles:', profilesData);

      // Combine the data
      const formattedData = favoritesData.map(favorite => {
        const profile = profilesData?.find(p => p.id === favorite.favorite_user_id);
        return {
          id: favorite.id,
          favorite_user_id: favorite.favorite_user_id,
          favorite_user: profile || {
            id: favorite.favorite_user_id,
            full_name: 'Unknown User',
            username: null,
            avatar_url: null
          }
        };
      }).filter(item => item.favorite_user);

      console.log('Final formatted favorites data:', formattedData);
      setFavoriteUsers(formattedData);
    } catch (error) {
      console.error('Error loading favorite users:', error);
      showToast('Failed to load favorite users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (blockId: string, userName: string) => {
    if (!user) return;

    if (!confirm(`${t.settings.unblockConfirm} ${userName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
      showToast(`${userName} ${t.settings.unblockSuccess}`, 'success');
    } catch (error) {
      console.error('Error unblocking user:', error);
      showToast('Failed to unblock user', 'error');
    }
  };

  const removeFavorite = async (favoriteId: string, userName: string) => {
    if (!user) return;

    if (!confirm(`${userName} kullanıcısını favorilerden çıkarmak istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavoriteUsers(prev => prev.filter(f => f.id !== favoriteId));
      showToast(`${userName} favorilerden çıkarıldı`, 'success');
    } catch (error) {
      console.error('Error removing favorite:', error);
      showToast('Favori kaldırılamadı', 'error');
    }
  };

  const loadReadReceiptsSetting = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('show_read_receipts')
        .eq('id', user.id)
        .single();
      if (data) {
        setShowReadReceipts(data.show_read_receipts !== false);
      }
    } catch (error) {
      console.error('Error loading read receipts setting:', error);
    }
  };

  const updateReadReceipts = async (enabled: boolean) => {
    if (!user) return;
    setLoadingReadReceipts(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ show_read_receipts: enabled })
        .eq('id', user.id);

      if (error) throw error;

      setShowReadReceipts(enabled);
      showToast(
        enabled 
          ? (t.settings.readReceiptsEnabled || 'Read receipts enabled')
          : (t.settings.readReceiptsDisabled || 'Read receipts disabled'),
        'success'
      );
    } catch (error) {
      console.error('Error updating read receipts:', error);
      showToast(t.settings.readReceiptsUpdateError || 'Failed to update read receipts', 'error');
    } finally {
      setLoadingReadReceipts(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-purple-400 transition-colors"
        title={t.settings.title}
      >
        <SettingsIcon size={20} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-[600px] h-[calc(90vh-3rem)] bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-3 border-b border-purple-500/20 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t.settings.title}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-purple-500/20">
              <button
                onClick={() => setActiveTab('blocked')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'blocked'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield size={14} className="inline mr-1.5" />
                {t.settings.blockedUsers}
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'favorites'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Star size={14} className="inline mr-1.5" />
                {t.settings.favorites}
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`flex-1 px-2 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'privacy'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock size={14} className="inline mr-1.5" />
                {t.settings.privacy}
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 px-2 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'notifications'
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bell size={14} className="inline mr-1.5" />
                {t.settings.notifications}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-3 overflow-hidden">
              {activeTab === 'blocked' && (
                <div>
                  <p className="text-slate-400 text-xs mb-3">
                    {t.settings.blockedUsersDesc}
                  </p>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-purple-400" size={24} />
                    </div>
                  ) : blockedUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="mx-auto mb-3 text-slate-600" size={40} />
                      <p className="text-slate-400">{t.settings.noBlockedUsers}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[calc(90vh-20rem)] overflow-y-auto">
                      {blockedUsers.map((block) => (
                        <div
                          key={block.id}
                          className="flex items-center gap-3 p-2.5 bg-slate-950/30 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden">
                            {block.blocked_user.avatar_url ? (
                              <img
                                src={block.blocked_user.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={20} className="text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">
                              {block.blocked_user.full_name}
                            </p>
                            {block.blocked_user.username && (
                              <p className="text-slate-400 text-xs">
                                @{block.blocked_user.username}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => unblockUser(block.id, block.blocked_user.full_name)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm transition-colors"
                          >
                            {t.settings.unblock}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'favorites' && (
                <div>
                  <p className="text-slate-400 text-xs mb-3">
                    {t.settings.favoritesDesc}
                  </p>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-purple-400" size={24} />
                    </div>
                  ) : favoriteUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="mx-auto mb-3 text-slate-600" size={40} />
                      <p className="text-slate-400">{t.settings.noFavorites}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[calc(90vh-20rem)] overflow-y-auto">
                      {favoriteUsers.map((favorite) => (
                        <div
                          key={favorite.id}
                          className="flex items-center gap-3 p-2.5 bg-slate-950/30 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center overflow-hidden">
                            {favorite.favorite_user.avatar_url ? (
                              <img
                                src={favorite.favorite_user.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User size={20} className="text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">
                              {favorite.favorite_user.full_name}
                            </p>
                            {favorite.favorite_user.username && (
                              <p className="text-slate-400 text-xs">
                                @{favorite.favorite_user.username}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFavorite(favorite.id, favorite.favorite_user.full_name)}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition-colors"
                          >
                            {t.settings.remove}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-3">
                  <p className="text-slate-400 text-xs mb-3">
                    {t.settings.privacyDesc}
                  </p>
                  <div className="space-y-2">
                    <div className="p-2.5 bg-slate-950/30 rounded-lg">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-white text-sm">{t.settings.profileVisibility}</span>
                        <select className="bg-slate-800 border border-purple-500/30 rounded px-3 py-1.5 text-white text-sm">
                          <option>{t.settings.public}</option>
                          <option>{t.settings.private}</option>
                        </select>
                      </label>
                    </div>
                    <div className="p-2.5 bg-slate-950/30 rounded-lg">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-white text-sm">{t.settings.allowMessagesFrom}</span>
                        <select className="bg-slate-800 border border-purple-500/30 rounded px-3 py-1.5 text-white text-sm">
                          <option>{t.settings.everyone}</option>
                          <option>{t.settings.followingOnly}</option>
                        </select>
                      </label>
                    </div>
                    <div className="p-2.5 bg-slate-950/30 rounded-lg">
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex-1">
                          <span className="text-white text-sm block">{t.settings.showReadReceipts || 'Show Read Receipts'}</span>
                          <span className="text-slate-400 text-xs block mt-0.5">{t.settings.showReadReceiptsDesc || 'Let others know when you\'ve seen their messages'}</span>
                        </div>
                        {loadingReadReceipts ? (
                          <Loader2 className="animate-spin text-purple-400" size={20} />
                        ) : (
                          <input
                            type="checkbox"
                            checked={showReadReceipts}
                            onChange={(e) => updateReadReceipts(e.target.checked)}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-3">
                  <p className="text-slate-400 text-xs mb-3">
                    {t.settings.notificationsDesc}
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-2.5 bg-slate-950/30 rounded-lg cursor-pointer">
                      <span className="text-white text-sm">{t.settings.likesOnDreams}</span>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </label>
                    <label className="flex items-center justify-between p-2.5 bg-slate-950/30 rounded-lg cursor-pointer">
                      <span className="text-white text-sm">{t.settings.comments}</span>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </label>
                    <label className="flex items-center justify-between p-2.5 bg-slate-950/30 rounded-lg cursor-pointer">
                      <span className="text-white text-sm">{t.settings.newFollowers}</span>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </label>
                    <label className="flex items-center justify-between p-2.5 bg-slate-950/30 rounded-lg cursor-pointer">
                      <span className="text-white text-sm">{t.settings.directMessages}</span>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
