import React, { useState, useMemo, useCallback } from 'react';
import type Graph from 'graphology';
import type { Element } from '../model/types';
import { useModelStore } from '../store/model';
import { useInteractionStore } from '../store/interaction';

// ── Types ──

interface TraversalNode {
  id: string;
  name: string;
  archimateType: string;
  relationshipType: string;   // relationship that connects to parent in chain
  relationshipLabel: string;  // edge label (if any)
  depth: number;
  children: TraversalNode[];
}

interface ImpactAnalysisPanelProps {
  element: Element;
  onClose: () => void;
  onNavigate: (elementId: string) => void;
}

// ── Graph Traversal ──

function traverseDirection(
  graph: Graph,
  startId: string,
  direction: 'upstream' | 'downstream',
  maxDepth: number,
  elements: Element[],
): TraversalNode[] {
  const elementMap = new Map(elements.map(e => [e.id, e]));
  const visited = new Set<string>();
  visited.add(startId);

  function collect(nodeId: string, depth: number): TraversalNode[] {
    if (depth >= maxDepth) return [];

    const result: TraversalNode[] = [];

    const edgeIterator = direction === 'upstream'
      ? 'forEachInEdge' as const
      : 'forEachOutEdge' as const;

    if (!graph.hasNode(nodeId)) return result;

    graph[edgeIterator](nodeId, (_edgeKey, attrs, source, target) => {
      const neighbourId = direction === 'upstream' ? source : target;
      if (visited.has(neighbourId)) return;
      visited.add(neighbourId);

      const el = elementMap.get(neighbourId);
      const edgeAttrs = attrs as Record<string, unknown>;

      const node: TraversalNode = {
        id: neighbourId,
        name: el?.name ?? neighbourId,
        archimateType: el?.archimate_type ?? 'unknown',
        relationshipType: String(edgeAttrs.archimate_type ?? ''),
        relationshipLabel: String(edgeAttrs.label ?? ''),
        depth: depth + 1,
        children: [],
      };

      node.children = collect(neighbourId, depth + 1);
      result.push(node);
    });

    return result;
  }

  return collect(startId, 0);
}

function countNodes(nodes: TraversalNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1 + countNodes(node.children);
  }
  return count;
}

function collectAllIds(nodes: TraversalNode[]): Set<string> {
  const ids = new Set<string>();
  function walk(ns: TraversalNode[]) {
    for (const n of ns) {
      ids.add(n.id);
      walk(n.children);
    }
  }
  walk(nodes);
  return ids;
}

function collectAllEdgeIds(
  graph: Graph,
  rootId: string,
  nodes: TraversalNode[],
): Set<string> {
  const nodeIds = collectAllIds(nodes);
  nodeIds.add(rootId);
  const edgeIds = new Set<string>();

  graph.forEachEdge((_edgeKey, _attrs, source, target) => {
    if (nodeIds.has(source) && nodeIds.has(target)) {
      edgeIds.add(_edgeKey);
    }
  });

  return edgeIds;
}

// ── Component ──

