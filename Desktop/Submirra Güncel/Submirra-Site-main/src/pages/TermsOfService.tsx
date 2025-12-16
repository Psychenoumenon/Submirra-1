import { useLanguage } from '../lib/i18n';
import { useNavigate } from '../components/Router';

export default function TermsOfService() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 left-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto z-10">
        <div className="text-center mb-10 md:mb-16 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent py-2 leading-tight px-2">
            {t.terms.title}
          </h1>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 md:p-8 space-y-6 md:space-y-8 animate-fade-in-delay">
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.terms.acceptanceTitle}</h2>
            <p className="text-slate-300 leading-relaxed">{t.terms.acceptanceText}</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.terms.serviceTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-4">{t.terms.serviceText}</p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>{t.terms.serviceFeature1}</li>
              <li>{t.terms.serviceFeature2}</li>
              <li>{t.terms.serviceFeature3}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.terms.userAccountTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-4">{t.terms.userAccountText}</p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>{t.terms.userAccountFeature1}</li>
              <li>{t.terms.userAccountFeature2}</li>
              <li>{t.terms.userAccountFeature3}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.terms.contentTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-4">{t.terms.contentText}</p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>{t.terms.contentFeature1}</li>
              <li>{t.terms.contentFeature2}</li>
              <li>{t.terms.contentFeature3}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.terms.privacyTitle}</h2>
            <p className="text-slate-300 leading-relaxed">
              {t.terms.privacyText.includes('Privacy Policy') ? (
                <>
                  Your privacy is important to us. Please review our{' '}
                  <button
                    onClick={() => navigate('/privacy')}
                    className="text-purple-400 hover:text-purple-300 transition-colors underline"
                  >
                    Privacy Policy
                  </button>
                  , which also governs your use of the service, to understand our practices.
                </>
              ) : (
                <>
                  Gizliliğiniz bizim için önemlidir. Uygulamalarımızı anlamak için lütfen hizmetin kullanımınızı da yöneten{' '}
                  <button
                    onClick={() => navigate('/privacy')}
                    className="text-purple-400 hover:text-purple-300 transition-colors underline"
                  >
                    Gizlilik Politikamızı
                  </button>
                  {' '}inceleyin.
                </>
              )}
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.terms.paymentTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-4">{t.terms.paymentText}</p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>{t.terms.paymentFeature1}</li>
              <li>{t.terms.paymentFeature2}</li>
              <li>{t.terms.paymentFeature3}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.terms.terminationTitle}</h2>
            <p className="text-slate-300 leading-relaxed">{t.terms.terminationText}</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.terms.contactTitle}</h2>
            <p className="text-slate-300 leading-relaxed">
              {t.terms.contactText}{' '}
              <button
                onClick={() => navigate('/contact')}
                className="text-purple-400 hover:text-purple-300 transition-colors underline"
              >
                {t.terms.contactLink}
              </button>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

