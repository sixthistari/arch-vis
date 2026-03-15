/**
 * useCanvasConnection — manages the connection creation flow:
 * pending connection state, mouse tracking for picker position,
 * relationship type selection handlers, and magic connector (drop-on-empty-canvas).
 */
import React, { useCallback } from 'react';
import type { Connection } from '@xyflow/react';
import type { PendingConnection } from '../RelationshipTypePicker';
import type { MagicConnectorState } from '../MagicConnectorDialog';

export function useCanvasConnection({
  onCreateRelationship,
  screenToFlowRef,
}: {
  onCreateRelationship?: (sourceId: string, targetId: string, relType: string) => void;
  screenToFlowRef: React.MutableRefObject<((pos: { x: number; y: number }) => { x: number; y: number }) | null>;
}): {
  pendingConnection: PendingConnection | null;
  magicConnector: MagicConnectorState | null;
  handleConnect: (connection: Connection) => void;
  handleConnectStart: (_event: MouseEvent | TouchEvent, params: { nodeId: string | null }) => void;
  handleConnectEnd: (event: MouseEvent | TouchEvent) => void;
  handleRelTypeSelect: (relType: string) => void;
  handleRelTypeCancel: () => void;
  handleMagicCancel: () => void;
  setMagicConnector: React.Dispatch<React.SetStateAction<MagicConnectorState | null>>;
  containerMouseRef: React.MutableRefObject<{ x: number; y: number }>;
  setPendingConnection: React.Dispatch<React.SetStateAction<PendingConnection | null>>;
  pendingConnRef: React.MutableRefObject<{ sourceId: string; targetId: string } | null>;
} {
  // Mouse position in canvas-local coordinates (used to position relationship picker)
  const containerMouseRef = React.useRef({ x: 0, y: 0 });
  // Pending connection set by onConnect; position filled by containerMouseRef on mouseup
  const pendingConnRef = React.useRef<{ sourceId: string; targetId: string } | null>(null);
  const [pendingConnection, setPendingConnection] = React.useState<PendingConnection | null>(null);

  // Magic connector state — shown when connection is dropped on empty canvas
  const [magicConnector, setMagicConnector] = React.useState<MagicConnectorState | null>(null);

  // Track the source node of the current connection drag (set by onConnectStart, cleared by onConnectEnd)
  const connectStartRef = React.useRef<string | null>(null);

  // onConnectStart — fires when user begins dragging from a connection handle
  const handleConnectStart = useCallback((_event: MouseEvent | TouchEvent, params: { nodeId: string | null }) => {
    connectStartRef.current = params.nodeId ?? null;
  }, []);

  // User draws a connection by dragging from a connector handle to a target element
  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    // Skip self-connections
    if (connection.source === connection.target) return;
    // Store in ref; position will be filled when mouse button releases
    pendingConnRef.current = { sourceId: connection.source, targetId: connection.target };
  }, []);

  // onConnectEnd fires after onConnect (or on failed drop) — capture mouse position then show picker
  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    // Case 1: Connection completed to a target node — show relationship type picker
    if (pendingConnRef.current) {
      setPendingConnection({
        ...pendingConnRef.current,
        x: containerMouseRef.current.x,
        y: containerMouseRef.current.y,
      });
      pendingConnRef.current = null;
      connectStartRef.current = null;
      return;
    }

    // Case 2: Connection dropped on empty canvas — show magic connector dialog.
    // If onConnect didn't fire, the drag ended without hitting a target node.
    const sourceId = connectStartRef.current;
    connectStartRef.current = null;
    if (!sourceId) return;

    // Get screen coordinates
    let clientX: number;
    let clientY: number;
    if ('touches' in event) {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Convert screen position to flow-space position for placing the new element
    const flowPos = screenToFlowRef.current?.({ x: clientX, y: clientY });
    if (!flowPos) return;

    setMagicConnector({
      sourceId,
      x: containerMouseRef.current.x,
      y: containerMouseRef.current.y,
      flowX: flowPos.x,
      flowY: flowPos.y,
    });
  }, [screenToFlowRef]);

  const handleRelTypeSelect = useCallback((relType: string) => {
    if (!pendingConnection) return;
    onCreateRelationship?.(pendingConnection.sourceId, pendingConnection.targetId, relType);
    setPendingConnection(null);
  }, [pendingConnection, onCreateRelationship]);

  const handleRelTypeCancel = useCallback(() => {
    setPendingConnection(null);
  }, []);

  const handleMagicCancel = useCallback(() => {
    setMagicConnector(null);
  }, []);

  return {
    pendingConnection,
    magicConnector,
    handleConnect,
    handleConnectStart,
    handleConnectEnd,
    handleRelTypeSelect,
    handleRelTypeCancel,
    handleMagicCancel,
    setMagicConnector,
    containerMouseRef,
    setPendingConnection,
    pendingConnRef,
  };
}
