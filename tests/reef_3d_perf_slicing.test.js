import { afterEach, describe, expect, it, vi } from 'vitest';
import { THREE, runtime, census, cleanup, site, loggingRuntime, toolSite } from './helpers/reef_clearance_perf_harness.js';

// The dive on school hardware. Far and unseen animals redo their slow work on a
// time slice (deterministic, at least every 8 frames, no time lost); the governor degrades
// in order (mobile reach, then crowd density, then shadow refresh) and only when a frame is
// slow; fixed scenery keeps its visibility bands; script time slices more, then thins; the decor and coral groups use
// a tighter view cone that still never misses anything the camera can see; coral groups draw
// only the members inside the shadow map in the shadow pass.
vi.setConfig({ testTimeout: 300000 });
const open = [];
afterEach(() => { while (open.length) open.pop().dispose(); cleanup(); });
function logged(options, source, how) { const t = loggingRuntime(options, source, how); open.push(t); return t; }

// Mobile and sessile model roots (not instanced), with their visibility recorded per frame.
function roots(t) { const out = []; t.scene.traverse((o) => { if (o.userData && o.userData.exploreUid && !o.isInstancedMesh) out.push(o); }); return out; }
function swim(t, frames, ms = 50) {
  const rs = roots(t), seen = new Map(rs.map((r) => [r.userData.exploreUid, []])), start = t.frame;
  for (let i = 0; i < frames; i++) {
    if (i === 0) t.controller.setInput({ forward: 0.6, turn: 0.15 });
    if (i === Math.floor(frames * 0.4)) t.controller.setInput({ forward: 0, turn: 1 });
    if (i === Math.floor(frames * 0.6)) t.controller.setInput({ forward: 0.8, turn: -0.2, rise: -0.3 });
    t.step(ms);
    rs.forEach((r) => seen.get(r.userData.exploreUid).push(r.visible));
  }
  t.controller.setInput(null);
  return { seen, start };
}
const updatesOf = (t, uid) => t.log.filter((e) => e[0] === uid);

describe('time-sliced organism updates', () => {
  it('updates every visible model at least every 8 frames, at once when it comes into view, and never loses time', () => {
    const t = logged();
    t.log.length = 0;
    const { seen, start } = swim(t, 300);
    let checked = 0, sliced = 0, frames = 0, calls = 0;
    for (const [uid, vis] of seen) {
      const ups = new Map(updatesOf(t, uid).map((e) => [e[1] - start - 1, e[2]]));
      let last = null;
      for (let f = 0; f < vis.length; f++) {
        if (!vis[f]) { last = null; continue; }
        frames++;
        const fresh = f > 0 && !vis[f - 1];
        // Coming into view: animated at once, by this frame's time.
        if (fresh) { expect(ups.has(f), uid + ' fresh at ' + f).toBe(true); expect(ups.get(f)).toBeCloseTo(0.05, 6); last = f; calls++; checked++; continue; }
        if (!ups.has(f)) { expect(last === null ? f : f - last, uid + ' waited too long at ' + f).toBeLessThan(8); continue; }
        // Each turn carries all the time since the last one.
        if (last !== null) { expect(ups.get(f), uid + ' time at ' + f).toBeCloseTo((f - last) * 0.05, 6); if (f - last > 1) sliced++; }
        last = f; calls++; checked++;
      }
    }
    expect(checked, 'models were animated').toBeGreaterThan(300);
    expect(sliced, 'far models waited for their slice').toBeGreaterThan(50);
    expect(calls / frames, 'share of visible model-frames that animate').toBeLessThan(0.85);
  });

  it('is deterministic, spreads the far work over frames, and keeps near swimmers and positions exact every frame', () => {
    const a = logged(), b = logged();
    a.log.length = 0; b.log.length = 0;
    swim(a, 240); swim(b, 240);
    expect(b.log).toEqual(a.log);
    // Spread: no frame carries much more than its share of the model updates.
    const per = new Map(); a.log.forEach((e) => per.set(e[1], (per.get(e[1]) || 0) + 1));
    const counts = [...per.values()], mean = counts.reduce((s, v) => s + v, 0) / counts.length;
    expect(Math.max(...counts), 'busiest frame').toBeLessThan(mean * 1.8);
    // Swimmers move every frame (their paths are exact), and the near ones animate every frame.
    const t = logged(), rs = roots(t);
    t.step(50); // a mount's first frame has no time step
    t.log.length = 0;
    const cam = () => t.camera.position, last = new Map(rs.map((r) => [r, r.position.clone()]));
    let nearFrames = 0, nearMissed = 0, frozen = 0; const frozenWho = new Set();
    t.controller.setInput({ forward: 0.4, turn: 0.1 });
    for (let i = 0; i < 160; i++) {
      t.step(50);
      const now = new Set(t.log.filter((e) => e[1] === t.frame).map((e) => e[0]));
      for (const r of rs) {
        const p = r.position, moved = p.distanceTo(last.get(r)) > 1e-7; last.set(r, p.clone());
        const mobile = ['parrotfish', 'blue_tang', 'green_turtle', 'emperor_angelfish', 'lionfish', 'clownfish'].includes(r.userData.speciesId);
        if (mobile && !moved) { frozen++; frozenWho.add(r.userData.speciesId + '@' + i); }
        if (mobile && r.visible && p.distanceTo(cam()) < 6) { nearFrames++; if (!now.has(r.userData.exploreUid)) nearMissed++; }
      }
    }
    expect(frozen, 'swimmer frames without movement: ' + [...frozenWho].slice(0, 8).join(' ')).toBe(0);
    expect(nearFrames, 'swimmers came near the camera').toBeGreaterThan(20);
    expect(nearMissed, 'near swimmer frames skipped').toBe(0);
  });

  it('gives both tiers the same swimming (the slicing of motion depends only on the camera)', () => {
    const low = logged({ quality: 'low' }), high = logged({ quality: 'high' });
    for (const t of [low, high]) swim(t, 200);
    const key = (t) => census(t).map((o) => o.uid + ':' + o.pos.map((v) => v.toFixed(5)).join(',')).join('|');
    expect(key(high)).toBe(key(low));
  });
});

