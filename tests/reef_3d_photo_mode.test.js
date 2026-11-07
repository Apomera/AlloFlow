import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The reef photographer's engine half: real three r128 with a stubbed WebGLRenderer, as in
// tests/reef_3d_dive_light.test.js. checkFrame reads the scene; it must agree with the lens,
// the water and the light that draw it, and it must not change anything.
vi.setConfig({ testTimeout: 60000 });

const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const THREE = createRequire(import.meta.url)(REPO + '/vendor/three-r128/three.min.js');
const SOURCE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const POP = [{ id: 'clownfish', count: 4 }, { id: 'magnificent_anemone', count: 2 }, { id: 'brain_coral', count: 6 }, { id: 'green_turtle', count: 2 }, { id: 'parrotfish', count: 3 }, { id: 'barrel_sponge', count: 2 }];
const STUB_INFO = {
  clownfish: ['fish', 'pair', 0.09, [1, 15], null], magnificent_anemone: ['invertebrate', 'sessile', 0.6, [1, 20], null], brain_coral: ['coral', 'sessile', 1.0, [1, 25], null],
  green_turtle: ['reptile', 'solitary', 1.0, [1, 30], null], parrotfish: ['fish', 'solitary', 0.45, [1, 25], null], barrel_sponge: ['invertebrate', 'sessile', 1.0, [6, 40], null], reef_star: ['structure', 'sessile', 1.0, [1, 20], null]
};
function stubSpecies() {
  const info = (id) => { const r = STUB_INFO[id]; return r ? { id, group: r[0], habit: r[1], lengthM: r[2], depthM: r[3].slice(), schoolSize: r[4] } : null; };
  return { version: '1.0.0', ids: Object.keys(STUB_INFO), info,
    create(T, id) {
      const i = info(id), root = new T.Group(), geometry = new T.SphereGeometry(Math.max(0.02, i.lengthM / 2), 8, 6), material = new T.MeshStandardMaterial({ color: 0xff8800 }), mesh = new T.Mesh(geometry, material);
      root.userData.speciesId = id; mesh.userData.speciesId = id; root.add(mesh);
      if (i.group === 'coral' || i.group === 'structure') mesh.position.y = i.lengthM / 2;
      return { root, radius: i.lengthM / 2, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    } };
}
const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });
function mount(options = {}) {
  const frames = new Map(), timers = new Map(); let serial = 0, timerSerial = 0, clock = 1000, renderer = null;
  class Renderer {
    constructor() { renderer = this; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; this.rendered = []; }
    setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    render(scene, camera) { this.rendered.push(scene.getObjectByName('reef-explore-mask')?.visible); this.scene = scene; this.camera = camera; }
    getContext() { return { isContextLost: () => false }; }
  }
  const local = { innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; }, cancelAnimationFrame(id) { frames.delete(id); }, performance: { now: () => clock },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; }, clearTimeout(id) { timers.delete(id); },
    ResizeObserver: class { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} }, addEventListener() {}, removeEventListener() {} };
  new Function('window', SOURCE)(local);
  local.Reef3DSpecies = stubSpecies();
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1190, height: 440 }); // the dive's real size on a laptop
  canvas.toDataURL = () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN2UAAAAASUVORK5CYII=';
  document.body.appendChild(canvas);
  const c = local.Reef3DExplore.mount(canvas, { quality: 'low', view: 'first', site: { seed: 7, depthM: 9, health: { coralCover: 0.7, bleaching: 0.05, algae: 0 }, population: POP, restoration: null }, onState() {}, onError() {}, ...options, THREE: { ...THREE, WebGLRenderer: Renderer } });
  const step = (n = 3) => { for (let i = 0; i < n; i++) { clock += 50; [...frames.entries()].forEach(([id, cb]) => { frames.delete(id); cb(clock); }); } };
  step(); cleanups.push(() => { c.dispose(); canvas.remove(); });
  return { c, step, get renderer() { return renderer; }, get scene() { return renderer.scene; } };
}
// Aim at each nearby organism until one is framed, clear and at least `min` metres off.
function aimAtFarSubject(t, min) {
  for (const n of t.c.getState().nearby) {
    t.c.focus(n.uid); t.c.lookAtFocused();
    const f = t.c.checkFrame(n.uid);
    if (f.subject && f.subject.uid === n.uid && f.subject.distanceM >= min) return { uid: n.uid, frame: f };
  }
  return null;
}

