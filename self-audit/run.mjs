#!/usr/bin/env node
/**
 * arch-vis Self-Audit: Codebase self-visualisation & code quality audit.
 *
 * Analyses the codebase for dependencies, duplication, and abstraction violations,
 * then imports the results as ArchiMate views via the batch import API.
 *
 * Usage:
 *   node self-audit/run.mjs          # full run (analyse + import + report)
 *   node self-audit/run.mjs analyse  # analysis only (no server needed)
 *   node self-audit/run.mjs import   # import only (requires prior analysis)
 *   node self-audit/run.mjs report   # report only (requires prior analysis)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname, relative, resolve, extname, basename } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');
const SERVER = join(ROOT, 'server');
const OUT = join(ROOT, 'self-audit');
const API_BASE = 'http://localhost:3001/api';

// ═══════════════════════════════════════
// Module classification
// ═══════════════════════════════════════

const MODULE_RULES = [
  { category: 'NOTATION-ARCHIMATE',  test: p => p.startsWith('notation/') },
  { category: 'NOTATION-UML',        test: p => p.startsWith('renderers/xyflow/nodes/uml/') || p.startsWith('renderers/xyflow/nodes/sequence/') || p.startsWith('renderers/xyflow/edges/uml/') || p.startsWith('renderers/xyflow/edges/sequence/') },
  { category: 'NOTATION-WIREFRAME',  test: p => p.startsWith('renderers/xyflow/nodes/wireframe/') || p.startsWith('renderers/xyflow/edges/wireframe/') },
  { category: 'NOTATION-DATA',       test: p => p.startsWith('renderers/xyflow/nodes/data/') },
  { category: 'NOTATION-PROCESS',    test: p => p.startsWith('renderers/xyflow/nodes/process-flow/') },
  { category: 'SHARED-INFRA',        test: p => p.startsWith('interaction/') || p.startsWith('layout/') || p === 'renderers/types.ts' || p.startsWith('renderers/xyflow/hooks/') || p.startsWith('renderers/xyflow/nodes/shared/') || (p.startsWith('renderers/xyflow/') && !p.startsWith('renderers/xyflow/nodes/') && !p.startsWith('renderers/xyflow/edges/') && !p.startsWith('renderers/xyflow/__tests__/')) || (p.startsWith('renderers/xyflow/edges/') && !p.startsWith('renderers/xyflow/edges/uml/') && !p.startsWith('renderers/xyflow/edges/sequence/') && !p.startsWith('renderers/xyflow/edges/wireframe/')) },
  { category: 'STORE',               test: p => p.startsWith('store/') },
  { category: 'API',                 test: p => p.startsWith('api/') },
  { category: 'MODEL',               test: p => p.startsWith('model/') || p.startsWith('shared/') },
  { category: 'UI',                  test: p => p.startsWith('ui/') || p.startsWith('help/') },
  { category: 'THEME',               test: p => p.startsWith('theme/') },
  { category: 'IO',                  test: p => p.startsWith('io/') },
  { category: 'RENDERER-FLAT',       test: p => p.startsWith('renderers/flat/') },
  { category: 'RENDERER-SPATIAL',    test: p => p.startsWith('renderers/spatial/') },
];

function classify(relPath) {
  for (const rule of MODULE_RULES) {
    if (rule.test(relPath)) return rule.category;
  }
  return 'OTHER';
}

// ═══════════════════════════════════════
// File scanning
// ═══════════════════════════════════════

function scanFiles(dir, extensions = ['.ts', '.tsx']) {
  const results = [];
  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === 'dist') continue;
        walk(full);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

// ═══════════════════════════════════════
// Phase 1.1: Dependency Analysis
// ═══════════════════════════════════════

function resolveImport(fromFile, importPath) {
  const fromDir = dirname(fromFile);
  let target = resolve(fromDir, importPath);

  // Try exact, .ts, .tsx, /index.ts, /index.tsx
  const candidates = [
    target,
    target + '.ts',
    target + '.tsx',
    join(target, 'index.ts'),
    join(target, 'index.tsx'),
  ];

  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function analyseDependencies() {
  console.log('  Scanning src/ for dependencies...');
  const srcFiles = scanFiles(SRC);
  console.log(`  Found ${srcFiles.length} source files`);

  const serverFiles = scanFiles(SERVER);
  console.log(`  Found ${serverFiles.length} server files`);

  const allFiles = [...srcFiles, ...serverFiles];
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;

  // file -> { category, imports: [{ target, targetCategory }] }
  const fileGraph = new Map();

  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8');
    const relPath = file.startsWith(SRC)
      ? relative(SRC, file)
      : file.startsWith(SERVER)
        ? 'server/' + relative(SERVER, file)
        : relative(ROOT, file);

    const category = file.startsWith(SERVER) ? 'SERVER' : classify(relPath);
    const imports = [];

    let match;
    importRegex.lastIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      const resolved = resolveImport(file, match[1]);
      if (resolved) {
        const targetRel = resolved.startsWith(SRC)
          ? relative(SRC, resolved)
          : resolved.startsWith(SERVER)
            ? 'server/' + relative(SERVER, resolved)
            : relative(ROOT, resolved);
        const targetCategory = resolved.startsWith(SERVER) ? 'SERVER' : classify(targetRel);
        imports.push({ target: targetRel, targetCategory });
      }
    }

    fileGraph.set(relPath, { category, imports, file });
  }

  // Module-level aggregation
  const moduleStats = new Map();
  const moduleEdges = new Map(); // "A->B" => count

  for (const [filePath, info] of fileGraph) {
    if (!moduleStats.has(info.category)) {
      moduleStats.set(info.category, { files: [], fanIn: 0, fanOut: 0 });
    }
    moduleStats.get(info.category).files.push(filePath);

    for (const imp of info.imports) {
      if (imp.targetCategory !== info.category) {
        const edgeKey = `${info.category}->${imp.targetCategory}`;
        moduleEdges.set(edgeKey, (moduleEdges.get(edgeKey) || 0) + 1);
        moduleStats.get(info.category).fanOut++;

        if (!moduleStats.has(imp.targetCategory)) {
          moduleStats.set(imp.targetCategory, { files: [], fanIn: 0, fanOut: 0 });
        }
        moduleStats.get(imp.targetCategory).fanIn++;
      }
    }
  }

  // Compute instability
  const modules = {};
  for (const [name, stats] of moduleStats) {
    const total = stats.fanIn + stats.fanOut;
    modules[name] = {
      fileCount: stats.files.length,
      fanIn: stats.fanIn,
      fanOut: stats.fanOut,
      instability: total > 0 ? +(stats.fanOut / total).toFixed(3) : 0,
      files: stats.files,
    };
  }

  // Detect circular dependencies (module level)
  const adjacency = new Map();
  for (const [edge] of moduleEdges) {
    const [from, to] = edge.split('->');
    if (!adjacency.has(from)) adjacency.set(from, new Set());
    adjacency.get(from).add(to);
  }

  const cycles = [];
  const visited = new Set();
  const onStack = new Set();

  function dfs(node, path) {
    if (onStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push(path.slice(cycleStart).concat(node));
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    onStack.add(node);
    path.push(node);

    for (const next of (adjacency.get(node) || [])) {
      dfs(next, [...path]);
    }

    onStack.delete(node);
  }

  for (const node of adjacency.keys()) {
    dfs(node, []);
  }

  // Deduplicate cycles
  const uniqueCycles = [];
  const cycleSignatures = new Set();
  for (const cycle of cycles) {
    const sorted = [...cycle.slice(0, -1)].sort().join(',');
    if (!cycleSignatures.has(sorted)) {
      cycleSignatures.add(sorted);
      uniqueCycles.push(cycle);
    }
  }

  const edges = {};
  for (const [edge, count] of moduleEdges) {
    edges[edge] = count;
  }

  const result = { modules, edges, cycles: uniqueCycles, fileGraph: Object.fromEntries(fileGraph) };
  writeFileSync(join(OUT, 'dependencies.json'), JSON.stringify(result, null, 2));
  console.log(`  Wrote dependencies.json (${Object.keys(modules).length} modules, ${Object.keys(edges).length} edges, ${uniqueCycles.length} cycles)`);
  return result;
}

// ═══════════════════════════════════════
// Phase 1.2: Duplication Scan
// ═══════════════════════════════════════

function scanDuplication() {
  console.log('  Running jscpd duplication scan...');

  try {
    execSync(
      `npx --yes jscpd "${SRC}" --min-lines 10 --min-tokens 50 --reporters json --output "${OUT}" --silent`,
      { cwd: ROOT, stdio: 'pipe', timeout: 60000 }
    );
  } catch (err) {
    // jscpd exits non-zero when duplicates found — that's expected
    if (!existsSync(join(OUT, 'jscpd-report.json'))) {
      console.log('  jscpd not available or failed — skipping duplication scan');
      writeFileSync(join(OUT, 'duplication-summary.json'), JSON.stringify({ skipped: true, reason: 'jscpd unavailable' }, null, 2));
      return null;
    }
  }

  if (!existsSync(join(OUT, 'jscpd-report.json'))) {
    console.log('  No jscpd report generated — skipping');
    writeFileSync(join(OUT, 'duplication-summary.json'), JSON.stringify({ skipped: true, reason: 'no report' }, null, 2));
    return null;
  }

  const report = JSON.parse(readFileSync(join(OUT, 'jscpd-report.json'), 'utf-8'));
  const duplicates = report.duplicates || [];

  // Classify clone pairs
  const classified = duplicates.map(d => {
    const fileA = relative(SRC, d.firstFile?.name || '');
    const fileB = relative(SRC, d.secondFile?.name || '');
    const catA = classify(fileA);
    const catB = classify(fileB);

    let pairType;
    if (catA === catB && catA.startsWith('NOTATION-')) pairType = 'within-notation';
    else if (catA.startsWith('NOTATION-') && catB.startsWith('NOTATION-')) pairType = 'cross-notation';
    else if (catA === 'SHARED-INFRA' || catB === 'SHARED-INFRA') pairType = 'shared-infra';
    else pairType = 'other';

    return {
      fileA, fileB, catA, catB, pairType,
      lines: d.lines || 0,
      tokens: d.tokens || 0,
      fragment: d.fragment || '',
    };
  });

  const summary = {
    totalClones: classified.length,
    totalDuplicatedLines: report.statistics?.total?.duplicatedLines || 0,
    percentage: report.statistics?.total?.percentage || 0,
    byType: {
      'within-notation': classified.filter(c => c.pairType === 'within-notation').length,
      'cross-notation': classified.filter(c => c.pairType === 'cross-notation').length,
      'shared-infra': classified.filter(c => c.pairType === 'shared-infra').length,
      'other': classified.filter(c => c.pairType === 'other').length,
    },
    clones: classified,
  };

  writeFileSync(join(OUT, 'duplication-summary.json'), JSON.stringify(summary, null, 2));
  console.log(`  Wrote duplication-summary.json (${summary.totalClones} clone pairs, ${summary.percentage}% duplication)`);
  return summary;
}

// ═══════════════════════════════════════
// Phase 1.3: Abstraction Violations
// ═══════════════════════════════════════

function findViolations(deps, duplication) {
  console.log('  Analysing abstraction violations...');

  const violations = [];

  // Check edges for violations
  for (const [edge, count] of Object.entries(deps.edges)) {
    const [from, to] = edge.split('->');

    // SHARED-INFRA importing NOTATION-* (inverted dependency)
    if (from === 'SHARED-INFRA' && to.startsWith('NOTATION-')) {
      violations.push({
        type: 'inverted-dependency',
        severity: 'high',
        from, to, count,
        description: `Shared infrastructure imports notation-specific code (${to}). ${count} import(s).`,
      });
    }

    // NOTATION-X importing NOTATION-Y (cross-notation coupling)
    if (from.startsWith('NOTATION-') && to.startsWith('NOTATION-') && from !== to) {
      violations.push({
        type: 'cross-notation-coupling',
        severity: 'medium',
        from, to, count,
        description: `${from} imports from ${to}. ${count} import(s). Notations should be independent.`,
      });
    }
  }

  // Find specific files causing violations
  for (const [filePath, info] of Object.entries(deps.fileGraph)) {
    for (const imp of info.imports) {
      if (info.category === 'SHARED-INFRA' && imp.targetCategory.startsWith('NOTATION-')) {
        violations.push({
          type: 'inverted-dependency-file',
          severity: 'high',
          file: filePath,
          importsFrom: imp.target,
          fromCategory: info.category,
          toCategory: imp.targetCategory,
          description: `${filePath} (shared infra) imports ${imp.target} (${imp.targetCategory})`,
        });
      }
      if (info.category.startsWith('NOTATION-') && imp.targetCategory.startsWith('NOTATION-') && info.category !== imp.targetCategory) {
        violations.push({
          type: 'cross-notation-coupling-file',
          severity: 'medium',
          file: filePath,
          importsFrom: imp.target,
          fromCategory: info.category,
          toCategory: imp.targetCategory,
          description: `${filePath} (${info.category}) imports ${imp.target} (${imp.targetCategory})`,
        });
      }
    }
  }

  // Cross-reference with duplication data
  if (duplication && duplication.clones) {
    for (const clone of duplication.clones) {
      if (clone.pairType === 'cross-notation') {
        violations.push({
          type: 'duplicated-cross-notation',
          severity: 'medium',
          fileA: clone.fileA,
          fileB: clone.fileB,
          tokens: clone.tokens,
          lines: clone.lines,
          description: `Duplicated code between ${clone.catA} and ${clone.catB}: ${clone.fileA} ↔ ${clone.fileB} (${clone.lines} lines). Should be extracted to shared infra.`,
        });
      }
      if (clone.pairType === 'shared-infra') {
        violations.push({
          type: 'duplicated-with-shared',
          severity: 'low',
          fileA: clone.fileA,
          fileB: clone.fileB,
          tokens: clone.tokens,
          lines: clone.lines,
          description: `Duplication involving shared infra: ${clone.fileA} ↔ ${clone.fileB} (${clone.lines} lines). May indicate incomplete extraction.`,
        });
      }
    }
  }

  writeFileSync(join(OUT, 'violations.json'), JSON.stringify(violations, null, 2));
  console.log(`  Wrote violations.json (${violations.length} violations)`);
  return violations;
}

// ═══════════════════════════════════════
// Phase 2: Self-Model via Batch Import
// ═══════════════════════════════════════

async function apiCall(method, path, body) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);
  const data = await resp.json();

  if (!resp.ok) {
    console.error(`  API error ${resp.status} on ${method} ${path}:`, data);
    return null;
  }

  if (data.warnings?.length) {
    console.log(`  Warnings from ${path}:`);
    for (const w of data.warnings) console.log(`    - ${w}`);
  }

  return data;
}

async function selfModel(deps, duplication, violations) {
  console.log('\n═══ Phase 2: Self-Model Import ═══');

  // Step 3.0: Create project
  console.log('  Creating project...');
  const project = await apiCall('POST', '/projects', {
    name: 'arch-vis Self-Audit',
    description: 'Codebase self-visualisation and quality audit — generated by self-audit/run.mjs',
  });
  if (!project) throw new Error('Failed to create project');
  const projectId = project.id;
  console.log(`  Project created: ${projectId}`);

  const qp = `?project_id=${projectId}`;

  // ─── View 1: Module Architecture ───
  console.log('  Importing View 1: Module Architecture...');
  const modules = deps.modules;
  const moduleNames = Object.keys(modules);

  const v1Elements = moduleNames.map(name => ({
    name,
    archimate_type: 'application-component',
    layer: 'application',
    description: `Files: ${modules[name].fileCount} | Fan-in: ${modules[name].fanIn} | Fan-out: ${modules[name].fanOut} | Instability: ${modules[name].instability}`,
  }));

  // Build relationships from actual edges (use aggregation for inter-module deps)
  const v1Rels = [];
  for (const [edge, count] of Object.entries(deps.edges)) {
    const [from, to] = edge.split('->');
    if (moduleNames.includes(from) && moduleNames.includes(to)) {
      v1Rels.push({
        archimate_type: 'aggregation',
        source_name: from,
        target_name: to,
        label: `${count} imports`,
      });
    }
  }

  const v1Result = await apiCall('POST', `/import/model-batch${qp}`, {
    notation: 'archimate',
    elements: v1Elements,
    relationships: v1Rels,
    view: { name: 'Module Architecture', viewpoint: 'application_landscape' },
  });
  console.log(`  View 1: ${v1Result?.elementsCreated || 0} elements, ${v1Result?.relationshipsCreated || 0} relationships, viewId=${v1Result?.viewId}`);

  // ─── View 2: Notation Abstraction Map ───
  console.log('  Importing View 2: Notation Abstraction Map...');

  // Shared infra components
  const sharedComponents = [
    { name: 'Canvas (xyflow)', desc: 'Core React Flow canvas, node registration, edge routing' },
    { name: 'Edge Routing', desc: 'Shared edge components, connection logic, handle assignment' },
    { name: 'Layout Engine', desc: 'ELK, dagre, force, grid layout algorithms' },
    { name: 'Interaction Hooks', desc: 'Selection, highlight, pan-zoom, drag handlers' },
    { name: 'Shared Node Utils', desc: 'Common node components shared across notations' },
  ];

  // Notation functions
  const notationFunctions = [
    { name: 'ArchiMate Renderer', desc: `Files: ${modules['NOTATION-ARCHIMATE']?.fileCount || 0}. Shape registry, aspect colours, ArchiMate 3.2 visual notation.` },
    { name: 'UML Renderer', desc: `Files: ${modules['NOTATION-UML']?.fileCount || 0}. Class, component, sequence, activity diagram nodes and edges.` },
    { name: 'Wireframe Renderer', desc: `Files: ${modules['NOTATION-WIREFRAME']?.fileCount || 0}. Page, section, form control wireframe shapes.` },
    { name: 'Data Model Renderer', desc: `Files: ${modules['NOTATION-DATA']?.fileCount || 0}. Entity, table, attribute data modelling nodes.` },
    { name: 'Process Flow Renderer', desc: `Files: ${modules['NOTATION-PROCESS']?.fileCount || 0}. BPMN-like process flow nodes.` },
  ];

  const v2Elements = [
    ...sharedComponents.map(s => ({
      name: s.name,
      archimate_type: 'application-component',
      layer: 'application',
      description: s.desc,
    })),
    ...notationFunctions.map(n => ({
      name: n.name,
      archimate_type: 'application-function',
      layer: 'application',
      description: n.desc,
    })),
  ];

  // Assignment: shared components serve notation functions
  const v2Rels = [];
  for (const shared of sharedComponents) {
    for (const notation of notationFunctions) {
      v2Rels.push({
        archimate_type: 'assignment',
        source_name: shared.name,
        target_name: notation.name,
      });
    }
  }

  // Flow edges for violations (cross-notation imports)
  const crossNotationViolations = violations.filter(v => v.type === 'cross-notation-coupling');
  const notationNameMap = {
    'NOTATION-ARCHIMATE': 'ArchiMate Renderer',
    'NOTATION-UML': 'UML Renderer',
    'NOTATION-WIREFRAME': 'Wireframe Renderer',
    'NOTATION-DATA': 'Data Model Renderer',
    'NOTATION-PROCESS': 'Process Flow Renderer',
  };

  for (const v of crossNotationViolations) {
    const srcName = notationNameMap[v.from];
    const tgtName = notationNameMap[v.to];
    if (srcName && tgtName) {
      v2Rels.push({
        archimate_type: 'flow',
        source_name: srcName,
        target_name: tgtName,
        label: `violation: ${v.count} imports`,
      });
    }
  }

  const v2Result = await apiCall('POST', `/import/model-batch${qp}`, {
    notation: 'archimate',
    elements: v2Elements,
    relationships: v2Rels,
    view: { name: 'Notation Abstraction Map', viewpoint: 'custom' },
  });
  console.log(`  View 2: ${v2Result?.elementsCreated || 0} elements, ${v2Result?.relationshipsCreated || 0} relationships, viewId=${v2Result?.viewId}`);

  // ─── View 3: Duplication Heat Map ───
  if (duplication && !duplication.skipped && duplication.totalClones > 0) {
    console.log('  Importing View 3: Duplication Heat Map...');

    // Group duplicates by file, cap at 30
    const fileDupCount = new Map();
    for (const clone of duplication.clones) {
      fileDupCount.set(clone.fileA, (fileDupCount.get(clone.fileA) || 0) + clone.lines);
      fileDupCount.set(clone.fileB, (fileDupCount.get(clone.fileB) || 0) + clone.lines);
    }
    const topFiles = [...fileDupCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);

    const topFileSet = new Set(topFiles.map(([f]) => f));

    const v3Elements = topFiles.map(([file, lines]) => ({
      name: basename(file, extname(file)),
      archimate_type: 'application-component',
      layer: 'application',
      description: `${file} — ${lines} duplicated lines. Category: ${classify(file)}`,
    }));

    // Only include clone pairs where both files are in top 30
    const v3Rels = [];
    const seenPairs = new Set();
    for (const clone of duplication.clones) {
      if (topFileSet.has(clone.fileA) && topFileSet.has(clone.fileB)) {
        const nameA = basename(clone.fileA, extname(clone.fileA));
        const nameB = basename(clone.fileB, extname(clone.fileB));
        const pairKey = [nameA, nameB].sort().join('|');
        if (!seenPairs.has(pairKey) && nameA !== nameB) {
          seenPairs.add(pairKey);
          v3Rels.push({
            archimate_type: 'aggregation',
            source_name: nameA,
            target_name: nameB,
            label: `${clone.tokens} tokens`,
          });
        }
      }
    }

    const v3Result = await apiCall('POST', `/import/model-batch${qp}`, {
      notation: 'archimate',
      elements: v3Elements,
      relationships: v3Rels,
      view: { name: 'Duplication Heat Map', viewpoint: 'custom' },
    });
    console.log(`  View 3: ${v3Result?.elementsCreated || 0} elements, ${v3Result?.relationshipsCreated || 0} relationships, viewId=${v3Result?.viewId}`);
  } else {
    console.log('  Skipping View 3 (Duplication Heat Map) — insufficient data');
  }

  // ─── View 4: Dependency Risk ───
  console.log('  Importing View 4: Dependency Risk...');

  const v4Elements = moduleNames.map(name => {
    const m = modules[name];
    const riskFlags = [];
    if (m.instability > 0.8) riskFlags.push('HIGH instability');
    if (m.instability < 0.2 && m.fanIn > 10) riskFlags.push('RIGID (low instability, high fan-in)');
    if (m.fanOut > 20) riskFlags.push('HIGH fan-out (God module risk)');

    const inCycle = deps.cycles.some(c => c.includes(name));
    if (inCycle) riskFlags.push('CIRCULAR dependency detected');

    return {
      name: `[Risk] ${name}`,
      archimate_type: 'application-component',
      layer: 'application',
      description: [
        `Fan-in: ${m.fanIn} | Fan-out: ${m.fanOut} | Instability: ${m.instability}`,
        `Files: ${m.fileCount}`,
        riskFlags.length > 0 ? `Risk: ${riskFlags.join('; ')}` : 'No significant risks',
      ].join('\n'),
    };
  });

  const v4Rels = [];
  for (const [edge, count] of Object.entries(deps.edges)) {
    const [from, to] = edge.split('->');
    if (moduleNames.includes(from) && moduleNames.includes(to)) {
      v4Rels.push({
        archimate_type: 'aggregation',
        source_name: `[Risk] ${from}`,
        target_name: `[Risk] ${to}`,
        label: `${count}`,
      });
    }
  }

  const v4Result = await apiCall('POST', `/import/model-batch${qp}`, {
    notation: 'archimate',
    elements: v4Elements,
    relationships: v4Rels,
    view: { name: 'Dependency Risk', viewpoint: 'custom' },
  });
  console.log(`  View 4: ${v4Result?.elementsCreated || 0} elements, ${v4Result?.relationshipsCreated || 0} relationships, viewId=${v4Result?.viewId}`);

  return { projectId, viewIds: [v1Result?.viewId, v2Result?.viewId, v4Result?.viewId].filter(Boolean) };
}

// ═══════════════════════════════════════
// Phase 3: Report
// ═══════════════════════════════════════

function generateReport(deps, duplication, violations, importResult) {
  console.log('\n═══ Phase 3: Report Generation ═══');

  const modules = deps.modules;
  const moduleNames = Object.keys(modules).sort();
  const totalFiles = moduleNames.reduce((sum, n) => sum + modules[n].fileCount, 0);

  // Sort modules by instability for risk table
  const sortedByInstability = moduleNames
    .map(n => ({ name: n, ...modules[n] }))
    .sort((a, b) => b.instability - a.instability);

  // Violation summaries
  const highViolations = violations.filter(v => v.severity === 'high');
  const mediumViolations = violations.filter(v => v.severity === 'medium');
  const lowViolations = violations.filter(v => v.severity === 'low');

  // Build the report
  const lines = [];
  lines.push('# arch-vis Self-Audit Report');
  lines.push(`\n*Generated: ${new Date().toISOString().slice(0, 10)}*\n`);

  // 1. Codebase Overview
  lines.push('## 1. Codebase Overview\n');
  lines.push(`Total source files analysed: **${totalFiles}**\n`);
  lines.push('| Module | Files | Fan-In | Fan-Out | Instability |');
  lines.push('|--------|------:|-------:|--------:|------------:|');
  for (const m of sortedByInstability) {
    lines.push(`| ${m.name} | ${m.fileCount} | ${m.fanIn} | ${m.fanOut} | ${m.instability} |`);
  }
  lines.push('');

  // 2. Duplication
  lines.push('## 2. Duplication\n');
  if (duplication && !duplication.skipped) {
    lines.push(`- Total clone pairs: **${duplication.totalClones}**`);
    lines.push(`- Duplicated lines: **${duplication.totalDuplicatedLines}**`);
    lines.push(`- Duplication percentage: **${duplication.percentage}%**`);
    lines.push('');
    lines.push('Breakdown by type:');
    lines.push(`- Within-notation: ${duplication.byType['within-notation']}`);
    lines.push(`- Cross-notation: ${duplication.byType['cross-notation']}`);
    lines.push(`- Shared infra: ${duplication.byType['shared-infra']}`);
    lines.push(`- Other: ${duplication.byType['other']}`);
    lines.push('');

    if (duplication.clones.length > 0) {
      lines.push('### Worst Offenders\n');
      lines.push('| File A | File B | Type | Lines |');
      lines.push('|--------|--------|------|------:|');
      const top10 = [...duplication.clones].sort((a, b) => b.lines - a.lines).slice(0, 10);
      for (const c of top10) {
        lines.push(`| ${c.fileA} | ${c.fileB} | ${c.pairType} | ${c.lines} |`);
      }
      lines.push('');
    }
  } else {
    lines.push('*Duplication scan skipped (jscpd unavailable or no results).*\n');
  }

  // 3. Abstraction Violations
  lines.push('## 3. Abstraction Violations\n');
  lines.push(`- **High severity**: ${highViolations.length} (inverted dependencies)`);
  lines.push(`- **Medium severity**: ${mediumViolations.length} (cross-notation coupling)`);
  lines.push(`- **Low severity**: ${lowViolations.length} (duplication overlap)`);
  lines.push('');

  if (highViolations.length > 0) {
    lines.push('### High: Inverted Dependencies (shared infra → notation)\n');
    for (const v of highViolations) {
      lines.push(`- ${v.description}`);
    }
    lines.push('');
  }

  if (mediumViolations.length > 0) {
    lines.push('### Medium: Cross-Notation Coupling\n');
    for (const v of mediumViolations) {
      lines.push(`- ${v.description}`);
    }
    lines.push('');
  }

  if (lowViolations.length > 0) {
    lines.push('### Low: Duplication Overlap\n');
    for (const v of lowViolations.slice(0, 10)) {
      lines.push(`- ${v.description}`);
    }
    if (lowViolations.length > 10) {
      lines.push(`- ... and ${lowViolations.length - 10} more`);
    }
    lines.push('');
  }

  // 4. Dependency Health
  lines.push('## 4. Dependency Health\n');

  // Circular deps
  if (deps.cycles.length > 0) {
    lines.push(`### Circular Dependencies (${deps.cycles.length})\n`);
    for (const cycle of deps.cycles) {
      lines.push(`- ${cycle.join(' → ')}`);
    }
    lines.push('');
  } else {
    lines.push('No circular dependencies detected at the module level.\n');
  }

  // God modules
  const godModules = sortedByInstability.filter(m => m.fanOut > 15);
  if (godModules.length > 0) {
    lines.push('### High Fan-Out Modules (potential God modules)\n');
    for (const m of godModules) {
      lines.push(`- **${m.name}**: fan-out ${m.fanOut}, ${m.fileCount} files`);
    }
    lines.push('');
  }

  // Instability outliers
  const unstable = sortedByInstability.filter(m => m.instability > 0.8);
  const rigid = sortedByInstability.filter(m => m.instability < 0.2 && m.fanIn > 5);
  if (unstable.length > 0) {
    lines.push('### High Instability (>0.8)\n');
    for (const m of unstable) {
      lines.push(`- **${m.name}**: instability ${m.instability} (fan-in: ${m.fanIn}, fan-out: ${m.fanOut})`);
    }
    lines.push('');
  }
  if (rigid.length > 0) {
    lines.push('### Low Instability / High Fan-In (rigid)\n');
    for (const m of rigid) {
      lines.push(`- **${m.name}**: instability ${m.instability} (fan-in: ${m.fanIn})`);
    }
    lines.push('');
  }

  // 5. Recommendations
  lines.push('## 5. Recommendations\n');

  const recs = [];

  if (highViolations.length > 0) {
    recs.push({
      action: 'Eliminate inverted dependencies from shared canvas infra into notation-specific code',
      effort: 'M', impact: 'L',
      detail: `${highViolations.length} shared-infra files import notation-specific modules. Extract the notation-specific logic behind interfaces or move it to the notation modules.`,
    });
  }

  if (mediumViolations.filter(v => v.type === 'cross-notation-coupling').length > 0) {
    recs.push({
      action: 'Decouple notation renderers from each other',
      effort: 'S', impact: 'M',
      detail: 'Cross-notation imports create hidden coupling. Extract shared patterns to shared-infra or model.',
    });
  }

  if (duplication && !duplication.skipped && duplication.byType['cross-notation'] > 0) {
    recs.push({
      action: 'Extract duplicated cross-notation code to shared infrastructure',
      effort: 'M', impact: 'M',
      detail: `${duplication.byType['cross-notation']} cross-notation clone pairs. These represent patterns that should live in shared-infra.`,
    });
  }

  if (duplication && !duplication.skipped && duplication.byType['within-notation'] > 3) {
    recs.push({
      action: 'Consolidate within-notation duplicates',
      effort: 'S', impact: 'S',
      detail: `${duplication.byType['within-notation']} within-notation clone pairs. Consider shared base components within each notation family.`,
    });
  }

  if (godModules.length > 0) {
    recs.push({
      action: 'Reduce fan-out of God modules',
      effort: 'L', impact: 'L',
      detail: `${godModules.map(m => m.name).join(', ')} have excessive fan-out. Consider facade patterns or splitting responsibilities.`,
    });
  }

  if (deps.cycles.length > 0) {
    recs.push({
      action: 'Break circular dependencies',
      effort: 'M', impact: 'L',
      detail: `${deps.cycles.length} cycles detected. Introduce interfaces or dependency inversion to break cycles.`,
    });
  }

  if (recs.length > 0) {
    lines.push('| # | Action | Effort | Impact |');
    lines.push('|---|--------|--------|--------|');
    recs.forEach((r, i) => {
      lines.push(`| ${i + 1} | ${r.action} | ${r.effort} | ${r.impact} |`);
    });
    lines.push('');
    for (const [i, r] of recs.entries()) {
      lines.push(`**${i + 1}. ${r.action}**`);
      lines.push(`${r.detail}\n`);
    }
  } else {
    lines.push('No significant issues found. The codebase has clean abstraction boundaries.\n');
  }

  // 6. Views Created
  lines.push('## 6. Views Created\n');
  if (importResult) {
    lines.push(`Project: **arch-vis Self-Audit** (${importResult.projectId})\n`);
    lines.push('| View | What It Reveals |');
    lines.push('|------|-----------------|');
    lines.push('| Module Architecture | High-level module dependency map with import counts |');
    lines.push('| Notation Abstraction Map | Shared infra → notation separation, violation flows |');
    lines.push('| Duplication Heat Map | Files with most cloned code (if applicable) |');
    lines.push('| Dependency Risk | Per-module instability, fan-in/out, risk flags |');
    lines.push('');
    lines.push(`View the results at: http://localhost:5173 (switch to "arch-vis Self-Audit" project)\n`);
  } else {
    lines.push('*Views not imported (import phase skipped or server unavailable).*\n');
  }

  const report = lines.join('\n');
  writeFileSync(join(OUT, 'report.md'), report);
  console.log('  Wrote report.md');
  return report;
}

// ═══════════════════════════════════════
// Main
// ═══════════════════════════════════════

async function main() {
  const arg = process.argv[2];
  console.log('═══ arch-vis Self-Audit ═══\n');

  let deps, duplication, violations, importResult;

  if (!arg || arg === 'analyse') {
    console.log('═══ Phase 1: Analysis ═══');
    deps = analyseDependencies();
    duplication = scanDuplication();
    violations = findViolations(deps, duplication);
  }

  if (!arg || arg === 'import') {
    if (!deps) {
      deps = JSON.parse(readFileSync(join(OUT, 'dependencies.json'), 'utf-8'));
      duplication = JSON.parse(readFileSync(join(OUT, 'duplication-summary.json'), 'utf-8'));
      violations = JSON.parse(readFileSync(join(OUT, 'violations.json'), 'utf-8'));
    }
    try {
      importResult = await selfModel(deps, duplication, violations);
    } catch (err) {
      console.error(`  Import failed: ${err.message}`);
      console.log('  Continuing to report generation...');
    }
  }

  if (!arg || arg === 'report') {
    if (!deps) {
      deps = JSON.parse(readFileSync(join(OUT, 'dependencies.json'), 'utf-8'));
      duplication = JSON.parse(readFileSync(join(OUT, 'duplication-summary.json'), 'utf-8'));
      violations = JSON.parse(readFileSync(join(OUT, 'violations.json'), 'utf-8'));
    }
    generateReport(deps, duplication, violations, importResult || null);
  }

  console.log('\n═══ Done ═══');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
