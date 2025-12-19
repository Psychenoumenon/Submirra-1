/**
 * Developer utilities and helper functions
 */

import { supabase } from './supabase';

const DEVELOPER_IDS = [
  '4e319154-a316-4367-b8d6-d7776cef9d70',
  'cf059e97-ae1c-40a9-88f2-ae0734fb1cdf',
  'ded2c1c6-7064-499f-a1e7-a8f90c95904a'
];

/**
 * Check if a user is a developer
 */
export async function isDeveloper(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase.rpc('is_developer', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('Error checking developer status:', error);
      // Fallback to hardcoded list
      return DEVELOPER_IDS.includes(userId);
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in isDeveloper:', error);
    // Fallback to hardcoded list
    return DEVELOPER_IDS.includes(userId);
  }
}

/**
 * Check if current user is developer (synchronous check with hardcoded list)
 * Use this for quick checks, use isDeveloper() for database verification
 */
export function isDeveloperSync(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return DEVELOPER_IDS.includes(userId);
}

/**
 * Ban a user (only developers can use this)
 */
export async function banUser(userIdToBan: string, reason?: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('You must be logged in to ban users') };
    }
    
    const { error } = await supabase.rpc('ban_user', {
      p_developer_id: user.id,
      p_user_id_to_ban: userIdToBan,
      p_reason: reason || null
    });
    
    if (error) {
      return { error: new Error(error.message) };
    }
    
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to ban user') };
  }
}

/**
 * Unban a user (only developers can use this)
 */
export async function unbanUser(userIdToUnban: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('You must be logged in to unban users') };
    }
    
    const { error } = await supabase.rpc('unban_user', {
      p_developer_id: user.id,
      p_user_id_to_unban: userIdToUnban
    });
    
    if (error) {
      return { error: new Error(error.message) };
    }
    
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to unban user') };
  }
}



