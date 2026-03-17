/**
 * Notification convenience helpers — standalone module with no store imports.
 *
 * Uses a late-bound reference to the notification store to avoid circular
 * dependencies between api/ and store/.
 */

export interface NotifyAddFn {
  (n: {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    detail?: string;
    autoHide: boolean;
    errorContext?: {
      operation: string;
      status?: number;
      errorMessage?: string;
      payload?: string;
    };
  }): void;
}

/** Late-bound reference — set by notification store on import. */
let addNotification: NotifyAddFn | null = null;

/** Called by the notification store to register itself. */
export function registerNotificationSink(fn: NotifyAddFn): void {
  addNotification = fn;
}

function add(n: Parameters<NotifyAddFn>[0]): void {
  if (addNotification) addNotification(n);
}

export function notifySuccess(message: string, detail?: string): void {
  add({ type: 'success', message, detail, autoHide: true });
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
  add({
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
  add({ type: 'warning', message, detail, autoHide: true });
}

export function notifyInfo(message: string, detail?: string): void {
  add({ type: 'info', message, detail, autoHide: true });
}
