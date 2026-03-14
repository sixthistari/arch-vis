/**
 * Shared node behaviour hook — wraps useEditableNode + hover state +
 * opacity/dimmed + connection-in-progress detection.
 *
 * All node types get consistent interaction via this single hook.
 */
import { useState, type CSSProperties } from 'react';
import { useConnection } from '@xyflow/react';
import { useEditableNode } from './useEditableNode';

interface UseNodeBehaviourOptions {
  id: string;
  label: string;
  dimmed?: boolean;
  selected?: boolean;
  theme?: 'dark' | 'light';
  onLabelChange?: (id: string, newLabel: string) => void;
}

interface UseNodeBehaviourResult {
  /** Inline label editing state */
  editing: boolean;
  editValue: string;
  setEditValue: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  handleDoubleClick: (e: React.MouseEvent) => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  /** Hover state for showing connection handles */
  isHovered: boolean;
  setIsHovered: (v: boolean) => void;
  /** Whether a connection drag is in progress */
  isConnecting: boolean;
  /** Opacity value (0.1 when dimmed, 1 otherwise) */
  opacity: number;
  /** Connector handle style — visible on hover, for user-initiated connections */
  connectorHandleStyle: (visible: boolean) => CSSProperties;
  /** Target indicator handle style — shown during connection drag */
  targetHandleStyle: (visible: boolean) => CSSProperties;
}

export function useNodeBehaviour({
  id,
  label,
  dimmed,
  onLabelChange,
}: UseNodeBehaviourOptions): UseNodeBehaviourResult {
  const { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit } =
    useEditableNode(id, label, onLabelChange);

  const [isHovered, setIsHovered] = useState(false);

  const connection = useConnection();
  const isConnecting = connection.inProgress;

  const opacity = dimmed ? 0.1 : 1;

  const connectorHandleStyle = (visible: boolean): CSSProperties => ({
    width: 12,
    height: 12,
    background: '#3B82F6',
    border: '2px solid #FFFFFF',
    borderRadius: '50%',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.15s ease',
    cursor: 'crosshair',
    zIndex: 10,
    pointerEvents: visible ? 'all' : 'none',
  });

  const targetHandleStyle = (visible: boolean): CSSProperties => ({
    width: 16,
    height: 16,
    background: 'transparent',
    border: `2px dashed ${isConnecting ? '#10B981' : 'transparent'}`,
    borderRadius: '50%',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.15s ease',
    pointerEvents: visible ? 'all' : 'none',
  });

  return {
    editing,
    editValue,
    setEditValue,
    inputRef,
    handleDoubleClick,
    commitEdit,
    cancelEdit,
    isHovered,
    setIsHovered,
    isConnecting,
    opacity,
    connectorHandleStyle,
    targetHandleStyle,
  };
}
