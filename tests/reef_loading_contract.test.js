import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Lane E: the staged loading contract of Reef3DExplore and Reef3D (options.staged,
// options.onProgress, getState().ready). Real three r128 with a stubbed renderer, as
// in tests/reef_3d_explore.test.js. The GPU variant of the stub mimics the order of
// r128's WebGLRenderer.compile (create and link a program, store it on the material,
// then read its uniforms: the read that waits for the driver) and a WebGL context
// whose links finish a few COMPLETION_STATUS_KHR queries later.
vi.setConfig({ testTimeout: 90000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const EXPLORE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const ENGINE = readFileSync(process.env.REEF3D_ENGINE_SOURCE || 'stem_lab/reef_3d_engine.js', 'utf8');
const HABITAT = readFileSync(process.env.REEF3D_HABITAT_SOURCE || 'stem_lab/reef_3d_habitat.js', 'utf8');
const BROKEN = 'reefBrokenLink';

const POP = [
  { id: 'clownfish', count: 2 }, { id: 'magnificent_anemone', count: 1 }, { id: 'blue_tang', count: 2 }, { id: 'brain_coral', count: 4 },
  { id: 'green_turtle', count: 1 }, { id: 'giant_moray', count: 1 }, { id: 'lionfish', count: 1 }, { id: 'sea_fan', count: 2 }
];
const STUB_INFO = {
  clownfish: ['fish', 'pair', 0.09, [1, 15], null], magnificent_anemone: ['invertebrate', 'sessile', 0.6, [1, 20], null],
  blue_tang: ['fish', 'school', 0.25, [2, 25], [6, 16]], brain_coral: ['coral', 'sessile', 1.0, [1, 25], null],
  green_turtle: ['reptile', 'solitary', 1.0, [1, 30], null], giant_moray: ['fish', 'crevice', 2.2, [1, 30], null],
  lionfish: ['fish', 'hover', 0.32, [2, 30], null], sea_fan: ['invertebrate', 'sessile', 1.0, [4, 40], null],
  reef_star: ['structure', 'sessile', 1.0, [1, 20], null]
};
// Window.Reef3DSpecies stand-in; `broken` names a species whose shader will not link.
function stubSpecies(broken) {
  function info(id) { const r = STUB_INFO[id]; return r ? { id, group: r[0], habit: r[1], lengthM: r[2], depthM: r[3].slice(), schoolSize: r[4] ? r[4].slice() : null } : null; }
  function body(T, id, length) {
    const root = new T.Group(), geometry = new T.SphereGeometry(Math.max(0.02, length / 2), 8, 6), material = new T.MeshStandardMaterial({ color: 0xff8844 });
    if (id === broken) material.onBeforeCompile = (shader) => { shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'void main() {\n' + BROKEN + '();'); };
    const mesh = new T.Mesh(geometry, material); root.add(mesh);
    return { root, mesh, geometry, material };
  }
  return {
    version: '1.0.0', ids: Object.keys(STUB_INFO), info,
    create(T, id) { const i = info(id), b = body(T, id, i.lengthM); return { root: b.root, radius: i.lengthM / 2, update() {}, dispose() { b.geometry.dispose(); b.material.dispose(); } }; },
    createSchool(T, id, count) {
      const i = info(id), root = new T.Group(), geometry = new T.SphereGeometry(i.lengthM / 2, 6, 4), material = new T.MeshStandardMaterial();
      for (let k = 0; k < count; k++) { const m = new T.Mesh(geometry, material); m.position.set(k * 0.2, 0, 0); root.add(m); }
      return { root, radius: 0.6, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    }
  };
}
function trackingThree() {
  const created = [], disposed = new Set(), T = { ...THREE };
  for (const [name, value] of Object.entries(THREE)) {
    if (typeof value !== 'function' || !value.prototype) continue;
    if (!(value.prototype.isBufferGeometry || value.prototype.isMaterial || value.prototype.isTexture)) continue;
    T[name] = class extends value { constructor(...args) { super(...args); created.push(this); } dispose() { disposed.add(this); return super.dispose(); } };
  }
  return { T, created, disposed, leaked: () => created.filter((r) => !disposed.has(r)).map((r) => r.type) };
}
const LIB = { MeshStandardMaterial: 'standard', MeshPhysicalMaterial: 'physical', MeshBasicMaterial: 'basic', PointsMaterial: 'points', LineBasicMaterial: 'basic', LineDashedMaterial: 'dashed', MeshDepthMaterial: 'depth' };
// A WebGL context stand-in. Links finish `linkPolls` COMPLETION_STATUS_KHR queries
// after creation; any other query on an unfinished program is a read that would
// have waited for the driver, and is recorded in `waited`.
function fakeGL({ parallel = true, linkPolls = 3 } = {}) {
  const gl = {
    COMPILE_STATUS: 0x8B81, LINK_STATUS: 0x8B82, waited: [], programs: [], completionQueries: 0,
    getExtension(name) { return parallel && name === 'KHR_parallel_shader_compile' ? { COMPLETION_STATUS_KHR: 0x91B1 } : null; },
    link(source) { const p = { polls: 0, broken: source.includes(BROKEN), shader: { broken: source.includes(BROKEN) } }; gl.programs.push(p); return p; },
    read(p) { if (p.polls < linkPolls) gl.waited.push(p); p.polls = Infinity; },
    getProgramParameter(p, pname) {
      if (pname === 0x91B1) { gl.completionQueries++; p.polls++; return p.polls > linkPolls; }
      gl.read(p); return pname === gl.LINK_STATUS ? !p.broken : 0;
    },
    getProgramInfoLog(p) { return p.broken ? 'Fragment shader is not compiled.\u0000' : ''; },
    getShaderParameter(s) { return !s.broken; },
    getShaderInfoLog(s) { return s.broken ? "ERROR: 0:1: '" + BROKEN + "' : undeclared identifier\n\u0000" : ''; },
    isContextLost() { return false; }
  };
  return gl;
}
function renderers(counts, gl, hooks) {
  class Renderer {
    constructor(params) { hooks.renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio(ratio) { this.pixelRatio = ratio; } setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { counts.render++; if (counts.events) counts.events.push('render'); this.scene = scene; this.camera = camera; }
    dispose() { counts.dispose++; } forceContextLoss() { counts.forceContextLoss++; }
  }
  if (!gl) return Renderer;
  return class GpuRenderer extends Renderer {
    constructor(params) { super(params); this.debug = { checkShaderErrors: true }; this.info.programs = []; this.cache = new Map(); this.props = new Map(); this.uploaded = new Set(); }
    getContext() { return gl; }
    initTexture(t) { this.uploaded.add(t); }
    // r128 initMaterial, in its order: program created, linked, stored on the material; then the uniform read.
    init(material, object) {
      const props = this.props.get(material) || { programs: new Map() }; this.props.set(material, props);
      const key = material.type + '|' + (object.isInstancedMesh ? 'i' : '') + '|' + (material.customProgramCacheKey ? material.customProgramCacheKey() : '');
      let program = props.programs.get(key);
      if (program && props.current === program) return program;
      if (!program) {
        program = this.cache.get(key);
        if (!program) {
          const lib = THREE.ShaderLib[LIB[material.type]] || {};
          const shader = { uniforms: {}, vertexShader: material.vertexShader || lib.vertexShader || '', fragmentShader: material.fragmentShader || lib.fragmentShader || '' };
          material.onBeforeCompile(shader, this);
          const gp = gl.link(shader.vertexShader + shader.fragmentShader);
          program = { name: material.type, cacheKey: key, program: gp, vertexShader: { broken: false }, fragmentShader: gp.shader, getUniforms() { gl.read(gp); return { seq: [] }; } };
          if (this.debug.checkShaderErrors) gl.getProgramParameter(gp, gl.LINK_STATUS);
          this.cache.set(key, program); this.info.programs.push(program);
        }
        props.programs.set(key, program);
      }
      program.getUniforms();
      props.current = program;
      return program;
    }
    each(scene, visit) { scene.traverse((o) => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => visit(x, o)); }); }
    compile(scene) { this.each(scene, (m, o) => this.init(m, o)); }
    render(scene, camera) {
      const visible = new Set(); scene.traverseVisible((o) => visible.add(o));
      this.each(scene, (m, o) => { if (visible.has(o)) this.init(m, o); });
      super.render(scene, camera);
    }
  };
}

const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

// Fake window with a manual clock: t.step() advances 50 ms and runs due timers and
// queued frames. Every clock read costs 10 ms, so work takes time and a staged
// load has to cut its tasks short.
function harness() {
  const frames = new Map(), timers = new Map(), errorsLogged = [];
  let serial = 0, timerSerial = 0, clock = 1000;
  const listenerLog = { canvas: new Map() };
  const local = {
    innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error(m) { errorsLogged.push(String(m)); } },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    performance: { now: () => (clock += 10) },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + (ms || 0) }); return id; },
    clearTimeout(id) { timers.delete(id); },
    ResizeObserver: class { observe() {} disconnect() { this.off = true; } },
    addEventListener() {}, removeEventListener() {}
  };
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  const add = canvas.addEventListener.bind(canvas), remove = canvas.removeEventListener.bind(canvas);
  canvas.addEventListener = (type, fn, o) => { listenerLog.canvas.set(fn, type); add(type, fn, o); };
  canvas.removeEventListener = (type, fn, o) => { listenerLog.canvas.delete(fn); remove(type, fn, o); };
  document.body.appendChild(canvas);
  const h = {
    local, canvas, frames, timers, errorsLogged, listenerLog,
    advance(ms) { clock += ms; },
    step(ms = 50) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
    },
    pending() { return frames.size + timers.size; }
  };
  cleanups.push(() => canvas.remove());
  return h;
}
function site(over = {}) {
  return { seed: 7, depthM: 9, health: { coralCover: 0.7, bleaching: 0.05, algae: 0.1 }, population: POP, restoration: { kind: 'reef_star', units: 4, yearsSince: 2 }, ...over };
}
function explore(options = {}, { gl = null, broken = null, T = THREE } = {}) {
  const h = harness(), events = [], counts = { render: 0, dispose: 0, forceContextLoss: 0, events }, hooks = {};
  new Function('window', EXPLORE)(h.local);
  h.local.Reef3DSpecies = stubSpecies(broken);
  const states = [], errors = [], progress = [];
  const controller = h.local.Reef3DExplore.mount(h.canvas, {
    quality: 'low', site: site(), onState: (s) => { states.push(s); if (s.ready) events.push('ready'); }, onError: (e) => errors.push(e), onProgress: (f) => { progress.push(f); if (f === 1) events.push('progress 1'); },
    ...options, THREE: { ...T, WebGLRenderer: renderers(counts, gl, hooks) }
  });
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} });
  return Object.assign(h, { controller, counts, states, errors, progress, events, hooks, get renderer() { return hooks.renderer; } });
}
// Steps the clock until the controller reports ready; returns the number of tasks it took.
function untilReady(t, limit = 4000) {
  let n = 0;
  while (!t.controller.getState().ready && n < limit) { expect(t.counts.render, 'no frame is drawn before the reef is ready').toBe(0); t.step(); n++; }
  expect(t.controller.getState().ready, 'ready within ' + limit + ' steps').toBe(true);
  expect(t.counts.render).toBeGreaterThanOrEqual(1);
  return n;
}
const r4 = (v) => Math.round(v * 1e4) / 1e4;
function fingerprint(scene) {
  const out = [];
  scene.traverse((o) => {
    if (o.userData && o.userData.exploreUid) out.push(o.userData.exploreUid + ':' + o.position.toArray().map(r4).join(','));
    if (o.isInstancedMesh) out.push(o.name + ':' + o.count + ':' + (o.userData.instances || 0));
  });
  return out.sort().join('|');
}

