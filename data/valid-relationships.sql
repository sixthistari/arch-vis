-- valid-relationships.sql
-- ArchiMate 3.2 relationship matrix (core rules)
--
-- NOTE: 'association' is universally valid between ANY ArchiMate elements.
-- Rather than inserting ~2500 rows, it is handled programmatically in the picker.
--
-- NOTE: 'specialisation' is valid between any two elements of the SAME type.
-- Also handled programmatically in the picker.

-- ═══════════════════════════════════════
-- Composition relationships
-- ═══════════════════════════════════════
-- Same-type composition (element can compose itself)
-- Business layer
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-actor', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'business-role', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-collaboration', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interface', 'business-interface', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-process', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-function', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-interaction', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-event', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-service', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-object', 'business-object', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('contract', 'contract', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('representation', 'representation', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('product', 'product', 'composition');
-- Cross-type composition within business
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-actor', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-actor', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-role', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('product', 'business-service', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('product', 'contract', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('product', 'business-interface', 'composition');

-- Application layer
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-component', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-collaboration', 'application-collaboration', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-collaboration', 'application-component', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interface', 'application-interface', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-function', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-process', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-interaction', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-event', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-service', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('data-object', 'data-object', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-interface', 'composition');

-- Technology layer
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'node', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'device', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('system-software', 'system-software', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-collaboration', 'technology-collaboration', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interface', 'technology-interface', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-function', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-process', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-interaction', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-event', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-service', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('artifact', 'artifact', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('communication-network', 'communication-network', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('path', 'path', 'composition');
-- Cross-type composition within technology
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'device', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'system-software', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'system-software', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'technology-interface', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'technology-interface', 'composition');

