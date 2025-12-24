import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LanguageProvider } from './lib/i18n';
import { ToastProvider } from './lib/ToastContext';
import { RouterProvider, useCurrentPage } from './components/Router';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Starfield from './components/Starfield';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Analyze from './pages/Analyze';
import Library from './pages/Library';
import Generator from './pages/Generator';
import SignIn from './pages/Signln';
import Pricing from './pages/Pricing';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Social from './pages/Social';
import ActivateTrial from './pages/ActivateTrial';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Feedback from './pages/Feedback';
import Maintenance from './pages/Maintenance';
import { supabase } from './lib/supabase';

function AppContent() {
  const currentPage = useCurrentPage();
  const { user } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  useEffect(() => {
    checkMaintenanceMode();
  }, [user]);

  const checkMaintenanceMode = async () => {
    try {
      // Check maintenance mode
      const { data: settings } = await supabase
        .from('site_settings')
        .select('maintenance_mode, maintenance_message')
        .eq('id', 'global')
        .single();

      if (settings) {
        setMaintenanceMode(settings.maintenance_mode);
        setMaintenanceMessage(settings.maintenance_message || '');
      }

      // Check if user is developer
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_developer')
          .eq('id', user.id)
          .single();

        if (profile) {
          setIsDeveloper(profile.is_developer === true);
        }
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    } finally {
      setCheckingMaintenance(false);
    }
  };

  // Check if we're on localhost (development)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Show maintenance page if in maintenance mode and user is not a developer
  // Skip maintenance mode on localhost so developers can work locally
  if (!checkingMaintenance && maintenanceMode && !isDeveloper && !isLocalhost) {
    return <Maintenance message={maintenanceMessage} />;
  }

  const renderPage = () => {
    const path = window.location.pathname;
    
    // Handle profile with user ID
    if (path.startsWith('/profile/')) {
      return <Profile />;
    }
    
    switch (currentPage) {
      case '/':
        return <Home />;
      case '/about':
        return <About />;
      case '/contact':
        return <Contact />;
      case '/analyze':
        return <Analyze />;
      case '/library':
        return <Library />;
      case '/generator':
        return <Generator />;
      case '/pricing':
        return <Pricing />;
      case '/profile':
        return <Profile />;
      case '/dashboard':
        return <Dashboard />;
      case '/social':
        return <Social />;
      case '/activate-trial':
        return <ActivateTrial />;
      case '/messages':
        return <Messages />;
      case '/settings':
        return <Settings />;
      case '/terms':
        return <TermsOfService />;
      case '/privacy':
        return <PrivacyPolicy />;
      case '/feedback':
        return <Feedback />;
      case '/signin':
      case '/signup':
        return <SignIn />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Starfield />
      <Navigation />
      <div className="flex-1">
        {renderPage()}
      </div>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider>
            <AppContent />
          </RouterProvider>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
