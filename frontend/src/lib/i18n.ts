import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import he from '../locales/he.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import ru from '../locales/ru.json';
import ar from '../locales/ar.json';
import pt from '../locales/pt.json';
import it from '../locales/it.json';
import nl from '../locales/nl.json';
import ja from '../locales/ja.json';

export const SUPPORTED_LANGUAGES: Array<{ code: string; name: string; dir: 'ltr' | 'rtl' }> = [
  { code: 'en', name: 'English', dir: 'ltr' as const },
  { code: 'es', name: 'Español', dir: 'ltr' as const },
  { code: 'fr', name: 'Français', dir: 'ltr' as const },
  { code: 'pt', name: 'Português', dir: 'ltr' as const },
  { code: 'it', name: 'Italiano', dir: 'ltr' as const },
  { code: 'nl', name: 'Nederlands', dir: 'ltr' as const },
  { code: 'ja', name: '日本語', dir: 'ltr' as const },
  { code: 'ru', name: 'Русский', dir: 'ltr' as const },
  { code: 'he', name: 'עברית', dir: 'rtl' as const },
  { code: 'ar', name: 'العربية', dir: 'rtl' as const },
];

const detectionOptions = {
  order: ['localStorage', 'navigator'],
  lookupLocalStorage: 'questkids_lang',
  caches: ['localStorage'],
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      es: { translation: es },
      fr: { translation: fr },
      pt: { translation: pt },
      it: { translation: it },
      nl: { translation: nl },
      ja: { translation: ja },
      ru: { translation: ru },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    detection: detectionOptions,
    interpolation: {
      escapeValue: false,
    },
  });

export function getLanguageDir(): 'ltr' | 'rtl' {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language);
  return (lang?.dir as 'ltr' | 'rtl') || 'ltr';
}

// Sync language to audio manager on language change
i18n.on('languageChanged', (lng) => {
  import('./audio').then(({ setLanguage }) => setLanguage(lng));
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === lng);
  if (lang) setLanguageDirection(lang.dir as 'ltr' | 'rtl');
});

export function setLanguageDirection(dir: 'ltr' | 'rtl') {
  document.documentElement.dir = dir;
  document.documentElement.lang = i18n.language;
}

export default i18n;
