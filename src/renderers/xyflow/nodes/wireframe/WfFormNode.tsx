/**
 * Wireframe Form node — renders a form layout with labeled fields.
 *
 * Each field has a label, type, and optional placeholder.
 * Submit/cancel buttons at bottom.
 */
import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { RoutingHandles } from '../shared/RoutingHandles';
import { useEditableNode } from '../../hooks/useEditableNode';
import { EditableInput } from '../../hooks/EditableInput';

export type WfFieldType = 'text' | 'email' | 'password' | 'number' | 'date' |
  'select' | 'textarea' | 'file' | 'checkbox' | 'radio' | 'toggle' | 'search';

export interface WfFormField {
  name: string;
  type: WfFieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select, radio
}

export interface WfFormNodeData {
  label: string;
  fields: WfFormField[];
  submitLabel?: string;
  cancelLabel?: string;
  formWidth?: number;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  onLabelChange?: (id: string, newLabel: string) => void;
  [key: string]: unknown;
}

type WfFormNodeType = Node<WfFormNodeData, 'wf-form'>;

const WF_BORDER = '#D1D5DB';
const WF_TEXT = '#374151';
const WF_MUTED = '#9CA3AF';
const WF_INPUT_BG = 'white';
const FIELD_H = 24;
const LABEL_H = 16;
const FIELD_GAP = 6;
const PAD = 12;
const TEXTAREA_H = 56;
const BUTTON_H = 30;
const CHECKBOX_SIZE = 12;

