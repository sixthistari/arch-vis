import { Router, Request, Response } from 'express';
import db from '../db.js';

const router = Router();

// ═══════════════════════════════════════
// Types for query results
// ═══════════════════════════════════════

interface ElementRow {
  id: string;
  name: string;
  archimate_type: string;
  specialisation: string | null;
  layer: string;
  sublayer: string | null;
  domain_id: string | null;
  status: string;
  description: string | null;
  properties: string | null;
  parent_id: string | null;
}

interface RelationshipRow {
  id: string;
  archimate_type: string;
  specialisation: string | null;
  source_id: string;
  target_id: string;
  label: string | null;
  description: string | null;
}

interface DomainRow {
  id: string;
  name: string;
}

interface ViewRow {
  id: string;
  name: string;
  viewpoint_type: string;
  description: string | null;
}

interface ViewElementRow {
  view_id: string;
  element_id: string;
}

// ═══════════════════════════════════════
// Colour palette per layer
// ═══════════════════════════════════════

const LAYER_COLOURS: Record<string, { bg: string; border: string; darkBg: string; darkBorder: string }> = {
  motivation:     { bg: '#e8d8f0', border: '#c4a4d4', darkBg: '#3d2a4d', darkBorder: '#7a5a8e' },
  strategy:       { bg: '#f5e6cc', border: '#d4b88c', darkBg: '#4d3d2a', darkBorder: '#8e7a5a' },
  business:       { bg: '#ffffcc', border: '#cccc66', darkBg: '#4d4d2a', darkBorder: '#8e8e5a' },
  application:    { bg: '#ccf0ff', border: '#66c4e0', darkBg: '#2a3d4d', darkBorder: '#5a7a8e' },
  technology:     { bg: '#ccffcc', border: '#66cc66', darkBg: '#2a4d2a', darkBorder: '#5a8e5a' },
  data:           { bg: '#ccf0ff', border: '#66c4e0', darkBg: '#2a3d4d', darkBorder: '#5a7a8e' },
  implementation: { bg: '#ffd4cc', border: '#e09466', darkBg: '#4d2a2a', darkBorder: '#8e5a5a' },
  none:           { bg: '#e8e8e8', border: '#aaaaaa', darkBg: '#3a3a3a', darkBorder: '#666666' },
};

// ═══════════════════════════════════════
// HTML generation helpers
// ═══════════════════════════════════════

