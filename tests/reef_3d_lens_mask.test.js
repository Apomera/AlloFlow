import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { THREE, runtime, census, cleanup, site, toolSite } from './helpers/reef_clearance_perf_harness.js';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

// The mask view is a flat mask. Things straight ahead look 4/3 as big as
// without it (NOAA Diving Manual 1991, 2.8.1.1), a portrait screen keeps its peripheral
// vision, everything that reads the camera's view still agrees with what is drawn, the
// dive opens looking over the reef instead of into a wall of rock, and the dive tips
// carry the fact with its source.
afterEach(() => cleanup());
const D = Math.PI / 180;
// A crowded stub reef, so the nearby list (8 m, 12 entries) is full.
const CROWDED = site({ population: [
  { id: 'clownfish', count: 4 }, { id: 'magnificent_anemone', count: 2 }, { id: 'blue_tang', count: 3 }, { id: 'brain_coral', count: 12 }, { id: 'staghorn_coral', count: 6 },
  { id: 'parrotfish', count: 8 }, { id: 'sea_fan', count: 6 }, { id: 'barrel_sponge', count: 6 }, { id: 'giant_clam', count: 6 }, { id: 'green_turtle', count: 2 }] });
const SIZES = [[1600, 900], [1110, 620], [800, 500], [1000, 750], [600, 600], [312, 340], [390, 600], [390, 844]];
const across = (cam) => 2 * Math.atan(Math.tan(cam.fov * D / 2) * cam.aspect) / D;
function sized(t, w, h) { t.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h }); t.controller.resize(); t.step(); return t.renderer.camera; }
// How tall a thing straight ahead is drawn (NDC units) by a camera with this vertical fov.
const drawnTall = (fovDeg, heightM, distM) => heightM / (distM * Math.tan(fovDeg * D / 2));

describe('the mask view is a flat mask', () => {
  it('shows a fish ahead 4/3 as tall as without the mask on every landscape screen, and narrows the water it takes in', () => {
    const t = runtime({ view: 'first' });
    for (const [w, h] of SIZES.filter(([w, h]) => w / h >= 1.2)) {
      const cam = sized(t, w, h);
      // Project a 0.15 m fish 2 m and 4 m ahead with the live camera; the unmasked view is 60 degrees tall.
      cam.updateMatrixWorld();
      const fwd = cam.getWorldDirection(new THREE.Vector3()), up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      for (const d of [2, 4]) {
        const c = cam.position.clone().addScaledVector(fwd, d);
        const top = c.clone().addScaledVector(up, 0.075).project(cam), bottom = c.clone().addScaledVector(up, -0.075).project(cam);
        const ratio = (top.y - bottom.y) / drawnTall(60, 0.15, d);
        expect(ratio, w + 'x' + h + ' at ' + d + ' m').toBeCloseTo(4 / 3, 3);
      }
      expect(cam.fov, 'less water top to bottom than the unmasked 60 degrees').toBeLessThan(50);
      expect(across(cam), w + 'x' + h + ' still wide').toBeGreaterThanOrEqual(54 - 1e-6);
    }
    t.controller.setView('third'); t.step();
    expect(t.renderer.camera.fov, 'third view unchanged').toBe(60);
  });

  it('never shows a portrait or narrow screen less than 54 degrees across (until 82 tall), and magnifies as much as that allows', () => {
    const t = runtime({ view: 'first' });
    let last = 0;
    for (const [w, h] of SIZES.slice().sort((a, b) => b[0] / b[1] - a[0] / a[1])) {
      const cam = sized(t, w, h), wide = across(cam);
      expect(cam.fov, w + 'x' + h + ' grows as the screen narrows').toBeGreaterThanOrEqual(last - 1e-9); last = cam.fov;
      expect(cam.fov, w + 'x' + h + ' capped').toBeLessThanOrEqual(82 + 1e-9);
      expect(cam.fov, w + 'x' + h + ' never wider than the unmasked view on a landscape screen').toBeLessThanOrEqual(w >= h ? 60 + 1e-9 : 82);
      if (cam.fov < 82 - 1e-6) expect(wide, w + 'x' + h + ' keeps 54 degrees across').toBeGreaterThanOrEqual(54 - 1e-6);
      // As tight as the rules allow: either the full 4/3 lens, or exactly 54 across, or the cap.
      const lens = Math.abs(Math.tan(30 * D) / Math.tan(cam.fov * D / 2) - 4 / 3) < 1e-6;
      expect(lens || Math.abs(wide - 54) < 1e-6 || Math.abs(cam.fov - 82) < 1e-6, w + 'x' + h + ' fov ' + cam.fov.toFixed(2)).toBe(true);
      // Breathing never zooms.
      const f = cam.fov; t.run(1); expect(t.renderer.camera.fov).toBe(f);
    }
    // A phone held upright (the dive canvas is 312 x 340 at 390 px wide) and a portrait canvas.
    expect(across(sized(t, 390, 600)), 'portrait').toBeCloseTo(54, 6);
    expect(sized(t, 390, 844).fov, 'tall portrait').toBeCloseTo(82, 6);
  });
});

