import React, { useState, useCallback } from 'react';
import { toPng, toSvg, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { exportArchimateXml, exportCsv, exportModelBatch, exportHtmlReport } from '../api/client';
import { useViewStore } from '../store/view';

/** Filter out minimap, controls, and panel overlays from image export. */
function exportFilter(node: HTMLElement): boolean {
  if (!(node instanceof HTMLElement)) return true;
  const cls = node.classList;
  if (!cls) return true;
  if (cls.contains('react-flow__minimap')) return false;
  if (cls.contains('react-flow__controls')) return false;
  if (cls.contains('react-flow__panel')) return false;
  return true;
}

/** Sanitise a view name into a safe filename slug. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'diagram';
}

export function ExportMenu(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const currentView = useViewStore(s => s.currentView);
  const viewSlug = slugify(currentView?.name ?? 'architecture-diagram');

  function getFlowElement(): HTMLElement | null {
    return document.querySelector('.react-flow') as HTMLElement | null;
  }

  const exportSVG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const dataUrl = await toSvg(el, {
        filter: exportFilter,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${viewSlug}.svg`;
      a.click();
    } catch (err) {
      console.error('SVG export failed:', err);
    }
    setOpen(false);
  }, [viewSlug]);

  const exportPNG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        filter: exportFilter,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${viewSlug}.png`;
      a.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    }
    setOpen(false);
  }, [viewSlug]);

  const exportPDF = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const canvas = await toCanvas(el, {
        pixelRatio: 2,
        filter: exportFilter,
      });
      const imgData = canvas.toDataURL('image/png');
      const w = canvas.width;
      const h = canvas.height;
      // Choose landscape or portrait based on aspect ratio
      const orientation = w > h ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h] });
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`${viewSlug}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
    setOpen(false);
  }, [viewSlug]);

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
    } catch (err) {
      console.error('ArchiMate XML export failed:', err);
    }
    setOpen(false);
  }, []);

  const exportCsvFiles = useCallback(async () => {
    try {
      const data = await exportCsv();
      // Download each CSV as a separate file
      for (const [name, content] of Object.entries(data)) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('CSV export failed:', err);
    }
    setOpen(false);
  }, []);

  const exportHtml = useCallback(async () => {
    try {
      await exportHtmlReport();
    } catch (err) {
      console.error('HTML report export failed:', err);
    }
    setOpen(false);
  }, []);

  const copyToClipboard = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const canvas = await toCanvas(el, {
        pixelRatio: 2,
        filter: exportFilter,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
        } catch {
          // Fallback: some browsers don't support ClipboardItem
          console.warn('Clipboard API not available');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
    }
    setOpen(false);
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
    } catch (err) {
      console.error('JSON export failed:', err);
    }
    setOpen(false);
  }, [currentView?.id, viewSlug]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'var(--button-bg)',
          color: 'var(--button-text)',
          border: '1px solid var(--border-primary)',
          borderRadius: 4,
          padding: '3px 10px',
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        Export
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: 4,
            overflow: 'hidden',
            zIndex: 100,
            minWidth: 120,
          }}
          onMouseLeave={() => setOpen(false)}
        >
          <button onClick={exportSVG} style={menuItemStyle()} title="Vector image, print quality">Export SVG</button>
          <button onClick={exportPNG} style={menuItemStyle()} title="Rasterised image, 2x retina">Export PNG</button>
          <button onClick={exportPDF} style={menuItemStyle()} title="PDF document, auto landscape/portrait">Export PDF</button>
          <button onClick={copyToClipboard} style={menuItemStyle()} title="Copy diagram as PNG to clipboard">Copy to Clipboard</button>
          <button onClick={() => { window.print(); setOpen(false); }} style={menuItemStyle()} title="Print diagram (Ctrl+P)">Print Diagram</button>
          <div style={{ borderTop: '1px solid var(--border-primary)' }} />
          <button onClick={exportJson} style={menuItemStyle()} title="Full model backup as JSON">Export JSON</button>
          <button onClick={exportXml} style={menuItemStyle()} title="ArchiMate Open Exchange format">Export ArchiMate XML</button>
          <button onClick={exportCsvFiles} style={menuItemStyle()} title="Archi-compatible CSV files">Export CSV (Archi)</button>
          <button onClick={exportHtml} style={menuItemStyle()} title="Self-contained HTML report of the full model">Export HTML Report</button>
        </div>
      )}
    </div>
  );
}

function menuItemStyle(): React.CSSProperties {
  return {
    display: 'block',
    width: '100%',
    background: 'transparent',
    color: 'var(--text-primary)',
    border: 'none',
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 11,
    textAlign: 'left',
  };
}