describe('Reef3DExplore staged loading', () => {
  it('returns at once, builds over many short tasks, and is ready only with its first drawn frame', () => {
    const t = explore({ staged: true });
    expect(t.controller.getState().ready).toBe(false);
    expect(t.counts.render).toBe(0);
    expect(t.progress).toEqual([]);
    const tasks = untilReady(t);
    expect(tasks, 'the build is split into many tasks').toBeGreaterThan(8);
    // The first real frame comes first; ready and progress 1 follow it at once.
    expect(t.events.slice(0, 3)).toEqual(['render', 'progress 1', 'ready']);
    expect(t.progress.at(-1)).toBe(1);
    expect(t.states.at(-1).ready).toBe(true);
    expect(t.states.filter((s) => s.ready).length).toBe(1);
    // The loop runs afterwards, as after a plain mount.
    t.step(); t.step();
    expect(t.counts.render).toBeGreaterThan(1);
    expect(t.errors).toEqual([]);
  });

  it('reports monotonic progress from 0 to 1 and builds the same reef as a plain mount', () => {
    const staged = explore({ staged: true });
    untilReady(staged);
    const p = staged.progress;
    expect(p.length).toBeGreaterThan(5);
    p.forEach((v, i) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); if (i) expect(v, 'monotonic at ' + i).toBeGreaterThan(p[i - 1]); });
    expect(p.at(-1)).toBe(1);
    expect(p.slice(0, -1).every((v) => v < 1), 'only the drawn frame reports 1').toBe(true);
    const plain = explore({});
    expect(plain.controller.getState().ready).toBe(true);
    expect(plain.counts.render).toBe(1);
    expect(plain.progress, 'a plain mount reports 1 once').toEqual([1]);
    expect(fingerprint(staged.renderer.scene)).toBe(fingerprint(plain.renderer.scene));
    expect(staged.controller.getState().diver).toEqual(plain.controller.getState().diver);
  });

  it('frees everything, leaves no timer or frame, and never throws when disposed at any point of the load', () => {
    const probe = explore({ staged: true }), total = untilReady(probe);
    const points = [0, 1, 2, 3, 5, 8, Math.floor(total / 3), Math.floor(total / 2), total - 2, total - 1].filter((k, i, a) => k >= 0 && k < total && a.indexOf(k) === i);
    expect(points.length).toBeGreaterThan(6);
    for (const k of points) {
      const tr = trackingThree(), t = explore({ staged: true }, { T: tr.T });
      for (let i = 0; i < k; i++) t.step();
      const ctl = t.controller;
      // Every control works (or quietly waits) while loading.
      expect(() => { ctl.setInput({ forward: 1 }); ctl.setPaused(false); ctl.focusNext(); ctl.focusPrevious(); ctl.swimTo('r1'); ctl.focus('r2'); ctl.clearFocus(); ctl.resize(); ctl.getState(); }, 'controls at step ' + k).not.toThrow();
      expect(ctl.getState().ready).toBe(false);
      expect(() => ctl.dispose(), 'dispose at step ' + k).not.toThrow();
      expect(t.pending(), 'timers and frames left at step ' + k).toBe(0);
      expect(t.listenerLog.canvas.size, 'listeners left at step ' + k).toBe(0);
      expect(tr.leaked(), 'resources left at step ' + k).toEqual([]);
      expect(t.counts.dispose).toBe(1);
      for (let i = 0; i < 20; i++) t.step();
      expect(t.counts.render, 'nothing drawn after dispose at step ' + k).toBe(0);
      expect(t.errors).toEqual([]);
      expect(() => ctl.dispose()).not.toThrow();
      expect(ctl.getState().ready).toBe(false);
    }
  });

  it('keeps a view, pause or swim input given while loading and applies it with the first frame', () => {
    const t = explore({ staged: true, view: 'third' });
    // A resize before the mask exists (the ResizeObserver fires early) must still size it.
    t.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 450 });
    t.controller.resize();
    for (let i = 0; i < 4; i++) t.step();
    t.controller.setView('first');
    t.controller.setPaused(true);
    expect(t.controller.focusNext()).toBe(null);
    expect(t.controller.swimTo('r1')).toBe(false);
    untilReady(t);
    const s = t.controller.getState();
    expect(s).toMatchObject({ ready: true, view: 'first', paused: true });
    expect(t.renderer.scene.getObjectByName('reef-explore-mask').visible).toBe(true);
    expect(t.renderer.scene.getObjectByName('reef-explore-mask').material.uniforms.aspect.value).toBe(2);
    expect(t.renderer.scene.getObjectByName('reef-explore-diver').visible).toBe(false);
    // Pausing while loading still gives the first frame of a plain mount (diver posed, mask view camera).
    const plain = explore({ view: 'first' });
    plain.controller.setPaused(true);
    expect(t.renderer.scene.getObjectByName('reef-explore-diver').position.toArray()).toEqual(plain.renderer.scene.getObjectByName('reef-explore-diver').position.toArray());
    expect(t.renderer.camera.position.toArray()).toEqual(plain.renderer.camera.position.toArray());
    expect(t.renderer.camera.quaternion.toArray()).toEqual(plain.renderer.camera.quaternion.toArray());
    t.controller.setPaused(false);
    t.controller.setInput({ forward: 1 });
    const before = t.controller.getState().diver;
    for (let i = 0; i < 20; i++) t.step();
    const after = t.controller.getState().diver;
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.2);
    expect(t.controller.focusNext()).not.toBe(null);
  });

  it('lets every program link in parallel: no uniform read waits for an unfinished link, and the frame waits for all of them', () => {
    const gl = fakeGL({ parallel: true, linkPolls: 3 });
    const t = explore({ staged: true }, { gl });
    const tasks = untilReady(t);
    expect(tasks).toBeGreaterThan(8);
    expect(gl.programs.length, 'programs created').toBeGreaterThan(6);
    expect(t.renderer.info.programs.length).toBe(gl.programs.length);
    expect(gl.waited.length, 'reads that would have waited for the driver').toBe(0);
    expect(gl.completionQueries).toBeGreaterThanOrEqual(gl.programs.length);
    // Linking moves the bar too, and never backwards.
    t.progress.forEach((v, i) => { if (i) expect(v, 'monotonic at ' + i).toBeGreaterThan(t.progress[i - 1]); });
    expect(t.progress.at(-1)).toBe(1);
    // The first frame used the programs made while loading; three's own check is back on.
    expect(t.events[0]).toBe('render');
    expect(t.renderer.debug.checkShaderErrors).toBe(true);
    expect(t.renderer.uploaded.size, 'textures uploaded before the first frame').toBeGreaterThan(0);
    expect(t.errors).toEqual([]);
  });

  it('still loads without the parallel extension, one object at a time', () => {
    const gl = fakeGL({ parallel: false });
    const t = explore({ staged: true }, { gl });
    untilReady(t);
    expect(gl.programs.length).toBeGreaterThan(6);
    expect(t.events[0]).toBe('render');
    expect(t.errors).toEqual([]);
  });

  it('reports a shader that does not link through onError, with the driver log', () => {
    const gl = fakeGL({ parallel: true, linkPolls: 2 });
    const t = explore({ staged: true }, { gl, broken: 'lionfish' });
    for (let n = 0; n < 4000 && !t.errors.length; n++) t.step();
    expect(t.errors).toHaveLength(1);
    expect(t.errors[0]).toBeInstanceOf(Error);
    expect(t.errors[0].message).toMatch(/could not build 1 of its shaders/);
    expect(t.errors[0].message).toContain("'" + BROKEN + "' : undeclared identifier");
    expect(t.errorsLogged.join('\n')).toContain(BROKEN);
    expect(t.errorsLogged.join('\n')).toContain('Fragment shader is not compiled.');
  });

  it('stops loading and reports a failed build step', () => {
    const tr = trackingThree(), t = explore({ staged: true }, { T: tr.T });
    t.local.Reef3DSpecies.create = () => { throw new Error('boom'); };
    t.local.Reef3DSpecies.createSchool = () => { throw new Error('boom'); };
    // A species error falls back to a placeholder, as on a plain mount; a broken step is fatal.
    t.renderer.setSize = () => { throw new Error('canvas gone'); };
    for (let n = 0; n < 4000 && !t.errors.length; n++) t.step();
    expect(t.errors).toHaveLength(1);
    expect(t.errors[0].message).toMatch(/could not start the 3D reef dive.*canvas gone/);
    expect(t.controller.getState().ready).toBe(false);
    expect(t.pending()).toBe(0);
    expect(tr.leaked()).toEqual([]);
  });
});

