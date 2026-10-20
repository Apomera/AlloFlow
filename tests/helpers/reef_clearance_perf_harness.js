// Diver-clearance and time-slicing helpers: the repo's dive harness (stub renderer, stub species, fake clock), plus an exact
// height index of the DRAWN rock (floor + bommie meshes) and the diver rig's body points.
// REEF3D_EXPLORE_SOURCE points the harness at a lane copy or a mutation scratch copy.
export { THREE, SOURCE, runtime, census, cleanup, site, POP } from './reef_dive_harness.js';
import { THREE } from './reef_dive_harness.js';

// Height of the drawn reef (floor and bommie meshes) at (x, z): every triangle bucketed by its
// XZ box into 0.5 m cells, so a query tests only a handful of triangles. Exact for the meshes.
export function rockIndex(t) {
  const CELL = 0.5, cells = new Map(), tris = [];
  const add = (mesh) => {
    mesh.updateMatrixWorld(true);
    const g = mesh.geometry, pos = g.attributes.position, idx = g.index, m = new THREE.Matrix4().copy(mesh.matrixWorld);
    if (mesh.isInstancedMesh) { const im = new THREE.Matrix4(); mesh.getMatrixAt(0, im); m.multiply(im); }
    const v = new THREE.Vector3(), P = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z; }
    const n = idx ? idx.count : pos.count;
    for (let k = 0; k < n; k += 3) {
      const a = idx ? idx.getX(k) : k, b = idx ? idx.getX(k + 1) : k + 1, c = idx ? idx.getX(k + 2) : k + 2;
      const tri = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2], P[b * 3], P[b * 3 + 1], P[b * 3 + 2], P[c * 3], P[c * 3 + 1], P[c * 3 + 2]], id = tris.length;
      tris.push(tri);
      const x0 = Math.floor(Math.min(tri[0], tri[3], tri[6]) / CELL), x1 = Math.floor(Math.max(tri[0], tri[3], tri[6]) / CELL);
      const z0 = Math.floor(Math.min(tri[2], tri[5], tri[8]) / CELL), z1 = Math.floor(Math.max(tri[2], tri[5], tri[8]) / CELL);
      if ((x1 - x0) * (z1 - z0) > 400) continue; // the far floor skirt: never under the diver
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const key = i * 100003 + j; let list = cells.get(key); if (!list) cells.set(key, list = []); list.push(id); }
    }
  };
  add(t.scene.getObjectByName('reef-explore-floor'));
  add(t.scene.getObjectByName('reef-explore-bommies'));
  return function heightAt(x, z) {
    const list = cells.get(Math.floor(x / CELL) * 100003 + Math.floor(z / CELL));
    let top = -Infinity;
    if (!list) return top;
    for (const id of list) {
      const p = tris[id], ax = p[0], az = p[2], bx = p[3], bz = p[5], cx = p[6], cz = p[8];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(d) < 1e-12) continue;
      const w1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, w2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w3 = 1 - w1 - w2;
      if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
      top = Math.max(top, w1 * p[1] + w2 * p[4] + w3 * p[7]);
    }
    return top;
  };
}

