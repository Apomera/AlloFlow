import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

// Real three r128 with a stubbed WebGLRenderer, loaded into a fake window the
// way BirdLab's companion tests do. REEF3D_ENGINE_SOURCE / REEF3D_HABITAT_SOURCE
// let a mutation check point the suite at scratch copies.
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const ENGINE = readFileSync(process.env.REEF3D_ENGINE_SOURCE || 'stem_lab/reef_3d_engine.js', 'utf8');
const HABITAT = readFileSync(process.env.REEF3D_HABITAT_SOURCE || 'stem_lab/reef_3d_habitat.js', 'utf8');
const CATEGORIES = ['hard_coral', 'bleached_coral', 'recently_dead_coral', 'macroalgae', 'rock', 'rubble', 'sand'];
const FORMS = ['branching', 'massive', 'plate', 'encrusting'];
const FAMILIES = ['parrotfish', 'surgeonfish', 'butterflyfish', 'grouper', 'snapper'];
const OFFSETS = [-0.4, 0.9, -1.6, 2.2, -2.5, 2.5, -2.51, 3.4, -4.2, 0, 1.3, -2.1];

function sampleLayout() {
  const points = [];
  for (let i = 0; i < 40; i++) {
    const category = CATEGORIES[i % 7];
    points.push({ distanceM: i * 0.5, category, coralForm: category.endsWith('_coral') ? FORMS[Math.floor(i / 7) % 4] : undefined });
  }
  const fish = OFFSETS.map((offsetM, i) => ({ id: 'fish-' + i, family: FAMILIES[i % 5], alongM: 1 + i * 1.5, offsetM, heightM: 0.5 + (i % 3) * 0.3 }));
  return { lengthM: 20, beltHalfWidthM: 2.5, depthM: 8, points, fish, background: { coralCover: 0.4, bleaching: 0.1, algae: 0.3 } };
}
function trackingThree() {
  const created = [], disposed = new Set();
  const T = { ...THREE };
  for (const [name, value] of Object.entries(THREE)) {
    if (typeof value !== 'function' || !value.prototype) continue;
    if (!(value.prototype.isBufferGeometry || value.prototype.isMaterial || value.prototype.isTexture)) continue;
    T[name] = class extends value {
      constructor(...args) { super(...args); created.push(this); }
      dispose() { disposed.add(this); return super.dispose(); }
    };
  }
  return { T, created, disposed };
}

const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

