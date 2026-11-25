// archaeology_engine.js — PURE logic for the Voxel Archaeology STEM tool.
// No DOM, no React, no globals, no Math.random at call time (seeded). This is the
// testable core per VOXEL_ARCHAEOLOGY_ARCHITECTURE.md: the React view and visual
// layer (stem_tool_archaeology.js) will consume it; tests exercise it headless.
//
// Dual export: under Node/test `module.exports`; in the browser `window.AlloArchaeology`.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api; // Node / test require
  if (typeof globalThis !== 'undefined' && globalThis) globalThis.AlloArchaeology = api; // new Function() loader + browser
  else if (root) root.AlloArchaeology = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = '0.1.0';
  var MAX_GRID_DIM = 26;
  var OWN = Object.prototype.hasOwnProperty;
  function isSafeId(id) {
    return typeof id === 'string' && id.length > 0 && id !== '__proto__' && id !== 'constructor' && id !== 'prototype';
  }
  function clampDim(val, fallback) {
    var n = Number(val);
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(MAX_GRID_DIM, Math.floor(n));
  }

  // 0 = surface (youngest), last = deepest (oldest). Sterile subsoil holds no artifacts.
  var DEFAULT_STRATA = Object.freeze([
    Object.freeze({ index: 0, name: 'Topsoil',           material: 'loam',             period: 'modern',         pattern: 'dots' }),
    Object.freeze({ index: 1, name: 'Plough soil',       material: 'mixed earth',      period: '1700s-1800s',    pattern: 'lines' }),
    Object.freeze({ index: 2, name: 'Destruction layer', material: 'ash and rubble',   period: 'medieval fire',  pattern: 'cross' }),
    Object.freeze({ index: 3, name: 'Occupation floor',  material: 'packed clay',      period: 'medieval',       pattern: 'grid' }),
    Object.freeze({ index: 4, name: 'Early foundation',  material: 'stone and mortar', period: 'early medieval', pattern: 'brick' }),
    Object.freeze({ index: 5, name: 'Sterile subsoil',   material: 'natural gravel',   period: 'pre-human',      pattern: 'none' })
  ]);

  var ARTIFACT_POOL = Object.freeze([
    Object.freeze({ type: 'coin',    label: 'bronze coin',   description: 'A worn bronze coin.' }),
    Object.freeze({ type: 'pottery', label: 'pottery sherd', description: 'A fragment of glazed pottery.', fragile: true }),
    Object.freeze({ type: 'nail',    label: 'iron nail',     description: 'A hand-forged iron nail.' }),
    Object.freeze({ type: 'bone',    label: 'bone tool',     description: 'A worked animal-bone tool.' }),
    Object.freeze({ type: 'bead',    label: 'glass bead',    description: 'A small blue glass bead.', fragile: true }),
    Object.freeze({ type: 'tile',    label: 'roof tile',     description: 'A fragment of fired roof tile.' })
  ]);

  // Deterministic PRNG (mulberry32) so a seed always yields the same site.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function colLabel(x) {
    if (typeof x !== 'number' || !Number.isFinite(x) || !Number.isInteger(x) || x < 0 || x >= 26) return '?';
    return String.fromCharCode(65 + x);
  } // 0 -> A
  function cellName(x, y) {
    var col = colLabel(x);
    var row = (typeof y === 'number' && Number.isFinite(y) && Number.isInteger(y) && y >= 0) ? (y + 1) : '?';
    return col + row;
  }    // (0,0) -> A1

  // Build a deterministic dig site. Artifacts land in distinct cells, one per stratum
  // in `artifactStrata` (default 1..4), so finds have a unique chronological order.
  function generateSite(seed, opts) {
    opts = (opts && typeof opts === 'object') ? opts : {};
    var cols = clampDim(opts.cols, 6);
    var rows = clampDim(opts.rows, 6);
    var rawStrata = (Array.isArray(opts.strata) && opts.strata.length > 0) ? opts.strata : DEFAULT_STRATA;
    var strata = rawStrata.map(function (st, idx) {
      if (st && typeof st === 'object') return Object.freeze(Object.assign({}, st));
      return Object.freeze({ index: idx, name: 'Layer ' + idx, material: 'soil', period: 'unknown', pattern: 'none' });
    });
    var rawArtifactStrata = Array.isArray(opts.artifactStrata) ? opts.artifactStrata : [1, 2, 3, 4];
    var maxArtifacts = cols * rows;
    var artifactStrata = rawArtifactStrata.filter(function (s) {
      return typeof s === 'number' && Number.isInteger(s) && s >= 0 && s < strata.length;
    }).slice(0, maxArtifacts);
    var rnd = mulberry32((seed >>> 0) || 1);
    var used = Object.create(null);
    var maxAttempts = Math.max(64, maxArtifacts * 8);
    var artifacts = artifactStrata.map(function (stratumIndex, i) {
      var x = 0, y = 0, key = '', placed = false;
      for (var tries = 0; tries < maxAttempts; tries++) {
        x = Math.floor(rnd() * cols);
        y = Math.floor(rnd() * rows);
        key = x + ',' + y;
        if (!used[key]) { placed = true; break; }
      }
      if (!placed) {
        for (var fx = 0; fx < cols && !placed; fx++) {
          for (var fy = 0; fy < rows && !placed; fy++) {
            var fkey = fx + ',' + fy;
            if (!used[fkey]) { x = fx; y = fy; key = fkey; placed = true; }
          }
        }
      }
      used[key] = true;
      var t = ARTIFACT_POOL[Math.floor(rnd() * ARTIFACT_POOL.length)];
      return { id: 'a' + (i + 1), type: t.type, label: t.label, description: t.description, trueStratum: stratumIndex, x: x, y: y, fragile: !!t.fragile };
    });
    return { cols: cols, rows: rows, depth: strata.length, strata: strata, artifacts: artifacts, seed: (seed >>> 0) || 1 };
  }

  function safeMap(src) {
    var out = Object.create(null);
    if (!src || typeof src !== 'object') return out;
    var keys = Object.keys(src);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (isSafeId(k)) out[k] = src[k];
    }
    return out;
  }

  function initState(site) {
    var safeSite = (site && typeof site === 'object') ? site : generateSite(1);
    var cols = clampDim(safeSite.cols, 6);
    var rows = clampDim(safeSite.rows, 6);
    var dug = [];
    for (var x = 0; x < cols; x++) { dug[x] = []; for (var y = 0; y < rows; y++) dug[x][y] = 0; }
    var status = Object.create(null), lost = Object.create(null);
    var arts = Array.isArray(safeSite.artifacts) ? safeSite.artifacts : [];
    arts.forEach(function (a) {
      if (a && isSafeId(a.id)) { status[a.id] = 'buried'; lost[a.id] = false; }
    });
    return { site: safeSite, cursor: { x: 0, y: 0 }, dug: dug, status: status, lostContext: lost, log: [] };
  }

  function cloneState(s) {
    if (!s || typeof s !== 'object' || !s.site || !Array.isArray(s.dug)) return initState(null);
    return {
      site: s.site,
      cursor: { x: (s.cursor && Number.isInteger(s.cursor.x)) ? s.cursor.x : 0, y: (s.cursor && Number.isInteger(s.cursor.y)) ? s.cursor.y : 0 },
      dug: s.dug.map(function (col) { return Array.isArray(col) ? col.slice() : []; }),
      status: safeMap(s.status),
      lostContext: safeMap(s.lostContext),
      log: Array.isArray(s.log) ? s.log.slice() : []
    };
  }

  function validCoord(s, x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0
      && Array.isArray(s.dug) && x < s.dug.length
      && Array.isArray(s.dug[x]) && y < s.dug[x].length;
  }

  function artifactAt(site, x, y, stratum) {
    var arts = (site && Array.isArray(site.artifacts)) ? site.artifacts : [];
    for (var i = 0; i < arts.length; i++) {
      var a = arts[i];
      if (a && a.x === x && a.y === y && a.trueStratum === stratum) return a;
    }
    return null;
  }

  // Excavate the topmost remaining layer at (x,y). You always process strata in order,
  // so a find in stratum n cannot be reached before strata 0..n-1 are removed.
  function exposeCell(state, x, y) {
    var s = cloneState(state);
    if (!validCoord(s, x, y)) return { state: s, exposed: null, stratumIndex: null, atBedrock: false };
    var d = Number.isInteger(s.dug[x][y]) && s.dug[x][y] >= 0 ? s.dug[x][y] : 0;
    var depth = (s.site && Number.isInteger(s.site.depth) && s.site.depth >= 0) ? s.site.depth : 0;
    if (d >= depth) { s.log.push({ action: 'bedrock', x: x, y: y }); return { state: s, exposed: null, stratumIndex: null, atBedrock: true }; }
    var stratumIndex = d;
    var art = artifactAt(s.site, x, y, stratumIndex);
    s.dug[x][y] = d + 1;
    var exposedId = null;
    if (art && isSafeId(art.id)) { s.status[art.id] = 'exposed'; exposedId = art.id; }
    s.log.push({ action: 'excavate', x: x, y: y, stratumIndex: stratumIndex, exposed: exposedId });
    return { state: s, exposed: exposedId, stratumIndex: stratumIndex, atBedrock: false };
  }

  // Record-before-remove: recording preserves context.
  function recordFind(state, id) {
    var s = cloneState(state);
    if (isSafeId(id) && OWN.call(s.status, id) && s.status[id] === 'exposed') {
      s.status[id] = 'recorded';
      s.log.push({ action: 'record', id: id });
    }
    return s;
  }

  // Removing a find that was not recorded first loses its context (its dating information).
  function removeFind(state, id) {
    var s = cloneState(state);
    var st = (isSafeId(id) && OWN.call(s.status, id)) ? s.status[id] : null;
    if (st === 'exposed' || st === 'recorded') {
      s.lostContext[id] = (st !== 'recorded');
      s.status[id] = 'removed';
      s.log.push({ action: 'remove', id: id, lostContext: s.lostContext[id] });
    }
    return s;
  }

  // Chronological truth: deeper stratum = older = first. (Law of superposition.)
  function trueChronOrder(site) {
    var arts = (site && Array.isArray(site.artifacts)) ? site.artifacts : [];
    return arts.filter(function (a) { return a && typeof a === 'object'; })
      .slice()
      .sort(function (a, b) { return (Number(b.trueStratum) || 0) - (Number(a.trueStratum) || 0); })
      .map(function (a) { return a.id; });
  }

  function proposeOrdering(state, orderedIds) {
    var truth = trueChronOrder(state && state.site);
    var proposed = Array.isArray(orderedIds) ? orderedIds : [];
    var correct = proposed.length === truth.length && proposed.every(function (id, i) { return id === truth[i]; });
    return {
      correct: correct,
      trueOrder: truth,
      explanation: correct
        ? 'Correct. By the law of superposition, deeper finds are older, so the deepest-stratum artifact is oldest.'
        : 'Not quite. Order from oldest to youngest by depth: the deepest-stratum find is the oldest (law of superposition).'
    };
  }

  function scoreSession(state) {
    var arts = (state && state.site && Array.isArray(state.site.artifacts)) ? state.site.artifacts : [];
    var statusMap = (state && state.status && typeof state.status === 'object') ? state.status : Object.create(null);
    var lostMap = (state && state.lostContext && typeof state.lostContext === 'object') ? state.lostContext : Object.create(null);
    var ids = arts.filter(function (a) { return a && isSafeId(a.id); }).map(function (a) { return a.id; });
    var found = ids.filter(function (id) { var st = OWN.call(statusMap, id) ? statusMap[id] : null; return st === 'exposed' || st === 'recorded' || st === 'removed'; });
    var recorded = ids.filter(function (id) { return OWN.call(statusMap, id) && statusMap[id] === 'recorded'; });
    var lost = ids.filter(function (id) { return OWN.call(lostMap, id) && !!lostMap[id]; });
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
    if (!state || typeof state !== 'object' || !state.site || !validCoord(state, x, y)) return '';
    var d = Number.isInteger(state.dug[x][y]) && state.dug[x][y] >= 0 ? state.dug[x][y] : 0;
    var depth = Number.isInteger(state.site.depth) && state.site.depth >= 0 ? state.site.depth : 0;
    var pos = cellName(x, y);
    var statusMap = (state.status && typeof state.status === 'object') ? state.status : Object.create(null);
    var arts = Array.isArray(state.site.artifacts) ? state.site.artifacts : [];
    var exposedHere = arts.filter(function (a) {
      return a && a.x === x && a.y === y && isSafeId(a.id) && OWN.call(statusMap, a.id) && statusMap[a.id] === 'exposed';
    })[0];
    if (d >= depth) {
      var done = 'Cell ' + pos + '. Fully excavated to sterile subsoil. No further digging.';
      if (exposedHere) done += ' Exposed find: ' + exposedHere.label + '. Record it to preserve context.';
      return done;
    }
    var stratum = Array.isArray(state.site.strata) ? state.site.strata[d] : null;
    var sName = (stratum && stratum.name) ? stratum.name : ('Layer ' + d);
    var sPeriod = (stratum && stratum.period) ? stratum.period : 'unknown';
    var base = 'Cell ' + pos + '. Dug through ' + d + ' of ' + depth + ' layers. Next layer: ' + sName + ' (' + sPeriod + ').';
    if (exposedHere) base += ' Exposed find: ' + exposedHere.label + '. Record it to preserve context.';
    return base;
  }

  return Object.freeze({
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
  });
});
