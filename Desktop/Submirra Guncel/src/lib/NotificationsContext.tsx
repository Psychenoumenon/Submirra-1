import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from './supabase';

interface NotificationsContextType {
  unreadCount: number;
  unreadMessages: number;
  refreshNotifications: () => void;
  refreshMessages: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshNotifications = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, read_at')
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      setUnreadCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading unread notifications:', error);
    }
  };

  const refreshMessages = async () => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) throw error;
      setUnreadMessages(count || 0);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  useEffect(() => {
    if (user) {
      refreshNotifications();
      refreshMessages();

      // Subscribe to notifications changes (realtime)
      const notificationsSubscription = supabase
        .channel(`notifications_badge_${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          refreshNotifications();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          refreshNotifications();
        })
        .subscribe();

      // Subscribe to messages changes (realtime)
      const messagesSubscription = supabase
        .channel(`messages_badge_${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        }, () => {
          refreshMessages();
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        }, () => {
          refreshMessages();
        })
        .subscribe();

      return () => {
        notificationsSubscription.unsubscribe();
        messagesSubscription.unsubscribe();
      };
    }
  }, [user]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, unreadMessages, refreshNotifications, refreshMessages }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
