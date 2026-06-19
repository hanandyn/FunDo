import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import type { AllowanceStatus } from '../../lib/types';

export function AllowanceTracker() {
  const [status, setStatus] = useState<AllowanceStatus | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [setting, setSetting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await api.getAllowanceStatus();
      setStatus(data as unknown as AllowanceStatus);
    } catch { /* ignore */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleSetGoal = async () => {
    if (!goalInput || isNaN(Number(goalInput))) return;
    setSetting(true);
    try {
      await api.setSavingsGoal(Number(goalInput));
      loadStatus();
    } catch { /* ignore */ }
    setSetting(false);
  };

  if (!status?.enabled) {
    return (
      <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-white/70 font-medium">Allowance not set up</p>
        <p className="text-white/50 text-sm mt-1">A parent needs to enable this</p>
      </div>
    );
  }

  const progress = status.progress_percent;
  const symbol = status.currency === 'ILS' ? '₪' : '$';

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 backdrop-blur rounded-2xl p-6 border border-green-500/20">
        <p className="text-green-300 text-sm font-medium mb-1">Your Balance</p>
        <motion.p
          className="text-5xl font-bold text-white"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {symbol}{status.allowance_amount.toFixed(2)}
        </motion.p>
        <p className="text-green-400/60 text-xs mt-2">
          {status.stars} stars ÷ {status.allowance_rate} rate
        </p>
      </div>

      {/* Savings goal jar visualization */}
      {status.savings_goal > 0 && (
        <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
          <div className="flex justify-between items-center mb-3">
            <p className="text-white font-medium">Savings Goal</p>
            <p className="text-white/70 text-sm">
              {symbol}{status.allowance_amount.toFixed(2)} / {symbol}{status.savings_goal}
            </p>
          </div>

          {/* Jar visualization */}
          <div className="relative h-40 w-28 mx-auto mb-3">
            {/* Jar outline */}
            <div className="absolute inset-0 border-2 border-white/20 rounded-b-3xl rounded-t-lg overflow-hidden">
              {/* Fill level */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500 to-blue-400"
                initial={{ height: 0 }}
                animate={{ height: `${Math.min(100, progress)}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
              {/* Shine */}
              <div className="absolute top-0 bottom-0 left-2 w-3 bg-white/10 rounded-full" />
            </div>
            {/* Stars floating in jar */}
            <motion.div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 text-2xl"
              animate={{ y: [0, -5, 0], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              💰
            </motion.div>
          </div>

          <p className="text-center text-white font-bold" style={{
            color: progress >= 100 ? '#4ade80' : '#fff',
          }}>
            {progress >= 100 ? '🎉 Goal Reached!' : `${Math.round(progress)}% complete`}
          </p>
        </div>
      )}

      {/* Set goal */}
      <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10">
        <p className="text-white font-medium mb-3">Set Savings Goal</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">{symbol}</span>
            <input
              type="number"
              min="0"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder="Amount"
              className="w-full pl-7 pr-3 py-2.5 bg-white/10 rounded-xl border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>
          <button
            onClick={handleSetGoal}
            disabled={setting}
            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white font-medium transition-all disabled:opacity-50"
          >
            {setting ? '...' : 'Set'}
          </button>
        </div>
      </div>
    </div>
  );
}
