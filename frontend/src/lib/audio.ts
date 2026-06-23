/**
 * Audio Manager — plays sound effect files and voice narration clips.
 * Supports EN/HE voice clips based on i18n language.
 * Falls back to programmatic Web Audio sounds when files aren't available.
 */

import * as sounds from './sounds';

let _muted = false;
let _voiceEnabled = true;
let _lang = 'en';

// Cache for audio elements
const audioCache: Record<string, HTMLAudioElement> = {};

export function setMuted(muted: boolean): void {
  _muted = muted;
  sounds.setMuted(muted);
}

export function isMuted(): boolean {
  return _muted;
}

export function toggleMute(): boolean {
  setMuted(!_muted);
  return _muted;
}

export function setVoiceEnabled(enabled: boolean): void {
  _voiceEnabled = enabled;
}

export function isVoiceEnabled(): boolean {
  return _voiceEnabled;
}

export function setLanguage(lang: string): void {
  _lang = lang.startsWith('he') ? 'he' : 'en';
}

function getLang(): string {
  // Check localStorage for user preference, fallback to _lang
  try {
    const stored = localStorage.getItem('fundo-lang');
    if (stored) return stored.startsWith('he') ? 'he' : 'en';
  } catch { /* SSR */ }
  return _lang;
}

function playFile(path: string): void {
  if (_muted) return;
  try {
    let audio = audioCache[path];
    if (!audio) {
      audio = new Audio(path);
      audio.preload = 'auto';
      audioCache[path] = audio;
    }
    audio.currentTime = 0;
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Autoplay policy — will play on next user interaction
    });
  } catch {
    // Fallback to programmatic sound
  }
}

/**
 * Voice prompt text map — what each voice prompt says in English.
 * For English, we use browser SpeechSynthesis (proper English voice).
 * For Hebrew, we use pre-recorded MP3 files (phonikud-tts maia voice).
 */
const VOICE_TEXTS: Record<string, string> = {
  'task-complete': 'Task complete! Great job!',
  'level-up': 'Level up! You are amazing!',
  'chest-open': 'Mystery chest opened!',
  'timer-warning': 'Time is almost up! Finish now!',
  'streak-milestone': 'Streak milestone reached! Keep it going!',
  'all-done': 'All done! You finished everything today!',
  'recap-intro': 'Here is your weekly recap!',
  'great-job': 'Great job! You are a superstar!',
};

function playVoice(name: string): void {
  if (_muted || !_voiceEnabled) return;
  const lang = getLang();
  if (lang === 'he') {
    // Hebrew: use pre-recorded MP3 files (phonikud-tts maia voice)
    playFile(`/sounds/voice/he/${name}.mp3`);
  } else {
    // English (and other languages): use browser SpeechSynthesis for proper English speech
    const text = VOICE_TEXTS[name];
    if (text && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        // Pick an English voice
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en') && v.localService);
        if (enVoice) utterance.voice = enVoice;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback to file if SpeechSynthesis fails
        playFile(`/sounds/voice/en/${name}.mp3`);
      }
    } else {
      // Fallback to pre-recorded file
      playFile(`/sounds/voice/en/${name}.mp3`);
    }
  }
}

// ── Sound Effects (file-based with programmatic fallback) ──

export function playTaskComplete(): void {
  playFile('/sounds/achievement.mp3');
  sounds.playTaskComplete(); // programmatic fallback layered under the file
  playVoice('task-complete');
}

export function playPointsEarned(): void {
  playFile('/sounds/coin.mp3');
  sounds.playPointsEarned();
}

export function playLevelUp(): void {
  playFile('/sounds/level-up.mp3');
  sounds.playLevelUp();
  playVoice('level-up');
}

export function playAchievement(): void {
  playFile('/sounds/achievement.mp3');
  sounds.playAchievement();
}

export function playChestOpen(): void {
  playFile('/sounds/chest-open.mp3');
  sounds.playChestOpen();
  playVoice('chest-open');
}

export function playTimerWarning(): void {
  sounds.playTimerWarning();
  playVoice('timer-warning');
}

export function playTimerExpired(): void {
  sounds.playTimerExpired();
}

export function playButtonClick(): void {
  sounds.playButtonClick();
}

export function playSpinTick(): void {
  sounds.playSpinTick();
}

export function playSpinResult(): void {
  sounds.playSpinResult();
}

export function playStreakMilestone(): void {
  playFile('/sounds/level-up.mp3');
  sounds.playAchievement();
  playVoice('streak-milestone');
}

export function playAllDone(): void {
  playFile('/sounds/achievement.mp3');
  sounds.playAchievement();
  playVoice('all-done');
}

export function playRecapIntro(): void {
  playVoice('recap-intro');
}

export function playGreatJob(): void {
  playVoice('great-job');
}
