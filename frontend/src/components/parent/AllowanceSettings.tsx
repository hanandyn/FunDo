import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import type { User } from '../../lib/types';

interface AllowanceSettingsProps {
  children: User[];
  onSaved?: () => void;
}

export function AllowanceSettings({ children, onSaved }: AllowanceSettingsProps) {
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [rate, setRate] = useState('10');
  const [currency, setCurrency] = useState('USD');
  const [goal, setGoal] = useState('0');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selected = children.find(c => c.id === selectedChild);

  // Pre-fill when selecting a child
  const handleSelectChild = (childId: number) => {
    setSelectedChild(childId);
    const child = children.find(c => c.id === childId);
    if (child) {
      setRate(String(child.allowance_rate || '10'));
      setCurrency(child.allowance_currency || 'USD');
      setGoal(String(child.savings_goal || '0'));
    }
  };

  const handleSave = async () => {
    if (!selectedChild) return;
    setSaving(true);
    try {
      await api.updateAllowanceSettings({
        child_id: selectedChild,
        allowance_rate: parseInt(rate) || 0,
        allowance_currency: currency,
        savings_goal: parseInt(goal) || 0,
      });
      setMessage('Allowance settings saved! ✅');
      setTimeout(() => setMessage(''), 3000);
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">💰 Allowance Settings</h3>
      <p className="text-sm text-gray-400">Link stars to real-world money for teens (ages 13+)</p>

      {/* Child selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Select Child</label>
        <div className="grid grid-cols-2 gap-2">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => handleSelectChild(child.id)}
              className={`p-3 rounded-xl text-left transition-all ${
                selectedChild === child.id
                  ? 'bg-blue-500/30 border-2 border-blue-400'
                  : 'bg-white/5 border-2 border-white/10 hover:bg-white/10'
              }`}
            >
              <p className="text-white font-medium">{child.display_name}</p>
              <p className="text-white/50 text-xs">⭐ {child.stars} • Tier {child.age_tier}</p>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
          {/* Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Stars per currency unit (rate)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              How many stars = 1 unit of currency? (e.g., 10 stars = $1)
            </p>
            <input
              type="number"
              min="1"
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 rounded-xl border border-white/10 text-white focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Currency</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 rounded-xl border border-white/10 text-white focus:outline-none focus:border-blue-400"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="ILS">ILS (₪)</option>
              <option value="AUD">AUD ($)</option>
              <option value="CAD">CAD ($)</option>
            </select>
          </div>

          {/* Savings Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Savings Goal ({currency})</label>
            <p className="text-xs text-gray-500 mb-2">Optional target amount for the child to save toward</p>
            <input
              type="number"
              min="0"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 rounded-xl border border-white/10 text-white focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Preview */}
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <p className="text-xs text-blue-300 font-medium mb-1">Preview</p>
            <p className="text-white text-sm">
              {parseInt(rate) > 0
                ? `${selected.stars} stars ÷ ${rate} = ${(selected.stars / parseInt(rate)).toFixed(2)} ${currency}`
                : 'Allowance disabled (rate = 0)'}
            </p>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-bold transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Save Allowance for ${selected.display_name}`}
          </button>

          {/* Message */}
          {message && (
            <p className="text-center text-sm text-green-400">{message}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