// Decor and coral group members drawn this frame vs. everything the camera can see.
function decorItems(t) {
  const out = [];
  t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.decorative && o.userData.lod === 'near' && o.userData.items) out.push(o); });
  return out;
}
function drawnKeys(t, filter) {
  const keys = new Set(), m = new THREE.Matrix4(), p = new THREE.Vector3();
  t.scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.visible || !filter(o)) return;
    for (let i = 0; i < o.count; i++) { m.fromArray(o.instanceMatrix.array, i * 16); p.setFromMatrixPosition(m); keys.add(o.userData.kind + ':' + p.x.toFixed(3) + ',' + p.z.toFixed(3)); }
  });
  return keys;
}
function missedInView(t) {
  const cam = t.renderer.camera, frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sphere = new THREE.Sphere(), c = new THREE.Vector3();
  cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
  const drawn = drawnKeys(t, (o) => o.userData.decorative && !!o.userData.lod), missed = [];
  let inView = 0;
  for (const mesh of decorItems(t)) {
    const { matrices, centres } = mesh.userData.items, n = centres.length / 4;
    for (let k = 0; k < n; k++) {
      c.set(centres[k * 4], centres[k * 4 + 1], centres[k * 4 + 2]);
      const r = Math.min(2, centres[k * 4 + 3]);
      if (c.distanceTo(cam.position) - r > 12 || !frustum.intersectsSphere(sphere.set(c, r))) continue;
      inView++;
      const key = mesh.userData.kind + ':' + matrices[k * 16 + 12].toFixed(3) + ',' + matrices[k * 16 + 14].toFixed(3);
      if (!drawn.has(key)) missed.push(key + ' at ' + c.distanceTo(cam.position).toFixed(1) + ' m');
    }
  }
  // Coral group members: every member whose centre is in view within 12 m is drawn.
  const mm = new THREE.Matrix4(), q = new THREE.Vector3();
  t.scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.userData.exploreUids) return;
    const all = o.userData.exploreMatrices, n = o.userData.exploreUids.length, have = new Set();
    for (let i = 0; i < (o.visible ? o.count : 0); i++) { mm.fromArray(o.instanceMatrix.array, i * 16); q.setFromMatrixPosition(mm); have.add(q.x.toFixed(3) + ',' + q.z.toFixed(3)); }
    for (let i = 0; i < n; i++) {
      mm.fromArray(all, i * 16); q.setFromMatrixPosition(mm);
      if (q.distanceTo(cam.position) > 12 || !frustum.containsPoint(q)) continue;
      inView++;
      if (!have.has(q.x.toFixed(3) + ',' + q.z.toFixed(3))) missed.push('group ' + o.userData.speciesId + ' member ' + i);
    }
  });
  return { inView, missed };
}

