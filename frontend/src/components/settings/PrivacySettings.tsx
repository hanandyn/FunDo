import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';

/**
 * PrivacySettings — GDPR data privacy controls.
 *
 * Features:
 * - Data export (download all user data as JSON)
 * - Account deletion (GDPR right to erasure)
 * - Data summary display
 */
export function PrivacySettings() {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const data = await api.exportUserData() as Record<string, unknown>;
      // Create downloadable blob
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fundo-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: t('privacy.exportSuccess') });
    } catch {
      setMessage({ type: 'error', text: t('privacy.exportError') });
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setMessage(null);
    try {
      await api.deleteAccount();
      setMessage({ type: 'success', text: t('privacy.deleteSuccess') });
      // Log out after a delay
      setTimeout(() => {
        localStorage.removeItem('token');
        window.location.href = '/';
      }, 2000);
    } catch {
      setMessage({ type: 'error', text: t('general.error') });
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">🔒 {t('privacy.title')}</h2>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3 rounded-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Summary */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 {t('privacy.dataSummary')}</h3>
        <p className="text-sm text-blue-700 leading-relaxed">
          {t('privacy.storedData')}
        </p>
      </div>

      {/* Export Data */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">📥 {t('privacy.exportData')}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t('privacy.exportDesc')}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-4 px-6 py-2.5 bg-quest-blue text-white font-medium rounded-xl
                     hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all flex items-center gap-2"
        >
          {exporting ? (
            <>
              <span className="animate-spin">⏳</span> {t('privacy.exporting')}
            </>
          ) : (
            t('privacy.exportBtn')
          )}
        </button>
      </div>

      {/* Delete Account */}
      <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-700 mb-1">⚠️ {t('privacy.deleteAccount')}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t('privacy.deleteDesc')}
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 px-6 py-2.5 bg-red-600 text-white font-medium rounded-xl
                       hover:bg-red-700 transition-all"
          >
            {t('privacy.deleteBtn')}
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200"
          >
            <p className="text-sm text-red-700 font-medium mb-3">
              {t('privacy.deleteConfirm')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg
                           hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {deleting ? (
                  <span className="flex items-center gap-1">
                    <span className="animate-spin">⏳</span> {t('privacy.deleting')}
                  </span>
                ) : (
                  t('privacy.deleteBtn')
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg
                           hover:bg-gray-300 transition-all"
              >
                {t('general.cancel')}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default PrivacySettings;
