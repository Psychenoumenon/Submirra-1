import { useState, useEffect, useRef } from 'react';
import { 
  Send, Search, ArrowLeft, MoreVertical, 
  Check, CheckCheck, Trash2, Ban, Reply, X,
  Paperclip, Loader2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useRouter } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';
import EmojiPicker from '../components/EmojiPicker';
import VoiceRecorder from '../components/VoiceRecorder';
import AudioPlayer from '../components/AudioPlayer';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: 'text' | 'image' | 'audio' | 'video';
  image_url?: string;
  audio_url?: string;
  video_url?: string;
  reply_to?: string;
  reply_message?: Message;
  created_at: string;
  read_at: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  is_online?: boolean;
  show_online_status?: boolean;
  last_seen?: string | null;
}

interface Conversation extends UserProfile {
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const { navigate, getUrlParam } = useRouter();
  const { language } = useLanguage();
  const { showToast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const initialScrollDoneRef = useRef<string | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Redirect if not logged in (but wait for auth to load first)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
    }
  }, [user, authLoading, navigate]);

  // Check for URL parameter to open specific conversation
  useEffect(() => {
    if (user) {
      const userId = getUrlParam('user');
      if (userId) {
        // Open conversation with this user
        setSelectedChat(userId);
        // Clear URL parameter
        window.history.replaceState({}, '', '/messages');
      }
    }
  }, [user, getUrlParam]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
      updateOnlineStatus(true);
    }

    return () => {
      if (user) {
        updateOnlineStatus(false);
      }
    };
  }, [user]);

  // Load messages and user profile when chat is selected
  useEffect(() => {
    if (selectedChat && user) {
      loadMessages(selectedChat);
      markAsRead(selectedChat);
      
      // Load user profile if not in conversations
      const existingProfile = conversations.find(c => c.id === selectedChat);
      if (existingProfile) {
        setSelectedUserProfile(existingProfile);
      } else {
        // Fetch user profile
        const fetchProfile = async () => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url, is_online, show_online_status, last_seen')
              .eq('id', selectedChat)
              .single();
            
            if (!error && data) {
              setSelectedUserProfile(data);
            }
          } catch (err) {
            console.error('Error fetching user profile:', err);
          }
        };
        fetchProfile();
      }
    } else {
      setSelectedUserProfile(null);
    }
  }, [selectedChat, user, conversations]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime-v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            
            // Check if message is part of current conversation
            const isPartOfCurrentChat = selectedChat && (
              (newMsg.sender_id === user.id && newMsg.receiver_id === selectedChat) ||
              (newMsg.sender_id === selectedChat && newMsg.receiver_id === user.id)
            );
            
            if (isPartOfCurrentChat) {
              // Check if user is near bottom before adding message
              const container = messagesContainerRef.current;
              const isNearBottom = container ? 
                (container.scrollHeight - container.scrollTop - container.clientHeight < 100) : true;
              
              setMessages(prev => {
                // Check if message already exists
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              
              // Mark as read if from the other person
              if (newMsg.sender_id === selectedChat) {
                markAsRead(newMsg.sender_id);
              }
              
              // Only scroll if user was near bottom
              if (isNearBottom) {
                scrollToBottom();
              }
            }
            
            // Always update conversations list
            loadConversations();
          } else if (payload.eventType === 'UPDATE') {
            // Update read status
            const updatedMsg = payload.new as Message;
            setMessages(prev =>
              prev.map(msg =>
                msg.id === updatedMsg.id ? updatedMsg : msg
              )
            );
          }
        }
      )
      .subscribe();

    // Online status subscription
    const presenceChannel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        updateConversationsOnlineStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
    };
  }, [user, selectedChat]);

  // Auto-scroll to bottom only when new message arrives and user is near bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is near bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    // Check if new message was added
    const messageCountIncreased = messages.length > prevMessageCountRef.current;
    
    // Only scroll if user is near bottom OR if it's a new message for current user
    if (messageCountIncreased && isNearBottom) {
      scrollToBottom();
    }
    
    // Update previous count
    prevMessageCountRef.current = messages.length;
  }, [messages]);


  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !user) {
        setSearchResults([]);
        return;
      }

      try {
        // Check blocked users
        const { data: blocks } = await supabase
          .from('user_blocks')
          .select('blocked_id, blocker_id')
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

        const blockedIds = new Set<string>();
        blocks?.forEach(block => {
          if (block.blocker_id === user.id) {
            blockedIds.add(block.blocked_id);
          } else {
            blockedIds.add(block.blocker_id);
          }
        });

        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, is_online, show_online_status, last_seen')
          .neq('id', user.id)
          .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        
        // Filter out blocked users
        const filtered = (data || []).filter(u => !blockedIds.has(u.id));
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search error:', error);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user]);

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const updateConversationsOnlineStatus = async () => {
    if (!user) return;

    // Reload conversations to get updated online status
    loadConversations();
  };

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Get deleted conversations from localStorage
      const deletedKey = `deleted_conversations_${user.id}`;
      const deletedConvs = new Set<string>(
        JSON.parse(localStorage.getItem(deletedKey) || '[]')
      );

      // Get blocked users
      const { data: blocks } = await supabase
        .from('user_blocks')
        .select('blocked_id, blocker_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

      const blockedIds = new Set<string>();
      blocks?.forEach(block => {
        if (block.blocker_id === user.id) {
          blockedIds.add(block.blocked_id);
        } else {
          blockedIds.add(block.blocker_id);
        }
      });

      // Get all messages
      const { data: allMessages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get conversation cleared timestamps from database
      const { data: clearedData } = await supabase
        .from('conversation_cleared')
        .select('partner_id, cleared_at')
        .eq('user_id', user.id);

      const clearedMap = new Map<string, string>();
      clearedData?.forEach(c => clearedMap.set(c.partner_id, c.cleared_at));

      // Group by conversation partner
      const convMap = new Map<string, Conversation>();

      for (const msg of allMessages || []) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        const isSender = msg.sender_id === user.id;
        
        // Skip blocked conversations
        if (blockedIds.has(partnerId)) {
          continue;
        }

        // Skip deleted messages
        if (msg.deleted_for_everyone) {
          continue;
        }
        if (isSender && msg.deleted_for_sender) {
          continue;
        }
        if (!isSender && msg.deleted_for_receiver) {
          continue;
        }

        // Check if this message is after the cleared timestamp
        const clearedAt = clearedMap.get(partnerId);
        if (clearedAt && new Date(msg.created_at) < new Date(clearedAt)) {
          continue; // Skip messages before cleared timestamp
        }
        
        if (!convMap.has(partnerId)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, is_online, show_online_status, last_seen')
            .eq('id', partnerId)
            .single();

          if (profile) {
            // Count unread messages (only after cleared timestamp if exists)
            let unreadQuery = supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('sender_id', partnerId)
              .eq('receiver_id', user.id)
              .is('read_at', null);

            if (clearedAt) {
              unreadQuery = unreadQuery.gt('created_at', clearedAt);
            }

            const { count } = await unreadQuery;

            convMap.set(partnerId, {
              ...profile,
              last_message: msg.message_text,
              last_message_time: msg.created_at,
              unread_count: count || 0,
            });

            // If this conversation was in localStorage deleted list but has new messages, remove from deleted
            if (deletedConvs.has(partnerId)) {
              deletedConvs.delete(partnerId);
              localStorage.setItem(deletedKey, JSON.stringify(Array.from(deletedConvs)));
            }
          }
        }
      }

      setConversations(Array.from(convMap.values()));
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: string) => {
    if (!user) return;

    try {
      // Check if conversation was cleared (to hide old messages)
      const { data: clearedData } = await supabase
        .from('conversation_cleared')
        .select('cleared_at')
        .eq('user_id', user.id)
        .eq('partner_id', partnerId)
        .single();

      const clearedAt = clearedData?.cleared_at;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          reply_message:reply_to (
            id,
            message_text,
            sender_id
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Filter messages based on cleared_at and delete flags
      const filteredMessages = (data || []).filter((msg: any) => {
        // Hide messages deleted for everyone
        if (msg.deleted_for_everyone) return false;
        
        // Hide messages deleted for current user
        if (msg.sender_id === user.id && msg.deleted_for_sender) return false;
        if (msg.receiver_id === user.id && msg.deleted_for_receiver) return false;
        
        // Hide messages before cleared_at timestamp
        if (clearedAt && new Date(msg.created_at) < new Date(clearedAt)) return false;
        
        return true;
      });
      
      const processedMessages = filteredMessages.map((msg: any) => ({
        ...msg,
        reply_message: Array.isArray(msg.reply_message) ? msg.reply_message[0] : msg.reply_message
      }));
      
      setMessages(processedMessages);
      // Scroll to bottom only on first load for this chat
      if (initialScrollDoneRef.current !== partnerId) {
        initialScrollDoneRef.current = partnerId;
        setTimeout(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }, 150);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markAsRead = async (partnerId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', partnerId)
        .eq('receiver_id', user.id)
        .is('read_at', null);

      loadConversations();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedChat,
          message_text: newMessage.trim(),
          message_type: 'text',
          reply_to: replyingTo?.id || null,
        });

      if (error) throw error;

      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendAudioMessage = async (audioBlob: Blob) => {
    if (!selectedChat || !user) return;

    try {
      // Upload audio to Supabase storage
      const fileName = `audio_${user.id}_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('audio-messages')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // If bucket doesn't exist, send as text with note
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: selectedChat,
            message_text: '🎤 ' + (language === 'tr' ? 'Sesli mesaj gönderildi' : 'Voice message sent'),
            message_type: 'text',
            reply_to: replyingTo?.id || null,
          });
        if (error) throw error;
        setReplyingTo(null);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audio-messages')
        .getPublicUrl(fileName);

      // Send message with audio URL
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedChat,
          message_text: language === 'tr' ? 'Sesli mesaj' : 'Voice message',
          message_type: 'audio',
          audio_url: urlData.publicUrl,
          reply_to: replyingTo?.id || null,
        });

      if (error) throw error;

      setReplyingTo(null);
      showToast(language === 'tr' ? 'Sesli mesaj gönderildi' : 'Voice message sent', 'success');
    } catch (error) {
      console.error('Error sending audio message:', error);
      showToast(language === 'tr' ? 'Sesli mesaj gönderilemedi' : 'Failed to send voice message', 'error');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChat || !user) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showToast(language === 'tr' ? 'Sadece görsel ve video yükleyebilirsiniz' : 'Only images and videos allowed', 'error');
      return;
    }

    // File size limit: 10MB for images, 50MB for videos
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(
        language === 'tr' 
          ? `Dosya çok büyük (max ${isVideo ? '50MB' : '10MB'})` 
          : `File too large (max ${isVideo ? '50MB' : '10MB'})`, 
        'error'
      );
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${isImage ? 'image' : 'video'}_${user.id}_${Date.now()}.${fileExt}`;
      const bucketName = isImage ? 'message-images' : 'message-videos';

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        showToast(language === 'tr' ? `Yükleme başarısız: ${uploadError.message}` : `Upload failed: ${uploadError.message}`, 'error');
        return;
      }

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Send message with media
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedChat,
          message_text: isImage 
            ? (language === 'tr' ? '📷 Görsel' : '📷 Image')
            : (language === 'tr' ? '🎬 Video' : '🎬 Video'),
          message_type: isImage ? 'image' : 'video',
          image_url: isImage ? urlData.publicUrl : null,
          video_url: isVideo ? urlData.publicUrl : null,
          reply_to: replyingTo?.id || null,
        });

      if (error) throw error;

      setReplyingTo(null);
      showToast(
        language === 'tr' 
          ? (isImage ? 'Görsel gönderildi' : 'Video gönderildi')
          : (isImage ? 'Image sent' : 'Video sent'), 
        'success'
      );
    } catch (error) {
      console.error('Error sending media:', error);
      showToast(language === 'tr' ? 'Medya gönderilemedi' : 'Failed to send media', 'error');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteConversation = async () => {
    if (!user || !selectedChat) return;

    try {
      // Save cleared timestamp to database - this will hide all messages before this time
      await supabase
        .from('conversation_cleared')
        .upsert({
          user_id: user.id,
          partner_id: selectedChat,
          cleared_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,partner_id'
        });

      // Also keep localStorage for backward compatibility
      const deletedKey = `deleted_conversations_${user.id}`;
      const deleted = new Set<string>(
        JSON.parse(localStorage.getItem(deletedKey) || '[]')
      );
      
      deleted.add(selectedChat);
      localStorage.setItem(deletedKey, JSON.stringify(Array.from(deleted)));

      setSelectedChat(null);
      setShowMenu(false);
      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Delete message for me only
  const deleteMessageForMe = async (messageId: string, isSender: boolean) => {
    if (!user) return;

    try {
      const updateField = isSender ? 'deleted_for_sender' : 'deleted_for_receiver';
      
      await supabase
        .from('messages')
        .update({ [updateField]: true })
        .eq('id', messageId);

      // Update local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message for me:', error);
    }
  };

  // Delete message for everyone (only sender can do this)
  const deleteMessageForEveryone = async (messageId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('messages')
        .update({ deleted_for_everyone: true })
        .eq('id', messageId)
        .eq('sender_id', user.id); // Only sender can delete for everyone

      // Update local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message for everyone:', error);
    }
  };

  const blockUser = async () => {
    if (!user || !selectedChat) return;

    try {
      await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: selectedChat,
        });

      setSelectedChat(null);
      setShowMenu(false);
      loadConversations();
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const startConversation = (userId: string) => {
    setSelectedChat(userId);
    setSearchQuery('');
    setSearchResults([]);
    
    // Remove from deleted list if exists
    const deletedKey = `deleted_conversations_${user!.id}`;
    const deleted = new Set<string>(
      JSON.parse(localStorage.getItem(deletedKey) || '[]')
    );
    
    if (deleted.has(userId)) {
      deleted.delete(userId);
      localStorage.setItem(deletedKey, JSON.stringify(Array.from(deleted)));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  // Update selected user profile when conversations change
  useEffect(() => {
    if (selectedChat && conversations.length > 0) {
      const profile = conversations.find(c => c.id === selectedChat);
      if (profile) {
        setSelectedUserProfile(profile);
      }
    }
  }, [conversations, selectedChat]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes}d önce`;
    if (hours < 24) return `${hours}s önce`;
    if (days < 7) return `${days}g önce`;
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const formatLastSeen = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return null;
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (language === 'tr') {
      if (minutes < 1) return 'Az önce çevrimiçiydi';
      if (minutes < 60) return `${minutes} dakika önce çevrimiçiydi`;
      if (hours < 24) return `${hours} saat önce çevrimiçiydi`;
      if (days < 7) return `${days} gün önce çevrimiçiydi`;
      return `${date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} tarihinde çevrimiçiydi`;
    } else {
      if (minutes < 1) return 'Last seen just now';
      if (minutes < 60) return `Last seen ${minutes} min ago`;
      if (hours < 24) return `Last seen ${hours} hours ago`;
      if (days < 7) return `Last seen ${days} days ago`;
      return `Last seen on ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
    }
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  // Redirect if not logged in (will be handled by useEffect)
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden h-[calc(100vh-140px)] flex">
          
          {/* Sidebar */}
          <div className={`${selectedChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r border-slate-800`}>
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white mb-4">{language === 'tr' ? 'Mesajlar' : 'Messages'}</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'tr' ? 'Kullanıcı ara...' : 'Search users...'}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-pink-500/50"
                />
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="p-2 border-b border-slate-800">
                <p className="text-xs text-slate-400 px-2 mb-2">{language === 'tr' ? 'Arama Sonuçları' : 'Search Results'}</p>
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => startConversation(user.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-800/50 rounded-lg transition-colors"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          user.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {user.is_online && user.show_online_status !== false && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium">{user.full_name}</p>
                      {user.username && (
                        <p className="text-sm text-slate-400">@{user.username}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent"></div>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                    <Send className="text-slate-400" size={24} />
                  </div>
                  <p className="text-slate-400">{language === 'tr' ? 'Henüz mesajınız yok' : 'No messages yet'}</p>
                  <p className="text-sm text-slate-500 mt-2">{language === 'tr' ? 'Kullanıcı arayarak sohbet başlatın' : 'Search for a user to start a conversation'}</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedChat(conv.id)}
                    className={`w-full flex items-center gap-3 p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                      selectedChat === conv.id ? 'bg-slate-800/50' : ''
                    }`}
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {conv.avatar_url ? (
                          <img src={conv.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          conv.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {conv.is_online && conv.show_online_status !== false && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white font-medium truncate">{conv.full_name}</p>
                        {conv.last_message_time && (
                          <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                            {formatTime(conv.last_message_time)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate">
                        {conv.last_message || (language === 'tr' ? 'Mesaj yok' : 'No messages')}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${selectedChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col relative`}>
            {selectedChat && selectedUserProfile ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="md:hidden text-slate-400 hover:text-white"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <button
                    onClick={() => navigate(`/profile/${selectedUserProfile.id}`)}
                    className="relative hover:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {selectedUserProfile.avatar_url ? (
                        <img src={selectedUserProfile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedUserProfile.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {selectedUserProfile.is_online && selectedUserProfile.show_online_status !== false && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                    )}
                  </button>
                  <button
                    onClick={() => navigate(`/profile/${selectedUserProfile.id}`)}
                    className="flex-1 text-left hover:opacity-80 transition-opacity"
                  >
                    <p className="text-white font-medium">{selectedUserProfile.full_name}</p>
                    {selectedUserProfile.is_online && selectedUserProfile.show_online_status !== false ? (
                      <p className="text-xs text-green-400">{language === 'tr' ? 'Çevrimiçi' : 'Online'}</p>
                    ) : selectedUserProfile.show_online_status !== false && selectedUserProfile.last_seen ? (
                      <p className="text-xs text-slate-400">{formatLastSeen(selectedUserProfile.last_seen)}</p>
                    ) : (
                      selectedUserProfile.username && (
                        <p className="text-sm text-slate-400">@{selectedUserProfile.username}</p>
                      )
                    )}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="text-slate-400 hover:text-white"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[200px]">
                        <button
                          onClick={deleteConversation}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          <Trash2 size={16} />
                          {language === 'tr' ? 'Sohbeti Sil' : 'Delete Chat'}
                        </button>
                        <button
                          onClick={blockUser}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Ban size={16} />
                          {language === 'tr' ? 'Kullanıcıyı Engelle' : 'Block User'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                        <Send className="text-slate-400" size={24} />
                      </div>
                      <p className="text-slate-400">{language === 'tr' ? 'Henüz mesaj yok' : 'No messages yet'}</p>
                      <p className="text-sm text-slate-500 mt-2">{language === 'tr' ? 'İlk mesajı gönderin' : 'Send the first message'}</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.sender_id === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
                        >
                          <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            {msg.reply_message && (
                              <div className={`text-xs px-3 py-2 rounded-lg ${isMine ? 'bg-slate-800/50' : 'bg-slate-700/50'} text-slate-300 mb-1`}>
                                <Reply size={12} className="inline mr-1" />
                                {msg.reply_message.message_text}
                              </div>
                            )}
                            <div className="relative">
                              <div
                                className={`rounded-2xl px-4 py-2.5 ${
                                  isMine
                                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                                    : 'bg-slate-800 text-white'
                                }`}
                              >
                                {msg.message_type === 'image' && msg.image_url && (
                                  <img
                                    src={msg.image_url}
                                    alt="Sent image"
                                    className="max-w-full max-h-64 rounded-lg mb-2 cursor-pointer object-cover"
                                    onClick={() => window.open(msg.image_url, '_blank')}
                                  />
                                )}
                                {msg.message_type === 'video' && msg.video_url && (
                                  <video 
                                    controls 
                                    className="max-w-full max-h-64 rounded-lg mb-2"
                                    preload="metadata"
                                  >
                                    <source src={msg.video_url} type="video/mp4" />
                                    <source src={msg.video_url} type="video/webm" />
                                    {language === 'tr' ? 'Tarayıcınız video desteklemiyor' : 'Your browser does not support video'}
                                  </video>
                                )}
                                {msg.message_type === 'audio' && msg.audio_url && (
                                  <AudioPlayer src={msg.audio_url} isMine={isMine} />
                                )}
                                {msg.message_type !== 'audio' && msg.message_type !== 'image' && msg.message_type !== 'video' && (
                                  <p className="break-words">{msg.message_text}</p>
                                )}
                                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                  <span className={`text-xs ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                                    {formatTime(msg.created_at)}
                                  </span>
                                  {isMine && (
                                    <span>
                                      {msg.read_at ? (
                                        <CheckCheck size={14} className="text-blue-300" />
                                      ) : (
                                        <Check size={14} className="text-white/70" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Message menu button */}
                              <button
                                onClick={() => setMessageMenuId(messageMenuId === msg.id ? null : msg.id)}
                                className={`absolute ${isMine ? '-left-6' : '-right-6'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1`}
                              >
                                <MoreVertical size={14} />
                              </button>
                              {/* Message menu dropdown */}
                              {messageMenuId === msg.id && (
                                <>
                                  {/* Backdrop to close menu when clicking outside */}
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setMessageMenuId(null)}
                                  />
                                  <div className={`absolute ${isMine ? 'right-full mr-2' : 'left-full ml-2'} top-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[140px]`}>
                                    {isMine && (
                                      <button
                                        onClick={() => {
                                          deleteMessageForEveryone(msg.id);
                                          setMessageMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-red-400 hover:text-red-300 text-sm transition-colors"
                                      >
                                        <Trash2 size={14} />
                                        {language === 'tr' ? 'Herkesten Sil' : 'Delete for Everyone'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        deleteMessageForMe(msg.id, isMine);
                                        setMessageMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-slate-300 hover:text-white text-sm transition-colors"
                                    >
                                      <X size={14} />
                                      {language === 'tr' ? 'Benden Sil' : 'Delete for Me'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                            {!isMine && (
                              <button
                                onClick={() => setReplyingTo(msg)}
                                className="text-xs text-slate-400 hover:text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                              >
                                <Reply size={12} />
                                {language === 'tr' ? 'Yanıtla' : 'Reply'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-slate-800">
                  {replyingTo && (
                    <div className="mb-2 bg-slate-800/50 rounded-lg p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Reply size={14} />
                        <span>{replyingTo.message_text}</span>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <EmojiPicker 
                      onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)}
                      position="top"
                      inputRef={messageInputRef}
                    />
                    <VoiceRecorder
                      onTranscription={(text) => setNewMessage(prev => prev + text)}
                      onAudioBlob={sendAudioMessage}
                      language={language}
                      mode="audio"
                      showToast={showToast}
                    />
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {/* Media upload button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className={`p-2 rounded-lg transition-all duration-300 ${
                        isUploading
                          ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400 animate-pulse'
                          : 'bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:border-purple-500/50 hover:bg-purple-500/30'
                      }`}
                      title={language === 'tr' ? 'Görsel/Video Gönder' : 'Send Image/Video'}
                    >
                      {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                    </button>
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={language === 'tr' ? 'Mesaj yazın...' : 'Type a message...'}
                      className="flex-1 bg-slate-800/50 border border-slate-700 rounded-full px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:border-pink-500/50"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isUploading}
                      className="bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full p-2.5 hover:shadow-lg hover:shadow-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                    <Send className="text-slate-400" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{language === 'tr' ? 'Mesajlarınız' : 'Your Messages'}</h3>
                  <p className="text-slate-400">{language === 'tr' ? 'Bir sohbet seçin veya yeni bir sohbet başlatın' : 'Select a chat or start a new conversation'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
