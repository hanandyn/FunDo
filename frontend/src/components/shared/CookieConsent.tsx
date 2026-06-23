import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const COOKIE_CONSENT_KEY = 'fundo_cookie_consent';

/**
 * CookieConsentBanner — minimal GDPR cookie consent banner.
 * Only essential cookies are used (auth token, language preference).
 * No third-party tracking. Shows once until accepted.
 */
export function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => !localStorage.getItem(COOKIE_CONSENT_KEY));

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 shadow-2xl p-4"
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                🍪 {t('privacy.cookiesTitle')}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('privacy.cookiesDesc')}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={accept}
                className="px-5 py-2 bg-quest-blue text-white text-sm font-medium rounded-xl
                           hover:bg-blue-600 transition-colors"
              >
                {t('privacy.accept')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CookieConsentBanner;
