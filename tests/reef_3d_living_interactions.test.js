import { describe, expect, it, vi } from 'vitest';
import { runtime, census, puffs, floorBelow, stubSite, siteOf, THREE, SOURCE, SPECIES_SOURCE } from './helpers/reef_ecology_harness.js';

// Lane H2: reef ecology the diver can watch. Cleaning stations with visiting
// clients, parrotfish bites that raise puffs of sediment, turtles surfacing to
// breathe, a crown-of-thorns starfish beside its feeding scar, and anemonefish
// taking cover. Most checks use the stub species (fast, shape-free); the scar and
// the species poses are also checked with the real Reef3DSpecies models.
vi.setConfig({ testTimeout: 240000 });

const CLIENTS = ['peacock_grouper', 'parrotfish'];
const v3 = (a) => new THREE.Vector3(...a);
const pose = (o) => Math.max(Math.abs(o.rotation.z), Math.abs(o.rotation.x));

// Samples every client against station 0's cleaner every `every` seconds.
function watchStation(t, seconds, every = 0.25) {
  const all = census(t), cleaners = all.filter((o) => o.speciesId === 'cleaner_wrasse').map((o) => o.object);
  const st = t.scene.getObjectByName('reef-explore-organisms').userData.cleaningStations[0], spot = v3(st.spot);
  const cleaner = cleaners.slice().sort((a, b) => a.position.distanceTo(spot) - b.position.distanceTo(spot))[0];
  const clients = all.filter((o) => CLIENTS.includes(o.speciesId)).map((o) => o.object);
  const rows = [];
  for (let k = 0; k < seconds / every; k++) {
    t.run(every);
    rows.push({ t: (k + 1) * every, cleaner: cleaner.position.clone(), pitch: cleaner.rotation.z, clients: clients.map((c) => ({ uid: c.userData.exploreUid, p: c.position.clone(), d: c.position.distanceTo(cleaner.position), spread: c.userData.motion ? c.userData.motion.spread || 0 : 0, pose: pose(c) })) });
  }
  return { rows, spot, cleaner, clients };
}

