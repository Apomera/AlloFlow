import { afterEach, describe, expect, it, vi } from 'vitest';
import { THREE, runtime, census, toolSite, drawnAmbient, arrive } from './helpers/reef_life_harness.js';
import { runtime as ecoRuntime, census as ecoCensus, puffs } from './helpers/reef_ecology_harness.js';

// Calm, still divers see more life, and every fish reacts sensibly to the diver.
// While the diver hangs still, fish and planktivore clouds grow used to it: flight
// distances and cloud alarm radii shrink, hidden clouds come back up and a few
// roaming fish drift in front of the mask. A burst of speed undoes it. Grazers and
// cleaning-station clients keep their distance from the diver on their journeys,
// never while they bite or pose. Real species models are slow to build, so allow time.
vi.setConfig({ testTimeout: 240000 });
const open = [];
afterEach(() => { while (open.length) open.pop().dispose(); });
function mount(options, how) { const t = runtime(options, how); open.push(t); return t; }
function site(over = {}) { return { seed: 6, depthM: 9, health: { coralCover: 0.6, bleaching: 0, algae: 0.05 }, population: [], restoration: null, ...over }; }
const CURIOUS = ['emperor_angelfish', 'clown_triggerfish', 'blue_tang', 'moorish_idol', 'threadfin_butterflyfish', 'porcupinefish', 'yellow_boxfish'];
const FISH = /fish|tang|idol|angelfish|anthias|chromis|snapper|sweetlips|grouper|wrasse|turtle|ray|shark|manta|moray/;
const diverOf = (t) => { const d = t.controller.getState().diver; return new THREE.Vector3(d.x, d.y, d.z); };
const bearingDeg = (dx, dz) => ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
const gap = (a, b) => ((a - b + 540) % 360) - 180;
// Steer straight at a target with a fixed forward input, one 50 ms frame at a time.
function chaseStep(t, p, forward) {
  const d = t.controller.getState().diver, off = gap(bearingDeg(p.x - d.x, p.z - d.z), d.headingDeg);
  t.controller.setInput({ forward: Math.abs(off) < 50 ? forward : 0.05, turn: Math.max(-1, Math.min(1, off / 25)), rise: Math.max(-1, Math.min(1, (p.y - d.y) * 0.8)) });
  t.step(50);
}

// Two dives in lockstep, as in Lane H1's flight tests: the diver glides up to a
// sweetlips with it focused and edges a little closer; then one dive lets it go (it
// swims off to its flight distance) and the other keeps it focused (it stays on its
// route). How far apart the two fish are is how far the free one keeps away. Both
// divers then hang still, or keep turning on the spot (not calm).
function released(how) {
  const population = [{ id: 'oriental_sweetlips', count: 1 }, { id: 'brain_coral', count: 3 }];
  const make = () => {
    const t = mount({ site: site({ population }) }), fish = census(t).find((o) => o.speciesId === 'oriental_sweetlips');
    expect(arrive(t, fish.uid)).toBe(true);
    t.controller.setInput({ forward: 0.3 }); t.run(1); t.controller.setInput(how === 'turning' ? { turn: 0.5 } : null);
    return { t, fish: fish.object };
  };
  const free = make(), kept = make();
  free.t.controller.clearFocus();
  const off = () => free.fish.position.distanceTo(kept.fish.position), rows = [];
  const run = (s) => { for (let k = 0; k < s * 20; k++) { free.t.step(50); kept.t.step(50); } };
  for (let k = 0; k < 70; k++) { run(0.5); rows.push(off()); }
  return { free, kept, off, run, rows };
}

