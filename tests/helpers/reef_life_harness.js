// Lane H1 dive harness: real three r128 with a stubbed WebGLRenderer, the way
// tests/reef_3d_explore.test.js mounts Reef3DExplore. REEF3D_EXPLORE_SOURCE and
// REEF3D_SPECIES_SOURCE point a mutation check at a scratch copy.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Tests run from the repo root (like every 'stem_lab/...' path in these suites).
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
export const THREE = createRequire(import.meta.url)(REPO + '/vendor/three-r128/three.min.js');
const EXPLORE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || REPO + '/stem_lab/reef_3d_explore.js', 'utf8');
const SPECIES = readFileSync(process.env.REEF3D_SPECIES_SOURCE || REPO + '/stem_lab/reef_3d_species.js', 'utf8');
const TOOL = process.env.CORALREEF_SOURCE || REPO + '/stem_lab/stem_tool_coralreef.js';

// The tool's dive sites and population table, read straight from the tool source.
export function toolExports() {
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  new Function('window', readFileSync(TOOL, 'utf8'))(win);
  return win.__RR_TEST_EXPORTS__.coralReef;
}
export function toolSite(id) {
  const X = toolExports(), s = X.EXPLORE_SITES.find((e) => e.id === id);
  return { seed: s.seed, depthM: s.depthM, health: s.health, population: X.populationFor(s), restoration: s.restoration ? { kind: s.restoration.kind, units: s.restoration.units, yearsSince: 4 } : null };
}

// A minimal stand-in for window.Reef3DSpecies (same API as the repo suite's stub).
const STUB_INFO = {
  parrotfish: ['fish', 'solitary', 0.45, [1, 25], null], threadfin_butterflyfish: ['fish', 'pair', 0.2, [1, 25], null],
  brain_coral: ['coral', 'sessile', 1.0, [1, 25], null], staghorn_coral: ['coral', 'sessile', 1.2, [1, 20], null],
  anthias: ['fish', 'school', 0.1, [3, 30], [18, 44]], bluestripe_snapper: ['fish', 'school', 0.3, [3, 30], [12, 30]],
  lionfish: ['fish', 'hover', 0.32, [2, 30], null], green_turtle: ['reptile', 'solitary', 1.0, [1, 30], null],
  oriental_sweetlips: ['fish', 'hover', 0.5, [2, 30], null], emperor_angelfish: ['fish', 'solitary', 0.35, [3, 30], null]
};
function stubSpecies() {
  function info(id) { const r = STUB_INFO[id]; return r ? { id, group: r[0], habit: r[1], lengthM: r[2], depthM: r[3].slice(), schoolSize: r[4] ? r[4].slice() : null } : null; }
  return {
    version: '1.0.0', ids: Object.keys(STUB_INFO), info,
    create(T, id) {
      const i = info(id), root = new T.Group(), geometry = new T.SphereGeometry(Math.max(0.02, i.lengthM / 2), 8, 6), material = new T.MeshStandardMaterial();
      const mesh = new T.Mesh(geometry, material); root.add(mesh); root.userData.speciesId = id; mesh.userData.speciesId = id;
      return { root, radius: i.lengthM / 2, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    },
    createSchool(T, id, count) {
      const i = info(id), root = new T.Group(), geometry = new T.SphereGeometry(i.lengthM / 2, 6, 4), material = new T.MeshStandardMaterial();
      for (let k = 0; k < count; k++) { const m = new T.Mesh(geometry, material); m.position.set((k % 5) * 0.2 - 0.4, Math.floor(k / 5) * 0.15, (k % 3) * 0.2); root.add(m); }
      return { root, radius: 0.6, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    }
  };
}

export function runtime(options = {}, { species = 'stub' } = {}) {
  const frames = new Map(), timers = new Map();
  let serial = 0, timerSerial = 0, clock = 1000, renderer = null;
  class Renderer {
    constructor(params) { renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio() {} setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { this.scene = scene; this.camera = camera; }
    dispose() {} forceContextLoss() {}
  }
  const local = {
    innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    performance: { now: () => clock },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener() {}, removeEventListener() {}
  };
  new Function('window', EXPLORE)(local);
  if (species === 'real') new Function('window', SPECIES)(local);
  else if (species) local.Reef3DSpecies = stubSpecies();
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const controller = local.Reef3DExplore.mount(canvas, { quality: 'low', ...options, THREE: { ...(options.THREE || THREE), WebGLRenderer: Renderer } });
  const t = {
    canvas, controller, local,
    get scene() { return renderer.scene; },
    get camera() { return renderer.camera; },
    step(ms = 50) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
    },
    run(seconds, ms = 50) { const n = Math.round(seconds * 1000 / ms); for (let i = 0; i < n; i++) t.step(ms); },
    pointer(type, x, y) { canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true })); },
    dispose() { try { controller.dispose(); } catch (ignore) {} canvas.remove(); }
  };
  return t;
}

// Every organism once, with the object that carries it (mobile animals are plain roots).
export function census(t) {
  const out = new Map();
  t.scene.traverse((o) => {
    if (o.userData && o.userData.exploreUid) out.set(o.userData.exploreUid, { uid: o.userData.exploreUid, speciesId: o.userData.speciesId, object: o, pos: o.position });
    if (o.isInstancedMesh && o.userData.exploreUids) o.userData.exploreUids.forEach((uid, i) => {
      if (out.has(uid)) return;
      const m = new THREE.Matrix4().fromArray(o.userData.exploreMatrices, i * 16);
      out.set(uid, { uid, speciesId: o.userData.speciesId, instanced: true, pos: new THREE.Vector3().setFromMatrixPosition(m) });
    });
  });
  return [...out.values()].sort((a, b) => Number(a.uid.slice(1)) - Number(b.uid.slice(1)));
}
// The planktivore crowds: one instanced mesh per borrowed school part.
export function ambient(t) {
  const meshes = [];
  t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.ambient) meshes.push(o); });
  return meshes;
}
export function ambientBodies(t) { return ambient(t).filter((m) => m.userData.part === 'body'); }
export function drawnAmbient(t) {
  const out = [], m = new THREE.Matrix4(), p = new THREE.Vector3();
  ambientBodies(t).forEach((mesh) => { for (let i = 0; i < mesh.count; i++) { m.fromArray(mesh.instanceMatrix.array, i * 16); out.push({ speciesId: mesh.userData.speciesId, pos: p.setFromMatrixPosition(m).clone() }); } });
  return out;
}

// swimTo, then step until the glide has ended and the diver hangs still.
export function arrive(t, uid, ms = 50) {
  t.controller.swimTo(uid);
  let last = null, still = 0;
  for (let i = 0; i < 1200 && still < 5; i++) {
    t.step(ms);
    const d = t.controller.getState().diver;
    still = i > 20 && last && Math.hypot(d.x - last.x, d.y - last.y, d.z - last.z) < 1e-6 ? still + 1 : 0;
    last = d;
  }
  return still >= 5;
}
