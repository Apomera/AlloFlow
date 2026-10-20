import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Lane G1: the dive light (setLight, the L key, getState().light, shared torch
// uniforms that add no shader program) and the direction cues on nearby and
// focused organisms (bearingDeg from the heading, positive to the right; riseM).
// Real three r128 with a stubbed WebGLRenderer, as in tests/reef_3d_explore.test.js.
vi.setConfig({ testTimeout: 60000 });

// Tests run from the repo root (like every 'stem_lab/...' path in this suite).
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const THREE = createRequire(import.meta.url)(REPO + '/vendor/three-r128/three.min.js');
const SOURCE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const POP = [
  { id: 'clownfish', count: 4 }, { id: 'magnificent_anemone', count: 2 }, { id: 'blue_tang', count: 2 }, { id: 'brain_coral', count: 6 },
  { id: 'staghorn_coral', count: 4 }, { id: 'green_turtle', count: 2 }, { id: 'parrotfish', count: 3 }, { id: 'sea_fan', count: 3 },
  { id: 'barrel_sponge', count: 2 }, { id: 'lionfish', count: 1 }, { id: 'anthias', count: 2 }, { id: 'giant_clam', count: 2 }
];
const STUB_INFO = {
  clownfish: ['fish', 'pair', 0.09, [1, 15], null], magnificent_anemone: ['invertebrate', 'sessile', 0.6, [1, 20], null],
  blue_tang: ['fish', 'school', 0.25, [2, 25], [6, 16]], brain_coral: ['coral', 'sessile', 1.0, [1, 25], null],
  staghorn_coral: ['coral', 'sessile', 1.2, [1, 20], null], green_turtle: ['reptile', 'solitary', 1.0, [1, 30], null],
  parrotfish: ['fish', 'solitary', 0.45, [1, 25], null], sea_fan: ['invertebrate', 'sessile', 1.0, [4, 40], null],
  barrel_sponge: ['invertebrate', 'sessile', 1.0, [6, 40], null], lionfish: ['fish', 'hover', 0.32, [2, 30], null],
  anthias: ['fish', 'school', 0.1, [3, 30], [18, 44]], giant_clam: ['invertebrate', 'sessile', 0.9, [1, 20], null],
  reef_star: ['structure', 'sessile', 1.0, [1, 20], null]
};
function stubSpecies() {
  function info(id) {
    const r = STUB_INFO[id]; if (!r) return null;
    return { id, group: r[0], habit: r[1], lengthM: r[2], depthM: r[3].slice(), schoolSize: r[4] ? r[4].slice() : null };
  }
  return {
    version: '1.0.0', ids: Object.keys(STUB_INFO), info,
    create(T, id) {
      const i = info(id), root = new T.Group(), geometry = new T.SphereGeometry(Math.max(0.02, i.lengthM / 2), 8, 6), material = new T.MeshStandardMaterial({ color: 0xff8844 });
      const mesh = new T.Mesh(geometry, material); root.userData.speciesId = id; mesh.userData.speciesId = id; root.add(mesh);
      if (i.group === 'coral' || i.group === 'structure') mesh.position.y = i.lengthM / 2;
      return { root, radius: i.lengthM / 2, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    },
    createSchool(T, id, count) {
      const i = info(id), root = new T.Group(), geometry = new T.SphereGeometry(i.lengthM / 2, 6, 4), material = new T.MeshStandardMaterial();
      root.userData.speciesId = id;
      for (let k = 0; k < count; k++) { const m = new T.Mesh(geometry, material); m.position.set((k % 5) * 0.2 - 0.4, Math.floor(k / 5) * 0.15, (k % 3) * 0.2); m.userData.speciesId = id; root.add(m); }
      return { root, radius: 0.6, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    }
  };
}
const site = (over = {}) => ({ seed: 7, depthM: 9, health: { coralCover: 0.7, bleaching: 0.05, algae: 0.1 }, population: POP, restoration: { kind: 'reef_star', units: 6, yearsSince: 2 }, ...over });

const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

function runtime(options = {}) {
  const frames = new Map(), timers = new Map();
  let serial = 0, timerSerial = 0, clock = 1000, renderer = null;
  class Renderer {
    constructor() { renderer = this; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio() {} setSize() {}
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
    ResizeObserver: class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} },
    addEventListener() {}, removeEventListener() {}
  };
  new Function('window', SOURCE)(local);
  local.Reef3DSpecies = stubSpecies();
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const states = [], errors = [];
  const controller = local.Reef3DExplore.mount(canvas, { quality: 'low', site: site(), onState: (s) => states.push(s), onError: (e) => errors.push(e), ...options, THREE: { ...THREE, WebGLRenderer: Renderer } });
  const t = {
    canvas, controller, states, errors,
    get renderer() { return renderer; }, get scene() { return renderer.scene; },
    step(ms = 50) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
    },
    run(seconds) { for (let i = 0; i < seconds * 20; i++) t.step(50); },
    key(key, extra = {}) { const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }); canvas.dispatchEvent(e); return e; }
  };
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return t;
}
// Every organism once, with its world centre (the stub meshes are spheres).
function census(t) {
  const out = new Map(), box = new THREE.Box3(), c = new THREE.Vector3(), m = new THREE.Matrix4();
  t.scene.traverse((o) => {
    if (o.userData && o.userData.exploreUid && !out.has(o.userData.exploreUid)) {
      o.updateMatrixWorld(true); box.setFromObject(o); box.getCenter(c);
      out.set(o.userData.exploreUid, { uid: o.userData.exploreUid, speciesId: o.userData.speciesId, center: c.clone() });
    }
    // Instanced groups keep every member's matrix.
    if (o.isInstancedMesh && o.userData.exploreUids) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const local = o.geometry.boundingBox.getCenter(new THREE.Vector3());
      o.userData.exploreUids.forEach((uid, i) => { if (!out.has(uid)) out.set(uid, { uid, speciesId: o.userData.speciesId, center: local.clone().applyMatrix4(m.fromArray(o.userData.exploreMatrices, i * 16)) }); });
    }
  });
  return [...out.values()];
}
// The uniforms a material's patch binds, and its fragment source, compiled the way three does.
function compile(material, t) {
  const lib = material.isMeshStandardMaterial ? THREE.ShaderLib.standard : material.isPoints || material.isPointsMaterial ? THREE.ShaderLib.points : THREE.ShaderLib.basic;
  const shader = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
  material.onBeforeCompile(shader, t.renderer);
  return shader;
}
function sceneMaterials(t) {
  const set = new Set();
  t.scene.traverse((o) => { (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => set.add(m)); });
  return [...set];
}
const fwd = (deg) => { const b = deg * Math.PI / 180; return new THREE.Vector3(Math.sin(b), 0, -Math.cos(b)); };
const gap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
// The tool's words: ahead within 45 degrees, behind from 135, above or below from 1.5 m.
const side = (n) => { const a = Math.abs(n.bearingDeg); return a < 45 ? 'ahead' : a >= 135 ? 'behind' : n.bearingDeg > 0 ? 'right' : 'left'; };
const words = (n) => side(n) + (n.riseM >= 1.5 ? '+up' : n.riseM <= -1.5 ? '+down' : '');

