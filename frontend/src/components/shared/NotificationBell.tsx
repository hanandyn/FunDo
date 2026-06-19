import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { Notification } from '../../lib/types';

export function NotificationBell() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await api.getUnreadCount() as { unread_count: number };
      setUnreadCount(data.unread_count);
    } catch { /* ignore */ }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications(20, 0) as unknown as Notification[];
      setNotifications(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000); // poll every minute
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('notifications.justNow');
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { if (!open) loadNotifications(); setOpen(!open); }}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
        aria-label={`${unreadCount} unread notifications`}
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="text-white font-medium">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-blue-400 hover:text-blue-300">
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {t('notifications.empty')}
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read) handleMarkRead(n.id); }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                    !n.read ? 'bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{n.title}</p>
                      {n.body && <p className="text-gray-400 text-xs mt-0.5 truncate">{n.body}</p>}
                      <p className="text-gray-600 text-xs mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