function runtime(options = {}, { windowExtras = {}, layout = sampleLayout() } = {}) {
  const frames = new Map(), timers = new Map(), counts = { render: 0, dispose: 0, forceContextLoss: 0 };
  const listenerLog = { canvas: new Map(), document: [], window: [] };
  let serial = 0, timerSerial = 0, clock = 1000, renderer = null;
  class Renderer {
    constructor(params) { renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio(ratio) { this.pixelRatio = ratio; } setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { counts.render++; this.scene = scene; this.camera = camera; }
    dispose() { counts.dispose++; } forceContextLoss() { counts.forceContextLoss++; }
  }
  const observers = [];
  class FakeResizeObserver { constructor(cb) { this.cb = cb; observers.push(this); } observe(el) { this.target = el; } disconnect() { this.disconnected = true; } }
  const local = {
    innerWidth: 1280, devicePixelRatio: 2, console: { warn() {}, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    performance: { now: () => clock },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    ResizeObserver: FakeResizeObserver,
    addEventListener(type, fn, o) { listenerLog.window.push(['add', type]); window.addEventListener(type, fn, o); },
    removeEventListener(type, fn, o) { listenerLog.window.push(['remove', type]); window.removeEventListener(type, fn, o); },
    ...windowExtras
  };
  // The engine must never read a global THREE.
  Object.defineProperty(local, 'THREE', { get() { throw new Error('Reef3D read a global THREE'); } });
  new Function('window', HABITAT)(local);
  new Function('window', ENGINE)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ width: 800, height: 500 });
  const add = canvas.addEventListener.bind(canvas), remove = canvas.removeEventListener.bind(canvas);
  canvas.addEventListener = (type, fn, o) => { listenerLog.canvas.set(fn, type); add(type, fn, o); };
  canvas.removeEventListener = (type, fn, o) => { listenerLog.canvas.delete(fn); remove(type, fn, o); };
  const docAdd = document.addEventListener, docRemove = document.removeEventListener;
  document.addEventListener = function (type, fn, o) { listenerLog.document.push(['add', type]); return docAdd.call(this, type, fn, o); };
  document.removeEventListener = function (type, fn, o) { listenerLog.document.push(['remove', type]); return docRemove.call(this, type, fn, o); };
  document.body.appendChild(canvas);
  const states = [], errors = [];
  const THREEForMount = options.THREE || THREE;
  cleanups.push(() => { document.addEventListener = docAdd; document.removeEventListener = docRemove; });
  const controller = local.Reef3D.mount(canvas, { quality: 'low', seed: 4, layout, onState: (s) => states.push(s), onError: (e) => errors.push(e), ...options, THREE: { ...THREEForMount, WebGLRenderer: Renderer } });
  const t = {
    local, canvas, controller, frames, states, errors, counts, observers, listenerLog, layout,
    get renderer() { return renderer; },
    step(ms = 50) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
    },
    run(seconds) { for (let i = 0; i < seconds * 20; i++) t.step(50); },
    fish() { return renderer.scene.getObjectByName('reef-fish').children; },
    key(target, key) { const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); target.dispatchEvent(e); return e; }
  };
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return t;
}
const CONTRACT_KEYS = ['pointIndex', 'distanceM', 'category', 'coralForm', 'cameraMode', 'paused', 'quality', 'fishVisible'];