describe('a calm diver lets fish come closer', () => {
  it('a fish that swam off settles while the diver hangs still and comes back onto its route', () => {
    const calm = released('still'), busy = released('turning');
    const fled = Math.max(...calm.rows.slice(2, 8));
    expect(fled, 'it first swims off to its flight distance').toBeGreaterThan(0.3);
    expect(Math.max(...calm.rows.slice(50)), 'after half a minute of calm it is back on its route').toBeLessThan(0.1);
    // Beside a diver who keeps turning on the spot it keeps away.
    expect(Math.max(...busy.rows.slice(2, 8))).toBeGreaterThan(0.3);
    expect(Math.min(...busy.rows.slice(50)), 'no settling without calm').toBeGreaterThan(0.25);
  });

  it('a burst of speed undoes it: the fish keeps its full distance again', () => {
    const runs = ['burst', 'still'].map((how) => {
      const r = released('still');
      expect(r.off(), 'settled first').toBeLessThan(0.1);
      // A hard climb and straight back down (about a second each), then hang still again.
      [r.free, r.kept].forEach((d) => d.t.controller.setInput(how === 'burst' ? { rise: 1 } : null)); r.run(1);
      [r.free, r.kept].forEach((d) => d.t.controller.setInput(how === 'burst' ? { rise: -1 } : null)); r.run(1);
      [r.free, r.kept].forEach((d) => d.t.controller.setInput(null)); r.run(3);
      return r.off();
    });
    expect(runs[0], 'startled again after the burst').toBeGreaterThan(0.3);
    expect(runs[1], 'a diver that stays calm keeps it close').toBeLessThan(0.1);
  });

  it('a planktivore cloud that sank at the diver comes back up while the diver hangs still beside it', () => {
    const t = mount({ quality: 'high', site: toolSite('healthy') }, { species: 'real' });
    t.run(0.5);
    const d0 = diverOf(t);
    const around = (spot) => drawnAmbient(t).filter((f) => Math.hypot(f.pos.x - spot.x, f.pos.z - spot.z) < 1.2);
    const pick = drawnAmbient(t).filter((f) => { const h = Math.hypot(f.pos.x - d0.x, f.pos.z - d0.z); return h > 4 && h < 12; })
      .map((f) => ({ f, n: around(f.pos).length })).sort((a, b) => b.n - a.n)[0];
    expect(pick && pick.n, 'a full cloud nearby').toBeGreaterThan(8);
    const spot = pick.f.pos.clone(), meanY = (list) => list.reduce((s, f) => s + f.pos.y, 0) / list.length, rest = meanY(around(spot));
    // Swim in just above the cloud, back off a little, then hang still beside it.
    let k = 0;
    for (; k < 600; k++) { chaseStep(t, { x: spot.x, y: spot.y + 0.8, z: spot.z }, 0.5); const d = diverOf(t); if (Math.hypot(d.x - spot.x, d.z - spot.z) < 0.8) break; }
    expect(k, 'the diver reached the cloud').toBeLessThan(600);
    t.controller.setInput(null); t.run(2);
    t.controller.setInput({ forward: -0.6 }); t.run(2); t.controller.setInput(null); t.run(1);
    const sunk = meanY(around(spot)), contacts = t.controller.getState().buoyancy.reefContacts;
    expect(sunk, 'it sank into its coral').toBeLessThan(rest - 0.5);
    t.run(40);
    const back = around(spot), d = diverOf(t);
    expect(back.length).toBeGreaterThan(4);
    expect(meanY(back), 'and rose again beside the still diver').toBeGreaterThan(rest - 0.15);
    expect(Math.hypot(d.x - spot.x, d.z - spot.z), 'the diver is still beside it').toBeLessThan(1.6);
    expect(t.controller.getState().buoyancy.reefContacts, 'without touching the reef while it waits').toBe(contacts);
  });
});

describe('near-field life for a calm diver (healthy reef)', () => {
  // Fish (real organisms, not the crowd) in the camera's view within reach.
  function inView(t, reach, fromDiver) {
    const cam = t.camera; cam.updateMatrixWorld();
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const from = fromDiver ? diverOf(t) : cam.position;
    return census(t).filter((o) => o.object && FISH.test(o.speciesId) && fr.containsPoint(o.object.position) && o.object.position.distanceTo(from) < reach).map((o) => o.speciesId);
  }
  it('fish swim into the mask view within a few metres while the diver hangs still, and leave when it sprints', () => {
    const t = mount({ quality: 'low', view: 'first', site: toolSite('healthy') }, { species: 'real' });
    const seen = [];
    for (let s = 0; s < 25; s++) { t.run(1); seen.push(inView(t, 3, false)); }
    const late = seen.slice(10);
    expect(late.filter((l) => l.length).length, 'seconds with a fish within 3 m in view').toBeGreaterThanOrEqual(3);
    expect(new Set(late.flat()).size, 'more than one kind comes').toBeGreaterThanOrEqual(2);
    t.controller.setInput({ forward: 1 }); t.run(3);
    expect(inView(t, 3, false).length, 'a sprinting diver scatters them').toBe(0);
  });

  it('third person: roaming fish come to swim within a couple of metres of the still diver, in view', () => {
    const t = mount({ quality: 'low', view: 'third', site: toolSite('healthy') }, { species: 'real' });
    let company = 0;
    for (let s = 0; s < 25; s++) { t.run(1); if (s >= 10 && inView(t, 2.5, true).some((id) => CURIOUS.includes(id))) company++; }
    expect(company, 'seconds with a roaming fish within 2.5 m of the diver, in view').toBeGreaterThanOrEqual(4);
  });
});

