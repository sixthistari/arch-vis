import React from 'react';

interface EditableInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  width?: number | string;
}

export function EditableInput({
  inputRef, value, onChange, onCommit, onCancel,
  fontSize = 10, textAlign = 'left', width = '100%',
}: EditableInputProps): React.ReactElement {
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={e => {
        if (e.key === 'Enter') onCommit();
        if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      autoFocus
      style={{
        width,
        fontSize,
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#FFFFFF',
        color: '#374151',
        border: '1px solid #F59E0B',
        borderRadius: 2,
        padding: '2px 4px',
        boxSizing: 'border-box' as const,
        textAlign,
        outline: 'none',
      }}
    />
  );
}
