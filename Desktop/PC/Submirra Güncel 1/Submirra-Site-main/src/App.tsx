import { AuthProvider } from './lib/AuthContext';
import { LanguageProvider } from './lib/i18n';
import { ToastProvider } from './lib/ToastContext';
import { RouterProvider, useCurrentPage } from './components/Router';
import Navigation from './components/Navigation';
import Starfield from './components/Starfield';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Analyze from './pages/Analyze';
import Library from './pages/Library';
import SignIn from './pages/Signln';
import Pricing from './pages/Pricing';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Social from './pages/Social';
import ActivateTrial from './pages/ActivateTrial';
import Messages from './pages/Messages';

function AppContent() {
  const currentPage = useCurrentPage();

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
      case '/signin':
      case '/signup':
        return <SignIn />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Starfield />
      <Navigation />
      {renderPage()}
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
