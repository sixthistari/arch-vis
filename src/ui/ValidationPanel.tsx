import React, { useState, useCallback, useMemo } from 'react';
import { useModelStore } from '../store/model';
import { useViewStore } from '../store/view';
import { useInteractionStore } from '../store/interaction';
import * as api from '../api/client';
import type { Element, Relationship, ValidRelationship } from '../model/types';

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

type Severity = 'error' | 'warning' | 'info';

interface ValidationIssue {
  severity: Severity;
  description: string;
  elementIds: string[];
  relationshipId?: string;
}

// ═══════════════════════════════════════
// Validation logic
// ═══════════════════════════════════════

function findInvalidRelationships(
  relationships: Relationship[],
  elements: Element[],
  validRelationships: ValidRelationship[],
): ValidationIssue[] {
  const elementMap = new Map(elements.map(e => [e.id, e]));
  const validSet = new Set(
    validRelationships.map(vr =>
      `${vr.source_archimate_type}|${vr.target_archimate_type}|${vr.relationship_type}`,
    ),
  );

  const issues: ValidationIssue[] = [];

  for (const rel of relationships) {
    const source = elementMap.get(rel.source_id);
    const target = elementMap.get(rel.target_id);

    if (!source || !target) {
      // Dangling reference
      const ids: string[] = [];
      if (source) ids.push(source.id);
      if (target) ids.push(target.id);
      issues.push({
        severity: 'error',
        description: `Relationship "${rel.archimate_type}" references missing element(s) — source: ${source?.name ?? rel.source_id}, target: ${target?.name ?? rel.target_id}`,
        elementIds: ids,
        relationshipId: rel.id,
      });
      continue;
    }

    // Only validate ArchiMate relationships against the valid_relationships table
    // UML, wireframe, and data modelling relationships have their own rules
    const isArchimate = !rel.archimate_type.startsWith('uml-')
      && !rel.archimate_type.startsWith('wf-')
      && !rel.archimate_type.startsWith('dm-');

    if (isArchimate && validRelationships.length > 0) {
      const key = `${source.archimate_type}|${target.archimate_type}|${rel.archimate_type}`;
      if (!validSet.has(key)) {
        issues.push({
          severity: 'error',
          description: `Invalid relationship: ${source.name} (${source.archimate_type}) —[${rel.archimate_type}]→ ${target.name} (${target.archimate_type})`,
          elementIds: [source.id, target.id],
          relationshipId: rel.id,
        });
      }
    }
  }

  return issues;
}

function findMissingNames(elements: Element[]): ValidationIssue[] {
  return elements
    .filter(e => !e.name || e.name.trim() === '')
    .map(e => ({
      severity: 'error' as Severity,
      description: `Element of type "${e.archimate_type}" has no name (id: ${e.id.slice(0, 8)}…)`,
      elementIds: [e.id],
    }));
}