describe('Cleaning stations', () => {
  it('a client comes to the station, poses while the cleaner works over it, then leaves; another comes later', () => {
    const t = runtime();
    const { rows, spot } = watchStation(t, 150);
    // Each unbroken run of posing near station 0 is one visit.
    const visits = [], open = new Map();
    rows.forEach((r, i) => r.clients.forEach((c, j) => {
      const on = c.spread > 0.9 && c.p.distanceTo(spot) < 2, v = open.get(c.uid);
      if (on && v && v.last === i - 1) v.last = i;
      else if (on) { const nv = { uid: c.uid, first: i, last: i, j }; open.set(c.uid, nv); visits.push(nv); }
    }));
    expect(new Set(visits.map((v) => v.uid)).size, 'more than one client visits station 0').toBeGreaterThanOrEqual(2);
    for (const e of visits) {
      const uid = e.uid;
      const during = rows.slice(e.first, e.last + 1).map((r) => r.clients[e.j]);
      expect((e.last - e.first) * 0.25, uid + ' poses for several seconds').toBeGreaterThan(5);
      expect(Math.max(...during.map((c) => c.d)), uid + ' the cleaner stays on the client').toBeLessThan(0.4);
      expect(Math.min(...during.map((c) => c.pose)), uid + ' holds a head-up, head-down or tilted pose').toBeGreaterThan(0.25);
      const before = rows.slice(Math.max(0, e.first - 80), e.first).map((r) => r.clients[e.j].p.distanceTo(spot));
      const after = rows.slice(e.last + 1, e.last + 81).map((r) => r.clients[e.j].p.distanceTo(spot));
      expect(Math.max(...before), uid + ' came from elsewhere').toBeGreaterThan(1.8);
      if (after.length > 60) expect(Math.max(...after), uid + ' leaves again').toBeGreaterThan(1.8);
    }
    // One client at a time poses at the station.
    rows.forEach((r) => expect(r.clients.filter((c) => c.spread > 0.5 && c.p.distanceTo(spot) < 2).length).toBeLessThanOrEqual(1));
    expect(t.errors).toEqual([]);
  });

  it('the cleaner darts from point to point over the client, and dances while it waits', () => {
    const t = runtime();
    const { rows, cleaner } = watchStation(t, 70, 0.1);
    const cleaning = rows.filter((r) => r.clients.some((c) => c.spread > 0.95));
    expect(cleaning.length).toBeGreaterThan(40);
    let moves = 0, quick = 0;
    for (let i = 1; i < cleaning.length; i++) {
      const step = cleaning[i].cleaner.distanceTo(cleaning[i - 1].cleaner);
      if (step > 0.015) moves++;
      if (step > 0.04) quick++;
    }
    expect(moves, 'works over different parts of the body').toBeGreaterThan(8);
    expect(quick, 'darts between them').toBeGreaterThan(3);
    // The dance: the cleaner bobs, rear up and down, while a client comes in.
    let bob = 0;
    for (let i = 10; i < rows.length; i++) {
      const w = rows.slice(i - 10, i).map((r) => r.pitch), swing = Math.max(...w) - Math.min(...w);
      if (swing > 0.3 && !rows[i].clients.some((c) => c.spread > 0.5)) bob++;
    }
    expect(bob, 'dances between clients').toBeGreaterThan(10);
    expect(t.errors).toEqual([]);
  });

  it('places the shrimp on the station rock with the wrasse, and a second station on reefs with two cleaner pairs', () => {
    const t = runtime(), st = t.scene.getObjectByName('reef-explore-organisms').userData.cleaningStations;
    expect(st.length).toBe(2);
    const all = census(t);
    st.forEach((s, i) => {
      const spot = v3(s.spot);
      expect(all.filter((o) => o.speciesId === 'cleaner_shrimp').some((o) => v3(o.pos).distanceTo(spot) < 0.4), 'shrimp at station ' + i).toBe(true);
      expect(all.filter((o) => o.speciesId === 'cleaner_wrasse').some((o) => v3(o.pos).distanceTo(spot) < 0.8), 'wrasse at station ' + i).toBe(true);
    });
    expect(v3(st[0].spot).distanceTo(v3(st[1].spot))).toBeGreaterThan(7);
    // Station 0 is on the coral head in front of the start.
    const d = t.controller.getState().diver;
    expect(Math.hypot(st[0].spot[0] - d.x, st[0].spot[2] - d.z)).toBeLessThan(14);
    const one = runtime({ site: stubSite({ population: stubSite().population.map((p) => p.id === 'cleaner_wrasse' ? { id: p.id, count: 1 } : p) }) });
    expect(one.scene.getObjectByName('reef-explore-organisms').userData.cleaningStations.length).toBe(1);
  });

  it('a reef manta circles slowly over the station, and the cleaner rises to it as it passes', () => {
    const t = runtime(), manta = census(t).find((o) => o.speciesId === 'reef_manta').object;
    const st = t.scene.getObjectByName('reef-explore-organisms').userData.cleaningStations[0], top = v3(st.top);
    const cleaner = census(t).filter((o) => o.speciesId === 'cleaner_wrasse').map((o) => o.object).sort((a, b) => a.position.distanceTo(v3(st.spot)) - b.position.distanceTo(v3(st.spot)))[0];
    let close = 0, far = 0, rose = 0, slowest = Infinity, fastest = 0, last = manta.position.clone();
    for (let i = 0; i < 1600; i++) {
      t.run(0.1);
      const r = Math.hypot(manta.position.x - top.x, manta.position.z - top.z), sp = manta.position.distanceTo(last) / 0.1; last.copy(manta.position);
      if (r < 2.6) { close++; slowest = Math.min(slowest, sp); } else if (r > 5) { far++; fastest = Math.max(fastest, sp); }
      if (cleaner.position.y > v3(st.spot).y + 0.9) rose++;
    }
    expect(close, 'circles close over the station').toBeGreaterThan(300);
    expect(far, 'and cruises wider loops').toBeGreaterThan(200);
    expect(slowest).toBeLessThan(fastest * 0.5);
    expect(rose, 'the cleaner leaves the rock to reach the manta').toBeGreaterThan(5);
    expect(t.errors).toEqual([]);
  });
});

