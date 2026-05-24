'use client';

import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: 'default' | 'error' | 'success' | 'warning';
  timestamp: number;
}

interface ToastStore {
  toasts: Toast[];
  history: Toast[];
  unreadCount: number;
  addToast: (toast: Omit<Toast, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearHistory: () => void;
  markAsRead: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  history: [],
  unreadCount: 0,
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    const newToast = { ...toast, id, timestamp: Date.now() };
    set((state) => ({ 
      toasts: [...state.toasts, newToast],
      history: [newToast, ...state.history].slice(0, 50), // keep last 50
      unreadCount: state.unreadCount + 1
    }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearHistory: () => set({ history: [], unreadCount: 0 }),
  markAsRead: () => set({ unreadCount: 0 }),
}));

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="minimal-card min-w-[300px] max-w-sm bg-secondary/80 backdrop-blur-md border border-border/40 p-4 shadow-xl flex items-start justify-between gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          <div>
            <h4 className={`text-sm font-bold tracking-tight ${toast.type === 'error' ? 'text-red-400' : toast.type === 'warning' ? 'text-amber-400' : 'text-foreground'}`}>
              {toast.title}
            </h4>
            {toast.description && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