function survey(options = {}, { gl = null, T = THREE } = {}) {
  const h = harness(), counts = { render: 0, dispose: 0, forceContextLoss: 0 }, hooks = {};
  new Function('window', HABITAT)(h.local);
  new Function('window', ENGINE)(h.local);
  const points = [];
  for (let i = 0; i < 40; i++) points.push({ distanceM: i * 0.5, category: ['hard_coral', 'rock', 'sand', 'macroalgae'][i % 4], coralForm: i % 4 === 0 ? 'branching' : undefined });
  const layout = { lengthM: 20, beltHalfWidthM: 2.5, depthM: 8, points, fish: [{ id: 'f1', family: 'parrotfish', alongM: 3, offsetM: 0.5, heightM: 0.6 }, { id: 'f2', family: 'grouper', alongM: 9, offsetM: -1, heightM: 0.8 }], background: { coralCover: 0.4, bleaching: 0.1, algae: 0.3 } };
  const states = [], errors = [], progress = [];
  const controller = h.local.Reef3D.mount(h.canvas, { quality: 'low', seed: 4, layout, onState: (s) => states.push(s), onError: (e) => errors.push(e), onProgress: (f) => progress.push(f), ...options, THREE: { ...T, WebGLRenderer: renderers(counts, gl, hooks) } });
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} });
  return Object.assign(h, { controller, counts, states, errors, progress, hooks, get renderer() { return hooks.renderer; } });
}

