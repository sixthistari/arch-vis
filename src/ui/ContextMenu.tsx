import React, { useEffect, useRef, useCallback } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  submenu?: ContextMenuItem[];
}

export interface ContextMenuGroup {
  label: string;
  items: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  groups: ContextMenuGroup[];
  onClose: () => void;
}

export function ContextMenu({ x, y, groups, onClose }: ContextMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpen, setSubmenuOpen] = React.useState<string | null>(null);
  const [position, setPosition] = React.useState({ x, y });

  // Reposition to stay within viewport
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x;
    let ny = y;
    if (rect.right > window.innerWidth) nx = x - rect.width;
    if (rect.bottom > window.innerHeight) ny = y - rect.height;
    if (nx < 0) nx = 0;
    if (ny < 0) ny = 0;
    setPosition({ x: nx, y: ny });
  }, [x, y]);

  // Close on Escape or click outside
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleKeyDown, handleClickOutside]);

  return React.createElement('div', {
    ref: menuRef,
    style: {
      position: 'fixed',
      left: position.x,
      top: position.y,
      zIndex: 1000,
      background: 'var(--panel-bg)',
      border: '1px solid var(--panel-border)',
      borderRadius: 6,
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      padding: '4px 0',
      minWidth: 180,
      fontSize: 12,
      userSelect: 'none',
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  },
    ...groups.flatMap((group, gi) => {
      const items: React.ReactElement[] = [];

      // Separator before groups (except first)
      if (gi > 0) {
        items.push(React.createElement('div', {
          key: `sep-${gi}`,
          style: {
            height: 1,
            background: 'var(--border-secondary)',
            margin: '4px 8px',
          },
        }));
      }

      // Group label
      items.push(React.createElement('div', {
        key: `label-${gi}`,
        style: {
          padding: '3px 12px 2px',
          fontSize: 10,
          color: 'var(--text-muted)',
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
        },
      }, group.label));

      // Items
      for (let ii = 0; ii < group.items.length; ii++) {
        const item = group.items[ii]!;
        const itemKey = `${gi}-${ii}`;

        if (item.submenu) {
          items.push(React.createElement('div', {
            key: itemKey,
            style: { position: 'relative' },
            onMouseEnter: () => setSubmenuOpen(itemKey),
            onMouseLeave: () => setSubmenuOpen(null),
          },
            React.createElement('div', {
              style: {
                ...menuItemStyle(false, item.disabled),
                display: 'flex',
                justifyContent: 'space-between',
              },
            },
              item.label,
              React.createElement('span', { style: { marginLeft: 12, opacity: 0.5 } }, '\u25B6'),
            ),
            submenuOpen === itemKey ? React.createElement('div', {
              style: {
                position: 'absolute',
                left: '100%',
                top: 0,
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: 6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                padding: '4px 0',
                minWidth: 140,
              },
            },
              ...item.submenu.map((sub, si) =>
                React.createElement('div', {
                  key: si,
                  style: menuItemStyle(sub.danger, sub.disabled),
                  onClick: sub.disabled ? undefined : () => { sub.onClick(); onClose(); },
                }, sub.label),
              ),
            ) : null,
          ));
        } else {
          items.push(React.createElement('div', {
            key: itemKey,
            style: menuItemStyle(item.danger, item.disabled),
            onClick: item.disabled ? undefined : () => { item.onClick(); onClose(); },
          }, item.label));
        }
      }

      return items;
    }),
  );
}

function menuItemStyle(danger?: boolean, disabled?: boolean): React.CSSProperties {
  return {
    padding: '6px 12px 6px 16px',
    cursor: disabled ? 'default' : 'pointer',
    color: disabled ? 'var(--text-muted)' : danger ? '#e05252' : 'var(--text-primary)',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.1s',
    // Hover effect via CSS custom property workaround — we rely on the browser's built-in hover
  };
}
