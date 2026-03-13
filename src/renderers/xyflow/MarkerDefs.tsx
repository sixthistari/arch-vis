/**
 * SVG marker definitions for ArchiMate relationship arrowheads.
 * refX is set so the arrowhead tip ends exactly at the path endpoint (node boundary).
 * markerUnits="strokeWidth" is NOT used — markers are a fixed pixel size.
 */

export function MarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Filled diamond — composition (at source end) */}
        <marker id="marker-filled-diamond" viewBox="0 0 12 8" refX={0} refY={4} markerWidth={10} markerHeight={7} orient="auto">
          <polygon points="0,4 6,0 12,4 6,8" fill="currentColor" />
        </marker>
        {/* Open diamond — aggregation (at source end) */}
        <marker id="marker-open-diamond" viewBox="0 0 12 8" refX={0} refY={4} markerWidth={10} markerHeight={7} orient="auto">
          <polygon points="0,4 6,0 12,4 6,8" fill="none" stroke="currentColor" strokeWidth={1} />
        </marker>
        {/* Filled circle — assignment (at source end) */}
        <marker id="marker-filled-circle" viewBox="0 0 8 8" refX={4} refY={4} markerWidth={6} markerHeight={6} orient="auto">
          <circle cx={4} cy={4} r={3} fill="currentColor" />
        </marker>
        {/* Filled arrow — triggering, flow (at target end, tip touches boundary) */}
        <marker id="marker-filled-arrow" viewBox="0 0 10 8" refX={9} refY={4} markerWidth={8} markerHeight={6} orient="auto">
          <polygon points="0,1 9,4 0,7" fill="currentColor" />
        </marker>
        {/* Open arrow — serving, access, influence (at target end) */}
        <marker id="marker-open-arrow" viewBox="0 0 10 8" refX={9} refY={4} markerWidth={8} markerHeight={6} orient="auto">
          <polyline points="0,1 9,4 0,7" fill="none" stroke="currentColor" strokeWidth={1.2} />
        </marker>
        {/* Open triangle — realisation, specialisation (at target end) */}
        <marker id="marker-open-triangle" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={8} markerHeight={8} orient="auto">
          <polygon points="0,1 9,5 0,9" fill="none" stroke="currentColor" strokeWidth={1} />
        </marker>
      </defs>
    </svg>
  );
}
