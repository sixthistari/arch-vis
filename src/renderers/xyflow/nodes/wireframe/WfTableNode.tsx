/**
 * Wireframe Table node — data table with header row + sample rows.
 *
 * Lo-fi grid: grey header, alternating row backgrounds,
 * optional action column, sort indicators.
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';
import { useEditableNode } from '../../hooks/useEditableNode';
import { EditableInput } from '../../hooks/EditableInput';

export interface WfTableNodeData {
  label: string;
  columns: string[];
  rows?: number; // number of sample rows
  sampleData?: string[][]; // optional actual data
  hasActions?: boolean; // adds "Actions" column with button placeholders
  hasPagination?: boolean;
  hasSearch?: boolean;
  tableWidth?: number;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  [key: string]: unknown;
}

type WfTableNodeType = Node<WfTableNodeData, 'wf-table'>;

const WF_BORDER = '#D1D5DB';
const WF_HEADER_BG = '#E5E7EB';
const WF_ROW_ALT = '#F9FAFB';
const WF_TEXT = '#374151';
const WF_MUTED = '#9CA3AF';
const ROW_H = 26;
const HEADER_H = 30;
const SEARCH_H = 32;
const PAGINATION_H = 28;

function WfTableNodeComponent({ id, data, selected }: NodeProps<WfTableNodeType>) {
  const {
    label,
    columns = [],
    rows = 4,
    sampleData,
    hasActions,
    hasPagination,
    hasSearch,
    tableWidth: propWidth,
    dimmed,
    onLabelChange,
  } = data;

  const stroke = selected ? '#F59E0B' : WF_BORDER;
  const opacity = dimmed ? 0.1 : 1;

  // Inline label editing
  const { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit } = useEditableNode(id, label, onLabelChange);

  const allCols = hasActions ? [...columns, 'Actions'] : columns;
  const colCount = allCols.length || 1;
  const tableWidth = propWidth ?? Math.max(colCount * 100, 300);
  const colW = tableWidth / colCount;

  const searchOffset = hasSearch ? SEARCH_H : 0;
  const bodyH = rows * ROW_H;
  const paginationOffset = hasPagination ? PAGINATION_H : 0;
  const totalH = searchOffset + HEADER_H + bodyH + paginationOffset;

  return (
    <div style={{ opacity, position: 'relative' as const }} onDoubleClick={handleDoubleClick}>
      {editing && (
        <div style={{ position: 'absolute', top: -24, left: 0, width: tableWidth, zIndex: 10 }}>
          <EditableInput
            inputRef={inputRef}
            value={editValue}
            onChange={setEditValue}
            onCommit={commitEdit}
            onCancel={cancelEdit}
            fontSize={10}
          />
        </div>
      )}
      <svg width={tableWidth} height={totalH} overflow="visible">
        {/* Outer border */}
        <rect x={0} y={0} width={tableWidth} height={totalH} rx={4} stroke={stroke} fill="white" strokeWidth={1} />

        {/* Search bar */}
        {hasSearch && (
          <>
            <rect x={8} y={6} width={tableWidth * 0.4} height={SEARCH_H - 12} rx={3} stroke={WF_BORDER} fill="white" strokeWidth={0.8} />
            <text x={18} y={SEARCH_H / 2 + 1} dominantBaseline="central" fontSize={9} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif">
              🔍 Search {label}...
            </text>
          </>
        )}

        {/* Header row */}
        <rect x={1} y={searchOffset} width={tableWidth - 2} height={HEADER_H} fill={WF_HEADER_BG} />
        {allCols.map((col, i) => (
          <g key={`h-${i}`}>
            <text
              x={i * colW + colW / 2} y={searchOffset + HEADER_H / 2 + 1}
              textAnchor="middle" dominantBaseline="central"
              fontSize={10} fontWeight={600} fill={WF_TEXT}
              fontFamily="Inter, system-ui, sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              {col}
            </text>
            {/* Column separator */}
            {i < allCols.length - 1 && (
              <line x1={(i + 1) * colW} y1={searchOffset} x2={(i + 1) * colW} y2={searchOffset + HEADER_H + bodyH} stroke={WF_BORDER} strokeWidth={0.5} />
            )}
          </g>
        ))}
        <line x1={0} y1={searchOffset + HEADER_H} x2={tableWidth} y2={searchOffset + HEADER_H} stroke={WF_BORDER} strokeWidth={1} />

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => {
          const y = searchOffset + HEADER_H + rowIdx * ROW_H;
          const isAlt = rowIdx % 2 === 1;
          return (
            <g key={`r-${rowIdx}`}>
              {isAlt && <rect x={1} y={y} width={tableWidth - 2} height={ROW_H} fill={WF_ROW_ALT} />}
              {allCols.map((col, colIdx) => {
                const cellX = colIdx * colW + colW / 2;
                const cellY = y + ROW_H / 2 + 1;

                // Sample data or placeholder
                let cellText: string;
                if (sampleData && sampleData[rowIdx] && sampleData[rowIdx][colIdx]) {
                  cellText = sampleData[rowIdx][colIdx];
                } else if (col === 'Actions') {
                  cellText = '[ Edit ] [ Delete ]';
                } else {
                  cellText = `${col} ${rowIdx + 1}`;
                }

                return (
                  <text
                    key={`c-${colIdx}`}
                    x={cellX} y={cellY}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={9} fill={col === 'Actions' ? '#6B7280' : WF_MUTED}
                    fontFamily={col === 'Actions' ? "'JetBrains Mono', monospace" : "Inter, system-ui, sans-serif"}
                    style={{ pointerEvents: 'none' }}
                  >
                    {cellText}
                  </text>
                );
              })}
              {/* Row separator */}
              <line x1={0} y1={y + ROW_H} x2={tableWidth} y2={y + ROW_H} stroke={WF_BORDER} strokeWidth={0.3} />
            </g>
          );
        })}

        {/* Pagination */}
        {hasPagination && (
          <>
            <line x1={0} y1={totalH - PAGINATION_H} x2={tableWidth} y2={totalH - PAGINATION_H} stroke={WF_BORDER} strokeWidth={0.5} />
            <text
              x={tableWidth / 2} y={totalH - PAGINATION_H / 2 + 1}
              textAnchor="middle" dominantBaseline="central"
              fontSize={9} fill={WF_MUTED}
              fontFamily="Inter, system-ui, sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              ‹ 1 2 3 ... 10 ›
            </text>
          </>
        )}
      </svg>

      <RoutingHandles />
    </div>
  );
}

export const WfTableNode = memo(WfTableNodeComponent);
