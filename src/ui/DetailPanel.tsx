import React, { useState, useCallback, useEffect } from 'react';
import type { Element, Relationship, ViewElement, ProcessStep } from '../model/types';
import { elementStatusValues, SPECIALISATION_CATEGORIES, specialisationLabel } from '../model/types';
import { useModelStore } from '../store/model';
import { ImpactAnalysisPanel } from './ImpactAnalysisPanel';
import { fetchProcessSteps, updateProcessStep } from '../api/client';

interface DetailPanelProps {
  element: Element;
  relationships: Relationship[];
  elements: Element[];
  onClose: () => void;
  onNavigate: (elementId: string) => void;
  onDelete: (elementId: string) => void;
  viewId: string | null;
  viewElements: ViewElement[];
  savePositions: (viewId: string, elements: ViewElement[]) => Promise<void>;
}

type Tab = 'properties' | 'relationships' | 'provenance';

const UML_CLASS_TYPES = ['uml-class', 'uml-abstract-class', 'uml-interface', 'uml-enum'];

interface DraftMember {
  name: string;
  type: string;
  visibility: string;
}

const VISIBILITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '+', label: '+ public' },
  { value: '-', label: '- private' },
  { value: '#', label: '# protected' },
  { value: '~', label: '~ package' },
];