describe('reduced motion', () => {
  it('lets fish settle but never draws visitors over to the diver', () => {
    // Hanging still and turning on the spot differ only in calm: with reduced motion the
    // roaming fish around keep exactly the same routes; without it, some come over.
    const curiousPaths = (reducedMotion, how) => {
      const t = mount({ quality: 'low', view: 'first', reducedMotion, site: toolSite('healthy') }, { species: 'real' });
      if (how === 'turning') t.controller.setInput({ turn: 0.5 });
      t.run(30);
      return census(t).filter((o) => o.object && CURIOUS.includes(o.speciesId)).map((o) => o.object.position.clone());
    };
    const spread = (a, b) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.z - b[i].z)));
    const rStill = curiousPaths(true, 'still'), rTurn = curiousPaths(true, 'turning');
    expect(rStill.length).toBeGreaterThan(2);
    expect(spread(rStill, rTurn), 'reduced motion: no visitors').toBeLessThan(1e-6);
    const nStill = curiousPaths(false, 'still'), nTurn = curiousPaths(false, 'turning');
    expect(spread(nStill, nTurn), 'full motion: visitors came over').toBeGreaterThan(1);
  });
});

describe('grazers and clients on their journeys', () => {
  const CLIENTS = ['peacock_grouper', 'parrotfish'];
  // Two dives in lockstep: one diver chases the grazers and clients at speed, the
  // other hangs at the start. Returns per-frame records of both.
  function lockstep(seconds, targetOf) {
    const a = ecoRuntime(), b = ecoRuntime();
    const ids = ecoCensus(a).filter((o) => o.object && CLIENTS.concat(['bumphead_parrotfish']).includes(o.speciesId)).map((o) => o.uid);
    const objs = (t) => ids.map((uid) => ecoCensus(t).find((o) => o.uid === uid).object);
    const A = objs(a), B = objs(b);
    const rows = [];
    for (let i = 0; i < seconds * 20; i++) {
      chaseStep(a, targetOf(A, i), 0.9); b.step(50);
      rows.push({ i, a: A.map((o) => ({ x: o.position.x, z: o.position.z, spread: o.userData.motion ? o.userData.motion.spread || 0 : 0, pitch: o.rotation.z, mouth: new THREE.Vector3(0.21, 0, 0).applyQuaternion(o.quaternion).add(o.position) })),
        b: B.map((o) => ({ x: o.position.x, z: o.position.z, spread: o.userData.motion ? o.userData.motion.spread || 0 : 0, pitch: o.rotation.z, mouth: new THREE.Vector3(0.21, 0, 0).applyQuaternion(o.quaternion).add(o.position) })), puffsA: puffs(a), puffsB: puffs(b) });
    }
    return { a, b, ids, A, B, rows, species: ids.map((uid) => ecoCensus(a).find((o) => o.uid === uid).speciesId) };
  }

  it('veer from a fast diver while travelling, but bite and pose exactly on schedule', () => {
    // Chase each parrotfish in turn, then the groupers.
    const run = lockstep(150, (A, i) => A[Math.floor(i / 400) % A.length].position);
    const { rows, species } = run;
    let veered = new Set(), feedFrames = 0, poseFrames = 0;
    rows.forEach((r) => r.a.forEach((p, j) => {
      const q = r.b[j], apart = Math.hypot(p.x - q.x, p.z - q.z);
      if (apart > 0.3) veered.add(species[j]);
      // A parrotfish with its head down is biting; a client with its fins spread is posing:
      // the chased fish is exactly where the undisturbed one is.
      if (species[j] === 'parrotfish' && q.pitch < -0.5 && p.pitch < -0.5) { feedFrames++; expect(apart, 'biting ' + j + ' at frame ' + r.i).toBeLessThan(1e-6); }
      if (q.spread > 0.9 && p.spread > 0.9) { poseFrames++; expect(apart, 'posing ' + j + ' at frame ' + r.i).toBeLessThan(1e-6); }
    }));
    expect(feedFrames, 'bites watched').toBeGreaterThan(100);
    expect(poseFrames, 'poses watched').toBeGreaterThan(40);
    expect([...veered].sort(), 'parrotfish, the bumphead group and the groupers kept away from the diver').toEqual(['bumphead_parrotfish', 'parrotfish', 'peacock_grouper']);
    // Every bite in both dives is the same bite at the same time and place.
    // (A puff's key repeats from one feeding patch to the next; key and time name one bite.)
    const seen = (key) => { const m = new Map(); rows.forEach((r) => r[key].forEach((p) => m.set(p.key + '@' + p.t.toFixed(4), [p.bx, p.by, p.bz, p.size]))); return m; };
    const pa = seen('puffsA'), pb = seen('puffsB');
    let shared = 0;
    pa.forEach((v, key) => { if (pb.has(key)) { shared++; expect(pb.get(key)).toEqual(v); } });
    expect(shared, 'bites in common').toBeGreaterThan(10);
    // With the diver darting about, each new puff still rises at a biting mouth, just as
    // it does beside the diver who hangs still. Born since the last frame (the first
    // frame of a mount has no elapsed time).
    const mouths = (side, list) => { const out = new Map(); rows.forEach((r) => r[list].forEach((p) => {
      if (r.i * 0.05 - p.t > 0.05 + 1e-9 || p.size >= 0.085) return;
      out.set(p.key + '@' + p.t.toFixed(4), Math.min(...r[side].filter((x, j) => species[j] === 'parrotfish').map((x) => x.mouth.distanceTo(new THREE.Vector3(p.bx, p.by, p.bz)))));
    })); return out; };
    const ma = mouths('a', 'puffsA'), mb = mouths('b', 'puffsB');
    expect(ma.size, 'new puffs watched').toBeGreaterThan(5);
    let both = 0;
    let worst = 0;
    ma.forEach((d, key) => { if (mb.has(key)) { both++; worst = Math.max(worst, Math.abs(d - mb.get(key))); } });
    console.log('MOUTHS', ma.size, mb.size, both, worst.toFixed(4));
    // Level with the bite exactly (above); a veer can leave the height a few centimetres
    // behind for a moment (the pose's terrain smoothing), never more.
    expect(worst, 'the same bite, the same mouth').toBeLessThan(0.06);
    expect(both, 'bites seen in both dives').toBeGreaterThan(5);
    expect(Math.max(...ma.values()), 'puff at a biting mouth').toBeLessThan(Math.max(0.3, ...mb.values()) + 0.02);
    expect(run.a.errors).toEqual([]);
  });
});

