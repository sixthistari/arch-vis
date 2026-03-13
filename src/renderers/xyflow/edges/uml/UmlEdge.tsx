/**
 * UML custom edges.
 *
 * Class/Component diagram relationships:
 *   - Inheritance: solid + hollow triangle arrowhead
 *   - Realisation: dashed + hollow triangle
 *   - Composition: solid + filled diamond at source
 *   - Aggregation: solid + hollow diamond at source
 *   - Association: solid + open arrow (or none if undirected)
 *   - Dependency: dashed + open arrow
 *
 * Sequence diagram messages:
 *   - Synchronous: solid + filled arrowhead (→)
 *   - Asynchronous: solid + open arrowhead (→)
 *   - Return: dashed + open arrowhead (←)
 *   - Create: dashed + open arrowhead
 *   - Self: loop-back arc
 */
import { memo } from 'react';
import { BaseEdge, getSmoothStepPath, getStraightPath, type EdgeProps, type Edge } from '@xyflow/react';

export interface UmlEdgeData {
  edgeType: 'uml-inheritance' | 'uml-realisation' | 'uml-composition' | 'uml-aggregation' |
            'uml-association' | 'uml-dependency' | 'uml-assembly' |
            'sync-message' | 'async-message' | 'return-message' | 'create-message' | 'self-message';
  label?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  sourceRole?: string;
  targetRole?: string;
  stereotype?: string;
  theme?: 'dark' | 'light';
  dimmed?: boolean;
  [key: string]: unknown;
}

type UmlEdgeType = Edge<UmlEdgeData, 'uml-edge'>;

interface EdgeStyleDef {
  strokeDash?: string;
  sourceMarker?: string;
  targetMarker?: string;
  strokeWidth: number;
}

const EDGE_STYLES: Record<string, EdgeStyleDef> = {
  'uml-inheritance': { strokeWidth: 1.2, targetMarker: 'url(#uml-hollow-triangle)' },
  'uml-realisation': { strokeDash: '6 3', strokeWidth: 1, targetMarker: 'url(#uml-hollow-triangle)' },
  'uml-composition': { strokeWidth: 1.2, sourceMarker: 'url(#uml-filled-diamond)' },
  'uml-aggregation': { strokeWidth: 1.2, sourceMarker: 'url(#uml-hollow-diamond)' },
  'uml-association': { strokeWidth: 1, targetMarker: 'url(#uml-open-arrow)' },
  'uml-dependency': { strokeDash: '6 3', strokeWidth: 1, targetMarker: 'url(#uml-open-arrow)' },
  'uml-assembly': { strokeWidth: 1 },
  'sync-message': { strokeWidth: 1.2, targetMarker: 'url(#uml-filled-arrow)' },
  'async-message': { strokeWidth: 1, targetMarker: 'url(#uml-open-arrow)' },
  'return-message': { strokeDash: '6 3', strokeWidth: 1, targetMarker: 'url(#uml-open-arrow)' },
  'create-message': { strokeDash: '6 3', strokeWidth: 1, targetMarker: 'url(#uml-open-arrow)' },
  'self-message': { strokeWidth: 1, targetMarker: 'url(#uml-filled-arrow)' },
};

function UmlEdgeComponent(props: EdgeProps<UmlEdgeType>) {
  const {
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    data, selected,
  } = props;

  const edgeType = data?.edgeType ?? 'uml-association';
  const style = EDGE_STYLES[edgeType] ?? EDGE_STYLES['uml-association']!;
  const dimmed = data?.dimmed ?? false;
  const isDark = (data?.theme ?? 'dark') === 'dark';

  // Sequence messages use straight lines, class diagrams use smooth step
  const isMessage = edgeType.endsWith('-message');
  const [edgePath, labelX, labelY] = isMessage
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 });

  const strokeColour = selected ? '#F59E0B' : (isDark ? '#94A3B8' : '#475569');
  const opacity = dimmed ? 0.04 : 1;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: strokeColour,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDash,
          opacity,
        }}
        markerStart={style.sourceMarker}
        markerEnd={style.targetMarker}
      />

      {/* Label */}
      {data?.label && (
        <text
          x={labelX} y={labelY - 8}
          textAnchor="middle" fontSize={10} fill={strokeColour}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none', opacity }}
        >
          {data.stereotype ? `«${data.stereotype}» ` : ''}{data.label}
        </text>
      )}

      {/* Multiplicity labels */}
      {data?.sourceMultiplicity && (
        <text
          x={sourceX + 12} y={sourceY - 8}
          fontSize={9} fill={strokeColour}
          fontFamily="'JetBrains Mono', monospace"
          style={{ pointerEvents: 'none', opacity }}
        >
          {data.sourceMultiplicity}
        </text>
      )}
      {data?.targetMultiplicity && (
        <text
          x={targetX - 12} y={targetY - 8}
          textAnchor="end" fontSize={9} fill={strokeColour}
          fontFamily="'JetBrains Mono', monospace"
          style={{ pointerEvents: 'none', opacity }}
        >
          {data.targetMultiplicity}
        </text>
      )}

      {/* Role labels */}
      {data?.sourceRole && (
        <text
          x={sourceX + 12} y={sourceY + 12}
          fontSize={9} fill={strokeColour} fillOpacity={0.7}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none', opacity }}
        >
          {data.sourceRole}
        </text>
      )}
      {data?.targetRole && (
        <text
          x={targetX - 12} y={targetY + 12}
          textAnchor="end" fontSize={9} fill={strokeColour} fillOpacity={0.7}
          fontFamily="Inter, system-ui, sans-serif"
          style={{ pointerEvents: 'none', opacity }}
        >
          {data.targetRole}
        </text>
      )}
    </>
  );
}

export const UmlEdge = memo(UmlEdgeComponent);