// Points on the drawn diver, in the world: the fin blades (tips, corners, middle, root), ankles,
// knees, hips, hands, chest and face. The rig is posed by the engine each frame.
const FIN_LOCAL = [[-0.578, -0.044, 0], [-0.578, -0.044, 0.13], [-0.578, -0.044, -0.13], [-0.4, -0.035, 0.12], [-0.4, -0.035, -0.12], [-0.25, -0.03, 0], [-0.1, -0.02, 0]];
const BODY_LOCAL = [[0.56, -0.21, 0], [0.15, -0.17, 0], [0.7, -0.04, 0], [-0.42, -0.12, 0], [0.77, 0.08, 0], [-0.2, -0.16, 0.15], [-0.2, -0.16, -0.15]];
export function bodyPoints(t) {
  const diver = t.scene.getObjectByName('reef-explore-diver'), out = [];
  diver.updateMatrixWorld(true);
  for (const side of ['left', 'right']) {
    const fin = t.scene.getObjectByName('reef-explore-diver-fin-' + side), knee = t.scene.getObjectByName('reef-explore-diver-knee-' + side), ankle = t.scene.getObjectByName('reef-explore-diver-ankle-' + side);
    for (const p of FIN_LOCAL) out.push({ part: 'fin', p: fin.localToWorld(new THREE.Vector3(...p)) });
    out.push({ part: 'ankle', p: ankle.localToWorld(new THREE.Vector3(0, -0.05, 0)) });
    out.push({ part: 'knee', p: knee.localToWorld(new THREE.Vector3(0, -0.06, 0)) });
  }
  for (const p of BODY_LOCAL) out.push({ part: 'body', p: diver.localToWorld(new THREE.Vector3(...p)) });
  return out;
}
// How far the deepest body point is inside the drawn rock (negative: clear by that much).
export function deepest(t, heightAt) {
  let worst = -Infinity, at = null;
  for (const b of bodyPoints(t)) { const d = heightAt(b.p.x, b.p.z) - b.p.y; if (d > worst) { worst = d; at = b; } }
  return { depth: worst, part: at && at.part, x: at && at.p.x, y: at && at.p.y, z: at && at.p.z };
}
const bearing = (dx, dz) => Math.atan2(dx, -dz);
const gap = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function headingRad(t) { return t.state().diver.headingDeg * Math.PI / 180; }
// Turn in place (no forward input) until the heading is within 4 degrees of want.
export function turnTo(t, want, maxS = 8) {
  for (let i = 0; i < maxS * 20; i++) {
    const g = gap(want, headingRad(t));
    if (Math.abs(g) < 0.07) break;
    t.controller.setInput({ forward: 0, turn: Math.max(-1, Math.min(1, g * 2.5)), rise: 0 }); t.step(50);
  }
  t.controller.setInput(null);
}
// The nearest bommie wall around the diver at the height of its legs: [bearing, distance], from
// horizontal rays against the drawn bommies.
export function nearestWall(t) {
  const mesh = t.scene.getObjectByName('reef-explore-bommies'), d = t.state().diver, ray = new THREE.Raycaster();
  let best = null;
  for (let k = 0; k < 48; k++) {
    const a = k / 48 * Math.PI * 2, dir = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
    ray.set(new THREE.Vector3(d.x, d.y - 0.15, d.z), dir); ray.far = 12;
    const hit = ray.intersectObject(mesh, false)[0];
    if (hit && (!best || hit.distance < best[1])) best = [a, hit.distance];
  }
  return best;
}
export { bearing as bearingTo, gap as angleGap };

