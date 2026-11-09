import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Round 18 dive check (lane dive): newer corals on the tool's real dive sites, measured against
// the surfaces the dive actually draws (the floor grid and the rock mesh), at both tiers.
// Orange cup coral lives on shaded rock; it was placed on the shaded flank of a coral head even
// where that flank lies under the drawn sand, which buried it (1.4 m deep on the damaged reef).
// Birdsnest coral was placed on a coral head's outer rim, where the rim dips into the sand, so
// about half the colony sank into the floor. Both now use the exposed-rock zones the filter
// feeders use (shadedShoulder, rockShoulder), and the birdsnest is matched to the drawn rock face.
vi.setConfig({ testTimeout: 120000 });
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const DIR = path.dirname(path.resolve(process.cwd(), TOOL));
const T = createRequire(import.meta.url)(path.resolve(process.cwd(), 'vendor/three-r128/three.min.js'));
const EXPLORE = readFileSync(path.join(DIR, 'reef_3d_explore.js'), 'utf8');
const SPECIES = readFileSync(path.join(DIR, 'reef_3d_species.js'), 'utf8');
const instrumented = EXPLORE.replace('canvas._reef3dExplore = controller;',
  'global.reefTest = { organisms: organisms, floorMesh: floorMesh, bommieMesh: bommieMesh }; canvas._reef3dExplore = controller;');

function toolX() {
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  new Function('window', readFileSync(path.resolve(process.cwd(), TOOL), 'utf8'))(win);
  return win.__RR_TEST_EXPORTS__.coralReef;
}
const X = toolX();
const open = [];
afterEach(() => { while (open.length) open.pop()(); });
function dive(siteId, quality) {
  const s = X.EXPLORE_SITES.find((e) => e.id === siteId);
  const site = { seed: s.seed, depthM: s.depthM, health: s.health, population: X.populationFor(s), restoration: s.restoration ? { kind: s.restoration.kind, units: s.restoration.units, yearsSince: 4 } : null };
  let clock = 1000, serial = 0; const frames = new Map();
  class Renderer { constructor() { this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; } setPixelRatio() {} setSize() {} render() {} dispose() {} forceContextLoss() {} }
  const local = { innerWidth: 1280, console: { warn() {}, error() {} }, performance: { now: () => clock },
    requestAnimationFrame(fn) { frames.set(++serial, fn); return serial; }, cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener() {}, removeEventListener() {}, setTimeout() { return 0; }, clearTimeout() {} };
  new Function('window', instrumented)(local); new Function('window', SPECIES)(local);
  const canvas = document.createElement('canvas'); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 }); document.body.appendChild(canvas);
  const errors = [];
  const controller = local.Reef3DExplore.mount(canvas, { THREE: { ...T, WebGLRenderer: Renderer }, quality, reducedMotion: true, onError: (e) => errors.push(String(e)), site });
  open.push(() => { controller.dispose(); canvas.remove(); });
  clock += 50; [...frames.values()].forEach((fn) => fn(clock));
  const kit = local.reefTest, ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
  kit.floorMesh.updateMatrixWorld(true); kit.bommieMesh.updateMatrixWorld(true);
  const hit = (mesh, x, z) => { ray.set(new T.Vector3(x, 2, z), down); const h = ray.intersectObject(mesh, false)[0]; return h ? h.point.y : -Infinity; };
  const top = (x, z) => Math.max(hit(kit.floorMesh, x, z), hit(kit.bommieMesh, x, z));
  return { kit, errors, hit, top, find: (id) => kit.organisms.filter((o) => o.speciesId === id) };
}
// The organism's drawn points in the world (instanced members through their own matrix).
function points(o, limit = 600) {
  const out = [], v = new T.Vector3(), im = new T.Matrix4(), M = new T.Matrix4(), root = o.instanced ? o.model.root : o.root;
  root.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(root.matrixWorld).invert(), meshes = [];
  root.traverse((m) => { if (m.isMesh && m.geometry && m.geometry.attributes.position) meshes.push(m); });
  let total = 0; meshes.forEach((m) => { total += m.geometry.attributes.position.count * (m.isInstancedMesh ? m.count : 1); });
  const stride = Math.max(1, Math.floor(total / limit)); let n = 0;
  meshes.forEach((m) => {
    const pos = m.geometry.attributes.position;
    for (let r = 0; r < (m.isInstancedMesh ? m.count : 1); r++) {
      M.copy(m.matrixWorld); if (m.isInstancedMesh) { m.getMatrixAt(r, im); M.multiply(im); }
      if (o.instanced) M.premultiply(inv).premultiply(o.matrix);
      for (let i = 0; i < pos.count; i++) if (!(n++ % stride)) out.push(v.fromBufferAttribute(pos, i).applyMatrix4(M).clone());
    }
  });
  return out;
}
const buried = (t, o) => { const p = points(o); return p.filter((q) => t.top(q.x, q.z) - q.y > 0.004).length / p.length; };

