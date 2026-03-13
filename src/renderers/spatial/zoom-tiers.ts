import type { ZoomTier, ZoomTierConfig } from '../types';

const ZOOM_TIERS: ZoomTierConfig[] = [
  { tier: 'birds-eye', minZoom: 0.15, maxZoom: 0.32, showLabel: false, showIcon: false, showBadge: false, showEdgeLabels: false },
  { tier: 'context', minZoom: 0.32, maxZoom: 0.55, showLabel: true, showIcon: false, showBadge: false, showEdgeLabels: false },
  { tier: 'structure', minZoom: 0.55, maxZoom: 0.90, showLabel: true, showIcon: true, showBadge: true, showEdgeLabels: false },
  { tier: 'detail', minZoom: 0.90, maxZoom: 1.50, showLabel: true, showIcon: true, showBadge: true, showEdgeLabels: true },
  { tier: 'full', minZoom: 1.50, maxZoom: 10.0, showLabel: true, showIcon: true, showBadge: true, showEdgeLabels: true },
];

export function getZoomTier(zoom: number): ZoomTier {
  for (const config of ZOOM_TIERS) {
    if (zoom >= config.minZoom && zoom < config.maxZoom) {
      return config.tier;
    }
  }
  if (zoom < 0.15) return 'birds-eye';
  return 'full';
}

export function getZoomTierConfig(zoom: number): ZoomTierConfig {
  for (const config of ZOOM_TIERS) {
    if (zoom >= config.minZoom && zoom < config.maxZoom) {
      return config;
    }
  }
  if (zoom < 0.15) return ZOOM_TIERS[0]!;
  return ZOOM_TIERS[ZOOM_TIERS.length - 1]!;
}

export function getZoomTierLabel(tier: ZoomTier): string {
  switch (tier) {
    case 'birds-eye': return "Bird's Eye";
    case 'context': return 'Context';
    case 'structure': return 'Structure';
    case 'detail': return 'Detail';
    case 'full': return 'Full';
  }
}
