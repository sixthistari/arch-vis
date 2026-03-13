import React from 'react';

interface SelectionBadgeProps {
  name: string;
  archimateType: string;
  specialisation: string | null;
}

export function SelectionBadge({ name, archimateType, specialisation }: SelectionBadgeProps): React.ReactElement {
  return React.createElement('div', {
    style: {
      position: 'absolute',
      bottom: 60,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--panel-bg)',
      border: '1px solid var(--highlight)',
      borderRadius: 6,
      padding: '6px 14px',
      fontSize: 12,
      color: 'var(--text-primary)',
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      pointerEvents: 'none',
      zIndex: 20,
    },
  },
    React.createElement('strong', null, name),
    React.createElement('span', {
      style: { color: 'var(--text-muted)', fontSize: 10 },
    }, archimateType),
    specialisation ? React.createElement('span', {
      style: {
        background: 'var(--bg-tertiary)',
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 9,
        color: 'var(--text-secondary)',
      },
    }, specialisation) : null,
  );
}
