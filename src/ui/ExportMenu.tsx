import React, { useState, useCallback } from 'react';
import { toPng, toSvg } from 'html-to-image';
import { exportArchimateXml, exportCsv } from '../api/client';

export function ExportMenu(): React.ReactElement {
  const [open, setOpen] = useState(false);

  function getFlowElement(): HTMLElement | null {
    return document.querySelector('.react-flow') as HTMLElement | null;
  }

  const exportSVG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const dataUrl = await toSvg(el, { backgroundColor: undefined });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'architecture-diagram.svg';
      a.click();
    } catch (err) {
      console.error('SVG export failed:', err);
    }
    setOpen(false);
  }, []);

  const exportPNG = useCallback(async () => {
    const el = getFlowElement();
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'architecture-diagram.png';
      a.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    }
    setOpen(false);
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
          <button onClick={exportSVG} style={menuItemStyle()}>Export SVG</button>
          <button onClick={exportPNG} style={menuItemStyle()}>Export PNG</button>
          <div style={{ borderTop: '1px solid var(--border-primary)' }} />
          <button onClick={exportXml} style={menuItemStyle()}>Export ArchiMate XML</button>
          <button onClick={exportCsvFiles} style={menuItemStyle()}>Export CSV (Archi)</button>
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
