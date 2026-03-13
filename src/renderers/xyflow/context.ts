/**
 * Shared React contexts for xyflow canvas internals.
 */
import React from 'react';

export interface Waypoint {
  x: number;
  y: number;
}

export type WaypointUpdater = (edgeId: string, waypoints: Waypoint[]) => void;

export const WaypointUpdateContext = React.createContext<WaypointUpdater | null>(null);