describe('a tighter view cone that misses nothing on screen', () => {
  for (const quality of ['low', 'high']) it('draws every decor item and coral in view within 12 m, frame by frame while swimming and turning (' + quality + ')', () => {
    const t = runtime({ quality });
    let frames = 0, seen = 0;
    const missed = [];
    const check = () => { const r = missedInView(t); seen += r.inView; frames++; if (r.missed.length) missed.push('frame ' + frames + ': ' + r.missed.slice(0, 3).join('; ')); };
    for (const [input, n] of [[{ forward: 1, turn: 0.1 }, 60], [{ forward: 0, turn: 1 }, 60], [{ forward: 0, turn: -1 }, 40], [{ forward: 0.7, turn: 0.4, rise: -0.5 }, 60]]) {
      t.controller.setInput(input);
      for (let i = 0; i < n; i++) { t.step(50); check(); }
    }
    // Looking around with the pointer turns the camera without the diver.
    t.controller.setInput(null);
    const ptr = (type, x, y) => t.canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }));
    for (let i = 0; i < 30; i++) { ptr('pointerdown', 400, 250); ptr('pointermove', 400 + 40, 250 + (i % 2 ? 12 : -12)); ptr('pointerup', 440, 250); t.step(50); check(); }
    expect(seen / frames, 'items in view per frame').toBeGreaterThan(20);
    expect(missed, 'items in view but not drawn').toEqual([]);
  });
});

// Governor stages, observed on the real species at the high tier (crowds need real schools).
const decorDrawn = (t) => { let n = 0; t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.decorative && o.userData.lod && o.visible) n += o.count; }); return n; };
const crowdDrawn = (t) => { let n = 0; t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.ambient && /^body/.test(o.userData.part) && o.visible) n += o.count; }); return n; };

