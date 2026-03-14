import React, { useState, useCallback, useEffect } from 'react';
import type { Element, Relationship } from '../model/types';
import { elementStatusValues } from '../model/types';
import { useModelStore } from '../store/model';

interface DetailPanelProps {
  element: Element;
  relationships: Relationship[];
  elements: Element[];
  onClose: () => void;
  onNavigate: (elementId: string) => void;
  onDelete: (elementId: string) => void;
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

export function DetailPanel({ element, relationships, elements, onClose, onNavigate, onDelete }: DetailPanelProps): React.ReactElement {
  const [tab, setTab] = useState<Tab>('properties');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ name: string; description: string; status: string; layer: string; sublayer: string }>({
    name: element.name,
    description: element.description ?? '',
    status: element.status,
    layer: element.layer,
    sublayer: element.sublayer ?? '',
  });
  const [draftAttributes, setDraftAttributes] = useState<DraftMember[]>([]);
  const [draftMethods, setDraftMethods] = useState<DraftMember[]>([]);
  const [saving, setSaving] = useState(false);
  const updateElement = useModelStore(s => s.updateElement);

  const isUmlClass = UML_CLASS_TYPES.includes(element.archimate_type);
  const isUmlEnum = element.archimate_type === 'uml-enum';

  // Reset draft when element changes
  useEffect(() => {
    setDraft({
      name: element.name,
      description: element.description ?? '',
      status: element.status,
      layer: element.layer,
      sublayer: element.sublayer ?? '',
    });
    setEditing(false);
  }, [element.id, element.name, element.description, element.status, element.layer, element.sublayer]);

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
      setEditing(false);
    } catch (err) {
      console.error('Failed to save element:', err);
    } finally {
      setSaving(false);
    }
  }, [element.id, draft, updateElement, isUmlClass, isUmlEnum, draftAttributes, draftMethods, element.properties]);

  const handleCancel = useCallback(() => {
    setDraft({
      name: element.name,
      description: element.description ?? '',
      status: element.status,
      layer: element.layer,
      sublayer: element.sublayer ?? '',
    });
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

  return React.createElement('div', {
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
            )
          : React.createElement(React.Fragment, null,
              renderProperties(element),
              isUmlClass ? renderUmlMembers(element, isUmlEnum) : null,
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
              onClick: () => setEditing(true),
              style: btnStyle,
            }, 'Edit'),
      ),
      React.createElement('button', {
        onClick: handleDelete,
        style: { ...btnStyle, color: '#e05252', borderColor: '#e0525244' },
      }, 'Delete'),
    ) : null,
  );
}

function renderProperties(element: Element): React.ReactElement {
  const rows: Array<[string, string]> = [
    ['Name', element.name],
    ['Type', element.archimate_type],
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
  draft: { name: string; description: string; status: string; layer: string; sublayer: string },
  setDraft: React.Dispatch<React.SetStateAction<typeof draft>>,
  inputStyle: React.CSSProperties,
): React.ReactElement {
  const fieldRow = (label: string, child: React.ReactElement) =>
    React.createElement('div', { key: label, style: { marginBottom: 8 } },
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', marginBottom: 2 } }, label),
      child,
    );

  return React.createElement('div', null,
    fieldRow('Name',
      React.createElement('input', {
        value: draft.name,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(d => ({ ...d, name: e.target.value })),
        style: inputStyle,
      }),
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
        key: name,
        style: { color: 'var(--text-primary)', fontSize: 11, paddingLeft: 8, marginBottom: 2 },
      }, name);
    }
    const typeStr = isMeth ? String(m.returnType ?? '') : String(m.type ?? '');
    const display = `${vis} ${name}${isMeth ? '()' : ''}${typeStr ? ': ' + typeStr : ''}`;
    return React.createElement('div', {
      key: name + vis + typeStr,
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
      key: index,
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
