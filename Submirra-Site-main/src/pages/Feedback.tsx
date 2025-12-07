import { useState, useEffect } from 'react';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/ToastContext';
import emailjs from '@emailjs/browser';

export default function Feedback() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState<'bug' | 'feature' | 'improvement' | 'other'>('other');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const EMAILJS_PUBLIC_KEY = 'AdvA9XekMYHYYOhcF';
  
  // Initialize EmailJS on component mount
  useEffect(() => {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) {
      showToast(t.feedback.emptyError, 'error');
      return;
    }

    setSubmitting(true);

    try {
      // Save to database
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user?.id || null,
          category,
          message: feedback.trim(),
          user_email: user?.email || null,
        });

      if (error) throw error;

      // Send email notification
      try {
        // Template'de tanımlı olan parametreleri kullan: {{name}}, {{email}}, {{time}}, {{message}}
        const templateParams = {
          name: user?.email || 'Anonymous User',
          email: user?.email || 'no-reply@submirra.ai',
          time: new Date().toLocaleString('tr-TR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          message: `Kategori: ${category}\n\n${feedback.trim()}`,
        };

        const serviceId = 'service_6btsv5d';
        const templateId = 'template_x7aji5u'; // Aynı template'i kullan (veya Feedback için ayrı template oluştur)

        await emailjs.send(serviceId, templateId, templateParams);
        console.log('✅ Feedback email sent successfully');
        
        // Mesajı Submirra'nın ana hesabına site içi mesajlaşma sistemine kaydet
        if (user) {
          try {
            const SUBMIRRA_USER_ID = 'ded2c1c6-7064-499f-a1e7-a8f90c95904a';
            const messageText = `💬 Feedback: ${category}\n\nKullanıcı: ${user.email || 'Anonymous'}\nKategori: ${category}\n\nMesaj:\n${feedback.trim()}`;
            
            const { error: messageError } = await supabase
              .from('messages')
              .insert({
                sender_id: user.id,
                receiver_id: SUBMIRRA_USER_ID,
                message_text: messageText,
              });
            
            if (messageError) {
              console.error('❌ Feedback mesaj kaydetme hatası:', messageError);
              // Email gönderildi ama mesaj kaydedilemedi, yine de başarılı say
            } else {
              console.log('✅ Feedback mesajı site içi mesajlaşma sistemine kaydedildi');
            }
          } catch (messageError) {
            console.error('❌ Feedback mesaj kaydetme hatası:', messageError);
            // Email gönderildi ama mesaj kaydedilemedi, yine de başarılı say
          }
        }
      } catch (emailError) {
        console.error('❌ EmailJS Error (feedback):', emailError);
        // Don't fail the submission if email fails
      }

      setSubmitted(true);
      setFeedback('');
      showToast(t.feedback.successMessage, 'success');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      showToast(t.feedback.errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-2xl mx-auto z-10">
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
            {t.feedback.title}
          </h1>
          <p className="text-slate-400 text-base md:text-lg px-2">
            {t.feedback.subtitle}
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 md:p-8 hover:border-purple-500/30 transition-all duration-300 animate-fade-in-delay">
          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold text-white mb-2">{t.feedback.thankYou}</h3>
              <p className="text-slate-400">{t.feedback.thankYouMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-2">
                  {t.feedback.categoryLabel}
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                >
                  <option value="bug">{t.feedback.categoryBug}</option>
                  <option value="feature">{t.feedback.categoryFeature}</option>
                  <option value="improvement">{t.feedback.categoryImprovement}</option>
                  <option value="other">{t.feedback.categoryOther}</option>
                </select>
              </div>

              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-slate-300 mb-2">
                  {t.feedback.messageLabel}
                </label>
                <textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={8}
                  placeholder={t.feedback.placeholder}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !feedback.trim()}
                className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>{t.feedback.submitting}</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>{t.feedback.submitButton}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>{t.feedback.privacyNote}</p>
        </div>
      </div>
    </div>
  );
}