describe('photo mode', () => {
  it('hides the mask frame from the picture and brings it back', () => {
    const t = mount(), mask = () => t.scene.getObjectByName('reef-explore-mask');
    expect(mask().visible).toBe(true);
    t.c.setPhotoMode(true); expect(mask().visible).toBe(false); expect(t.c.getState().photoMode).toBe(true);
    t.c.setView('third'); t.c.setView('first'); expect(mask().visible).toBe(false);
    t.c.setPhotoMode(false); expect(mask().visible).toBe(true); expect(t.c.getState().photoMode).toBe(false);
  });

  it('keeps the lens while aiming, and only then, and puts it back on exit', () => {
    const t = mount();
    t.c.setMagnification(4); t.c.lookCamera(30, 0); expect(t.c.getState().magnification).toBe(1); // ordinary dive: looking restores the wide view
    t.c.setPhotoMode(true); t.c.setMagnification(4);
    t.c.lookCamera(30, 0); expect(t.c.getState().magnification).toBe(4);
    const uid = t.c.getState().nearby[0].uid;
    t.c.focus(uid); expect(t.c.getState().magnification).toBe(4);
    t.c.clearFocus(); expect(t.c.getState().magnification).toBe(4);
    t.c.setInput({ forward: 1 }); expect(t.c.getState().magnification).toBe(1); // swimming still restores it
    t.c.setInput(null);
    t.c.setMagnification(4); t.c.setPhotoMode(false); expect(t.c.getState().magnification).toBe(1);
  });

  it('leaves the selection ring out of the photograph only, in photo mode only', () => {
    const t = mount(), ringNow = () => [t.scene.getObjectByName('reef-explore-focus').visible];
    t.c.focus(t.c.getState().nearby[0].uid); t.step();
    const before = t.c.getState();
    expect(t.c.captureImage()).toMatch(/^data:image\/png/);
    t.c.setPhotoMode(true); t.step();
    const during = []; const render = t.renderer.render.bind(t.renderer);
    t.renderer.render = (scene, camera) => { during.push(ringNow()); render(scene, camera); };
    expect(t.c.captureImage()).toMatch(/^data:image\/png/);
    t.renderer.render = render;
    expect(during.length).toBe(1); expect(during[0].length).toBeGreaterThan(0); expect(during[0].every((v) => v === false)).toBe(true);
    expect(ringNow().some(Boolean)).toBe(true); // visible again for aiming
    expect(t.c.getState().focused.uid).toBe(before.focused.uid);
  });
});

