import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Page = '/' | '/about' | '/contact' | '/analyze' | '/library' | '/pricing' | '/profile' | '/signin' | '/signup' | '/dashboard' | '/social' | '/activate-trial' | '/messages' | '/terms' | '/privacy' | '/feedback';

// Valid routes that should be handled
const VALID_ROUTES: Page[] = ['/', '/about', '/contact', '/analyze', '/library', '/pricing', '/profile', '/signin', '/signup', '/dashboard', '/social', '/activate-trial', '/messages', '/terms', '/privacy', '/feedback'];

interface RouterContextType {
  currentPage: Page;
  navigate: (page: Page | string) => void;
  getUrlParam: (key: string) => string | null;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  // Initialize state from URL to handle F5 refresh correctly
  const getInitialPage = (): Page => {
    if (typeof window === 'undefined') return '/';
    const path = window.location.pathname;
    
    // Handle profile routes with user ID
    if (path.startsWith('/profile/')) {
      return '/profile';
    }
    
    // Handle query parameters
    const pathWithoutQuery = path.split('?')[0];
    const basePath = pathWithoutQuery.split('/')[1];
    
    if (!basePath || basePath === '') {
      return '/';
    }
    
    const route = `/${basePath}` as Page;
    if (VALID_ROUTES.includes(route)) {
      return route;
    }
    
    return '/';
  };

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);

  // Sync with browser URL
  useEffect(() => {
    const syncPath = () => {
      const path = window.location.pathname;
      
      // Handle profile routes with user ID
      if (path.startsWith('/profile/')) {
        setCurrentPage('/profile' as Page);
        window.scrollTo(0, 0);
        return;
      }
      
      // Handle query parameters (e.g., /messages?user=...)
      const pathWithoutQuery = path.split('?')[0];
      const basePath = pathWithoutQuery.split('/')[1];
      
      let targetPage: Page = '/';
      
      if (!basePath || basePath === '') {
        targetPage = '/';
      } else {
        const route = `/${basePath}` as Page;
        // Check if route is valid
        if (VALID_ROUTES.includes(route)) {
          targetPage = route;
        } else {
          // Invalid route - keep current URL but set page to home
          // This prevents redirect on F5 refresh
          targetPage = '/';
        }
      }
      
      setCurrentPage(targetPage);
      
      // Force scroll to top
      window.scrollTo(0, 0);
    };

    // Initial sync - must happen immediately on mount
    syncPath();

    // Listen for browser back/forward
    const handlePopState = () => {
      syncPath();
    };
    
    // Also listen for hash changes (if any)
    const handleHashChange = () => {
      syncPath();
    };
    
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = (page: Page | string) => {
    if (page.startsWith('/profile/')) {
      // Handle profile with user ID
      window.history.pushState({}, '', page);
      setCurrentPage('/profile' as Page);
    } else if (page.includes('?')) {
      // Handle URL with query parameters
      const basePath = page.split('?')[0];
      window.history.pushState({}, '', page);
      setCurrentPage(basePath as Page);
    } else {
      window.history.pushState({}, '', page);
      setCurrentPage(page as Page);
    }
    window.scrollTo(0, 0);
  };

  const getUrlParam = (key: string): string | null => {
    const path = window.location.pathname;
    if (key === 'userId' && path.startsWith('/profile/')) {
      const parts = path.split('/');
      return parts[2] || null;
    }
    return null;
  };

  return (
    <RouterContext.Provider value={{ currentPage, navigate, getUrlParam }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useNavigate() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useNavigate must be used within RouterProvider');
  }
  return context.navigate;
}

export function useCurrentPage() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useCurrentPage must be used within RouterProvider');
  }
  return context.currentPage;
}
