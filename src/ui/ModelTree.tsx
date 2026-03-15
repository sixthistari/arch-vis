/**
 * ModelTree — hierarchical tree of all elements grouped by notation, then by
 * sub-category (ArchiMate layer, UML diagram type, wireframe category).
 *
 * Supports user-defined folders within each sub-group. Elements can be assigned
 * a folder path (e.g. "Infrastructure/Network") via right-click context menu.
 * Folders nest using "/" as separator.
 *
 * Provides: click-to-select, search filtering, orphan detection (elements not
 * in the current view are shown in italic), drag-to-canvas, folder management.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import { useInteractionStore } from '../store/interaction';
import { useThemeStore } from '../store/theme';
import type { Element } from '../model/types';
import { LAYER_SEQUENCE_FULL, LAYER_LABELS } from '../shared/layer-config';

// ═══════════════════════════════════════
// UML sub-grouping
// ═══════════════════════════════════════

const UML_GROUPS: Record<string, string[]> = {
  'Classes': ['uml-class', 'uml-abstract-class', 'uml-interface', 'uml-enum', 'uml-package'],
  'Components': ['uml-component'],
  'Behavioural': ['uml-actor', 'uml-use-case', 'uml-state', 'uml-activity', 'uml-note'],
  'Sequence': ['uml-lifeline', 'uml-activation', 'uml-fragment'],
};

const UML_GROUP_ORDER = ['Classes', 'Components', 'Behavioural', 'Sequence'];

// Build a reverse lookup: type → group label
const UML_TYPE_TO_GROUP = new Map<string, string>();
for (const [group, types] of Object.entries(UML_GROUPS)) {
  for (const t of types) UML_TYPE_TO_GROUP.set(t, group);
}

// ═══════════════════════════════════════
// Wireframe sub-grouping
// ═══════════════════════════════════════

const WF_GROUPS: Record<string, string[]> = {
  'Layout': ['wf-page', 'wf-section', 'wf-card', 'wf-modal', 'wf-header'],
  'Controls': ['wf-button', 'wf-input', 'wf-textarea', 'wf-select', 'wf-checkbox', 'wf-radio'],
  'Data': ['wf-table', 'wf-list', 'wf-form'],
  'Navigation': ['wf-nav', 'wf-link', 'wf-tab-group'],
  'Content': ['wf-text', 'wf-image', 'wf-icon', 'wf-placeholder'],
};

const WF_GROUP_ORDER = ['Layout', 'Controls', 'Data', 'Navigation', 'Content'];

const WF_TYPE_TO_GROUP = new Map<string, string>();
for (const [group, types] of Object.entries(WF_GROUPS)) {
  for (const t of types) WF_TYPE_TO_GROUP.set(t, group);
}

// ═══════════════════════════════════════
// Context menu state
// ═══════════════════════════════════════

interface ContextMenuState {
  x: number;
  y: number;
  elementId: string;
}

// ═══════════════════════════════════════
// Folder tree node structure
// ═══════════════════════════════════════

interface FolderTree {
  /** Folder segment name (leaf name only) */
  name: string;
  /** Full folder path for this node */
  path: string;
  /** Elements directly in this folder (not in sub-folders) */
  elements: Element[];
  /** Sub-folders */
  children: FolderTree[];
}

/**
 * Build a folder tree from a flat list of elements.
 * Elements with null/empty folder go into the root (returned as rootElements).
 */