describe.each(['low', 'high'])('round 16 corals on the real dive sites at %s detail', (quality) => {
  it('seats every orange cup coral on rock that rises clear of the drawn sand', () => {
    let seen = 0;
    for (const siteId of ['healthy', 'restoration', 'heatwave', 'damaged']) {
      const t = dive(siteId, quality);
      for (const o of t.find('orange_cup_coral')) {
        seen++;
        const rock = t.hit(t.kit.bommieMesh, o.home.x, o.home.z), sand = t.hit(t.kit.floorMesh, o.home.x, o.home.z);
        expect(rock - sand, siteId + ' ' + o.uid + ': rock above the sand where the cups sit').toBeGreaterThan(0.1);
        expect(Math.abs(o.ground - rock), siteId + ' ' + o.uid + ': base on the drawn rock face').toBeLessThan(0.02);
        expect(buried(t, o), siteId + ' ' + o.uid + ': cups not under sand or rock').toBeLessThan(0.1);
      }
      expect(t.errors).toEqual([]);
    }
    expect(seen, 'orange cup corals found on the four sites').toBeGreaterThan(4);
  });

  it('keeps each birdsnest coral on exposed rock with its branches above the floor', () => {
    let seen = 0;
    for (const siteId of ['healthy', 'restoration', 'heatwave']) {
      const t = dive(siteId, quality);
      for (const o of t.find('birdsnest_coral')) {
        seen++;
        const rock = t.hit(t.kit.bommieMesh, o.home.x, o.home.z), sand = t.hit(t.kit.floorMesh, o.home.x, o.home.z);
        expect(rock - sand, siteId + ' ' + o.uid + ': on rock, not on the sand at its foot').toBeGreaterThan(0.1);
        expect(buried(t, o), siteId + ' ' + o.uid + ': share of the colony under sand or rock').toBeLessThan(0.15);
      }
      expect(t.errors).toEqual([]);
    }
    expect(seen).toBeGreaterThan(1);
  });

  // The finger coral's upright fingers rise straight from the bottom. Seated on the smooth
  // placement surface, the coarse low-detail floor covered up to half of each colony, so only
  // loose finger tips showed. It now sits on the floor face that is drawn under it.
  // The same burial took most of the low galaxy coral dome on the heatwave reef (63 per cent of
  // the colony under the drawn floor) and up to a quarter of the hammer coral.
  it('stands every finger, galaxy and hammer coral on the drawn bottom with the colony showing', () => {
    let seen = 0;
    for (const siteId of ['healthy', 'restoration', 'heatwave']) {
      const t = dive(siteId, quality);
      for (const o of ['finger_coral', 'galaxy_coral', 'hammer_coral'].flatMap((id) => t.find(id))) {
        seen++;
        const tag = siteId + ' ' + o.speciesId + ' ' + o.uid;
        expect(Math.abs(o.ground - t.top(o.home.x, o.home.z)), tag + ': base on the drawn bottom').toBeLessThan(0.01);
        expect(buried(t, o), tag + ': share of the colony under the floor').toBeLessThan(0.15);
      }
      expect(t.errors).toEqual([]);
    }
    expect(seen).toBeGreaterThan(8);
  });

  // Bedford's flatworm lives among rocks and crevices. Placed anywhere on the reef it landed on
  // the open floor (heatwave reef) or on a near-vertical rock wall (78 degrees on the restoration
  // site), where a diver looking down sees only its edge. It now rests on an exposed rock shoulder.
  it("rests every Bedford's flatworm flat on exposed rock that a diver can see from above", () => {
    let seen = 0;
    for (const siteId of ['healthy', 'restoration', 'heatwave']) {
      const t = dive(siteId, quality);
      for (const o of t.find('bedfords_flatworm')) {
        seen++;
        const tag = siteId + ' ' + o.uid, rock = t.hit(t.kit.bommieMesh, o.home.x, o.home.z), sand = t.hit(t.kit.floorMesh, o.home.x, o.home.z);
        expect(rock - sand, tag + ': on rock above the floor').toBeGreaterThan(0.1);
        expect(Math.abs(o.ground - rock), tag + ': on the drawn rock face').toBeLessThan(0.005);
        const up = new T.Vector3(0, 1, 0).applyQuaternion(o.root.quaternion);
        expect(Math.acos(up.y) * 180 / Math.PI, tag + ': tilt of its resting face, degrees').toBeLessThan(60);
        expect(buried(t, o), tag + ': body inside the rock').toBeLessThan(0.05);
      }
      expect(t.errors).toEqual([]);
    }
    expect(seen).toBeGreaterThan(1);
  });
});
