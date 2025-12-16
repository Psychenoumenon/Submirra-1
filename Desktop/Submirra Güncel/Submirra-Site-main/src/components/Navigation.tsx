import { useState, useEffect } from 'react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import Notifications from './Notifications';
import { useNavigate, useCurrentPage } from './Router';
import { useAuth } from '../lib/AuthContext';
import { useLanguage } from '../lib/i18n';
import { Menu, X, MessageSquare, User, Sparkles, Lock, LogOut, Settings, Home, Info, Users, BookOpen, Mail, Brain } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Navigation() {
  const navigate = useNavigate();
  const currentPage = useCurrentPage();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{avatar_url: string | null, full_name: string} | null>(null);
  const [isPremium, setIsPremium] = useState(false);

  const navItems = [
    { label: t.nav.home, path: '/' as const, icon: Home },
    { label: t.nav.about, path: '/about' as const, icon: Info },
    { label: t.nav.social, path: '/social' as const, icon: Users },
    { label: t.nav.analyze, path: '/analyze' as const, icon: Brain },
    { label: t.nav.library, path: '/library' as const, icon: BookOpen },
  ];

  const userNavItems = [
    { label: t.nav.contact, path: '/contact' as const, icon: Mail },
  ];

  const premiumNavItems = [
    { label: t.nav.generator, path: '/generator' as const, icon: Sparkles },
  ];

  const handleNavClick = (path: typeof navItems[number]['path'] | typeof userNavItems[number]['path'] | typeof premiumNavItems[number]['path']) => {
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
      
      // Check premium status
      const checkPremium = async () => {
        try {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_type')
            .eq('user_id', user.id)
            .single();
          
          setIsPremium(subscription?.plan_type === 'premium' || subscription?.plan_type === 'ruyagezer');
        } catch (error) {
          console.error('Error checking premium status:', error);
        }
      };
      
      checkPremium();
    } else {
      setUserProfile(null);
      setIsPremium(false);
    }
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-pink-500/20 shadow-lg shadow-pink-500/5">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center gap-6">
          {/* Logo - En Sol */}
          <div className="flex items-center flex-shrink-0">
            <Logo />
          </div>

          {/* Nav Items - Ortada */}
          <div className="hidden lg:flex items-center gap-3 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.path;
              
              // Her nav item için farklı renkler
              const colorConfig: Record<string, { text: string; bg: string; shadow: string; badge: string; line: string; hover: string; hoverIcon: string; iconGlow: string }> = {
                '/': { 
                  text: 'text-pink-400', 
                  bg: 'bg-pink-500/10', 
                  shadow: 'shadow-pink-500/20', 
                  badge: 'bg-pink-400',
                  line: 'from-pink-400 via-pink-500 to-pink-400',
                  hover: 'hover:text-pink-400',
                  hoverIcon: 'group-hover:text-pink-400',
                  iconGlow: 'rgba(236,72,153,0.8)'
                },
                '/about': { 
                  text: 'text-pink-400', 
                  bg: 'bg-pink-500/10', 
                  shadow: 'shadow-pink-500/20', 
                  badge: 'bg-pink-400',
                  line: 'from-pink-400 via-pink-500 to-pink-400',
                  hover: 'hover:text-pink-400',
                  hoverIcon: 'group-hover:text-pink-400',
                  iconGlow: 'rgba(236,72,153,0.8)'
                },
                '/social': { 
                  text: 'text-pink-400', 
                  bg: 'bg-pink-500/10', 
                  shadow: 'shadow-pink-500/20', 
                  badge: 'bg-pink-400',
                  line: 'from-pink-400 via-pink-500 to-pink-400',
                  hover: 'hover:text-pink-400',
                  hoverIcon: 'group-hover:text-pink-400',
                  iconGlow: 'rgba(236,72,153,0.8)'
                },
                '/analyze': { 
                  text: 'text-pink-400', 
                  bg: 'bg-pink-500/10', 
                  shadow: 'shadow-pink-500/20', 
                  badge: 'bg-pink-400',
                  line: 'from-pink-400 via-pink-500 to-pink-400',
                  hover: 'hover:text-pink-400',
                  hoverIcon: 'group-hover:text-pink-400',
                  iconGlow: 'rgba(236,72,153,0.8)'
                },
                '/library': { 
                  text: 'text-pink-400', 
                  bg: 'bg-pink-500/10', 
                  shadow: 'shadow-pink-500/20', 
                  badge: 'bg-pink-400',
                  line: 'from-pink-400 via-pink-500 to-pink-400',
                  hover: 'hover:text-pink-400',
                  hoverIcon: 'group-hover:text-pink-400',
                  iconGlow: 'rgba(236,72,153,0.8)'
                },
              };
              
              const colors = colorConfig[item.path] || colorConfig['/'];
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative group whitespace-nowrap ${
                    isActive
                      ? `text-white ${colors.bg} shadow-lg ${colors.shadow} scale-105`
                      : `text-white ${colors.hover} hover:bg-slate-800/50 hover:scale-105`
                  }`}
                >
                  <Icon 
                    size={16} 
                    className={`transition-all duration-300 flex-shrink-0 ${
                      isActive 
                        ? colors.text
                        : `text-slate-400 ${colors.hoverIcon}`
                    }`}
                    style={isActive ? { 
                      filter: `drop-shadow(0 0 8px ${colors.iconGlow})`
                    } : {}}
                  />
                  <span className="text-white transition-all duration-300">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${colors.badge} animate-pulse`} style={{ boxShadow: `0 0 8px ${colors.iconGlow}` }}></span>
                  )}
                  <span className={`absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r ${colors.line} transition-all duration-500 ease-out group-hover:w-full ${isActive ? 'w-full' : ''}`} style={isActive ? { boxShadow: `0 0 8px ${colors.iconGlow}` } : {}}></span>
                  {isActive && (
                    <span className={`absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-50 animate-pulse`} style={{ color: 'inherit' }}></span>
                  )}
                </button>
              );
            })}

            {/* Generator Link - Herkes için görünür */}
            {user && premiumNavItems.map((item) => {
              const isActive = currentPage === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative group whitespace-nowrap ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-pink-500/10 to-yellow-500/10 shadow-lg shadow-pink-500/20 scale-105'
                      : 'text-white hover:bg-slate-800/50 hover:scale-105'
                  }`}
                >
                  <item.icon size={16} className={`flex-shrink-0 ${isPremium ? (isActive ? "text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]" : "text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.4)] group-hover:drop-shadow-[0_0_6px_rgba(253,224,71,0.6)]") : "text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.4)]"}`} />
                  <span className="text-white">{item.label}</span>
                  {!isPremium && <Lock size={12} className="text-pink-400 flex-shrink-0" />}
                  <span className={`absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-pink-400 via-yellow-400 to-pink-400 transition-all duration-500 ease-out group-hover:w-full ${isActive ? 'w-full' : ''} ${isActive ? 'shadow-[0_0_10px_rgba(236,72,153,0.8),0_0_6px_rgba(250,204,21,0.6)]' : ''}`}></span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-300 to-transparent opacity-50 animate-pulse"></span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.8)]"></span>
                  )}
                </button>
              );
            })}

            {userNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.path;
              // Contact için özel renk - Pink
              const colors = { 
                text: 'text-pink-400', 
                bg: 'bg-pink-500/10', 
                shadow: 'shadow-pink-500/20', 
                badge: 'bg-pink-400',
                line: 'from-pink-400 via-pink-500 to-pink-400',
                hover: 'hover:text-pink-400',
                hoverIcon: 'group-hover:text-pink-400',
                iconGlow: 'rgba(236,72,153,0.8)'
              };
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative group whitespace-nowrap ${
                    isActive
                      ? `text-white ${colors.bg} shadow-lg ${colors.shadow} scale-105`
                      : `text-white ${colors.hover} hover:bg-slate-800/50 hover:scale-105`
                  }`}
                >
                  <Icon 
                    size={16} 
                    className={`transition-all duration-300 flex-shrink-0 ${
                      isActive 
                        ? colors.text
                        : `text-slate-400 ${colors.hoverIcon}`
                    }`}
                    style={isActive ? { 
                      filter: `drop-shadow(0 0 8px ${colors.iconGlow})`
                    } : {}}
                  />
                  <span className="text-white transition-all duration-300">
                    {item.label}
                  </span>
                  {isActive && (
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${colors.badge} animate-pulse`} style={{ boxShadow: `0 0 8px ${colors.iconGlow}` }}></span>
                  )}
                  <span className={`absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r ${colors.line} transition-all duration-500 ease-out group-hover:w-full ${isActive ? 'w-full' : ''}`} style={isActive ? { boxShadow: `0 0 8px ${colors.iconGlow}` } : {}}></span>
                  {isActive && (
                    <span className={`absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-current to-transparent opacity-50 animate-pulse`} style={{ color: 'inherit' }}></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sağ Menü - Pricing, Language, User */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/pricing')}
              className={`px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 via-purple-600 via-pink-500 to-purple-600 text-white text-sm font-semibold hover:shadow-xl hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all duration-300 bg-[length:200%_auto] animate-gradient ${
                currentPage === '/pricing' ? 'ring-2 ring-pink-400 ring-offset-2 ring-offset-slate-950' : ''
              }`}
            >
              {t.nav.buy}
            </button>

            <LanguageSwitcher />

            {user ? (
              <>
                <Notifications />
                <button
                  onClick={() => navigate('/messages')}
                  className="relative p-2 text-slate-400 hover:text-purple-400 transition-colors"
                  title={t.nav.messages}
                >
                  <MessageSquare size={20} />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2 text-slate-400 hover:text-purple-400 transition-colors"
                  title={t.nav.settings || 'Settings'}
                >
                  <Settings size={20} />
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
                  className="p-2 text-slate-400 hover:text-pink-400 transition-colors"
                  title={t.nav.signOut}
                >
                  <LogOut size={20} />
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

              {/* Premium Generator - Mobile */}
              {user && isPremium && premiumNavItems.map((item, index) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 animate-fade-in ${
                    currentPage === item.path
                      ? 'bg-gradient-to-r from-pink-500/10 to-yellow-500/10 text-pink-400'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-pink-400'
                  }`}
                  style={{ animationDelay: `${(navItems.length + index) * 0.05}s` }}
                >
                  <item.icon size={18} className="text-yellow-400" />
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
                  style={{ animationDelay: `${(navItems.length + (isPremium ? premiumNavItems.length : 0) + index) * 0.05}s` }}
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
                      navigate('/settings');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-800/70 hover:text-pink-400 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${(navItems.length + userNavItems.length + 1) * 0.05}s` }}
                  >
                    <Settings size={16} />
                    {t.nav.settings || 'Settings'}
                  </button>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-800/70 hover:text-pink-400 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${(navItems.length + userNavItems.length + 2) * 0.05}s` }}
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
