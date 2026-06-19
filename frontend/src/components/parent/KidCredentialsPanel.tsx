import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import type { User } from '../../lib/types';

/**
 * Panel showing kid login credentials to the parent.
 * Lets the parent view usernames and reset passwords.
 */
export function KidCredentialsPanel({ children }: { children: User[] }) {
  const { t } = useTranslation();
  const [showCreds, setShowCreds] = useState(false);
  const [resetChildId, setResetChildId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetChildId) return;
    try {
      await api.resetChildPassword(resetChildId, newPassword);
      setMessage(`✅ Password updated for ${children.find(c => c.id === resetChildId)?.display_name}`);
      setResetChildId(null);
      setNewPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: unknown) {
      setMessage(`❌ ${err instanceof Error ? err.message : 'Failed'}`);
    }
  };

  return (
    <div className="mt-4 bg-blue-50 border-2 border-blue-100 rounded-2xl p-4">
      <button
        onClick={() => setShowCreds(!showCreds)}
        className="w-full flex items-center justify-between text-left focus-ring"
        aria-expanded={showCreds}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔑</span>
          <span className="font-bold text-quest-dark">
            {t('parent.kidLogins', 'Kid Login Info')}
          </span>
        </div>
        <span className="text-gray-400">{showCreds ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {showCreds && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-gray-500 mt-3 mb-3">
              {t('parent.kidLoginsDesc', "Share these with your kids so they can log in. They'll use the Kid login page with these credentials.")}
            </p>
            <div className="space-y-2">
              {children.map(child => (
                <div key={child.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {child.age_tier === 1 ? '🐣' : child.age_tier === 2 ? '🌟' : child.age_tier === 3 ? '🦊' : child.age_tier === 4 ? '⚔️' : '👑'}
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">{child.display_name}</p>
                      <p className="text-sm text-gray-500">
                        {t('auth.kidUsername', 'Username')}: <span className="font-mono font-bold text-quest-blue select-all">{child.username}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setResetChildId(child.id); setNewPassword(''); }}
                    className="text-sm px-3 py-1.5 bg-quest-purple/10 text-quest-purple rounded-lg hover:bg-quest-purple/20 transition-colors focus-ring"
                  >
                    🔑 {t('parent.resetPassword', 'Reset Password')}
                  </button>
                </div>
              ))}
            </div>

            {message && (
              <div className="mt-3 text-sm bg-white rounded-xl p-3 border border-gray-100">
                {message}
              </div>
            )}

            {/* Reset Password Modal */}
            {resetChildId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="card-quest w-full max-w-md m-4">
                  <h3 className="text-xl font-bold mb-2">
                    {t('parent.resetPasswordFor', 'Reset Password')}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('parent.resetPasswordDesc', 'Choose a new password for')}{' '}
                    <strong>{children.find(c => c.id === resetChildId)?.display_name}</strong>
                  </p>
                  <form onSubmit={handleResetPassword} className="space-y-3">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder={t('auth.newPassword', 'New password')}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-quest-blue outline-none"
                      required
                      minLength={8}
                      autoFocus
                    />
                    <p className="text-xs text-gray-400">
                      {t('auth.passwordRules', 'Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number')}
                    </p>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-primary flex-1">
                        {t('parent.updatePassword', 'Update')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setResetChildId(null); setNewPassword(''); }}
                        className="btn-quest bg-gray-200 flex-1"
                      >
                        {t('common.cancel', 'Cancel')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}