describe('what reads the view agrees with what is drawn', () => {
  // Every organism once: uid -> world centre and a bounding radius.
  function bodies(t) {
    const out = new Map(), m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    t.scene.traverse((o) => {
      if (o.userData && o.userData.exploreUid && !o.isInstancedMesh && !out.has(o.userData.exploreUid)) {
        const box = new THREE.Box3().setFromObject(o), sphere = box.getBoundingSphere(new THREE.Sphere());
        out.set(o.userData.exploreUid, { c: sphere.center, r: sphere.radius });
      }
      if (o.isInstancedMesh && o.userData.exploreUids) o.userData.exploreUids.forEach((uid, i) => {
        if (out.has(uid)) return;
        m.fromArray(o.userData.exploreMatrices, i * 16); m.decompose(p, q, s); out.set(uid, { c: p.clone(), r: 1.0 * Math.max(s.x, s.y, s.z), instanced: true });
      });
    });
    return out;
  }
  it('marks nearby organisms in view exactly when the mask camera draws them, at several screen shapes', () => {
    let yes = 0, no = 0;
    const wrong = [];
    for (const [w, h] of [[1110, 620], [312, 340], [390, 600]]) {
      const t = runtime({ view: 'first', site: CROWDED });
      sized(t, w, h);
      for (const [input, n] of [[null, 1], [{ forward: 0, turn: 1 }, 130], [{ forward: 0.8, turn: 0.1, rise: -0.3 }, 60], [{ forward: 0, turn: -1 }, 130]]) {
        t.controller.setInput(input);
        for (let i = 0; i < n; i++) {
          t.step();
          const cam = t.renderer.camera, all = bodies(t), frustum = new THREE.Frustum(), pm = new THREE.Matrix4();
          cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
          for (const nb of t.state().nearby) {
            const b = all.get(nb.uid); if (!b) { wrong.push('no body for ' + nb.uid); continue; }
            const ndc = b.c.clone().project(cam), inside = Math.abs(ndc.x) < 0.95 && Math.abs(ndc.y) < 0.95 && ndc.z < 1 && ndc.z > -1;
            const outside = !frustum.intersectsSphere(new THREE.Sphere(b.c, b.r * 1.5 + 0.1));
            if (inside) { yes++; if (!nb.inView) wrong.push(w + 'x' + h + ' ' + nb.uid + ' drawn but out of view'); }
            if (outside) { no++; if (nb.inView) wrong.push(w + 'x' + h + ' ' + nb.uid + ' not drawn but in view'); }
          }
        }
      }
      cleanup();
    }
    expect(yes, 'organisms checked on screen').toBeGreaterThan(40);
    expect(no, 'organisms checked off screen').toBeGreaterThan(40);
    expect(wrong).toEqual([]);
  });

  it('focuses what the student taps through the mask', () => {
    let tried = 0, hit = 0;
    for (const [w, h] of [[1110, 620], [312, 340]]) {
      const t = runtime({ view: 'first', site: CROWDED });
      sized(t, w, h);
      const ptr = (type, x, y) => t.canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }));
      const rock = [t.scene.getObjectByName('reef-explore-floor'), t.scene.getObjectByName('reef-explore-bommies')], rc = new THREE.Raycaster();
      for (let k = 0; k < 12; k++) {
        t.controller.setInput(k % 3 === 2 ? { forward: 0.8, turn: 0.2 } : { forward: 0, turn: 1 }); t.run(k ? 0.8 : 0.05); t.controller.setInput(null); t.run(1);
        t.controller.setPaused(true); t.step();
        const cam = t.renderer.camera; cam.updateMatrixWorld();
        for (const o of census(t)) {
          let obj = null; t.scene.traverse((x) => { if (!obj && x.userData && x.userData.exploreUid === o.uid && !x.isInstancedMesh) obj = x; });
          if (!obj || !obj.visible) continue;
          const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3()), ndc = c.clone().project(cam);
          if (Math.abs(ndc.x) > 0.85 || Math.abs(ndc.y) > 0.85 || ndc.z >= 1) continue;
          // Only what nothing hides: no rock and no other organism nearer along the line of sight.
          rc.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), cam);
          const wall = rc.intersectObjects(rock, false)[0], dist = c.distanceTo(cam.position);
          if (wall && wall.distance < dist) continue;
          const first = rc.intersectObjects(t.scene.children.filter((x) => x.name !== 'reef-explore-floor' && x.name !== 'reef-explore-bommies'), true).find((x) => { for (let p = x.object; p; p = p.parent) if (p.userData && p.userData.exploreUid) return true; return false; });
          if (first) { let p = first.object; while (p && !(p.userData && p.userData.exploreUid)) p = p.parent; if (p.userData.exploreUid !== o.uid) continue; }
          tried++;
          t.controller.clearFocus();
          const x = (ndc.x + 1) / 2 * w, y = (1 - ndc.y) / 2 * h;
          ptr('pointerdown', x, y); ptr('pointerup', x, y);
          const f = t.state().focused;
          if (f && f.uid === o.uid) hit++;
        }
        t.controller.setPaused(false);
      }
      cleanup();
    }
    expect(tried, 'organisms tapped').toBeGreaterThanOrEqual(8);
    expect(hit, 'taps that focus the organism under the finger').toBe(tried);
  });

  // The I4 check (draws every decor item and coral in view within 12 m), through the mask.
  function missedInView(t) {
    const cam = t.renderer.camera, frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sphere = new THREE.Sphere(), c = new THREE.Vector3();
    cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    const drawn = new Set(), m = new THREE.Matrix4(), p = new THREE.Vector3(), missed = [];
    t.scene.traverse((o) => {
      if (!o.isInstancedMesh || !o.visible || !o.userData.decorative || !o.userData.lod) return;
      for (let i = 0; i < o.count; i++) { m.fromArray(o.instanceMatrix.array, i * 16); p.setFromMatrixPosition(m); drawn.add(o.userData.kind + ':' + p.x.toFixed(3) + ',' + p.z.toFixed(3)); }
    });
    let inView = 0;
    t.scene.traverse((mesh) => {
      if (!mesh.isInstancedMesh || !mesh.userData.decorative || mesh.userData.lod !== 'near' || !mesh.userData.items) return;
      const { matrices, centres } = mesh.userData.items, n = centres.length / 4;
      for (let k = 0; k < n; k++) {
        c.set(centres[k * 4], centres[k * 4 + 1], centres[k * 4 + 2]);
        const r = Math.min(2, centres[k * 4 + 3]);
        if (c.distanceTo(cam.position) - r > 12 || !frustum.intersectsSphere(sphere.set(c, r))) continue;
        inView++;
        const key = mesh.userData.kind + ':' + matrices[k * 16 + 12].toFixed(3) + ',' + matrices[k * 16 + 14].toFixed(3);
        if (!drawn.has(key)) missed.push(key + ' at ' + c.distanceTo(cam.position).toFixed(1) + ' m');
      }
    });
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
  for (const quality of ['low', 'high']) it('the decor and coral view cone misses nothing in view within 12 m through the mask (' + quality + ')', () => {
    for (const [w, h] of [[1110, 620], [312, 340], [390, 844]]) {
      const t = runtime({ quality, view: 'first' });
      sized(t, w, h);
      let frames = 0, seen = 0;
      const missed = [];
      const check = () => { const r = missedInView(t); seen += r.inView; frames++; if (r.missed.length) missed.push(w + 'x' + h + ' frame ' + frames + ': ' + r.missed.slice(0, 3).join('; ')); };
      for (const [input, n] of [[{ forward: 1, turn: 0.1 }, 40], [{ forward: 0, turn: 1 }, 50], [{ forward: 0, turn: -1 }, 30], [{ forward: 0.7, turn: 0.4, rise: -0.5 }, 40]]) {
        t.controller.setInput(input);
        for (let i = 0; i < n; i++) { t.step(50); check(); }
      }
      t.controller.setInput(null);
      const ptr = (type, x, y) => t.canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }));
      for (let i = 0; i < 20; i++) { ptr('pointerdown', w / 2, h / 2); ptr('pointermove', w / 2 + 40, h / 2 + (i % 2 ? 14 : -14)); ptr('pointerup', w / 2 + 40, h / 2); t.step(50); check(); }
      expect(seen / frames, w + 'x' + h + ' items in view per frame').toBeGreaterThan(10);
      expect(missed, 'items in view but not drawn').toEqual([]);
      cleanup();
    }
  });
});

