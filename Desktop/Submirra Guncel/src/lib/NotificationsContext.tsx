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
      // Initial fetch
      refreshNotifications();
      refreshMessages();

      // Polling: Check for new notifications every 1 second
      const pollingInterval = setInterval(() => {
        refreshNotifications();
        refreshMessages();
      }, 1000);

      return () => {
        clearInterval(pollingInterval);
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
