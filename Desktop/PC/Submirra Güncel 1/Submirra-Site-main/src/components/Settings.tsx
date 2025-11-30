import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X, Shield, User, Loader2, Bell, Lock } from 'lucide-react';
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

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocked' | 'privacy' | 'notifications'>('blocked');
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadBlockedUsers();
    }
  }, [isOpen, user]);

  const loadBlockedUsers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocked_id,
          blocked_user:blocked_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('blocker_id', user.id);

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        blocked_id: item.blocked_id,
        blocked_user: Array.isArray(item.blocked_user) ? item.blocked_user[0] : item.blocked_user
      })).filter((item: any) => item.blocked_user);

      setBlockedUsers(formattedData);
    } catch (error) {
      console.error('Error loading blocked users:', error);
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
                onClick={() => setActiveTab('privacy')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
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
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
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