describe('Parrotfish grazing', () => {
  it('each bite raises a puff of sediment at the mouth that rises, drifts and settles', () => {
    const t = runtime();
    const fish = census(t).filter((o) => o.speciesId === 'parrotfish').map((o) => o.object);
    const track = new Map(), headDown = new Set();
    for (let i = 0; i < 600; i++) {
      t.step(50);
      fish.forEach((f) => { if (f.rotation.z < -0.45) headDown.add(f.userData.exploreUid); });
      for (const p of puffs(t)) {
        const age = (i + 1) * 0.05 - p.t, rows = track.get(p.key) || [];
        rows.push({ age, y: p.y - p.by, alpha: p.alpha, drift: Math.hypot(p.x - p.bx, p.z - p.bz), r: p.r });
        track.set(p.key, rows);
        // A new puff appears where a parrotfish has its mouth on the rock (the
        // bumphead group's bites are checked below).
        if (age < 0.06 && p.size < 0.085) {
          const mouth = Math.min(...fish.map((f) => { const m = new THREE.Vector3(0.21, 0, 0).applyQuaternion(f.quaternion).add(f.position); return m.distanceTo(new THREE.Vector3(p.bx, p.by, p.bz)); }));
          expect(mouth, 'puff at a biting mouth').toBeLessThan(0.3);
        }
      }
    }
    expect(headDown.size, 'parrotfish feed head down').toBeGreaterThanOrEqual(2);
    const full = [...track.values()].filter((rows) => rows[0].age < 0.1 && rows[rows.length - 1].age > 4.5);
    expect(full.length, 'puffs followed through their life').toBeGreaterThan(5);
    for (const rows of full) {
      const at = (a) => rows.reduce((best, r) => Math.abs(r.age - a) < Math.abs(best.age - a) ? r : best);
      expect(at(1).y, 'kicked up').toBeGreaterThan(at(0).y + 0.05);
      expect(at(4.8).y, 'settles back').toBeLessThan(at(1).y - 0.06);
      expect(at(3).drift, 'carried by the surge').toBeGreaterThan(at(0.2).drift + 0.04);
      expect(at(2).r).toBeGreaterThan(at(0).r);
      expect(at(4.9).alpha, 'fades').toBeLessThan(0.15);
    }
    // The pool draws exactly the live puffs, every vertex finite.
    const mesh = t.scene.getObjectByName('reef-explore-sediment');
    expect(mesh.geometry.drawRange.count).toBe(puffs(t).length * 24);
    expect([...mesh.geometry.attributes.position.array.slice(0, puffs(t).length * 27)].every(Number.isFinite)).toBe(true);
    expect(t.errors).toEqual([]);
  });

  it('keeps grazers clear of the rock while they bite, and the bumphead group dips its heads on the open rock', () => {
    const t = runtime(), all = census(t), fish = all.filter((o) => o.speciesId === 'parrotfish').map((o) => o.object);
    const group = all.find((o) => o.speciesId === 'bumphead_parrotfish').object;
    let grazing = 0, groupBites = 0;
    for (let s = 0; s < 120; s++) {
      t.run(0.5);
      for (const f of fish) expect(f.position.y, 'clear of the reef').toBeGreaterThan(floorBelow(t, f.position.x, f.position.z) + 0.05);
      if (group.userData.motion && group.userData.motion.graze > 0.9) grazing++;
      groupBites += puffs(t).filter((p) => p.size > 0.085).length;
    }
    expect(grazing, 'the group feeds at its patches').toBeGreaterThan(20);
    expect(groupBites, 'and its bites raise puffs').toBeGreaterThan(5);
  });
});