export function ImpactAnalysisPanel({
  element,
  onClose,
  onNavigate,
}: ImpactAnalysisPanelProps): React.ReactElement {
  const [maxDepth, setMaxDepth] = useState(3);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    upstream: true,
    downstream: true,
  });

  const graph = useModelStore(s => s.graph);
  const elements = useModelStore(s => s.elements);
  const setHighlight = useInteractionStore(s => s.setHighlight);

  const upstream = useMemo(
    () => traverseDirection(graph, element.id, 'upstream', maxDepth, elements),
    [graph, element.id, maxDepth, elements],
  );

  const downstream = useMemo(
    () => traverseDirection(graph, element.id, 'downstream', maxDepth, elements),
    [graph, element.id, maxDepth, elements],
  );

  const upstreamCount = useMemo(() => countNodes(upstream), [upstream]);
  const downstreamCount = useMemo(() => countNodes(downstream), [downstream]);

  const handleHighlight = useCallback(() => {
    const allNodes = new Set<string>();
    allNodes.add(element.id);

    const upIds = collectAllIds(upstream);
    const downIds = collectAllIds(downstream);
    for (const id of upIds) allNodes.add(id);
    for (const id of downIds) allNodes.add(id);

    const upEdges = collectAllEdgeIds(graph, element.id, upstream);
    const downEdges = collectAllEdgeIds(graph, element.id, downstream);
    const allEdges = new Set<string>();
    for (const id of upEdges) allEdges.add(id);
    for (const id of downEdges) allEdges.add(id);

    setHighlight(allNodes, allEdges);
  }, [element.id, upstream, downstream, graph, setHighlight]);

  const handleClearHighlight = useCallback(() => {
    setHighlight(new Set<string>(), new Set<string>());
  }, [setHighlight]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Styles ──

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const panelStyle: React.CSSProperties = {
    width: 520,
    maxHeight: '80vh',
    background: 'var(--panel-bg, #1e1e1e)',
    border: '1px solid var(--panel-border, #333)',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-primary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'var(--bg-tertiary)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-primary)',
    userSelect: 'none',
    borderBottom: '1px solid var(--border-primary)',
  };

  return React.createElement('div', {
    style: overlayStyle,
    onClick: (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
  },
    React.createElement('div', { style: panelStyle },
      // Header
      React.createElement('div', { style: headerStyle },
        React.createElement('div', { style: { flex: 1, minWidth: 0 } },
          React.createElement('div', {
            style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 },
          }, 'Impact Analysis'),
          React.createElement('div', {
            style: { fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-word' },
          }, element.name),
          React.createElement('div', {
            style: { fontSize: 10, color: 'var(--text-muted)', marginTop: 2 },
          }, element.archimate_type),
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

      // Controls bar
      React.createElement('div', {
        style: {
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 11,
        },
      },
        // Depth selector
        React.createElement('label', {
          style: { color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 },
        },
          'Depth:',
          React.createElement('select', {
            value: maxDepth,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setMaxDepth(Number(e.target.value)),
            style: {
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 3,
              padding: '2px 6px',
              fontSize: 11,
            },
          },
            ...[1, 2, 3, 4, 5].map(n =>
              React.createElement('option', { key: n, value: n }, String(n)),
            ),
          ),
        ),

        // Highlight buttons
        React.createElement('button', {
          onClick: handleHighlight,
          style: { ...btnStyle, background: 'var(--highlight, #4a9eff)', color: '#fff' },
          title: 'Highlight all impacted elements on the canvas',
        }, 'Highlight on Canvas'),
        React.createElement('button', {
          onClick: handleClearHighlight,
          style: btnStyle,
          title: 'Clear canvas highlighting',
        }, 'Clear Highlight'),
      ),

      // Summary
      React.createElement('div', {
        style: {
          padding: '6px 16px',
          fontSize: 10,
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-primary)',
        },
      },
        `${upstreamCount} element${upstreamCount !== 1 ? 's' : ''} affected upstream, ` +
        `${downstreamCount} element${downstreamCount !== 1 ? 's' : ''} affected downstream`,
      ),

      // Tree content
      React.createElement('div', {
        style: { flex: 1, overflow: 'auto' },
      },
        // Upstream section
        React.createElement('div', {
          style: sectionHeaderStyle,
          onClick: () => toggleSection('upstream'),
        },
          React.createElement('span', {
            style: { fontSize: 9, transition: 'transform 0.15s' },
          }, expandedSections.upstream ? '\u25BC' : '\u25B6'),
          `Upstream Dependencies (${upstreamCount})`,
        ),
        expandedSections.upstream && React.createElement('div', {
          style: { padding: '4px 0' },
        },
          upstream.length > 0
            ? upstream.map(node => renderTreeNode(node, onNavigate, 0))
            : React.createElement('div', {
                style: { padding: '8px 16px', color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' },
              }, 'No upstream dependencies found'),
        ),

        // Downstream section
        React.createElement('div', {
          style: sectionHeaderStyle,
          onClick: () => toggleSection('downstream'),
        },
          React.createElement('span', {
            style: { fontSize: 9, transition: 'transform 0.15s' },
          }, expandedSections.downstream ? '\u25BC' : '\u25B6'),
          `Downstream Impact (${downstreamCount})`,
        ),
        expandedSections.downstream && React.createElement('div', {
          style: { padding: '4px 0' },
        },
          downstream.length > 0
            ? downstream.map(node => renderTreeNode(node, onNavigate, 0))
            : React.createElement('div', {
                style: { padding: '8px 16px', color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' },
              }, 'No downstream impact found'),
        ),
      ),
    ),
  );
}

// ── Tree Node Renderer ──

function renderTreeNode(
  node: TraversalNode,
  onNavigate: (id: string) => void,
  baseIndent: number,
): React.ReactElement {
  const indent = 16 + node.depth * 20 + baseIndent;

  const relLabel = node.relationshipLabel
    ? `${node.relationshipType} (${node.relationshipLabel})`
    : node.relationshipType;

  return React.createElement(React.Fragment, { key: node.id },
    React.createElement('div', {
      onClick: () => onNavigate(node.id),
      style: {
        paddingLeft: indent,
        paddingRight: 16,
        paddingTop: 4,
        paddingBottom: 4,
        cursor: 'pointer',
        fontSize: 11,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderBottom: '1px solid var(--border-secondary, transparent)',
      },
      title: `Navigate to ${node.name}`,
    },
      // Relationship connector line
      React.createElement('span', {
        style: { color: 'var(--text-muted)', fontSize: 9, flexShrink: 0 },
      }, node.depth > 0 ? '\u2514\u2500' : '\u2500'),
      // Relationship type badge
      React.createElement('span', {
        style: {
          fontSize: 9,
          color: 'var(--text-muted)',
          background: 'var(--bg-tertiary)',
          padding: '1px 5px',
          borderRadius: 3,
          flexShrink: 0,
          maxWidth: 120,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        title: relLabel,
      }, relLabel),
      // Element name
      React.createElement('span', {
        style: { color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      }, node.name),
      // Type label
      React.createElement('span', {
        style: { color: 'var(--text-muted)', fontSize: 9, flexShrink: 0 },
      }, node.archimateType),
    ),
    // Render children recursively
    ...node.children.map(child => renderTreeNode(child, onNavigate, baseIndent)),
  );
}