describe('Reef3D contract', () => {
  it('registers only window.Reef3D with version 1.0.0 and refuses to mount without THREE or the habitat', () => {
    const bare = {};
    new Function('window', ENGINE)(bare);
    expect(Object.keys(bare)).toEqual(['Reef3D']);
    expect(bare.Reef3D.version).toBe('1.0.0');
    const canvas = document.createElement('canvas');
    expect(() => bare.Reef3D.mount(canvas, { layout: sampleLayout() })).toThrow(/THREE/);
    expect(() => bare.Reef3D.mount(canvas, { THREE, layout: sampleLayout() })).toThrow(/habitat/);
  });

  it('mounts on the stub renderer with the house renderer settings and builds the scene', () => {
    const t = runtime();
    expect(Object.keys(t.controller).sort()).toEqual(['dispose', 'getState', 'goToPoint', 'highlightPoint', 'lookCamera', 'resetCamera', 'resize', 'setCameraMode', 'setPaused', 'setReducedMotion', 'zoomCamera']);
    expect(t.counts.render).toBeGreaterThan(0);
    expect(t.renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(t.renderer.outputEncoding).toBe(THREE.sRGBEncoding);
    expect(t.renderer.pixelRatio).toBe(1);
    expect(t.renderer.shadowMap.enabled).toBe(false);
    expect(t.renderer.size).toEqual([800, 500]);
    const habitat = t.renderer.scene.getObjectByName('reef-habitat');
    expect(habitat.getObjectByName('reef-survey-points').children).toHaveLength(40);
    expect(t.renderer.scene.fog.isFogExp2).toBe(true);
    const state = t.controller.getState();
    for (const key of CONTRACT_KEYS) expect(state, key).toHaveProperty(key);
    expect(state).toMatchObject({ pointIndex: 0, distanceM: 0, category: 'hard_coral', coralForm: 'branching', cameraMode: 'diver', paused: false, quality: 'low' });
    const high = runtime({ quality: 'high' });
    expect(high.renderer.pixelRatio).toBeLessThanOrEqual(1.75);
    expect(high.renderer.shadowMap.enabled).toBe(true);
  });

  it('colours the water by depth: deeper water is bluer and hazier', () => {
    const shallow = runtime({}, { layout: { ...sampleLayout(), depthM: 5 } }), deep = runtime({}, { layout: { ...sampleLayout(), depthM: 12 } });
    const a = shallow.renderer.scene.fog, b = deep.renderer.scene.fog;
    shallow.controller.setCameraMode('diver'); deep.controller.setCameraMode('diver'); shallow.step(); deep.step();
    expect(b.density).toBeGreaterThan(a.density);
    expect(b.color.r + b.color.g).toBeLessThan(a.color.r + a.color.g);
  });

  it('picks the light tier for low-core devices when no quality is given', () => {
    expect(runtime({ quality: undefined }, { windowExtras: { navigator: { hardwareConcurrency: 4 } } }).controller.getState().quality).toBe('low');
    expect(runtime({ quality: undefined }, { windowExtras: { navigator: { hardwareConcurrency: 8, deviceMemory: 8 } } }).controller.getState().quality).toBe('high');
  });
});

describe('Reef3D fish', () => {
  it('adds one fish per entry with the contract userData and belt membership', () => {
    const t = runtime(), fish = t.fish(), belt = t.layout.beltHalfWidthM;
    expect(fish).toHaveLength(t.layout.fish.length);
    t.layout.fish.forEach((entry, i) => {
      const root = fish[i];
      expect(root.userData).toEqual({ fishId: entry.id, family: entry.family, inBelt: Math.abs(entry.offsetM) <= belt });
      root.traverse((o) => { if (o.isMesh) expect(o.userData).toEqual(root.userData); });
    });
    expect(fish[4].userData.inBelt).toBe(true); // exactly on the edge counts as inside
    expect(fish[6].userData.inBelt).toBe(false);
  });

  it('gives each family its own silhouette and size', () => {
    const t = runtime(), shape = {};
    t.fish().forEach((root) => {
      const body = root.children[0], box = new THREE.Box3().setFromBufferAttribute(body.geometry.attributes.position), size = box.getSize(new THREE.Vector3());
      shape[root.userData.family] = { geometry: body.geometry.uuid, depth: size.y / size.z, width: size.x / size.z, length: size.z * root.scale.x };
    });
    expect(new Set(Object.values(shape).map((s) => s.geometry)).size).toBe(5);
    // Butterflyfish are round discs; surgeonfish oval; snapper streamlined; grouper heavy and largest.
    expect(shape.butterflyfish.depth).toBeGreaterThan(shape.surgeonfish.depth);
    expect(shape.surgeonfish.depth).toBeGreaterThan(shape.parrotfish.depth);
    expect(shape.snapper.depth).toBeLessThan(shape.parrotfish.depth);
    expect(shape.grouper.width).toBeGreaterThan(shape.surgeonfish.width * 1.4);
    expect(shape.grouper.length).toBeGreaterThan(Math.max(shape.parrotfish.length, shape.snapper.length, shape.surgeonfish.length, shape.butterflyfish.length));
  });

  it('swims each fish in a bounded home range without ever crossing its belt edge', () => {
    const t = runtime(), belt = t.layout.beltHalfWidthM, start = t.fish().map((f) => f.position.clone());
    let moved = 0;
    for (let k = 0; k < 10; k++) {
      t.run(1);
      t.fish().forEach((root, i) => {
        const entry = t.layout.fish[i], p = root.position;
        expect(Math.abs(p.x - entry.alongM), `fish ${i} along`).toBeLessThan(0.7);
        expect(Math.abs(p.z) <= belt, `fish ${i} side, including exact-edge fish`).toBe(root.userData.inBelt);
        if (p.distanceTo(start[i]) > 0.02) moved++;
      });
    }
    expect(moved).toBeGreaterThan(50);
  });

  it('turns smoothly, banks gently and coordinates the moving body with its tail', () => {
    const t = runtime(), fish = t.fish(), before = fish.map((f) => f.quaternion.clone());
    const motions = fish.map((f) => f.children[0].material.userData.reefFishMotion);
    expect(new Set(motions).size, 'each fish has its own swimming phase').toBe(fish.length);
    let articulated = 0, banked = 0;
    for (let frame = 0; frame < 240; frame++) {
      t.step(50);
      fish.forEach((f, i) => {
        expect(f.quaternion.angleTo(before[i]), 'no abrupt heading or pitch flips').toBeLessThan(0.11);
        expect(Math.abs(f.rotation.z)).toBeLessThanOrEqual(0.16);
        expect(f.position.toArray().every(Number.isFinite)).toBe(true);
        expect(motions[i].value.toArray().every(Number.isFinite)).toBe(true);
        if (Math.abs(f.children[1].position.x) > 0.004 && Math.abs(f.children[1].rotation.y) > 0.05) articulated++;
        if (Math.abs(f.rotation.z) > 0.01) banked++;
        before[i].copy(f.quaternion);
      });
    }
    expect(articulated).toBeGreaterThan(100);
    expect(banked).toBeGreaterThan(100);
    t.controller.setPaused(true);
    const frozen = motions.map((m) => m.value.toArray());
    t.run(2);
    expect(motions.map((m) => m.value.toArray())).toEqual(frozen);
  });

  it('lets nearby conspecifics travel together without synchronizing every tail beat', () => {
    const layout = sampleLayout();
    layout.fish = [{ id: 'shoal-a', family: 'surgeonfish', alongM: 3, offsetM: 0.8, heightM: 0.8 },
      { id: 'shoal-b', family: 'surgeonfish', alongM: 3.5, offsetM: 0.85, heightM: 0.8 }];
    const t = runtime({}, { layout }), fish = t.fish(), a = new THREE.Vector3(), b = new THREE.Vector3();
    let aligned = 0;
    for (let k = 0; k < 80; k++) {
      a.copy(fish[0].position); b.copy(fish[1].position); t.run(0.1);
      a.sub(fish[0].position).normalize(); b.sub(fish[1].position).normalize();
      if (a.dot(b) > 0.85) aligned++;
      expect(fish[0].position.distanceTo(fish[1].position)).toBeGreaterThan(0.25);
    }
    expect(aligned).toBeGreaterThan(65);
    expect(fish[0].children[0].material.userData.reefFishMotion.value.x).not.toBe(fish[1].children[0].material.userData.reefFishMotion.value.x);
  });

  it('holds fish still under reduced motion', () => {
    const t = runtime({ reducedMotion: true }), before = t.fish().map((f) => f.position.toArray().concat(f.rotation.toArray().slice(0, 3)));
    t.controller.goToPoint(9); t.run(3);
    expect(t.fish().map((f) => f.position.toArray().concat(f.rotation.toArray().slice(0, 3)))).toEqual(before);
    t.fish().forEach((root, i) => expect(Math.abs(root.position.z - t.layout.fish[i].offsetM)).toBeLessThan(1e-9));
  });
});

describe('Reef3D camera, keys and state', () => {
  it('glides to a point: getState reports it, the camera looks at it and the highlight sits on it', () => {
    const t = runtime(), forward = new THREE.Vector3(), toPoint = new THREE.Vector3();
    for (const i of [7, 23, 39, 2]) {
      t.controller.goToPoint(i); t.run(3);
      const s = t.controller.getState(), p = t.layout.points[i];
      expect(s.pointIndex).toBe(i);
      expect(s.category).toBe(p.category);
      expect(s.distanceM).toBe(p.distanceM);
      expect(s.coralForm).toBe(p.category.endsWith('_coral') ? p.coralForm : null);
      const cam = t.renderer.camera; cam.getWorldDirection(forward);
      toPoint.set(p.distanceM, 0, 0).sub(cam.position).normalize();
      expect(forward.angleTo(toPoint), `camera aims at point ${i}`).toBeLessThan(0.12);
      expect(cam.position.y - 0, 'diver floats above the tape').toBeGreaterThan(1.1);
      expect(cam.position.y).toBeLessThan(2.2);
      const ring = t.renderer.scene.getObjectByName('reef-highlight').children[0];
      expect(ring.position.x).toBeCloseTo(p.distanceM, 9);
    }
  });

  it('marks only the point itself: a small ring and a plumb line that reaches what lies beneath', () => {
    // Points are 0.5 m apart. A ring sized to the colony (up to about 0.5 m)
    // put the neighbouring point's coral inside it, which invites a wrong record.
    const t = runtime(), box = new THREE.Box3();
    for (const i of [0, 5, 12, 20, 33, 39]) {
      t.controller.goToPoint(i); t.run(2);
      const hl = t.renderer.scene.getObjectByName('reef-highlight'), ring = hl.children[0], plumb = hl.children.find((c) => c.isLine);
      expect(ring.scale.x, 'ring radius at point ' + i).toBeLessThan(0.25);
      box.setFromObject(t.habitat ? t.habitat.surveyObjects[i] : t.renderer.scene.children.find((c) => c.userData && c.userData.surveyPoint === i) || hl);
      const top = box.isEmpty() ? -Infinity : box.max.y;
      expect(plumb.position.y, 'plumb line starts at the object, not above the tape').toBeLessThanOrEqual(Math.max(top, ring.position.y) + 1e-6);
      expect(Math.abs(plumb.position.y - ring.position.y + 0.012), 'ring sits where the plumb touches').toBeLessThan(1e-6);
    }
  });

  it('moves between points with keys on the canvas only', () => {
    const t = runtime(), c = t.canvas, at = () => t.controller.getState().pointIndex;
    expect(t.key(c, 'ArrowRight').defaultPrevented).toBe(true); expect(at()).toBe(1);
    t.key(c, 'ArrowLeft'); expect(at()).toBe(0);
    t.key(c, 'ArrowLeft'); expect(at()).toBe(0);
    t.key(c, 'PageUp'); expect(t.controller.getState().distanceM).toBe(2);
    t.key(c, 'PageUp'); expect(t.controller.getState().distanceM).toBe(4);
    t.key(c, 'PageDown'); expect(t.controller.getState().distanceM).toBe(2);
    t.key(c, 'End'); expect(at()).toBe(39);
    t.key(c, 'ArrowRight'); expect(at()).toBe(39);
    t.key(c, 'Home'); expect(at()).toBe(0);
    expect(t.key(c, ' ').defaultPrevented).toBe(true); expect(t.controller.getState().paused).toBe(true);
    t.key(c, ' '); expect(t.controller.getState().paused).toBe(false);
    expect(t.key(c, 'a').defaultPrevented).toBe(false);
    t.step();
  });

  it('ignores keydown dispatched on window or document and never listens there', () => {
    const t = runtime();
    t.key(window, 'ArrowRight'); t.key(document, 'ArrowRight'); t.key(window, 'End'); t.key(document, 'PageUp');
    t.step();
    expect(t.controller.getState().pointIndex).toBe(0);
    expect(t.listenerLog.window.filter(([, type]) => type === 'keydown')).toEqual([]);
    expect(t.listenerLog.document.filter(([, type]) => type === 'keydown')).toEqual([]);
    expect([...t.listenerLog.canvas.values()].filter((type) => type === 'keydown')).toHaveLength(1);
  });

  it('switches to an overview that frames the whole belt from above-side', () => {
    const t = runtime();
    t.controller.setCameraMode('overview'); t.run(4);
    const s = t.controller.getState(), cam = t.renderer.camera;
    expect(s.cameraMode).toBe('overview');
    cam.updateMatrixWorld();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const x of [0, 10, 20]) for (const z of [-2.5, 2.5]) expect(frustum.containsPoint(new THREE.Vector3(x, 0.1, z)), `belt corner ${x},${z}`).toBe(true);
    expect(cam.position.y).toBeLessThan(8 - 0.3);
    expect(s.fishVisible.length).toBeGreaterThanOrEqual(10);
    s.fishVisible.forEach((f) => expect(Object.keys(f).sort()).toEqual(['family', 'fishId', 'inBelt']));
    t.controller.setCameraMode('sideways');
    expect(t.controller.getState().cameraMode).toBe('overview');
  });

  it('keeps a long tape in shallow water framed and underwater in the overview', () => {
    const layout = sampleLayout();
    layout.lengthM = 50; layout.depthM = 5; layout.points = layout.points.map((p, i) => ({ ...p, distanceM: i * 1.25 }));
    const t = runtime({}, { layout });
    t.controller.goToPoint(39); t.controller.setCameraMode('overview'); t.run(4);
    const cam = t.renderer.camera; cam.updateMatrixWorld();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const x of [0, 25, 50]) for (const z of [-2.5, 2.5]) expect(frustum.containsPoint(new THREE.Vector3(x, 0.1, z)), `belt corner ${x},${z}`).toBe(true);
    expect(cam.position.y).toBeLessThan(5 - 0.3);
  });

  it('reports only fish inside the camera frustum', () => {
    const t = runtime({ reducedMotion: true });
    t.controller.goToPoint(0); t.step();
    const near = t.controller.getState().fishVisible.map((f) => f.fishId);
    expect(near.length).toBeLessThan(t.layout.fish.length);
    expect(near).not.toContain('fish-11');
  });

  it('highlights without moving, and clears the highlight', () => {
    const t = runtime();
    t.controller.highlightPoint(12); t.step();
    const s = t.controller.getState(), highlight = t.renderer.scene.getObjectByName('reef-highlight');
    expect(s.pointIndex).toBe(0);
    expect(s.highlightIndex).toBe(12);
    expect(highlight.visible).toBe(true);
    expect(highlight.children[0].position.x).toBeCloseTo(6, 9);
    t.controller.highlightPoint(-1); expect(highlight.visible).toBe(false);
  });

  it('calls onState at most five times a second and still delivers the final state', () => {
    const t = runtime();
    t.step(); const before = t.states.length;
    for (let k = 0; k < 40; k++) { t.controller.goToPoint(k % 40); t.step(50); }
    t.run(1);
    const calls = t.states.length - before;
    expect(calls).toBeLessThanOrEqual(11);
    expect(calls).toBeGreaterThanOrEqual(5);
    expect(t.states.at(-1).pointIndex).toBe(39);
  });

  it('pauses the world on setPaused and while the page is hidden', () => {
    const t = runtime(), fishZ = () => t.fish()[0].position.z;
    t.run(1); t.controller.setPaused(true); t.step(); const z = fishZ(); t.run(1);
    expect(fishZ()).toBe(z);
    expect(t.controller.getState().paused).toBe(true);
    t.controller.setPaused(false); t.run(1); expect(fishZ()).not.toBe(z);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
      expect(t.frames.size).toBe(0);
      const renders = t.counts.render; t.run(1); expect(t.counts.render).toBe(renders);
    } finally { delete document.hidden; }
    document.dispatchEvent(new Event('visibilitychange'));
    expect(t.frames.size).toBe(1);
  });
});

