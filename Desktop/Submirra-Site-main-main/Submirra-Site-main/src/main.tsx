import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Version check for automatic updates
let currentVersion: string | null = null;
let checkInterval: number | null = null;
let isReloading = false;

const checkForUpdates = async () => {
  // Don't check if already reloading
  if (isReloading) return;
  
  try {
    // Add timestamp to prevent caching
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    const newVersion = `${data.version}-${data.buildTime}`;
    
    if (currentVersion === null) {
      // First load - store current version
      currentVersion = newVersion;
      console.log(`App version: ${data.version}`);
    } else if (currentVersion !== newVersion) {
      // Version changed - reload page
      console.log('New version detected, reloading...', { old: currentVersion, new: newVersion });
      isReloading = true;
      
      // Small delay to ensure any pending operations complete
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.debug('Version check failed:', error);
  }
};

// Check for updates every 2 minutes (more frequent for better UX)
checkForUpdates(); // Initial check
checkInterval = window.setInterval(checkForUpdates, 2 * 60 * 1000); // 2 minutes

// Also check when user comes back to tab (visibility change)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isReloading) {
    checkForUpdates();
  }
});

// Check on focus (when user switches back to window)
window.addEventListener('focus', () => {
  if (!isReloading) {
    checkForUpdates();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
