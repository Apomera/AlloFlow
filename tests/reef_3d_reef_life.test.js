import { afterEach, describe, expect, it, vi } from 'vitest';
import { THREE, runtime, census, toolSite, ambient, ambientBodies, drawnAmbient, arrive } from './helpers/reef_life_harness.js';

// Lane H1: planktivore clouds over the coral heads, and fish that notice the diver.
// Mounts build a whole reef (real species models take a few seconds), so allow time.
vi.setConfig({ testTimeout: 180000 });
const open = [];
afterEach(() => { while (open.length) open.pop().dispose(); });
function mount(options, how) { const t = runtime(options, how); open.push(t); return t; }

const fishCount = (t) => ambientBodies(t).reduce((s, m) => s + m.userData.fish, 0);
const cloudCount = (t) => ambientBodies(t).reduce((s, m) => s + m.userData.clouds, 0);
const bearingDeg = (dx, dz) => ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
const gap = (a, b) => ((a - b + 540) % 360) - 180;
function fishOf(t, id) { return census(t).find((o) => o.speciesId === id).object; }
function site(over = {}) { return { seed: 6, depthM: 9, health: { coralCover: 0.6, bleaching: 0, algae: 0.05 }, population: [], restoration: null, ...over }; }

// Steer the diver straight at a fish with a fixed forward input, one 50 ms frame at a time.
function chaseStep(t, fish, forward) {
  const d = t.controller.getState().diver, p = fish.position, off = gap(bearingDeg(p.x - d.x, p.z - d.z), d.headingDeg);
  t.controller.setInput({ forward: Math.abs(off) < 50 ? forward : 0.05, turn: Math.max(-1, Math.min(1, off / 25)), rise: Math.max(-1, Math.min(1, (p.y - d.y) * 0.8)) });
  t.step(50);
}
// Two dives that differ only in whether the fish is focused (a focused fish barely
// reacts): the first frame where they part is the moment the free fish took flight,
// and the diver's distance then is its flight distance.
function flightOnset(id, forward, reducedMotion = false) {
  const population = [{ id, count: 1 }, { id: 'brain_coral', count: 3 }];
  const free = mount({ site: site({ population }), reducedMotion }), calm = mount({ site: site({ population }), reducedMotion });
  const a = fishOf(free, id), b = fishOf(calm, id), uid = census(calm).find((o) => o.speciesId === id).uid;
  // Both dives glide to about 9 m from the fish with it focused, then only one lets it go.
  free.controller.swimTo(uid); calm.controller.swimTo(uid);
  const away = () => { const d = calm.controller.getState().diver; return Math.hypot(b.position.x - d.x, b.position.y - d.y, b.position.z - d.z); };
  for (let k = 0; k < 600 && away() > 9; k++) { free.step(50); calm.step(50); }
  free.controller.clearFocus();
  let closest = Infinity;
  for (let frame = 0; frame < 2400; frame++) {
    chaseStep(free, a, forward); chaseStep(calm, b, forward);
    const d = calm.controller.getState().diver, gapNow = Math.hypot(b.position.x - d.x, b.position.y - d.y, b.position.z - d.z);
    if (a.position.distanceTo(b.position) > 1e-9) return { distance: gapNow, frame, closest };
    closest = Math.min(closest, gapNow);
  }
  return { distance: NaN, frame: -1, closest };
}

