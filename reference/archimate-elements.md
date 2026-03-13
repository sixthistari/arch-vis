# ArchiMate 3.2 — Base Element Types

Shape registry reference. Each row = one shape renderer in the notation system.

## Motivation Layer

| Type | Shape | Notes |
|------|-------|-------|
| stakeholder | Rect + person silhouette top-right | |
| driver | Rect | Motivation colour |
| assessment | Rect | |
| goal | Rounded rect / elliptical | |
| outcome | Rounded rect / elliptical | |
| principle | Rect | |
| requirement | Rect | |
| constraint | Rect | Motivation colour |
| meaning | Rect | |
| value | Rect | |

## Strategy Layer

| Type | Shape | Notes |
|------|-------|-------|
| resource | Rect | |
| capability | Rounded rect | |
| value-stream | Wide pill, high border-radius | Can show stages as chevron sequence |
| course-of-action | Rounded rect | |

## Business Layer

| Type | Shape | Notes |
|------|-------|-------|
| business-actor | Rect + person icon | |
| business-role | Rect | |
| business-collaboration | Rect | |
| business-interface | Rect + lollipop | |
| business-process | Rounded pill | Chevron arrow on right |
| business-function | Rect + top header bar | |
| business-interaction | Rounded pill | |
| business-event | Rounded rect with notch left | |
| business-service | Pill (small, wide) | |
| business-object | Folded-corner rect | Passive structure |
| contract | Folded-corner rect | |
| representation | Folded-corner rect | |
| product | Rect | |

## Application Layer

| Type | Shape | Notes |
|------|-------|-------|
| application-component | Rect + small component icon (stacked squares) top-right | |
| application-collaboration | Rect | |
| application-interface | Rect + lollipop | |
| application-function | Rounded pill | |
| application-process | Rounded pill + chevron | |
| application-interaction | Rounded pill | |
| application-event | Rounded rect with notch | |
| application-service | Pill (small) | |
| data-object | Folded-corner rect | |

## Technology Layer

| Type | Shape | Notes |
|------|-------|-------|
| node | 3D box (top face + right face visible) | Key ArchiMate shape |
| device | 3D box (same as node, sometimes with device icon) | |
| system-software | Rect | |
| technology-collaboration | Rect | |
| technology-interface | Rect + lollipop | |
| technology-function | Rounded pill | |
| technology-process | Rounded pill | |
| technology-interaction | Rounded pill | |
| technology-event | Rounded rect with notch | |
| technology-service | Pill (small) | |
| artifact | Rect + artifact icon (folded page) | |
| communication-network | Rect | |
| path | Rect | |

## Implementation & Migration

| Type | Shape | Notes |
|------|-------|-------|
| work-package | Rounded rect | |
| deliverable | Folded-corner rect | |
| implementation-event | Rounded rect with notch | |
| plateau | Rect + stepped icon | |
| gap | Dashed rect | |

## Other / Composite

| Type | Shape | Notes |
|------|-------|-------|
| grouping | Dashed border container | Not a real element — visual grouping |
| location | Rect | Cross-layer |
| junction | Small circle (and/or) | Relationship connector |

## Standard ArchiMate Colours

| Layer | Colour (fill) |
|-------|--------------|
| Motivation | Light purple (#CCAFD8 or similar) |
| Strategy | Light ochre/gold (#F5DEB3) |
| Business | Yellow (#FFFFB5) |
| Application | Light blue (#B5E4FF) |
| Technology | Light green (#B5FFB5) |
| Physical | Light green (same as tech) |
| Implementation | Light salmon (#FFD0B5) |

These are ArchiMate-standard light fills. The arch-vis tool uses these as the base, with darker variants for dark theme and stroke colours per the theme token system.
