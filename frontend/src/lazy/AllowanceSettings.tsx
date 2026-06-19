// Lazy wrapper — self-contained page
// EnhancedScheduler is a tightly-coupled component; this page wraps it for standalone routing
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

export default function AllowanceSettingsPage() {
  const [children, setChildren] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [rate, setRate] = useState('10');
  const [currency, setCurrency] = useState('USD');
  const [goal, setGoal] = useState('0');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getChildren().then(r => {
      setChildren((r as unknown as User[]).filter(c => c.role === 'child'));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const selected = children.find(c => c.id === selectedChild);

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
      setMessage('✅ Allowance settings saved!');
    } catch {
      setMessage('❌ Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">💰 Allowance Settings</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">💰 Allowance Settings</h1>

      {/* Child Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Child
        </label>
        <select
          aria-label="Select child for allowance"
          value={selectedChild || ''}
          onChange={e => handleSelectChild(Number(e.target.value))}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">-- Choose child --</option>
          {children.map(c => (
            <option key={c.id} value={c.id}>
              {c.display_name} {c.age_tier ? `(Tier ${c.age_tier})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stars per {currency}
            </label>
            <input
              type="number"
              aria-label="Allowance rate"
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              aria-label="Currency"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="ILS">ILS (₪)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Savings Goal ({currency})
            </label>
            <input
              type="number"
              aria-label="Savings goal"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              min="0"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            aria-label="Save allowance settings"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {message && (
            <p className="text-sm mt-2" role="status" aria-live="polite">{message}</p>
          )}
        </div>
      )}

      {!selected && children.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">👆</div>
          <p>Select a child above to configure their allowance settings</p>
        </div>
      )}

      {children.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <p className="text-xl font-bold text-gray-400 mb-2">No children yet</p>
          <p>Add children first from the main dashboard to configure allowance</p>
        </div>
      )}
    </div>
  );
}