export function DetailPanel({ element, relationships, elements, onClose, onNavigate, onDelete, viewId, viewElements, savePositions }: DetailPanelProps): React.ReactElement {
  const [tab, setTab] = useState<Tab>('properties');
  const [editing, setEditing] = useState(false);
  const [impactOpen, setImpactOpen] = useState(false);
  const [draft, setDraft] = useState<{ name: string; description: string; status: string; layer: string; sublayer: string; specialisation: string }>({
    name: element.name,
    description: element.description ?? '',
    status: element.status,
    layer: element.layer,
    sublayer: element.sublayer ?? '',
    specialisation: element.specialisation ?? '',
  });
  const [draftAttributes, setDraftAttributes] = useState<DraftMember[]>([]);
  const [draftMethods, setDraftMethods] = useState<DraftMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [appearanceFill, setAppearanceFill] = useState('');
  const [appearanceStroke, setAppearanceStroke] = useState('');
  const updateElement = useModelStore(s => s.updateElement);

  // Resolve current view element for this element
  const currentVe = viewElements.find(ve => ve.element_id === element.id);

  // Sync appearance fields when element or view element changes
  useEffect(() => {
    const so = currentVe?.style_overrides as Record<string, string> | null | undefined;
    setAppearanceFill(so?.fill ?? '');
    setAppearanceStroke(so?.stroke ?? '');
  }, [element.id, currentVe?.style_overrides]);

  const handleAppearanceSave = useCallback(async (fill: string, stroke: string) => {
    if (!viewId || !currentVe) return;
    const overrides: Record<string, string> = {};
    if (fill) overrides.fill = fill;
    if (stroke) overrides.stroke = stroke;
    const updated = viewElements.map(ve =>
      ve.element_id === element.id
        ? { ...ve, style_overrides: Object.keys(overrides).length > 0 ? overrides : null }
        : ve,
    );
    await savePositions(viewId, updated);
  }, [viewId, currentVe, viewElements, element.id, savePositions]);

  const handleAppearanceReset = useCallback(async () => {
    setAppearanceFill('');
    setAppearanceStroke('');
    await handleAppearanceSave('', '');
  }, [handleAppearanceSave]);

  const isUmlClass = UML_CLASS_TYPES.includes(element.archimate_type);
  const isUmlEnum = element.archimate_type === 'uml-enum';
  const isProcessFlow = element.archimate_type.startsWith('pf-');
  const [processStep, setProcessStep] = useState<ProcessStep | null>(null);
  const [draftStep, setDraftStep] = useState<Partial<ProcessStep> | null>(null);

  // Reset draft when element changes
  useEffect(() => {
    setDraft({
      name: element.name,
      description: element.description ?? '',
      status: element.status,
      layer: element.layer,
      sublayer: element.sublayer ?? '',
      specialisation: element.specialisation ?? '',
    });
    setEditing(false);
    setDraftStep(null);
  }, [element.id, element.name, element.description, element.status, element.layer, element.sublayer, element.specialisation]);

  // Fetch process step data when a pf-* element is selected
  useEffect(() => {
    if (!isProcessFlow) { setProcessStep(null); return; }
    // Try to find process step by matching name + parent
    const parentId = element.parent_id;
    if (parentId) {
      fetchProcessSteps(parentId).then(steps => {
        const match = steps.find(s => s.name === element.name);
        setProcessStep(match ?? null);
      }).catch(() => setProcessStep(null));
    } else {
      setProcessStep(null);
    }
  }, [element.id, element.name, element.parent_id, isProcessFlow]);

  // Initialise UML member drafts from element properties
  useEffect(() => {
    if (isUmlClass) {
      const props = (element.properties ?? {}) as Record<string, unknown>;
      const attrs = (props.attributes as Array<Record<string, unknown>>) ?? [];
      const meths = (props.methods as Array<Record<string, unknown>>) ?? [];
      setDraftAttributes(attrs.map(a => ({
        name: String(a.name ?? ''),
        type: String(a.type ?? ''),
        visibility: String(a.visibility ?? '+'),
      })));
      setDraftMethods(meths.map(m => ({
        name: String(m.name ?? ''),
        type: String(m.returnType ?? ''),
        visibility: String(m.visibility ?? '+'),
      })));
    }
  }, [element.id, element.properties, isUmlClass]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        name: draft.name,
        description: draft.description || null,
        status: draft.status,
        layer: draft.layer,
        sublayer: draft.sublayer || null,
        specialisation: draft.specialisation || null,
      };
      if (isUmlClass) {
        const existingProps = (element.properties as Record<string, unknown>) ?? {};
        if (isUmlEnum) {
          // For enums, methods list holds enum values (name only)
          updateData.properties = {
            ...existingProps,
            attributes: draftAttributes.map(a => ({ name: a.name, type: a.type || undefined, visibility: a.visibility })),
            methods: draftMethods.map(m => ({ name: m.name })),
          };
        } else {
          updateData.properties = {
            ...existingProps,
            attributes: draftAttributes.map(a => ({ name: a.name, type: a.type || undefined, visibility: a.visibility })),
            methods: draftMethods.map(m => ({ name: m.name, returnType: m.type || undefined, visibility: m.visibility })),
          };
        }
      }
      await updateElement(element.id, updateData);
      // Save process step fields if editing
      if (draftStep && processStep) {
        const stepUpdate: Record<string, unknown> = { ...draftStep };
        // Convert comma-separated strings back to arrays
        if (typeof stepUpdate.input_objects === 'string') {
          stepUpdate.input_objects = (stepUpdate.input_objects as string).split(',').map(s => s.trim()).filter(Boolean);
        }
        if (typeof stepUpdate.output_objects === 'string') {
          stepUpdate.output_objects = (stepUpdate.output_objects as string).split(',').map(s => s.trim()).filter(Boolean);
        }
        const updated = await updateProcessStep(processStep.id, stepUpdate as Partial<Omit<ProcessStep, 'id' | 'process_id' | 'sequence'>>);
        setProcessStep(updated);
        setDraftStep(null);
      }
      setEditing(false);
    } catch (err) {
      console.error('Failed to save element:', err);
    } finally {
      setSaving(false);
    }
  }, [element.id, draft, updateElement, isUmlClass, isUmlEnum, draftAttributes, draftMethods, element.properties, draftStep, processStep]);

  const handleCancel = useCallback(() => {
    setDraft({
      name: element.name,
      description: element.description ?? '',
      status: element.status,
      layer: element.layer,
      sublayer: element.sublayer ?? '',
      specialisation: element.specialisation ?? '',
    });
    setDraftStep(null);
    setEditing(false);
  }, [element]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete "${element.name}"? This will also remove all its relationships.`)) {
      onDelete(element.id);
    }
  }, [element, onDelete]);

  const incoming = relationships.filter(r => r.target_id === element.id);
  const outgoing = relationships.filter(r => r.source_id === element.id);
  const elementMap = new Map(elements.map(e => [e.id, e]));

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--bg-tertiary)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
    border: 'none',
    borderBottom: active ? '2px solid var(--highlight)' : '2px solid transparent',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 11,
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 6px',
    fontSize: 11,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 3,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: 10,
    borderRadius: 3,
    border: '1px solid var(--border-primary)',
    cursor: 'pointer',
    background: 'var(--button-bg, #333)',
    color: 'var(--button-fg, #ccc)',
  };

  return React.createElement(React.Fragment, null,
    impactOpen && React.createElement(ImpactAnalysisPanel, {
      element,
      onClose: () => setImpactOpen(false),
      onNavigate: (id: string) => { setImpactOpen(false); onNavigate(id); },
    }),
    React.createElement('div', {
    style: {
      width: '100%',
      height: '100%',
      background: 'var(--panel-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
  },
    // Header
    React.createElement('div', {
      style: {
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      },
    },
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', {
          style: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2, wordBreak: 'break-word' },
        }, element.name),
        React.createElement('div', {
          style: { fontSize: 10, color: 'var(--text-muted)' },
        }, element.archimate_type),
        element.specialisation ? React.createElement('span', {
          style: {
            fontSize: 9,
            background: 'var(--bg-tertiary)',
            padding: '1px 5px',
            borderRadius: 3,
            marginLeft: 6,
            color: 'var(--text-secondary)',
          },
        }, element.specialisation) : null,
      ),
      React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 6, flexShrink: 0 } },
        React.createElement('button', {
          onClick: () => setImpactOpen(true),
          title: 'Impact Analysis',
          style: {
            padding: '3px 8px',
            fontSize: 10,
            borderRadius: 3,
            border: '1px solid var(--border-primary)',
            cursor: 'pointer',
            background: 'var(--button-bg, #333)',
            color: 'var(--button-fg, #ccc)',
            whiteSpace: 'nowrap',
          },
        }, 'Impact Analysis'),
        React.createElement('button', {
          onClick: onClose,
          style: {
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
            flexShrink: 0,
          },
        }, '\u00D7'),
      ),
    ),

    // Tabs
    React.createElement('div', {
      style: { display: 'flex', borderBottom: '1px solid var(--border-secondary)' },
    },
      React.createElement('button', { onClick: () => setTab('properties'), style: tabStyle(tab === 'properties') }, 'Properties'),
      React.createElement('button', { onClick: () => setTab('relationships'), style: tabStyle(tab === 'relationships') }, `Relationships (${incoming.length + outgoing.length})`),
      React.createElement('button', { onClick: () => setTab('provenance'), style: tabStyle(tab === 'provenance') }, 'Provenance'),
    ),

    // Content
    React.createElement('div', {
      style: { flex: 1, overflow: 'auto', padding: 14, fontSize: 11 },
    },
      tab === 'properties'
        ? (editing
          ? React.createElement(React.Fragment, null,
              renderEditForm(draft, setDraft, inputStyle),
              isUmlClass ? renderUmlMemberEditor(
                isUmlEnum, draftAttributes, setDraftAttributes, draftMethods, setDraftMethods, inputStyle,
              ) : null,
              isProcessFlow && draftStep ? renderProcessStepEditable(draftStep, setDraftStep, inputStyle) : null,
              viewId ? renderAppearanceSection(appearanceFill, setAppearanceFill, appearanceStroke, setAppearanceStroke, handleAppearanceSave, handleAppearanceReset, inputStyle) : null,
            )
          : React.createElement(React.Fragment, null,
              renderProperties(element),
              isUmlClass ? renderUmlMembers(element, isUmlEnum) : null,
              isProcessFlow && processStep ? renderProcessStepInfo(processStep) : null,
              viewId ? renderAppearanceSection(appearanceFill, setAppearanceFill, appearanceStroke, setAppearanceStroke, handleAppearanceSave, handleAppearanceReset, inputStyle) : null,
            ))
        : tab === 'relationships'
          ? renderRelationships(incoming, outgoing, elementMap, onNavigate)
          : renderProvenance(element),
    ),

    // Footer actions
    tab === 'properties' ? React.createElement('div', {
      style: {
        padding: '8px 14px',
        borderTop: '1px solid var(--border-secondary)',
        display: 'flex',
        gap: 6,
        justifyContent: 'space-between',
      },
    },
      React.createElement('div', { style: { display: 'flex', gap: 6 } },
        editing
          ? React.createElement(React.Fragment, null,
              React.createElement('button', {
                onClick: handleSave,
                disabled: saving || !draft.name.trim(),
                style: { ...btnStyle, background: 'var(--highlight, #4a9eff)', color: '#fff', opacity: saving ? 0.6 : 1 },
              }, saving ? 'Saving\u2026' : 'Save'),
              React.createElement('button', {
                onClick: handleCancel,
                style: btnStyle,
              }, 'Cancel'),
            )
          : React.createElement('button', {
              onClick: () => {
                setEditing(true);
                if (processStep) {
                  setDraftStep({
                    step_type: processStep.step_type,
                    role_id: processStep.role_id,
                    agent_id: processStep.agent_id,
                    agent_autonomy: processStep.agent_autonomy,
                    description: processStep.description,
                    approval_required: processStep.approval_required,
                    track_crossing: processStep.track_crossing,
                    input_objects: processStep.input_objects,
                    output_objects: processStep.output_objects,
                  });
                }
              },
              style: btnStyle,
            }, 'Edit'),
      ),
      React.createElement('button', {
        onClick: handleDelete,
        style: { ...btnStyle, color: '#e05252', borderColor: '#e0525244' },
      }, 'Delete'),
    ) : null,
  ),
  );
}

function renderProperties(element: Element): React.ReactElement {
  const rows: Array<[string, string]> = [
    ['Name', element.name],
    ['Type', element.archimate_type],
    ['Specialisation', element.specialisation ? specialisationLabel(element.specialisation) : '\u2014'],
    ['Layer', element.layer],
    ['Sublayer', element.sublayer ?? '\u2014'],
    ['Status', element.status],
    ['Domain', element.domain_id ?? '\u2014'],
    ['Description', element.description ?? '\u2014'],
  ];

  const propEntries = element.properties ? Object.entries(element.properties as Record<string, unknown>) : [];

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    ...rows.map(([label, value]) =>
      React.createElement('div', { key: label },
        React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' } }, label),
        React.createElement('div', { style: { color: 'var(--text-primary)', wordBreak: 'break-word' } }, value),
      ),
    ),
    propEntries.length > 0 ? React.createElement('div', { style: { marginTop: 8 } },
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 4 } }, 'Custom Properties'),
      ...propEntries.map(([key, val]) =>
        React.createElement('div', { key, style: { marginBottom: 4 } },
          React.createElement('span', { style: { color: 'var(--text-secondary)' } }, `${key}: `),
          React.createElement('span', { style: { color: 'var(--text-primary)' } }, JSON.stringify(val)),
        ),
      ),
    ) : null,
  );
}

function renderEditForm(
  draft: { name: string; description: string; status: string; layer: string; sublayer: string; specialisation: string },
  setDraft: React.Dispatch<React.SetStateAction<typeof draft>>,
  inputStyle: React.CSSProperties,
): React.ReactElement {
  const fieldRow = (label: string, child: React.ReactElement) =>
    React.createElement('div', { key: label, style: { marginBottom: 8 } },
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 2 } }, label),
      child,
    );

  // Build specialisation options grouped by category
  const specOptions: React.ReactElement[] = [
    React.createElement('option', { key: '__none', value: '' }, '\u2014 None'),
  ];
  for (const [category, slugs] of Object.entries(SPECIALISATION_CATEGORIES)) {
    specOptions.push(
      React.createElement('optgroup', { key: category, label: category },
        ...slugs.map(slug =>
          React.createElement('option', { key: slug, value: slug }, specialisationLabel(slug)),
        ),
      ),
    );
  }
  // If current value is custom (not in predefined), add it as an option
  if (draft.specialisation && !Object.values(SPECIALISATION_CATEGORIES).flat().includes(draft.specialisation)) {
    specOptions.push(
      React.createElement('optgroup', { key: 'custom', label: 'Custom' },
        React.createElement('option', { key: draft.specialisation, value: draft.specialisation }, specialisationLabel(draft.specialisation)),
      ),
    );
  }

  return React.createElement('div', null,
    fieldRow('Name',
      React.createElement('input', {
        value: draft.name,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, name: e.target.value })),
        style: inputStyle,
      }),
    ),
    fieldRow('Specialisation',
      React.createElement('div', { style: { display: 'flex', gap: 4, alignItems: 'center' } },
        React.createElement('select', {
          value: draft.specialisation,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setDraft(d => ({ ...d, specialisation: e.target.value })),
          style: { ...inputStyle, flex: 1, appearance: 'auto' as React.CSSProperties['appearance'] },
        }, ...specOptions),
        draft.specialisation ? React.createElement('button', {
          onClick: () => setDraft(d => ({ ...d, specialisation: '' })),
          title: 'Clear specialisation',
          style: {
            padding: '2px 6px',
            fontSize: 10,
            borderRadius: 3,
            border: '1px solid var(--border-primary)',
            cursor: 'pointer',
            background: 'var(--button-bg, #333)',
            color: 'var(--button-fg, #ccc)',
            flexShrink: 0,
          },
        }, 'Clear') : null,
      ),
    ),
    fieldRow('Status',
      React.createElement('select', {
        value: draft.status,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setDraft(d => ({ ...d, status: e.target.value })),
        style: { ...inputStyle, appearance: 'auto' as React.CSSProperties['appearance'] },
      },
        ...elementStatusValues.map(s =>
          React.createElement('option', { key: s, value: s }, s.charAt(0).toUpperCase() + s.slice(1)),
        ),
      ),
    ),
    fieldRow('Layer',
      React.createElement('input', {
        value: draft.layer,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, layer: e.target.value })),
        style: inputStyle,
      }),
    ),
    fieldRow('Sublayer',
      React.createElement('input', {
        value: draft.sublayer,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, sublayer: e.target.value })),
        style: inputStyle,
        placeholder: '\u2014',
      }),
    ),
    fieldRow('Description',
      React.createElement('textarea', {
        value: draft.description,
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(d => ({ ...d, description: e.target.value })),
        style: { ...inputStyle, minHeight: 60, resize: 'vertical' as const },
        placeholder: '\u2014',
      }),
    ),
  );
}

function renderUmlMembers(element: Element, isEnum: boolean): React.ReactElement {
  const props = (element.properties ?? {}) as Record<string, unknown>;
  const attributes = (props.attributes as Array<Record<string, unknown>>) ?? [];
  const methods = (props.methods as Array<Record<string, unknown>>) ?? [];

  const sectionHeader = (text: string) =>
    React.createElement('div', {
      style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 4, marginTop: 12 },
    }, text);

  const memberLine = (m: Record<string, unknown>, isMeth: boolean) => {
    const vis = String(m.visibility ?? '+');
    const name = String(m.name ?? '');
    if (isEnum && isMeth) {
      return React.createElement('div', {
        key: `enum-${name}`,
        style: { color: 'var(--text-primary)', fontSize: 11, paddingLeft: 8, marginBottom: 2 },
      }, name);
    }
    const typeStr = isMeth ? String(m.returnType ?? '') : String(m.type ?? '');
    const display = `${vis} ${name}${isMeth ? '()' : ''}${typeStr ? ': ' + typeStr : ''}`;
    return React.createElement('div', {
      key: `${vis}-${name}-${typeStr}`,
      style: {
        color: 'var(--text-primary)',
        fontSize: 11,
        fontFamily: 'monospace',
        paddingLeft: 8,
        marginBottom: 2,
      },
    }, display);
  };

  return React.createElement('div', { style: { marginTop: 8 } },
    attributes.length > 0 ? React.createElement(React.Fragment, null,
      sectionHeader('Attributes'),
      ...attributes.map(a => memberLine(a, false)),
    ) : null,
    isEnum
      ? (methods.length > 0 ? React.createElement(React.Fragment, null,
          sectionHeader('Values'),
          ...methods.map(m => memberLine(m, true)),
        ) : null)
      : (methods.length > 0 ? React.createElement(React.Fragment, null,
          sectionHeader('Methods'),
          ...methods.map(m => memberLine(m, true)),
        ) : null),
  );
}

function renderUmlMemberEditor(
  isEnum: boolean,
  attributes: DraftMember[],
  setAttributes: React.Dispatch<React.SetStateAction<DraftMember[]>>,
  methods: DraftMember[],
  setMethods: React.Dispatch<React.SetStateAction<DraftMember[]>>,
  inputStyle: React.CSSProperties,
): React.ReactElement {
  const smallBtn: React.CSSProperties = {
    padding: '2px 6px',
    fontSize: 10,
    borderRadius: 3,
    border: '1px solid var(--border-primary)',
    cursor: 'pointer',
    background: 'var(--button-bg, #333)',
    color: 'var(--button-fg, #ccc)',
    flexShrink: 0,
  };

  const sectionHeader = (text: string, onAdd: () => void) =>
    React.createElement('div', {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 },
    },
      React.createElement('div', {
        style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' },
      }, text),
      React.createElement('button', { onClick: onAdd, style: smallBtn }, '+ Add'),
    );

  const memberRow = (
    items: DraftMember[],
    setItems: React.Dispatch<React.SetStateAction<DraftMember[]>>,
    index: number,
    showVisibility: boolean,
    typeLabel: string,
  ) => {
    const item = items[index]!;
    const update = (field: keyof DraftMember, value: string) => {
      setItems(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
    };
    const remove = () => {
      setItems(prev => prev.filter((_, i) => i !== index));
    };

    const children: React.ReactElement[] = [];

    if (showVisibility) {
      children.push(React.createElement('select', {
        key: 'vis',
        value: item.visibility,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => update('visibility', e.target.value),
        style: { ...inputStyle, width: 52, flexShrink: 0, appearance: 'auto' as React.CSSProperties['appearance'] },
      },
        ...VISIBILITY_OPTIONS.map(o =>
          React.createElement('option', { key: o.value, value: o.value }, o.value),
        ),
      ));
    }

    children.push(React.createElement('input', {
      key: 'name',
      value: item.name,
      placeholder: 'Name',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => update('name', e.target.value),
      style: { ...inputStyle, flex: 1 },
    }));

    if (typeLabel) {
      children.push(React.createElement('input', {
        key: 'type',
        value: item.type,
        placeholder: typeLabel,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => update('type', e.target.value),
        style: { ...inputStyle, width: 70, flexShrink: 0 },
      }));
    }

    children.push(React.createElement('button', {
      key: 'del',
      onClick: remove,
      style: { ...smallBtn, color: '#e05252', borderColor: '#e0525244', padding: '2px 5px' },
    }, '\u00D7'));

    return React.createElement('div', {
      key: `${item.name}-${item.visibility}-${index}`,
      style: { display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' },
    }, ...children);
  };

  const addAttribute = () => setAttributes(prev => [...prev, { name: '', type: '', visibility: '+' }]);
  const addMethod = () => setMethods(prev => [...prev, { name: '', type: '', visibility: '+' }]);
  const addEnumValue = () => setMethods(prev => [...prev, { name: '', type: '', visibility: '+' }]);

  return React.createElement('div', null,
    sectionHeader('Attributes', addAttribute),
    ...attributes.map((_, i) => memberRow(attributes, setAttributes, i, true, 'Type')),
    attributes.length === 0 ? React.createElement('div', {
      style: { color: 'var(--text-muted)', fontSize: 10, fontStyle: 'italic', paddingLeft: 8 },
    }, 'No attributes') : null,

    isEnum
      ? React.createElement(React.Fragment, null,
          sectionHeader('Values', addEnumValue),
          ...methods.map((_, i) => memberRow(methods, setMethods, i, false, '')),
          methods.length === 0 ? React.createElement('div', {
            style: { color: 'var(--text-muted)', fontSize: 10, fontStyle: 'italic', paddingLeft: 8 },
          }, 'No values') : null,
        )
      : React.createElement(React.Fragment, null,
          sectionHeader('Methods', addMethod),
          ...methods.map((_, i) => memberRow(methods, setMethods, i, true, 'Return type')),
          methods.length === 0 ? React.createElement('div', {
            style: { color: 'var(--text-muted)', fontSize: 10, fontStyle: 'italic', paddingLeft: 8 },
          }, 'No methods') : null,
        ),
  );
}

function renderAppearanceSection(
  fill: string,
  setFill: (v: string) => void,
  stroke: string,
  setStroke: (v: string) => void,
  onSave: (fill: string, stroke: string) => Promise<void>,
  onReset: () => Promise<void>,
  inputStyle: React.CSSProperties,
): React.ReactElement {
  const smallBtn: React.CSSProperties = {
    padding: '3px 8px',
    fontSize: 10,
    borderRadius: 3,
    border: '1px solid var(--border-primary)',
    cursor: 'pointer',
    background: 'var(--button-bg, #333)',
    color: 'var(--button-fg, #ccc)',
  };

  const colourInputStyle: React.CSSProperties = {
    ...inputStyle,
    width: 90,
    fontFamily: 'monospace',
  };

  const handleBlur = () => { onSave(fill, stroke); };

  return React.createElement('div', { style: { marginTop: 16 } },
    React.createElement('div', {
      style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 6, borderTop: '1px solid var(--border-secondary)', paddingTop: 8 },
    }, 'Appearance'),

    React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 } },
      React.createElement('label', { style: { color: 'var(--text-secondary)', fontSize: 10, width: 40 } }, 'Fill'),
      React.createElement('input', {
        value: fill,
        placeholder: '#RRGGBB',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFill(e.target.value),
        onBlur: handleBlur,
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') onSave(fill, stroke); },
        style: colourInputStyle,
      }),
      fill ? React.createElement('div', {
        style: { width: 16, height: 16, borderRadius: 2, border: '1px solid var(--border-primary)', background: fill },
      }) : null,
    ),

    React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 } },
      React.createElement('label', { style: { color: 'var(--text-secondary)', fontSize: 10, width: 40 } }, 'Stroke'),
      React.createElement('input', {
        value: stroke,
        placeholder: '#RRGGBB',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setStroke(e.target.value),
        onBlur: handleBlur,
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') onSave(fill, stroke); },
        style: colourInputStyle,
      }),
      stroke ? React.createElement('div', {
        style: { width: 16, height: 16, borderRadius: 2, border: '1px solid var(--border-primary)', background: stroke },
      }) : null,
    ),

    (fill || stroke) ? React.createElement('button', {
      onClick: onReset,
      style: { ...smallBtn, fontSize: 9 },
    }, 'Reset to Default') : null,
  );
}

function renderProcessStepInfo(step: ProcessStep): React.ReactElement {
  const rows: Array<[string, string]> = [
    ['Step Type', step.step_type ?? '\u2014'],
    ['Sequence', String(step.sequence)],
    ['Role', step.role_id ?? '\u2014'],
    ['Agent', step.agent_id ?? '\u2014'],
    ['Autonomy', step.agent_autonomy ?? '\u2014'],
    ['Approval Required', step.approval_required ? 'Yes' : 'No'],
    ['Track Crossing', step.track_crossing ? 'Yes' : 'No'],
    ['Description', step.description ?? '\u2014'],
  ];

  return React.createElement('div', { style: { marginTop: 12 } },
    React.createElement('div', {
      style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 6, borderTop: '1px solid var(--border-secondary)', paddingTop: 8 },
    }, 'Process Step Metadata'),
    ...rows.map(([label, value]) =>
      React.createElement('div', { key: label, style: { marginBottom: 6 } },
        React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' } }, label),
        React.createElement('div', { style: { color: 'var(--text-primary)', wordBreak: 'break-word' } }, value),
      ),
    ),
    step.input_objects && step.input_objects.length > 0 ? React.createElement('div', { style: { marginBottom: 6 } },
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' } }, 'Inputs'),
      ...step.input_objects.map((obj, i) =>
        React.createElement('div', { key: i, style: { color: 'var(--text-primary)', fontSize: 11, paddingLeft: 8 } }, obj),
      ),
    ) : null,
    step.output_objects && step.output_objects.length > 0 ? React.createElement('div', { style: { marginBottom: 6 } },
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' } }, 'Outputs'),
      ...step.output_objects.map((obj, i) =>
        React.createElement('div', { key: i, style: { color: 'var(--text-primary)', fontSize: 11, paddingLeft: 8 } }, obj),
      ),
    ) : null,
  );
}

function renderProcessStepEditable(
  draftStep: Partial<ProcessStep>,
  setDraftStep: React.Dispatch<React.SetStateAction<Partial<ProcessStep> | null>>,
  inputStyle: React.CSSProperties,
): React.ReactElement {
  const fieldRow = (label: string, child: React.ReactElement) =>
    React.createElement('div', { key: label, style: { marginBottom: 8 } },
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 2 } }, label),
      child,
    );

  const update = (field: string, value: unknown) => {
    setDraftStep(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const selectStyle = { ...inputStyle, appearance: 'auto' as React.CSSProperties['appearance'] };

  return React.createElement('div', { style: { marginTop: 12 } },
    React.createElement('div', {
      style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 6, borderTop: '1px solid var(--border-secondary)', paddingTop: 8 },
    }, 'Process Step Metadata'),

    fieldRow('Step Type',
      React.createElement('select', {
        value: draftStep.step_type ?? '',
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => update('step_type', e.target.value || null),
        style: selectStyle,
      },
        React.createElement('option', { value: '' }, '\u2014 None'),
        React.createElement('option', { value: 'human' }, 'Human'),
        React.createElement('option', { value: 'agent' }, 'Agent'),
        React.createElement('option', { value: 'system' }, 'System'),
        React.createElement('option', { value: 'hybrid' }, 'Hybrid'),
      ),
    ),

    fieldRow('Role',
      React.createElement('input', {
        value: draftStep.role_id ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => update('role_id', e.target.value || null),
        style: inputStyle,
        placeholder: '\u2014',
      }),
    ),

    fieldRow('Agent',
      React.createElement('input', {
        value: draftStep.agent_id ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => update('agent_id', e.target.value || null),
        style: inputStyle,
        placeholder: '\u2014',
      }),
    ),

    fieldRow('Agent Autonomy',
      React.createElement('select', {
        value: draftStep.agent_autonomy ?? '',
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => update('agent_autonomy', e.target.value || null),
        style: selectStyle,
      },
        React.createElement('option', { value: '' }, '\u2014 None'),
        React.createElement('option', { value: 'full' }, 'Full'),
        React.createElement('option', { value: 'supervised' }, 'Supervised'),
        React.createElement('option', { value: 'advisory' }, 'Advisory'),
        React.createElement('option', { value: 'none' }, 'None'),
      ),
    ),

    fieldRow('Approval Required',
      React.createElement('input', {
        type: 'checkbox',
        checked: draftStep.approval_required ?? false,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => update('approval_required', e.target.checked),
        style: { marginLeft: 0 },
      }),
    ),

    fieldRow('Track Crossing',
      React.createElement('input', {
        type: 'checkbox',
        checked: draftStep.track_crossing ?? false,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => update('track_crossing', e.target.checked),
        style: { marginLeft: 0 },
      }),
    ),

    fieldRow('Description',
      React.createElement('textarea', {
        value: draftStep.description ?? '',
        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => update('description', e.target.value || null),
        style: { ...inputStyle, minHeight: 40, resize: 'vertical' as const },
        placeholder: '\u2014',
      }),
    ),

    fieldRow('Inputs (comma-separated)',
      React.createElement('input', {
        value: Array.isArray(draftStep.input_objects) ? draftStep.input_objects.join(', ') : (draftStep.input_objects ?? ''),
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => update('input_objects', e.target.value),
        style: inputStyle,
        placeholder: 'e.g. document, request',
      }),
    ),

    fieldRow('Outputs (comma-separated)',
      React.createElement('input', {
        value: Array.isArray(draftStep.output_objects) ? draftStep.output_objects.join(', ') : (draftStep.output_objects ?? ''),
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => update('output_objects', e.target.value),
        style: inputStyle,
        placeholder: 'e.g. approval, report',
      }),
    ),
  );
}

function renderProvenance(element: Element): React.ReactElement {
  const rows: Array<[string, string]> = [
    ['Created By', (element as Record<string, unknown>).created_by as string ?? '\u2014'],
    ['Created At', element.created_at ?? '\u2014'],
    ['Updated At', element.updated_at ?? '\u2014'],
    ['Source', (element as Record<string, unknown>).source as string ?? '\u2014'],
    ['Source Session', element.source_session_id ?? '\u2014'],
    ['Confidence', element.confidence != null ? String(element.confidence) : '\u2014'],
  ];

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    ...rows.map(([label, value]) =>
      React.createElement('div', { key: label },
        React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase' } }, label),
        React.createElement('div', { style: { color: 'var(--text-primary)', wordBreak: 'break-word' } }, value),
      ),
    ),
  );
}

function renderRelationships(
  incoming: Relationship[],
  outgoing: Relationship[],
  elementMap: Map<string, Element>,
  onNavigate: (id: string) => void,
): React.ReactElement {
  const relItem = (rel: Relationship, isIncoming: boolean) => {
    const otherId = isIncoming ? rel.source_id : rel.target_id;
    const other = elementMap.get(otherId);
    const direction = isIncoming ? '\u2190' : '\u2192';

    return React.createElement('div', {
      key: rel.id,
      onClick: () => onNavigate(otherId),
      style: {
        padding: '4px 8px',
        cursor: 'pointer',
        borderRadius: 3,
        fontSize: 11,
        display: 'flex',
        gap: 6,
        alignItems: 'center',
      },
    },
      React.createElement('span', { style: { color: 'var(--text-muted)', fontSize: 12 } }, direction),
      React.createElement('span', { style: { color: 'var(--text-primary)' } }, other?.name ?? otherId),
      React.createElement('span', { style: { color: 'var(--text-muted)', fontSize: 9 } }, rel.archimate_type),
    );
  };

  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
    outgoing.length > 0 ? React.createElement('div', null,
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 4 } }, 'Outgoing'),
      ...outgoing.map(r => relItem(r, false)),
    ) : null,
    incoming.length > 0 ? React.createElement('div', null,
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 4 } }, 'Incoming'),
      ...incoming.map(r => relItem(r, true)),
    ) : null,
    incoming.length === 0 && outgoing.length === 0 ? React.createElement('div', {
      style: { color: 'var(--text-muted)', fontStyle: 'italic' },
    }, 'No relationships') : null,
  );
}
