import { useState, useEffect } from 'react';
import { User, CreditCard, Loader2, AlertCircle, CheckCircle2, Shield, Star, Lock, Bell, Wrench } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { supabase } from '../lib/supabase';

type TabType = 'subscription' | 'blocked' | 'favorites' | 'privacy' | 'notifications';

interface BlockedUser {
  id: string;
  blocked_id: string;
  blocked_user: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

interface FavoriteUser {
  id: string;
  favorite_user_id: string;
  favorite_user: {
    id: string;
    full_name: string;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('subscription');
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<'free' | 'trial' | 'standard' | 'premium' | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [favoriteUsers, setFavoriteUsers] = useState<FavoriteUser[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [loadingFavoriteUsers, setLoadingFavoriteUsers] = useState(false);
  const [showReadReceipts, setShowReadReceipts] = useState(true);
  const [loadingReadReceipts, setLoadingReadReceipts] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [loadingOnlineStatus, setLoadingOnlineStatus] = useState(false);
  const [lemonSubscriptionId, setLemonSubscriptionId] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/signin');
      return;
    }

    loadSubscriptionData();
    checkDeveloperStatus();
    loadMaintenanceStatus();
    
    if (activeTab === 'blocked') {
      loadBlockedUsers();
    } else if (activeTab === 'favorites') {
      loadFavoriteUsers();
    } else if (activeTab === 'privacy') {
      loadReadReceiptsSetting();
    }
  }, [user, authLoading, navigate, activeTab]);

