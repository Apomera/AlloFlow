import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Lane F1: the dive's reef reads as a crowded, living reef in proportion to the
// site's numbers, and as damaged reef framework when the numbers say so.
vi.setConfig({ testTimeout: 60000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const SOURCE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const TOOL = readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8');

// The pure scene-planning functions, without WebGL.
const scope = {};
new Function('window', SOURCE.replace('global.Reef3DExplore = { version:',
  'global.planTest = { createTerrain, placeBommies, benthicField, buildPlate, buildTable }; global.Reef3DExplore = { version:'))(scope);
const { createTerrain, placeBommies, benthicField, buildPlate, buildTable } = scope.planTest;
const toolWin = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
new Function('window', TOOL)(toolWin);
const X = toolWin.__RR_TEST_EXPORTS__.coralReef;
const SITES = Object.fromEntries(X.EXPLORE_SITES.map((s) => [s.id, s]));
const LIVE = 1, BLEACHED = 2, MACRO = 4, RUBBLE = 5;

function plan(site) {
  const patch = site.restoration ? Math.max(4, Math.min(9.5, Math.sqrt(site.restoration.units * 1.5 / Math.PI) + 1.4)) : 4.5;
  const terrain = createTerrain(site.seed, site.depthM, patch), bommies = placeBommies(site.seed, terrain);
  return { terrain, bommies, field: benthicField(site.seed, terrain, bommies, site.health, !!site.restoration) };
}
function shares(field) {
  const c = field.count(), out = {};
  for (const [k, v] of Object.entries(c)) if (k !== 'hard') out[k] = v / c.hard;
  return out;
}

// A WebGL-free mount, as in the repo's Reef3DExplore suite.
const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });
function mount(siteId, quality = 'high', over = {}) {
  const s = SITES[siteId];
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio() {} setSize() {} render(scene) { this.scene = scene; } dispose() {} forceContextLoss() {}
  }
  let renderer = null;
  const local = { innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} }, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, performance: { now: () => 1000 }, setTimeout: () => 1, clearTimeout() {} };
  new Function('window', SOURCE)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const site = { seed: s.seed, depthM: s.depthM, health: s.health, population: [{ id: 'brain_coral', count: 3 }, { id: 'parrotfish', count: 2 }],
    restoration: s.restoration ? { kind: s.restoration.kind, units: s.restoration.units, yearsSince: 4 } : null, ...over };
  const ctl = local.Reef3DExplore.mount(canvas, { quality, site, THREE: { ...THREE, WebGLRenderer: function () { renderer = new Renderer(); return renderer; } } });
  cleanups.push(() => { ctl.dispose(); canvas.remove(); });
  return { ctl, scene: () => renderer.scene };
}
// Every placed decorative item (not just what is drawn now), by kind.
function items(t) {
  const out = {};
  t.scene().traverse((o) => {
    if (!o.isInstancedMesh || !o.userData.decorative || o.userData.lod !== 'near' || !o.userData.items) return;
    const { matrices, colors } = o.userData.items, list = (out[o.userData.kind] = []);
    for (let i = 0; i < colors.length / 3; i++) list.push({ m: Array.from(matrices.subarray(i * 16, i * 16 + 16)), c: [colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]] });
  });
  return out;
}
const HARD = ['finger', 'antler', 'corym', 'table', 'massive', 'brain', 'plate', 'encrust'];
const white = (c) => Math.min(...c) > 0.84;
// Living pigments are saturated; dead skeletons under a turf film are greys.
const grey = (c) => !white(c) && (Math.max(...c) - Math.min(...c)) / Math.max(...c) < 0.45;
function coralTally(it) {
  let live = 0, bleached = 0, dead = 0;
  HARD.forEach((k) => (it[k] || []).forEach((e) => { if (white(e.c)) bleached++; else if (grey(e.c)) dead++; else live++; }));
  return { live, bleached, dead };
}

describe('Lane F1 benthic cover follows the site numbers', () => {
  it('gives each dive site the live, bleached and seaweed shares its survey would record', () => {
    for (const id of ['healthy', 'restoration', 'heatwave', 'damaged']) {
      const s = SITES[id], f = shares(plan(s).field), coral = (f[LIVE] || 0) + (f[BLEACHED] || 0);
      expect(coral, id + ' coral share of hard bottom').toBeCloseTo(Math.min(0.9, s.health.coralCover / 0.85), 1);
      expect((f[BLEACHED] || 0) / coral, id + ' bleached share of coral').toBeCloseTo(s.health.bleaching, 1);
      expect(f[MACRO] || 0, id + ' seaweed share').toBeCloseTo(s.health.algae / 0.85, 1);
    }
  });

  it('raises living cover with coral cover and turns a broken reef to seaweed and rubble', () => {
    const base = SITES.healthy, live = [];
    for (const cover of [0.1, 0.3, 0.55, 0.8]) live.push(shares(plan({ ...base, health: { coralCover: cover, bleaching: 0, algae: 0.05 } }).field)[LIVE] || 0);
    for (let i = 1; i < live.length; i++) expect(live[i], 'live share rises with cover').toBeGreaterThan(live[i - 1] + 0.1);
    const healthy = shares(plan(SITES.healthy).field), damaged = shares(plan(SITES.damaged).field);
    expect(damaged[MACRO]).toBeGreaterThan(healthy[MACRO] * 5);
    expect(damaged[RUBBLE]).toBeGreaterThan(healthy[RUBBLE] * 3);
    expect(damaged[LIVE]).toBeLessThan(healthy[LIVE] * 0.3);
  });

  it('builds a patch reef: coral heads crowd the reef and sand stays a minority of the bottom', () => {
    for (const id of ['healthy', 'heatwave', 'damaged']) {
      const { terrain, bommies } = plan(SITES[id]);
      let sand = 0, n = 0;
      for (let z = -26; z <= 26; z += 1) for (let x = -26; x <= 26; x += 1) { n++; if (terrain.sandMask(x, z) > 0.5) sand++; }
      expect(sand / n, id + ' sand share').toBeLessThan(0.32);
      expect(bommies.length, id + ' coral heads').toBeGreaterThan(60);
      const sp = terrain.spawn, near = bommies.filter((b) => Math.hypot(b.x - sp.x, b.z - sp.z) < 9 && b.r > 1.3);
      expect(near.length, id + ' coral heads in view of the start').toBeGreaterThan(1);
    }
  });
});