describe('Lane H1: planktivore clouds follow the reef', () => {
  it('fills a healthy reef with clouds, thins them on the heatwave reef and leaves few on the damaged one', () => {
    const counts = {};
    for (const id of ['healthy', 'heatwave', 'damaged']) {
      const t = mount({ quality: 'high', site: toolSite(id) }, { species: 'real' });
      counts[id] = { fish: fishCount(t), clouds: cloudCount(t) };
      t.dispose(); open.pop();
    }
    expect(counts.healthy.fish, 'a healthy reef swarms').toBeGreaterThan(2000);
    expect(counts.heatwave.fish).toBeLessThan(counts.healthy.fish * 0.75);
    expect(counts.heatwave.clouds).toBeLessThan(counts.healthy.clouds);
    expect(counts.damaged.fish).toBeLessThan(counts.healthy.fish * 0.15);
    expect(counts.damaged.clouds).toBeLessThan(counts.heatwave.clouds * 0.5);
    expect(counts.damaged.fish).toBeGreaterThan(0);
  });

  it('places the same clouds for the same reef, and keeps the light tier light', () => {
    const a = mount({ quality: 'high', site: toolSite('healthy') }, { species: 'real' });
    const b = mount({ quality: 'high', site: toolSite('healthy') }, { species: 'real' });
    const low = mount({ quality: 'low', site: toolSite('healthy') }, { species: 'real' });
    a.run(2); b.run(2);
    const key = (t) => drawnAmbient(t).map((f) => f.speciesId + f.pos.toArray().map((v) => v.toFixed(5)).join(',')).sort().join('|');
    expect(key(a).length).toBeGreaterThan(100);
    expect(key(a)).toBe(key(b));
    expect(fishCount(low)).toBeLessThan(fishCount(a) * 0.5);
    expect(fishCount(low)).toBeGreaterThan(100);
  });

  it('borrows each school\'s materials and adds a handful of draws per species, never a mesh with an organism uid', () => {
    const t = mount({ quality: 'high', site: toolSite('healthy') }, { species: 'real' });
    t.run(1);
    const schoolMaterials = new Set();
    t.scene.traverse((o) => { if (o.isInstancedMesh && !o.userData.ambient && ['anthias', 'blue_green_chromis'].includes(o.userData.speciesId)) schoolMaterials.add(o.material); });
    const meshes = ambient(t), species = new Set(meshes.map((m) => m.userData.speciesId));
    expect([...species].sort()).toEqual(['anthias', 'blue_green_chromis']);
    meshes.forEach((m) => {
      expect(schoolMaterials.has(m.material), 'shared material').toBe(true);
      expect(m.userData.exploreUid).toBeUndefined(); expect(m.userData.exploreUids).toBeUndefined();
      expect(m.castShadow).toBe(false);
    });
    species.forEach((id) => expect(meshes.filter((m) => m.userData.speciesId === id).length).toBeLessThanOrEqual(7));
  });
});

describe('Lane H1: the crowd is scenery, not organisms', () => {
  it('never puts a crowd fish in Nearby or the counts, and a tap on one focuses a real school of its species nearby', () => {
    const t = mount({ quality: 'high', site: toolSite('healthy') }, { species: 'real' });
    t.run(1);
    const uids = new Set(census(t).map((o) => o.uid));
    const s = t.controller.getState();
    expect(drawnAmbient(t).length).toBeGreaterThan(50);
    expect(s.nearby.length).toBeLessThanOrEqual(12);
    s.nearby.forEach((n) => expect(uids.has(n.uid), n.uid).toBe(true));
    // Tap crowd fish that sit well away from any real school of their species.
    t.controller.setPaused(true); t.step();
    const cam = t.camera, schools = census(t).filter((o) => o.object && ['anthias', 'blue_green_chromis'].includes(o.speciesId));
    let tried = 0, hits = 0;
    for (const f of drawnAmbient(t)) {
      const near = schools.filter((o) => o.speciesId === f.speciesId).map((o) => o.object.position.distanceTo(f.pos));
      const ndc = f.pos.clone().project(cam);
      if (Math.min(...near) < 4 || Math.abs(ndc.x) > 0.9 || Math.abs(ndc.y) > 0.9 || ndc.z > 1 || f.pos.distanceTo(cam.position) > 9) continue;
      t.controller.clearFocus();
      t.pointer('pointerdown', (ndc.x + 1) / 2 * 800, (1 - ndc.y) / 2 * 500); t.pointer('pointerup', (ndc.x + 1) / 2 * 800, (1 - ndc.y) / 2 * 500);
      const focused = t.controller.getState().focused;
      tried++;
      if (focused && focused.speciesId === f.speciesId) {
        hits++;
        expect(uids.has(focused.uid)).toBe(true);
        const school = census(t).find((o) => o.uid === focused.uid).object;
        expect(school.position.distanceTo(f.pos), 'within reach').toBeLessThan(20);
      }
      if (tried >= 12) break;
    }
    expect(tried).toBeGreaterThan(3);
    expect(hits / tried, 'taps on crowd fish focus their species').toBeGreaterThan(0.5);
  });

  it('freezes the crowd on pause', () => {
    const t = mount({ quality: 'high', site: toolSite('healthy') }, { species: 'real' });
    t.run(1); t.controller.setPaused(true); t.step();
    const before = ambient(t).map((m) => Array.from(m.instanceMatrix.array.slice(0, m.count * 16)).join(','));
    t.run(1.5);
    expect(ambient(t).map((m) => Array.from(m.instanceMatrix.array.slice(0, m.count * 16)).join(','))).toEqual(before);
  });
});

