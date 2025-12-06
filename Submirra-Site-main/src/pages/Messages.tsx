import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, User, ArrowLeft, Loader2, Search, MessageCircle, Trash2, Ban, MoreVertical, Reply, Check, CheckCheck, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  read_at: string | null;
  seen_at: string | null;
  reply_to: string | null;
  created_at: string;
  reply_message?: Message | null; // For displaying replied message
}

interface Conversation {
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
}

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [selectedUserProfile, setSelectedUserProfile] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check URL for user parameter and auto-select conversation
  useEffect(() => {
    if (user) {
      const urlParams = new URLSearchParams(window.location.search);
      const userIdParam = urlParams.get('user');
      if (userIdParam && userIdParam !== selectedConversation) {
        setSelectedConversation(userIdParam);
      }
    }
  }, [user, selectedConversation]);

  useEffect(() => {
    try {
      // Wait for auth to finish loading before checking user
      if (authLoading) return;
      
      if (!user) {
        navigate('/signin');
        return;
      }

      // Define loadConversations inline to avoid dependency issues
      const loadConversations = async () => {
      if (!user) return;

      try {
        // Get hidden conversations from localStorage
        const hiddenListKey = `hidden_conversations_${user.id}`;
        const hiddenConversations = new Set<string>(JSON.parse(localStorage.getItem(hiddenListKey) || '[]'));

        // Get blocked users (both directions)
        const { data: blockedData } = await supabase
          .from('user_blocks')
          .select('blocker_id, blocked_id')
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

        const blockedUserIds = new Set<string>();
        blockedData?.forEach(block => {
          if (block.blocker_id === user.id) {
            blockedUserIds.add(block.blocked_id);
          } else {
            blockedUserIds.add(block.blocker_id);
          }
        });

        // Get all messages where user is sender or receiver
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('sender_id, receiver_id, message_text, created_at')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;

        // Group by conversation partner
        const conversationMap = new Map<string, Conversation>();

        for (const msg of messagesData || []) {
          const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          
          // Skip blocked users
          if (blockedUserIds.has(partnerId)) {
            continue;
          }
          
          // Skip hidden conversations
          if (hiddenConversations.has(partnerId)) {
            continue;
          }
          
          if (!conversationMap.has(partnerId)) {
            // Get partner profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .eq('id', partnerId)
              .single();

            if (profile) {
              conversationMap.set(partnerId, {
                user_id: partnerId,
                full_name: profile.full_name,
                username: profile.username,
                avatar_url: profile.avatar_url,
                last_message: msg.message_text,
                last_message_at: msg.created_at,
                unread_count: 0,
              });
            }
          }
        }

        // Get unread counts
        for (const [partnerId, conversation] of conversationMap) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', partnerId)
            .eq('receiver_id', user.id)
            .is('read_at', null);

          conversation.unread_count = count || 0;
        }

      const conversationsList = Array.from(conversationMap.values());
      
      // Merge with existing conversations to preserve all users (prevents disappearing)
      setConversations(prev => {
        // If this is the first load and we have conversations, use them
        if (prev.length === 0 && conversationsList.length > 0) {
          return conversationsList;
        }
        
        // Merge existing conversations with new ones
        const mergedMap = new Map<string, Conversation>();
        
        // First, add all existing conversations (preserve them)
        prev.forEach(conv => {
          mergedMap.set(conv.user_id, conv);
        });
        
        // Then, update or add conversations from the new list
        conversationsList.forEach(newConv => {
          const existing = mergedMap.get(newConv.user_id);
          if (existing) {
            // Update existing conversation with new data
            mergedMap.set(newConv.user_id, {
              ...existing,
              last_message: newConv.last_message || existing.last_message,
              last_message_at: newConv.last_message_at || existing.last_message_at,
              unread_count: newConv.unread_count
            });
          } else {
            // Add new conversation
            mergedMap.set(newConv.user_id, newConv);
          }
        });
        
        const mergedList = Array.from(mergedMap.values());
        
        // Only update if there are actual changes
        const prevMap = new Map(prev.map(c => [c.user_id, c]));
        const hasChanged = mergedList.some(conv => {
          const oldConv = prevMap.get(conv.user_id);
          if (!oldConv) return true;
          return oldConv.last_message !== conv.last_message ||
                 oldConv.last_message_at !== conv.last_message_at ||
                 oldConv.unread_count !== conv.unread_count;
        });
        
        return hasChanged ? mergedList : prev;
      });
        
        // Update selected user profile if conversation exists (prevents flickering)
        if (selectedConversation) {
          const updatedUser = conversationsList.find(c => c.user_id === selectedConversation);
          if (updatedUser) {
            setSelectedUserProfile(prev => {
              // Only update if actually changed
              if (!prev || prev.user_id !== updatedUser.user_id || 
                  prev.last_message !== updatedUser.last_message ||
                  prev.last_message_at !== updatedUser.last_message_at ||
                  prev.unread_count !== updatedUser.unread_count) {
                return updatedUser;
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    // Define loadMessages inline
    const loadMessages = async (partnerId: string) => {
      if (!user) return;

      try {
        console.log('📥 Loading messages for conversation:', partnerId);
        
        // Load messages with reply information
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            reply_message:reply_to (
              id,
              message_text,
              sender_id,
              created_at
            )
          `)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq('receiver_id', partnerId)
          .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`)
          .eq('sender_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('❌ Error loading messages:', error);
          throw error;
        }

        console.log('✅ Loaded messages:', data?.length || 0, 'messages');

        // Process messages to include reply data
        const processedMessages = (data || []).map((msg: any) => ({
          ...msg,
          reply_message: Array.isArray(msg.reply_message) ? msg.reply_message[0] : msg.reply_message
        }));

        // Always update messages to ensure latest messages are shown
        setMessages(processedMessages);

        // Mark as read
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('sender_id', partnerId)
          .eq('receiver_id', user.id)
          .is('read_at', null);

        // Mark as seen (if receiver has read receipts enabled)
        const { data: receiverProfile } = await supabase
          .from('profiles')
          .select('show_read_receipts')
          .eq('id', partnerId)
          .single();

        if (receiverProfile?.show_read_receipts !== false) {
          await supabase
            .from('messages')
            .update({ seen_at: new Date().toISOString() })
            .eq('sender_id', partnerId)
            .eq('receiver_id', user.id)
            .is('seen_at', null);
        }

        // Don't reload conversations here - it will update via real-time subscription
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadConversations();

    // Real-time subscription for instant message delivery
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📨 New message received (real-time):', payload);
          console.log('📨 Message details:', {
            id: payload.new.id,
            sender_id: payload.new.sender_id,
            receiver_id: payload.new.receiver_id,
            message_text: payload.new.message_text?.substring(0, 50) + '...',
            created_at: payload.new.created_at
          });
          
          // Update conversations list locally instead of full reload (prevents flickering)
          setConversations(prev => {
            const existing = prev.find(c => c.user_id === payload.new.sender_id);
            if (existing) {
              // Update existing conversation
              return prev.map(c => 
                c.user_id === payload.new.sender_id
                  ? { ...c, last_message: payload.new.message_text, last_message_at: payload.new.created_at }
                  : c
              );
            }
            // If not found, do a full reload
            setTimeout(() => loadConversations(), 100);
            return prev;
          });
          
          // If we're in the conversation with the sender, add message immediately
          if (selectedConversation && payload.new.sender_id === selectedConversation) {
            console.log('✅ Adding message to current conversation');
            setMessages(prev => {
              // Check if message already exists
              if (prev.find(m => m.id === payload.new.id)) {
                console.log('⚠️ Message already exists, skipping');
                return prev;
              }
              console.log('✅ Adding new message to state');
              const newMessages = [...prev, payload.new as Message];
              // Scroll to bottom after a short delay to ensure DOM is updated
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              return newMessages;
            });
          } else if (selectedConversation) {
            // If we're in a different conversation, reload messages to check for new ones
            console.log('🔄 Reloading messages for different conversation');
            loadMessages(selectedConversation);
          } else {
            console.log('ℹ️ No conversation selected, message will appear in list');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Message sent:', payload);
          // Update conversations list locally instead of full reload (prevents flickering)
          setConversations(prev => {
            const existing = prev.find(c => c.user_id === payload.new.receiver_id);
            if (existing) {
              // Update existing conversation
              return prev.map(c => 
                c.user_id === payload.new.receiver_id
                  ? { ...c, last_message: payload.new.message_text, last_message_at: payload.new.created_at }
                  : c
              );
            }
            // If not found, do a full reload
            setTimeout(() => loadConversations(), 100);
            return prev;
          });
          
          // Message already added to local state, just refresh
          if (selectedConversation) {
            loadMessages(selectedConversation);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // Update seen_at in real-time
          if (selectedConversation && payload.new.sender_id === selectedConversation) {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === payload.new.id ? { ...msg, seen_at: payload.new.seen_at } : msg
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          // Update seen_at for sent messages
          if (selectedConversation && payload.new.receiver_id === selectedConversation) {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === payload.new.id ? { ...msg, seen_at: payload.new.seen_at } : msg
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Message deleted (received):', payload);
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          // Only reload if necessary (prevents flickering)
          setTimeout(() => loadConversations(), 200);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Message deleted (sent):', payload);
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
          // Only reload if necessary (prevents flickering)
          setTimeout(() => loadConversations(), 200);
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
        }
      });

    // Fallback: Poll for new messages every 10 seconds (reduced frequency to prevent flickering)
    // Only poll for messages, not conversations (conversations update via real-time)
    const pollInterval = setInterval(() => {
      if (selectedConversation) {
        console.log('🔄 Polling for new messages...');
        loadMessages(selectedConversation);
      }
      // Don't reload conversations here - they update via real-time subscription
    }, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    } catch (error) {
      console.error('Error in messages useEffect:', error);
      setLoading(false);
    }
  }, [user, navigate, selectedConversation]);

  // Handle query parameter for direct conversation
  useEffect(() => {
    const handleQueryParam = async () => {
      if (!user) return;

      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('user');
      
      if (userId && userId !== user.id) {
        console.log('URL parameter detected, starting conversation with:', userId);
        
        // Set selected conversation immediately
        setSelectedConversation(userId);
        
        // Always try to load user profile for URL parameter users
        console.log('Loading profile for URL parameter user...');
        const profile = await loadUserProfile(userId);
        if (profile) {
          setUrlUserProfile(profile);
        }
        
        // Clear URL parameter after handling
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    };

    // Run when user is available and initial loading is done
    if (user && !loading) {
      handleQueryParam();
    }
  }, [user, loading]);

  const loadReadReceiptPreference = async () => {
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
      console.error('Error loading read receipt preference:', error);
    }
  };

  // Separate effect for loading user profile when conversation is selected but user not in list
  useEffect(() => {
    if (selectedConversation && !loading) {
      const userExists = conversations.find(c => c.user_id === selectedConversation);
      
      if (!userExists) {
        console.log('Selected user not found in conversations, loading profile for:', selectedConversation);
        loadUserProfile(selectedConversation);
      }
    }
  }, [selectedConversation, conversations, loading]);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);


  const loadUserProfile = async (userId: string) => {
    if (!userId) return null;
    
    try {
      console.log('Loading user profile for:', userId);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return null;
      }

      if (profile) {
        console.log('Loaded user profile:', profile);
        
        // Store URL user profile for immediate display
        setUrlUserProfile(profile);
        
        // Create conversation object
        const newConversation = {
          user_id: profile.id,
          full_name: profile.full_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
          last_message: null,
          last_message_at: new Date().toISOString(),
          unread_count: 0
        };
        
        // Update selected user profile cache if this is the selected conversation
        if (selectedConversation === profile.id) {
          setSelectedUserProfile(newConversation);
        }
        
        // Add to conversations list if not already there
        setConversations(prev => {
          const exists = prev.find(c => c.user_id === profile.id);
          if (exists) {
            console.log('User already exists in conversations');
            // Update cache if this is selected conversation
            if (selectedConversation === profile.id) {
              setSelectedUserProfile(exists);
            }
            return prev;
          }
          
          console.log('Adding user to conversations list');
          return [newConversation, ...prev];
        });
        
        return profile;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
    
    return null;
  };

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Get hidden conversations from localStorage
      const hiddenListKey = `hidden_conversations_${user.id}`;
      const hiddenConversations = new Set<string>(JSON.parse(localStorage.getItem(hiddenListKey) || '[]'));

      // Get blocked users (both directions)
      const { data: blockedData } = await supabase
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

      const blockedUserIds = new Set<string>();
      blockedData?.forEach(block => {
        if (block.blocker_id === user.id) {
          blockedUserIds.add(block.blocked_id);
        } else {
          blockedUserIds.add(block.blocker_id);
        }
      });

      // Get all messages where user is sender or receiver
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, message_text, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Group by conversation partner
      const conversationMap = new Map<string, Conversation>();

      for (const msg of messagesData || []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        // Skip blocked users
        if (blockedUserIds.has(partnerId)) {
          continue;
        }
        
        // Skip hidden conversations
        if (hiddenConversations.has(partnerId)) {
          continue;
        }
        
        if (!conversationMap.has(partnerId)) {
          // Get partner profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', partnerId)
            .single();

          if (profile) {
            conversationMap.set(partnerId, {
              user_id: partnerId,
              full_name: profile.full_name,
              username: profile.username,
              avatar_url: profile.avatar_url,
              last_message: msg.message_text,
              last_message_at: msg.created_at,
              unread_count: 0,
            });
          }
        }
      }

      // Get unread counts
      for (const [partnerId, conversation] of conversationMap) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', partnerId)
          .eq('receiver_id', user.id)
          .is('read_at', null);

        conversation.unread_count = count || 0;
      }

      const conversationsList = Array.from(conversationMap.values());
      
      // Merge with existing conversations to preserve all users (prevents disappearing)
      setConversations(prev => {
        // If this is the first load and we have conversations, use them
        if (prev.length === 0 && conversationsList.length > 0) {
          return conversationsList;
        }
        
        // Merge existing conversations with new ones
        const mergedMap = new Map<string, Conversation>();
        
        // First, add all existing conversations (preserve them)
        prev.forEach(conv => {
          mergedMap.set(conv.user_id, conv);
        });
        
        // Then, update or add conversations from the new list
        conversationsList.forEach(newConv => {
          const existing = mergedMap.get(newConv.user_id);
          if (existing) {
            // Update existing conversation with new data
            mergedMap.set(newConv.user_id, {
              ...existing,
              last_message: newConv.last_message || existing.last_message,
              last_message_at: newConv.last_message_at || existing.last_message_at,
              unread_count: newConv.unread_count
            });
          } else {
            // Add new conversation
            mergedMap.set(newConv.user_id, newConv);
          }
        });
        
        const mergedList = Array.from(mergedMap.values());
        
        // Only update if there are actual changes
        const prevMap = new Map(prev.map(c => [c.user_id, c]));
        const hasChanged = mergedList.some(conv => {
          const oldConv = prevMap.get(conv.user_id);
          if (!oldConv) return true;
          return oldConv.last_message !== conv.last_message ||
                 oldConv.last_message_at !== conv.last_message_at ||
                 oldConv.unread_count !== conv.unread_count;
        });
        
        return hasChanged ? mergedList : prev;
      });
      
      // Update selected user profile if conversation exists (prevents flickering)
      if (selectedConversation) {
        const updatedUser = conversationsList.find(c => c.user_id === selectedConversation);
        if (updatedUser) {
          setSelectedUserProfile(prev => {
            // Only update if actually changed
            if (!prev || prev.user_id !== updatedUser.user_id || 
                prev.last_message !== updatedUser.last_message ||
                prev.last_message_at !== updatedUser.last_message_at ||
                prev.unread_count !== updatedUser.unread_count) {
              return updatedUser;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: string) => {
    if (!user) return;

    try {
      // Load messages with reply information
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          reply_message:reply_to (
            id,
            message_text,
            sender_id,
            created_at
          )
        `)
          .or(`sender_id.eq.${user.id}.and.receiver_id.eq.${partnerId},sender_id.eq.${partnerId}.and.receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading messages:', error);
        throw error;
      }

      console.log('✅ Loaded messages:', data?.length || 0, 'messages');

      // Process messages to include reply data
      const processedMessages = (data || []).map((msg: any) => ({
        ...msg,
        reply_message: Array.isArray(msg.reply_message) ? msg.reply_message[0] : msg.reply_message
      }));

      // Only update if messages actually changed to avoid unnecessary re-renders
      setMessages(prev => {
        const prevIds = new Set(prev.map(m => m.id));
        const newIds = new Set(processedMessages.map((m: Message) => m.id));
        
        // Check if messages are different
        if (prevIds.size !== newIds.size || 
            !Array.from(prevIds).every(id => newIds.has(id))) {
          console.log('🔄 Messages changed, updating state');
          return processedMessages;
        }
        
        return prev;
      });

      // Mark as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', partnerId)
        .eq('receiver_id', user.id)
        .is('read_at', null);

      // Mark as seen (if receiver has read receipts enabled)
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('show_read_receipts')
        .eq('id', partnerId)
        .single();

      if (receiverProfile?.show_read_receipts !== false) {
        await supabase
          .from('messages')
          .update({ seen_at: new Date().toISOString() })
          .eq('sender_id', partnerId)
          .eq('receiver_id', user.id)
          .is('seen_at', null);
      }

      loadConversations();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const deleteConversation = async () => {
    if (!user || !selectedConversation) return;

    const confirmMessage = language === 'tr' 
      ? 'Bu sohbeti silmek istediğinizden emin misiniz? Sohbet listeden gizlenecek, ancak mesajlar korunacaktır.'
      : 'Are you sure you want to delete this conversation? The conversation will be hidden from your list, but messages will be preserved.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const conversationToDelete = selectedConversation;
      
      // Store hidden conversation in localStorage (messages are NOT deleted from database)
      const hiddenKey = `hidden_conversation_${user.id}_${conversationToDelete}`;
      localStorage.setItem(hiddenKey, 'true');
      
      // Also store in a list for easy filtering
      const hiddenListKey = `hidden_conversations_${user.id}`;
      const hiddenList = JSON.parse(localStorage.getItem(hiddenListKey) || '[]');
      if (!hiddenList.includes(conversationToDelete)) {
        hiddenList.push(conversationToDelete);
        localStorage.setItem(hiddenListKey, JSON.stringify(hiddenList));
      }

      setSelectedConversation(null);
      setMessages([]);
      setShowMenu(false);
      
      // Immediately remove the conversation from the local state
      setConversations(prev => prev.filter(conv => conv.user_id !== conversationToDelete));
      
      // Also reload conversations to ensure consistency
      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };


  const blockUser = async () => {
    if (!user || !selectedConversation) return;

    if (!confirm('Are you sure you want to block this user? You will no longer see their messages.')) {
      return;
    }

    try {
      console.log('Blocking user:', selectedConversation);
      
      // Insert block record
      const { data, error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: selectedConversation,
        })
        .select();

      if (error) {
        console.error('Block error:', error);
        throw error;
      }

      console.log('Block successful:', data);

      // Delete conversation after blocking
      await deleteConversation();
      
      // Show success message
      console.log('User blocked successfully');
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      // Check if the user is blocked by the receiver
      const { data: blockData, error: blockError } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', selectedConversation)
        .eq('blocked_id', user.id)
        .single();

      if (blockError && blockError.code !== 'PGRST116') {
        console.error('Error checking block status:', blockError);
      }

      if (blockData) {
        // User is blocked by the receiver
        setNewMessage(messageText); // Restore message
        const errorMsg = language === 'tr' 
          ? 'Bu kullanıcı sizi engellemiş. Mesaj gönderemezsiniz.'
          : 'This user has blocked you. You cannot send messages.';
        alert(errorMsg);
        console.log('Cannot send message: user is blocked');
        return;
      }

      console.log('Attempting to send message:', {
        sender_id: user.id,
        receiver_id: selectedConversation,
        message_text: messageText,
        reply_to: replyingTo?.id || null
      });

      // Build insert object - only include reply_to if replyingTo exists
      const insertData: any = {
        sender_id: user.id,
        receiver_id: selectedConversation,
        message_text: messageText,
      };
      
      // Only add reply_to if we're replying to a message
      if (replyingTo?.id) {
        insertData.reply_to = replyingTo.id;
      }

      const { data, error } = await supabase.from('messages').insert(insertData).select();

      if (error) {
        console.error('❌ Error sending message:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Show user-friendly error message
        let errorMsg = language === 'tr' 
          ? 'Mesaj gönderilemedi. Lütfen tekrar deneyin.'
          : 'Failed to send message. Please try again.';
        
        if (error.code === '42501') {
          errorMsg = language === 'tr'
            ? 'Bu işlem için yetkiniz yok. Lütfen tekrar giriş yapın.'
            : 'You do not have permission for this action. Please sign in again.';
        } else if (error.code === '23503') {
          errorMsg = language === 'tr'
            ? 'Geçersiz kullanıcı. Lütfen sayfayı yenileyin.'
            : 'Invalid user. Please refresh the page.';
        } else if (error.message?.includes('reply_to')) {
          errorMsg = language === 'tr'
            ? 'Yanıt gönderilemedi. Lütfen normal mesaj olarak gönderin.'
            : 'Reply failed. Please send as a normal message.';
        }
        
        alert(errorMsg);
        setNewMessage(messageText); // Restore message on error
        return;
      }

      console.log('✅ Message sent successfully:', data);
      console.log('📝 Message ID:', data?.[0]?.id);
      console.log('👤 Receiver ID:', data?.[0]?.receiver_id);
      
      // Verify message was saved by querying it back
      if (data && data[0]) {
        const { data: verifyData, error: verifyError } = await supabase
          .from('messages')
          .select('*')
          .eq('id', data[0].id)
          .single();
        
        if (verifyError) {
          console.error('⚠️ Message verification failed:', verifyError);
        } else {
          console.log('✅ Message verified in database:', verifyData);
        }
      }
      
      // Immediately add message to local state for instant feedback
      if (data && data[0]) {
        setMessages(prev => [...prev, data[0] as Message]);
        // Scroll to bottom after a short delay to ensure DOM is updated
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      
      // Clear reply
      setReplyingTo(null);
      
      // Refresh messages (conversations will update via real-time subscription)
      setTimeout(() => {
        loadMessages(selectedConversation);
      }, 100);
    } catch (error) {
      console.error('Error sending message (catch):', error);
      const errorMsg = language === 'tr'
        ? 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
        : 'An unexpected error occurred. Please try again.';
      alert(errorMsg);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);

    try {
      // Get blocked users (both directions)
      const { data: blockedData } = await supabase
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user?.id},blocked_id.eq.${user?.id}`);

      const blockedUserIds = new Set<string>();
      blockedData?.forEach(block => {
        if (block.blocker_id === user?.id) {
          blockedUserIds.add(block.blocked_id);
        } else {
          blockedUserIds.add(block.blocker_id);
        }
      });

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;

      // Filter out blocked users
      const filteredResults = (data || []).filter(profile => !blockedUserIds.has(profile.id));

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const startConversation = async (userId: string) => {
    console.log('Starting conversation with:', userId);
    
    // Set selected conversation immediately for better UX
    setSelectedConversation(userId);
    
    // Check if user is already in conversations list
    const existingConv = conversations.find(c => c.user_id === userId);
    if (!existingConv) {
      console.log('User not in conversations, fetching profile...');
      // Load user profile and add to conversations
      const profile = await loadUserProfile(userId);
      if (profile) {
        setUrlUserProfile(profile);
      }
    } else {
      console.log('User already in conversations');
      // Clear URL profile since user is in conversations
      setUrlUserProfile(null);
    }
    
    // Clear search query but keep conversations visible
    setSearchQuery('');
    // Don't clear search results immediately - let them fade naturally
    setTimeout(() => {
      setSearchResults([]);
    }, 100);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // If less than 1 hour, show minutes
    if (minutes < 60) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return language === 'tr' ? 'Dün' : 'Yesterday';
    }
    
    // If this week, show day name
    if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    // If older, show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const formatFullDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // State for storing user profile when loaded from URL parameter
  const [urlUserProfile, setUrlUserProfile] = useState<UserProfile | null>(null);

  // Use cached selected user profile, fallback to finding from conversations
  const selectedUser = React.useMemo(() => {
    if (!selectedConversation) return null;
    
    // First use cached profile if available (prevents flickering)
    if (selectedUserProfile && selectedUserProfile.user_id === selectedConversation) {
      return selectedUserProfile;
    }
    
    // Then check conversations
    const convUser = conversations.find(c => c.user_id === selectedConversation);
    if (convUser) {
      return convUser;
    }
    
    // Then check URL user profile (for direct links)
    if (urlUserProfile && urlUserProfile.id === selectedConversation) {
      return {
        user_id: urlUserProfile.id,
        full_name: urlUserProfile.full_name,
        username: urlUserProfile.username,
        avatar_url: urlUserProfile.avatar_url,
        last_message: null,
        last_message_at: null,
        unread_count: 0
      };
    }
    
    // Then check search results
    const searchUser = searchResults.find(u => u.id === selectedConversation);
    if (searchUser) {
      return {
        user_id: searchUser.id,
        full_name: searchUser.full_name,
        username: searchUser.username,
        avatar_url: searchUser.avatar_url,
        last_message: null,
        last_message_at: null,
        unread_count: 0
      };
    }
    
    // If we're still loading conversations, show cached or loading
    if (loading) {
      return selectedUserProfile || { 
        user_id: selectedConversation, 
        full_name: t?.messages?.loading || 'Loading...', 
        username: null, 
        avatar_url: null,
        last_message: null,
        last_message_at: null,
        unread_count: 0
      };
    }
    
    // Return cached profile if available, even if not in conversations yet
    return selectedUserProfile;
  }, [selectedConversation, selectedUserProfile, conversations, searchResults, urlUserProfile, loading, t]);

  if (!user) return null;

  return (
    <div className="min-h-screen relative pt-24 pb-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 z-10">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className={`w-full md:w-1/3 border-r border-purple-500/20 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-purple-500/20">
                <h2 className="text-xl font-bold text-white mb-4">{t.messages.title}</h2>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.messages.searchPlaceholder}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && searchQuery.length > 0 && (
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1 border-b border-purple-500/20 pb-2">
                    <div className="text-xs text-slate-400 px-3 py-1 font-medium">{t.messages.searchResults}</div>
                    {searchResults.map((userProfile) => (
                      <button
                        key={userProfile.id}
                        onClick={() => startConversation(userProfile.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-lg transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {userProfile.avatar_url ? (
                            <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white font-medium">{userProfile.full_name}</p>
                          {userProfile.username && (
                            <p className="text-slate-400 text-sm">@{userProfile.username}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searching && searchQuery.length > 0 && (
                  <div className="mt-2 flex items-center justify-center p-4">
                    <Loader2 className="animate-spin text-purple-400" size={20} />
                    <span className="ml-2 text-slate-400">{t.messages.searching}</span>
                  </div>
                )}

                {/* Conversations - Always visible */}
                <div className="flex-1 overflow-y-auto mt-2">
                  {conversations.length > 0 && (
                    <>
                      {searchQuery.length > 0 && (
                        <div className="text-xs text-slate-400 px-3 py-2 font-medium border-b border-purple-500/20">
                          {t.messages.conversations || 'Conversations'}
                        </div>
                      )}
                      {conversations.map((conversation) => (
                    <div
                      key={conversation.user_id}
                      className={`w-full flex items-center gap-3 p-4 border-b border-purple-500/10 hover:bg-slate-800/50 transition-colors group ${
                        selectedConversation === conversation.user_id ? 'bg-slate-800/50' : ''
                      }`}
                    >
                      <button
                        onClick={() => setSelectedConversation(conversation.user_id)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {conversation.avatar_url ? (
                            <img src={conversation.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white font-medium truncate">{conversation.full_name}</p>
                            {conversation.last_message_at && (
                              <span className="text-xs text-slate-400">{formatTime(conversation.last_message_at)}</span>
                            )}
                          </div>
                          {conversation.last_message && (
                            <p className="text-slate-400 text-sm truncate">{conversation.last_message}</p>
                          )}
                        </div>
                      </button>
                    </div>
                      ))}
                    </>
                  )}
                  {!loading && conversations.length === 0 && searchQuery.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                      <MessageCircle size={48} className="mb-4" />
                      <p>{t.messages.noMessages}</p>
                      <p className="text-sm mt-2">{t.messages.searchToStart}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-purple-500/20 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden text-slate-400 hover:text-white"
                      title="Back to conversations"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft size={24} />
                    </button>
                    <button
                      onClick={() => selectedConversation && navigate(`/profile/${selectedConversation}`)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden hover:scale-105 transition-transform"
                      disabled={!selectedConversation}
                    >
                      {selectedUser?.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-white" />
                      )}
                    </button>
                    <div className="flex-1">
                      {selectedUser ? (
                        <button
                          onClick={() => selectedConversation && navigate(`/profile/${selectedConversation}`)}
                          className="text-left hover:opacity-80 transition-opacity"
                          title={`View ${selectedUser.full_name}'s profile`}
                          aria-label={`View ${selectedUser.full_name}'s profile`}
                        >
                          <p className="text-white font-medium hover:text-purple-300 transition-colors">{selectedUser.full_name}</p>
                          {selectedUser.username && (
                            <p className="text-slate-400 text-sm hover:text-purple-400 transition-colors">@{selectedUser.username}</p>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin text-purple-400" size={16} />
                          <p className="text-slate-400">{t.messages.loadingUser}</p>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        title="Menu"
                        aria-label="Open menu"
                      >
                        <MoreVertical size={20} />
                      </button>
                      {showMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowMenu(false)}
                          />
                          <div className="absolute right-0 top-12 w-48 bg-slate-900 border border-purple-500/30 rounded-lg shadow-2xl z-50 overflow-hidden">
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                deleteConversation();
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-slate-950/50 transition-colors flex items-center gap-3 text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={18} />
                              <span>{t.messages.deleteConversation}</span>
                            </button>
                            <button
                              onClick={blockUser}
                              className="w-full px-4 py-3 text-left hover:bg-slate-950/50 transition-colors flex items-center gap-3 text-red-400 hover:text-red-300"
                            >
                              <Ban size={18} />
                              <span>Block User</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === user.id;
                      const showSeen = isOwn && message.seen_at && showReadReceipts;
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                          <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                              : 'bg-slate-800 text-white'
                          }`}>
                            {/* Reply preview */}
                            {message.reply_to && message.reply_message && (
                              <div className={`mb-2 pl-3 border-l-2 ${
                                isOwn ? 'border-white/30' : 'border-purple-400/30'
                              }`}>
                                <p className={`text-xs ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
                                  {message.reply_message.sender_id === user.id ? (language === 'tr' ? 'Sen' : 'You') : selectedUser?.full_name || 'User'}
                                </p>
                                <p className={`text-sm truncate ${isOwn ? 'text-white/80' : 'text-slate-300'}`}>
                                  {message.reply_message.message_text}
                                </p>
                              </div>
                            )}
                            <p className="break-words">{message.message_text}</p>
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <p 
                                className={`text-xs ${isOwn ? 'text-white/70' : 'text-slate-400'}`}
                                title={formatFullDateTime(message.created_at)}
                              >
                                {formatTime(message.created_at)}
                              </p>
                              {isOwn && (
                                <>
                                  {message.read_at ? (
                                    <CheckCheck size={14} className={showSeen ? 'text-blue-300' : 'text-white/50'} />
                                  ) : (
                                    <Check size={14} className="text-white/50" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {!isOwn && (
                            <button
                              onClick={() => setReplyingTo(message)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-purple-400"
                              title={t.messages.reply || 'Reply'}
                            >
                              <Reply size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Preview */}
                  {replyingTo && (
                    <div className="px-4 pt-2 border-t border-purple-500/20">
                      <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Reply size={14} className="text-purple-400" />
                            <p className="text-xs text-purple-400 font-medium">
                              {replyingTo.sender_id === user.id ? (language === 'tr' ? 'Kendine yanıt' : 'Replying to yourself') : (language === 'tr' ? 'Yanıtlanıyor' : 'Replying')}
                            </p>
                          </div>
                          <p className="text-sm text-slate-300 truncate">{replyingTo.message_text}</p>
                        </div>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Message Input */}
                  <div className="p-4 border-t border-purple-500/20">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                        placeholder={replyingTo ? (t.messages.replyPlaceholder || 'Type your reply...') : t.messages.typePlaceholder}
                        className="flex-1 px-4 py-2 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                        disabled={sending}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sending || !newMessage.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <MessageCircle size={64} className="mx-auto mb-4" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
