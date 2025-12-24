import { supabase } from './supabase';

/**
 * DEBUG ONLY: Clear all messages and reset badge
 * ⚠️ WARNING: This deletes ALL messages in the database!
 * Only use in development/testing environment
 */
export async function clearAllMessagesDebug(userId: string) {
  try {
    console.warn('🗑️ Clearing all messages for user:', userId);
    
    // Delete all messages where user is sender or receiver
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    
    if (deleteError) {
      console.error('Error deleting messages:', deleteError);
      return false;
    }
    
    // Clear localStorage
    const conversationsKey = `conversations_${userId}`;
    const hiddenKey = `hidden_conversations_${userId}`;
    localStorage.removeItem(conversationsKey);
    localStorage.removeItem(hiddenKey);
    
    console.log('✅ All messages cleared and localStorage reset');
    return true;
  } catch (error) {
    console.error('Error in clearAllMessagesDebug:', error);
    return false;
  }
}

/**
 * DEBUG ONLY: Mark all messages as read (safer option)
 */
export async function markAllMessagesAsReadDebug(userId: string) {
  try {
    console.warn('📖 Marking all messages as read for user:', userId);
    
    const { error } = await supabase
      .from('messages')
      .update({ 
        read_at: new Date().toISOString(),
        seen_at: new Date().toISOString()
      })
      .eq('receiver_id', userId)
      .is('read_at', null);
    
    if (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
    
    console.log('✅ All messages marked as read');
    return true;
  } catch (error) {
    console.error('Error in markAllMessagesAsReadDebug:', error);
    return false;
  }
}
