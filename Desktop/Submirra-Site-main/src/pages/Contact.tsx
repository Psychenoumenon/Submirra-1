import { Mail, Send, CheckCircle, AlertCircle, MessageCircle, AtSign, User, FileText, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from '../components/Router';
import { supabase } from '../lib/supabase';
import emailjs from '@emailjs/browser';

export default function Contact() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  
  const SUBMIRRA_USER_ID = 'ded2c1c6-7064-499f-a1e7-a8f90c95904a';
  const EMAILJS_PUBLIC_KEY = 'AdvA9XekMYHYYOhcF';
  
  // Initialize EmailJS on component mount
  useEffect(() => {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      // EmailJS ile gerçek email gönderme
      const templateParams = {
        name: formData.name,
        email: formData.email,
        time: new Date().toLocaleString('tr-TR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        message: `${formData.subject ? `Konu: ${formData.subject}\n\n` : ''}${formData.message}`,
      };

      const serviceId = 'service_6btsv5d';
      const templateId = 'template_x7aji5u';

      try {
        console.log('📧 EmailJS Gönderiliyor...', {
          serviceId,
          templateId,
          publicKey: EMAILJS_PUBLIC_KEY,
          templateParams
        });
        
        const result = await emailjs.send(serviceId, templateId, templateParams);
        console.log('✅ EmailJS Başarılı:', result);
        
        // Mesajı Submirra'nın ana hesabına site içi mesajlaşma sistemine kaydet
        if (user) {
          try {
            const messageText = `📧 Contact Form Mesajı\n\nİsim: ${formData.name}\nEmail: ${formData.email}\nKonu: ${formData.subject}\n\nMesaj:\n${formData.message}`;
            
            const { error: messageError } = await supabase
              .from('messages')
              .insert({
                sender_id: user.id,
                receiver_id: SUBMIRRA_USER_ID,
                message_text: messageText,
              });
            
            if (messageError) {
              console.error('❌ Mesaj kaydetme hatası:', messageError);
            } else {
              console.log('✅ Mesaj site içi mesajlaşma sistemine kaydedildi');
            }
          } catch (messageError) {
            console.error('❌ Mesaj kaydetme hatası:', messageError);
          }
        }
        
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        showToast('Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.', 'success');
        setTimeout(() => setSubmitted(false), 5000);
        
      } catch (emailError: any) {
        console.error('❌ EmailJS Hatası:', emailError);
        
        let errorMessage = 'Email gönderilirken bir hata oluştu.';
        if (emailError?.text) {
          errorMessage = `Email hatası: ${emailError.text}`;
        } else if (emailError?.message) {
          errorMessage = `Email hatası: ${emailError.message}`;
        } else if (typeof emailError === 'string') {
          errorMessage = `Email hatası: ${emailError}`;
        }
        
        if (emailError?.status === 400) {
          let detailedError = 'Template parametreleri hatalı olabilir.';
          if (emailError?.text) {
            detailedError = emailError.text;
          } else if (emailError?.message) {
            detailedError = emailError.message;
          } else if (emailError?.response?.text) {
            detailedError = emailError.response.text;
          }
          showToast(`EmailJS hatası: ${detailedError}`, 'error');
        } else {
          showToast(errorMessage, 'error');
        }
      }
      
    } catch (error) {
      console.error('Form gönderme hatası:', error);
      showToast('Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen relative pt-24 pb-16 px-4 overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-float animation-delay-4000"></div>
      </div>

      <div className="relative max-w-6xl mx-auto z-10">
        {/* Enhanced Header */}
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
            {t.contact.title}
          </h1>
          <p className="text-slate-400 text-base md:text-lg px-2">
            {t.contact.subtitle}
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 animate-fade-in-delay">
          {/* Email Support */}
          <div className="group bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-xl border border-pink-500/30 rounded-3xl p-8 shadow-2xl shadow-pink-500/10 hover:shadow-pink-500/20 transition-all duration-500 hover:border-pink-500/50 hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-pink-500/20 to-pink-600/20 rounded-2xl border border-pink-500/30 flex-shrink-0 shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform duration-300">
                <Mail className="text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{t.contact.emailSupport}</h3>
                <p className="text-slate-400 text-sm">Direct email support</p>
              </div>
            </div>
            <a 
              href="mailto:submirra.ai@gmail.com"
              className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors duration-300 font-medium group/link"
            >
              <AtSign size={18} className="group-hover/link:scale-110 transition-transform duration-300" />
              <span className="break-all">submirra.ai@gmail.com</span>
            </a>
          </div>
          
          {/* Message via Website */}
          <button
            onClick={() => {
              if (!user) {
                showToast(t.contact.pleaseSignInToMessage, 'info');
                navigate('/signin');
                return;
              }
              navigate('/messages?user=ded2c1c6-7064-499f-a1e7-a8f90c95904a');
            }}
            className="group bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500 hover:border-purple-500/50 hover:-translate-y-1 text-left"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl border border-purple-500/30 flex-shrink-0 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                <MessageCircle className="text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{t.contact.messageSubmirra}</h3>
                <p className="text-slate-400 text-sm">{t.contact.viaWebsite}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300 transition-colors duration-300 font-medium">
              <span>Open Messages</span>
              <Send size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </button>
        </div>

        {/* Contact Form */}
        <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-8 md:p-10 shadow-2xl shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-500 animate-fade-in-delay-2">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-xl border border-cyan-500/30 flex-shrink-0 shadow-lg shadow-cyan-500/20">
              <FileText className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" size={24} />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {t.contact.sendMessage}
            </h2>
          </div>

          {submitted && (
            <div className="mb-6 p-5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-xl flex items-center gap-3 animate-fade-in">
              <CheckCircle className="text-green-400 flex-shrink-0" size={24} />
              <p className="text-green-400 font-medium">{t.contact.thankYou}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="group">
                <label className="flex items-center gap-2 text-slate-300 font-medium mb-3 text-sm md:text-base">
                  <User size={18} className="text-pink-400" />
                  {t.contact.name}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-950/70 border-2 border-purple-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/30 transition-all text-sm md:text-base shadow-lg shadow-purple-500/5 group-hover:shadow-purple-500/10"
                  placeholder={t.contact.namePlaceholder}
                  required
                />
              </div>

              {/* Email Field */}
              <div className="group">
                <label className="flex items-center gap-2 text-slate-300 font-medium mb-3 text-sm md:text-base">
                  <Mail size={18} className="text-pink-400" />
                  {t.contact.email}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-950/70 border-2 border-purple-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/30 transition-all text-sm md:text-base shadow-lg shadow-purple-500/5 group-hover:shadow-purple-500/10"
                  placeholder={t.contact.emailPlaceholder}
                  required
                />
              </div>
            </div>

            {/* Subject Field */}
            <div className="group">
              <label className="flex items-center gap-2 text-slate-300 font-medium mb-3 text-sm md:text-base">
                <FileText size={18} className="text-pink-400" />
                {t.contact.subject}
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-950/70 border-2 border-purple-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/30 transition-all text-sm md:text-base shadow-lg shadow-purple-500/5 group-hover:shadow-purple-500/10"
                placeholder={t.contact.subjectPlaceholder}
                required
              />
            </div>

            {/* Message Field */}
            <div className="group">
              <label className="flex items-center gap-2 text-slate-300 font-medium mb-3 text-sm md:text-base">
                <MessageSquare size={18} className="text-pink-400" />
                {t.contact.message}
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full min-h-[160px] px-5 py-3.5 bg-slate-950/70 border-2 border-purple-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/30 transition-all resize-none text-sm md:text-base leading-relaxed shadow-lg shadow-purple-500/5 group-hover:shadow-purple-500/10"
                placeholder={t.contact.messagePlaceholder}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={sending}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 text-white font-semibold hover:from-pink-500 hover:via-purple-500 hover:to-pink-500 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/40 flex items-center justify-center gap-3 text-base disabled:opacity-50 disabled:cursor-not-allowed bg-[length:200%_auto] animate-gradient"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <>
                  <Send size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                  <span>{t.contact.send}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
