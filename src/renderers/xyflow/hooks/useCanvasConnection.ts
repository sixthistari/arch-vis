/**
 * useCanvasConnection — manages the connection creation flow:
 * pending connection state, mouse tracking for picker position,
 * and relationship type selection handlers.
 */
import React, { useCallback } from 'react';
import type { Connection } from '@xyflow/react';
import type { PendingConnection } from '../RelationshipTypePicker';

export function useCanvasConnection({
  onCreateRelationship,
}: {
  onCreateRelationship?: (sourceId: string, targetId: string, relType: string) => void;
}): {
  pendingConnection: PendingConnection | null;
  handleConnect: (connection: Connection) => void;
  handleConnectEnd: (event: MouseEvent | TouchEvent) => void;
  handleRelTypeSelect: (relType: string) => void;
  handleRelTypeCancel: () => void;
  containerMouseRef: React.MutableRefObject<{ x: number; y: number }>;
  setPendingConnection: React.Dispatch<React.SetStateAction<PendingConnection | null>>;
  pendingConnRef: React.MutableRefObject<{ sourceId: string; targetId: string } | null>;
} {
  // Mouse position in canvas-local coordinates (used to position relationship picker)
  const containerMouseRef = React.useRef({ x: 0, y: 0 });
  // Pending connection set by onConnect; position filled by containerMouseRef on mouseup
  const pendingConnRef = React.useRef<{ sourceId: string; targetId: string } | null>(null);
  const [pendingConnection, setPendingConnection] = React.useState<PendingConnection | null>(null);

  // User draws a connection by dragging from a connector handle to a target element
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    // Skip self-connections
    if (connection.source === connection.target) return;
    // Store in ref; position will be filled when mouse button releases
    pendingConnRef.current = { sourceId: connection.source, targetId: connection.target };
  }, []);

  // onConnectEnd fires after onConnect (or on failed drop) — capture mouse position then show picker
  const handleConnectEnd = useCallback((_event: MouseEvent | TouchEvent) => {
    if (!pendingConnRef.current) return;
    setPendingConnection({
      ...pendingConnRef.current,
      x: containerMouseRef.current.x,
      y: containerMouseRef.current.y,
    });
    pendingConnRef.current = null;
  }, []);

  const handleRelTypeSelect = useCallback((relType: string) => {
    if (!pendingConnection) return;
    onCreateRelationship?.(pendingConnection.sourceId, pendingConnection.targetId, relType);
    setPendingConnection(null);
  }, [pendingConnection, onCreateRelationship]);

  const handleRelTypeCancel = useCallback(() => {
    setPendingConnection(null);
  }, []);

  return {
    pendingConnection,
    handleConnect,
    handleConnectEnd,
    handleRelTypeSelect,
    handleRelTypeCancel,
    containerMouseRef,
    setPendingConnection,
    pendingConnRef,
  };
}