describe('Lane H1: planktivore clouds notice the diver', () => {
  it('sink into their coral as the diver swims into them and rise again once it has gone', () => {
    const t = mount({ quality: 'high', site: toolSite('healthy') }, { species: 'real' });
    t.run(0.5);
    const d0 = t.controller.getState().diver;
    // A cloud a few metres off, and the fish drawn around its spot.
    const around = (spot) => drawnAmbient(t).filter((f) => Math.hypot(f.pos.x - spot.x, f.pos.z - spot.z) < 1.2);
    const pick = drawnAmbient(t).filter((f) => { const h = Math.hypot(f.pos.x - d0.x, f.pos.z - d0.z); return h > 4 && h < 12; })
      .map((f) => ({ f, n: around(f.pos).length })).sort((a, b) => b.n - a.n)[0];
    expect(pick && pick.n, 'a full cloud nearby').toBeGreaterThan(8);
    const spot = pick.f.pos.clone(), meanY = (list) => list.reduce((s2, f) => s2 + f.pos.y, 0) / list.length;
    const rest = meanY(around(spot));
    const target = { position: spot };
    let closest = Infinity, k = 0;
    for (; k < 600; k++) {
      chaseStep(t, target, 0.5);
      const d = t.controller.getState().diver;
      if (Math.hypot(d.x - spot.x, d.z - spot.z) < 0.8) break;
    }
    expect(k, 'the diver reached the cloud').toBeLessThan(600);
    t.controller.setInput(null);
    for (let w = 0; w < 30; w++) {
      t.step(50);
      const d = t.controller.getState().diver;
      drawnAmbient(t).forEach((f) => { closest = Math.min(closest, Math.hypot(f.pos.x - d.x, f.pos.y - d.y, f.pos.z - d.z)); });
    }
    const hiding = around(spot);
    expect(hiding.length).toBeGreaterThan(4);
    expect(meanY(hiding), 'the cloud sank into its coral').toBeLessThan(rest - 0.25);
    expect(closest, 'no fish stays inside the diver').toBeGreaterThan(0.5);
    // The diver rises well clear and hangs still; the cloud comes back up.
    t.controller.setInput({ rise: 1 }); t.run(2.5); t.controller.setInput(null); t.run(10);
    const back = around(spot);
    expect(back.length).toBeGreaterThan(4);
    expect(Math.abs(meanY(back) - rest), 'the cloud rose again').toBeLessThan(0.2);
  });
});