describe('the governor degrades in order, and only when it must', () => {
  it('preserves fixed scenery while reducing the crowd and shadow refresh on slow frames, then recovers', () => {
    // Hold the sampling camera still: third-person breathing otherwise changes
    // one edge-of-view item independently of the performance governor.
    const t = logged({ quality: 'high', site: toolSite('healthy'), reducedMotion: true }, undefined, { real: true });
    t.run(1.5);
    const D0 = decorDrawn(t), C0 = crowdDrawn(t), sm = t.renderer.shadowMap;
    expect(D0).toBeGreaterThan(100); expect(C0).toBeGreaterThan(20);
    // A fast device over budget keeps everything.
    t.renderer.info.render.triangles = 2500000;
    t.run(3, 1000 / 60);
    expect(decorDrawn(t), 'fast frames never trim').toBe(D0);
    expect(crowdDrawn(t)).toBe(C0);
    expect(sm.autoUpdate).not.toBe(false);
    // Slow frames (20 per second): stage by stage.
    const stages = [];
    for (let i = 0; i < 40; i++) { t.run(0.5); stages.push({ d: decorDrawn(t), c: crowdDrawn(t), s: sm.autoUpdate !== false }); }
    const crowdAt = stages.findIndex((s) => s.c < C0 * 0.85), shadowAt = stages.findIndex((s) => !s.s);
    expect(stages.every((s) => s.d === D0), 'fixed scenery stays visible at every pressure stage').toBe(true);
    expect(crowdAt, 'the mobile crowd thinned').toBeGreaterThanOrEqual(0);
    expect(shadowAt, 'then the shadows were redrawn less often').toBeGreaterThan(crowdAt);
    expect(stages[crowdAt].s, 'shadows still every frame while the crowd thins').toBe(true);
    // The last stage redraws the shadow map every 2nd or 3rd frame, and at once when its square moves.
    let redraws = 0;
    for (let i = 0; i < 30; i++) { sm.needsUpdate = false; t.step(50); if (sm.needsUpdate) redraws++; }
    expect(redraws).toBeGreaterThan(5); expect(redraws).toBeLessThan(20);
    // Back under budget: everything returns.
    t.renderer.info.render.triangles = 1000;
    t.run(20);
    expect(decorDrawn(t), 'fixed scenery remains stable through recovery').toBe(D0);
    expect(crowdDrawn(t)).toBeGreaterThanOrEqual(C0 * 0.97);
    expect(sm.autoUpdate).toBe(true);
  });

  it('answers slow script with more slicing and mobile reductions while fixed scenery stays stable', () => {
    const t = logged();
    t.run(4);
    const rate = (from, to) => t.log.filter((e) => e[1] > from && e[1] <= to).length / (to - from);
    const D0 = decorDrawn(t), v0 = roots(t).filter((r) => r.visible).length, f0 = t.frame;
    t.run(3);
    const before = rate(f0, t.frame);
    // Every frame now takes 30 ms of script.
    t.clockStep = 30;
    const f1 = t.frame;
    t.run(3.5); // 70 frames: slicing doubles, nothing drawn changes yet
    const sliced = rate(t.frame - 20, t.frame);
    expect(sliced, 'more slicing under slow script').toBeLessThan(before * 0.8);
    expect(decorDrawn(t), 'no visible change at the first stage').toBe(D0);
    t.run(8);
    expect(decorDrawn(t), 'fixed scenery survives sustained script pressure').toBe(D0);
    expect(roots(t).filter((r) => r.visible).length).toBeLessThanOrEqual(v0);
    t.clockStep = 0;
    t.run(20);
    expect(decorDrawn(t), 'recovered').toBe(D0);
    expect(rate(t.frame - 40, t.frame)).toBeGreaterThan(sliced);
    expect(f1).toBeGreaterThan(0);
  });
});

describe('coral groups in the shadow pass', () => {
  it('draws only the members inside the shadow map in the shadow pass, and all of them in the view', () => {
    const t = runtime({ quality: 'high', site: site({ population: [{ id: 'brain_coral', count: 40 }, { id: 'staghorn_coral', count: 30 }] }) });
    t.controller.setInput({ forward: 1, turn: 0.2 }); t.run(6); t.controller.setInput(null); t.run(0.5);
    const groups = [];
    t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.exploreUids && o.castShadow && o.visible) groups.push(o); });
    expect(groups.length).toBeGreaterThan(0);
    const sun = t.scene.getObjectByName('reef-explore-sun'), cam = sun.shadow.camera;
    const main = groups.map((g) => g.count);
    // The renderer calls scene.onBeforeRender before its shadow pass, then each mesh's own before its draw.
    t.scene.onBeforeRender(t.renderer, t.scene, t.renderer.camera);
    const shadow = groups.map((g) => g.count);
    let inside = 0, outside = 0;
    const z = new THREE.Vector3().subVectors(sun.position, sun.target.position).normalize(), x = new THREE.Vector3(0, 1, 0).cross(z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    groups.forEach((g, gi) => {
      expect(shadow[gi]).toBeLessThanOrEqual(main[gi]);
      for (let i = 0; i < main[gi]; i++) {
        m.fromArray(g.instanceMatrix.array, i * 16); p.setFromMatrixPosition(m).sub(sun.target.position);
        const a = Math.abs(p.dot(x)), b = Math.abs(p.dot(y)), lim = cam.right;
        if (i < shadow[gi]) { inside++; expect(Math.min(a, b) <= lim + 4 && Math.max(a, b) <= lim + 4, 'a shadow-pass member is near the map').toBe(true); }
        else { outside++; expect(a > lim || b > lim, 'a member left out of the shadow pass is off the map').toBe(true); }
      }
      g.onBeforeRender(t.renderer, t.scene, t.renderer.camera, g.geometry, g.material, null);
      expect(g.count, 'its own draw gets every member back').toBe(main[gi]);
    });
    expect(inside).toBeGreaterThan(0);
    expect(outside, 'some drawn colonies lie off the shadow map').toBeGreaterThan(0);
  });
});
