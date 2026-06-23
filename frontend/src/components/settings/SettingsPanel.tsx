/* eslint-disable react-hooks/immutability */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { ShabbatStatus, ShabbatSettings, ThemePreferences } from '../../lib/types';
import { SUPPORTED_LANGUAGES, setLanguageDirection } from '../../lib/i18n';

interface SettingsPanelProps {
  isParent?: boolean;
  onClose?: () => void;
}

export function SettingsPanel({ isParent = false, onClose }: SettingsPanelProps) {
  const { t, i18n } = useTranslation();
  const [shabbatStatus, setShabbatStatus] = useState<ShabbatStatus | null>(null);
  const [shabbatSettings, setShabbatSettings] = useState<ShabbatSettings | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [colorblindTheme, setColorblindTheme] = useState('');
  const [highContrast, setHighContrast] = useState(false);
  const [language, setLanguage] = useState(i18n.language?.startsWith('he') ? 'he' : 'en');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [sStatus, themePrefs] = await Promise.all([
        api.getShabbatStatus().catch(() => ({ active: false } as ShabbatStatus)),
        api.getThemePreferences().catch(() => ({ focus_mode: false, colorblind_theme: null, high_contrast: false, language: 'en' } as ThemePreferences)),
      ]);
      setShabbatStatus(sStatus as ShabbatStatus);
      const tp = themePrefs as ThemePreferences;
      setFocusMode(tp.focus_mode);
      setColorblindTheme(tp.colorblind_theme || '');
      setHighContrast(tp.high_contrast);
      setLanguage(tp.language);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (isParent) {
      api.getShabbatSettings()
        .then(s => setShabbatSettings(s as unknown as ShabbatSettings))
        .catch(() => {});
    }
  }, [isParent]);

  const handleThemeSave = async () => {
    try {
      await api.updateThemePreferences({
        focus_mode: focusMode,
        colorblind_theme: colorblindTheme || null,
        high_contrast: highContrast,
        language: language,
      });
      // Apply language
      localStorage.setItem('fundo_lang', language);
      i18n.changeLanguage(language);
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === language);
      setLanguageDirection(lang?.dir || 'ltr');
      setMessage('Settings saved! ✅');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Failed to save settings'); }
  };

  const handleShabbatToggle = async (mode: boolean) => {
    if (!shabbatSettings) return;
    try {
      await api.updateShabbatSettings({
        ...shabbatSettings,
        shabbat_mode: mode,
      });
      setShabbatSettings({ ...shabbatSettings, shabbat_mode: mode });
    } catch { /* ignore */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-xl p-6 max-w-lg mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">⚙️ {t('settings.title')}</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">✕</button>
        )}
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl mb-4 text-sm">{message}</div>
      )}

      {/* Language */}
      <div className="mb-6">
        <h3 className="font-bold text-sm mb-2 text-gray-500 uppercase">{t('settings.language')}</h3>
        <div className="flex gap-2">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                language === lang.code
                  ? 'bg-quest-blue text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      {/* Focus Mode */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-gray-500 uppercase">{t('settings.focusMode')}</h3>
            <p className="text-xs text-gray-400">{t('settings.focusModeDesc')}</p>
          </div>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`w-12 h-6 rounded-full transition-colors ${focusMode ? 'bg-quest-blue' : 'bg-gray-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${focusMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Colorblind Theme */}
      <div className="mb-6">
        <h3 className="font-bold text-sm mb-2 text-gray-500 uppercase">{t('settings.colorblindTheme')}</h3>
        <select
          value={colorblindTheme}
          onChange={e => setColorblindTheme(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
        >
          <option value="">{t('settings.colorblindNone')}</option>
          <option value="deuteranopia">{t('settings.colorblindDeuteranopia')}</option>
          <option value="protanopia">{t('settings.colorblindProtanopia')}</option>
          <option value="tritanopia">{t('settings.colorblindTritanopia')}</option>
        </select>
      </div>

      {/* High Contrast */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-500 uppercase">{t('settings.highContrast')}</h3>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`w-12 h-6 rounded-full transition-colors ${highContrast ? 'bg-quest-blue' : 'bg-gray-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${highContrast ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Shabbat Mode */}
      <div className="mb-6 p-4 bg-purple-50 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm text-purple-800 uppercase">🕯️ {t('settings.shabbatMode')}</h3>
            <p className="text-xs text-purple-600">{t('settings.shabbatModeDesc')}</p>
          </div>
          {isParent && (
            <button
              onClick={() => handleShabbatToggle(!shabbatSettings?.shabbat_mode)}
              className={`w-12 h-6 rounded-full transition-colors ${shabbatSettings?.shabbat_mode ? 'bg-purple-600' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${shabbatSettings?.shabbat_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          )}
        </div>
        {shabbatStatus?.active && (
          <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-xl text-sm text-center font-bold">
            {t('settings.shabbatGreeting')}
          </div>
        )}
        {shabbatStatus?.starts_in_minutes != null && (
          <div className="text-sm text-purple-700 text-center mt-2">
            {t('settings.shabbatCountdown')}: {Math.floor(shabbatStatus.starts_in_minutes / 60)}h {shabbatStatus.starts_in_minutes % 60}m
          </div>
        )}
        {shabbatStatus?.active && shabbatStatus?.ends_in_minutes != null && (
          <div className="text-sm text-purple-700 text-center mt-2">
            {t('settings.shabbatEndsIn')}: {Math.floor(shabbatStatus.ends_in_minutes / 60)}h {shabbatStatus.ends_in_minutes % 60}m
          </div>
        )}
      </div>

      <button onClick={handleThemeSave} className="btn-primary w-full">
        {t('general.save')}
      </button>
    </motion.div>
  );
}