describe('Reef3D lifecycle', () => {
  it('removes every listener, stops the loop and disposes everything, once', () => {
    const { T, created, disposed } = trackingThree();
    const t = runtime({ THREE: T });
    expect(t.listenerLog.canvas.size).toBeGreaterThan(5);
    t.run(0.5);
    t.controller.dispose();
    expect(t.listenerLog.canvas.size).toBe(0);
    const balance = (log) => log.filter(([kind]) => kind === 'add').length - log.filter(([kind]) => kind === 'remove').length;
    expect(balance(t.listenerLog.document)).toBe(0);
    expect(balance(t.listenerLog.window)).toBe(0);
    expect(t.observers[0].disconnected).toBe(true);
    expect(t.frames.size).toBe(0);
    expect(t.counts).toMatchObject({ dispose: 1, forceContextLoss: 1 });
    expect(created.filter((r) => !disposed.has(r)).map((r) => r.type)).toEqual([]);
    const renders = t.counts.render;
    t.run(1); t.key(t.canvas, 'ArrowRight');
    expect(t.counts.render).toBe(renders);
    expect(() => t.controller.dispose()).not.toThrow();
    expect(t.counts).toMatchObject({ dispose: 1, forceContextLoss: 1 });
    expect(t.canvas._reef3d).toBeUndefined();
  });

  it('handles webglcontextlost: prevents default, stops, and reports an Error', () => {
    const t = runtime();
    t.step();
    const event = new Event('webglcontextlost', { cancelable: true });
    t.canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(t.errors).toHaveLength(1);
    expect(t.errors[0]).toBeInstanceOf(Error);
    expect(t.errors[0].message).toMatch(/graphics context/);
    expect(t.frames.size).toBe(0);
    const renders = t.counts.render;
    t.controller.goToPoint(5); t.run(1);
    expect(t.counts.render).toBe(renders);
    expect(t.controller.getState().ready).toBe(false);
    t.controller.dispose();
    expect(t.counts.dispose).toBe(1);
    expect(t.counts.forceContextLoss).toBe(0);
  });

  it('replaces an earlier controller mounted on the same canvas', () => {
    const t = runtime(), first = t.controller;
    const second = t.local.Reef3D.mount(t.canvas, { THREE: { ...THREE, WebGLRenderer: class { constructor() { this.shadowMap = {}; this.info = { render: {} }; } setPixelRatio() {} setSize() {} render() {} dispose() {} forceContextLoss() {} } }, layout: sampleLayout(), quality: 'low' });
    expect(t.counts.dispose).toBe(1);
    expect(first.getState().ready).toBe(false);
    second.dispose();
  });
});

