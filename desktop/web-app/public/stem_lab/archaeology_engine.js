// archaeology_engine.js — PURE logic for the Voxel Archaeology STEM tool.
// No DOM, no React, no globals, no Math.random at call time (seeded). This is the
// testable core per VOXEL_ARCHAEOLOGY_ARCHITECTURE.md: the React view and visual
// layer (stem_tool_archaeology.js) will consume it; tests exercise it headless.
//
// Dual export: under Node/test `module.exports`; in the browser `window.AlloArchaeology`.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; // Node / test require
  if (typeof globalThis !== 'undefined') globalThis.AlloArchaeology = api; // new Function() loader + browser
  else if (root) root.AlloArchaeology = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '0.1.0';

  // 0 = surface (youngest), last = deepest (oldest). Sterile subsoil holds no artifacts.
  var DEFAULT_STRATA = [
    { index: 0, name: 'Topsoil',           material: 'loam',             period: 'modern',         pattern: 'dots' },
    { index: 1, name: 'Plough soil',       material: 'mixed earth',      period: '1700s-1800s',    pattern: 'lines' },
    { index: 2, name: 'Destruction layer', material: 'ash and rubble',   period: 'medieval fire',  pattern: 'cross' },
    { index: 3, name: 'Occupation floor',  material: 'packed clay',      period: 'medieval',       pattern: 'grid' },
    { index: 4, name: 'Early foundation',  material: 'stone and mortar', period: 'early medieval', pattern: 'brick' },
    { index: 5, name: 'Sterile subsoil',   material: 'natural gravel',   period: 'pre-human',      pattern: 'none' }
  ];

  var ARTIFACT_POOL = [
    { type: 'coin',    label: 'bronze coin',   description: 'A worn bronze coin.' },
    { type: 'pottery', label: 'pottery sherd', description: 'A fragment of glazed pottery.', fragile: true },
    { type: 'nail',    label: 'iron nail',     description: 'A hand-forged iron nail.' },
    { type: 'bone',    label: 'bone tool',     description: 'A worked animal-bone tool.' },
    { type: 'bead',    label: 'glass bead',    description: 'A small blue glass bead.', fragile: true },
    { type: 'tile',    label: 'roof tile',     description: 'A fragment of fired roof tile.' }
  ];

  // Deterministic PRNG (mulberry32) so a seed always yields the same site.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function colLabel(x) { return String.fromCharCode(65 + x); } // 0 -> A
  function cellName(x, y) { return colLabel(x) + (y + 1); }    // (0,0) -> A1

  // Build a deterministic dig site. Artifacts land in distinct cells, one per stratum
  // in `artifactStrata` (default 1..4), so finds have a unique chronological order.
  function generateSite(seed, opts) {
    opts = opts || {};
    var cols = opts.cols || 6;
    var rows = opts.rows || 6;
    var strata = opts.strata || DEFAULT_STRATA;
    var artifactStrata = opts.artifactStrata || [1, 2, 3, 4];
    var rnd = mulberry32((seed >>> 0) || 1);
    var used = {};
    var artifacts = artifactStrata.map(function (stratumIndex, i) {
      var x, y, key;
      do { x = Math.floor(rnd() * cols); y = Math.floor(rnd() * rows); key = x + ',' + y; } while (used[key]);
      used[key] = true;
      var t = ARTIFACT_POOL[Math.floor(rnd() * ARTIFACT_POOL.length)];
      return { id: 'a' + (i + 1), type: t.type, label: t.label, description: t.description, trueStratum: stratumIndex, x: x, y: y, fragile: !!t.fragile };
    });
    return { cols: cols, rows: rows, depth: strata.length, strata: strata, artifacts: artifacts, seed: (seed >>> 0) || 1 };
  }

  function initState(site) {
    var dug = [];
    for (var x = 0; x < site.cols; x++) { dug[x] = []; for (var y = 0; y < site.rows; y++) dug[x][y] = 0; }
    var status = {}, lost = {};
    site.artifacts.forEach(function (a) { status[a.id] = 'buried'; lost[a.id] = false; });
    return { site: site, cursor: { x: 0, y: 0 }, dug: dug, status: status, lostContext: lost, log: [] };
  }

  function cloneState(s) {
    return {
      site: s.site,
      cursor: { x: s.cursor.x, y: s.cursor.y },
      dug: s.dug.map(function (col) { return col.slice(); }),
      status: Object.assign({}, s.status),
      lostContext: Object.assign({}, s.lostContext),
      log: s.log.slice()
    };
  }

  function artifactAt(site, x, y, stratum) {
    for (var i = 0; i < site.artifacts.length; i++) {
      var a = site.artifacts[i];
      if (a.x === x && a.y === y && a.trueStratum === stratum) return a;
    }
    return null;
  }

  // Excavate the topmost remaining layer at (x,y). You always process strata in order,
  // so a find in stratum n cannot be reached before strata 0..n-1 are removed.
  function exposeCell(state, x, y) {
    var s = cloneState(state);
    var d = s.dug[x][y];
    if (d >= s.site.depth) { s.log.push({ action: 'bedrock', x: x, y: y }); return { state: s, exposed: null, stratumIndex: null, atBedrock: true }; }
    var stratumIndex = d;
    var art = artifactAt(s.site, x, y, stratumIndex);
    s.dug[x][y] = d + 1;
    var exposedId = null;
    if (art) { s.status[art.id] = 'exposed'; exposedId = art.id; }
    s.log.push({ action: 'excavate', x: x, y: y, stratumIndex: stratumIndex, exposed: exposedId });
    return { state: s, exposed: exposedId, stratumIndex: stratumIndex, atBedrock: false };
  }

  // Record-before-remove: recording preserves context.
  function recordFind(state, id) {
    var s = cloneState(state);
    if (s.status[id] === 'exposed') { s.status[id] = 'recorded'; s.log.push({ action: 'record', id: id }); }
    return s;
  }

  // Removing a find that was not recorded first loses its context (its dating information).
  function removeFind(state, id) {
    var s = cloneState(state);
    var st = s.status[id];
    if (st === 'exposed' || st === 'recorded') {
      s.lostContext[id] = (st !== 'recorded');
      s.status[id] = 'removed';
      s.log.push({ action: 'remove', id: id, lostContext: s.lostContext[id] });
    }
    return s;
  }

  // Chronological truth: deeper stratum = older = first. (Law of superposition.)
  function trueChronOrder(site) {
    return site.artifacts.slice().sort(function (a, b) { return b.trueStratum - a.trueStratum; }).map(function (a) { return a.id; });
  }

  function proposeOrdering(state, orderedIds) {
    var truth = trueChronOrder(state.site);
    var correct = orderedIds.length === truth.length && orderedIds.every(function (id, i) { return id === truth[i]; });
    return {
      correct: correct,
      trueOrder: truth,
      explanation: correct
        ? 'Correct. By the law of superposition, deeper finds are older, so the deepest-stratum artifact is oldest.'
        : 'Not quite. Order from oldest to youngest by depth: the deepest-stratum find is the oldest (law of superposition).'
    };
  }

  function scoreSession(state) {
    var ids = state.site.artifacts.map(function (a) { return a.id; });
    var found = ids.filter(function (id) { var st = state.status[id]; return st === 'exposed' || st === 'recorded' || st === 'removed'; });
    var recorded = ids.filter(function (id) { return state.status[id] === 'recorded'; });
    var lost = ids.filter(function (id) { return state.lostContext[id]; });
    var contextPreserved = found.length > 0 && lost.length === 0;
    return {
      totalArtifacts: ids.length,
      foundCount: found.length,
      recordedCount: recorded.length,
      lostContextCount: lost.length,
      contextPreserved: contextPreserved,
      summary: found.length + ' of ' + ids.length + ' artifacts found; ' + recorded.length + ' recorded in context'
        + (lost.length ? ('; ' + lost.length + ' removed without recording (context lost)') : '') + '.'
    };
  }

  // Accessible description of a cell — the basis for the gridcell's ARIA label / SR announce.
  function describeCell(state, x, y) {
    var d = state.dug[x][y];
    var depth = state.site.depth;
    var pos = cellName(x, y);
    if (d >= depth) return 'Cell ' + pos + '. Fully excavated to sterile subsoil. No further digging.';
    var stratum = state.site.strata[d];
    var exposedHere = state.site.artifacts.filter(function (a) { return a.x === x && a.y === y && state.status[a.id] === 'exposed'; })[0];
    var base = 'Cell ' + pos + '. Dug through ' + d + ' of ' + depth + ' layers. Next layer: ' + stratum.name + ' (' + stratum.period + ').';
    if (exposedHere) base += ' Exposed find: ' + exposedHere.label + '. Record it to preserve context.';
    return base;
  }

  return {
    VERSION: VERSION,
    DEFAULT_STRATA: DEFAULT_STRATA,
    ARTIFACT_POOL: ARTIFACT_POOL,
    generateSite: generateSite,
    initState: initState,
    exposeCell: exposeCell,
    recordFind: recordFind,
    removeFind: removeFind,
    trueChronOrder: trueChronOrder,
    proposeOrdering: proposeOrdering,
    scoreSession: scoreSession,
    describeCell: describeCell,
    cellName: cellName
  };
});
