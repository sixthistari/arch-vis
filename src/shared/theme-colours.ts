/**
 * Theme colour helpers for UML and container nodes.
 *
 * Centralises the isDark / selected colour logic that was duplicated
 * across 5+ node components.
 */

export interface UmlColours {
  stroke: string;
  fill: string;
  text: string;
  headerFill: string;
  headerText: string;
}

export interface ContainerColours {
  stroke: string;
  fill: string;
  text: string;
  tabBg: string;
}

/**
 * Standard colour set for UML box nodes (class, component, state).
 */
export function getUmlColours(theme: 'dark' | 'light', selected?: boolean): UmlColours {
  const isDark = theme === 'dark';
  return {
    stroke: selected ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569'),
    fill: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#E5E7EB' : '#1F2937',
    headerFill: isDark ? '#334155' : '#F1F5F9',
    headerText: isDark ? '#E5E7EB' : '#1F2937',
  };
}

/**
 * Colour set for container/package nodes (package, swimlane, group).
 */
export function getContainerColours(theme: 'dark' | 'light', selected?: boolean): ContainerColours {
  const isDark = theme === 'dark';
  return {
    stroke: selected ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569'),
    fill: isDark ? 'rgba(30, 41, 59, 0.25)' : 'rgba(241, 245, 249, 0.35)',
    text: isDark ? '#E5E7EB' : '#1F2937',
    tabBg: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.6)',
  };
}

/**
 * Compute compartment height for list-based compartments (class attributes,
 * entity columns, etc.).
 */
export function compartmentHeight(itemCount: number, rowHeight = 16, padding = 6): number {
  return itemCount > 0
    ? itemCount * rowHeight + padding * 2
    : rowHeight + padding;
}
