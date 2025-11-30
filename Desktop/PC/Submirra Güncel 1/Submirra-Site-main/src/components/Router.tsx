import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Page = '/' | '/about' | '/contact' | '/analyze' | '/library' | '/pricing' | '/profile' | '/signin' | '/signup' | '/dashboard' | '/social' | '/activate-trial' | '/messages';

interface RouterContextType {
  currentPage: Page;
  navigate: (page: Page | string) => void;
  getUrlParam: (key: string) => string | null;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('/');

  // Sync with browser URL
  useEffect(() => {
    const syncPath = () => {
      const path = window.location.pathname;
      const basePath = path.split('/')[1];
      
      if (basePath === '' || basePath === undefined) {
        setCurrentPage('/');
      } else if (path.startsWith('/profile/')) {
        setCurrentPage('/profile' as Page);
      } else {
        setCurrentPage(`/${basePath}` as Page);
      }
      
      // Force scroll to top
      window.scrollTo(0, 0);
    };

    // Initial sync
    syncPath();

    // Listen for browser back/forward
    const handlePopState = () => {
      syncPath();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
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
