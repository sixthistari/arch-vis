import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUndoRedoStore } from '../interaction/undo-redo';
import { usePanelStore } from '../store/panel';
import { useThemeStore } from '../store/theme';
import { useViewStore } from '../store/view';
import { useInteractionStore } from '../store/interaction';
import { notifySuccess, notifyError, notifyWarning } from '../store/notification';
import {
  importArchimateXml,
  importCsv,
  saveModelFile,
  openModelFile,
  resetModel,
  exportArchimateXml,
  exportCsv,
  exportModelBatch,
  exportHtmlReport,
} from '../api/client';
import { toPng, toSvg, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

// ── Types ──

interface MenuItemDef {
  label: string;
  shortcut?: string;
  action?: () => void;
  checked?: boolean;
  disabled?: boolean;
  children?: MenuItemDef[];
}

type MenuEntry = MenuItemDef | 'divider';

interface MenuDef {
  label: string;
  items: MenuEntry[];
}

// ── Helpers ──

function exportFilter(node: HTMLElement): boolean {
  if (!(node instanceof HTMLElement)) return true;
  const cls = node.classList;
  if (!cls) return true;
  if (cls.contains('react-flow__minimap')) return false;
  if (cls.contains('react-flow__controls')) return false;
  if (cls.contains('react-flow__panel')) return false;
  return true;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'diagram';
}

function getFlowElement(): HTMLElement | null {
  return document.querySelector('.react-flow') as HTMLElement | null;
}

// ── Styles ──

const menuBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  height: 28,
  flexShrink: 0,
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-primary)',
  padding: '0 8px',
  gap: 0,
  fontSize: 12,
  userSelect: 'none',
};

const menuTriggerBase: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--text-primary)',
  border: 'none',
  padding: '2px 10px',
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: '24px',
  borderRadius: 3,
  whiteSpace: 'nowrap',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 1,
  background: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  borderRadius: 4,
  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  zIndex: 200,
  minWidth: 220,
  padding: '4px 0',
};

const menuItemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  background: 'transparent',
  color: 'var(--text-primary)',
  border: 'none',
  padding: '5px 20px 5px 12px',
  cursor: 'pointer',
  fontSize: 12,
  textAlign: 'left',
  lineHeight: '18px',
  whiteSpace: 'nowrap',
};

const shortcutStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 11,
  marginLeft: 24,
  fontFamily: 'inherit',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--border-primary)',
  margin: '4px 8px',
};

const subMenuArrow: React.CSSProperties = {
  marginLeft: 16,
  fontSize: 9,
  color: 'var(--text-muted)',
};

// ── Sub-components ──

