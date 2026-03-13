/**
 * SVG marker definitions for UML relationship arrowheads.
 *
 * UML arrowheads differ from ArchiMate:
 *   - Hollow triangle (inheritance/realisation): larger, clearly triangular
 *   - Filled diamond (composition): at source end
 *   - Hollow diamond (aggregation): at source end
 *   - Open arrow (association/dependency): simple V
 *   - Filled arrow (synchronous message): solid filled
 */

export function UmlMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {/* Hollow triangle — inheritance, realisation */}
        <marker id="uml-hollow-triangle" viewBox="0 0 14 12" refX={14} refY={6} markerWidth={14} markerHeight={12} orient="auto">
          <polygon points="0,0 14,6 0,12" fill="white" stroke="currentColor" strokeWidth={1.2} />
        </marker>

        {/* Filled diamond — composition (at source) */}
        <marker id="uml-filled-diamond" viewBox="0 0 14 10" refX={0} refY={5} markerWidth={14} markerHeight={10} orient="auto">
          <polygon points="0,5 7,0 14,5 7,10" fill="currentColor" stroke="currentColor" strokeWidth={0.5} />
        </marker>

        {/* Hollow diamond — aggregation (at source) */}
        <marker id="uml-hollow-diamond" viewBox="0 0 14 10" refX={0} refY={5} markerWidth={14} markerHeight={10} orient="auto">
          <polygon points="0,5 7,0 14,5 7,10" fill="white" stroke="currentColor" strokeWidth={1.2} />
        </marker>

        {/* Open arrow — association, dependency */}
        <marker id="uml-open-arrow" viewBox="0 0 12 10" refX={12} refY={5} markerWidth={12} markerHeight={10} orient="auto">
          <polyline points="0,0 12,5 0,10" fill="none" stroke="currentColor" strokeWidth={1.2} />
        </marker>

        {/* Filled arrow — synchronous message */}
        <marker id="uml-filled-arrow" viewBox="0 0 12 10" refX={12} refY={5} markerWidth={12} markerHeight={10} orient="auto">
          <polygon points="0,0 12,5 0,10" fill="currentColor" />
        </marker>
      </defs>
    </svg>
  );
}
