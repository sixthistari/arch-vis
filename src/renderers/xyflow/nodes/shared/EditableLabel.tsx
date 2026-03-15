/**
 * EditableLabel — shared inline label editing component for container nodes.
 *
 * Handles input element with consistent styling, keyboard commit (Enter),
 * cancel (Escape), and blur-to-commit. Theme-aware colours.
 */
import React, { memo } from 'react';

export interface EditableLabelProps {
  editing: boolean;
  label: string;
  editValue: string;
  setEditValue: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  commitEdit: () => void;
  cancelEdit: () => void;
  colour: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: 'left' | 'center' | 'right';
}

export const EditableLabel = memo(function EditableLabel({
  editing,
  label,
  editValue,
  setEditValue,
  inputRef,
  commitEdit,
  cancelEdit,
  colour,
  fontSize = 11,
  fontWeight = 600,
  textAlign,
}: EditableLabelProps) {
  if (!editing) {
    return <>{label}</>;
  }

  return (
    <input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') cancelEdit();
      }}
      onBlur={commitEdit}
      style={{
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: colour,
        fontSize,
        fontWeight,
        fontFamily: 'Inter, system-ui, sans-serif',
        width: '100%',
        padding: 0,
        textAlign,
      }}
    />
  );
});
