import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  detail?: string;
  timestamp: number;
  autoHide: boolean;
  /** For error detail popout */
  errorContext?: {
    operation: string;
    status?: number;
    errorMessage?: string;
    payload?: string;
  };
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

let counter = 0;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (n) => {
    const id = `notif-${++counter}-${Date.now()}`;
    const notification: Notification = {
      ...n,
      id,
      timestamp: Date.now(),
    };
    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    // Auto-expire success/info after 4 seconds
    if (n.autoHide) {
      const timer = setTimeout(() => {
        timers.delete(id);
        set((state) => ({
          notifications: state.notifications.filter((x) => x.id !== id),
        }));
      }, 4000);
      timers.set(id, timer);
    }
  },

  removeNotification: (id) => {
    // Clear any pending auto-dismiss timer
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    set((state) => ({
      notifications: state.notifications.filter((x) => x.id !== id),
    }));
  },

  clearAll: () => {
    // Clear all pending timers
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    set({ notifications: [] });
  },
}));

// ── Convenience helpers ──

export function notifySuccess(message: string, detail?: string): void {
  useNotificationStore.getState().addNotification({
    type: 'success',
    message,
    detail,
    autoHide: true,
  });
}

export function notifyError(
  message: string,
  opts?: {
    detail?: string;
    operation?: string;
    status?: number;
    errorMessage?: string;
    payload?: string;
  },
): void {
  useNotificationStore.getState().addNotification({
    type: 'error',
    message,
    detail: opts?.detail,
    autoHide: false,
    errorContext: opts
      ? {
          operation: opts.operation ?? message,
          status: opts.status,
          errorMessage: opts.errorMessage,
          payload: opts.payload,
        }
      : undefined,
  });
}

export function notifyWarning(message: string, detail?: string): void {
  useNotificationStore.getState().addNotification({
    type: 'warning',
    message,
    detail,
    autoHide: true,
  });
}

export function notifyInfo(message: string, detail?: string): void {
  useNotificationStore.getState().addNotification({
    type: 'info',
    message,
    detail,
    autoHide: true,
  });
}
