import { useState, useEffect } from 'react';
import { BookOpen, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { useLanguage } from '../lib/i18n';
import { supabase } from '../lib/supabase';

interface Dream {
  id: string;
  dream_text: string;
  analysis_text: string;
  image_url: string;
  created_at: string;
  status: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    loadDreams();
  }, [user, navigate]);

  const loadDreams = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const allDreams = data || [];
      setDreams(allDreams);

      const completed = allDreams.filter((d) => d.status === 'completed').length;
      const pending = allDreams.filter((d) => d.status === 'pending').length;

      // Get total count
      const { count } = await supabase
        .from('dreams')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        total: count || 0,
        completed,
        pending,
      });
    } catch (error) {
      console.error('Error loading dreams:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const locale = language === 'tr' ? 'tr-TR' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen relative pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto z-10">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            {t.dashboard.title}
          </h1>
          <p className="text-slate-400 text-lg">
            {t.dashboard.subtitle}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <BookOpen className="text-purple-400" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.total}</h3>
            <p className="text-slate-400 text-sm">{t.dashboard.totalDreams}</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-pink-500/20 rounded-xl p-6 hover:border-pink-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <Sparkles className="text-pink-400" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.completed}</h3>
            <p className="text-slate-400 text-sm">{t.dashboard.completedAnalyses}</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="text-cyan-400" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.pending}</h3>
            <p className="text-slate-400 text-sm">{t.dashboard.pendingAnalyses}</p>
          </div>
        </div>

        {/* Recent Dreams */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">{t.dashboard.recentDreams}</h2>
            <button
              onClick={() => navigate('/library')}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
            >
              {t.dashboard.viewAll}
            </button>
          </div>

          {dreams.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto mb-4 text-slate-600" size={48} />
              <p className="text-slate-400 mb-4">{t.dashboard.noDreams}</p>
              <button
                onClick={() => navigate('/analyze')}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all"
              >
                {t.dashboard.analyzeFirstDream}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {dreams.map((dream) => (
                <div
                  key={dream.id}
                  onClick={() => navigate('/library')}
                  className="bg-slate-950/30 rounded-lg p-4 hover:bg-slate-950/50 transition-all cursor-pointer border border-transparent hover:border-purple-500/20"
                >
                  <div className="flex items-start gap-4">
                    {dream.image_url && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={dream.image_url}
                          alt="Dream visualization"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                        <Calendar size={12} />
                        {formatDate(dream.created_at)}
                      </div>
                      <p className="text-slate-300 text-sm line-clamp-2 mb-2">
                        {dream.dream_text}
                      </p>
                      {dream.status === 'pending' && (
                        <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                          {t.social.pending}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

