/**
 * AlloFlow Landmark — giant primitive-built structures for the 3D worlds (landmark/1)
 *
 * Tier of docs/allohaven_cozy_world_design.md §4.7: "the world itself could be
 * partially constructed of very large 3D versions of these designs." A landmark
 * is a hand-authored Prim3D recipe (same box/sphere/cylinder/cone/torus format)
 * that renders at BUILDING scale — one per room/space, earned or curated, never
 * spammed. Giant low-poly primitives are also the cheapest possible skyline
 * (a few hundred triangles a piece).
 *
 * PURE, testable: listLandmarks / getLandmark / pickLandmark. buildLandmark()
 * delegates to Prim3D.buildObject at a large unit scale (needs a THREE instance
 * + the Prim3D module; degrades to null if either is absent).
 *
 * RUNTIME: plain JS, no imports; registers window.AlloModules.Landmark.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.Landmark) {
    console.log('[Landmark] Already loaded, skipping');
    return;
  }

  var VERSION = 'landmark/1';
  var DEFAULT_UNIT = 150;   // recipe ~1.9 tall × 150 ≈ 290 world units — grand, still under WALL_H

  // Each landmark is a valid Prim3D recipe: parts stand on y=0, ~1 unit footprint,
  // ~1.9 tall. Rendered at DEFAULT_UNIT they tower over a room without clipping walls.
  var LANDMARKS = {
    tower: { name: 'Watchtower', parts: [
      { shape: 'cylinder', size: [0.55, 0.3], position: [0, 0.15, 0], color: '#64748b' },
      { shape: 'cylinder', size: [0.42, 0.95], position: [0, 0.78, 0], color: '#94a3b8' },
      { shape: 'cylinder', size: [0.5, 0.16], position: [0, 1.3, 0], color: '#64748b' },
      { shape: 'cone', size: [0.55, 0.5], position: [0, 1.62, 0], color: '#6366f1' },
      { shape: 'sphere', size: [0.09], position: [0, 1.95, 0], color: '#f59e0b' }
    ] },
    arch: { name: 'Grand Arch', parts: [
      { shape: 'box', size: [0.26, 1.05, 0.32], position: [-0.55, 0.52, 0], color: '#cbd5e1' },
      { shape: 'box', size: [0.26, 1.05, 0.32], position: [0.55, 0.52, 0], color: '#cbd5e1' },
      { shape: 'box', size: [1.55, 0.3, 0.36], position: [0, 1.2, 0], color: '#94a3b8' },
      { shape: 'box', size: [1.75, 0.16, 0.42], position: [0, 1.42, 0], color: '#64748b' }
    ] },
    obelisk: { name: 'Obelisk', parts: [
      { shape: 'box', size: [0.55, 0.22, 0.55], position: [0, 0.11, 0], color: '#475569' },
      { shape: 'box', size: [0.3, 1.5, 0.3], position: [0, 0.97, 0], color: '#e2e8f0' },
      { shape: 'cone', size: [0.22, 0.28], position: [0, 1.85, 0], color: '#f59e0b' }
    ] },
    tree: { name: 'Great Tree', parts: [
      { shape: 'cylinder', size: [0.2, 1.0], position: [0, 0.5, 0], color: '#92400e' },
      { shape: 'sphere', size: [0.55], position: [0, 1.2, 0], color: '#16a34a' },
      { shape: 'sphere', size: [0.4], position: [-0.32, 1.02, 0.1], color: '#22c55e' },
      { shape: 'sphere', size: [0.4], position: [0.34, 1.06, -0.1], color: '#15803d' }
    ] },
    beacon: { name: 'Beacon', parts: [
      { shape: 'cylinder', size: [0.46, 0.26], position: [0, 0.13, 0], color: '#e2e8f0' },
      { shape: 'cylinder', size: [0.3, 1.05], position: [0, 0.8, 0], color: '#f8fafc' },
      { shape: 'cylinder', size: [0.33, 0.2], position: [0, 0.85, 0], color: '#ef4444' },
      { shape: 'cylinder', size: [0.35, 0.24], position: [0, 1.42, 0], color: '#334155' },
      { shape: 'sphere', size: [0.19], position: [0, 1.58, 0], color: '#fde047' }
    ] },
    gate: { name: 'Portal Gate', parts: [
      { shape: 'box', size: [0.2, 1.05, 0.2], position: [-0.6, 0.52, 0], color: '#b91c1c' },
      { shape: 'box', size: [0.2, 1.05, 0.2], position: [0.6, 0.52, 0], color: '#b91c1c' },
      { shape: 'box', size: [1.75, 0.2, 0.24], position: [0, 1.12, 0], color: '#7f1d1d' },
      { shape: 'box', size: [1.45, 0.15, 0.22], position: [0, 0.86, 0], color: '#991b1b' }
    ] },
    crystal: { name: 'Knowledge Crystal', parts: [
      { shape: 'cone', size: [0.36, 0.62], position: [0, 0.46, 0], rotation: [180, 0, 0], color: '#22d3ee' },
      { shape: 'cone', size: [0.36, 0.72], position: [0, 1.12, 0], color: '#06b6d4' },
      { shape: 'torus', size: [0.52, 0.05], position: [0, 0.78, 0], rotation: [90, 0, 0], color: '#a5f3fc' }
    ] },
    fountain: { name: 'Fountain', parts: [
      { shape: 'cylinder', size: [0.8, 0.18], position: [0, 0.09, 0], color: '#93c5fd' },
      { shape: 'torus', size: [0.78, 0.09], position: [0, 0.2, 0], rotation: [90, 0, 0], color: '#cbd5e1' },
      { shape: 'cylinder', size: [0.16, 0.7], position: [0, 0.45, 0], color: '#e2e8f0' },
      { shape: 'sphere', size: [0.26], position: [0, 0.95, 0], color: '#60a5fa' }
    ] }
  };

  var KEYS = Object.keys(LANDMARKS);

  function isNum(v) { return typeof v === 'number' && !isNaN(v); }

  function listLandmarks() {
    return KEYS.map(function (k) { return { key: k, name: LANDMARKS[k].name }; });
  }

  // Deep-ish clone so a caller can't mutate the shared catalog.
  function getLandmark(key) {
    var l = LANDMARKS[key];
    if (!l) return null;
    return {
      name: l.name,
      parts: l.parts.map(function (p) { return Object.assign({}, p, { size: p.size.slice(), position: p.position.slice(), rotation: (p.rotation || [0, 0, 0]).slice() }); })
    };
  }

  // Deterministic pick from a seed (string or number) — a room's "signature"
  // landmark stays stable across sessions without any stored state.
  function _hash(seed) {
    var s = String(seed == null ? '' : seed), h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }
  function pickLandmark(seed) {
    if (!KEYS.length) return null;
    return KEYS[_hash(seed) % KEYS.length];
  }

  // Convenience: key → giant THREE.Group via Prim3D (null if Prim3D absent).
  function buildLandmark(THREE, key, opts) {
    opts = opts || {};
    var P3D = window.AlloModules && window.AlloModules.Prim3D;
    var recipe = getLandmark(key);
    if (!THREE || !P3D || !recipe) return null;
    return P3D.buildObject(THREE, recipe, { unit: isNum(opts.unit) ? opts.unit : DEFAULT_UNIT });
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.Landmark = {
    version: VERSION,
    DEFAULT_UNIT: DEFAULT_UNIT,
    listLandmarks: listLandmarks,
    getLandmark: getLandmark,
    pickLandmark: pickLandmark,
    buildLandmark: buildLandmark
  };
  console.log('[Landmark] Registered (landmark/1 — ' + KEYS.length + ' giant primitive structures)');
})();
