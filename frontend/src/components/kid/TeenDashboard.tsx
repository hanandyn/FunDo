import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { TaskInstance, KidRecap } from '../../lib/types';

export function TeenDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [instances, setInstances] = useState<TaskInstance[]>([]);
  const [recap, setRecap] = useState<KidRecap | null>(null);
  const [activeView, setActiveView] = useState<'tasks' | 'calendar' | 'goals' | 'stats'>('tasks');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [inst, kidRecap] = await Promise.all([
        api.getInstances(),
        api.getKidRecap().catch(() => null),
      ]);
      setInstances(inst as unknown as TaskInstance[]);
      if (kidRecap) setRecap(kidRecap as unknown as KidRecap);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleComplete = async (instance: TaskInstance) => {
    try {
      await api.completeTask(instance.id, 0);
      setMessage(t('general.congratulations'));
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('general.error'));
    }
  };

  const pendingTasks = instances.filter(i => i.status === 'pending');
  const completedTasks = instances.filter(i => i.status === 'completed');

  // Calculate allowance mapping (configurable: 1 star = ?)
  const allowanceRate = 0.01; // 1 star = 1 cent, configurable
  const totalAllowance = ((user?.stars || 0) * allowanceRate).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Dark Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            {t('teen.title')}
          </h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">⭐ {user?.stars}</span>
            <span className="text-cyan-400">💎 {user?.gems}</span>
            <button onClick={logout} className="text-gray-500 hover:text-gray-300 ml-2">🚪</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('teen.tasksCompleted')}</p>
            <p className="text-2xl font-bold mt-1">{user?.total_tasks_completed || 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('teen.totalEarned')}</p>
            <p className="text-2xl font-bold mt-1">{user?.stars || 0} ⭐</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('profile.streak')}</p>
            <p className="text-2xl font-bold mt-1">🔥 {user?.current_streak || 0}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{t('teen.allowance')}</p>
            <p className="text-2xl font-bold mt-1">${totalAllowance}</p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-xl mb-4">
            {message}
          </div>
        )}

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          {(['tasks', 'calendar', 'goals', 'stats'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === view
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {view === 'tasks' ? '📋 Tasks' : view === 'calendar' ? '📅 Calendar' : view === 'goals' ? '🎯 Goals' : '📊 Stats'}
            </button>
          ))}
        </div>

        {/* Tasks View */}
        {activeView === 'tasks' && (
          <div>
            {pendingTasks.length === 0 && completedTasks.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-xl text-gray-500">{t('teen.noTasks')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map(inst => (
                  <motion.div
                    key={inst.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors"
                  >
                    <div>
                      <h3 className="font-medium">{inst.template?.name || 'Task'}</h3>
                      <p className="text-sm text-gray-500">{inst.template?.base_points} pts</p>
                    </div>
                    <button
                      onClick={() => handleComplete(inst)}
                      className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Complete
                    </button>
                  </motion.div>
                ))}
                {completedTasks.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm text-gray-500 mb-2 uppercase tracking-wider">Completed</h3>
                    {completedTasks.slice(0, 10).map(inst => (
                      <div key={inst.id} className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-3 flex items-center justify-between opacity-60">
                        <span className="line-through text-gray-500">{inst.template?.name}</span>
                        <span className="text-green-400 text-sm">+{inst.points_earned}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar View (simplified) */}
        {activeView === 'calendar' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">{t('teen.calendar')}</h2>
            <p className="text-gray-500">{t('teen.thisWeek')}</p>
            <div className="grid grid-cols-7 gap-1 mt-4">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
              ))}
              {Array.from({ length: 7 }, (_, i) => {
                const dayTasks = instances.filter(inst => {
                  if (!inst.date) return false;
                  const d = new Date(inst.date);
                  return d.getDay() === (i + 1) % 7; // approximate
                });
                return (
                  <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-sm border ${
                    dayTasks.length > 0
                      ? 'bg-cyan-900/30 border-cyan-800'
                      : 'bg-gray-800/30 border-gray-800'
                  }`}>
                    <div className="text-center">
                      <span>{dayTasks.length > 0 ? '📋' : ''}</span>
                      {dayTasks.length > 0 && <span className="block text-xs">{dayTasks.length}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Goals View */}
        {activeView === 'goals' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">{t('teen.goals')}</h2>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-2">{t('teen.completionRate')}</h3>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all"
                    style={{ width: `${recap?.completion_rate || 0}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">{recap?.completion_rate || 0}%</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-2">{t('teen.tasksCompleted')}</h3>
                <p className="text-2xl font-bold">{recap?.tasks_completed || 0} / {recap?.tasks_total || 0}</p>
              </div>
              {recap?.achievements_unlocked && recap.achievements_unlocked.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium mb-2">{t('recap.achievementsUnlocked')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {recap.achievements_unlocked.map((a, i) => (
                      <span key={i} className="bg-cyan-900/30 text-cyan-300 px-3 py-1 rounded-full text-sm">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats View */}
        {activeView === 'stats' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">{t('teen.monthlySummary')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">{t('teen.pointsEarned')}</p>
                <p className="text-xl font-bold">{recap?.points_earned || 0} ⭐</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">{t('recap.completionRate')}</p>
                <p className="text-xl font-bold">{recap?.completion_rate || 0}%</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">{t('profile.streak')}</p>
                <p className="text-xl font-bold">🔥 {recap?.streak_days || user?.current_streak || 0}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-400">{t('recap.familyRank')}</p>
                <p className="text-xl font-bold">#{recap?.family_rank || '?'} / {recap?.total_siblings || '?'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