function esc(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatType(type: string): string {
  return type
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function layerLabel(layer: string): string {
  return layer.charAt(0).toUpperCase() + layer.slice(1) + ' Layer';
}

// ═══════════════════════════════════════
// GET /api/reports/html
// ═══════════════════════════════════════

router.get('/reports/html', (_req: Request, res: Response) => {
  // Query all data
  const elements = db.prepare('SELECT id, name, archimate_type, specialisation, layer, sublayer, domain_id, status, description, properties, parent_id FROM elements ORDER BY layer, name').all() as ElementRow[];
  const relationships = db.prepare('SELECT id, archimate_type, specialisation, source_id, target_id, label, description FROM relationships').all() as RelationshipRow[];
  const domains = db.prepare('SELECT id, name FROM domains').all() as DomainRow[];
  const views = db.prepare('SELECT id, name, viewpoint_type, description FROM views').all() as ViewRow[];
  const viewElements = db.prepare('SELECT view_id, element_id FROM view_elements').all() as ViewElementRow[];

  // Build lookup maps
  const domainMap = new Map(domains.map(d => [d.id, d.name]));
  const elementMap = new Map(elements.map(e => [e.id, e]));

  // Group elements by layer
  const layerGroups = new Map<string, ElementRow[]>();
  for (const el of elements) {
    const group = layerGroups.get(el.layer) ?? [];
    group.push(el);
    layerGroups.set(el.layer, group);
  }

  // Relationships by element
  const outgoing = new Map<string, RelationshipRow[]>();
  const incoming = new Map<string, RelationshipRow[]>();
  for (const rel of relationships) {
    const out = outgoing.get(rel.source_id) ?? [];
    out.push(rel);
    outgoing.set(rel.source_id, out);
    const inc = incoming.get(rel.target_id) ?? [];
    inc.push(rel);
    incoming.set(rel.target_id, inc);
  }

  // Views by element
  const elementViews = new Map<string, ViewRow[]>();
  for (const ve of viewElements) {
    const view = views.find(v => v.id === ve.view_id);
    if (!view) continue;
    const list = elementViews.get(ve.element_id) ?? [];
    list.push(view);
    elementViews.set(ve.element_id, list);
  }

  // Layer ordering
  const layerOrder = ['motivation', 'strategy', 'business', 'application', 'technology', 'data', 'implementation', 'none'];

  // ─── Build sidebar ───
  let sidebarHtml = '';
  for (const layer of layerOrder) {
    const group = layerGroups.get(layer);
    if (!group || group.length === 0) continue;
    sidebarHtml += `
      <div class="nav-group" data-layer="${esc(layer)}">
        <button class="nav-group-toggle" onclick="toggleGroup(this)" aria-expanded="true">
          <span class="toggle-icon">&#9660;</span> ${esc(layerLabel(layer))}
          <span class="count">(${group.length})</span>
        </button>
        <div class="nav-group-items">`;
    for (const el of group) {
      sidebarHtml += `
          <a class="nav-item" href="#el-${esc(el.id)}" data-name="${esc(el.name.toLowerCase())}" data-layer="${esc(layer)}">${esc(el.name)}</a>`;
    }
    sidebarHtml += `
        </div>
      </div>`;
  }

  // ─── Build main content ───
  let mainHtml = `
    <div class="summary">
      <h1>Architecture Report</h1>
      <p class="subtitle">Generated ${new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <div class="stats">
        <div class="stat"><span class="stat-value">${elements.length}</span><span class="stat-label">Elements</span></div>
        <div class="stat"><span class="stat-value">${relationships.length}</span><span class="stat-label">Relationships</span></div>
        <div class="stat"><span class="stat-value">${views.length}</span><span class="stat-label">Views</span></div>
        <div class="stat"><span class="stat-value">${domains.length}</span><span class="stat-label">Domains</span></div>
      </div>
    </div>`;

  // Views section
  if (views.length > 0) {
    mainHtml += `<h2 id="views-section">Views</h2><div class="views-grid">`;
    for (const view of views) {
      const elCount = viewElements.filter(ve => ve.view_id === view.id).length;
      mainHtml += `
        <div class="view-card">
          <h3>${esc(view.name)}</h3>
          <p class="view-type">${esc(formatType(view.viewpoint_type))}</p>
          ${view.description ? `<p class="view-desc">${esc(view.description)}</p>` : ''}
          <p class="view-count">${elCount} element${elCount !== 1 ? 's' : ''}</p>
        </div>`;
    }
    mainHtml += `</div>`;
  }

  // Element sections
  mainHtml += `<h2>Elements</h2>`;
  for (const layer of layerOrder) {
    const group = layerGroups.get(layer);
    if (!group || group.length === 0) continue;

    mainHtml += `<h3 class="layer-heading" data-layer="${esc(layer)}">${esc(layerLabel(layer))}</h3>`;

    for (const el of group) {
      const defaultColours = { bg: '#e8e8e8', border: '#aaaaaa', darkBg: '#3a3a3a', darkBorder: '#666666' };
      const colours = LAYER_COLOURS[el.layer] ?? defaultColours;
      const elOutgoing = outgoing.get(el.id) ?? [];
      const elIncoming = incoming.get(el.id) ?? [];
      const elViews = elementViews.get(el.id) ?? [];
      const domain = el.domain_id ? domainMap.get(el.domain_id) : null;

      let props: Record<string, unknown> = {};
      if (el.properties) {
        try { props = JSON.parse(el.properties); } catch { /* ignore */ }
      }

      mainHtml += `
      <div class="element-card" id="el-${esc(el.id)}" data-layer="${esc(el.layer)}" style="--layer-bg: ${colours.bg}; --layer-border: ${colours.border}; --layer-dark-bg: ${colours.darkBg}; --layer-dark-border: ${colours.darkBorder};">
        <div class="element-header">
          <h4>${esc(el.name)}</h4>
          <span class="element-type">${esc(formatType(el.archimate_type))}</span>
        </div>
        <div class="element-meta">
          <span class="badge layer-badge">${esc(el.layer)}</span>
          <span class="badge status-badge status-${esc(el.status)}">${esc(el.status)}</span>
          ${el.specialisation ? `<span class="badge spec-badge">${esc(el.specialisation)}</span>` : ''}
          ${domain ? `<span class="badge domain-badge">${esc(domain)}</span>` : ''}
          ${el.sublayer ? `<span class="badge sublayer-badge">${esc(el.sublayer)}</span>` : ''}
        </div>
        ${el.description ? `<p class="element-desc">${esc(el.description)}</p>` : ''}`;

      // Properties
      const propEntries = Object.entries(props).filter(([, v]) => v != null && v !== '');
      if (propEntries.length > 0) {
        mainHtml += `<div class="element-section"><h5>Properties</h5><table class="props-table">`;
        for (const [key, val] of propEntries) {
          mainHtml += `<tr><td class="prop-key">${esc(formatType(key))}</td><td>${esc(String(val))}</td></tr>`;
        }
        mainHtml += `</table></div>`;
      }

      // Outgoing relationships
      if (elOutgoing.length > 0) {
        mainHtml += `<div class="element-section"><h5>Outgoing Relationships</h5><ul class="rel-list">`;
        for (const rel of elOutgoing) {
          const target = elementMap.get(rel.target_id);
          const targetName = target ? target.name : rel.target_id;
          mainHtml += `<li>
            <span class="rel-type">${esc(formatType(rel.archimate_type))}</span>
            ${rel.label ? `<span class="rel-label">"${esc(rel.label)}"</span>` : ''}
            &rarr; <a href="#el-${esc(rel.target_id)}">${esc(targetName)}</a>
          </li>`;
        }
        mainHtml += `</ul></div>`;
      }

      // Incoming relationships
      if (elIncoming.length > 0) {
        mainHtml += `<div class="element-section"><h5>Incoming Relationships</h5><ul class="rel-list">`;
        for (const rel of elIncoming) {
          const source = elementMap.get(rel.source_id);
          const sourceName = source ? source.name : rel.source_id;
          mainHtml += `<li>
            <a href="#el-${esc(rel.source_id)}">${esc(sourceName)}</a> &rarr;
            <span class="rel-type">${esc(formatType(rel.archimate_type))}</span>
            ${rel.label ? `<span class="rel-label">"${esc(rel.label)}"</span>` : ''}
          </li>`;
        }
        mainHtml += `</ul></div>`;
      }

      // Views containing this element
      if (elViews.length > 0) {
        mainHtml += `<div class="element-section"><h5>Appears In Views</h5><ul class="view-list">`;
        for (const v of elViews) {
          mainHtml += `<li>${esc(v.name)} <span class="view-type-small">(${esc(formatType(v.viewpoint_type))})</span></li>`;
        }
        mainHtml += `</ul></div>`;
      }

      mainHtml += `</div>`;
    }
  }

  // ─── Assemble full HTML ───
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Architecture Report</title>
<style>
${embeddedCss()}
</style>
</head>
<body>
<nav id="sidebar">
  <div class="sidebar-header">
    <h2>Architecture Model</h2>
    <input type="text" id="search" placeholder="Search elements\u2026" autocomplete="off" />
  </div>
  <div class="sidebar-nav">
    ${sidebarHtml}
  </div>
</nav>
<main id="content">
  ${mainHtml}
  <footer>
    <p>Generated by arch-vis &mdash; ${new Date().toISOString()}</p>
  </footer>
</main>
<script>
${embeddedJs()}
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="architecture-report.html"');
  res.send(html);
});

// ═══════════════════════════════════════
// Embedded CSS
// ═══════════════════════════════════════

function embeddedCss(): string {
  return `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --sidebar-width: 280px;
  --bg: #ffffff;
  --bg-alt: #f8f9fa;
  --text: #1a1a1a;
  --text-muted: #666666;
  --border: #e0e0e0;
  --accent: #2563eb;
  --accent-hover: #1d4ed8;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a2e;
    --bg-alt: #16213e;
    --text: #e0e0e0;
    --text-muted: #999999;
    --border: #333355;
    --accent: #60a5fa;
    --accent-hover: #93c5fd;
    --card-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  display: flex;
  min-height: 100vh;
}

a { color: var(--accent); text-decoration: none; }
a:hover { color: var(--accent-hover); text-decoration: underline; }

/* Sidebar */
#sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-alt);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg-alt);
  z-index: 1;
}

.sidebar-header h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

#search {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  outline: none;
}

#search:focus { border-color: var(--accent); }

.sidebar-nav { padding: 8px 0; flex: 1; overflow-y: auto; }

.nav-group { margin-bottom: 2px; }

.nav-group-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 6px 16px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.nav-group-toggle:hover { background: var(--border); }

.toggle-icon { font-size: 8px; width: 12px; display: inline-block; transition: transform 0.15s; }
.nav-group-toggle[aria-expanded="false"] .toggle-icon { transform: rotate(-90deg); }

.count { color: var(--text-muted); font-weight: 400; margin-left: auto; }

.nav-group-items { overflow: hidden; }
.nav-group-toggle[aria-expanded="false"] + .nav-group-items { display: none; }

.nav-item {
  display: block;
  padding: 3px 16px 3px 32px;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
}

.nav-item:hover { color: var(--accent); background: var(--border); text-decoration: none; }
.nav-item.hidden { display: none; }

/* Main content */
#content {
  margin-left: var(--sidebar-width);
  flex: 1;
  padding: 32px 40px;
  max-width: 960px;
}

.summary { margin-bottom: 32px; }
.summary h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
.subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 16px; }

.stats { display: flex; gap: 24px; flex-wrap: wrap; }
.stat { text-align: center; }
.stat-value { display: block; font-size: 28px; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

h2 { font-size: 20px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid var(--border); }
h3.layer-heading { font-size: 16px; margin: 24px 0 12px; color: var(--text-muted); }

/* Views grid */
.views-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px; }
.view-card {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg-alt);
}
.view-card h3 { font-size: 13px; margin-bottom: 4px; }
.view-type { font-size: 11px; color: var(--text-muted); }
.view-desc { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.view-count { font-size: 11px; color: var(--text-muted); margin-top: 6px; }

/* Element cards */
.element-card {
  border: 1px solid var(--layer-border, var(--border));
  border-left: 4px solid var(--layer-border, var(--border));
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--layer-bg, var(--bg-alt));
  box-shadow: var(--card-shadow);
  scroll-margin-top: 16px;
}

@media (prefers-color-scheme: dark) {
  .element-card {
    background: var(--layer-dark-bg, var(--bg-alt));
    border-color: var(--layer-dark-border, var(--border));
    border-left-color: var(--layer-dark-border, var(--border));
  }
}

.element-card.hidden { display: none; }

.element-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.element-header h4 { font-size: 15px; font-weight: 600; }
.element-type { font-size: 11px; color: var(--text-muted); font-style: italic; }

.element-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }

.badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: var(--bg);
}

@media (prefers-color-scheme: dark) {
  .badge { background: var(--bg-alt); }
}

.status-active { color: #16a34a; border-color: #16a34a; }
.status-draft { color: #ca8a04; border-color: #ca8a04; }
.status-deprecated { color: #dc2626; border-color: #dc2626; }
.status-retired { color: #9ca3af; border-color: #9ca3af; }
.status-superseded { color: #f97316; border-color: #f97316; }

.element-desc { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }

.element-section { margin-top: 10px; }
.element-section h5 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px; }

.props-table { font-size: 12px; border-collapse: collapse; width: 100%; }
.props-table td { padding: 2px 8px 2px 0; vertical-align: top; }
.prop-key { font-weight: 500; white-space: nowrap; color: var(--text-muted); width: 1%; }

.rel-list, .view-list { list-style: none; font-size: 12px; }
.rel-list li, .view-list li { padding: 2px 0; }
.rel-type { font-weight: 500; }
.rel-label { color: var(--text-muted); font-style: italic; }
.view-type-small { color: var(--text-muted); font-size: 11px; }

footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--text-muted); font-size: 11px; }

/* Responsive */
@media (max-width: 768px) {
  #sidebar { position: relative; width: 100%; height: auto; max-height: 40vh; border-right: none; border-bottom: 1px solid var(--border); }
  #content { margin-left: 0; padding: 16px; }
  body { flex-direction: column; }
  :root { --sidebar-width: 100%; }
}
`;
}

// ═══════════════════════════════════════
// Embedded JavaScript
// ═══════════════════════════════════════

function embeddedJs(): string {
  return `
(function() {
  var searchInput = document.getElementById('search');
  var navItems = document.querySelectorAll('.nav-item');
  var cards = document.querySelectorAll('.element-card');

  // Search/filter
  searchInput.addEventListener('input', function() {
    var query = this.value.toLowerCase().trim();
    navItems.forEach(function(item) {
      var name = item.getAttribute('data-name') || '';
      item.classList.toggle('hidden', query !== '' && name.indexOf(query) === -1);
    });
    cards.forEach(function(card) {
      var heading = card.querySelector('h4');
      var name = heading ? heading.textContent.toLowerCase() : '';
      card.classList.toggle('hidden', query !== '' && name.indexOf(query) === -1);
    });
  });

  // Smooth scroll for nav links
  document.querySelectorAll('.nav-item').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (!targetId) return;
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Brief highlight
        target.style.outline = '2px solid var(--accent)';
        setTimeout(function() { target.style.outline = ''; }, 1500);
      }
    });
  });
})();

// Toggle layer groups
function toggleGroup(btn) {
  var expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
}
`;
}

export default router;