describe('Lane H1: fish keep their distance from the diver', () => {
  it('drops a planktivore school toward its coral as the diver comes, but not while it is being identified', () => {
    const free = mount({ quality: 'low', site: toolSite('healthy') }, { species: 'real' }), kept = mount({ quality: 'low', site: toolSite('healthy') }, { species: 'real' });
    const uid = census(free).find((o) => o.speciesId === 'anthias').uid;
    expect(arrive(free, uid) && arrive(kept, uid)).toBe(true);
    free.controller.clearFocus();
    const a = census(free).find((o) => o.uid === uid).object, b = census(kept).find((o) => o.uid === uid).object, start = a.position.y;
    // The focused school lets the student come much closer before it, too, ducks.
    let lowest = Infinity, ahead = 0, sideways = 0;
    for (let k = 0; k < 120; k++) {
      chaseStep(free, a, 0.4); chaseStep(kept, b, 0.4);
      lowest = Math.min(lowest, a.position.y); ahead = Math.max(ahead, b.position.y - a.position.y);
      sideways = Math.max(sideways, Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z));
    }
    expect(lowest, 'the free school sank toward the coral').toBeLessThan(start - 0.3);
    expect(sideways, 'it hides in its own coral head rather than swimming off').toBeLessThan(1.1);
    expect(ahead, 'the school being identified stayed up longer').toBeGreaterThan(0.2);
  });

  it('parts a school around a diver who swims through it, and closes it up again behind', () => {
    // A big school the student is looking at barely moves off, so a quick swim takes
    // the diver right through it: the members nearest the diver make room.
    const t = mount({ quality: 'low', site: toolSite('healthy') }, { species: 'real' });
    const school = census(t).find((o) => o.speciesId === 'bluestripe_snapper');
    expect(arrive(t, school.uid)).toBe(true);
    const root = school.object, body = root.getObjectByName('bluestripe_snapper-body'), m = new THREE.Matrix4(), p = new THREE.Vector3();
    const members = () => {
      root.updateMatrixWorld(true);
      const out = [];
      for (let i = 0; i < body.count; i++) { body.getMatrixAt(i, m); m.premultiply(body.matrixWorld); out.push(p.setFromMatrixPosition(m).clone()); }
      return out;
    };
    const spread = (all) => { const c = all.reduce((v, q) => v.add(q), new THREE.Vector3()).multiplyScalar(1 / all.length); return Math.max(...all.map((q) => q.distanceTo(c))); };
    const rest = spread(members());
    let inside = 0, closest = Infinity;
    for (let k = 0; k < 200; k++) {
      chaseStep(t, root, 1);
      const d = t.controller.getState().diver, eye = new THREE.Vector3(d.x, d.y, d.z);
      if (eye.distanceTo(root.position) > 1.5) continue;
      inside++;
      members().forEach((q) => { closest = Math.min(closest, q.distanceTo(eye)); });
    }
    expect(inside, 'the diver swam into the school').toBeGreaterThan(10);
    expect(closest, 'members make room around the diver').toBeGreaterThan(0.35);
    // Swimming on and out, the school closes up behind.
    t.controller.clearFocus(); t.controller.setInput({ forward: 1, turn: 0.3 }); t.run(5); t.controller.setInput(null); t.run(8);
    const d = t.controller.getState().diver, all = members();
    expect(all[0].distanceTo(new THREE.Vector3(d.x, d.y, d.z))).toBeGreaterThan(3);
    expect(spread(all), 'formation back to its own size').toBeLessThan(rest * 1.15 + 0.1);
  });

  it('lets a slow, calm diver come closer than a fast one, small fish closer than wary sweetlips, and lionfish closest', () => {
    const slow = flightOnset('oriental_sweetlips', 0.2), fast = flightOnset('oriental_sweetlips', 1);
    const small = flightOnset('threadfin_butterflyfish', 0.2), bold = flightOnset('lionfish', 0.2);
    for (const r of [slow, fast, small]) expect(r.frame, 'the diver reached the fish').toBeGreaterThan(0);
    expect(fast.distance, 'a fast diver startles it sooner').toBeGreaterThan(slow.distance + 1.2);
    expect(slow.distance).toBeGreaterThan(1.6); expect(slow.distance).toBeLessThan(3.5);
    expect(small.distance, 'small reef fish: one to two metres').toBeGreaterThan(0.8);
    expect(small.distance).toBeLessThan(2);
    expect(small.distance).toBeLessThan(slow.distance - 0.4);
    // A venomous lionfish lets the diver come within a metre and barely moves aside.
    if (bold.frame < 0) expect(bold.closest).toBeLessThan(1);
    else expect(bold.distance).toBeLessThan(small.distance * 0.6);
  });

  it('keeps every reaction smaller under reduced motion', () => {
    const normal = flightOnset('oriental_sweetlips', 0.6), calm = flightOnset('oriental_sweetlips', 0.6, true);
    expect(calm.frame).toBeGreaterThan(0);
    expect(calm.distance).toBeLessThan(normal.distance * 0.8);
  });

  it('keeps a focused fish within reach while the student identifies it, and swimTo still arrives', () => {
    const population = [{ id: 'oriental_sweetlips', count: 1 }, { id: 'brain_coral', count: 3 }];
    const focused = mount({ site: site({ population }) }), freed = mount({ site: site({ population }) });
    const uid = census(focused).find((o) => o.speciesId === 'oriental_sweetlips').uid;
    expect(arrive(focused, uid) && arrive(freed, uid)).toBe(true);
    expect(focused.controller.getState().focused.distanceM, 'swimTo arrives').toBeLessThan(4.5);
    freed.controller.clearFocus();
    // The student follows it slowly to look closer.
    const fa = fishOf(focused, 'oriental_sweetlips'), fb = fishOf(freed, 'oriental_sweetlips');
    let farFocused = 0, nearFocused = Infinity, nearFreed = Infinity, apart = 0;
    for (let k = 0; k < 160; k++) {
      chaseStep(focused, fa, 0.25); chaseStep(freed, fb, 0.25);
      const d = focused.controller.getState().focused.distanceM, e = freed.controller.getState().diver;
      farFocused = Math.max(farFocused, d); nearFocused = Math.min(nearFocused, d);
      nearFreed = Math.min(nearFreed, Math.hypot(fb.position.x - e.x, fb.position.y - e.y, fb.position.z - e.z));
      apart = Math.max(apart, fa.position.distanceTo(fb.position));
    }
    expect(farFocused, 'the focused fish stays in the Nearby range').toBeLessThan(8);
    expect(nearFocused, 'the student gets a close look').toBeLessThan(1.6);
    expect(nearFreed, 'an unfocused fish keeps its distance from the same diver').toBeGreaterThan(nearFocused + 0.8);
    expect(apart).toBeGreaterThan(0.6);
  });
});

