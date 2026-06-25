import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as audio from '../../lib/audio';
import { getSettings as getVoiceSettings, saveSettings as saveVoiceSettings } from './useVoicePrompt';

interface ToggleRowProps {
  icon: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon, label, value, onChange }: ToggleRowProps) {
  const { t } = useTranslation();
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all ${
        value ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-white/10 opacity-70'
      }`}
    >
      <span className="text-3xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white">{label}</p>
        <p className="text-xs text-white/50">{value ? t('settings.soundOn') : t('settings.soundOff')}</p>
      </div>
      <div
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          value ? 'bg-green-500' : 'bg-gray-600'
        }`}
      >
        <motion.div
          className="absolute top-1 h-6 w-6 rounded-full bg-white shadow"
          animate={{ left: value ? 27 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}

interface KidSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KidSettings({ isOpen, onClose }: KidSettingsProps) {
  const { t } = useTranslation();
  const [sounds, setSounds] = useState(() => !audio.isMuted());
  const [voice, setVoice] = useState(() => getVoiceSettings().enabled);

  const handleSounds = (on: boolean) => {
    setSounds(on);
    audio.setMuted(!on);
  };

  const handleVoice = (on: boolean) => {
    setVoice(on);
    const vs = getVoiceSettings();
    saveVoiceSettings({ ...vs, enabled: on });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">⚙️ {t('settings.title')}</h2>
              <button onClick={onClose} className="text-2xl text-white/70 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <ToggleRow
                icon="🔊"
                label={t('settings.sound', 'Sound Effects')}
                value={sounds}
                onChange={handleSounds}
              />
              <ToggleRow
                icon="🎤"
                label={t('settings.voiceNarration', 'Voice Narration')}
                value={voice}
                onChange={handleVoice}
              />
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-2xl bg-white/20 py-3 font-bold text-white hover:bg-white/30"
            >
              {t('general.done', 'Done')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default KidSettings;
