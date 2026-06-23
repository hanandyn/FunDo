import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './lib/i18n'; // Initialize i18next
import { setLanguageDirection } from './lib/i18n';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { flushOfflineQueue } from './lib/api';

const CHUNK_RELOAD_KEY = 'fundo-chunk-reload-attempted';

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|dynamically imported module/i.test(message);
}

async function clearAppCaches() {
  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('fundo-')).map(name => caches.delete(name)));
  }
}

function recoverFromStaleChunk(error: unknown) {
  if (!isChunkLoadError(error)) return;
  const lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - lastAttempt < 60_000) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  clearAppCaches()
    .catch(() => {})
    .finally(() => window.location.reload());
}

window.addEventListener('error', event => recoverFromStaleChunk(event.error || event.message));
window.addEventListener('unhandledrejection', event => recoverFromStaleChunk(event.reason));

// eslint-disable-next-line react-refresh/only-export-components
function Root() {
  useEffect(() => {
    const dir = localStorage.getItem('fundo_lang') === 'he' ? 'rtl' : 'ltr';
    setLanguageDirection(dir);

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('SW registered'))
        .catch(() => console.log('SW registration failed'));
    }

    if (navigator.onLine) {
      void flushOfflineQueue();
    }
  }, []);

  return (
    <React.StrictMode>
      {/* Phase 9: Skip to content link for accessibility */}
      <a href="#main-content" className="skip-to-content">Skip to content</a>
      <ErrorBoundary>
        <App />
        <OfflineIndicator />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
