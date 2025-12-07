import { useLanguage } from '../lib/i18n';
import { useNavigate } from '../components/Router';

export default function PrivacyPolicy() {
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
            {t.privacy.title}
          </h1>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-6 md:p-8 space-y-6 md:space-y-8 animate-fade-in-delay">
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.introductionTitle}</h2>
            <p className="text-slate-300 leading-relaxed">{t.privacy.introductionText}</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.dataCollectionTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-4">{t.privacy.dataCollectionText}</p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>{t.privacy.dataCollectionItem1}</li>
              <li>{t.privacy.dataCollectionItem2}</li>
              <li>{t.privacy.dataCollectionItem3}</li>
              <li>{t.privacy.dataCollectionItem4}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.dataUsageTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-4">{t.privacy.dataUsageText}</p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>{t.privacy.dataUsageItem1}</li>
              <li>{t.privacy.dataUsageItem2}</li>
              <li>{t.privacy.dataUsageItem3}</li>
              <li>{t.privacy.dataUsageItem4}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.dataStorageTitle}</h2>
            <p className="text-slate-300 leading-relaxed">{t.privacy.dataStorageText}</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.dataSecurityTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-4">{t.privacy.dataSecurityText}</p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>{t.privacy.dataSecurityItem1}</li>
              <li>{t.privacy.dataSecurityItem2}</li>
              <li>{t.privacy.dataSecurityItem3}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.userRightsTitle}</h2>
            <p className="text-slate-300 leading-relaxed mb-4">{t.privacy.userRightsText}</p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
              <li>{t.privacy.userRightsItem1}</li>
              <li>{t.privacy.userRightsItem2}</li>
              <li>{t.privacy.userRightsItem3}</li>
              <li>{t.privacy.userRightsItem4}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.cookiesTitle}</h2>
            <p className="text-slate-300 leading-relaxed">{t.privacy.cookiesText}</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.thirdPartyTitle}</h2>
            <p className="text-slate-300 leading-relaxed">{t.privacy.thirdPartyText}</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.changesTitle}</h2>
            <p className="text-slate-300 leading-relaxed">{t.privacy.changesText}</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{t.privacy.contactTitle}</h2>
            <p className="text-slate-300 leading-relaxed">
              {t.privacy.contactText}{' '}
              <button
                onClick={() => navigate('/contact')}
                className="text-purple-400 hover:text-purple-300 transition-colors underline"
              >
                {t.privacy.contactLink}
              </button>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

