// Push Notifications Service
import { supabase } from './supabase';

// Check if running in Capacitor (native app)
const isNative = () => {
  return typeof (window as any).Capacitor !== 'undefined';
};

// Check if push notifications are supported
export const isPushSupported = (): boolean => {
  if (isNative()) {
    return true; // Capacitor handles this
  }
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// Request permission for push notifications
export const requestPushPermission = async (): Promise<boolean> => {
  if (!isPushSupported()) {
    console.log('Push notifications not supported');
    return false;
  }

  if (isNative()) {
    // Capacitor native - will be handled by Capacitor plugin
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive === 'granted') {
        await PushNotifications.register();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting native push permission:', error);
      return false;
    }
  } else {
    // Web - use Notification API
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
};

// Register device token with Supabase
export const registerDeviceToken = async (
  userId: string,
  token: string,
  platform: 'web' | 'android' | 'ios'
): Promise<boolean> => {
  try {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      registeredAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('device_tokens')
      .upsert({
        user_id: userId,
        token,
        platform,
        device_info: deviceInfo,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      });

    if (error) {
      console.error('Error registering device token:', error);
      return false;
    }

    console.log('Device token registered successfully');
    return true;
  } catch (error) {
    console.error('Error registering device token:', error);
    return false;
  }
};

// Unregister device token (e.g., on logout)
export const unregisterDeviceToken = async (token: string): Promise<void> => {
  try {
    await supabase
      .from('device_tokens')
      .update({ is_active: false })
      .eq('token', token);
  } catch (error) {
    console.error('Error unregistering device token:', error);
  }
};

// Initialize push notifications for Capacitor (native)
export const initializeNativePush = async (userId: string): Promise<void> => {
  if (!isNative()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Listen for registration success
    await PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      
      // Determine platform
      const platform = (window as any).Capacitor?.getPlatform() === 'ios' ? 'ios' : 'android';
      
      // Register token with Supabase
      await registerDeviceToken(userId, token.value, platform);
    });

    // Listen for registration error
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Listen for push notification received (app in foreground)
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      // You can show a local notification or update UI here
    });

    // Listen for push notification action (user tapped notification)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action:', notification);
      
      // Navigate based on notification data
      const data = notification.notification.data;
      if (data) {
        handleNotificationNavigation(data);
      }
    });

    // Request permission and register
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }
  } catch (error) {
    console.error('Error initializing native push:', error);
  }
};

// Initialize push notifications for Web
export const initializeWebPush = async (userId: string): Promise<void> => {
  if (isNative() || !isPushSupported()) return;

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered:', registration);

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied');
      return;
    }

    // Get FCM token (requires Firebase setup)
    // This will be configured when Firebase is set up
    console.log('Web push initialized, waiting for Firebase configuration');
    
  } catch (error) {
    console.error('Error initializing web push:', error);
  }
};

// Handle navigation when notification is tapped
const handleNotificationNavigation = (data: any): void => {
  const type = data.type;
  
  switch (type) {
    case 'message':
      // Navigate to messages
      window.location.href = '/messages';
      break;
    case 'like':
    case 'comment':
      // Navigate to social with dream
      if (data.dream_id) {
        window.location.href = `/social?dream=${data.dream_id}`;
      } else {
        window.location.href = '/social';
      }
      break;
    case 'follow':
    case 'follow_request':
      // Navigate to profile
      if (data.actor_id || data.requester_id) {
        window.location.href = `/profile/${data.actor_id || data.requester_id}`;
      } else {
        window.location.href = '/social';
      }
      break;
    case 'dream_completed':
      // Navigate to library
      window.location.href = '/library';
      break;
    case 'trial_expired':
      // Navigate to pricing
      window.location.href = '/pricing';
      break;
    default:
      // Default to notifications or home
      window.location.href = '/';
  }
};

// Main initialization function
export const initializePushNotifications = async (userId: string): Promise<void> => {
  if (!userId) return;

  if (isNative()) {
    await initializeNativePush(userId);
  } else {
    await initializeWebPush(userId);
  }
};