function renderField(field: WfFormField, x: number, y: number, w: number): JSX.Element {
  const inputW = w - PAD * 2;
  const inputX = x + PAD;
  const labelY = y;
  const fieldY = y + LABEL_H;

  const label = (
    <text
      x={inputX} y={labelY + LABEL_H * 0.7}
      fontSize={9} fontWeight={500} fill={WF_TEXT}
      fontFamily="Inter, system-ui, sans-serif"
      style={{ pointerEvents: 'none' }}
    >
      {field.name}{field.required ? ' *' : ''}
    </text>
  );

  switch (field.type) {
    case 'textarea':
      return (
        <g>
          {label}
          <rect x={inputX} y={fieldY} width={inputW} height={TEXTAREA_H} rx={3} stroke={WF_BORDER} fill={WF_INPUT_BG} strokeWidth={0.8} />
          <text x={inputX + 6} y={fieldY + 14} fontSize={9} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {field.placeholder ?? `Enter ${field.name.toLowerCase()}...`}
          </text>
        </g>
      );

    case 'select':
      return (
        <g>
          {label}
          <rect x={inputX} y={fieldY} width={inputW} height={FIELD_H} rx={3} stroke={WF_BORDER} fill={WF_INPUT_BG} strokeWidth={0.8} />
          <text x={inputX + 6} y={fieldY + FIELD_H / 2 + 1} dominantBaseline="central" fontSize={9} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {field.placeholder ?? `Select ${field.name.toLowerCase()}...`}
          </text>
          <text x={inputX + inputW - 14} y={fieldY + FIELD_H / 2 + 1} dominantBaseline="central" fontSize={10} fill={WF_MUTED}>▾</text>
        </g>
      );

    case 'checkbox':
      return (
        <g>
          <rect x={inputX} y={labelY + 2} width={CHECKBOX_SIZE} height={CHECKBOX_SIZE} rx={2} stroke={WF_BORDER} fill={WF_INPUT_BG} strokeWidth={0.8} />
          <text x={inputX + CHECKBOX_SIZE + 6} y={labelY + CHECKBOX_SIZE / 2 + 3} dominantBaseline="central" fontSize={10} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {field.name}
          </text>
        </g>
      );

    case 'radio':
      return (
        <g>
          {label}
          {(field.options ?? ['Option 1', 'Option 2']).map((opt, i) => (
            <g key={i}>
              <circle cx={inputX + 6} cy={fieldY + i * 18 + 8} r={5} stroke={WF_BORDER} fill={i === 0 ? WF_BORDER : WF_INPUT_BG} strokeWidth={0.8} />
              <text x={inputX + 16} y={fieldY + i * 18 + 9} dominantBaseline="central" fontSize={9} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                {opt}
              </text>
            </g>
          ))}
        </g>
      );

    case 'toggle':
      return (
        <g>
          <rect x={inputX} y={labelY + 2} width={28} height={14} rx={7} stroke={WF_BORDER} fill={WF_INPUT_BG} strokeWidth={0.8} />
          <circle cx={inputX + 8} cy={labelY + 9} r={5} fill={WF_BORDER} />
          <text x={inputX + 34} y={labelY + 10} dominantBaseline="central" fontSize={10} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {field.name}
          </text>
        </g>
      );

    case 'file':
      return (
        <g>
          {label}
          <rect x={inputX} y={fieldY} width={inputW} height={FIELD_H} rx={3} stroke={WF_BORDER} fill={WF_INPUT_BG} strokeWidth={0.8} strokeDasharray="4 2" />
          <text x={inputX + inputW / 2} y={fieldY + FIELD_H / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={9} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            📎 Choose file or drag here
          </text>
        </g>
      );

    default: // text, email, password, number, date, search
      return (
        <g>
          {label}
          <rect x={inputX} y={fieldY} width={inputW} height={FIELD_H} rx={3} stroke={WF_BORDER} fill={WF_INPUT_BG} strokeWidth={0.8} />
          <text x={inputX + 6} y={fieldY + FIELD_H / 2 + 1} dominantBaseline="central" fontSize={9} fill={WF_MUTED} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
            {field.type === 'password' ? '••••••••' : field.placeholder ?? `Enter ${field.name.toLowerCase()}...`}
          </text>
          {field.type === 'date' && (
            <text x={inputX + inputW - 14} y={fieldY + FIELD_H / 2 + 1} dominantBaseline="central" fontSize={10} fill={WF_MUTED}>📅</text>
          )}
          {field.type === 'search' && (
            <text x={inputX + 6} y={fieldY + FIELD_H / 2 + 1} dominantBaseline="central" fontSize={10} fill={WF_MUTED}>🔍</text>
          )}
        </g>
      );
  }
}

function getFieldHeight(field: WfFormField): number {
  if (field.type === 'textarea') return LABEL_H + TEXTAREA_H + FIELD_GAP;
  if (field.type === 'checkbox' || field.type === 'toggle') return CHECKBOX_SIZE + FIELD_GAP + 4;
  if (field.type === 'radio') return LABEL_H + (field.options?.length ?? 2) * 18 + FIELD_GAP;
  return LABEL_H + FIELD_H + FIELD_GAP;
}

function WfFormNodeComponent({ id, data, selected }: NodeProps<WfFormNodeType>) {
  const {
    label,
    fields = [],
    submitLabel = 'Submit',
    cancelLabel,
    formWidth = 320,
    dimmed,
    onLabelChange,
  } = data;

  const stroke = selected ? '#F59E0B' : WF_BORDER;
  const opacity = dimmed ? 0.1 : 1;

  // Inline label editing
  const { editing, editValue, setEditValue, inputRef, handleDoubleClick, commitEdit, cancelEdit } = useEditableNode(id, label, onLabelChange);

  // Calculate total height
  let contentH = PAD;
  const fieldPositions: number[] = [];
  for (let fi = 0; fi < fields.length; fi++) {
    fieldPositions.push(contentH);
    contentH += getFieldHeight(fields[fi]!);
  }
  contentH += BUTTON_H + PAD;
  const totalH = contentH;

  return (
    <div style={{ opacity, position: 'relative' as const }} onDoubleClick={handleDoubleClick}>
      {editing && (
        <div style={{ position: 'absolute', top: -24, left: 0, width: formWidth, zIndex: 10 }}>
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
      <svg width={formWidth} height={totalH} overflow="visible">
        {/* Form border */}
        <rect x={0} y={0} width={formWidth} height={totalH} rx={4} stroke={stroke} fill="#FAFAFA" strokeWidth={1} />

        {/* Fields */}
        {fields.map((field, i) => (
          <g key={i}>
            {renderField(field, 0, fieldPositions[i] ?? 0, formWidth)}
          </g>
        ))}

        {/* Buttons */}
        {(() => {
          const btnY = totalH - BUTTON_H - PAD + 4;
          const btnW = cancelLabel ? (formWidth - PAD * 3) / 2 : formWidth - PAD * 2;
          return (
            <g>
              {/* Submit button — primary (slightly darker) */}
              <rect x={PAD} y={btnY} width={btnW} height={BUTTON_H - 4} rx={4} fill="#374151" stroke="none" />
              <text x={PAD + btnW / 2} y={btnY + (BUTTON_H - 4) / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600} fill="white" fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                {submitLabel}
              </text>

              {/* Cancel button */}
              {cancelLabel && (
                <>
                  <rect x={PAD * 2 + btnW} y={btnY} width={btnW} height={BUTTON_H - 4} rx={4} fill="white" stroke={WF_BORDER} strokeWidth={0.8} />
                  <text x={PAD * 2 + btnW + btnW / 2} y={btnY + (BUTTON_H - 4) / 2 + 1} textAnchor="middle" dominantBaseline="central" fontSize={10} fill={WF_TEXT} fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                    {cancelLabel}
                  </text>
                </>
              )}
            </g>
          );
        })()}
      </svg>

      <RoutingHandles />
    </div>
  );
}

export const WfFormNode = memo(WfFormNodeComponent);
