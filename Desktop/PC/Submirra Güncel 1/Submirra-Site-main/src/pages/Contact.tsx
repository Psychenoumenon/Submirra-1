import { Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../lib/i18n';

export default function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });

    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen relative pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto z-10">
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
            {t.contact.title}
          </h1>
          <p className="text-slate-400 text-base md:text-lg px-2">
            {t.contact.subtitle}
          </p>
        </div>

        <div className="flex justify-center mb-8 md:mb-12 animate-fade-in-delay">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-6 md:p-8 hover:border-pink-500/40 transition-all duration-500 md:hover:-translate-y-2 hover:shadow-xl hover:shadow-pink-500/10 max-w-md w-full">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center border border-pink-500/30 mb-3 md:mb-4 mx-auto">
              <Mail className="text-pink-400" size={24} />
            </div>
            <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 md:mb-3 text-center">{t.contact.emailSupport}</h3>
            <p className="text-slate-300 text-center text-base md:text-lg break-all">submirra.ai@gmail.com</p>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-5 md:p-8 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 animate-fade-in-delay-2">
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-5 md:mb-6">{t.contact.sendMessage}</h2>

          {submitted && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
              {t.contact.thankYou}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div>
                <label className="block text-slate-300 font-medium mb-2 text-sm md:text-base">
                  {t.contact.name}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                  placeholder={t.contact.namePlaceholder}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2 text-sm md:text-base">
                  {t.contact.email}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                  placeholder={t.contact.emailPlaceholder}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm md:text-base">
                {t.contact.subject}
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all text-sm md:text-base"
                placeholder={t.contact.subjectPlaceholder}
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2 text-sm md:text-base">
                {t.contact.message}
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full h-32 px-3 md:px-4 py-2.5 md:py-3 bg-slate-950/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none text-sm md:text-base"
                placeholder={t.contact.messagePlaceholder}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full px-5 md:px-6 py-3 md:py-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/30 flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <Send size={18} />
              {t.contact.send}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