describe('Bite marks on open rock', () => {
  // The highest decor surface over a point, from the placed colonies themselves.
  function decorTop(t, x, y0, z) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, y0 + 1.6, z), new THREE.Vector3(0, -1, 0), 0, 1.7), tmp = new THREE.Mesh();
    let best = -Infinity;
    t.scene.traverse((m) => {
      if (!m.isInstancedMesh || !m.userData.decorative || m.userData.lod !== 'near' || !m.userData.items) return;
      const C = m.userData.items.centres, M = m.userData.items.matrices;
      for (let k = 0; k < C.length / 4; k++) {
        if (Math.abs(C[k * 4] - x) > C[k * 4 + 3] || Math.abs(C[k * 4 + 2] - z) > C[k * 4 + 3]) continue;
        tmp.geometry = m.geometry; tmp.material = m.material; tmp.matrixWorld.fromArray(M, k * 16);
        const hits = ray.intersectObject(tmp, false);
        if (hits.length) best = Math.max(best, hits[0].point.y);
      }
    });
    return best;
  }
  it('lands the bites on bare rock, not under a colony planted later (real dive sites, high tier)', () => {
    for (const id of ['healthy', 'restoration']) {
      const t = runtime({ site: siteOf(id), quality: 'high' }), seen = new Map();
      for (let s = 0; s < 120; s++) { t.run(1, 100); puffs(t).forEach((p) => seen.set(p.key, p)); }
      const single = [...seen.values()].filter((p) => p.size < 0.085), group = [...seen.values()].filter((p) => p.size >= 0.085);
      expect(single.length, id + ' single parrotfish bites').toBeGreaterThan(10);
      expect(single.filter((p) => decorTop(t, p.bx, p.by, p.bz) > p.by + 0.06).length, id + ' single bites under a colony').toBe(0);
      expect(group.filter((p) => decorTop(t, p.bx, p.by, p.bz) > p.by + 0.06).length, id + ' group bites under a colony').toBeLessThanOrEqual(Math.ceil(group.length * 0.05));
    }
  });
});

describe('Sea turtles breathe air', () => {
  it('a turtle climbs to the surface, lifts its head to breathe, then glides back down', () => {
    const t = runtime();
    const turtles = census(t).filter((o) => /turtle/.test(o.speciesId)).map((o) => o.object);
    const ys = turtles.map(() => []);
    for (let i = 0; i < 2600; i++) { t.step(100); turtles.forEach((o, k) => ys[k].push({ t: i * 0.1, y: o.position.y, pitch: o.rotation.z })); }
    let breaths = 0;
    ys.forEach((rows) => {
      expect(rows.filter((r) => r.t < 38).every((r) => r.y < -0.4), 'cruising at the start').toBe(true);
      expect(Math.max(...rows.map((r) => r.y)), 'never out of the water').toBeLessThan(-0.1);
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].y < -0.36 || (i && rows[i - 1].y >= -0.36)) continue;
        breaths++;
        const at = rows[i], before = rows.filter((r) => r.t > at.t - 40 && r.t < at.t - 30), after = rows.filter((r) => r.t > at.t + 45 && r.t < at.t + 60);
        expect(Math.min(...before.map((r) => r.y)), 'came up from the reef').toBeLessThan(-2);
        expect(Math.max(...rows.filter((r) => Math.abs(r.t - at.t - 3) < 2).map((r) => r.pitch)), 'head up at the surface').toBeGreaterThan(0.3);
        if (after.length) expect(Math.min(...after.map((r) => r.y)), 'went back down').toBeLessThan(-2);
      }
    });
    expect(breaths, 'both turtles breathe within four minutes').toBeGreaterThanOrEqual(2);
    expect(t.errors).toEqual([]);
  });
});