describe('Reef3D accessible camera and live motion preference', () => {
  it('looks, zooms and resets while paused without moving the point, fish or habitat', () => {
    const t = runtime(); t.controller.goToPoint(12); t.controller.setPaused(true); t.controller.resetCamera(); t.step();
    const initial = t.renderer.camera.position.clone(), fish = t.fish().map(f => f.position.toArray());
    const habitat = t.renderer.scene.getObjectByName('reef-habitat'), children = habitat.children.slice(), before = t.counts.render;
    t.controller.lookCamera(40, -30); t.step(); expect(t.renderer.camera.position.distanceTo(initial)).toBeGreaterThan(0.1);
    const looked = t.renderer.camera.position.clone(); t.controller.zoomCamera(-0.18); t.step(); expect(t.renderer.camera.position.distanceTo(looked)).toBeGreaterThan(0.1);
    t.controller.resetCamera(); t.step(); expect(t.renderer.camera.position.distanceTo(initial)).toBeLessThan(1e-6);
    expect(t.counts.render).toBeGreaterThan(before); expect(t.controller.getState()).toMatchObject({paused:true,pointIndex:12,highlightIndex:12});
    expect(t.fish().map(f => f.position.toArray())).toEqual(fish); expect(habitat.children).toEqual(children); expect(t.renderer.scene.getObjectByName('reef-habitat')).toBe(habitat);
  });

  it('clamps button zoom and look input, and resets both camera modes', () => {
    const t = runtime({reducedMotion:true});
    for (const mode of ['diver','overview']) {
      t.controller.setCameraMode(mode); t.controller.resetCamera(); t.step(); const initial = t.renderer.camera.position.clone();
      for (let i=0;i<30;i++) t.controller.zoomCamera(-0.5); t.step(); const close = t.renderer.camera.position.clone(); t.controller.zoomCamera(-0.5); t.step(); expect(t.renderer.camera.position.distanceTo(close)).toBeLessThan(1e-6);
      for (let i=0;i<30;i++) t.controller.zoomCamera(0.5); t.step(); const far = t.renderer.camera.position.clone(); t.controller.zoomCamera(0.5); t.step(); expect(t.renderer.camera.position.distanceTo(far)).toBeLessThan(1e-6); expect(far.distanceTo(close)).toBeGreaterThan(1);
      t.controller.lookCamera(Infinity,NaN); t.controller.zoomCamera(NaN); t.step(); expect(t.renderer.camera.position.toArray().every(Number.isFinite)).toBe(true);
      t.controller.lookCamera(1e6,-1e6); t.step(); expect(t.renderer.camera.position.toArray().every(Number.isFinite)).toBe(true);
      t.controller.resetCamera(); t.step(); expect(t.renderer.camera.position.distanceTo(initial)).toBeLessThan(1e-6);
    }
  });

  it('does not repeatedly toggle pause while Space is held, and preserves canvas-only keyboard ownership', () => {
    const t = runtime(); t.key(t.canvas,' '); expect(t.controller.getState().paused).toBe(true);
    for(let i=0;i<4;i++){const event=new KeyboardEvent('keydown',{key:' ',repeat:true,bubbles:true,cancelable:true});t.canvas.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);}
    expect(t.controller.getState().paused).toBe(true); t.key(document.body,' '); expect(t.controller.getState().paused).toBe(true); t.key(t.canvas,' '); expect(t.controller.getState().paused).toBe(false);
  });

  it('applies a live preference in place, freezes motion, and waits for explicit resume after disabling it', () => {
    const t=runtime();t.controller.goToPoint(9);t.run(0.5);const scene=t.renderer.scene, habitat=scene.getObjectByName('reef-habitat'),fish=t.fish();
    t.controller.setReducedMotion(true);t.step();const stopped=fish.map(f=>f.position.toArray());t.run(1);
    expect(t.controller.getState()).toMatchObject({reducedMotion:true,paused:true,pointIndex:9,ready:true});expect(fish.map(f=>f.position.toArray())).toEqual(stopped);
    t.key(t.canvas,' ');t.step();expect(t.controller.getState().paused).toBe(true);expect(fish.map(f=>f.position.toArray())).toEqual(stopped);
    t.controller.setPaused(false);t.run(0.5);expect(t.controller.getState().paused).toBe(true);expect(fish.map(f=>f.position.toArray())).toEqual(stopped);
    t.controller.setReducedMotion(false);t.run(0.5);expect(t.controller.getState()).toMatchObject({reducedMotion:false,paused:true});expect(fish.map(f=>f.position.toArray())).toEqual(stopped);
    t.controller.setPaused(false);t.run(0.5);expect(fish.map(f=>f.position.toArray())).not.toEqual(stopped);
    t.controller.setReducedMotion(false);expect(t.controller.getState().paused).toBe(false);expect(t.renderer.scene).toBe(scene);expect(scene.getObjectByName('reef-habitat')).toBe(habitat);expect(t.fish()).toEqual(fish);expect(t.counts.dispose).toBe(0);
  });

  it('starts reduced-motion scenes paused and leaves camera and point control available', () => {
    const t=runtime({reducedMotion:true});expect(t.controller.getState()).toMatchObject({paused:true,reducedMotion:true});const start=t.fish().map(f=>f.position.toArray());
    t.key(t.canvas,' ');expect(t.controller.getState().paused).toBe(true);t.controller.goToPoint(19);t.controller.lookCamera(40,0);t.step();expect(t.controller.getState().pointIndex).toBe(19);expect(t.fish().map(f=>f.position.toArray())).toEqual(start);
    t.controller.setReducedMotion(false);expect(t.controller.getState().paused).toBe(true);t.key(t.canvas,' ');t.run(1);expect(t.controller.getState().paused).toBe(false);expect(t.fish().map(f=>f.position.toArray())).not.toEqual(start);
  });

  it('ignores new camera and motion calls after disposal without scheduling more frames', () => {
    const t=runtime();t.controller.dispose();const renders=t.counts.render,state=t.controller.getState();
    t.controller.lookCamera(40,20);t.controller.zoomCamera(0.18);t.controller.resetCamera();t.controller.setReducedMotion(true);t.step();
    expect(t.frames.size).toBe(0);expect(t.counts.render).toBe(renders);expect(t.controller.getState()).toEqual(state);
  });
});
