import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, setLanguageDirection } from '../../lib/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith('he') ? 'he' : i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('fundo_lang', code);
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    setLanguageDirection((lang?.dir as 'ltr' | 'rtl') || 'ltr');
  };

  return (
    <div className="flex flex-wrap justify-center gap-1 max-w-xs">
      <span className="text-sm w-full text-center mb-1">🌐</span>
      {SUPPORTED_LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-all ${
            currentLang === lang.code
              ? 'bg-quest-blue text-white ring-2 ring-quest-blue/30'
              : 'bg-white/60 hover:bg-white text-gray-600'
          }`}
          aria-label={`Switch to ${lang.name}`}
          title={lang.name}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