  const checkDeveloperStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_developer')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setIsDeveloper(data.is_developer === true);
      }
    } catch (error) {
      console.error('Error checking developer status:', error);
    }
  };

  const loadMaintenanceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('maintenance_mode')
        .eq('id', 'global')
        .single();
      
      if (!error && data) {
        setMaintenanceMode(data.maintenance_mode);
      }
    } catch (error) {
      console.error('Error loading maintenance status:', error);
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!isDeveloper) return;
    
    setTogglingMaintenance(true);
    try {
      const newMode = !maintenanceMode;
      
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          maintenance_mode: newMode,
          maintenance_started_at: newMode ? new Date().toISOString() : null,
          maintenance_started_by: newMode ? user?.id : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 'global');
      
      if (error) throw error;
      
      setMaintenanceMode(newMode);
      showToast(
        newMode 
          ? (language === 'tr' ? 'Bakım modu aktif edildi' : 'Maintenance mode enabled')
          : (language === 'tr' ? 'Bakım modu devre dışı bırakıldı' : 'Maintenance mode disabled'),
        'success'
      );
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      showToast(language === 'tr' ? 'İşlem başarısız' : 'Operation failed', 'error');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, trial_end_date, lemon_squeezy_subscription_id, payment_failed')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading subscription:', error);
        return;
      }

      if (data) {
        setPlanType(data.plan_type as 'free' | 'trial' | 'standard' | 'premium');
        setTrialEndDate(data.trial_end_date);
        setLemonSubscriptionId(data.lemon_squeezy_subscription_id);
        setPaymentFailed(data.payment_failed || false);
      }
    } catch (error) {
      console.error('Error in loadSubscriptionData:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockedUsers = async () => {
    if (!user) return;

    setLoadingBlockedUsers(true);
    try {
      const { data: blocksData, error: blocksError } = await supabase
        .from('user_blocks')
        .select('id, blocked_id')
        .eq('blocker_id', user.id);

      if (blocksError) throw blocksError;

      if (!blocksData || blocksData.length === 0) {
        setBlockedUsers([]);
        return;
      }

      const blockedUserIds = blocksData.map(block => block.blocked_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', blockedUserIds);

      if (profilesError) throw profilesError;

      const formattedData = blocksData.map(block => {
        const profile = profilesData?.find(p => p.id === block.blocked_id);
        return {
          id: block.id,
          blocked_id: block.blocked_id,
          blocked_user: profile || {
            id: block.blocked_id,
            full_name: 'Unknown User',
            username: null,
            avatar_url: null
          }
        };
      });

      setBlockedUsers(formattedData);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      showToast('Failed to load blocked users', 'error');
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  const loadFavoriteUsers = async () => {
    if (!user) return;

    setLoadingFavoriteUsers(true);
    try {
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('user_favorites')
        .select('id, favorite_user_id')
        .eq('user_id', user.id);

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavoriteUsers([]);
        return;
      }

      const favoriteUserIds = favoritesData.map(fav => fav.favorite_user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', favoriteUserIds);

      if (profilesError) throw profilesError;

      const formattedData = favoritesData.map(favorite => {
        const profile = profilesData?.find(p => p.id === favorite.favorite_user_id);
        return {
          id: favorite.id,
          favorite_user_id: favorite.favorite_user_id,
          favorite_user: profile || {
            id: favorite.favorite_user_id,
            full_name: 'Unknown User',
            username: null,
            avatar_url: null
          }
        };
      });

      setFavoriteUsers(formattedData);
    } catch (error) {
      console.error('Error loading favorite users:', error);
      showToast('Failed to load favorite users', 'error');
    } finally {
      setLoadingFavoriteUsers(false);
    }
  };

  const loadReadReceiptsSetting = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('show_read_receipts, show_online_status')
        .eq('id', user.id)
        .single();
      if (data) {
        setShowReadReceipts(data.show_read_receipts !== false);
        setShowOnlineStatus(data.show_online_status !== false);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const unblockUser = async (blockId: string, userName: string) => {
    if (!user) return;

    if (!confirm(`${t.settings.unblockConfirm} ${userName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
      showToast(`${userName} ${t.settings.unblockSuccess}`, 'success');
    } catch (error) {
      console.error('Error unblocking user:', error);
      showToast('Failed to unblock user', 'error');
    }
  };

  const removeFavorite = async (favoriteId: string, userName: string) => {
    if (!user) return;

    if (!confirm(language === 'tr' 
      ? `${userName} kullanıcısını favorilerden çıkarmak istediğinizden emin misiniz?`
      : `Are you sure you want to remove ${userName} from favorites?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavoriteUsers(prev => prev.filter(f => f.id !== favoriteId));
      showToast(
        language === 'tr' ? `${userName} favorilerden çıkarıldı` : `${userName} removed from favorites`,
        'success'
      );
    } catch (error) {
      console.error('Error removing favorite:', error);
      showToast('Favori kaldırılamadı', 'error');
    }
  };

  const updateReadReceipts = async (enabled: boolean) => {
    if (!user) return;
    setLoadingReadReceipts(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ show_read_receipts: enabled })
        .eq('id', user.id);

      if (error) throw error;

      setShowReadReceipts(enabled);
      showToast(
        enabled 
          ? (t.settings.readReceiptsEnabled || 'Read receipts enabled')
          : (t.settings.readReceiptsDisabled || 'Read receipts disabled'),
        'success'
      );
    } catch (error) {
      console.error('Error updating read receipts:', error);
      showToast(t.settings.readReceiptsUpdateError || 'Failed to update read receipts', 'error');
    } finally {
      setLoadingReadReceipts(false);
    }
  };

  const updateOnlineStatus = async (enabled: boolean) => {
    if (!user) return;
    setLoadingOnlineStatus(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ show_online_status: enabled })
        .eq('id', user.id);

      if (error) throw error;

      setShowOnlineStatus(enabled);
      showToast(
        enabled 
          ? 'Online durumu gösteriliyor'
          : 'Online durumu gizleniyor',
        'success'
      );
    } catch (error) {
      console.error('Error updating online status:', error);
      showToast('Online durumu güncellenemedi', 'error');
    } finally {
      setLoadingOnlineStatus(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !planType) return;

    const confirmMessage = language === 'tr'
      ? `${planType === 'premium' ? 'Premium' : planType === 'standard' ? 'Standard' : 'Trial'} planınızı iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
      : `Are you sure you want to cancel your ${planType} plan? This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setCancelingSubscription(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        'https://soewlqmskqmpycaevhoc.supabase.co/functions/v1/cancel-subscription',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      setPlanType('free');
      setLemonSubscriptionId(null);
      setPaymentFailed(false);
      showToast(
        language === 'tr' 
          ? 'Aboneliğiniz iptal edildi. Artık Free plandasınız.'
          : 'Your subscription has been cancelled. You are now on the Free plan.',
        'success'
      );
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      showToast(
        language === 'tr'
          ? 'Abonelik iptal edilirken bir hata oluştu.'
          : 'An error occurred while canceling your subscription.',
        'error'
      );
    } finally {
      setCancelingSubscription(false);
    }
  };

  const getPlanDisplayName = (plan: string | null) => {
    if (!plan) return language === 'tr' ? 'Yükleniyor...' : 'Loading...';
    
    const planNames: Record<string, { tr: string; en: string }> = {
      free: { tr: 'Ücretsiz Plan', en: 'Free Plan' },
      trial: { tr: 'Deneme Planı', en: 'Trial Plan' },
      standard: { tr: 'Standart Plan', en: 'Standard Plan' },
      premium: { tr: 'Premium Plan', en: 'Premium Plan' },
    };

    return planNames[plan]?.[language] || plan;
  };

  const getPlanColor = (plan: string | null) => {
    switch (plan) {
      case 'premium':
        return 'from-pink-500 to-purple-500';
      case 'standard':
        return 'from-cyan-500 to-blue-500';
      case 'trial':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-400" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-pink-500/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-4xl mx-auto z-10">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight">
            {language === 'tr' ? 'Ayarlar' : 'Settings'}
          </h1>
        </div>

        {/* Tabs */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 animate-fade-in-delay-1">
          <div className="flex gap-2 mb-6 border-b border-purple-500/20 pb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('subscription')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-sm ${
                activeTab === 'subscription'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <CreditCard size={16} />
              <span>{language === 'tr' ? 'Abonelik' : 'Subscription'}</span>
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-sm ${
                activeTab === 'blocked'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Shield size={16} />
              <span>{language === 'tr' ? 'Engellenenler' : 'Blocked'}</span>
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-sm ${
                activeTab === 'favorites'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Star size={16} />
              <span>{language === 'tr' ? 'Favoriler' : 'Favorites'}</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-sm ${
                activeTab === 'privacy'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Lock size={16} />
              <span>{language === 'tr' ? 'Gizlilik' : 'Privacy'}</span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap text-sm ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Bell size={16} />
              <span>{language === 'tr' ? 'Bildirimler' : 'Notifications'}</span>
            </button>
          </div>

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="bg-slate-950/50 rounded-xl p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User size={20} className="text-purple-400" />
                  {language === 'tr' ? 'Mevcut Planınız' : 'Current Plan'}
                </h3>

                <div className={`bg-gradient-to-r ${getPlanColor(planType)} p-6 rounded-lg mb-4`}>
                  <h4 className="text-2xl font-bold text-white mb-2">
                    {getPlanDisplayName(planType)}
                  </h4>
                  {planType === 'trial' && trialEndDate && (
                    <p className="text-white/80 text-sm">
                      {language === 'tr' ? 'Bitiş Tarihi: ' : 'Ends on: '}
                      {new Date(trialEndDate).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
                    </p>
                  )}
                  {planType === 'free' && (
                    <p className="text-white/80 text-sm">
                      {language === 'tr' 
                        ? 'Daha fazla özellik için premium plana geçin'
                        : 'Upgrade to premium for more features'}
                    </p>
                  )}
                </div>

                {paymentFailed && (
                  <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-white font-medium mb-1">
                        {language === 'tr' ? 'Ödeme Başarısız!' : 'Payment Failed!'}
                      </p>
                      <p className="text-slate-300 text-sm">
                        {language === 'tr'
                          ? 'Son ödemeniz başarısız oldu. Lütfen ödeme bilgilerinizi güncelleyin veya aboneliğiniz iptal edilecektir.'
                          : 'Your last payment failed. Please update your payment information or your subscription will be cancelled.'}
                      </p>
                    </div>
                  </div>
                )}

                {planType && planType !== 'free' && (
                  <div className="space-y-4">
                    {planType === 'standard' && (
                      <button
                        onClick={() => navigate('/pricing')}
                        className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        {language === 'tr' ? 'Premium Plana Yükselt' : 'Upgrade to Premium'}
                      </button>
                    )}

                    <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <p className="text-white font-medium mb-1">
                          {language === 'tr' ? 'Dikkat!' : 'Warning!'}
                        </p>
                        <p className="text-slate-300 text-sm">
                          {language === 'tr'
                            ? 'Aboneliğinizi iptal ettiğinizde, premium özelliklerinize erişiminizi kaybedeceksiniz ve hesabınız ücretsiz plana dönüştürülecektir.'
                            : 'When you cancel your subscription, you will lose access to premium features and your account will be downgraded to the free plan.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelingSubscription}
                      className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-2"
                    >
                      {cancelingSubscription ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          {language === 'tr' ? 'İptal Ediliyor...' : 'Canceling...'}
                        </>
                      ) : (
                        <>
                          {language === 'tr' ? 'Aboneliği İptal Et' : 'Cancel Subscription'}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {planType === 'free' && (
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    {language === 'tr' ? 'Premium Plana Geç' : 'Upgrade to Premium'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Blocked Users Tab */}
          {activeTab === 'blocked' && (
            <div>
              <p className="text-slate-400 text-sm mb-4">
                {t.settings.blockedUsersDesc}
              </p>
              {loadingBlockedUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-purple-400" size={24} />
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/30 rounded-xl">
                  <Shield className="mx-auto mb-3 text-slate-600" size={40} />
                  <p className="text-slate-400">{t.settings.noBlockedUsers}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-center gap-3 p-4 bg-slate-950/30 rounded-xl border border-purple-500/10"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden">
                        {block.blocked_user.avatar_url ? (
                          <img
                            src={block.blocked_user.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={24} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {block.blocked_user.full_name}
                        </p>
                        {block.blocked_user.username && (
                          <p className="text-slate-400 text-sm">
                            @{block.blocked_user.username}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => unblockUser(block.id, block.blocked_user.full_name)}
                        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
                      >
                        {t.settings.unblock}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === 'favorites' && (
            <div>
              <p className="text-slate-400 text-sm mb-4">
                {t.settings.favoritesDesc}
              </p>
              {loadingFavoriteUsers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-purple-400" size={24} />
                </div>
              ) : favoriteUsers.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/30 rounded-xl">
                  <Star className="mx-auto mb-3 text-slate-600" size={40} />
                  <p className="text-slate-400">{t.settings.noFavorites}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favoriteUsers.map((favorite) => (
                    <div
                      key={favorite.id}
                      className="flex items-center gap-3 p-4 bg-slate-950/30 rounded-xl border border-purple-500/10"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center overflow-hidden">
                        {favorite.favorite_user.avatar_url ? (
                          <img
                            src={favorite.favorite_user.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={24} className="text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {favorite.favorite_user.full_name}
                        </p>
                        {favorite.favorite_user.username && (
                          <p className="text-slate-400 text-sm">
                            @{favorite.favorite_user.username}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeFavorite(favorite.id, favorite.favorite_user.full_name)}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                      >
                        {t.settings.remove}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm mb-4">
                {t.settings.privacyDesc}
              </p>
              <div className="space-y-3">
                <div className="p-4 bg-slate-950/30 rounded-xl border border-purple-500/10">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex-1">
                      <span className="text-white font-medium">{t.settings.showReadReceipts || 'Show Read Receipts'}</span>
                      <p className="text-slate-400 text-sm mt-1">{t.settings.showReadReceiptsDesc || "Let others know when you've seen their messages"}</p>
                    </div>
                    {loadingReadReceipts ? (
                      <Loader2 className="animate-spin text-purple-400 ml-4" size={20} />
                    ) : (
                      <input
                        type="checkbox"
                        checked={showReadReceipts}
                        onChange={(e) => updateReadReceipts(e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer ml-4"
                      />
                    )}
                  </label>
                </div>
                <div className="p-4 bg-slate-950/30 rounded-xl border border-purple-500/10">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex-1">
                      <span className="text-white font-medium">{language === 'tr' ? 'Online Durumunu Göster' : 'Show Online Status'}</span>
                      <p className="text-slate-400 text-sm mt-1">{language === 'tr' ? 'Diğer kullanıcılar online olup olmadığınızı görebilsin' : 'Let others see when you are online'}</p>
                    </div>
                    {loadingOnlineStatus ? (
                      <Loader2 className="animate-spin text-purple-400 ml-4" size={20} />
                    ) : (
                      <input
                        type="checkbox"
                        checked={showOnlineStatus}
                        onChange={(e) => updateOnlineStatus(e.target.checked)}
                        className="w-5 h-5 rounded cursor-pointer ml-4"
                      />
                    )}
                  </label>
                </div>
                <div className="p-4 bg-slate-950/30 rounded-xl border border-purple-500/10">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-white font-medium">{t.settings.profileVisibility}</span>
                    <select className="bg-slate-800 border border-purple-500/30 rounded px-3 py-2 text-white text-sm cursor-pointer">
                      <option>{t.settings.public}</option>
                      <option>{t.settings.private}</option>
                    </select>
                  </label>
                </div>
                <div className="p-4 bg-slate-950/30 rounded-xl border border-purple-500/10">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-white font-medium">{t.settings.allowMessagesFrom}</span>
                    <select className="bg-slate-800 border border-purple-500/30 rounded px-3 py-2 text-white text-sm cursor-pointer">
                      <option>{t.settings.everyone}</option>
                      <option>{t.settings.followingOnly}</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm mb-4">
                {t.settings.notificationsDesc}
              </p>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-purple-500/10 cursor-pointer">
                  <span className="text-white font-medium">{t.settings.likesOnDreams}</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded cursor-pointer" />
                </label>
                <label className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-purple-500/10 cursor-pointer">
                  <span className="text-white font-medium">{t.settings.comments}</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded cursor-pointer" />
                </label>
                <label className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-purple-500/10 cursor-pointer">
                  <span className="text-white font-medium">{t.settings.newFollowers}</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded cursor-pointer" />
                </label>
                <label className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-purple-500/10 cursor-pointer">
                  <span className="text-white font-medium">{t.settings.directMessages}</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded cursor-pointer" />
                </label>
              </div>
            </div>
          )}

          {/* Developer Panel - Only visible to developers */}
          {isDeveloper && (
            <div className="mt-8 p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-2xl border border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Wrench className="text-red-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {language === 'tr' ? 'Geliştirici Paneli' : 'Developer Panel'}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {language === 'tr' ? 'Sadece developer yetkisine sahip kullanıcılar görebilir' : 'Only visible to users with developer privileges'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Maintenance Mode Toggle */}
                <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {language === 'tr' ? 'Bakım Modu' : 'Maintenance Mode'}
                        </span>
                        {maintenanceMode && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            {language === 'tr' ? 'AKTİF' : 'ACTIVE'}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        {language === 'tr' 
                          ? 'Aktif edildiğinde, developer olmayan tüm kullanıcılar siteye erişemez'
                          : 'When enabled, all non-developer users cannot access the site'}
                      </p>
                    </div>
                    <button
                      onClick={toggleMaintenanceMode}
                      disabled={togglingMaintenance}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        maintenanceMode
                          ? 'bg-green-600 hover:bg-green-500 text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      } disabled:opacity-50`}
                    >
                      {togglingMaintenance ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : maintenanceMode ? (
                        language === 'tr' ? 'Bakımdan Çıkar' : 'End Maintenance'
                      ) : (
                        language === 'tr' ? 'Bakıma Al' : 'Start Maintenance'
                      )}
                    </button>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                  <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-yellow-200 text-sm">
                    {language === 'tr' 
                      ? 'DİKKAT: Bakım modu aktif edildiğinde, sadece Developer ünvanına sahip kullanıcılar siteye erişebilir. Diğer tüm kullanıcılar bakım sayfasını görecektir.'
                      : 'WARNING: When maintenance mode is enabled, only users with Developer title can access the site. All other users will see the maintenance page.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