function buildFolderTree(elements: Element[]): { rootElements: Element[]; folders: FolderTree[] } {
  const rootElements: Element[] = [];
  const folderMap = new Map<string, FolderTree>();

  // Ensure a folder node exists for every path segment
  function ensureFolder(fullPath: string): FolderTree {
    const existing = folderMap.get(fullPath);
    if (existing) return existing;

    const segments = fullPath.split('/');
    const name = segments[segments.length - 1]!;
    const node: FolderTree = { name, path: fullPath, elements: [], children: [] };
    folderMap.set(fullPath, node);

    // Link to parent if this is a nested path
    if (segments.length > 1) {
      const parentPath = segments.slice(0, -1).join('/');
      const parent = ensureFolder(parentPath);
      if (!parent.children.find(c => c.path === fullPath)) {
        parent.children.push(node);
      }
    }

    return node;
  }

  for (const el of elements) {
    const folder = el.folder?.trim();
    if (!folder) {
      rootElements.push(el);
    } else {
      const node = ensureFolder(folder);
      node.elements.push(el);
    }
  }

  // Collect top-level folders (those without a parent in the map)
  const topFolders: FolderTree[] = [];
  for (const [path, node] of folderMap) {
    const segments = path.split('/');
    if (segments.length === 1) {
      topFolders.push(node);
    }
  }

  // Sort children and elements recursively
  function sortTree(node: FolderTree): void {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.elements.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of node.children) sortTree(child);
  }
  for (const f of topFolders) sortTree(f);
  topFolders.sort((a, b) => a.name.localeCompare(b.name));
  rootElements.sort((a, b) => a.name.localeCompare(b.name));

  return { rootElements, folders: topFolders };
}

/** Count all elements in a folder tree recursively */
function countFolderElements(node: FolderTree): number {
  let count = node.elements.length;
  for (const child of node.children) count += countFolderElements(child);
  return count;
}

// ═══════════════════════════════════════
// Context menu component
// ═══════════════════════════════════════

interface ContextMenuProps {
  x: number;
  y: number;
  theme: 'dark' | 'light';
  elementFolder: string | null;
  allFolders: string[];
  onMoveToFolder: (folder: string) => void;
  onRemoveFromFolder: () => void;
  onClose: () => void;
}

