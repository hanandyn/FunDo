import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './lib/i18n'; // Initialize i18next
import { setLanguageDirection } from './lib/i18n';

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  useEffect(() => {
    const dir = localStorage.getItem('questkids_lang') === 'he' ? 'rtl' : 'ltr';
    setLanguageDirection(dir);
  }, []);

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