describe('Crown-of-thorns starfish', () => {
  function scars(t) { const out = []; t.scene.traverse((o) => { if (o.name === 'reef-explore-feeding-scar') out.push(o); }); return out; }
  it('sits on a coral colony beside a fresh white scar, drawn with the decor coral material', () => {
    const t = runtime(), all = census(t), cots = all.filter((o) => o.speciesId === 'crown_of_thorns');
    const list = scars(t);
    expect(cots.length).toBe(2);
    expect(list.length).toBe(2);
    const coralMat = t.scene.getObjectByName('reef-explore-decor-massive').material;
    for (const s of list) {
      const host = all.find((o) => o.uid === s.userData.hostUid);
      expect(host && /table_coral|brain_coral/.test(host.speciesId), 'scar is on a coral colony').toBe(true);
      const star = cots.map((c) => v3(c.pos)).sort((a, b) => a.distanceTo(v3(s.userData.centre)) - b.distanceTo(v3(s.userData.centre)))[0];
      const gap = Math.hypot(star.x - s.userData.centre[0], star.z - s.userData.centre[2]);
      expect(gap, 'beside the starfish').toBeGreaterThan(0.15); expect(gap).toBeLessThan(0.55);
      expect(Math.hypot(star.x - host.pos[0], star.z - host.pos[2]), 'the starfish is on the colony').toBeLessThan(0.8);
      expect(star.y, 'on top of it, not on the floor').toBeGreaterThan(host.pos[1] + 0.05);
      expect(s.isInstancedMesh && s.material === coralMat && !!s.instanceColor, 'no new material or program').toBe(true);
      const c = s.geometry.attributes.color.array, mean = c.reduce((a, b) => a + b, 0) / c.length;
      expect(mean, 'bare white skeleton').toBeGreaterThan(0.85);
    }
  });

  it('lays the scar over the real colony surface (real species models)', () => {
    const site = stubSite({ population: [{ id: 'table_coral', count: 3 }, { id: 'brain_coral', count: 2 }, { id: 'crown_of_thorns', count: 2 }] });
    const t = runtime({ site, quality: 'low' }, { species: 'real' });
    const all = census(t), list = scars(t);
    expect(list.length).toBe(2);
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
    for (const s of list) {
      const host = all.find((o) => o.uid === s.userData.hostUid);
      expect(host.speciesId).toBe('table_coral');
      // Rebuild the host colony in place and check the scar rests on it.
      const meshes = [];
      t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.exploreUids && o.userData.exploreUids.includes(host.uid)) meshes.push(o); });
      const pos = s.geometry.attributes.position, m = new THREE.Matrix4(), tmp = new THREE.Mesh();
      // The patch itself (the last ring of vertices is the short skirt down its edge).
      let on = 0, n = 0;
      const segs = (pos.count - 1) / 6;
      for (let i = 0; i < pos.count - segs; i += 5) {
        const p = new THREE.Vector3().fromBufferAttribute(pos, i); n++;
        ray.set(p.clone().add(new THREE.Vector3(0, 0.3, 0)), down); ray.far = 0.45;
        let hit = Infinity;
        for (const im of meshes) {
          const k = im.userData.exploreUids.indexOf(host.uid);
          m.fromArray(im.userData.exploreMatrices, k * 16); tmp.geometry = im.geometry; tmp.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); tmp.matrixWorld.copy(m);
          const h = ray.intersectObject(tmp, false); if (h.length) hit = Math.min(hit, p.y - h[0].point.y);
        }
        if (hit > -0.02 && hit < 0.12) on++;
      }
      expect(on / n, 'scar vertices lie just on the colony').toBeGreaterThan(0.9);
    }
    expect(t.errors).toEqual([]);
  });

  it('puts more starfish (and scars) on the damaged reef, as the site says', () => {
    const damaged = runtime({ site: siteOf('damaged') }), healthy = runtime({ site: siteOf('healthy') });
    expect(scars(damaged).length).toBeGreaterThan(scars(healthy).length);
  });
});

describe('Anemonefish', () => {
  it('stay over their anemone and drop into the tentacles when the diver comes close', () => {
    const t = runtime({ site: stubSite({ seed: 5104 }) });
    const an = census(t).find((o) => o.speciesId === 'magnificent_anemone'), a = v3(an.pos);
    const clowns = census(t).filter((o) => o.speciesId === 'clownfish').map((o) => o.object);
    const top = new THREE.Box3().setFromObject(an.object).max.y;
    // Mean height over the tentacle tops and distance from the anemone's middle, over a few seconds.
    const sample = () => { const dy = clowns.map(() => 0), r = clowns.map(() => 0); for (let i = 0; i < 40; i++) { t.step(50); clowns.forEach((c, k) => { dy[k] += (c.position.y - top) / 40; r[k] += Math.hypot(c.position.x - a.x, c.position.z - a.z) / 40; }); } return { dy, r }; };
    t.run(2);
    const far = sample();
    far.r.forEach((r) => expect(r, 'over the anemone').toBeLessThan(0.4));
    far.dy.forEach((d) => expect(d, 'just above its tentacles').toBeLessThan(0.3));
    t.controller.swimTo(an.uid); t.run(18);
    // Nose in a little closer than the glide stops.
    const away = () => { const d = t.controller.getState().diver; return Math.hypot(d.x - a.x, d.y - top, d.z - a.z); };
    for (let i = 0; i < 120 && away() > 1.3; i++) { t.controller.setInput({ forward: 0.3 }); t.step(50); }
    t.controller.setInput({ forward: 0 }); t.run(1.5);
    expect(away()).toBeLessThan(1.5);
    const near = sample();
    near.dy.forEach((dy, i) => expect(dy, 'dropped down').toBeLessThan(far.dy[i] - 0.05));
    near.r.forEach((r, i) => expect(r, 'and in close').toBeLessThan(far.r[i] - 0.05));
    expect(t.errors).toEqual([]);
  });
});

