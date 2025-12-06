import { useState, useEffect } from 'react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import Notifications from './Notifications';
import Settings from './Settings';
import { useNavigate, useCurrentPage } from './Router';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/i18n';
import { LogOut, Menu, X, MessageSquare, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Navigation() {
  const navigate = useNavigate();
  const currentPage = useCurrentPage();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{avatar_url: string | null, full_name: string} | null>(null);

  const navItems = [
    { label: t.nav.home, path: '/' as const },
    { label: t.nav.about, path: '/about' as const },
    { label: t.nav.social, path: '/social' as const },
    { label: t.nav.analyze, path: '/analyze' as const },
    { label: t.nav.library, path: '/library' as const },
  ];

  const userNavItems = [
    { label: t.nav.contact, path: '/contact' as const },
  ];

  const handleNavClick = (path: typeof navItems[number]['path'] | typeof userNavItems[number]['path']) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (user) {
      const loadUserProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error loading user profile:', error);
            return;
          }

          setUserProfile(data);
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      };

      loadUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-pink-500/20 shadow-lg shadow-pink-500/5">
      <div className="max-w-7xl mx-auto px-1 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center flex-shrink-0">
            <Logo />
          </div>

          <div className="hidden lg:flex items-center gap-4 flex-shrink-0 whitespace-nowrap flex-1 justify-center">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`text-sm font-medium transition-all duration-300 hover:text-pink-400 relative group ${
                  currentPage === item.path
                    ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]'
                    : 'text-slate-300'
                }`}
              >
                {item.label}
                <span className={`absolute bottom-0 left-0 w-0 h-0.5 bg-pink-400 transition-all duration-300 group-hover:w-full ${currentPage === item.path ? 'w-full' : ''}`}></span>
              </button>
            ))}

            {userNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`text-sm font-medium transition-all duration-300 hover:text-pink-400 relative group ${
                  currentPage === item.path
                    ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]'
                    : 'text-slate-300'
                }`}
              >
                {item.label}
                <span className={`absolute bottom-0 left-0 w-0 h-0.5 bg-pink-400 transition-all duration-300 group-hover:w-full ${currentPage === item.path ? 'w-full' : ''}`}></span>
              </button>
            ))}

            <button
              onClick={() => navigate('/pricing')}
              className={`px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-medium hover:from-pink-500 hover:to-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30 hover:scale-105 ${
                currentPage === '/pricing' ? 'ring-2 ring-pink-400' : ''
              }`}
            >
              {t.nav.buy}
            </button>

            <LanguageSwitcher />

            {user ? (
              <>
                <Settings />
                <Notifications />
                <button
                  onClick={() => navigate('/messages')}
                  className="relative p-2 text-slate-400 hover:text-purple-400 transition-colors"
                  title={t.nav.messages}
                >
                  <MessageSquare size={20} />
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 p-1 rounded-full bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-200 group"
                  title={userProfile?.full_name || 'Profile'}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden group-hover:border-pink-500/50 transition-all">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="text-pink-400" size={16} />
                    )}
                  </div>
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 text-pink-300 hover:border-pink-400/50 hover:text-pink-200 transition-all duration-200"
                >
                  <LogOut size={16} />
                  {t.nav.signOut}
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/signin')}
                className={`px-6 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-medium hover:from-pink-500 hover:to-purple-500 transition-all duration-200 hover:shadow-lg hover:shadow-pink-500/30 ${
                  currentPage === '/signin' ? 'ring-2 ring-pink-400' : ''
                }`}
              >
                {t.nav.signIn}
              </button>
            )}
          </div>

          <div className="flex lg:hidden items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-pink-400 transition-colors p-2"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-pink-500/20 pt-4 animate-slide-down">
            <div className="flex flex-col gap-3">
              {navItems.map((item, index) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 animate-fade-in ${
                    currentPage === item.path
                      ? 'bg-pink-500/10 text-pink-400'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-pink-400'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {item.label}
                </button>
              ))}

              {userNavItems.map((item, index) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`text-left px-4 py-2 rounded-lg font-medium transition-all duration-200 animate-fade-in ${
                    currentPage === item.path
                      ? 'bg-pink-500/10 text-pink-400'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-pink-400'
                  }`}
                  style={{ animationDelay: `${(navItems.length + index) * 0.05}s` }}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={() => {
                  navigate('/pricing');
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-medium hover:from-pink-500 hover:to-purple-500 transition-all duration-200 animate-fade-in ${
                  currentPage === '/pricing' ? 'ring-2 ring-pink-400' : ''
                }`}
                style={{ animationDelay: `${(navItems.length + userNavItems.length) * 0.05}s` }}
              >
                {t.nav.buy}
              </button>

              {user ? (
                <>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-800/70 hover:text-pink-400 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${(navItems.length + userNavItems.length + 1) * 0.05}s` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center overflow-hidden">
                      {userProfile?.avatar_url ? (
                        <img
                          src={userProfile.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="text-pink-400" size={12} />
                      )}
                    </div>
                    {userProfile?.full_name || 'Profile'}
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/30 text-pink-300 hover:border-pink-400/50 hover:text-pink-200 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${(navItems.length + userNavItems.length + 2) * 0.05}s` }}
                  >
                    <LogOut size={16} />
                    {t.nav.signOut}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    navigate('/signin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-medium hover:from-pink-500 hover:to-purple-500 transition-all duration-200 animate-fade-in ${
                    currentPage === '/signin' ? 'ring-2 ring-pink-400' : ''
                  }`}
                  style={{ animationDelay: `${(navItems.length + userNavItems.length + 1) * 0.05}s` }}
                >
                  {t.nav.signIn}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
