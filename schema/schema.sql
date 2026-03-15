-- arch-vis Presentation Schema (SQLite)
-- This is the visualiser's own persistence layer.
-- PFC data enters via ingestion; this schema is the modelling source of truth.

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ═══════════════════════════════════════
-- Domains (organisational overlay)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    priority INTEGER,
    maturity TEXT CHECK(maturity IN ('initial','defined','managed','optimised')),
    autonomy_ceiling TEXT CHECK(autonomy_ceiling IN ('L0','L1','L2','L3','L4','L5')),
    track_default TEXT CHECK(track_default IN ('Track1','Track2')),
    owner_role TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- Elements (all ArchiMate types in one table)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS elements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    archimate_type TEXT NOT NULL,
    specialisation TEXT,                    -- NULL for standard ArchiMate elements
    layer TEXT NOT NULL CHECK(layer IN (
        'motivation','strategy','business','application','technology','data','implementation','none'
    )),
    sublayer TEXT,                          -- default from config, overridable
    domain_id TEXT REFERENCES domains(id),
    status TEXT DEFAULT 'active' CHECK(status IN ('active','draft','superseded','deprecated','retired')),
    description TEXT,
    properties JSON,                        -- type-specific properties (base + specialisation)
    confidence REAL,                        -- from PFC extraction (0.0–1.0)
    source_session_id TEXT,                 -- PFC session that created/modified this
    parent_id TEXT REFERENCES elements(id), -- hierarchy (capability trees, function decomposition)
    created_by TEXT DEFAULT 'manual',       -- who/what created it
    source TEXT DEFAULT 'manual',           -- creation pathway: 'manual','archimate-xml','csv','api','pfc'
    folder TEXT,                            -- user folder path e.g. 'Infrastructure/Network'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_elements_layer ON elements(layer);
CREATE INDEX IF NOT EXISTS idx_elements_folder ON elements(folder);
CREATE INDEX IF NOT EXISTS idx_elements_domain ON elements(domain_id);
CREATE INDEX IF NOT EXISTS idx_elements_archetype ON elements(archimate_type);
CREATE INDEX IF NOT EXISTS idx_elements_specialisation ON elements(specialisation);

-- ═══════════════════════════════════════
-- Relationships
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    archimate_type TEXT NOT NULL CHECK(archimate_type IN (
        -- ArchiMate relationship types
        'composition','aggregation','assignment','realisation','serving',
        'access','influence','triggering','flow','specialisation','association',
        -- UML relationship types (Phase 3)
        'uml-inheritance','uml-realisation','uml-composition','uml-aggregation',
        'uml-association','uml-dependency','uml-assembly',
        -- UML sequence diagram message types (Phase 4)
        'uml-sync-message','uml-async-message','uml-return-message',
        'uml-create-message','uml-destroy-message','uml-self-message',
        -- Wireframe relationship types (Phase 3)
        'wf-contains','wf-navigates-to','wf-binds-to',
        -- Process flow relationship types
        'pf-sequence-flow','pf-conditional-flow','pf-error-flow'
    )),
    specialisation TEXT,                    -- e.g. 'grounded_in', 'governed_by', NULL for standard
    source_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    label TEXT,
    description TEXT,
    properties JSON,
    confidence REAL,
    created_by TEXT DEFAULT 'manual',       -- who/what created it
    source TEXT DEFAULT 'manual',           -- creation pathway: 'manual','archimate-xml','csv','api','pfc'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rel_source ON relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_rel_target ON relationships(target_id);

-- ═══════════════════════════════════════
-- Valid Relationship Matrix (metamodel)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS valid_relationships (
    source_archimate_type TEXT NOT NULL,
    target_archimate_type TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    PRIMARY KEY (source_archimate_type, target_archimate_type, relationship_type)
);

-- ═══════════════════════════════════════
-- Views
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS views (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    viewpoint_type TEXT NOT NULL CHECK(viewpoint_type IN (
        'layered','knowledge_cognition','domain_slice','governance_matrix',
        'process_detail','infrastructure','information','application_landscape','custom',
        'uml_class','uml_component','wireframe',
        'uml_sequence','uml_activity','uml_usecase',
        'process_flow'
    )),
    description TEXT,
    render_mode TEXT DEFAULT 'spatial' CHECK(render_mode IN ('flat','spatial')),
    filter_domain TEXT,                     -- scope to one domain (NULL = all)
    filter_layers JSON,                     -- JSON array of layer names (NULL = all)
    filter_specialisations JSON,            -- JSON array of specialisation types (NULL = all)
    rotation_default JSON,                  -- {y: -0.3, x: 0.18}
    is_preset INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- View Elements (per-element per-view positions)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS view_elements (
    view_id TEXT NOT NULL REFERENCES views(id) ON DELETE CASCADE,
    element_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    width REAL,                             -- NULL = use default from shape registry
    height REAL,
    sublayer_override TEXT,
    style_overrides JSON,
    z_index INTEGER DEFAULT 0,
    PRIMARY KEY (view_id, element_id)
);

-- ═══════════════════════════════════════
-- View Relationships (per-relationship per-view routing)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS view_relationships (
    view_id TEXT NOT NULL REFERENCES views(id) ON DELETE CASCADE,
    relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    route_points JSON,
    style_overrides JSON,
    PRIMARY KEY (view_id, relationship_id)
);

-- ═══════════════════════════════════════
-- Reasoning Summaries (cached from PFC)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS reasoning_summaries (
    id TEXT PRIMARY KEY,
    element_id TEXT REFERENCES elements(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,                -- PFC session ID
    session_summary TEXT,
    decisions_relevant JSON,                 -- decisions from this session affecting element
    confidence_at_time REAL,
    session_url TEXT,                         -- full URL to PFC web UI
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reasoning_element ON reasoning_summaries(element_id);

-- ═══════════════════════════════════════
-- Process Steps (for process detail viewpoint)
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS process_steps (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    name TEXT NOT NULL,
    step_type TEXT CHECK(step_type IN ('human','agent','system','decision','gateway')),
    role_id TEXT REFERENCES elements(id),    -- business-role
    agent_id TEXT REFERENCES elements(id),   -- domain-agent
    agent_autonomy TEXT,
    description TEXT,
    input_objects JSON,
    output_objects JSON,
    approval_required INTEGER DEFAULT 0,
    track_crossing INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_steps_process ON process_steps(process_id);

-- ═══════════════════════════════════════
-- User Preferences
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default preferences
INSERT OR IGNORE INTO preferences (key, value) VALUES ('theme', 'dark');
INSERT OR IGNORE INTO preferences (key, value) VALUES ('default_view', 'view-spatial-full');