describe('Reef3D (survey view) staged loading', () => {
  it('is ready only with its first frame, keeps the point chosen while loading, and reports progress to 1', () => {
    const gl = fakeGL({ parallel: true, linkPolls: 3 });
    const t = survey({ staged: true }, { gl });
    expect(t.controller.getState().ready).toBe(false);
    t.controller.goToPoint(7);
    t.controller.setCameraMode('overview');
    t.controller.setCameraMode('diver');
    expect(t.controller.getState().pointIndex).toBe(7);
    untilReady(t);
    expect(t.controller.getState()).toMatchObject({ ready: true, pointIndex: 7, highlightIndex: 7, cameraMode: 'diver' });
    const ring = t.renderer.scene.getObjectByName('reef-highlight');
    expect(ring.visible).toBe(true);
    expect(ring.children[0].position.x).toBeCloseTo(3.5, 6);
    expect(gl.waited.length).toBe(0);
    expect(t.progress.at(-1)).toBe(1);
    t.progress.forEach((v, i) => { if (i) expect(v).toBeGreaterThan(t.progress[i - 1]); });
    expect(t.errors).toEqual([]);
    const plain = survey({});
    expect(plain.controller.getState().ready).toBe(true);
    expect(plain.progress).toEqual([1]);
  });

  it('frees everything when disposed while loading', () => {
    for (const k of [0, 1, 2, 3, 4]) {
      const tr = trackingThree(), t = survey({ staged: true }, { T: tr.T, gl: fakeGL() });
      for (let i = 0; i < k; i++) t.step();
      expect(() => { t.controller.goToPoint(3); t.controller.highlightPoint(2); t.controller.setPaused(true); t.controller.resize(); }).not.toThrow();
      expect(() => t.controller.dispose()).not.toThrow();
      expect(t.pending(), 'step ' + k).toBe(0);
      expect(t.listenerLog.canvas.size).toBe(0);
      expect(tr.leaked(), 'step ' + k).toEqual([]);
      for (let i = 0; i < 10; i++) t.step();
      expect(t.counts.render).toBe(0);
      expect(t.errors).toEqual([]);
    }
  });
});