describe('Anemonefish over a real anemone', () => {
  it('hover at the real tentacle mat (the model publishes hostSlots), not at its bounding box', () => {
    const site = stubSite({ population: [{ id: 'magnificent_anemone', count: 2 }, { id: 'clownfish', count: 3 }] });
    const t = runtime({ site, quality: 'low' }, { species: 'real' });
    const all = census(t), anem = all.filter((o) => o.speciesId === 'magnificent_anemone'), clowns = all.filter((o) => o.speciesId === 'clownfish').map((o) => o.object);
    t.run(3);
    clowns.forEach((c) => {
      const a = anem.map((o) => o.object.position).sort((p, q) => p.distanceTo(c.position) - q.distanceTo(c.position))[0];
      expect(Math.hypot(c.position.x - a.x, c.position.z - a.z), 'over its anemone').toBeLessThan(0.45);
      // The mat is about 0.2 m up; the box (instances of a 1 m unit tentacle) would put them a metre up.
      expect(c.position.y - a.y, 'just over the tentacles').toBeLessThan(0.5);
      expect(c.position.y - a.y).toBeGreaterThan(0.05);
    });
    expect(t.errors).toEqual([]);
  });
});

describe('Determinism, reduced motion and pause', () => {
  function snap(t) {
    const all = census(t).filter((o) => o.object && (CLIENTS.concat(['cleaner_wrasse', 'reef_manta', 'bumphead_parrotfish', 'crown_of_thorns']).includes(o.speciesId)));
    return { pos: all.map((o) => [o.uid, o.object.position.x, o.object.position.z]), puffs: puffs(t).map((p) => [p.key, p.t, p.x, p.y, p.z, p.alpha]) };
  }
  it('gives the same visits, bites and puffs for the same seed at any frame rate', () => {
    const a = runtime(), b = runtime(), c = runtime();
    // The first frame of a mount has no elapsed time; then 70 s at 20 or 60 frames a second.
    [a, b, c].forEach((t) => t.step(0));
    a.run(70, 50); b.run(70, 50); c.run(70, 1000 / 60);
    expect(snap(a)).toEqual(snap(b));
    const sa = snap(a), sc = snap(c);
    sa.pos.forEach((p, i) => { expect(Math.abs(p[1] - sc.pos[i][1]) + Math.abs(p[2] - sc.pos[i][2]), p[0]).toBeLessThan(0.002); });
    expect(sc.puffs.map((p) => p[0])).toEqual(sa.puffs.map((p) => p[0]));
    sa.puffs.forEach((p, i) => p.slice(1).forEach((v, k) => expect(Math.abs(v - sc.puffs[i][k + 1])).toBeLessThan(1e-6)));
    const d = runtime({ site: stubSite({ seed: 77 }) }); d.step(0); d.run(70, 50);
    expect(snap(d)).not.toEqual(snap(a));
  });

  it('is calmer with reduced motion: slower, fewer puffs, smaller dips', () => {
    const calm = runtime({ reducedMotion: true }), normal = runtime();
    const keys = (t) => { const s = new Set(); for (let i = 0; i < 240; i++) { t.run(0.25); puffs(t).forEach((p) => s.add(p.key)); } return s.size; };
    const kc = keys(calm), kn = keys(normal);
    expect(kn).toBeGreaterThan(10);
    expect(kc, 'fewer puffs').toBeLessThan(kn * 0.45);
    const rise = (t) => Math.max(0, ...puffs(t).map((p) => p.y - p.by - p.r * 0.35));
    let rc = 0, rn = 0; for (let i = 0; i < 200; i++) { calm.run(0.1); normal.run(0.1); rc = Math.max(rc, rise(calm)); rn = Math.max(rn, rise(normal)); }
    expect(rc).toBeLessThan(rn * 0.7);
    expect(calm.controller.getState().reducedMotion).toBe(true);
  });

  it('freezes visits, bites and puffs while paused', () => {
    const t = runtime(); t.run(40);
    t.controller.setPaused(true); t.run(1);
    const before = snap(t); t.run(5);
    expect(snap(t)).toEqual(before);
  });
});