-- Motivation layer
INSERT OR IGNORE INTO valid_relationships VALUES ('goal', 'goal', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('requirement', 'requirement', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('constraint', 'constraint', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('principle', 'principle', 'composition');

-- Strategy layer
INSERT OR IGNORE INTO valid_relationships VALUES ('capability', 'capability', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('value-stream', 'value-stream', 'composition');

-- Implementation layer
INSERT OR IGNORE INTO valid_relationships VALUES ('work-package', 'work-package', 'composition');
INSERT OR IGNORE INTO valid_relationships VALUES ('plateau', 'plateau', 'composition');

-- ═══════════════════════════════════════
-- Aggregation relationships
-- ═══════════════════════════════════════
-- Same rules as composition but weaker grouping
-- Business layer
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-actor', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'business-role', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-collaboration', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-actor', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-role', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interface', 'business-interface', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-process', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-function', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-process', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-interaction', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-event', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-service', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-object', 'business-object', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('contract', 'contract', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('representation', 'representation', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('product', 'product', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('product', 'business-service', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('product', 'contract', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('product', 'business-interface', 'aggregation');

-- Application layer
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-component', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-collaboration', 'application-collaboration', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-collaboration', 'application-component', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interface', 'application-interface', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-function', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-process', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-process', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-interaction', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-event', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-service', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('data-object', 'data-object', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-interface', 'aggregation');

-- Technology layer
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'node', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'device', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'system-software', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'device', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'system-software', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('system-software', 'system-software', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-collaboration', 'technology-collaboration', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interface', 'technology-interface', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-function', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-process', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-process', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-interaction', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-event', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-service', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('artifact', 'artifact', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('communication-network', 'communication-network', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('path', 'path', 'aggregation');

-- Motivation layer
INSERT OR IGNORE INTO valid_relationships VALUES ('goal', 'goal', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('requirement', 'requirement', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('constraint', 'constraint', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('principle', 'principle', 'aggregation');

-- Strategy layer
INSERT OR IGNORE INTO valid_relationships VALUES ('capability', 'capability', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('value-stream', 'value-stream', 'aggregation');

-- Implementation layer
INSERT OR IGNORE INTO valid_relationships VALUES ('work-package', 'work-package', 'aggregation');
INSERT OR IGNORE INTO valid_relationships VALUES ('plateau', 'plateau', 'aggregation');

-- ═══════════════════════════════════════
-- Assignment relationships
-- ═══════════════════════════════════════
-- Active structure → behaviour (performs)
-- Business layer
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-role', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'business-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'business-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'business-interaction', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'business-event', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'business-service', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-interaction', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-event', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-service', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-interaction', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-collaboration', 'business-event', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interface', 'business-service', 'assignment');

-- Application layer
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-interaction', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-event', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-service', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-collaboration', 'application-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-collaboration', 'application-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-collaboration', 'application-interaction', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interface', 'application-service', 'assignment');

-- Technology layer
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'technology-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'technology-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'technology-interaction', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'technology-event', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'technology-service', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'artifact', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'system-software', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'technology-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'technology-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'artifact', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('system-software', 'artifact', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('system-software', 'technology-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('system-software', 'technology-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-collaboration', 'technology-function', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-collaboration', 'technology-process', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-collaboration', 'technology-interaction', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interface', 'technology-service', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('communication-network', 'technology-service', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('path', 'technology-service', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('path', 'communication-network', 'assignment');

-- Cross-layer assignment
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'data-object', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'application-component', 'assignment');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'application-component', 'assignment');

-- ═══════════════════════════════════════
-- Realisation relationships
-- ═══════════════════════════════════════
-- Concrete element → abstract element it implements
-- Business layer
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'representation', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-object', 'representation', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'contract', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-object', 'realisation');

-- Application layer
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'application-interface', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'data-object', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'data-object', 'realisation');

-- Technology layer
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'artifact', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'artifact', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('system-software', 'artifact', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'technology-interface', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'technology-interface', 'realisation');

-- Cross-layer realisation
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'business-process', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'business-function', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'business-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'business-service', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'business-process', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'application-component', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'application-component', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('system-software', 'application-component', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'application-service', 'realisation');

-- Motivation layer realisation
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-object', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('data-object', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('goal', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('requirement', 'goal', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('constraint', 'requirement', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('principle', 'goal', 'realisation');

-- Strategy layer realisation
INSERT OR IGNORE INTO valid_relationships VALUES ('capability', 'course-of-action', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'capability', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'capability', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'capability', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('value-stream', 'capability', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('resource', 'capability', 'realisation');

-- Implementation layer realisation
INSERT OR IGNORE INTO valid_relationships VALUES ('work-package', 'deliverable', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('work-package', 'plateau', 'realisation');
INSERT OR IGNORE INTO valid_relationships VALUES ('deliverable', 'plateau', 'realisation');

-- ═══════════════════════════════════════
-- Serving relationships
-- ═══════════════════════════════════════
-- Service/interface → consumer
-- Business layer
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-actor', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-role', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-collaboration', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-process', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-function', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-interaction', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-event', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interface', 'business-actor', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interface', 'business-role', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interface', 'business-collaboration', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-process', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-function', 'serving');

-- Application layer
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-component', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-collaboration', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-function', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-process', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-interaction', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-event', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interface', 'application-component', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interface', 'application-collaboration', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-process', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-function', 'serving');

-- Technology layer
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'node', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'device', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'system-software', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-function', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-process', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-collaboration', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interface', 'node', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interface', 'device', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interface', 'system-software', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-process', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-function', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('communication-network', 'node', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('communication-network', 'device', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('path', 'node', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('path', 'device', 'serving');

-- Cross-layer serving
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'business-process', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'business-function', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'business-interaction', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'business-actor', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'business-role', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'business-event', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interface', 'business-actor', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interface', 'business-role', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'application-component', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'application-function', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'application-process', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'application-collaboration', 'serving');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interface', 'application-component', 'serving');

-- ═══════════════════════════════════════
-- Access relationships
-- ═══════════════════════════════════════
-- Behaviour → passive structure (read/write)
-- Business layer
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'contract', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'contract', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'representation', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'representation', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'business-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'business-object', 'access');

-- Application layer
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'data-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'data-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'data-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'data-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'data-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'data-object', 'access');

-- Technology layer
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'artifact', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'artifact', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'artifact', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'artifact', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'artifact', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('node', 'artifact', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('device', 'artifact', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('system-software', 'artifact', 'access');

-- Cross-layer access
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'business-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'business-object', 'access');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'business-object', 'access');

-- ═══════════════════════════════════════
-- Influence relationships
-- ═══════════════════════════════════════
-- Motivation elements influencing other motivation elements
INSERT OR IGNORE INTO valid_relationships VALUES ('stakeholder', 'driver', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('stakeholder', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('stakeholder', 'assessment', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('driver', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('driver', 'assessment', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('driver', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('driver', 'principle', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('assessment', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('assessment', 'driver', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('assessment', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('assessment', 'principle', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('goal', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('goal', 'outcome', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('goal', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('goal', 'constraint', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('goal', 'principle', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('outcome', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('outcome', 'outcome', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('principle', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('principle', 'constraint', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('principle', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('requirement', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('requirement', 'constraint', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('requirement', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('constraint', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('constraint', 'constraint', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('constraint', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('meaning', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('value', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('value', 'driver', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('value', 'goal', 'influence');

-- Core elements can influence motivation
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-component', 'requirement', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-actor', 'goal', 'influence');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-role', 'goal', 'influence');

-- ═══════════════════════════════════════
-- Triggering relationships
-- ═══════════════════════════════════════
-- Between behavioural elements (processes, functions, events, interactions, services)
-- Business layer
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-service', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-event', 'triggering');

-- Application layer
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-service', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-event', 'triggering');

-- Technology layer
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-service', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-interaction', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-event', 'triggering');

-- Cross-layer triggering
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'application-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'application-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'application-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'application-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'business-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'business-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'technology-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'technology-function', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'application-process', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'application-function', 'triggering');

-- Implementation layer
INSERT OR IGNORE INTO valid_relationships VALUES ('implementation-event', 'work-package', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('work-package', 'implementation-event', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('work-package', 'work-package', 'triggering');
INSERT OR IGNORE INTO valid_relationships VALUES ('implementation-event', 'implementation-event', 'triggering');

-- ═══════════════════════════════════════
-- Flow relationships
-- ═══════════════════════════════════════
-- Between behavioural elements (transfer of information/content)
-- Business layer
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'business-service', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-function', 'business-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-event', 'business-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-interaction', 'business-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-service', 'business-event', 'flow');

-- Application layer
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'application-service', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-function', 'application-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-event', 'application-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-interaction', 'application-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-service', 'application-event', 'flow');

-- Technology layer
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'technology-service', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-function', 'technology-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-event', 'technology-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-event', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-interaction', 'technology-interaction', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-service', 'technology-event', 'flow');

-- Cross-layer flow
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'application-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('business-process', 'application-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'business-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'business-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'technology-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('application-process', 'technology-function', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'application-process', 'flow');
INSERT OR IGNORE INTO valid_relationships VALUES ('technology-process', 'application-function', 'flow');
