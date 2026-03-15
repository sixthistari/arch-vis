/**
 * UML Package diagram node.
 *
 * Tab-rectangle: a small tab/flap at top-left with the package name,
 * and a larger body below for nesting children via parent_id.
 * Supports resize (NodeResizer) and inline editing (useNodeBehaviour).
 */
import { memo } from 'react';
import { type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { useNodeBehaviour } from '../../hooks/useNodeBehaviour';
import { RoutingHandles } from '../shared/RoutingHandles';
import { EditableLabel } from '../shared/EditableLabel';
import { getContainerColours } from '../../../../notation/theme-colours';

export interface UmlPackageNodeData {
  label: string;
  elementId: string;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  onLabelChange?: (id: string, label: string) => void;
  [key: string]: unknown;
}

type UmlPackageNodeType = Node<UmlPackageNodeData, 'uml-package'>;

const TAB_HEIGHT = 28;
const TAB_WIDTH_RATIO = 0.4; // tab is ~40% of the node width

export const UmlPackageNode = memo(function UmlPackageNode({
  id,
  data,
  selected,
}: NodeProps<UmlPackageNodeType>) {
  const { label, theme = 'dark', dimmed, onLabelChange } = data;

  const {
    editing, editValue, setEditValue, inputRef,
    handleDoubleClick, commitEdit, cancelEdit,
    isHovered: _isHovered, setIsHovered,
    opacity,
  } = useNodeBehaviour({ id, label, dimmed, onLabelChange });

  const { stroke, fill, text: textColour, tabBg } = getContainerColours(theme, selected);

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', opacity }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        lineStyle={{ borderColor: stroke, borderWidth: 1 }}
        handleStyle={{
          width: 6,
          height: 6,
          backgroundColor: stroke,
          borderRadius: 1,
        }}
      />

      {/* Tab at top-left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${TAB_WIDTH_RATIO * 100}%`,
          height: TAB_HEIGHT,
          background: tabBg,
          border: `1.5px solid ${stroke}`,
          borderBottom: 'none',
          borderRadius: '4px 4px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 8px',
          boxSizing: 'border-box',
          userSelect: 'none',
          overflow: 'hidden',
        }}
        onDoubleClick={handleDoubleClick}
      >
        {editing ? (
          <EditableLabel
            editing={editing}
            label={label}
            editValue={editValue}
            setEditValue={setEditValue}
            inputRef={inputRef}
            commitEdit={commitEdit}
            cancelEdit={cancelEdit}
            colour={textColour}
            textAlign="center"
          />
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: textColour,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </span>
        )}
      </div>

      {/* Body rectangle */}
      <div
        style={{
          position: 'absolute',
          top: TAB_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          border: `1.5px solid ${stroke}`,
          borderRadius: '0 4px 4px 4px',
          background: fill,
        }}
      />

      <RoutingHandles />
    </div>
  );
});
