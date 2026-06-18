import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import he from '../locales/he.json';

export const SUPPORTED_LANGUAGES: Array<{ code: string; name: string; dir: 'ltr' | 'rtl' }> = [
  { code: 'en', name: 'English', dir: 'ltr' as const },
  { code: 'he', name: 'עברית', dir: 'rtl' as const },
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

export function setLanguageDirection(dir: 'ltr' | 'rtl') {
  document.documentElement.dir = dir;
  document.documentElement.lang = i18n.language;
}

export default i18n;
