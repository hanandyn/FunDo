import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useVoicePrompt, speak } from './useVoicePrompt';
import type { VoiceSettings } from './useVoicePrompt';

/**
 * VoiceSettings — Tier 1 voice configuration panel.
 *
 * Allows parents/older kids to:
 * - Toggle voice guidance on/off
 * - Adjust speech speed (slow/normal/fast)
 * - Test with a sample message
 * - Record custom voice prompts (parent's voice for their child)
 */
export function VoiceSettings() {
  const { t } = useTranslation();
  const { settings, toggleVoice, updateSettings, setCustomPrompt, recordCustomPrompt } = useVoicePrompt();
  const [showSettings, setShowSettings] = useState(false);
  const [recordingType, setRecordingType] = useState<string | null>(null);
  const [customPromptPlaying, setCustomPromptPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeedChange = useCallback(
    (rate: number) => {
      updateSettings({ rate });
    },
    [updateSettings]
  );

  const handleTest = useCallback(() => {
    speak(t('voice.testMessage'), 'instruction');
  }, [t]);

  const handleRecord = useCallback(
    async (promptType: string) => {
      setRecordingType(promptType);
      try {
        const base64 = await recordCustomPrompt();
        setCustomPrompt(promptType, base64);
      } catch (err) {
        console.warn('Recording failed:', err);
      } finally {
        setRecordingType(null);
      }
    },
    [recordCustomPrompt, setCustomPrompt]
  );

  const handlePlayCustom = useCallback((promptType: string) => {
    const base64 = settings.customPrompts[promptType];
    if (!base64) return;
    setCustomPromptPlaying(true);
    const audio = new Audio(base64);
    audioRef.current = audio;
    audio.onended = () => setCustomPromptPlaying(false);
    audio.onerror = () => setCustomPromptPlaying(false);
    audio.play().catch(() => setCustomPromptPlaying(false));
  }, [settings.customPrompts]);

  const speedLabels = [
    { rate: 0.7, label: t('voice.slow') },
    { rate: 1.0, label: t('voice.normal') },
    { rate: 1.3, label: t('voice.fast') },
  ];

  const promptTypes = [
    { type: 'greeting', label: '👋 Greeting' },
    { type: 'encouragement', label: '🌟 Encouragement' },
    { type: 'celebration', label: '🎉 Celebration' },
  ];

  return (
    <div className="relative">
      {/* Toggle button — large and friendly for Tier 1 */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-14 h-14 rounded-full flex items-center justify-center text-xl
                   transition-all duration-300 shadow-md
                   hover:scale-110 active:scale-95
                   focus:outline-none focus:ring-4 focus:ring-yellow-300"
        style={{
          background: settings.enabled
            ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
            : 'linear-gradient(135deg, #d1d5db, #9ca3af)',
        }}
        aria-label={t('voice.title')}
        title={t('voice.title')}
      >
        {settings.enabled ? '🔊' : '🔇'}
      </button>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute top-16 right-0 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              🎙️ {t('voice.title')}
            </h3>

            {/* On/Off toggle */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">
                {settings.enabled ? t('voice.enable') : t('voice.disable')}
              </span>
              <button
                onClick={toggleVoice}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.enabled ? 'bg-amber-400' : 'bg-gray-300'
                }`}
                aria-label={settings.enabled ? t('voice.disable') : t('voice.enable')}
              >
                <motion.div
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                  animate={{ left: settings.enabled ? 28 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Speed selector */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 block mb-1">
                {t('voice.speed')}: {settings.rate.toFixed(1)}×
              </label>
              <div className="flex gap-1">
                {speedLabels.map((s) => (
                  <button
                    key={s.rate}
                    onClick={() => handleSpeedChange(s.rate)}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      Math.abs(settings.rate - s.rate) < 0.05
                        ? 'bg-amber-400 text-white shadow'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Test button */}
            <button
              onClick={handleTest}
              disabled={!settings.enabled}
              className="w-full py-2 mb-3 text-sm font-medium bg-amber-100 text-amber-700
                         rounded-xl hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              🔊 {t('voice.test')}
            </button>

            {/* Custom voice prompts */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">
                {t('voice.customPrompt')}
              </p>
              {promptTypes.map((pt) => (
                <div key={pt.type} className="flex items-center gap-2 mb-2">
                  <span className="text-xs w-24 text-gray-600 truncate">{pt.label}</span>
                  {settings.customPrompts[pt.type] ? (
                    <button
                      onClick={() => handlePlayCustom(pt.type)}
                      disabled={customPromptPlaying}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg
                                 hover:bg-green-200 disabled:opacity-50"
                    >
                      {t('voice.play')}
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleRecord(pt.type)}
                    disabled={recordingType === pt.type}
                    className={`px-2 py-1 text-xs rounded-lg ${
                      recordingType === pt.type
                        ? 'bg-red-100 text-red-600 animate-pulse'
                        : settings.customPrompts[pt.type]
                          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    {recordingType === pt.type ? t('voice.recording') : t('voice.record')}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-3 w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕ Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VoiceSettings;
