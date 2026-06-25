import { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as audio from '../../lib/audio';

interface Toast {
  id: string;
  title: string;
  body?: string;
  type: 'success' | 'info' | 'warning' | 'achievement';
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...toast, id, duration: toast.duration || 4000 };
    setToasts(prev => [...prev, newToast]);

    // Play sound based on type
    if (toast.type === 'success') audio.playPointsEarned();
    else if (toast.type === 'achievement') audio.playAchievement();
    else if (toast.type === 'warning') audio.playTimerWarning();

    // Auto-remove
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, newToast.duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: 'bg-green-900/80', border: 'border-green-500/50', icon: '✅' },
    info: { bg: 'bg-blue-900/80', border: 'border-blue-500/50', icon: 'ℹ️' },
    warning: { bg: 'bg-yellow-900/80', border: 'border-yellow-500/50', icon: '⚠️' },
    achievement: { bg: 'bg-purple-900/80', border: 'border-purple-500/50', icon: '🏆' },
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Phase 9: Toast container with stacking */}
      <div className="pointer-events-none fixed top-4 right-4 left-4 z-50 flex w-auto max-w-sm flex-col-reverse gap-2 sm:left-auto sm:w-full" role="region" aria-label="Notifications">
        <AnimatePresence>
          {toasts.map(toast => {
            const style = typeStyles[toast.type] || typeStyles.info;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.8 }}
                className={`${style.bg} ${style.border} border rounded-xl p-4 backdrop-blur-md shadow-xl pointer-events-auto cursor-pointer`}
                onClick={() => removeToast(toast.id)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0">{style.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm">{toast.title}</p>
                    {toast.body && (
                      <p className="text-white/70 text-xs mt-1">{toast.body}</p>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeToast(toast.id); }}
                    className="text-white/50 hover:text-white flex-shrink-0 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