describe('determinism', () => {
  it('settles the same way however the same seconds are split into frames', () => {
    const runs = [50, 1000 / 60, 25].map((ms) => {
      const t = mount({ quality: 'low', view: 'third', site: toolSite('healthy') }, { species: 'real' });
      t.step(50);
      t.run(24, ms);
      return t;
    });
    const pos = (t) => census(t).filter((o) => o.object).map((o) => o.object.position);
    const ref = pos(runs[0]);
    for (const t of runs.slice(1)) pos(t).forEach((p, i) => expect(Math.hypot(p.x - ref[i].x, p.z - ref[i].z), 'same path ' + i).toBeLessThan(1e-6));
    const key = (t) => drawnAmbient(t).map((f) => f.pos.toArray().map((v) => v.toFixed(5)).join(',')).sort().join('|');
    expect(drawnAmbient(runs[0]).length).toBeGreaterThan(5);
    runs.slice(1).forEach((t) => expect(key(t)).toBe(key(runs[0])));
    // Visitors really came: the fixture is not vacuous.
    const d = diverOf(runs[0]);
    expect(census(runs[0]).filter((o) => o.object && CURIOUS.includes(o.speciesId) && o.object.position.distanceTo(d) < 3.5).length).toBeGreaterThan(0);
  });
});