describe('checkFrame', () => {
  it('changes nothing about the dive', () => {
    const t = mount(); t.c.setPhotoMode(true); t.step();
    const a = JSON.stringify(t.c.getState());
    for (let i = 0; i < 20; i++) t.c.checkFrame(null);
    expect(JSON.stringify(t.c.getState())).toBe(a);
  });

  it('zooming grows the subject and never brings its color back', () => {
    const t = mount(); t.c.setPhotoMode(true); t.c.setPaused(true);
    const hit = aimAtFarSubject(t, 3.6);
    expect(hit, 'a clear subject at least 3.6 m away').toBeTruthy();
    const rows = [1, 2, 4, 8].map((mag) => { t.c.setMagnification(mag); return t.c.checkFrame(hit.uid); });
    rows.forEach((r, i) => { expect(r.subject.uid).toBe(hit.uid); expect(r.redLeft).toBe(rows[0].redLeft); expect(r.checks.colour).toBe(false); if (i) expect(r.subject.fill).toBeGreaterThan(rows[i - 1].subject.fill); });
    const f = rows[3].subject.fill / rows[0].subject.fill; expect(f).toBeGreaterThan(7); expect(f).toBeLessThan(9);
  });

  it('computes red from the distance through the water the render uses', () => {
    const t = mount(); t.c.setPhotoMode(true); t.c.setPaused(true);
    const hit = aimAtFarSubject(t, 1);
    expect(hit).toBeTruthy();
    const { subject, redLeft } = hit.frame;
    expect(redLeft).toBeCloseTo(Math.exp(-0.065 * subject.distanceM), 1); // algae 0, so the site's murk multiplier is 1
    expect(hit.frame.checks.colour).toBe(redLeft >= 0.8);
  });

  // A test reef holds only a couple of organisms near the start, so these look across many reefs.
  function acrossReefs(algae, population, each) {
    for (let seed = 1; seed <= 24; seed++) {
      const t = mount({ site: { seed, depthM: 9, health: { coralCover: 0.7, bleaching: 0.05, algae }, population, restoration: null } });
      t.c.setPhotoMode(true); t.c.setPaused(true);
      for (const n of t.c.getState().nearby) { t.c.focus(n.uid); t.c.lookAtFocused(); each(t, n); }
    }
  }

  it('the dive light restores color inside its reach, and not past it', () => {
    // Murky water (algae 1) fades red sooner, so a subject can be faded yet still within the beam's reach.
    let rescued = 0, pastReach = 0;
    acrossReefs(1, POP, (t, n) => {
      t.c.setLight(false); const off = t.c.checkFrame(n.uid);
      if (off.subject?.uid !== n.uid) return;
      t.c.setLight(true); const on = t.c.checkFrame(n.uid);
      expect(on.redLeft).toBe(off.redLeft); // the light adds its own beam; it does not change the water
      if (on.subject.distanceM > 4.5) { pastReach++; expect(on.lit).toBe(false); expect(on.checks.colour).toBe(off.checks.colour); }
      else if (!off.checks.colour && on.subject.distanceM <= 4.3) { rescued++; expect(on.lit).toBe(true); expect(on.checks.colour).toBe(true); expect(on.stars).toBe(off.stars + 1); }
    });
    expect(rescued, 'faded subjects the light rescues').toBeGreaterThan(0);
    expect(pastReach, 'subjects past its reach').toBeGreaterThan(0);
  });

  it('the dive light follows its 30 degree beam as the camera turns', () => {
    const target = new THREE.Vector3(), forward = new THREE.Vector3();
    let inside = 0, outside = 0;
    acrossReefs(0, POP, (t, n) => {
      t.c.setLight(true);
      const first = t.c.checkFrame(n.uid);
      if (first.subject?.uid !== n.uid || first.subject.distanceM > 4.3 || first.subject.distanceM < 1) return;
      t.step(1); target.copy(t.scene.getObjectByName('reef-explore-focus').position);
      for (let i = 0; i < 60; i++) {
        const f = t.c.checkFrame(n.uid);
        if (f.subject?.uid !== n.uid) break;
        const camera = t.renderer.camera; camera.getWorldDirection(forward);
        const degrees = forward.angleTo(target.clone().sub(camera.position)) * 180 / Math.PI;
        if (degrees < 22) { inside++; expect(f.lit, degrees + ' degrees').toBe(true); }
        if (degrees > 38) { outside++; expect(f.lit, degrees + ' degrees').toBe(false); }
        t.c.lookCamera(4, 0);
      }
    });
    expect(inside, 'readings inside the beam').toBeGreaterThan(0);
    expect(outside, 'readings outside it, still in frame').toBeGreaterThan(0);
  });

  it('never frames a subject dead behind the camera, where the projection mirrors it into the middle', () => {
    const fwd = new THREE.Vector3(), to = new THREE.Vector3();
    let behind = 0;
    acrossReefs(0, POP, (t, n) => {
      if (behind >= 6) return;
      const ahead = t.c.checkFrame(n.uid);
      if (ahead.subject?.uid !== n.uid) return;
      t.step(1);
      const target = t.scene.getObjectByName('reef-explore-focus').position.clone();
      const away = () => { const cam = t.renderer.camera; cam.updateMatrixWorld(); cam.getWorldDirection(fwd); return fwd.angleTo(to.copy(target).sub(cam.position)) * 180 / Math.PI; };
      t.c.lookCamera(628, 0); // half a turn of the head (0.005 rad per unit)
      // Then tip the head up or down until the camera points straight away from the subject.
      for (let i = 0; i < 120; i++) {
        const now = away(); if (now > 175) break;
        t.c.lookCamera(0, 3); if (away() < now) { t.c.lookCamera(0, -6); if (away() < now) { t.c.lookCamera(0, 3); break; } }
      }
      if (away() < 170) return;
      behind++;
      expect(t.c.checkFrame(n.uid).subject?.uid, n.speciesId + ' at ' + away().toFixed(0) + ' degrees').not.toBe(n.uid);
    });
    expect(behind, 'subjects placed dead behind').toBeGreaterThan(0);
  });

  it('agrees with real ray casts on what rock hides, and does not count corals as rock', () => {
    const ray = new THREE.Raycaster(), target = new THREE.Vector3(), dir = new THREE.Vector3();
    let agree = 0, total = 0, corals = 0;
    acrossReefs(0, [...POP, { id: 'brain_coral', count: 40 }], (t, n) => {
      const f = t.c.checkFrame(n.uid);
      if (f.subject?.uid !== n.uid && !f.hidden) return; // something else outranked it
      t.step(1);
      const rock = ['reef-explore-floor', 'reef-explore-bommies'].map((name) => t.scene.getObjectByName(name));
      const camera = t.renderer.camera; t.scene.updateMatrixWorld(true);
      target.copy(t.scene.getObjectByName('reef-explore-focus').position); dir.copy(target).sub(camera.position);
      const dist = dir.length(); dir.normalize();
      ray.set(camera.position, dir); ray.far = Math.max(0.1, dist - 0.4);
      const blocked = ray.intersectObjects(rock, false).length > 0, clear = f.subject?.uid === n.uid;
      total++; if (clear !== blocked) agree++;
      if (clear && n.speciesId === 'brain_coral') corals++;
    });
    expect(total, 'subjects compared').toBeGreaterThan(10);
    expect(agree / total, agree + ' of ' + total).toBeGreaterThan(0.85);
    expect(corals, 'corals seen in the clear').toBeGreaterThan(0);
  });

  it('scores 0 stars only when nothing is framed, and stars always match the checks', () => {
    const t = mount(); t.c.setPhotoMode(true); t.c.setPaused(true);
    for (let i = 0; i < 24; i++) {
      t.c.lookCamera(52, 0);
      const f = t.c.checkFrame(null);
      if (!f.subject) { expect(f.stars).toBe(0); expect(f.checks.framed).toBe(false); } else {
        expect(f.stars).toBe(1 + (f.checks.big ? 1 : 0) + (f.checks.colour ? 1 : 0));
        expect(f.checks.big).toBe(f.subject.fill >= 0.1 || f.checks.big);
      }
    }
  });

  it('is safe to call after the dive is gone', () => {
    const t = mount(); t.c.dispose();
    expect(t.c.checkFrame(null)).toBeNull(); expect(t.c.setPhotoMode(true)).toBe(false);
  });
});