describe('Merging with the other dive lanes', () => {
  it('declares every mount-level function once (a later duplicate silently replaces the earlier one)', () => {
    // mount()'s body is indented four spaces, so it ends at the first two-space closing brace.
    const start = SOURCE.indexOf('  function mount(canvas, options) {'), tail = SOURCE.slice(start), body = tail.slice(0, tail.search(/\n  \}\r?\n/));
    expect(start).toBeGreaterThan(0);
    const names = [...body.matchAll(/^    function ([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1]);
    const twice = names.filter((n, i) => names.indexOf(n) !== i);
    expect(names.length).toBeGreaterThan(100);
    expect(twice, 'declared twice inside mount()').toEqual([]);
  });
});

describe('Shared programs and the species poses', () => {
  it('draws the puffs with the contact shade program (same shader text and cache key)', () => {
    const t = runtime();
    const sed = t.scene.getObjectByName('reef-explore-sediment'), shade = t.scene.getObjectByName('reef-explore-contact-shade');
    expect(sed.material).not.toBe(shade.material);
    expect(sed.material.type).toBe(shade.material.type);
    expect(sed.material.customProgramCacheKey()).toBe(shade.material.customProgramCacheKey());
    const compile = (m) => { const s = { uniforms: {}, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader }; m.onBeforeCompile(s, t.renderer); return s; };
    const a = compile(sed.material), b = compile(shade.material);
    expect(a.vertexShader).toBe(b.vertexShader); expect(a.fragmentShader).toBe(b.fragmentShader);
    expect(Object.keys(a.uniforms).sort()).toEqual(Object.keys(b.uniforms).sort());
    expect(sed.material.side).toBe(shade.material.side); expect(sed.material.vertexColors).toBe(shade.material.vertexColors);
  });

  it('lets a posing client hold its side fins out, and a grazing bumphead group take head-down bites in turn', () => {
    const local = {}; new Function('window', SPECIES_SOURCE)(local); const S = local.Reef3DSpecies;
    const g = S.create(THREE, 'peacock_grouper', { seed: 3, quality: 'low' });
    const fins = []; g.root.traverse((o) => { if (o.name === 'peacock_grouper-pectoral-pivot') fins.push(o); });
    expect(fins.length).toBe(2);
    g.update(0.016, 5, { speed: 0.05, turn: 0 }); const rest = fins.map((f) => Math.abs(f.rotation.y));
    g.update(0.016, 5, { speed: 0.05, turn: 0, spread: 1 }); const spread = fins.map((f) => Math.abs(f.rotation.y));
    spread.forEach((s, i) => expect(s, 'held out').toBeGreaterThan(rest[i] + 0.4));
    g.dispose();
    const n = 12, h = S.createSchool(THREE, 'bumphead_parrotfish', n, { seed: 4, quality: 'low' });
    expect(h.graze.members.length).toBe(n);
    const body = h.root.getObjectByName('bumphead_parrotfish-body'), m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
    const pitches = () => { const out = []; for (let i = 0; i < n; i++) { body.getMatrixAt(i, m); m.decompose(p, q, s); out.push(e.setFromQuaternion(q, 'YZX').z); } return out; };
    h.update(0.016, 10, { speed: 0.3, turn: 0 }); const swim = pitches();
    const t0 = 20; h.update(0.016, t0, { speed: 0.1, turn: 0, graze: 1 }); const graze = pitches();
    graze.forEach((g2, i) => expect(g2, 'head down').toBeLessThan(swim[i] - 0.4));
    // The member at its bite contact dips deepest, as the published schedule says.
    const cyc = (i) => ((t0 / h.graze.period + i * h.graze.stagger) % 1 + 1) % 1;
    const deepest = graze.indexOf(Math.min(...graze));
    expect(Math.abs(cyc(deepest) - h.graze.contact)).toBeLessThan(0.08);
    h.dispose();
  });
});
