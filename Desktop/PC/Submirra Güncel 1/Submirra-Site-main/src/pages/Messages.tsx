import React, { useState, useEffect, useRef } from 'react';
import { Send, User, ArrowLeft, Loader2, Search, MessageCircle, Trash2, Ban, MoreVertical, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  read_at: string | null;
  created_at: string;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useToast();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    loadConversations();

    // Real-time subscription for new messages
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
          console.log('New message received:', payload);
          loadConversations();
          if (selectedConversation) {
            loadMessages(selectedConversation);
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
          loadConversations();
          if (selectedConversation) {
            loadMessages(selectedConversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  // Handle query parameter for direct conversation
  useEffect(() => {
    const handleQueryParam = async () => {
      if (!user) return;

      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('user');
      
      if (userId && userId !== user.id) {
        // Start conversation with the user
        await startConversation(userId);
      }
    };

    handleQueryParam();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Separate effect for loading user profile
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const userExists = conversations.find(c => c.user_id === selectedConversation);
      
      if (!userExists) {
        console.log('User not found in conversations, loading profile for:', selectedConversation);
        loadUserProfile(selectedConversation);
      }
    }
  }, [selectedConversation, conversations]);

  useEffect(() => {
    scrollToBottom();
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserProfile = async (userId: string) => {
    if (!userId) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      if (profile) {
        console.log('Loaded user profile:', profile);
        // Add to conversations list if not already there
        setConversations(prev => {
          const exists = prev.find(c => c.user_id === profile.id);
          if (exists) return prev;
          
          return [{
            user_id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
            last_message: null,
            last_message_at: new Date().toISOString(),
            unread_count: 0
          }, ...prev];
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadConversations = async () => {
    if (!user) return;

    try {
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

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', partnerId)
        .eq('receiver_id', user.id)
        .is('read_at', null);

      loadConversations();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const deleteConversation = async () => {
    if (!user || !selectedConversation) return;

    if (!confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      return;
    }

    try {
      // Delete all messages between these two users
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedConversation}),and(sender_id.eq.${selectedConversation},receiver_id.eq.${user.id})`);

      if (error) throw error;

      setSelectedConversation(null);
      setMessages([]);
      loadConversations();
      setShowMenu(false);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const deleteConversationWithUser = async (userId: string) => {
    if (!user) return;

    try {
      // Delete all messages between these two users
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`);

      if (error) throw error;

      // If this was the selected conversation, clear it
      if (selectedConversation === userId) {
        setSelectedConversation(null);
        setMessages([]);
      }

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
      // Insert block record
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: selectedConversation,
        });

      if (error) throw error;

      showToast('User blocked successfully', 'success');
      
      // Delete conversation after blocking
      await deleteConversation();
    } catch (error) {
      console.error('Error blocking user:', error);
      showToast('Failed to block user', 'error');
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const { data, error } = await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: selectedConversation,
        message_text: messageText,
      }).select();

      if (error) {
        console.error('Error sending message:', error);
        setNewMessage(messageText); // Restore message on error
        return;
      }

      console.log('Message sent successfully:', data);
      
      // Immediately add message to local state for instant feedback
      if (data && data[0]) {
        setMessages(prev => [...prev, data[0]]);
      }
      
      // Refresh conversations and messages
      loadMessages(selectedConversation);
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const startConversation = async (userId: string) => {
    console.log('Starting conversation with:', userId);
    
    // If user is not in conversations list, fetch their profile and add them FIRST
    const existingConv = conversations.find(c => c.user_id === userId);
    if (!existingConv) {
      try {
        console.log('User not in conversations, fetching profile...');
        
        // Add placeholder immediately to avoid "Loading..." state
        const placeholder = {
          user_id: userId,
          full_name: 'Loading...',
          username: null,
          avatar_url: null,
          last_message: null,
          last_message_at: new Date().toISOString(),
          unread_count: 0
        };
        setConversations(prev => [placeholder, ...prev]);
        setSelectedConversation(userId);
        
        // Then fetch actual profile and update
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Profile fetch error:', error);
          // Remove placeholder on error
          setConversations(prev => prev.filter(c => c.user_id !== userId));
          setSelectedConversation(null);
          return;
        }

        if (profile) {
          console.log('Profile fetched:', profile);
          // Update the placeholder with actual data
          setConversations(prev => prev.map(c => 
            c.user_id === userId ? {
              user_id: profile.id,
              full_name: profile.full_name,
              username: profile.username,
              avatar_url: profile.avatar_url,
              last_message: null,
              last_message_at: new Date().toISOString(),
              unread_count: 0
            } : c
          ));
          
          // Clear search after everything is set up
          setTimeout(() => {
            setSearchQuery('');
            setSearchResults([]);
          }, 100);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Remove placeholder on error
        setConversations(prev => prev.filter(c => c.user_id !== userId));
        setSelectedConversation(null);
        return;
      }
    } else {
      console.log('User already in conversations');
      // User already exists in conversations
      setSelectedConversation(userId);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Find selected user from conversations or search results
  const selectedUser = React.useMemo(() => {
    if (!selectedConversation) return null;
    
    // First check conversations
    const convUser = conversations.find(c => c.user_id === selectedConversation);
    if (convUser) {
      console.log('Found user in conversations:', convUser);
      return convUser;
    }
    
    // Then check search results
    const searchUser = searchResults.find(u => u.id === selectedConversation);
    if (searchUser) {
      console.log('Found user in search results:', searchUser);
      return searchUser;
    }
    
    // Debug: Log current state
    console.log('User not found!', {
      selectedConversation,
      conversationsCount: conversations.length,
      searchResultsCount: searchResults.length
    });
    
    // Last resort - loading state
    return { 
      id: selectedConversation, 
      full_name: 'Loading...', 
      username: null, 
      avatar_url: null 
    };
  }, [selectedConversation, conversations, searchResults]);

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
                <h2 className="text-xl font-bold text-white mb-4">Messages</h2>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && searchQuery.length > 0 && (
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1 border-b border-purple-500/20 pb-2">
                    <div className="text-xs text-slate-400 px-3 py-1 font-medium">Search Results</div>
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
                    <span className="ml-2 text-slate-400">Searching...</span>
                  </div>
                )}
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-purple-400" size={32} />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
                    <MessageCircle size={48} className="mb-4" />
                    <p>No messages yet</p>
                    <p className="text-sm mt-2">Search for users to start chatting</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
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
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                          {conversation.avatar_url ? (
                            <img src={conversation.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={24} className="text-white" />
                          )}
                          {conversation.unread_count > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                              {conversation.unread_count}
                            </div>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete conversation with ${conversation.full_name}?`)) {
                            deleteConversationWithUser(conversation.user_id);
                          }
                        }}
                        className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete conversation"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
              {selectedConversation && selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-purple-500/20 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden text-slate-400 hover:text-white"
                    >
                      <ArrowLeft size={24} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{selectedUser.full_name}</p>
                      {'username' in selectedUser && selectedUser.username && (
                        <p className="text-slate-400 text-sm">@{selectedUser.username}</p>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
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
                      return (
                        <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                              : 'bg-slate-800 text-white'
                          }`}>
                            <p className="break-words">{message.message_text}</p>
                            <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-purple-500/20">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                        placeholder="Type a message..."
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