describe('dive light: controller, key and state', () => {
  it('starts off, switches with setLight and the L key, and reports every change through onState', () => {
    const t = runtime();
    expect(typeof t.controller.setLight).toBe('function');
    expect(t.controller.getState().light).toBe(false);
    const mark = t.states.length;
    t.controller.setLight(true); t.run(0.3);
    expect(t.controller.getState().light).toBe(true);
    expect(t.states.slice(mark).some((s) => s.light === true), 'an onState call carries the change').toBe(true);
    const e = t.key('l');
    expect(e.defaultPrevented).toBe(true);
    expect(t.controller.getState().light).toBe(false);
    t.key('L', { shiftKey: true }); expect(t.controller.getState().light).toBe(true);
    t.key('l', { repeat: true }); expect(t.controller.getState().light, 'a held key does not flicker it').toBe(true);
    t.key('l', { ctrlKey: true }); expect(t.controller.getState().light, 'browser shortcuts are not ours').toBe(true);
    t.run(0.3);
    expect(t.states.at(-1).light).toBe(true);
    // Even while paused, a change is a state change.
    t.controller.setPaused(true); t.run(0.5); const quiet = t.states.length;
    t.controller.setLight(false); t.run(0.5);
    expect(t.states.length).toBeGreaterThan(quiet);
    expect(t.states.at(-1).light).toBe(false);
    expect(t.errors).toEqual([]);
  });

  it('can start lit (options.light) and survives setLight after dispose', () => {
    const t = runtime({ light: true });
    expect(t.controller.getState().light).toBe(true);
    t.controller.dispose();
    expect(() => t.controller.setLight(false)).not.toThrow();
  });
});