describe('the dive opens looking over the reef', () => {
  // Rays through the screen against the drawn rock. sky: the highest point of the middle
  // column where rock within 9 m fills the view (1 = the top edge); upOpen: how much of the
  // top band of the screen looks past 12 m (open water or reef farther off).
  function framing(t) {
    const cam = t.renderer.camera, rc = new THREE.Raycaster(), rock = [t.scene.getObjectByName('reef-explore-floor'), t.scene.getObjectByName('reef-explore-bommies')];
    const dist = (x, y) => { rc.setFromCamera(new THREE.Vector2(x, y), cam); const hit = rc.intersectObjects(rock, false)[0]; return hit ? hit.distance : Infinity; };
    cam.updateMatrixWorld();
    let sky = -1, up = 0, upOpen = 0;
    for (let y = -0.95; y <= 0.951; y += 0.05) if (dist(0, y) < 9) sky = y;
    for (let y = 0.4; y <= 0.801; y += 0.2) for (let x = -0.8; x <= 0.801; x += 0.2) { up++; if (dist(x, y) > 12) upOpen++; }
    return { sky, upOpen: upOpen / up };
  }
  const pitchOf = (t) => Math.asin(t.renderer.camera.getWorldDirection(new THREE.Vector3()).y);
  it('at every dive site, through the mask, on a laptop and a phone', () => {
    for (const id of ['healthy', 'restoration', 'heatwave', 'damaged']) for (const [w, h] of [[1110, 620], [312, 340]]) {
      const t = runtime({ view: 'first', quality: 'low', site: toolSite(id) });
      sized(t, w, h);
      const f = framing(t);
      expect(f.sky, id + ' ' + w + ' the top of the reef ahead sits low enough to see over').toBeLessThan(0.45);
      expect(f.sky, id + ' ' + w + ' and the reef is still in view').toBeGreaterThan(-0.5);
      expect(f.upOpen, id + ' ' + w + ' the top of the view looks out past the reef').toBeGreaterThanOrEqual(0.7);
      expect(pitchOf(t), id + ' never stares up at the surface').toBeLessThan(0.35);
      cleanup();
    }
  });

  it('holds still while the diver hovers, eases back to the usual gaze once the diver swims, and does not come back', () => {
    const t = runtime({ view: 'first', quality: 'low', site: toolSite('healthy') });
    sized(t, 1110, 620);
    const lifted = pitchOf(t), q = t.renderer.camera.quaternion.clone();
    expect(lifted, 'lifted over the bommie').toBeGreaterThan(0.1);
    t.run(3);
    expect(t.renderer.camera.quaternion.angleTo(q), 'steady while hovering').toBeLessThan(0.025);
    // A short swim straight on: the bommie is still ahead and nearer, so a lift that came
    // back would show.
    const d0 = t.state().diver;
    t.controller.setInput({ forward: 0.7 }); t.run(1.2); t.controller.setInput(null); t.run(6);
    const d1 = t.state().diver;
    expect(Math.hypot(d1.x - d0.x, d1.z - d0.z), 'left the start').toBeGreaterThan(0.6);
    expect(d1.headingDeg, 'still facing the bommie').toBe(d0.headingDeg);
    expect(Math.abs(pitchOf(t) + 0.12), 'usual gaze').toBeLessThan(0.08);
    t.controller.setView('third'); t.step(); t.controller.setView('first'); t.step();
    expect(Math.abs(pitchOf(t) + 0.12), 'no lift after the dive has begun').toBeLessThan(0.08);
    // Reduced motion: the opening gaze is still exactly still.
    const calm = runtime({ view: 'first', quality: 'low', reducedMotion: true, site: toolSite('heatwave') }), cam = calm.renderer.camera;
    const p = cam.position.toArray(), r = cam.quaternion.toArray();
    calm.run(4);
    expect(cam.position.toArray()).toEqual(p); expect(cam.quaternion.toArray()).toEqual(r);
  });

  it('starts at the same place and heading in both views (the spawn is unchanged)', () => {
    const a = runtime({ view: 'first', quality: 'low', site: toolSite('damaged') }), b = runtime({ view: 'third', quality: 'low', site: toolSite('damaged') });
    expect(a.state().diver).toEqual(b.state().diver);
    expect(b.renderer.camera.fov).toBe(60);
  });
});

