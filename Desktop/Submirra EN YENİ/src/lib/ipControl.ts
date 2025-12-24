import { supabase } from './supabase';

/**
 * Get user's IP address
 */
export async function getUserIP(): Promise<string | null> {
  try {
    // Try multiple IP detection services for reliability
    const services = [
      'https://api.ipify.org?format=json',
      'https://api.my-ip.io/ip.json',
      'https://ipapi.co/json/'
    ];
    
    for (const service of services) {
      try {
        const response = await fetch(service, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const ip = data.ip || data.IP || null;
          if (ip) {
            console.log('✅ IP detected:', ip);
            return ip;
          }
        }
      } catch (err) {
        console.warn('Failed to get IP from service:', service, err);
        continue;
      }
    }
    
    console.warn('⚠️ Could not detect IP from any service');
    return null;
  } catch (error) {
    console.error('Error getting user IP:', error);
    return null;
  }
}

/**
 * Check if IP already has an account
 * Returns the count of accounts with this IP
 */
export async function checkIPExists(ip: string): Promise<{ exists: boolean; count: number }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('signup_ip', ip);
    
    if (error) {
      console.error('Error checking IP:', error);
      return { exists: false, count: 0 };
    }
    
    const count = data?.length || 0;
    console.log(`📊 IP ${ip} has ${count} existing account(s)`);
    
    return {
      exists: count > 0,
      count: count
    };
  } catch (error) {
    console.error('Error in checkIPExists:', error);
    return { exists: false, count: 0 };
  }
}

/**
 * Save IP address to user profile
 */
export async function saveUserIP(userId: string, ip: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ signup_ip: ip })
      .eq('id', userId);
    
    if (error) {
      console.error('Error saving IP:', error);
      return false;
    }
    
    console.log('✅ IP saved for user:', userId);
    return true;
  } catch (error) {
    console.error('Error in saveUserIP:', error);
    return false;
  }
}