describe('dive light: shared shader parts', () => {
  for (const quality of ['low', 'high']) {
    it(quality + ': every lit reef material carries the torch through one set of uniforms, and switching it changes no program', () => {
      const t = runtime({ quality });
      // three keys a program by the cache key and the defines; neither may follow the light.
      const programKey = (m) => m.customProgramCacheKey() + '|' + JSON.stringify(m.defines || {}) + '|' + JSON.stringify(m.extensions || {});
      const before = sceneMaterials(t), keysBefore = before.map(programKey);
      const lit = [], sources = new Map();
      for (const m of before) {
        if (typeof m.onBeforeCompile !== 'function' || !(m.isMeshStandardMaterial || m.isPointsMaterial)) continue;
        const shader = compile(m, t);
        sources.set(m, shader.vertexShader + shader.fragmentShader);
        if (shader.uniforms.reefWaterExtinction) lit.push({ m, shader });
        if (m.isPointsMaterial && shader.uniforms.reefSnowCenter) lit.push({ m, shader, snow: true });
      }
      // Floor, bommies, corals, plants, decor and every organism share the water column, so all of them share the torch.
      expect(lit.filter((x) => !x.snow).length).toBeGreaterThan(8);
      expect(lit.some((x) => x.snow), 'marine snow catches the beam').toBe(true);
      const torch = lit[0].shader.uniforms.reefTorch;
      expect(torch && torch.value.isVector4).toBe(true);
      for (const { m, shader, snow } of lit) {
        expect(shader.uniforms.reefTorch, m.name || m.type).toBe(torch);
        expect(shader.uniforms.reefTorchPos).toBe(lit[0].shader.uniforms.reefTorchPos);
        expect(shader.uniforms.reefTorchDir).toBe(lit[0].shader.uniforms.reefTorchDir);
        if (snow) { expect(shader.vertexShader).toContain('vReefSnowTorch'); continue; }
        expect(shader.fragmentShader).toContain('reefTorchBeam');
        // The beam lights the true colour: the depth absorption is undone for it alone.
        expect(shader.fragmentShader).toMatch(/reefTorchAlbedo=material\.diffuseColor\/mix\(vec3\(1\.0\),exp\(-vec3\(0\.065,0\.018,0\.008\)/);
        // After the sun's caustics, inside the lighting, before the water column mixes in.
        const at = shader.fragmentShader.indexOf('reefTorchBeam');
        expect(at).toBeGreaterThan(shader.fragmentShader.indexOf('#include <lights_fragment_end>'));
        expect(at).toBeLessThan(shader.fragmentShader.indexOf('reefTransmission'));
        // A uniform switches it; no #define depends on the light.
        expect(shader.fragmentShader).toContain('if(reefTorch.x>0.0)');
        expect(shader.fragmentShader.includes('#define REEF_TORCH_SPECULAR')).toBe(quality === 'high');
      }
      expect(torch.value.x).toBe(0);
      t.controller.setLight(true); t.step(); t.step();
      expect(torch.value.x).toBeGreaterThan(0);
      const after = sceneMaterials(t);
      expect(after.length, 'no material added').toBe(before.length);
      expect(after.every((m) => before.includes(m))).toBe(true);
      expect(after.map(programKey)).toEqual(keysBefore);
      for (const [m, src] of sources) { const s = compile(m, t); expect(s.vertexShader + s.fragmentShader, 'same program source').toBe(src); }
      t.controller.setLight(false); t.step();
      expect(torch.value.x).toBe(0);
    });
  }

  it('aims from the mask along the gaze in the first view, and from the diver\'s head down toward the reef in the third', () => {
    const t = runtime({ light: true, reducedMotion: true });
    t.run(0.5);
    const floor = t.scene.getObjectByName('reef-explore-floor'), u = compile(floor.material, t).uniforms;
    const diver = t.scene.getObjectByName('reef-explore-diver'), head = diver.localToWorld(new THREE.Vector3(0.74, 0.09, 0));
    expect(u.reefTorchPos.value.distanceTo(head), 'third view: at the head').toBeLessThan(0.05);
    const dir = u.reefTorchDir.value, heading = fwd(t.controller.getState().diver.headingDeg);
    expect(dir.length()).toBeCloseTo(1, 5);
    expect(dir.y, 'angled down toward the reef').toBeLessThan(-0.3);
    expect(new THREE.Vector2(dir.x, dir.z).normalize().dot(new THREE.Vector2(heading.x, heading.z)), 'the way the diver faces').toBeGreaterThan(0.95);
    t.controller.setView('first'); t.run(0.5);
    const cam = t.renderer.camera, look = cam.getWorldDirection(new THREE.Vector3());
    expect(u.reefTorchPos.value.distanceTo(cam.position), 'first view: at the mask').toBeLessThan(0.12);
    expect(u.reefTorchDir.value.dot(look), 'along the gaze').toBeGreaterThan(0.97);
    // It follows the diver as the diver swims.
    const from = u.reefTorchPos.value.clone();
    t.controller.setInput({ forward: 1 }); t.run(1.5); t.controller.setInput(null); t.run(0.2);
    expect(u.reefTorchPos.value.distanceTo(from)).toBeGreaterThan(0.5);
    expect(u.reefTorchPos.value.distanceTo(t.renderer.camera.position)).toBeLessThan(0.12);
  });
});

describe('direction cues', () => {
  it('adds bearingDeg (-180..180) and riseM to every nearby entry and to the focus', () => {
    const t = runtime();
    t.run(0.5);
    const s = t.controller.getState();
    expect(s.nearby.length).toBeGreaterThan(2);
    for (const n of [...s.nearby]) {
      expect(Object.keys(n).sort()).toEqual(['bearingDeg', 'distanceM', 'health', 'inView', 'riseM', 'speciesId', 'uid']);
      expect(['healthy', 'bleached', 'dead']).toContain(n.health);
      expect(Number.isInteger(n.bearingDeg)).toBe(true);
      expect(n.bearingDeg).toBeGreaterThanOrEqual(-180); expect(n.bearingDeg).toBeLessThanOrEqual(180);
      expect(Number.isFinite(n.riseM)).toBe(true);
    }
    t.controller.focus(s.nearby[0].uid);
    const f = t.controller.getState().focused;
    expect(f).toMatchObject({ uid: s.nearby[0].uid, bearingDeg: expect.any(Number), riseM: expect.any(Number), health: s.nearby[0].health });
    expect(['healthy', 'bleached', 'dead']).toContain(f.health);
    // On a fully bleached reef every coral colony reports it; a fish stays healthy.
    const pale = runtime({ site: site({ health: { coralCover: 0.5, bleaching: 1, algae: 0 }, restoration: null }) });
    const all = census(pale), coral = all.find((o) => o.speciesId === 'brain_coral'), fish = all.find((o) => o.speciesId === 'parrotfish');
    pale.controller.focus(coral.uid); expect(pale.controller.getState().focused.health).toBe('bleached');
    pale.controller.focus(fish.uid); expect(pale.controller.getState().focused.health).toBe('healthy');
  });

  it('what lies ahead moves to the left as the diver turns right, then behind, then to the right', () => {
    const t = runtime({ reducedMotion: true });
    const target = census(t).filter((o) => o.speciesId === 'brain_coral').sort((a, b) => a.uid.localeCompare(b.uid))[0];
    t.controller.swimTo(target.uid); t.run(12);
    const start = t.controller.getState();
    expect(Math.abs(start.focused.bearingDeg), 'after swimming to it, it is ahead').toBeLessThan(30);
    expect(side(start.focused)).toBe('ahead');
    const h0 = start.diver.headingDeg;
    // Turn right (positive input) in steps; read the focus at about 90, 180 and 270 degrees.
    const seen = {};
    t.controller.setInput({ turn: 1 });
    for (let i = 0; i < 400 && Object.keys(seen).length < 3; i++) {
      t.step(50);
      const s = t.controller.getState(), turned = (s.diver.headingDeg - h0 + 360) % 360;
      for (const mark of [90, 180, 270]) if (!seen[mark] && turned >= mark && turned < mark + 20) seen[mark] = { turned, f: s.focused };
    }
    t.controller.setInput(null);
    expect(Object.keys(seen).sort()).toEqual(['180', '270', '90']);
    expect(side(seen[90].f), 'a quarter turn right puts it on the left: ' + seen[90].f.bearingDeg).toBe('left');
    expect(seen[90].f.bearingDeg).toBeLessThan(-50);
    expect(side(seen[180].f), 'half a turn puts it behind: ' + seen[180].f.bearingDeg).toBe('behind');
    expect(side(seen[270].f), 'three quarters puts it on the right: ' + seen[270].f.bearingDeg).toBe('right');
    expect(seen[270].f.bearingDeg).toBeGreaterThan(50);
  });

  it('positive bearings are on the right of the mask view, negative on the left, and behind is behind the camera', () => {
    const t = runtime({ reducedMotion: true, view: 'first' });
    const centres = new Map(census(t).map((o) => [o.uid, o.center]));
    let checked = { right: 0, left: 0, behind: 0 };
    // Look from a few headings so that both sides and the back hold something.
    for (let turn = 0; turn < 6; turn++) {
      t.controller.setInput({ turn: 1 }); t.run(0.6); t.controller.setInput(null); t.run(1.5);
      t.controller.setPaused(true); t.step();
      const cam = t.renderer.camera; cam.updateMatrixWorld();
      for (const n of t.controller.getState().nearby) {
        const c = centres.get(n.uid); if (!c) continue;
        const local = cam.worldToLocal(c.clone());
        if (Math.abs(n.bearingDeg) >= 135) { expect(local.z, n.uid + ' behind: ' + n.bearingDeg).toBeGreaterThan(0); checked.behind++; continue; }
        if (Math.abs(n.bearingDeg) < 12 || Math.abs(n.bearingDeg) > 70 || local.z > -0.5) continue;
        const ndc = c.clone().project(cam);
        if (n.bearingDeg > 0) { expect(ndc.x, n.uid + ' at ' + n.bearingDeg).toBeGreaterThan(0); checked.right++; }
        else { expect(ndc.x, n.uid + ' at ' + n.bearingDeg).toBeLessThan(0); checked.left++; }
      }
      t.controller.setPaused(false);
    }
    expect(checked.right).toBeGreaterThan(0);
    expect(checked.left).toBeGreaterThan(0);
    expect(checked.behind).toBeGreaterThan(0);
  });

  it('riseM is the height above the diver\'s eyes: it falls as the diver rises', () => {
    const t = runtime({ reducedMotion: true });
    const target = census(t).filter((o) => o.speciesId === 'giant_clam')[0];
    t.controller.swimTo(target.uid); t.run(12);
    const a = t.controller.getState();
    expect(a.focused.riseM, 'a clam on the bottom is below the eyes').toBeLessThan(0);
    t.controller.setInput({ rise: 1 }); t.run(2); t.controller.setInput(null); t.run(1);
    const b = t.controller.getState(), climbed = b.diver.y - a.diver.y;
    expect(climbed).toBeGreaterThan(0.5);
    expect(b.focused.riseM - a.focused.riseM).toBeCloseTo(-climbed, 0);
    expect(Math.abs(b.focused.riseM - a.focused.riseM + climbed)).toBeLessThan(0.3);
  });

  it('a change in the words the tool would show reaches onState within a few hundred milliseconds', () => {
    // A quiet reef: fixed colonies and two swimmers, so most moments change nothing
    // but a swimmer's direction words. The diver holds still beside a coral.
    const quiet = [{ id: 'brain_coral', count: 6 }, { id: 'giant_clam', count: 3 }, { id: 'sea_fan', count: 3 }, { id: 'green_turtle', count: 1 }, { id: 'parrotfish', count: 2 }];
    const t = runtime({ site: site({ population: quiet, restoration: null }) });
    // Swim toward the turtle, stop (a touch of input ends the glide) and let it cruise on past.
    const turtle = census(t).find((o) => o.speciesId === 'green_turtle');
    t.controller.swimTo(turtle.uid); t.run(8); t.controller.setInput({ forward: 0.01 }); t.controller.setInput(null); t.controller.clearFocus(); t.run(0.5);
    const order = (s) => s.nearby.map((n) => n.uid + (n.inView ? '+' : '-')).join(',');
    const said = (s) => s.nearby.map((n) => words(n)).join(',');
    let changes = 0, lag = 0, worst = 0;
    for (let i = 0; i < 1200; i++) {
      t.step(50);
      const now = t.controller.getState(), told = t.states.at(-1);
      // Only the words differ: the same organisms, in the same order, equally in view.
      if (order(now) === order(told) && said(now) !== said(told)) { lag += 50; worst = Math.max(worst, lag); } else { if (lag) changes++; lag = 0; }
    }
    expect(changes, 'a swimmer changed its direction words').toBeGreaterThan(1);
    expect(worst, 'longest wait before the words were reported').toBeLessThanOrEqual(400);
  });
});
