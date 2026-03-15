/**
 * GroupNode — visual container for grouping elements on the canvas.
 *
 * Renders as a transparent container with a dashed border and a label tab.
 * Children are nested inside via parent_id. Supports resize.
 * Used for both ArchiMate 'grouping' elements and generic visual groups.
 */
import { memo } from 'react';
import { type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { useNodeBehaviour } from '../hooks/useNodeBehaviour';
import { RoutingHandles } from './shared/RoutingHandles';
import { getLayerColours } from '../../../notation/colors';

export interface GroupNodeData {
  label: string;
  elementId: string;
  layer?: string;
  theme?: 'dark' | 'light';
  onLabelChange?: (id: string, label: string) => void;
  [key: string]: unknown;
}

type GroupNodeType = Node<GroupNodeData>;

export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps<GroupNodeType>) {
  const { label, layer, theme = 'dark', onLabelChange } = data;
  const isDark = theme === 'dark';

  const {
    editing, editValue, setEditValue, inputRef,
    handleDoubleClick, commitEdit, cancelEdit,
    isHovered: _isHovered, setIsHovered,
  } = useNodeBehaviour({
    id,
    label,
    onLabelChange,
  });

  // Use layer colour if available, otherwise neutral
  const colours = layer ? getLayerColours(layer, theme) : null;
  const borderColour = colours?.stroke ?? (isDark ? '#475569' : '#94A3B8');
  const bgColour = isDark ? 'rgba(30, 41, 59, 0.3)' : 'rgba(241, 245, 249, 0.3)';
  const tabBg = isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.6)';
  const textColour = isDark ? '#CBD5E1' : '#475569';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={100}
        minHeight={60}
        lineStyle={{ borderColor: borderColour, borderWidth: 1 }}
        handleStyle={{
          width: 6,
          height: 6,
          backgroundColor: borderColour,
          borderRadius: 1,
        }}
      />

      {/* Container body */}
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `1.5px dashed ${borderColour}`,
          borderRadius: 4,
          background: bgColour,
          position: 'relative',
        }}
      >
        {/* Label tab */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            background: tabBg,
            borderRight: `1.5px dashed ${borderColour}`,
            borderBottom: `1.5px dashed ${borderColour}`,
            borderRadius: '4px 0 4px 0',
            padding: '2px 10px 3px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: textColour,
            fontFamily: 'Inter, system-ui, sans-serif',
            userSelect: 'none',
            maxWidth: '80%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          onDoubleClick={handleDoubleClick}
        >
          {editing ? (
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
                color: textColour,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'Inter, system-ui, sans-serif',
                width: '100%',
                padding: 0,
              }}
            />
          ) : (
            label
          )}
        </div>
      </div>

      <RoutingHandles />
    </div>
  );
});
