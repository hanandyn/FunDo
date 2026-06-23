import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as audio from '../../lib/audio';
import type { NotificationPreferences } from '../../lib/types';

const DEFAULT_PREFS: NotificationPreferences = {
  task_complete: true,
  level_up: true,
  achievement: true,
  streak_risk: true,
  leaderboard: true,
  cheer_received: true,
  family_goal: true,
  sounds: true,
  voice_narration: true,
  toasts: true,
};

export function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem('fundo_notification_prefs');
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  useEffect(() => {
    localStorage.setItem('fundo_notification_prefs', JSON.stringify(prefs));
    audio.setMuted(!prefs.sounds);
    audio.setVoiceEnabled(prefs.voice_narration);
  }, [prefs]);

  const toggle = (key: keyof NotificationPreferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    audio.playButtonClick();
  };

  const items: Array<{ key: keyof NotificationPreferences; label: string; icon: string; description: string }> = [
    { key: 'task_complete', label: 'Task Completed', icon: '✅', description: 'When a task is finished' },
    { key: 'level_up', label: 'Level Up', icon: '⬆️', description: 'When you gain a new level' },
    { key: 'achievement', label: 'Achievements', icon: '🏆', description: 'When you earn a new badge' },
    { key: 'streak_risk', label: 'Streak at Risk', icon: '⚠️', description: 'When your streak might break' },
    { key: 'leaderboard', label: 'Leaderboard', icon: '📊', description: 'Ranking changes' },
    { key: 'cheer_received', label: 'Cheers', icon: '👏', description: 'When siblings cheer you on' },
    { key: 'family_goal', label: 'Family Goals', icon: '🎯', description: 'Family goal updates' },
    { key: 'sounds', label: 'Sound Effects', icon: '🔊', description: 'Play sounds for actions' },
    { key: 'voice_narration', label: 'Voice Narration', icon: '🎤', description: 'Spoken encouragement and tips' },
    { key: 'toasts', label: 'Popup Notifications', icon: '💬', description: 'Show toast popups' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-white mb-1">🔔 Notification Preferences</h3>
      <p className="text-sm text-gray-400 mb-4">Choose which notifications and sounds you&apos;d like</p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.button
            key={item.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => toggle(item.key)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all ${
              prefs[item.key]
                ? 'bg-white/10 border border-white/20'
                : 'bg-white/3 border border-white/5 opacity-60'
            }`}
          >
            <span className="text-2xl flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">{item.label}</p>
              <p className="text-white/50 text-xs">{item.description}</p>
            </div>
            <div
              className={`w-12 h-7 rounded-full flex-shrink-0 transition-all relative ${
                prefs[item.key] ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white absolute top-1 shadow"
                animate={{ left: prefs[item.key] ? 25 : 3 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