describe('Lane F1 decor shows the reef state', () => {
  it('crowds a healthy reef with many growth forms, bleaches a heatwave reef and breaks a damaged one', () => {
    const healthy = items(mount('healthy')), heat = items(mount('heatwave')), damaged = items(mount('damaged'));
    const h = coralTally(healthy), w = coralTally(heat), d = coralTally(damaged);
    // Many forms, each well represented on a healthy reef.
    HARD.forEach((k) => expect((healthy[k] || []).length, 'healthy ' + k).toBeGreaterThan(40));
    expect(h.live).toBeGreaterThan(1800);
    expect(h.bleached).toBe(0);
    // Most heatwave colonies are stark white (the site's bleaching is 0.6).
    const share = w.bleached / (w.live + w.bleached);
    expect(share).toBeGreaterThan(0.45); expect(share).toBeLessThan(0.75);
    // A damaged reef: few survivors, seaweed beds, rubble and dead stands.
    expect(d.live).toBeLessThan(h.live * 0.3);
    expect((damaged.algae || []).length).toBeGreaterThan(((healthy.algae || []).length) * 3);
    expect((damaged.rubble || []).length).toBeGreaterThan(((healthy.rubble || []).length) * 2);
    expect((damaged.deadstand || []).length).toBeGreaterThan(((healthy.deadstand || []).length) * 3);
  });

  it('only thins the decor on the light tier: every low-tier item sits exactly where it does on high', () => {
    const hi = items(mount('healthy', 'high')), lo = items(mount('healthy', 'low'));
    let total = 0, kept = 0;
    for (const [kind, list] of Object.entries(lo)) {
      const keys = new Set((hi[kind] || []).map((e) => e.m.map((v) => v.toFixed(4)).join(',')));
      list.forEach((e) => { expect(keys.has(e.m.map((v) => v.toFixed(4)).join(',')), kind + ' item moved on the low tier').toBe(true); });
      kept += list.length;
    }
    Object.values(hi).forEach((l) => { total += l.length; });
    expect(kept).toBeLessThan(total * 0.85);
    expect(kept).toBeGreaterThan(total * 0.5);
  });
});

describe('Lane F1 coral forms', () => {
  function rimSpread(geometry) {
    const p = geometry.attributes.position, byAngle = new Map();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), a = Math.round(Math.atan2(z, x) * 20), r = Math.hypot(x, z);
      if (r > (byAngle.get(a) || 0)) byAngle.set(a, r);
    }
    const rs = [...byAngle.values()], mean = rs.reduce((s, v) => s + v, 0) / rs.length;
    return Math.sqrt(rs.reduce((s, v) => s + (v - mean) * (v - mean), 0) / rs.length) / mean;
  }
  it('grows lobed, notched plates and fringed tables, not discs', () => {
    // No shelf margin is a circle: around each shelf centre, no more than a
    // few vertices share one distance (a disc puts a whole ring on one).
    const plate = buildPlate(THREE, 0.45, 0.4, 5, true), pp = plate.attributes.position;
    for (const [ox, oz] of [[0.24, 0.09], [-0.04, -0.015], [-0.23, -0.13]]) {
      const seen = new Map();
      for (let i = 0; i < pp.count; i++) { const d = Math.hypot(pp.getX(i) - ox * 0.45, pp.getZ(i) - oz * 0.45); if (d > 0.05) seen.set(d.toFixed(4), (seen.get(d.toFixed(4)) || 0) + 1); }
      expect(Math.max(...seen.values()), 'shelf at ' + ox).toBeLessThan(20);
    }
    const table = buildTable(THREE, 0.5, 0.5, 3, true), p = table.attributes.position;
    expect(rimSpread(table)).toBeGreaterThan(0.06);
    // Upturned branchlet tips rise above the table's deck.
    let above = 0;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.5 * 0.56 + 0.07 && Math.hypot(p.getX(i), p.getZ(i)) > 0.35) above++;
    expect(above).toBeGreaterThan(60);
  });
});