describe('Lane H1: determinism', () => {
  it('flees the same way however the same seconds are split into frames', () => {
    const population = [{ id: 'oriental_sweetlips', count: 1 }, { id: 'threadfin_butterflyfish', count: 2 }, { id: 'emperor_angelfish', count: 1 }, { id: 'brain_coral', count: 3 }];
    // The diver hangs beside the sweetlips, then lets it go: it swims off while the
    // same seconds pass as 50, 16.7 or 25 ms frames. A dive that keeps it focused
    // shows that it really fled.
    const dive = (focus) => {
      const t = mount({ site: site({ population }) });
      expect(arrive(t, census(t).find((o) => o.speciesId === 'oriental_sweetlips').uid)).toBe(true);
      // Edge a little closer, then hang still.
      t.controller.setInput({ forward: 0.3 }); t.run(1); t.controller.setInput(null); t.run(20);
      if (!focus) t.controller.clearFocus();
      return t;
    };
    const runs = [dive(false), dive(false), dive(false)], kept = dive(true);
    let fled = 0;
    for (let k = 0; k < 80; k++) { runs[0].step(50); kept.step(50); fled = Math.max(fled, fishOf(runs[0], 'oriental_sweetlips').position.distanceTo(fishOf(kept, 'oriental_sweetlips').position)); }
    runs[1].run(4, 1000 / 60); runs[2].run(4, 25);
    expect(fled, 'the sweetlips fled').toBeGreaterThan(0.3);
    const pos = (t) => census(t).filter((o) => o.object).map((o) => o.object.position);
    const ref = pos(runs[0]);
    for (const t of runs.slice(1)) pos(t).forEach((p, i) => {
      expect(Math.hypot(p.x - ref[i].x, p.z - ref[i].z), 'same path').toBeLessThan(1e-6);
      expect(Math.abs(p.y - ref[i].y)).toBeLessThan(0.1);
    });
  });

  it('keeps the crowd identical across frame splits while the diver waits beside a cloud', () => {
    const runs = [50, 1000 / 60].map((ms) => {
      const t = mount({ quality: 'low', site: toolSite('healthy') }, { species: 'real' });
      t.run(0.5);
      // Wait beside the organism closest under a drawn cloud.
      const fish = drawnAmbient(t)[0].pos, all = census(t).filter((o) => o.pos);
      const under = all.sort((a, b) => a.pos.distanceTo(fish) - b.pos.distanceTo(fish))[0];
      expect(arrive(t, under.uid)).toBe(true);
      t.controller.clearFocus();
      t.run(4, ms);
      return t;
    });
    const key = (t) => drawnAmbient(t).map((f) => f.pos.toArray().map((v) => v.toFixed(5)).join(',')).sort().join('|');
    expect(drawnAmbient(runs[0]).length).toBeGreaterThan(5);
    expect(key(runs[1])).toBe(key(runs[0]));
  });
});
