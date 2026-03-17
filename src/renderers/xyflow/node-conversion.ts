/**
 * Node conversion — transforms model Elements + ViewElements into ReactFlow Nodes.
 *
 * Extracted from Canvas.tsx for modularity.
 */
import type { Node } from '@xyflow/react';
import type { LayerBandNodeData } from './nodes/LayerBandNode';
import type { Element, ViewElement } from '../../model/types';
import { getShapeDefinition } from '../../shared/registry';
import { getNotation, getNodeType } from '../../model/notation';
import { heatmapColour } from '../../store/data-overlay';
import { computeGridLayout, FALLBACK_LAYER_ORDER, FALLBACK_SUBLAYER_ORDER } from './layout-computation';
import { computeLayerBands, BAND_PAD, type LayerBandInfo } from './layer-bands';
import { computeUcdLayout, type UcdBoundary } from '../../layout/ucd-layout';
import type { Relationship } from '../../model/types';
import type { UcdBoundaryNodeData } from './nodes';

// ═══════════════════════════════════════
// Data overlay colour maps
// ═══════════════════════════════════════

const STATUS_COLOURS: Record<string, string> = {
  active: '#22C55E', draft: '#94A3B8', superseded: '#F59E0B',
  deprecated: '#EF4444', retired: '#6B7280',
};

const MATURITY_COLOURS: Record<string, string> = {
  initial: '#EF4444', defined: '#F59E0B', managed: '#3B82F6', optimised: '#22C55E',
};

const DOMAIN_PALETTE = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#EAB308', '#6366F1', '#06B6D4'];

function domainColour(domainId: string): string {
  let hash = 0;
  for (let i = 0; i < domainId.length; i++) hash = ((hash << 5) - hash + domainId.charCodeAt(i)) | 0;
  return DOMAIN_PALETTE[Math.abs(hash) % DOMAIN_PALETTE.length]!;
}

export interface OverlayConfig {
  colourByProperty: string | null;
  /** Numeric property key for continuous heatmap colour mapping. */
  heatmapProperty: string | null;
  showStatusBadge: boolean;
  displayFieldKeys: string[];
}

// ═══════════════════════════════════════
// Data conversion: model → xyflow
// ═══════════════════════════════════════

