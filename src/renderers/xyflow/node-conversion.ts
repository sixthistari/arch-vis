/**
 * Node conversion — transforms model Elements + ViewElements into ReactFlow Nodes.
 *
 * Extracted from Canvas.tsx for modularity.
 */
import type { Node } from '@xyflow/react';
import type { LayerBandNodeData } from './nodes/LayerBandNode';
import type { Element, ViewElement } from '../../model/types';
import { getShapeDefinition } from '../../notation/registry';
import { getNotation, getNodeType } from '../../model/notation';
import { computeGridLayout, FALLBACK_LAYER_ORDER, FALLBACK_SUBLAYER_ORDER } from './layout-computation';
import { computeLayerBands, BAND_PAD, type LayerBandInfo } from './layer-bands';

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
): Node[] {
  const posMap = new Map(viewElements.map(ve => [ve.element_id, ve]));

  // Find elements that need auto-layout (no saved position or at 0,0)
  const needsLayout = elements.filter(el => {
    const ve = posMap.get(el.id);
    return !ve || (ve.x === 0 && ve.y === 0);
  });

  // Compute grid positions for elements that need layout
  const gridPositions = needsLayout.length > 0
    ? computeGridLayout(needsLayout, layerOrder, sublayerOrder)
    : null;

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
    } else if (nodeType === 'uml-use-case') {
      data = {
        label: el.name,
        useCaseType: el.archimate_type === 'uml-actor' ? 'actor' : 'use-case',
        theme,
        onLabelChange,
      };
    } else if (nodeType === 'uml-state') {
      data = {
        label: el.name,
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

      data = {
        label: el.name,
        archimateType: el.archimate_type,
        specialisation: el.specialisation,
        layer: el.layer,
        theme,
        onLabelChange,
        colourOverride,
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
      width = ve?.width ?? 180;
      height = ve?.height ?? Math.max(80, 40 + (attrCount + methCount) * 18);
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
    } else if (notation === 'wireframe') {
      width = ve?.width ?? 200;
      height = ve?.height ?? 100;
    } else {
      width = ve?.width ?? 150;
      height = ve?.height ?? 60;
    }

    // Ensure elementId is always in data (needed by context menu)
    data.elementId = el.id;

    return {
      id: el.id,
      type: nodeType,
      position: pos,
      data,
      width,
      height,
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

  return [...bandNodes, ...sortedElements];
}
