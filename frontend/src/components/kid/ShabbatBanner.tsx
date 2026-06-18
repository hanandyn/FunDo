import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { ShabbatStatus } from '../../lib/types';

export function ShabbatBanner() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ShabbatStatus | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const s = await api.getShabbatStatus();
        setStatus(s as unknown as ShabbatStatus);
      } catch { /* ignore */ }
    };
    check();
    const interval = setInterval(check, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  if (!status?.active) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="shabbat-banner"
        role="banner"
        aria-label={t('settings.shabbatActive')}
      >
        <div className="flex items-center justify-center gap-3">
          <span className="star text-2xl">✡️</span>
          <span className="text-xl font-bold">{t('settings.shabbatGreeting')}</span>
          <span className="star text-2xl">✡️</span>
        </div>
        {status.ends_in_minutes != null && (
          <p className="text-sm mt-1 opacity-75">
            {t('settings.shabbatEndsIn')}:{' '}
            {Math.floor(status.ends_in_minutes / 60)}h {status.ends_in_minutes % 60}m
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
