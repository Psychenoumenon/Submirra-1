import { useState, useEffect, useCallback } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, X, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from './Router';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import { useLanguage } from '../lib/i18n';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'dream_completed' | 'trial_expired';
  actor_id: string | null;
  dream_id: string | null;
  comment_id: string | null;
  created_at: string;
  read_at: string | null;
  actor_profile: {
    full_name: string;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor_profile:actor_id (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedNotifications = (data || []).map(notif => ({
        ...notif,
        actor_profile: notif.actor_profile || (notif.type === 'dream_completed' ? null : { full_name: 'Anonymous', avatar_url: null, username: null })
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Function to add a single new notification instantly
  const addNewNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      // Fetch only the new notification with its profile
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor_profile:actor_id (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('id', notificationId)
        .single();

      if (error) throw error;

      const formattedNotification = {
        ...data,
        actor_profile: data.actor_profile || (data.type === 'dream_completed' ? null : { full_name: 'Anonymous', avatar_url: null, username: null })
      };

      // Add to the beginning of the list instantly
      setNotifications(prev => {
        // Check if notification already exists (prevent duplicates)
        if (prev.some(n => n.id === notificationId)) {
          return prev;
        }
        return [formattedNotification, ...prev];
      });

      // Increment unread count instantly
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      if (formattedNotification.type === 'dream_completed') {
        showToast(t.notifications.dreamCompletedToast, 'success');
      }
    } catch (error) {
      console.error('Error adding new notification:', error);
      // Fallback: reload all notifications if single fetch fails
      loadNotifications();
    }
  }, [user, loadNotifications, showToast]);

  useEffect(() => {
    if (!user) return;

    // CRITICAL: Set up real-time subscription FIRST, then load notifications
    // This ensures we don't miss any notifications that arrive during page load
    const notificationsChannel = supabase
      .channel(`notifications-${user.id}-${Date.now()}`) // Unique channel name to avoid conflicts
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received instantly:', payload);
          // Add notification instantly without reloading all
          if (payload.new?.id) {
            addNewNotification(payload.new.id);
          }
        }
      )
      .subscribe();

    // Load notifications immediately after setting up subscription
    // Subscription will catch any notifications that arrive during/after load
    loadNotifications();

    // Also listen to dreams table updates to catch when status changes to 'completed'
    // The notification INSERT event will be triggered by the database trigger,
    // so we don't need to reload here - the notification will come instantly via INSERT event
    // This is just a backup in case the trigger is slow
    const dreamsChannel = supabase
      .channel(`dreams-status-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dreams',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Dream status changed:', payload);
          // Check if status changed to 'completed'
          if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
            console.log('Dream completed - notification should arrive via INSERT event');
            // No delay needed - notification INSERT will trigger instantly via trigger
            // This is just a safety net in case trigger is delayed
            setTimeout(() => {
              loadNotifications();
            }, 2000); // Only as fallback after 2 seconds if notification didn't arrive
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(dreamsChannel);
    };
  }, [user, loadNotifications, addNewNotification]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const deletedNotif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (deletedNotif && !deletedNotif.read_at) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      showToast(t.notifications.deleteError, 'error');
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
      showToast(t.notifications.markAllReadSuccess, 'success');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast(t.notifications.markAllReadError, 'error');
    }
  };

  const deleteAllNotifications = async () => {
    if (!user) return;

    if (!confirm(t.notifications.deleteAllConfirm || 'Are you sure you want to delete all notifications?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      showToast(t.notifications.deleteAllSuccess || 'All notifications deleted', 'success');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      showToast(t.notifications.deleteAllError || 'Failed to delete all notifications', 'error');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setIsOpen(false);

    if (notification.type === 'dream_completed') {
      navigate('/library');
    } else if (notification.type === 'trial_expired') {
      navigate('/pricing');
    } else if (notification.dream_id) {
      navigate('/social');
      // Could navigate to specific dream if we had a route
    } else if (notification.type === 'follow' && notification.actor_id) {
      navigate(`/profile/${notification.actor_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="text-pink-400" size={18} />;
      case 'comment':
        return <MessageCircle className="text-purple-400" size={18} />;
      case 'follow':
        return <UserPlus className="text-cyan-400" size={18} />;
      case 'dream_completed':
        return <CheckCircle className="text-green-400" size={18} />;
      case 'trial_expired':
        return <AlertCircle className="text-yellow-400" size={18} />;
      default:
        return <Bell className="text-slate-400" size={18} />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    if (notification.type === 'dream_completed') {
      return t.notifications.dreamCompleted;
    }
    
    if (notification.type === 'trial_expired') {
      return t.notifications.trialExpired;
    }
    
    const name = notification.actor_profile?.full_name || notification.actor_profile?.username || t.notifications.someone;
    switch (notification.type) {
      case 'like':
        return `${name} ${t.notifications.someoneLiked}`;
      case 'comment':
        return `${name} ${t.notifications.someoneCommented}`;
      case 'follow':
        return `${name} ${t.notifications.someoneFollowed}`;
      default:
        return t.notifications.newNotification;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t.notifications.justNow;
    if (minutes < 60) return `${minutes} ${t.notifications.minutesAgo}`;
    if (hours < 24) return `${hours} ${t.notifications.hoursAgo}`;
    if (days < 7) return `${days} ${t.notifications.daysAgo}`;
    
    const locale = language === 'tr' ? 'tr-TR' : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-purple-400 transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-pink-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 w-[600px] max-h-[700px] bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-w-[95vw]">
            <div className="p-5 border-b border-purple-500/20 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">{t.notifications.title}</h3>
              <div className="flex gap-2 items-center">
                {notifications.length > 0 && (
                  <button
                    onClick={deleteAllNotifications}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10 flex items-center gap-1"
                    title={t.notifications.deleteAll || 'Delete all notifications'}
                  >
                    <Trash2 size={12} />
                    {t.notifications.deleteAll || 'Delete all'}
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded hover:bg-purple-500/10"
                  >
                    {t.notifications.markAllRead}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title={t.notifications.close}
                  aria-label={t.notifications.close}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 scrollbar-hide">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-purple-400" size={24} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="mx-auto mb-4 text-slate-600" size={48} />
                  <p className="text-slate-400">{t.notifications.noNotifications}</p>
                </div>
              ) : (
                <div className="divide-y divide-purple-500/10">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative group ${
                        !notification.read_at ? 'bg-purple-500/5' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="w-full p-3 text-left hover:bg-slate-950/50 transition-colors"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex gap-2.5 items-start">
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs leading-relaxed break-words break-all overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}>
                                {getNotificationText(notification)}
                              </p>
                            </div>
                            {!notification.read_at && (
                              <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 pl-5">
                            <p className="text-slate-400 text-xs whitespace-nowrap">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => deleteNotification(notification.id, e)}
                        className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete notification"
                      >
                        <X size={14} />
                      </button>
                    </div>
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

