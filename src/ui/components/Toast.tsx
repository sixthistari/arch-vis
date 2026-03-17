import React, { useState, useCallback } from 'react';
import { useNotificationStore, type Notification } from '../../store/notification';
import { useThemeStore } from '../../store/theme';

// ── Colour tokens per type ──
const typeColours: Record<Notification['type'], { bg: string; border: string; icon: string }> = {
  success: { bg: '#065F46', border: '#10B981', icon: '\u2713' },
  error:   { bg: '#7F1D1D', border: '#EF4444', icon: '\u2717' },
  warning: { bg: '#78350F', border: '#F59E0B', icon: '\u26A0' },
  info:    { bg: '#1E3A5F', border: '#3B82F6', icon: '\u2139' },
};

const lightTypeColours: Record<Notification['type'], { bg: string; border: string; icon: string }> = {
  success: { bg: '#ECFDF5', border: '#10B981', icon: '\u2713' },
  error:   { bg: '#FEF2F2', border: '#EF4444', icon: '\u2717' },
  warning: { bg: '#FFFBEB', border: '#F59E0B', icon: '\u26A0' },
  info:    { bg: '#EFF6FF', border: '#3B82F6', icon: '\u2139' },
};

// ── Error Detail Popout ──
function ErrorDetailPopout({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}): React.ReactElement {
  const ctx = notification.errorContext;

  const copyToClipboard = useCallback(() => {
    const lines = [
      `Operation: ${ctx?.operation ?? 'Unknown'}`,
      ctx?.status != null ? `HTTP Status: ${ctx.status}` : null,
      ctx?.errorMessage ? `Error: ${ctx.errorMessage}` : null,
      ctx?.payload ? `Payload: ${ctx.payload}` : null,
      `Timestamp: ${new Date(notification.timestamp).toISOString()}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines).catch(() => { /* ignore */ });
  }, [ctx, notification.timestamp]);

  return React.createElement('div', {
    style: {
      position: 'fixed',
      bottom: 80,
      right: 16,
      width: 380,
      background: 'var(--panel-bg)',
      border: '1px solid var(--panel-border)',
      borderRadius: 6,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 10002,
      padding: 16,
      fontSize: 12,
      color: 'var(--text-primary)',
    },
  },
    React.createElement('div', {
      style: { fontWeight: 600, marginBottom: 12, fontSize: 13 },
    }, 'Error Details'),

    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '100px 1fr',
        gap: '6px 8px',
        marginBottom: 14,
        fontSize: 11,
      },
    },
      React.createElement('span', { style: { color: 'var(--text-muted)' } }, 'Operation:'),
      React.createElement('span', null, ctx?.operation ?? 'Unknown'),

      ctx?.status != null && React.createElement(React.Fragment, null,
        React.createElement('span', { style: { color: 'var(--text-muted)' } }, 'HTTP Status:'),
        React.createElement('span', null, String(ctx.status)),
      ),

      ctx?.errorMessage && React.createElement(React.Fragment, null,
        React.createElement('span', { style: { color: 'var(--text-muted)' } }, 'Error:'),
        React.createElement('span', {
          style: { wordBreak: 'break-word', color: '#EF4444' },
        }, ctx.errorMessage),
      ),

      ctx?.payload && React.createElement(React.Fragment, null,
        React.createElement('span', { style: { color: 'var(--text-muted)' } }, 'Payload:'),
        React.createElement('span', {
          style: {
            wordBreak: 'break-word',
            fontFamily: 'monospace',
            fontSize: 10,
            opacity: 0.8,
          },
        }, ctx.payload.length > 200 ? ctx.payload.slice(0, 200) + '\u2026' : ctx.payload),
      ),

      React.createElement('span', { style: { color: 'var(--text-muted)' } }, 'Timestamp:'),
      React.createElement('span', null, new Date(notification.timestamp).toLocaleString()),
    ),

    React.createElement('div', {
      style: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
    },
      React.createElement('button', {
        onClick: copyToClipboard,
        style: {
          background: 'var(--button-bg)',
          color: 'var(--button-text)',
          border: '1px solid var(--border-primary)',
          borderRadius: 4,
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: 11,
        },
      }, 'Copy to Clipboard'),
      React.createElement('button', {
        onClick: onClose,
        style: {
          background: 'var(--button-bg)',
          color: 'var(--button-text)',
          border: '1px solid var(--border-primary)',
          borderRadius: 4,
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: 11,
        },
      }, 'Dismiss'),
    ),
  );
}

// ── Individual Toast ──
function Toast({
  notification,
  isDark,
}: {
  notification: Notification;
  isDark: boolean;
}): React.ReactElement {
  const [showDetail, setShowDetail] = useState(false);
  const remove = useNotificationStore(s => s.removeNotification);
  const colours = isDark ? typeColours[notification.type] : lightTypeColours[notification.type];

  return React.createElement(React.Fragment, null,
    React.createElement('div', {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '8px 12px',
        background: colours.bg,
        borderLeft: `3px solid ${colours.border}`,
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        minWidth: 220,
        maxWidth: 360,
        fontSize: 12,
        color: isDark ? '#F9FAFB' : '#111827',
        animation: 'toast-slide-in 0.2s ease-out',
      },
    },
      // Icon
      React.createElement('span', {
        style: { fontSize: 14, lineHeight: '18px', flexShrink: 0 },
      }, colours.icon),

      // Message + detail
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', {
          style: { fontWeight: 500, lineHeight: '18px' },
        }, notification.message),
        notification.detail && React.createElement('div', {
          style: {
            fontSize: 11,
            opacity: 0.8,
            marginTop: 2,
          },
        }, notification.detail),
        // Error: "Details" button
        notification.type === 'error' && notification.errorContext && React.createElement('button', {
          onClick: () => setShowDetail(true),
          'aria-label': 'Show error details',
          style: {
            background: 'transparent',
            color: colours.border,
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 11,
            marginTop: 4,
            textDecoration: 'underline',
          },
        }, 'Details'),
      ),

      // Dismiss X
      React.createElement('button', {
        onClick: () => {
          setShowDetail(false);
          remove(notification.id);
        },
        style: {
          background: 'transparent',
          border: 'none',
          color: isDark ? '#9CA3AF' : '#6B7280',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: '18px',
          padding: 0,
          flexShrink: 0,
        },
        'aria-label': 'Dismiss',
      }, '\u00D7'),
    ),

    // Error detail popout
    showDetail && React.createElement(ErrorDetailPopout, {
      notification,
      onClose: () => {
        setShowDetail(false);
        remove(notification.id);
      },
    }),
  );
}

// ── Toast Container ──
export function ToastContainer(): React.ReactElement | null {
  const notifications = useNotificationStore(s => s.notifications);
  const isDark = useThemeStore(s => s.theme) === 'dark';

  if (notifications.length === 0) return null;

  return React.createElement(React.Fragment, null,
    // Inject animation keyframes
    React.createElement('style', null, `
      @keyframes toast-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
    `),
    React.createElement('div', {
      style: {
        position: 'fixed',
        bottom: 40,
        right: 16,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 8,
        zIndex: 10001,
        pointerEvents: 'auto',
      },
    },
      notifications.map(n =>
        React.createElement(Toast, { key: n.id, notification: n, isDark }),
      ),
    ),
  );
}