function MenuItemView({
  item,
  onClose,
}: {
  item: MenuItemDef;
  onClose: () => void;
}): React.ReactElement {
  const [subOpen, setSubOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const itemRef = useRef<HTMLDivElement>(null);

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (item.disabled) return;
    if (hasChildren) return; // submenu opens on hover
    item.action?.();
    onClose();
  };

  const handleMouseEnter = () => {
    if (hasChildren) {
      clearTimeout(timerRef.current);
      setSubOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (hasChildren) {
      timerRef.current = setTimeout(() => setSubOpen(false), 150);
    }
  };

  return (
    <div
      ref={itemRef}
      style={{ position: 'relative' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={handleClick}
        disabled={item.disabled}
        style={{
          ...menuItemBase,
          opacity: item.disabled ? 0.4 : 1,
          cursor: item.disabled ? 'default' : 'pointer',
        }}
        onMouseEnter={(e) => {
          if (!item.disabled) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, textAlign: 'center', fontSize: 11 }}>
            {item.checked ? '✓' : ''}
          </span>
          <span>{item.label}</span>
        </span>
        <span>
          {item.shortcut && <span style={shortcutStyle}>{item.shortcut}</span>}
          {hasChildren && <span style={subMenuArrow}>▸</span>}
        </span>
      </button>
      {hasChildren && subOpen && (
        <div
          style={{
            ...dropdownStyle,
            left: '100%',
            top: 0,
            marginTop: 0,
            marginLeft: 2,
          }}
        >
          {item.children!.map((child, i) => (
            <MenuItemView key={i} item={child} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuDropdown({
  items,
  onClose,
}: {
  items: MenuEntry[];
  onClose: () => void;
}): React.ReactElement {
  return (
    <div style={dropdownStyle}>
      {items.map((entry, i) =>
        entry === 'divider' ? (
          <div key={i} style={dividerStyle} />
        ) : (
          <MenuItemView key={i} item={entry} onClose={onClose} />
        ),
      )}
    </div>
  );
}

// ── Main MenuBar ──

export function MenuBar({
  onToggleFindReplace,
  onToggleValidation,
  onToggleMatrix,
  onToggleSpecs,
  onToggleHelp,
  findReplaceOpen,
  validationOpen,
  matrixOpen,
  specsManagerOpen,
}: {
  onToggleFindReplace: () => void;
  onToggleValidation: () => void;
  onToggleMatrix: () => void;
  onToggleSpecs: () => void;
  onToggleHelp: () => void;
  findReplaceOpen: boolean;
  validationOpen: boolean;
  matrixOpen: boolean;
  specsManagerOpen: boolean;
}): React.ReactElement {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const canUndo = useUndoRedoStore(s => s.canUndo);
  const canRedo = useUndoRedoStore(s => s.canRedo);
  const undo = useUndoRedoStore(s => s.undo);
  const redo = useUndoRedoStore(s => s.redo);

  const leftPanelOpen = usePanelStore(s => s.leftPanelOpen);
  const rightPanelOpen = usePanelStore(s => s.rightPanelOpen);
  const bottomPanelOpen = usePanelStore(s => s.bottomPanelOpen);
  const fullScreen = usePanelStore(s => s.fullScreen);
  const toggleLeftPanel = usePanelStore(s => s.toggleLeftPanel);
  const toggleRightPanel = usePanelStore(s => s.toggleRightPanel);
  const toggleBottomPanel = usePanelStore(s => s.toggleBottomPanel);
  const toggleFullScreen = usePanelStore(s => s.toggleFullScreen);

  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);

  const currentView = useViewStore(s => s.currentView);
  const viewSlug = slugify(currentView?.name ?? 'architecture-diagram');

  const selectedId = useInteractionStore(s => s.selectedId);
  const formatPainter = useInteractionStore(s => s.formatPainter);
  const activateFormatPainter = useInteractionStore(s => s.activateFormatPainter);
  const deactivateFormatPainter = useInteractionStore(s => s.deactivateFormatPainter);
  const viewElements = useViewStore(s => s.viewElements);

  // Close on click outside
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  // Close on Escape
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openMenu]);

  const closeAll = useCallback(() => setOpenMenu(null), []);

  const handleMenuClick = (label: string) => {
    setOpenMenu(prev => (prev === label ? null : label));
  };

  const handleMenuHover = (label: string) => {
    if (openMenu && openMenu !== label) setOpenMenu(label);
  };

  // ── File actions ──

  const handleNew = useCallback(async () => {
    if (!window.confirm('Create a new model? Unsaved changes will be lost.')) return;
    try {
      await resetModel(false);
      window.location.reload();
    } catch (err) {
      notifyError('Failed to create new model', {
        operation: 'New model',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleOpen = useCallback(async () => {
    if (!window.confirm('Opening a model will replace the current model. Continue?')) return;
    try {
      await openModelFile();
      window.location.reload();
    } catch (err) {
      if (err instanceof Error && err.message === 'No file selected') return;
      console.error('Open model failed:', err);
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await saveModelFile();
      notifySuccess('Model saved');
    } catch (err) {
      notifyError('Save failed', {
        operation: 'Save model',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const handleClose = useCallback(async () => {
    if (!window.confirm('Close the current model and reload seed data?')) return;
    try {
      await resetModel(true);
      window.location.reload();
    } catch (err) {
      notifyError('Failed to close model', {
        operation: 'Close model',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // ── Import actions ──

  const handleImportXml = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,.archimate';
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      try {
        const text = await input.files[0].text();
        await importArchimateXml(text);
        window.location.reload();
      } catch (err) {
        console.error('ArchiMate XML import failed:', err);
      }
    };
    input.click();
  }, []);

  const handleImportCsv = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) return;
      try {
        const files = Array.from(input.files);
        let elementsCsv = '';
        let relationsCsv = '';
        let propertiesCsv = '';
        for (const file of files) {
          const text = await file.text();
          const name = file.name.toLowerCase();
          if (name.includes('element')) elementsCsv = text;
          else if (name.includes('relation')) relationsCsv = text;
          else if (name.includes('propert')) propertiesCsv = text;
          else if (!elementsCsv) elementsCsv = text;
        }
        if (!elementsCsv) {
          notifyWarning('No elements CSV file found', 'Name files with "elements", "relations", or "properties".');
          return;
        }
        await importCsv({ elements: elementsCsv, relations: relationsCsv, properties: propertiesCsv || undefined });
        window.location.reload();
      } catch (err) {
        console.error('CSV import failed:', err);
      }
    };
    input.click();
  }, []);

  // ── Export actions ──

  const exportSVG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const dataUrl = await toSvg(el, { filter: exportFilter });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${viewSlug}.svg`;
      a.click();
    } catch (err) { console.error('SVG export failed:', err); }
  }, [viewSlug]);

  const exportPNG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { pixelRatio: 2, filter: exportFilter });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${viewSlug}.png`;
      a.click();
    } catch (err) { console.error('PNG export failed:', err); }
  }, [viewSlug]);

  const exportPDF = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const canvas = await toCanvas(el, { pixelRatio: 2, filter: exportFilter });
      const imgData = canvas.toDataURL('image/png');
      const w = canvas.width;
      const h = canvas.height;
      const orientation = w > h ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] });
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`${viewSlug}.pdf`);
    } catch (err) { console.error('PDF export failed:', err); }
  }, [viewSlug]);

  const copyToClipboard = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const canvas = await toCanvas(el, { pixelRatio: 2, filter: exportFilter });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          notifySuccess('Copied to clipboard');
        } catch { console.warn('Clipboard API not available'); }
      }, 'image/png');
    } catch (err) { console.error('Copy to clipboard failed:', err); }
  }, []);

  const exportXml = useCallback(async () => {
    try {
      const xml = await exportArchimateXml();
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'architecture-model.xml';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('ArchiMate XML export failed:', err); }
  }, []);

  const exportCsvFiles = useCallback(async () => {
    try {
      const data = await exportCsv();
      for (const [name, content] of Object.entries(data)) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) { console.error('CSV export failed:', err); }
  }, []);

  const exportJson = useCallback(async () => {
    try {
      const data = await exportModelBatch(currentView?.id);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${viewSlug}-model.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('JSON export failed:', err); }
  }, [currentView?.id, viewSlug]);

  const exportHtml = useCallback(async () => {
    try { await exportHtmlReport(); }
    catch (err) { console.error('HTML report export failed:', err); }
  }, []);

  // ── Format painter ──

  const handleFormatPainter = useCallback(() => {
    if (formatPainter.active) {
      deactivateFormatPainter();
      return;
    }
    if (!selectedId) {
      window.alert('Select an element first to copy its appearance.');
      return;
    }
    const ve = viewElements.find(v => v.element_id === selectedId);
    const overrides = (ve?.style_overrides as Record<string, unknown>) ?? {};
    activateFormatPainter(overrides);
  }, [formatPainter.active, selectedId, viewElements, activateFormatPainter, deactivateFormatPainter]);

  // ── Menu definitions ──

  const fileMenu: MenuEntry[] = [
    { label: 'New Model', shortcut: 'Ctrl+N', action: handleNew },
    { label: 'Open Model\u2026', shortcut: 'Ctrl+O', action: handleOpen },
    { label: 'Save Model', shortcut: 'Ctrl+S', action: handleSave },
    'divider',
    {
      label: 'Import',
      children: [
        { label: 'ArchiMate XML\u2026', action: handleImportXml },
        { label: 'CSV (Archi format)\u2026', action: handleImportCsv },
      ],
    },
    {
      label: 'Export',
      children: [
        { label: 'SVG (vector)', action: exportSVG },
        { label: 'PNG (2\u00d7 retina)', action: exportPNG },
        { label: 'PDF', action: exportPDF },
        { label: 'Copy Image to Clipboard', action: copyToClipboard },
        { label: 'ArchiMate XML', action: exportXml },
        { label: 'CSV (Archi format)', action: exportCsvFiles },
        { label: 'JSON (.archvis)', action: exportJson },
        { label: 'HTML Report', action: exportHtml },
      ],
    },
    'divider',
    { label: 'Print\u2026', shortcut: 'Ctrl+P', action: () => window.print() },
    'divider',
    { label: 'Close Model (Reload Seed)', action: handleClose },
  ];

  const editMenu: MenuEntry[] = [
    { label: 'Undo', shortcut: 'Ctrl+Z', action: () => { if (canUndo) undo(); }, disabled: !canUndo },
    { label: 'Redo', shortcut: 'Ctrl+Y', action: () => { if (canRedo) redo(); }, disabled: !canRedo },
    'divider',
    { label: 'Find & Replace\u2026', shortcut: 'Ctrl+H', action: onToggleFindReplace, checked: findReplaceOpen },
    { label: 'Select All', shortcut: 'Ctrl+A', action: () => document.dispatchEvent(new CustomEvent('arch-vis:select-all')) },
  ];

  const viewMenu: MenuEntry[] = [
    { label: 'Model Tree & Views', action: toggleLeftPanel, checked: leftPanelOpen },
    { label: 'Palette & Controls', action: toggleRightPanel, checked: rightPanelOpen },
    { label: 'Properties Panel', action: toggleBottomPanel, checked: bottomPanelOpen },
    'divider',
    { label: 'Full Screen', shortcut: 'F11', action: toggleFullScreen, checked: fullScreen },
    'divider',
    {
      label: 'Theme',
      children: [
        { label: 'Dark', action: () => setTheme('dark'), checked: theme === 'dark' },
        { label: 'Light', action: () => setTheme('light'), checked: theme === 'light' },
      ],
    },
  ];

  const toolsMenu: MenuEntry[] = [
    { label: 'Validate Model', action: onToggleValidation, checked: validationOpen },
    { label: 'Relationship Matrix', action: onToggleMatrix, checked: matrixOpen },
    { label: 'Specialisations Manager', action: onToggleSpecs, checked: specsManagerOpen },
    'divider',
    {
      label: formatPainter.active ? 'Format Painter (active)' : 'Format Painter',
      action: handleFormatPainter,
      checked: formatPainter.active,
    },
  ];

  const helpMenu: MenuEntry[] = [
    { label: 'Feature Reference', shortcut: 'F1', action: onToggleHelp },
    { label: 'Keyboard Shortcuts', action: onToggleHelp },
  ];

  const menus: MenuDef[] = [
    { label: 'File', items: fileMenu },
    { label: 'Edit', items: editMenu },
    { label: 'View', items: viewMenu },
    { label: 'Tools', items: toolsMenu },
    { label: 'Help', items: helpMenu },
  ];

  return (
    <div ref={barRef} style={menuBarStyle} data-panel="menubar">
      {/* Brand */}
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, padding: '0 10px 0 4px', color: 'var(--text-primary)' }}>
        arch-vis
      </span>

      {/* Menu triggers */}
      {menus.map((menu) => (
        <div key={menu.label} style={{ position: 'relative' }}>
          <button
            onClick={() => handleMenuClick(menu.label)}
            onMouseEnter={() => handleMenuHover(menu.label)}
            style={{
              ...menuTriggerBase,
              background: openMenu === menu.label ? 'var(--bg-tertiary)' : 'transparent',
              fontWeight: openMenu === menu.label ? 600 : 400,
            }}
            onMouseOver={(e) => {
              if (!openMenu) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)';
            }}
            onMouseOut={(e) => {
              if (openMenu !== menu.label) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {menu.label}
          </button>
          {openMenu === menu.label && (
            <MenuDropdown items={menu.items} onClose={closeAll} />
          )}
        </div>
      ))}
    </div>
  );
}
