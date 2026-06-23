import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, setLanguageDirection } from '../../lib/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith('he') ? 'he' : 'en';

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('fundo_lang', code);
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    setLanguageDirection((lang?.dir as 'ltr' | 'rtl') || 'ltr');
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">🌐</span>
      {SUPPORTED_LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`px-2 py-1 rounded-lg text-sm font-medium transition-all ${
            currentLang === lang.code
              ? 'bg-quest-blue text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          aria-label={`Switch to ${lang.name}`}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
}
