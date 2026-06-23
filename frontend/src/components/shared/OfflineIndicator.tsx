import { useCallback, useEffect, useState } from 'react';
import { flushOfflineQueue } from '../../lib/api';
import { getOfflineQueueCount, onOfflineQueueChanged } from '../../lib/offlineQueue';

export function OfflineIndicator() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(() => {
    getOfflineQueueCount()
      .then(setPending)
      .catch(() => setPending(0));
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      await flushOfflineQueue();
      refreshCount();
    } finally {
      setSyncing(false);
    }
  }, [refreshCount, syncing]);

  useEffect(() => {
    refreshCount();
    const removeQueueListener = onOfflineQueueChanged(refreshCount);
    const handleOnline = () => {
      setOnline(true);
      void sync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      removeQueueListener();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCount, sync]);

  if (online && pending === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/15 bg-gray-950/90 px-4 py-2 text-sm text-white shadow-xl backdrop-blur">
      {!online ? 'Offline mode' : syncing ? 'Syncing saved changes...' : `${pending} saved change${pending === 1 ? '' : 's'} pending sync`}
    </div>
  );
}