// A dive whose stub species log every model update (uid, frame, dt): the time slicing is
// read from what the engine asks of the models. Same fake clock and stub renderer as the
// repo harness; `clockStep` adds script time inside each frame (the governor's CPU signal).
import { readFileSync as readSrc } from 'node:fs';
const SPECIES_SRC = readSrc(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
// The tool's own dive site (population and health), read from the tool source.
export function toolSite(id) {
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  new Function('window', readSrc(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8'))(win);
  const X = win.__RR_TEST_EXPORTS__.coralReef, s = X.EXPLORE_SITES.find((e) => e.id === id);
  return { seed: s.seed, depthM: s.depthM, health: s.health, population: X.populationFor(s), restoration: s.restoration ? { kind: s.restoration.kind, units: s.restoration.units, yearsSince: 4 } : null };
}
import { SOURCE as EXPLORE_SRC, site as baseSite } from './reef_dive_harness.js';
const LOG_INFO = {
  clownfish: ['fish', 'pair', 0.09], magnificent_anemone: ['invertebrate', 'sessile', 0.6], blue_tang: ['fish', 'school', 0.25, [6, 16]],
  brain_coral: ['coral', 'sessile', 1.0], staghorn_coral: ['coral', 'sessile', 1.2], parrotfish: ['fish', 'solitary', 0.45],
  sea_fan: ['invertebrate', 'sessile', 1.0], barrel_sponge: ['invertebrate', 'sessile', 1.0], giant_clam: ['invertebrate', 'sessile', 0.9],
  green_turtle: ['reptile', 'solitary', 1.0], lionfish: ['fish', 'hover', 0.32], emperor_angelfish: ['fish', 'solitary', 0.35]
};
export const LOG_POP = [
  { id: 'clownfish', count: 2 }, { id: 'magnificent_anemone', count: 1 }, { id: 'blue_tang', count: 3 }, { id: 'brain_coral', count: 6 },
  { id: 'parrotfish', count: 6 }, { id: 'sea_fan', count: 1 }, { id: 'barrel_sponge', count: 1 }, { id: 'giant_clam', count: 1 },
  { id: 'green_turtle', count: 2 }, { id: 'lionfish', count: 3 }, { id: 'emperor_angelfish', count: 5 }
];
export function loggingRuntime(options = {}, source = EXPLORE_SRC, { real = false } = {}) {
  const frames = new Map(), timers = new Map(), log = [];
  let serial = 0, timerSerial = 0, clock = 1000, renderer = null, frame = 0, inner = 0;
  const info = (id) => { const r = LOG_INFO[id]; return r ? { id, group: r[0], habit: r[1], lengthM: r[2], depthM: [1, 30], schoolSize: r[3] ? r[3].slice() : null } : null; };
  const model = (T, id, root, radius) => ({ root, radius, update(dt) { log.push([root.userData.exploreUid, frame, dt]); }, dispose() {} });
  const species = {
    version: '1.0.0', ids: Object.keys(LOG_INFO), info,
    create(T, id) {
      const i = info(id), root = new T.Group(), mesh = new T.Mesh(new T.SphereGeometry(Math.max(0.02, i.lengthM / 2), 8, 6), new T.MeshStandardMaterial());
      root.add(mesh); root.userData.speciesId = id; mesh.userData.speciesId = id;
      if (i.group === 'coral' || i.group === 'structure') mesh.position.y = i.lengthM / 2;
      return model(T, id, root, i.lengthM / 2);
    },
    createSchool(T, id, count) {
      const i = info(id), root = new T.Group(), g = new T.SphereGeometry(i.lengthM / 2, 6, 4), m = new T.MeshStandardMaterial();
      root.userData.speciesId = id;
      for (let k = 0; k < count; k++) { const s = new T.Mesh(g, m); s.position.set((k % 5) * 0.2 - 0.4, Math.floor(k / 5) * 0.15, (k % 3) * 0.2); root.add(s); }
      return model(T, id, root, 0.6);
    }
  };
  class Renderer {
    constructor(params) { renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio() {} setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { this.scene = scene; this.camera = camera; }
    dispose() {} forceContextLoss() {}
  }
  const t = { log, clockStep: 0 };
  const local = {
    innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    // Time spent inside a frame: each read during a frame moves the clock by clockStep ms.
    performance: { now: () => clock + (inner += t.clockStep, inner) },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener() {}, removeEventListener() {}
  };
  new Function('window', source)(local);
  // The real species module (planktivore crowds need its schools); then no update log.
  if (real) new Function('window', SPECIES_SRC)(local); else local.Reef3DSpecies = species;
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const controller = local.Reef3DExplore.mount(canvas, { quality: 'low', site: baseSite({ population: LOG_POP }), ...options, THREE: { ...THREE, WebGLRenderer: Renderer } });
  Object.defineProperties(t, {
    renderer: { get() { return renderer; } }, scene: { get() { return renderer.scene; } }, camera: { get() { return renderer.camera; } }, frame: { get() { return frame; } }
  });
  Object.assign(t, {
    local, canvas, controller,
    step(ms = 50) {
      clock += ms; inner = 0; frame++;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
    },
    run(seconds, ms = 50) { const n = Math.round(seconds * 1000 / ms); for (let i = 0; i < n; i++) t.step(ms); },
    state() { return controller.getState(); },
    dispose() { try { controller.dispose(); } catch (ignore) {} canvas.remove(); }
  });
  return t;
}
