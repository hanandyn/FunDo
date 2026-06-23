import { useCallback, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Voice prompt hook and utility functions for Tier 1 voice guidance.
 */

export type VoicePromptType = 'greeting' | 'instruction' | 'encouragement' | 'celebration' | 'task-name' | 'custom';

export interface VoiceSettings {
  enabled: boolean;
  rate: number;       // 0.5 - 2.0
  pitch: number;      // 0.5 - 2.0
  volume: number;     // 0.0 - 1.0
  customPrompts: Record<string, string>;  // prompt-type -> base64 audio
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  rate: 0.85,
  pitch: 1.1,
  volume: 1.0,
  customPrompts: {},
};

const VOICE_STORAGE_KEY = 'fundo_voice_settings';

function getSettings(): VoiceSettings {
  try {
    const stored = localStorage.getItem(VOICE_STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: VoiceSettings) {
  localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(s));
}

/**
 * Pick the best voice for the current language.
 */
function pickVoice(locale: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  let voice = voices.find(v => v.lang.startsWith(locale));
  if (voice) return voice;

  const langPrefix = locale.split('-')[0];
  voice = voices.find(v => v.lang.startsWith(langPrefix));
  if (voice) return voice;

  voice = voices.find(v => v.lang.startsWith('en'));
  return voice || voices[0];
}

function playBase64Audio(base64: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(base64);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

/**
 * Speak text with voice guidance settings.
 */
export function speak(
  text: string,
  type: VoicePromptType = 'instruction',
  locale?: string
): Promise<void> {
  const settings = getSettings();
  if (!settings.enabled) return Promise.resolve();
  if (!('speechSynthesis' in window)) return Promise.resolve();

  if (settings.customPrompts[type]) {
    return playBase64Audio(settings.customPrompts[type]);
  }

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      const lang = locale || document.documentElement.lang || 'en';
      utterance.lang = lang;

      const voice = pickVoice(lang);
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    }, 50);
  });
}

/**
 * React hook for voice prompts in a component.
 */
export function useVoicePrompt() {
  const { i18n } = useTranslation();
  const [settings, setSettingsState] = useState<VoiceSettings>(getSettings);
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    // Initialize speech synthesis on mount
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const speakNow = useCallback(
    (text: string, type: VoicePromptType = 'instruction') => {
      return speak(text, type, i18n.language);
    },
    [i18n.language]
  );

  const speakGreeting = useCallback(
    (text: string) => {
      if (!hasSpokenRef.current) {
        hasSpokenRef.current = true;
        return speak(text, 'greeting', i18n.language);
      }
      return Promise.resolve();
    },
    [i18n.language]
  );

  const updateSettings = useCallback((partial: Partial<VoiceSettings>) => {
    const current = getSettings();
    const updated = { ...current, ...partial };
    saveSettings(updated);
    setSettingsState(updated);
  }, []);

  const toggleVoice = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  const setCustomPrompt = useCallback((type: string, base64Audio: string) => {
    const current = getSettings();
    current.customPrompts[type] = base64Audio;
    saveSettings(current);
    setSettingsState(getSettings());
  }, []);

  const recordCustomPrompt = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        reject(new Error('Microphone not available'));
        return;
      }

      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            stream.getTracks().forEach((t) => t.stop());
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            stream.getTracks().forEach((t) => t.stop());
            reject(new Error('Failed to read audio'));
          };
          reader.readAsDataURL(blob);
        };

        mediaRecorder.onerror = () => {
          stream.getTracks().forEach((t) => t.stop());
          reject(new Error('Recording failed'));
        };

        mediaRecorder.start();

        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 10000);
      }).catch(reject);
    });
  }, []);

  return {
    settings,
    speak: speakNow,
    speakGreeting,
    toggleVoice,
    updateSettings,
    setCustomPrompt,
    recordCustomPrompt,
  };
}

export { getSettings, saveSettings, pickVoice };