function findDuplicateNames(elements: Element[]): ValidationIssue[] {
  const groups = new Map<string, Element[]>();
  for (const el of elements) {
    if (!el.name || el.name.trim() === '') continue;
    const key = `${el.archimate_type}|${el.name.trim().toLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push(el);
    groups.set(key, group);
  }

  const issues: ValidationIssue[] = [];
  for (const [, group] of groups) {
    if (group.length > 1) {
      issues.push({
        severity: 'warning',
        description: `Duplicate name "${group[0]!.name}" for type "${group[0]!.archimate_type}" (${group.length} elements)`,
        elementIds: group.map(e => e.id),
      });
    }
  }
  return issues;
}

function findIsolatedElements(
  elements: Element[],
  relationships: Relationship[],
): ValidationIssue[] {
  const connectedIds = new Set<string>();
  for (const rel of relationships) {
    connectedIds.add(rel.source_id);
    connectedIds.add(rel.target_id);
  }

  return elements
    .filter(e => !connectedIds.has(e.id))
    .map(e => ({
      severity: 'info' as Severity,
      description: `"${e.name || '(unnamed)'}" (${e.archimate_type}) has no relationships`,
      elementIds: [e.id],
    }));
}

function findOrphanElements(
  elements: Element[],
  placedElementIds: Set<string>,
): ValidationIssue[] {
  return elements
    .filter(e => !placedElementIds.has(e.id))
    .map(e => ({
      severity: 'warning' as Severity,
      description: `"${e.name || '(unnamed)'}" (${e.archimate_type}) is not placed in any view`,
      elementIds: [e.id],
    }));
}

// ═══════════════════════════════════════
// Severity icons
// ═══════════════════════════════════════

const SEVERITY_ICON: Record<Severity, string> = {
  error: '\u25CF',   // filled circle
  warning: '\u25B2', // triangle
  info: '\u25CB',    // open circle
};

const SEVERITY_COLOUR: Record<Severity, string> = {
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const SEVERITY_ORDER: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

// ═══════════════════════════════════════
// Styles
// ═══════════════════════════════════════

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  fontSize: 11,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  background: 'var(--bg-tertiary)',
  borderBottom: '1px solid var(--border-primary)',
  flexShrink: 0,
};

const summaryStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: '4px 10px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-primary)',
  flexShrink: 0,
  fontSize: 10,
  fontWeight: 600,
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 0,
  margin: 0,
  listStyle: 'none',
};

const issueStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
  padding: '5px 10px',
  borderBottom: '1px solid var(--border-primary)',
  cursor: 'pointer',
  lineHeight: 1.4,
};

const btnStyle: React.CSSProperties = {
  background: 'var(--button-bg)',
  color: 'var(--button-text)',
  border: '1px solid var(--border-primary)',
  borderRadius: 4,
  padding: '3px 10px',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
};

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

interface ValidationPanelProps {
  onClose: () => void;
}

export function ValidationPanel({ onClose }: ValidationPanelProps): React.ReactElement {
  const elements = useModelStore(s => s.elements);
  const relationships = useModelStore(s => s.relationships);
  const validRelationships = useModelStore(s => s.validRelationships);
  const viewList = useViewStore(s => s.viewList);
  const select = useInteractionStore(s => s.select);

  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');

  const runValidation = useCallback(async () => {
    setRunning(true);
    try {
      // Collect all placed element IDs across all views
      const placedElementIds = new Set<string>();
      const viewIds = viewList.map(v => v.id);

      // Fetch all views in parallel to get their element lists
      const viewDetails = await Promise.all(
        viewIds.map(id => api.fetchView(id).catch(() => null)),
      );

      for (const detail of viewDetails) {
        if (detail) {
          for (const ve of detail.viewElements) {
            placedElementIds.add(ve.element_id);
          }
        }
      }

      const allIssues: ValidationIssue[] = [
        ...findInvalidRelationships(relationships, elements, validRelationships),
        ...findMissingNames(elements),
        ...findDuplicateNames(elements),
        ...findOrphanElements(elements, placedElementIds),
        ...findIsolatedElements(elements, relationships),
      ];

      // Sort by severity
      allIssues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

      setIssues(allIssues);
      setHasRun(true);
    } finally {
      setRunning(false);
    }
  }, [elements, relationships, validRelationships, viewList]);

  const filteredIssues = useMemo(
    () => filterSeverity === 'all' ? issues : issues.filter(i => i.severity === filterSeverity),
    [issues, filterSeverity],
  );

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const issue of issues) {
      c[issue.severity]++;
    }
    return c;
  }, [issues]);

  const handleIssueClick = useCallback((issue: ValidationIssue) => {
    // Select the first affected element
    if (issue.elementIds.length > 0) {
      select(issue.elementIds[0]!);
    }
  }, [select]);

  return React.createElement('div', { style: panelStyle },
    // Header
    React.createElement('div', { style: headerStyle },
      React.createElement('span', { style: { fontWeight: 600, fontSize: 12 } }, 'Model Validation'),
      React.createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
        React.createElement('button', {
          onClick: runValidation,
          disabled: running,
          style: {
            ...btnStyle,
            opacity: running ? 0.6 : 1,
            cursor: running ? 'wait' : 'pointer',
          },
        }, running ? 'Validating\u2026' : 'Validate Model'),
        React.createElement('button', {
          onClick: onClose,
          title: 'Close validation panel',
          style: {
            ...btnStyle,
            padding: '3px 6px',
            fontSize: 12,
            lineHeight: 1,
          },
        }, '\u00D7'),
      ),
    ),

    // Summary bar
    hasRun && React.createElement('div', { style: summaryStyle },
      React.createElement('span', {
        style: {
          color: SEVERITY_COLOUR.error,
          cursor: 'pointer',
          textDecoration: filterSeverity === 'error' ? 'underline' : 'none',
        },
        onClick: () => setFilterSeverity(f => f === 'error' ? 'all' : 'error'),
        title: 'Filter errors',
      }, `${counts.error} error${counts.error !== 1 ? 's' : ''}`),
      React.createElement('span', {
        style: {
          color: SEVERITY_COLOUR.warning,
          cursor: 'pointer',
          textDecoration: filterSeverity === 'warning' ? 'underline' : 'none',
        },
        onClick: () => setFilterSeverity(f => f === 'warning' ? 'all' : 'warning'),
        title: 'Filter warnings',
      }, `${counts.warning} warning${counts.warning !== 1 ? 's' : ''}`),
      React.createElement('span', {
        style: {
          color: SEVERITY_COLOUR.info,
          cursor: 'pointer',
          textDecoration: filterSeverity === 'info' ? 'underline' : 'none',
        },
        onClick: () => setFilterSeverity(f => f === 'info' ? 'all' : 'info'),
        title: 'Filter info',
      }, `${counts.info} info`),
      filterSeverity !== 'all' && React.createElement('span', {
        style: { color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 4 },
        onClick: () => setFilterSeverity('all'),
      }, '(show all)'),
    ),

    // Issues list
    hasRun && filteredIssues.length === 0
      ? React.createElement('div', {
          style: {
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            padding: 20,
          },
        }, filterSeverity !== 'all'
          ? `No ${filterSeverity} issues found.`
          : 'No issues found. Model is valid.',
        )
      : React.createElement('ul', { style: listStyle },
          filteredIssues.map((issue, idx) =>
            React.createElement('li', {
              key: `${issue.severity}-${issue.relationshipId ?? issue.elementIds[0] ?? ''}-${idx}`,
              style: issueStyle,
              onClick: () => handleIssueClick(issue),
              title: `Click to select ${issue.elementIds.length > 1 ? 'first affected element' : 'affected element'}`,
            },
              React.createElement('span', {
                style: {
                  color: SEVERITY_COLOUR[issue.severity],
                  flexShrink: 0,
                  fontSize: 10,
                  lineHeight: '16px',
                },
              }, SEVERITY_ICON[issue.severity]),
              React.createElement('span', {
                style: { color: 'var(--text-primary)' },
              }, issue.description),
            ),
          ),
        ),

    // Empty state before first run
    !hasRun && React.createElement('div', {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontStyle: 'italic',
        padding: 20,
        flexDirection: 'column',
        gap: 8,
      },
    },
      React.createElement('span', null, 'Click "Validate Model" to check for issues.'),
    ),
  );
}
