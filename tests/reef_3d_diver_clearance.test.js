import { afterEach, describe, expect, it, vi } from 'vitest';
import { site, runtime, census, cleanup, rockIndex, deepest, bodyPoints, turnTo, nearestWall, bearingTo, angleGap, headingRad } from './helpers/reef_clearance_perf_harness.js';

// The diver's whole body stays out of the rock. Backing or turning low beside a
// coral head used to put the fins up to 1.8 m inside it (constrainDiver looked only ahead).
// Every point of the drawn rig (fin blades, ankles, knees, hips, hands, chest, face) is
// measured against the DRAWN floor and bommie meshes (an exact height index of them).
vi.setConfig({ testTimeout: 240000 });
afterEach(cleanup);

const SESSILE = /coral|sponge|clam|fan|anemone/;
// Go to each attached organism, settle low, find the nearest bommie wall, face away from it
// and back into it, then turn both ways and back again turning. Records every 50 ms step.
function maneuvers(t, H, limit = 4) {
  const out = [];
  for (const o of census(t).filter((c) => SESSILE.test(c.speciesId))) {
    if (out.length >= limit) break;
    t.controller.swimTo(o.uid); t.run(16);
    t.controller.setInput({ rise: -1 }); t.run(3); t.controller.setInput(null); t.run(0.5);
    const wall = nearestWall(t);
    if (!wall || wall[1] > 4) continue;
    turnTo(t, wall[0] + Math.PI);
    const rec = { uid: o.uid, wall: wall[1], steps: [] };
    const phase = (name, input, s) => {
      t.controller.setInput(input);
      for (let i = 0; i < s * 20; i++) { t.step(50); const d = deepest(t, H); rec.steps.push({ name, depth: d.depth, part: d.part, diver: t.state().diver, pos: rig(t).position.clone(), b: t.state().buoyancy }); }
    };
    phase('back', { forward: -1, rise: -0.4 }, 5);
    phase('turn+', { forward: 0, turn: 1, rise: -0.3 }, 3);
    phase('turn-', { forward: 0, turn: -1, rise: -0.3 }, 3);
    phase('backturn', { forward: -0.5, turn: 0.5, rise: -0.5 }, 3);
    t.controller.setInput(null);
    out.push(rec);
  }
  return out;
}
const jump = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
// The drawn diver (getState rounds to centimetres, too coarse to see a shake).
const rig = (t) => t.scene.getObjectByName('reef-explore-diver');