export function elementsToNodes(
  elements: Element[],
  viewElements: ViewElement[],
  theme: 'dark' | 'light' = 'dark',
  layerOrder: Record<string, number> = FALLBACK_LAYER_ORDER,
  sublayerOrder: Record<string, number> = FALLBACK_SUBLAYER_ORDER,
  layerLabels: Record<string, string> = {},
  onLabelChange?: (id: string, newLabel: string) => void,
  overlay?: OverlayConfig,
  relationships?: Relationship[],
  viewpointType?: string,
): Node[] {
  const posMap = new Map(viewElements.map(ve => [ve.element_id, ve]));

  // ── Detect UCD view and use specialised layout ─────────────────────────
  const isUcd = viewpointType === 'uml_usecase' || (
    !viewpointType && elements.length > 0 &&
    elements.every(el => el.archimate_type === 'uml-actor' || el.archimate_type === 'uml-use-case')
  );

  // Find elements that need auto-layout (no saved position or at 0,0)
  const needsLayout = elements.filter(el => {
    const ve = posMap.get(el.id);
    return !ve || (ve.x === 0 && ve.y === 0);
  });

  // Compute layout positions for elements that need layout
  let gridPositions: Map<string, { x: number; y: number }> | null = null;
  let ucdBoundary: UcdBoundary | null = null;

  if (needsLayout.length > 0) {
    if (isUcd) {
      const ucdResult = computeUcdLayout(needsLayout, relationships ?? []);
      gridPositions = ucdResult.positions;
      ucdBoundary = ucdResult.boundary;
    } else {
      gridPositions = computeGridLayout(needsLayout, layerOrder, sublayerOrder);
    }
  }

  // For UCD views with saved positions, compute boundary from existing positions
  if (isUcd && !ucdBoundary) {
    const useCaseEls = elements.filter(e => e.archimate_type === 'uml-use-case');
    if (useCaseEls.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const uc of useCaseEls) {
        const ve = posMap.get(uc.id);
        if (!ve) continue;
        const x = ve.x, y = ve.y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + 140 > maxX) maxX = x + 140;
        if (y + 50 > maxY) maxY = y + 50;
      }
      if (minX < Infinity) {
        const pad = 40;
        ucdBoundary = {
          x: minX - pad,
          y: minY - pad - 20, // extra room for title
          width: maxX - minX + pad * 2,
          height: maxY - minY + pad * 2 + 20,
        };
      }
    }
  }

  // Build all positions map (saved + grid) for layer band computation
  const allPositions = new Map<string, { x: number; y: number }>();

  const elementNodes: Node[] = elements.map((el) => {
    const ve = posMap.get(el.id);
    const shapeDef = getShapeDefinition(el.archimate_type);
    const hasSavedPosition = ve && (ve.x !== 0 || ve.y !== 0);
    const gridPos = hasSavedPosition ? null : gridPositions?.get(el.id);

    const pos = {
      x: hasSavedPosition ? ve.x : (gridPos?.x ?? 0),
      y: hasSavedPosition ? ve.y : (gridPos?.y ?? 0),
    };
    allPositions.set(el.id, pos);

    const nodeType = getNodeType(el.archimate_type);
    const notation = getNotation(el.archimate_type);

    // Build notation-appropriate data object
    let data: Record<string, unknown>;
    if (nodeType === 'uml-class') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      data = {
        label: el.name,
        classType: el.archimate_type.replace('uml-', '') as string,
        attributes: (props.attributes as unknown[]) ?? [],
        methods: (props.methods as unknown[]) ?? [],
        enumValues: (props.literals as string[]) ?? [],
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'uml-component') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      // Normalise ports: if they're plain strings, convert to UmlPort objects
      const rawPorts = (props.ports as unknown[]) ?? [];
      const normalisedPorts = rawPorts.map((p, i) => {
        if (typeof p === 'string') {
          return { id: `port-${i}`, name: p, side: 'right' as const, portType: 'provided' as const, offset: (i + 1) / (rawPorts.length + 1) };
        }
        return p;
      });
      data = {
        label: el.name,
        stereotype: (props.stereotype as string) ?? undefined,
        ports: normalisedPorts,
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'uml-package') {
      data = {
        label: el.name,
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'uml-use-case') {
      data = {
        label: el.name,
        useCaseType: el.archimate_type === 'uml-actor' ? 'actor' : 'use-case',
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'uml-state') {
      const stateProps = (el.properties ?? {}) as Record<string, unknown>;
      data = {
        label: el.name,
        stateType: (stateProps.stateType as string) ?? 'state',
        activities: (stateProps.activities as unknown[]) ?? [],
        isVertical: (stateProps.isVertical as boolean) ?? false,
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'sequence-lifeline') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      data = {
        label: el.name,
        stereotype: (props.stereotype as string) ?? undefined,
        lifelineHeight: (props.lifelineHeight as number) ?? 500,
        destroyed: (props.destroyed as boolean) ?? false,
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'sequence-activation') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      data = {
        activationHeight: (props.activationHeight as number) ?? 60,
      };
    } else if (nodeType === 'sequence-fragment') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      data = {
        label: el.name,
        fragmentType: (props.fragmentType as string) ?? 'opt',
        guardCondition: (props.guardCondition as string) ?? undefined,
        compartments: (props.compartments as string[]) ?? undefined,
        fragmentWidth: (props.fragmentWidth as number) ?? 300,
        fragmentHeight: (props.fragmentHeight as number) ?? 150,
      };
    } else if (notation === 'process-flow') {
      if (nodeType === 'pf-task') {
        data = {
          label: el.name,
          taskType: el.archimate_type.replace('pf-', '') as string,
          theme,
          onLabelChange,
        };
      } else if (nodeType === 'pf-pseudo') {
        const pseudoMap: Record<string, string> = {
          'pf-start': 'start', 'pf-end': 'end', 'pf-timer': 'timer',
        };
        data = {
          label: el.name,
          pseudoType: pseudoMap[el.archimate_type] ?? 'start',
          theme,
          onLabelChange,
        };
      } else if (nodeType === 'pf-decision') {
        data = {
          label: el.name,
          decisionType: el.archimate_type === 'pf-gateway' ? 'gateway' : 'decision',
          theme,
          onLabelChange,
        };
      } else if (nodeType === 'pf-gate') {
        data = { label: el.name, theme, onLabelChange };
      } else if (nodeType === 'pf-swimlane') {
        data = { label: el.name, theme, onLabelChange };
      } else if (nodeType === 'pf-subprocess') {
        data = { label: el.name, theme, onLabelChange };
      } else {
        data = { label: el.name, theme, onLabelChange };
      }
    } else if (notation === 'data') {
      const dmProps = (el.properties ?? {}) as Record<string, unknown>;
      const isTable = el.archimate_type === 'dm-table';
      data = {
        label: el.name,
        entityType: isTable ? 'table' : 'entity',
        attributes: (dmProps.attributes as unknown[]) ?? [],
        theme,
        onLabelChange,
      };
    } else if (notation === 'wireframe') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      if (nodeType === 'wf-page') {
        data = { label: el.name, url: props.url, pageWidth: props.pageWidth, pageHeight: props.pageHeight, theme, onLabelChange };
      } else if (nodeType === 'wf-section') {
        data = { label: el.name, sectionType: props.sectionType ?? el.archimate_type.replace('wf-', ''), title: props.title, columns: props.columns, sectionWidth: props.sectionWidth, sectionHeight: props.sectionHeight, theme, onLabelChange };
      } else if (nodeType === 'wf-nav') {
        data = { label: el.name, navType: props.navType ?? 'horizontal', items: props.items ?? [], activeIndex: props.activeIndex ?? 0, navWidth: props.navWidth ?? 360, theme, onLabelChange };
      } else if (nodeType === 'wf-table') {
        data = { label: el.name, columns: props.columns ?? [], rows: props.rows ?? 4, sampleData: props.sampleData, hasActions: props.hasActions, hasPagination: props.hasPagination, hasSearch: props.hasSearch, tableWidth: props.tableWidth, theme, onLabelChange };
      } else if (nodeType === 'wf-form') {
        data = { label: el.name, fields: props.fields ?? [], submitLabel: props.submitLabel, cancelLabel: props.cancelLabel, formWidth: props.formWidth, theme, onLabelChange };
      } else if (nodeType === 'wf-list') {
        data = { label: el.name, items: props.items, listType: props.listType, theme, onLabelChange };
      } else if (nodeType === 'wf-control') {
        data = { label: el.name, controlType: props.controlType ?? el.archimate_type.replace('wf-', ''), variant: props.variant, placeholder: props.placeholder, value: props.value, theme, onLabelChange };
      } else {
        data = { label: el.name, theme, onLabelChange };
      }
    } else if (nodeType === 'uml-swimlane') {
      data = {
        label: el.name,
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'group') {
      data = {
        label: el.name,
        layer: el.layer,
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'annotation') {
      data = {
        label: el.name,
        description: el.description ?? undefined,
        theme,
        onLabelChange,
      };
    } else {
      // ArchiMate (default) — compute overlay data
      let colourOverride: { fill: string; stroke: string } | undefined;
      if (overlay?.colourByProperty === 'status') {
        const c = STATUS_COLOURS[el.status];
        if (c) colourOverride = { fill: c + '33', stroke: c };
      } else if (overlay?.colourByProperty === 'maturity') {
        const props = (el.properties ?? {}) as Record<string, unknown>;
        const maturity = (props.maturity as string) ?? undefined;
        if (maturity) {
          const c = MATURITY_COLOURS[maturity];
          if (c) colourOverride = { fill: c + '33', stroke: c };
        }
      } else if (overlay?.colourByProperty === 'domain' && el.domain_id) {
        const c = domainColour(el.domain_id);
        colourOverride = { fill: c + '33', stroke: c };
      } else if (overlay?.heatmapProperty) {
        const props = (el.properties ?? {}) as Record<string, unknown>;
        const rawVal = props[overlay.heatmapProperty];
        if (rawVal != null) {
          const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
          if (!isNaN(numVal)) {
            // Normalise: assume 0-100 range, clamp to [0,1]
            const t = Math.max(0, Math.min(1, numVal / 100));
            const c = heatmapColour(t);
            colourOverride = { fill: c + '33', stroke: c };
          }
        }
      }

      const statusBadge = overlay?.showStatusBadge ? el.status : undefined;

      const overlayDisplayFields = overlay?.displayFieldKeys && overlay.displayFieldKeys.length > 0
        ? overlay.displayFieldKeys.map(k => {
            if (k === 'status') return el.status;
            if (k === 'layer') return el.layer;
            if (k === 'domain_id') return el.domain_id ?? '';
            if (k === 'sublayer') return el.sublayer ?? '';
            return '';
          }).filter(Boolean)
        : undefined;

      // Per-element style override from view_elements.style_overrides
      const so = ve?.style_overrides as Record<string, string> | null | undefined;
      const styleOverride = (so?.fill || so?.stroke)
        ? { fill: so.fill, stroke: so.stroke } : undefined;

      data = {
        label: el.name,
        archimateType: el.archimate_type,
        specialisation: el.specialisation,
        layer: el.layer,
        theme,
        onLabelChange,
        colourOverride,
        styleOverride,
        statusBadge,
        displayFields: overlayDisplayFields,
      };
    }

    // Compute dimensions — notation-aware defaults
    let width: number;
    let height: number;
    if (notation === 'archimate') {
      width = ve?.width ?? Math.round(shapeDef.defaultWidth * 1.6);
      height = ve?.height ?? Math.round(shapeDef.defaultHeight * 1.6);
    } else if (nodeType === 'uml-class') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      const attrCount = Array.isArray(props.attributes) ? props.attributes.length : 0;
      const methCount = Array.isArray(props.methods) ? props.methods.length : 0;
      const litCount = Array.isArray(props.literals) ? props.literals.length : 0;
      // Estimate width from content length (approx 6.8px per monospace char at 11px)
      const allMembers: string[] = [];
      if (Array.isArray(props.attributes)) {
        for (const a of props.attributes as Array<{ name?: string; type?: string }>) {
          allMembers.push(`+ ${a.name ?? ''}${a.type ? ' : ' + a.type : ''}`);
        }
      }
      if (Array.isArray(props.methods)) {
        for (const m of props.methods as Array<{ name?: string; returnType?: string }>) {
          allMembers.push(`+ ${m.name ?? ''}()${m.returnType ? ' : ' + m.returnType : ''}`);
        }
      }
      if (Array.isArray(props.literals)) {
        for (const l of props.literals as string[]) allMembers.push(String(l));
      }
      allMembers.push(el.name);
      const longestLen = Math.max(0, ...allMembers.map(s => s.length));
      const contentWidth = Math.round(longestLen * 6.8 + 20);
      const autoWidth = Math.min(400, Math.max(180, contentWidth));
      width = ve?.width ?? autoWidth;
      height = ve?.height ?? Math.max(80, 40 + (attrCount + methCount + litCount) * 18);
    } else if (nodeType === 'uml-use-case') {
      if (el.archimate_type === 'uml-actor') {
        width = ve?.width ?? 60;
        height = ve?.height ?? 100;
      } else {
        width = ve?.width ?? 140;
        height = ve?.height ?? 50;
      }
    } else if (nodeType === 'sequence-lifeline') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      width = ve?.width ?? 120;
      height = ve?.height ?? ((props.lifelineHeight as number) ?? 500) + 40;
    } else if (nodeType === 'sequence-fragment') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      width = ve?.width ?? (props.fragmentWidth as number) ?? 300;
      height = ve?.height ?? (props.fragmentHeight as number) ?? 150;
    } else if (nodeType === 'sequence-activation') {
      const props = (el.properties ?? {}) as Record<string, unknown>;
      width = ve?.width ?? 12;
      height = ve?.height ?? (props.activationHeight as number) ?? 60;
    } else if (nodeType === 'uml-package') {
      width = ve?.width ?? 250;
      height = ve?.height ?? 200;
    } else if (nodeType === 'uml-swimlane') {
      width = ve?.width ?? 200;
      height = ve?.height ?? 400;
    } else if (nodeType === 'group') {
      width = ve?.width ?? 250;
      height = ve?.height ?? 200;
    } else if (nodeType === 'annotation') {
      width = ve?.width ?? 120;
      height = ve?.height ?? 80;
    } else if (notation === 'data') {
      const dmProps = (el.properties ?? {}) as Record<string, unknown>;
      const dmAttrCount = Array.isArray(dmProps.attributes) ? (dmProps.attributes as unknown[]).length : 0;
      const dmTexts = Array.isArray(dmProps.attributes)
        ? (dmProps.attributes as Array<{ name?: string; type?: string }>).map(a => `PK ${a.name ?? ''}${a.type ? ' : ' + a.type : ''}`)
        : [];
      dmTexts.push(el.name);
      const dmLongest = Math.max(0, ...dmTexts.map(s => s.length));
      const dmContentW = Math.round(dmLongest * 6.8 + 20);
      width = ve?.width ?? Math.min(380, Math.max(160, dmContentW));
      height = ve?.height ?? Math.max(60, 30 + dmAttrCount * 16 + 10);
    } else if (notation === 'process-flow') {
      if (nodeType === 'pf-pseudo') {
        width = ve?.width ?? 24;
        height = ve?.height ?? 24;
      } else if (nodeType === 'pf-decision') {
        width = ve?.width ?? 40;
        height = ve?.height ?? 40;
      } else if (nodeType === 'pf-task') {
        width = ve?.width ?? 140;
        height = ve?.height ?? 40;
      } else if (nodeType === 'pf-gate') {
        width = ve?.width ?? 100;
        height = ve?.height ?? 50;
      } else if (nodeType === 'pf-swimlane') {
        width = ve?.width ?? 600;
        height = ve?.height ?? 120;
      } else if (nodeType === 'pf-subprocess') {
        width = ve?.width ?? 160;
        height = ve?.height ?? 60;
      } else {
        width = ve?.width ?? shapeDef.defaultWidth;
        height = ve?.height ?? shapeDef.defaultHeight;
      }
    } else if (notation === 'wireframe') {
      width = ve?.width ?? 200;
      height = ve?.height ?? 100;
    } else {
      width = ve?.width ?? 150;
      height = ve?.height ?? 60;
    }

    // Ensure elementId is always in data (needed by context menu)
    data.elementId = el.id;
    // Pass area through for working-area visual indicator
    data.area = el.area;

    const zIndex = ve?.z_index ?? 0;

    return {
      id: el.id,
      type: nodeType,
      position: pos,
      data,
      width,
      height,
      ...(zIndex !== 0 ? { zIndex } : {}),
    };
  });

  // Compute layer band group nodes
  const bands = computeLayerBands(elements, allPositions, layerLabels, layerOrder);

  // Build a lookup: layer → band info (position/size)
  const bandLookup = new Map<string, LayerBandInfo>();
  for (const band of bands) bandLookup.set(band.layer, band);

  // Also compute the original content minX/minY per layer so we can convert to relative
  const layerContentOrigin = new Map<string, { minX: number; minY: number }>();
  {
    for (const el of elements) {
      if (getNotation(el.archimate_type) !== 'archimate') continue;
      const pos = allPositions.get(el.id);
      if (!pos) continue;
      const existing = layerContentOrigin.get(el.layer);
      if (existing) {
        existing.minX = Math.min(existing.minX, pos.x);
        existing.minY = Math.min(existing.minY, pos.y);
      } else {
        layerContentOrigin.set(el.layer, { minX: pos.x, minY: pos.y });
      }
    }
  }

  const bandNodes: Node[] = bands.map((band) => ({
    id: `__band-${band.layer}`,
    type: 'layer-band' as const,
    position: { x: band.x, y: band.y },
    data: {
      layer: band.layer,
      label: band.label,
      bandWidth: band.width,
      bandHeight: band.height,
      theme,
    } as LayerBandNodeData,
    selectable: true,
    draggable: true,
    connectable: false,
    width: band.width,
    height: band.height,
    // Render behind element nodes
    zIndex: -1,
    style: { zIndex: -1 },
  }));

  // Convert element positions from absolute to band-relative and set parentId
  const nodeById = new Map(elementNodes.map(n => [n.id, n]));
  const elById = new Map(elements.map(e => [e.id, e]));

  for (const node of elementNodes) {
    const el = elById.get(node.id);
    if (!el) continue;

    // First handle wireframe parent-child nesting
    if (el.parent_id) {
      const parentNode = nodeById.get(el.parent_id);
      if (parentNode) {
        node.position = {
          x: Math.max(5, node.position.x - parentNode.position.x),
          y: Math.max(30, node.position.y - parentNode.position.y),
        };
        node.parentId = el.parent_id;
        node.extent = 'parent';
        continue; // wireframe children are parented to their element, not a band
      }
    }

    // Only parent ArchiMate elements to layer bands — UML/wireframe float freely
    const elNotation = getNotation(el.archimate_type);
    if (elNotation !== 'archimate') continue;

    // Parent this element to its layer band
    const bandId = `__band-${el.layer}`;
    const band = bandLookup.get(el.layer);
    const origin = layerContentOrigin.get(el.layer);
    if (band && origin) {
      // Convert absolute position to band-relative
      node.position = {
        x: BAND_PAD.left + (node.position.x - origin.minX),
        y: BAND_PAD.top + (node.position.y - origin.minY),
      };
      node.parentId = bandId;
      node.extent = 'parent' as const;
    }
  }

  // Topological sort: xyflow requires parents before children in the array.
  // Band nodes come first (depth -1), then elements sorted by nesting depth.
  const depthCache = new Map<string, number>();
  function getDepth(id: string): number {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    const el = elements.find(e => e.id === id);
    if (!el?.parent_id) { depthCache.set(id, 0); return 0; }
    const d = getDepth(el.parent_id) + 1;
    depthCache.set(id, d);
    return d;
  }
  const sortedElements = [...elementNodes].sort((a, b) => getDepth(a.id) - getDepth(b.id));

  // ── UCD system boundary node ───────────────────────────────────────────
  const ucdBoundaryNodes: Node[] = [];
  if (isUcd && ucdBoundary && ucdBoundary.width > 0) {
    ucdBoundaryNodes.push({
      id: '__ucd-boundary',
      type: 'ucd-boundary',
      position: { x: ucdBoundary.x, y: ucdBoundary.y },
      data: {
        label: 'System',
        boundaryWidth: ucdBoundary.width,
        boundaryHeight: ucdBoundary.height,
        theme,
      } as UcdBoundaryNodeData,
      selectable: true,
      draggable: true,
      connectable: false,
      width: ucdBoundary.width,
      height: ucdBoundary.height,
      zIndex: -1,
      style: { zIndex: -1 },
    });
  }

  return [...bandNodes, ...ucdBoundaryNodes, ...sortedElements];
}
