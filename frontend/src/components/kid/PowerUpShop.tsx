import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { PowerUp, PowerUpPurchase } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';

export function PowerUpShop() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [powerups, setPowerups] = useState<PowerUp[]>([]);
  const [active, setActive] = useState<PowerUpPurchase[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'info'>('info');

  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([
        api.getPowerUps(),
        api.getActivePowerUps(),
      ]);
      setPowerups(p as unknown as PowerUp[]);
      setActive(a as unknown as PowerUpPurchase[]);
    } catch { /* ignore */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const showMsg = (msg: string, type: 'success' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handlePurchase = async (pu: PowerUp) => {
    if (!user || user.gems < pu.cost_gems) {
      showMsg(t('powerups.notEnough'), 'info');
      return;
    }
    try {
      await api.purchasePowerUp(pu.id);
      showMsg(`🎉 ${pu.name} ${t('shop.redeem').toLowerCase()}!`, 'success');
      load();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : t('general.error'), 'info');
    }
  };

  const effectLabel = (type: string) => {
    const key = `powerups.effects.${type}` as string;
    return t(key);
  };

  const descLabel = (type: string) => {
    const key = `powerups.descriptions.${type}` as string;
    return t(key);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        ⚡ {t('powerups.shop')}
        <span className="text-base font-normal text-gray-500">
          (💎 {user?.gems || 0})
        </span>
      </h2>

      {/* Active power-ups */}
      {active.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            🟢 {t('powerups.active')}
          </h3>
          <div className="flex flex-wrap gap-3">
            {active.map(p => (
              <div key={p.id} className="bg-green-50 border-2 border-green-300 rounded-xl px-3 py-2 flex items-center gap-2 animate-pulse-glow">
                <span className="text-xl">{p.powerup_icon}</span>
                <span className="font-bold text-green-700">{p.powerup_name}</span>
                <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">{t('powerups.activeIndicator')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 px-4 py-2 rounded-xl text-sm font-bold ${
            messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Power-up cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {powerups.map(pu => (
          <motion.div
            key={pu.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.03 }}
            className={`card-kid bg-gradient-to-br from-cyan-50 to-purple-50 ${
              user && pu.cost_gems > user.gems ? 'opacity-50' : ''
            }`}
          >
            <div className="text-center">
              <div className="text-5xl mb-2">{pu.icon}</div>
              <h3 className="font-bold text-lg">{pu.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{descLabel(pu.effect_type)}</p>
              <div className="flex justify-center gap-2 mb-3">
                <span className="bg-cyan-100 px-3 py-1 rounded-full text-sm font-bold">
                  💎 {pu.cost_gems}
                </span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500">
                  {effectLabel(pu.effect_type)}
                </span>
              </div>
              {pu.max_per_week > 0 && (
                <p className="text-xs text-gray-400 mb-2">{pu.max_per_week}/week limit</p>
              )}
              <button
                onClick={() => handlePurchase(pu)}
                disabled={!!(user && pu.cost_gems > user.gems)}
                className="btn-purple w-full"
              >
                ⚡ {t('powerups.purchase')}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