describe('the diver stays out of the rock', () => {
  it('keeps every fin point out of a bommie while backing and turning low against it', () => {
    const t = runtime(), H = rockIndex(t), list = maneuvers(t, H);
    expect(list.length, 'the maneuver found coral heads to back into').toBeGreaterThanOrEqual(3);
    let pressed = 0, worst = -Infinity, worstAt = '';
    for (const m of list) {
      for (const s of m.steps) if (s.depth > worst) { worst = s.depth; worstAt = m.uid + ' ' + s.name + ' ' + s.part; }
      // The legs really reached the rock: within a few centimetres of it.
      if (m.steps.some((s) => s.depth > -0.06)) pressed++;
    }
    expect(pressed, 'the backing reached the rock in most maneuvers').toBeGreaterThanOrEqual(2);
    // Within a brush of the drawn surface (its triangles and the rock's own heights differ by mm).
    expect(worst, 'deepest body point inside rock (' + worstAt + ')').toBeLessThan(0.04);
  });

  it('moves smoothly against the rock: no pops, no shaking, and it swims away at once', () => {
    const t = runtime(), H = rockIndex(t), list = maneuvers(t, H, 3);
    for (const m of list) {
      let maxStep = 0, reversals = 0;
      for (let i = 1; i < m.steps.length; i++) {
        const a = m.steps[i - 1], b = m.steps[i];
        maxStep = Math.max(maxStep, jump(b.pos, a.pos));
        // Shaking = the diver stepping back and forth under one steady input while its body
        // is at the rock (away from it, the soft clearance above the reef may lift a sink).
        if (i < 2 || b.name !== a.name || m.steps[i - 2].name !== a.name || Math.max(a.depth, b.depth) < -0.15) continue;
        const p = m.steps[i - 2].pos, u = a.pos.clone().sub(p), v = b.pos.clone().sub(a.pos);
        if (u.length() > 0.01 && v.length() > 0.01 && u.dot(v) < 0) reversals++;
      }
      // Swimming tops out at 1.5 m/s (0.075 m a step); the soft clearance rise can add a little.
      expect(maxStep, m.uid + ' largest 50 ms step').toBeLessThan(0.2);
      expect(reversals, m.uid + ' back-and-forth steps against the rock').toBe(0);
    }
    // And it is not stuck: pressed back against a wall for a second, it answers a forward
    // stroke at once. (From rest a diver covers about 1.4 m in 1.5 s; one still backing
    // at full speed would first have to stop, and cover about 1.0 m.)
    let pressed = 0;
    for (const m of list) {
      const o = census(t).find((c) => c.uid === m.uid);
      t.controller.swimTo(o.uid); t.run(16);
      t.controller.setInput({ rise: -1 }); t.run(3); t.controller.setInput(null); t.run(0.5);
      const wall = nearestWall(t);
      if (!wall || wall[1] > 4) continue;
      turnTo(t, wall[0] + Math.PI);
      t.controller.setInput({ forward: -1 });
      let touching = 0;
      for (let i = 0; i < 160 && touching < 20; i++) { t.step(50); if (deepest(t, H).depth > -0.06) touching++; }
      if (touching < 20) continue;
      pressed++;
      const a = rig(t).position.clone();
      t.controller.setInput({ forward: 1 }); t.run(1.5); t.controller.setInput(null);
      expect(jump(rig(t).position, a), m.uid + ' swims away from the rock').toBeGreaterThan(1.25);
    }
    expect(pressed, 'some backing pressed the legs against a wall').toBeGreaterThan(0);
  });

  it('swims low across the reef without a lurch: the climb is quick but capped, the floor continuous', () => {
    // Before: the clearance target stepped with the 0.5 m grid (and its cell maximum),
    // lifting the diver up to 0.5 m in one 50 ms frame at a coral head.
    for (const seed of [7, 8, 9]) {
      const t = runtime({ site: { seed, depthM: 9, health: { coralCover: 0.7, bleaching: 0.05, algae: 0.1 }, population: [{ id: 'brain_coral', count: 4 }], restoration: null } });
      const H = rockIndex(t);
      t.controller.setInput({ rise: -1 }); t.run(4);
      let prev = rig(t).position.clone(), maxRise = 0, maxStep = 0, worst = -Infinity, climbed = 0;
      for (const turn of [0.08, -0.12, 0.2]) {
        t.controller.setInput({ forward: 1, rise: -1, turn });
        for (let i = 0; i < 400; i++) {
          t.step(50);
          const p = rig(t).position.clone();
          maxRise = Math.max(maxRise, p.y - prev.y); maxStep = Math.max(maxStep, p.distanceTo(prev)); climbed += Math.max(0, p.y - prev.y); prev = p;
          if (i % 4 === 0) worst = Math.max(worst, deepest(t, H).depth);
        }
      }
      expect(climbed, seed + ' the swim went up and over the reef').toBeGreaterThan(3);
      expect(maxRise, seed + ' largest rise in one frame').toBeLessThan(0.13);
      expect(maxStep, seed + ' largest move in one frame').toBeLessThan(0.16);
      expect(worst, seed + ' deepest body point inside rock').toBeLessThan(0.04);
      cleanup();
    }
  });

  it('starts each dive just inside the calm band: hovering still at the start counts as calm', () => {
    // senseReef counts calm only below 2.2 m over the reef; the spawn used to sit exactly at 2.2 m.
    for (const over of [{}, { seed: 6 }, { seed: 11 }]) {
      const t = runtime({ site: site(over) }), H = rockIndex(t);
      t.run(5);
      const b = t.state().buoyancy;
      expect(b.state, JSON.stringify(over) + ' hovering still at the start').toBe('calm');
      expect(b.calmS).toBeGreaterThan(2);
      expect(deepest(t, H).depth).toBeLessThan(0.04);
      cleanup();
    }
  });

  it('still lets a fin brush the reef (the contact sensing notices), and swimTo still arrives', () => {
    const t = runtime(), H = rockIndex(t), list = maneuvers(t, H);
    const touched = list.some((m) => m.steps.some((s) => s.b.touching || s.b.state === 'touch' || s.b.state === 'close'));
    expect(touched, 'pressing the legs against rock is felt as a contact or a close call').toBe(true);
    // swimTo arrives near each organism (some beside or on a coral head), facing it, and stops.
    for (const o of census(t).filter((c) => SESSILE.test(c.speciesId)).slice(0, 6)) {
      expect(t.controller.swimTo(o.uid)).toBe(true);
      t.run(20);
      const s = t.state();
      expect(s.focused.distanceM, o.uid + ' distance').toBeLessThan(4.5);
      expect(angleGap(headingRad(t), bearingTo(o.pos[0] - s.diver.x, o.pos[2] - s.diver.z)) * 180 / Math.PI, o.uid + ' facing').toBeLessThan(30);
      t.run(1);
      expect(jump(t.state().diver, s.diver), o.uid + ' stopped').toBeLessThan(0.05);
      expect(deepest(t, H).depth, o.uid + ' arrived clear of the rock').toBeLessThan(0.04);
    }
  });

  it('is deterministic for the same inputs and frame times, at any frame split', () => {
    const run = (ms) => {
      const t = runtime(), H = rockIndex(t), list = maneuvers(t, H, 2);
      return { list: list.map((m) => m.steps.map((s) => [s.diver.x, s.diver.y, s.diver.z, s.diver.headingDeg])), H, t };
    };
    const a = run(50), b = run(50);
    expect(b.list).toEqual(a.list);
    // A 60 fps split of the same backing keeps the body clear too.
    const c = runtime(), H = rockIndex(c);
    const o = census(c).filter((x) => SESSILE.test(x.speciesId))[0];
    c.controller.swimTo(o.uid); c.run(16, 1000 / 60); c.controller.setInput({ rise: -1 }); c.run(3, 1000 / 60); c.controller.setInput(null);
    const wall = nearestWall(c);
    if (wall && wall[1] < 4) {
      turnTo(c, wall[0] + Math.PI);
      c.controller.setInput({ forward: -1, rise: -0.4 });
      let worst = -Infinity;
      for (let i = 0; i < 300; i++) { c.step(1000 / 60); worst = Math.max(worst, deepest(c, H).depth); }
      expect(worst).toBeLessThan(0.04);
    }
    expect(bodyPoints(c).every((p) => [p.p.x, p.p.y, p.p.z].every(Number.isFinite))).toBe(true);
  });
});
