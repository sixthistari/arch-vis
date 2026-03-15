/**
 * EdgeContextMenu — right-click context menu for edges, allowing
 * line type changes and deletion.
 */

export interface EdgeContextMenuState {
  edgeId: string;
  x: number;
  y: number;
}

export interface EdgeContextMenuProps {
  menu: EdgeContextMenuState;
  onSelect: (edgeId: string, action: 'straight' | 'bezier' | 'step' | 'delete') => void;
  onClose: () => void;
  theme: 'dark' | 'light';
}

export function EdgeContextMenu({ menu, onSelect, onClose, theme }: EdgeContextMenuProps) {
  const isDark = theme === 'dark';
  const bg = isDark ? '#1E293B' : '#FFFFFF';
  const border = isDark ? '#334155' : '#E2E8F0';
  const textColour = isDark ? '#E5E7EB' : '#1F2937';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';

  const items: { label: string; action: 'straight' | 'bezier' | 'step' | 'delete' }[] = [
    { label: 'Orthogonal (default)', action: 'step' },
    { label: 'Straight', action: 'straight' },
    { label: 'Curved', action: 'bezier' },
    { label: 'Delete', action: 'delete' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: menu.y,
        left: menu.x,
        zIndex: 1000,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        padding: '4px 0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        minWidth: 160,
      }}
      onMouseLeave={onClose}
    >
      {items.map((item) => (
        <div
          key={item.action}
          onClick={() => onSelect(menu.edgeId, item.action)}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: item.action === 'delete' ? '#EF4444' : textColour,
          }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.background = hoverBg; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}
