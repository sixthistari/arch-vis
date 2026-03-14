import type React from 'react';
import { useState, useCallback, useRef } from 'react';

/**
 * Shared inline label editing behaviour for all node types.
 * Extracts the duplicated editing state + handlers pattern.
 */
export function useEditableNode(
  id: string,
  label: string,
  onLabelChange?: (id: string, newLabel: string) => void,
) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(label);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }, [label]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label && typeof onLabelChange === 'function') {
      onLabelChange(id, trimmed);
    }
  }, [editValue, label, id, onLabelChange]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditValue(label);
  }, [label]);

  return { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit };
}