function ContextMenu({ x, y, theme, elementFolder, allFolders, onMoveToFolder, onRemoveFromFolder, onClose }: ContextMenuProps) {
  const isDark = theme === 'dark';
  const menuRef = useRef<HTMLDivElement>(null);
  const [showInput, setShowInput] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [showExisting, setShowExisting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  const bgColour = isDark ? '#1E293B' : '#FFFFFF';
  const textColour = isDark ? '#E5E7EB' : '#111827';
  const hoverBg = isDark ? '#334155' : '#F1F5F9';
  const borderCol = isDark ? '#334155' : '#E2E8F0';
  const mutedColour = isDark ? '#94A3B8' : '#64748B';

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 10000,
    background: bgColour,
    border: `1px solid ${borderCol}`,
    borderRadius: 6,
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
    padding: '4px 0',
    minWidth: 180,
    fontSize: 11,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: textColour,
  };

  const itemStyle: React.CSSProperties = {
    padding: '6px 12px',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const handleSubmitFolder = () => {
    const trimmed = folderInput.trim();
    if (trimmed) {
      onMoveToFolder(trimmed);
    }
  };

  // Filter out the element's current folder from the list
  const otherFolders = allFolders.filter(f => f !== elementFolder);

  return (
    <div ref={menuRef} style={menuStyle}>
      {!showInput && !showExisting && (
        <>
          <div
            style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={() => setShowInput(true)}
          >
            New Folder…
          </div>
          {otherFolders.length > 0 && (
            <div
              style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => setShowExisting(true)}
            >
              Move to Folder…
            </div>
          )}
          {elementFolder && (
            <>
              <div style={{ borderTop: `1px solid ${borderCol}`, margin: '4px 0' }} />
              <div
                style={{ ...itemStyle, color: '#EF4444' }}
                onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={onRemoveFromFolder}
              >
                Remove from Folder
              </div>
            </>
          )}
          {elementFolder && (
            <div style={{ padding: '4px 12px 2px', fontSize: 10, color: mutedColour }}>
              Current: {elementFolder}
            </div>
          )}
        </>
      )}

      {showInput && (
        <div style={{ padding: '6px 12px' }}>
          <div style={{ fontSize: 10, color: mutedColour, marginBottom: 4 }}>
            Folder path (use / for nesting)
          </div>
          <input
            ref={inputRef}
            value={folderInput}
            onChange={e => setFolderInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSubmitFolder();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="e.g. Infrastructure/Network"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: isDark ? '#0F172A' : '#F8FAFC',
              color: textColour,
              border: `1px solid ${borderCol}`,
              borderRadius: 3,
              padding: '4px 6px',
              fontSize: 11,
              outline: 'none',
              marginBottom: 4,
            }}
          />
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: `1px solid ${borderCol}`,
                borderRadius: 3,
                padding: '2px 8px',
                fontSize: 10,
                color: mutedColour,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitFolder}
              style={{
                background: isDark ? '#3B82F6' : '#2563EB',
                border: 'none',
                borderRadius: 3,
                padding: '2px 8px',
                fontSize: 10,
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              Move
            </button>
          </div>
        </div>
      )}

      {showExisting && (
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          <div
            style={{ ...itemStyle, color: mutedColour, fontSize: 10, cursor: 'default' }}
          >
            Select folder:
          </div>
          {otherFolders.map(f => (
            <div
              key={f}
              style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => onMoveToFolder(f)}
            >
              {f}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${borderCol}`, margin: '4px 0' }} />
          <div
            style={itemStyle}
            onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            onClick={() => { setShowExisting(false); setShowInput(true); }}
          >
            New Folder…
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Shared components
// ═══════════════════════════════════════

interface TreeNodeProps {
  element: Element;
  isOrphan: boolean;
  isSelected: boolean;
  theme: 'dark' | 'light';
  indent?: number;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, elementId: string) => void;
}

function TreeNode({ element, isOrphan, isSelected, theme, indent = 16, onSelect, onContextMenu }: TreeNodeProps) {
  const isDark = theme === 'dark';
  const bg = isSelected
    ? (isDark ? '#1E3A5F' : '#DBEAFE')
    : 'transparent';
  const textColour = isDark ? '#E5E7EB' : '#111827';

  return (
    <div
      draggable
      onClick={() => onSelect(element.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, element.id);
      }}
      onDragStart={(e: React.DragEvent) => {
        e.dataTransfer.setData('application/archvis-tree', JSON.stringify({
          elementId: element.id,
          archimateType: element.archimate_type,
          layer: element.layer,
        }));
        // Secondary data for folder drag-and-drop within the tree
        e.dataTransfer.setData('application/archvis-tree-move', JSON.stringify({
          elementId: element.id,
        }));
        e.dataTransfer.effectAllowed = 'copyMove';
      }}
      title={element.description ?? element.name}
      style={{
        padding: `3px 8px 3px ${indent}px`,
        cursor: 'grab',
        background: bg,
        color: textColour,
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontStyle: isOrphan ? 'italic' : 'normal',
        opacity: isOrphan ? 0.6 : 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        borderRadius: 2,
      }}
    >
      {element.name}
    </div>
  );
}

// ═══════════════════════════════════════
// FolderNode component — renders a collapsible folder with nested elements
// ═══════════════════════════════════════

interface FolderNodeProps {
  folder: FolderTree;
  depth: number;
  orphanIds: Set<string>;
  selectedId: string | null;
  theme: 'dark' | 'light';
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, elementId: string) => void;
  onDropToFolder: (elementId: string, folderPath: string) => void;
}

function FolderNode({ folder, depth, orphanIds, selectedId, theme, onSelect, onContextMenu, onDropToFolder }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const isDark = theme === 'dark';
  const folderColour = isDark ? '#A78BFA' : '#7C3AED';
  const mutedColour = isDark ? '#94A3B8' : '#64748B';
  const borderColour = isDark ? '#1E293B' : '#E2E8F0';
  const indent = 8 + depth * 12;
  const totalCount = countFolderElements(folder);

  return (
    <div>
      <div
        onClick={() => setExpanded(e => !e)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          try {
            const data = JSON.parse(e.dataTransfer.getData('application/archvis-tree-move'));
            if (data?.elementId) {
              onDropToFolder(data.elementId, folder.path);
            }
          } catch {
            // Not a tree-move drag, ignore
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `3px 6px 3px ${indent}px`,
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          color: folderColour,
          borderTop: depth === 0 ? `1px solid ${borderColour}` : undefined,
          userSelect: 'none',
          background: dragOver ? (isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.08)') : 'transparent',
          borderRadius: 2,
        }}
      >
        <span style={{ fontSize: 10 }}>{expanded ? '▾' : '▸'}</span>
        <span style={{ fontSize: 12 }}>📁</span>
        <span>{folder.name}</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400, fontSize: 10, color: mutedColour }}>{totalCount}</span>
      </div>
      {expanded && (
        <>
          {folder.children.map(child => (
            <FolderNode
              key={child.path}
              folder={child}
              depth={depth + 1}
              orphanIds={orphanIds}
              selectedId={selectedId}
              theme={theme}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onDropToFolder={onDropToFolder}
            />
          ))}
          {folder.elements.map(el => (
            <TreeNode
              key={el.id}
              element={el}
              isOrphan={orphanIds.has(el.id)}
              isSelected={selectedId === el.id}
              theme={theme}
              indent={indent + 14}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Sub-group component (used by all notations)
// Now renders folders within each sub-group
// ═══════════════════════════════════════

interface SubGroupProps {
  label: string;
  elements: Element[];
  orphanIds: Set<string>;
  selectedId: string | null;
  theme: 'dark' | 'light';
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, elementId: string) => void;
  onDropToFolder: (elementId: string, folderPath: string) => void;
}

function SubGroup({ label, elements, orphanIds, selectedId, theme, onSelect, onContextMenu, onDropToFolder }: SubGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const isDark = theme === 'dark';
  const headerColour = isDark ? '#94A3B8' : '#64748B';
  const borderColour = isDark ? '#1E293B' : '#E2E8F0';

  const { rootElements, folders } = useMemo(() => buildFolderTree(elements), [elements]);

  return (
    <div>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px',
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 600,
          color: headerColour,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          borderTop: `1px solid ${borderColour}`,
          userSelect: 'none',
        }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{label}</span>
        <span style={{ marginLeft: 'auto', fontWeight: 400 }}>{elements.length}</span>
      </div>
      {expanded && (
        <>
          {folders.map(folder => (
            <FolderNode
              key={folder.path}
              folder={folder}
              depth={0}
              orphanIds={orphanIds}
              selectedId={selectedId}
              theme={theme}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
              onDropToFolder={onDropToFolder}
            />
          ))}
          {rootElements.map(el => (
            <TreeNode
              key={el.id}
              element={el}
              isOrphan={orphanIds.has(el.id)}
              isSelected={selectedId === el.id}
              theme={theme}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </>
      )}
    </div>
  );
}

// LayerGroup kept as an alias for ArchiMate layers
function LayerGroup({ layer, elements, orphanIds, selectedId, theme, onSelect, onContextMenu, onDropToFolder }: {
  layer: string;
  elements: Element[];
  orphanIds: Set<string>;
  selectedId: string | null;
  theme: 'dark' | 'light';
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, elementId: string) => void;
  onDropToFolder: (elementId: string, folderPath: string) => void;
}) {
  const label = LAYER_LABELS[layer] ?? layer;
  return (
    <SubGroup
      label={label}
      elements={elements}
      orphanIds={orphanIds}
      selectedId={selectedId}
      theme={theme}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
      onDropToFolder={onDropToFolder}
    />
  );
}

// ═══════════════════════════════════════
// Top-level notation section
// ═══════════════════════════════════════

interface NotationSectionProps {
  title: string;
  count: number;
  borderColour: string;
  theme: 'dark' | 'light';
  children: React.ReactNode;
}

function NotationSection({ title, count, borderColour, theme, children }: NotationSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const isDark = theme === 'dark';
  const textColour = isDark ? '#E5E7EB' : '#111827';
  const bgColour = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  return (
    <div style={{ borderLeft: `3px solid ${borderColour}`, marginBottom: 2 }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 700,
          color: textColour,
          background: bgColour,
          userSelect: 'none',
        }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        <span>{title}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 9,
          fontWeight: 500,
          background: borderColour,
          color: '#FFFFFF',
          borderRadius: 8,
          padding: '1px 6px',
          minWidth: 16,
          textAlign: 'center',
        }}>{count}</span>
      </div>
      {expanded && children}
    </div>
  );
}

// ═══════════════════════════════════════
// ModelTree (main export)
// ═══════════════════════════════════════

interface ModelTreeProps {
  onClose?: () => void;
}

export function ModelTree({ onClose }: ModelTreeProps) {
  const elements = useModelStore(s => s.elements);
  const updateElement = useModelStore(s => s.updateElement);
  const viewElements = useViewStore(s => s.viewElements);
  const selectedId = useInteractionStore(s => s.selectedId);
  const select = useInteractionStore(s => s.select);
  const theme = useThemeStore(s => s.theme);

  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const isDark = theme === 'dark';
  const bgColour = isDark ? '#0F172A' : '#F8FAFC';
  const textColour = isDark ? '#E5E7EB' : '#111827';
  const borderColour = isDark ? '#1E293B' : '#E2E8F0';
  const mutedColour = isDark ? '#64748B' : '#94A3B8';

  // Collect all distinct folder paths across all elements
  const allFolders = useMemo(() => {
    const set = new Set<string>();
    for (const el of elements) {
      if (el.folder?.trim()) set.add(el.folder.trim());
    }
    return Array.from(set).sort();
  }, [elements]);

  // Elements in current view
  const viewElementIds = useMemo(
    () => new Set(viewElements.map(ve => ve.element_id)),
    [viewElements],
  );

  // Filter by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? elements.filter(el => el.name.toLowerCase().includes(q)) : elements;
  }, [elements, search]);

  // Partition into three notation buckets
  const { archimateEls, umlEls, wfEls } = useMemo(() => {
    const archimateEls: Element[] = [];
    const umlEls: Element[] = [];
    const wfEls: Element[] = [];
    for (const el of filtered) {
      if (el.archimate_type.startsWith('uml-')) {
        umlEls.push(el);
      } else if (el.archimate_type.startsWith('wf-')) {
        wfEls.push(el);
      } else {
        archimateEls.push(el);
      }
    }
    return { archimateEls, umlEls, wfEls };
  }, [filtered]);

  // ArchiMate: group by layer preserving canonical order
  const { byLayer, orderedLayers } = useMemo(() => {
    const map = new Map<string, Element[]>();
    for (const el of archimateEls) {
      const g = map.get(el.layer) ?? [];
      g.push(el);
      map.set(el.layer, g);
    }
    for (const g of map.values()) g.sort((a, b) => a.name.localeCompare(b.name));

    const seen = new Set<string>();
    const result: string[] = [];
    for (const l of LAYER_SEQUENCE_FULL) {
      if (map.has(l)) { result.push(l); seen.add(l); }
    }
    for (const l of map.keys()) {
      if (!seen.has(l)) result.push(l);
    }
    return { byLayer: map, orderedLayers: result };
  }, [archimateEls]);

  // UML: group by sub-category
  const umlGrouped = useMemo(() => {
    const map = new Map<string, Element[]>();
    for (const el of umlEls) {
      const group = UML_TYPE_TO_GROUP.get(el.archimate_type) ?? 'Other';
      const g = map.get(group) ?? [];
      g.push(el);
      map.set(group, g);
    }
    for (const g of map.values()) g.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [umlEls]);

  const umlGroupKeys = useMemo(() => {
    const result: string[] = [];
    for (const k of UML_GROUP_ORDER) {
      if (umlGrouped.has(k)) result.push(k);
    }
    for (const k of umlGrouped.keys()) {
      if (!result.includes(k)) result.push(k);
    }
    return result;
  }, [umlGrouped]);

  // Wireframe: group by sub-category
  const wfGrouped = useMemo(() => {
    const map = new Map<string, Element[]>();
    for (const el of wfEls) {
      const group = WF_TYPE_TO_GROUP.get(el.archimate_type) ?? 'Other';
      const g = map.get(group) ?? [];
      g.push(el);
      map.set(group, g);
    }
    for (const g of map.values()) g.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [wfEls]);

  const wfGroupKeys = useMemo(() => {
    const result: string[] = [];
    for (const k of WF_GROUP_ORDER) {
      if (wfGrouped.has(k)) result.push(k);
    }
    for (const k of wfGrouped.keys()) {
      if (!result.includes(k)) result.push(k);
    }
    return result;
  }, [wfGrouped]);

  // Elements not in current view (orphans)
  const orphanIds = useMemo(
    () => new Set(elements.filter(el => !viewElementIds.has(el.id)).map(el => el.id)),
    [elements, viewElementIds],
  );

  const handleSelect = useCallback((id: string) => {
    select(id);
  }, [select]);

  const handleContextMenu = useCallback((e: React.MouseEvent, elementId: string) => {
    setContextMenu({ x: e.clientX, y: e.clientY, elementId });
  }, []);

  const handleMoveToFolder = useCallback((folder: string) => {
    if (!contextMenu) return;
    updateElement(contextMenu.elementId, { folder }).catch(err => {
      console.error('Failed to move element to folder:', err);
    });
    setContextMenu(null);
  }, [contextMenu, updateElement]);

  const handleRemoveFromFolder = useCallback(() => {
    if (!contextMenu) return;
    updateElement(contextMenu.elementId, { folder: null }).catch(err => {
      console.error('Failed to remove element from folder:', err);
    });
    setContextMenu(null);
  }, [contextMenu, updateElement]);

  const handleDropToFolder = useCallback((elementId: string, folderPath: string) => {
    updateElement(elementId, { folder: folderPath }).catch(err => {
      console.error('Failed to move element to folder:', err);
    });
  }, [updateElement]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Find the context menu target element's folder
  const contextMenuElement = contextMenu
    ? elements.find(el => el.id === contextMenu.elementId)
    : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: bgColour,
      borderRight: `1px solid ${borderColour}`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 8px',
        borderBottom: `1px solid ${borderColour}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: textColour }}>Model</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: mutedColour,
              fontSize: 12,
              padding: '0 2px',
            }}
          >×</button>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: '6px 8px', flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search elements…"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: isDark ? '#1E293B' : '#FFFFFF',
            color: textColour,
            border: `1px solid ${borderColour}`,
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            outline: 'none',
          }}
        />
      </div>

      {/* Legend */}
      <div style={{ padding: '2px 8px 4px', fontSize: 10, color: mutedColour, flexShrink: 0 }}>
        <em>Italic</em> = not in current view · Right-click to organise into folders
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* ArchiMate section */}
        {archimateEls.length > 0 && (
          <NotationSection
            title="ArchiMate"
            count={archimateEls.length}
            borderColour="#F59E0B"
            theme={theme}
          >
            {orderedLayers.map(layer => (
              <LayerGroup
                key={layer}
                layer={layer}
                elements={byLayer.get(layer) ?? []}
                orphanIds={orphanIds}
                selectedId={selectedId}
                theme={theme}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
                onDropToFolder={handleDropToFolder}
              />
            ))}
          </NotationSection>
        )}

        {/* UML section */}
        {umlEls.length > 0 && (
          <NotationSection
            title="UML"
            count={umlEls.length}
            borderColour="#4A90D9"
            theme={theme}
          >
            {umlGroupKeys.map(group => (
              <SubGroup
                key={group}
                label={group}
                elements={umlGrouped.get(group) ?? []}
                orphanIds={orphanIds}
                selectedId={selectedId}
                theme={theme}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
                onDropToFolder={handleDropToFolder}
              />
            ))}
          </NotationSection>
        )}

        {/* Wireframe section */}
        {wfEls.length > 0 && (
          <NotationSection
            title="Wireframe"
            count={wfEls.length}
            borderColour="#8E8E93"
            theme={theme}
          >
            {wfGroupKeys.map(group => (
              <SubGroup
                key={group}
                label={group}
                elements={wfGrouped.get(group) ?? []}
                orphanIds={orphanIds}
                selectedId={selectedId}
                theme={theme}
                onSelect={handleSelect}
                onContextMenu={handleContextMenu}
                onDropToFolder={handleDropToFolder}
              />
            ))}
          </NotationSection>
        )}

        {filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 11, color: mutedColour, textAlign: 'center' }}>
            No elements found
          </div>
        )}
      </div>

      {/* Context menu portal */}
      {contextMenu && contextMenuElement && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          theme={theme}
          elementFolder={contextMenuElement.folder ?? null}
          allFolders={allFolders}
          onMoveToFolder={handleMoveToFolder}
          onRemoveFromFolder={handleRemoveFromFolder}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
