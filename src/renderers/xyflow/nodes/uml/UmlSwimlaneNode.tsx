/**
 * UML Swimlane (Activity Partition) node.
 *
 * Renders as a vertical column container with a header bar at the top
 * displaying the actor/role name. Children (activity nodes) nest inside
 * via parent_id. Supports resize.
 */
import { memo } from 'react';
import { type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { useNodeBehaviour } from '../../hooks/useNodeBehaviour';
import { RoutingHandles } from '../shared/RoutingHandles';

export interface UmlSwimlaneNodeData {
  label: string;
  elementId: string;
  theme?: 'dark' | 'light';
  onLabelChange?: (id: string, label: string) => void;
  [key: string]: unknown;
}

type UmlSwimlaneNodeType = Node<UmlSwimlaneNodeData, 'uml-swimlane'>;

const HEADER_HEIGHT = 32;

function UmlSwimlaneNodeComponent({ id, data, selected }: NodeProps<UmlSwimlaneNodeType>) {
  const { label, theme = 'dark', onLabelChange } = data;
  const isDark = theme === 'dark';

  const {
    editing, editValue, setEditValue, inputRef,
    handleDoubleClick, commitEdit, cancelEdit,
    isHovered: _isHovered, setIsHovered,
  } = useNodeBehaviour({ id, label, onLabelChange });

  const borderColour = selected ? '#F59E0B' : (isDark ? '#64748B' : '#94A3B8');
  const headerBg = isDark ? 'rgba(51, 65, 85, 0.7)' : 'rgba(226, 232, 240, 0.7)';
  const bodyBg = isDark ? 'rgba(30, 41, 59, 0.15)' : 'rgba(241, 245, 249, 0.2)';
  const textColour = isDark ? '#E2E8F0' : '#334155';

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
        minWidth={120}
        minHeight={200}
        lineStyle={{ borderColor: borderColour, borderWidth: 1 }}
        handleStyle={{
          width: 6,
          height: 6,
          backgroundColor: borderColour,
          borderRadius: 1,
        }}
      />

      {/* Container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          border: `1.5px dashed ${borderColour}`,
          borderRadius: 2,
          background: bodyBg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header bar */}
        <div
          style={{
            height: HEADER_HEIGHT,
            minHeight: HEADER_HEIGHT,
            background: headerBg,
            borderBottom: `1.5px dashed ${borderColour}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 8px',
            fontSize: 12,
            fontWeight: 700,
            color: textColour,
            fontFamily: 'Inter, system-ui, sans-serif',
            userSelect: 'none',
            letterSpacing: 0.3,
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
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, sans-serif',
                width: '100%',
                textAlign: 'center',
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
}

export const UmlSwimlaneNode = memo(UmlSwimlaneNodeComponent);
