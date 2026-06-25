/**
 * FamilyMessageBoard.tsx — Family communication feed on dashboards.
 * Phase 8: Family Communication System.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import type { FamilyMessage } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';

type FamilyMessageBoardProps = {
  compact?: boolean;
};

export function FamilyMessageBoard({ compact = false }: FamilyMessageBoardProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.getFamilyMessages(30) as unknown as FamilyMessage[];
      setMessages([...data].reverse());
    } catch { /* no messages yet */ }
  }, []);

  useEffect(() => {
    const firstLoad = window.setTimeout(() => { void loadMessages(); }, 0);
    const interval = setInterval(() => { void loadMessages(); }, 3000);
    const handleFocus = () => { void loadMessages(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      clearInterval(interval);
      window.clearTimeout(firstLoad);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [loadMessages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const msgType = user?.role === 'parent' ? 'announcement' : 'cheer';
      const sent = await api.sendFamilyMessage({ message: newMessage.trim(), type: msgType }) as unknown as FamilyMessage;
      setMessages(prev => [...prev.filter(msg => msg.id !== sent.id), sent]);
      setNewMessage('');
      await loadMessages();
    } catch (e) {
      console.error('Send failed:', e);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const typeEmoji: Record<string, string> = {
    announcement: '📢',
    cheer: '🎉',
    reminder: '⏰',
    system: '🤖',
  };

  const typeColor: Record<string, string> = {
    announcement: 'bg-amber-50 border-amber-200',
    cheer: 'bg-green-50 border-green-200',
    reminder: 'bg-blue-50 border-blue-200',
    system: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`w-full overflow-hidden border border-gray-200 bg-white shadow-sm ${compact ? 'rounded-3xl p-3' : 'rounded-xl p-4'}`}>
      <h3 className={`mb-3 flex items-center gap-2 whitespace-nowrap font-semibold ${compact ? 'text-base' : 'text-lg'}`}>
        <span aria-hidden="true">💬</span>
        <span className="truncate">Family Board</span>
      </h3>

      <AnimatePresence>
        <div className={`${compact ? 'max-h-40' : 'max-h-64'} overflow-y-auto space-y-2 mb-3 overscroll-contain`}>
          {messages.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No messages yet. Say hello! 👋</p>
          )}
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`rounded-lg border p-2 ${compact ? 'text-xs' : 'text-sm'} ${typeColor[msg.type] || 'bg-gray-50'}`}
            >
              <div className="mb-0.5 flex min-w-0 items-center gap-1">
                <span className="shrink-0">{typeEmoji[msg.type] || '💬'}</span>
                <span className="min-w-0 truncate text-xs font-medium text-gray-600">{msg.sender_name || 'System'}</span>
                {msg.pinned && <span className="shrink-0 text-xs text-amber-500">📌</span>}
                <span className="ml-auto shrink-0 text-xs text-gray-400">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <p className="break-anywhere text-gray-700">{msg.message}</p>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      <div className="flex min-w-0 gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={user?.role === 'parent' ? 'Post an announcement... 📢' : 'Send a cheer... 🎉'}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300 sm:text-sm"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-lg text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          aria-label="Send message"
        >
          {sending ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
}