describe('the dive tips explain the mask', () => {
  const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
  const SRC = readFileSync(TOOL, 'utf8');
  const TIP = 'Through your mask, fish look about a third bigger than they really are, and things close to you look nearer than they are. Light bends as it passes from the water through the glass into the air inside your mask.';
  it('has one literal tip_mask string, right after tip_red, in plain words with no dashes', () => {
    const calls = SRC.match(/__alloT\('stem\.coralreef\.tip_mask', '([^']*)'\)/g) || [];
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain(TIP);
    const tips = SRC.slice(SRC.indexOf('function diveTips('), SRC.indexOf('// @@DIVE_TIPS_END'));
    expect(tips.indexOf("'stem.coralreef.tip_mask'")).toBeGreaterThan(tips.indexOf("'stem.coralreef.tip_red'"));
    expect(tips.indexOf("'stem.coralreef.tip_mask'")).toBeLessThan(tips.indexOf("'stem.coralreef.tip_triangle'"));
    expect(/[\u2013\u2014]/.test(TIP)).toBe(false);
    expect(TIP.split(/[.!?]\s/).every((s) => s.split(' ').length <= 26), 'short sentences').toBe(true);
  });
  it('shows the tip in the dive section and its source in the sources list', () => {
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
    const dive = renderTool('coralReef', { coralReef: { section: 'explore', diveSiteId: 'healthy' } });
    expect(dive.includes(TIP), 'tip shown with the other dive tips').toBe(true);
    const science = renderTool('coralReef', { coralReef: { section: 'science' } });
    expect(science.includes('NOAA Diving Manual: Diving for Science and Technology, 3rd edition, section 2.8.1.1 Refraction'), 'source listed').toBe(true);
    expect(science.includes('href="https://archive.org/details/noaadivingmanual00unit"'), 'source link').toBe(true);
    expect(science.includes('about 33 percent larger'), 'source states the fact').toBe(true);
  });
});
