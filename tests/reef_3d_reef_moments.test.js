import { describe, expect, it, vi } from 'vitest';
import { runtime, census, stubSite, siteOf, THREE } from './helpers/reef_ecology_harness.js';

// Lane I1: the dive reports which living-reef interactions are happening within
// about 10 m of the diver (snap.moments), read from the behaviour state: a client
// posing at a cleaning station, the manta circling one, grazing, a turtle's breath,
// a crown-of-thorns starfish on its scar, anemonefish taking cover and plankton
// clouds sheltering. Each entry: kind, the main animal first in uids (speciesIds
// alongside), distanceM, and the same bearing/rise cues as the nearby list.
vi.setConfig({ testTimeout: 300000 });
const KINDS = ['cleaning', 'manta_cleaning', 'grazing', 'turtle_breath', 'cots_scar', 'anemonefish_hide', 'cloud_shelter'];
const v3 = (a) => new THREE.Vector3(...a);
const state = (t) => t.controller.getState();
const of = (t, kind) => state(t).moments.filter((m) => m.kind === kind);
const diver = (t) => { const d = state(t).diver; return v3([d.x, d.y, d.z]); };
const stations = (t) => t.scene.getObjectByName('reef-explore-organisms').userData.cleaningStations;
const spread = (o) => (o.userData.motion && o.userData.motion.spread) || 0;

function checkShape(t, m, all) {
  expect(KINDS).toContain(m.kind);
  expect(Array.isArray(m.uids) && Array.isArray(m.speciesIds)).toBe(true);
  expect(m.speciesIds).toHaveLength(m.uids.length);
  m.uids.forEach((uid, i) => expect(all.get(uid).speciesId, m.kind + ' ' + uid).toBe(m.speciesIds[i]));
  if (m.uids.length && !m.scenery) expect(m.speciesId).toBe(m.speciesIds[0]);
  expect(m.distanceM).toBeGreaterThanOrEqual(0);
  expect(m.distanceM, 'within about 10 m').toBeLessThanOrEqual(10);
  expect(Math.abs(m.bearingDeg)).toBeLessThanOrEqual(180);
  expect(Number.isFinite(m.riseM)).toBe(true);
  expect(typeof m.inView).toBe('boolean');
}

describe('cleaning stations and the manta', () => {
  it('reports a client posing at the station with its cleaners while it poses, and only then', () => {
    const t = runtime(), all = new Map(census(t).map((o) => [o.uid, o]));
    const st = stations(t), spot = v3(st[0].spot);
    const cleaner = census(t).filter((o) => o.speciesId === 'cleaner_wrasse').sort((a, b) => v3(a.pos).distanceTo(spot) - v3(b.pos).distanceTo(spot))[0];
    const clients = census(t).filter((o) => o.speciesId === 'peacock_grouper' || o.speciesId === 'parrotfish').map((o) => o.object);
    t.controller.swimTo(cleaner.uid);
    let on = 0, posingSeen = 0, missed = 0, manta = 0;
    for (let i = 0; i < 640; i++) {
      t.run(0.25);
      const list = of(t, 'cleaning'), d = diver(t);
      for (const m of list) {
        checkShape(t, m, all);
        on++;
        const c = all.get(m.uids[0]).object;
        expect(['peacock_grouper', 'parrotfish']).toContain(m.speciesIds[0]);
        expect(spread(c), 'the client named is the one posing').toBeGreaterThan(0.3);
        expect(Math.min(...st.map((s) => c.position.distanceTo(v3(s.spot)))), 'at a station').toBeLessThan(2);
        expect(m.speciesIds.slice(1).every((id) => id === 'cleaner_wrasse') && m.uids.length >= 2, 'with its cleaners').toBe(true);
      }
      // A client fully posing within reach is always reported.
      const posing = clients.filter((c) => spread(c) > 0.8 && c.position.distanceTo(d) < 8);
      if (posing.length) { posingSeen++; if (!list.length) missed++; }
      for (const m of of(t, 'manta_cleaning')) {
        checkShape(t, m, all);
        manta++;
        const o = all.get(m.uids[0]).object;
        expect(m.speciesIds[0]).toBe('reef_manta');
        expect(Math.min(...st.map((s) => Math.hypot(o.position.x - s.top[0], o.position.z - s.top[2]))), 'circling close over a station').toBeLessThan(3.8);
        expect(m.speciesIds.slice(1).every((id) => id === 'cleaner_wrasse')).toBe(true);
      }
    }
    expect(posingSeen, 'clients posed while the diver watched').toBeGreaterThan(30);
    expect(on).toBeGreaterThan(30);
    expect(missed, 'missed while a client posed').toBeLessThanOrEqual(2);
    expect(manta, 'the manta visit is reported too').toBeGreaterThan(10);
    expect(t.errors).toEqual([]);
  });

  it('a manta far from its station is not a moment, and the station moments vanish when the diver swims away', () => {
    const t = runtime(), all = census(t), st = stations(t);
    const manta = all.find((o) => o.speciesId === 'reef_manta').object;
    // Somewhere more than 20 m from every station.
    const far = all.filter((o) => st.every((s) => v3(o.pos).distanceTo(v3(s.spot)) > 20)).sort((a, b) => a.uid.localeCompare(b.uid))[0];
    expect(far).toBeTruthy();
    let wide = 0;
    t.controller.swimTo(all.find((o) => o.speciesId === 'cleaner_wrasse').uid);
    for (let i = 0; i < 400; i++) {
      t.run(0.5);
      const r = Math.min(...st.map((s) => Math.hypot(manta.position.x - s.top[0], manta.position.z - s.top[2])));
      if (r > 6) { wide++; expect(of(t, 'manta_cleaning'), 'cruising wide is not a visit').toEqual([]); }
      if (i === 200) t.controller.swimTo(far.uid);
      if (i > 240) {
        const d = diver(t);
        if (st.every((s) => d.distanceTo(v3(s.spot)) > 12)) expect(of(t, 'cleaning'), 'no cleaning moment from far away').toEqual([]);
        state(t).moments.forEach((m) => expect(m.distanceM).toBeLessThanOrEqual(10));
      }
    }
    expect(wide).toBeGreaterThan(20);
    expect(diver(t).distanceTo(v3(st[0].spot))).toBeGreaterThan(12);
  });
});

describe('grazing', () => {
  it('reports a parrotfish while it feeds head down, not while it swims between patches', () => {
    const t = runtime(), all = new Map(census(t).map((o) => [o.uid, o]));
    const fish = census(t).filter((o) => o.speciesId === 'parrotfish');
    const target = fish[0];
    t.controller.swimTo(target.uid);
    const rows = [];
    for (let i = 0; i < 480; i++) {
      t.run(0.25);
      if (i % 40 === 0) t.controller.swimTo(target.uid);
      const m = of(t, 'grazing').find((x) => x.uids[0] === target.uid), o = target.object;
      rows.push({ on: !!m, pitch: o.rotation.z, near: o.position.distanceTo(diver(t)) < 9 });
      if (m) { checkShape(t, m, all); expect(m.group).toBeUndefined(); }
    }
    const on = rows.filter((r) => r.on), off = rows.filter((r) => !r.on && r.near);
    expect(on.length, 'grazing seen').toBeGreaterThan(20);
    expect(off.length, 'and swimming between patches').toBeGreaterThan(20);
    // Head down while it bites (the grazer's own lean), level while it travels.
    const mean = (l) => l.reduce((s, r) => s + r.pitch, 0) / l.length;
    expect(mean(on)).toBeLessThan(-0.25);
    expect(mean(on)).toBeLessThan(mean(off) - 0.15);
    // On and off: separate feeding bouts.
    let bouts = 0; rows.forEach((r, i) => { if (r.on && !(rows[i - 1] || {}).on) bouts++; });
    expect(bouts).toBeGreaterThanOrEqual(2);
  });

  it('marks a bumphead school feeding together as a group', () => {
    const t = runtime(), all = new Map(census(t).map((o) => [o.uid, o]));
    const school = census(t).find((o) => o.speciesId === 'bumphead_parrotfish');
    let group = 0;
    for (let i = 0; i < 360; i++) {
      t.run(0.25);
      if (i % 20 === 0) t.controller.swimTo(school.uid);
      const m = of(t, 'grazing').find((x) => x.uids[0] === school.uid);
      if (m) { checkShape(t, m, all); expect(m.group).toBe(true); group++; }
    }
    expect(group).toBeGreaterThan(10);
  });
});

describe('turtles, the crown-of-thorns scar and anemonefish', () => {
  it('reports a turtle on its way up, breathing at the surface, then gliding down', () => {
    const t = runtime(), all = new Map(census(t).map((o) => [o.uid, o]));
    const turtle = census(t).find((o) => o.speciesId === 'green_turtle');
    const rows = [];
    for (let i = 0; i < 1100; i++) {
      t.run(0.25);
      if (i % 20 === 0) t.controller.swimTo(turtle.uid);
      const m = of(t, 'turtle_breath').find((x) => x.uids[0] === turtle.uid);
      if (m) checkShape(t, m, all);
      rows.push({ phase: m ? m.phase : null, y: turtle.object.position.y, near: turtle.object.position.distanceTo(diver(t)) < 8 });
    }
    const phases = new Set(rows.map((r) => r.phase).filter(Boolean));
    expect([...phases].sort()).toEqual(['breathing', 'down', 'up']);
    const ys = (p) => rows.filter((r) => r.phase === p).map((r) => r.y);
    const top = Math.max(...rows.map((r) => r.y));
    expect(Math.min(...ys('breathing')), 'breathing at the top of its climb').toBeGreaterThan(top - 0.6);
    // Climbing while 'up', sinking while 'down'.
    const steps = (p) => rows.map((r, i) => i && r.phase === p && rows[i - 1].phase === p ? r.y - rows[i - 1].y : null).filter((v) => v !== null);
    expect(steps('up').filter((d) => d > 0).length).toBeGreaterThan(steps('up').length * 0.8);
    expect(steps('down').filter((d) => d < 0).length).toBeGreaterThan(steps('down').length * 0.8);
    // Cruising low near the diver is not a moment (low down, only the start of a climb or the end of a glide is).
    const low = rows.filter((r) => r.near && r.y < top - 4);
    expect(low.filter((r) => r.phase === null).length).toBeGreaterThan(20);
    expect(low.filter((r) => r.phase === null).length).toBeGreaterThan(low.length * 0.6);
    expect(low.every((r) => r.phase !== 'breathing')).toBe(true);
  });

  it('reports the crown-of-thorns starfish with the colony it is eating, within 10 m only', () => {
    const t = runtime(), all = new Map(census(t).map((o) => [o.uid, o]));
    const cots = census(t).filter((o) => o.speciesId === 'crown_of_thorns');
    const scars = []; t.scene.traverse((o) => { if (o.name === 'reef-explore-feeding-scar') scars.push(o.userData); });
    expect(scars.length).toBeGreaterThan(0);
    t.controller.swimTo(cots[0].uid);
    let near = 0, far = 0;
    for (let i = 0; i < 160; i++) {
      t.run(0.5);
      if (i === 80) t.controller.setInput({ forward: -1, turn: 0.3 });
      const d = diver(t), m = of(t, 'cots_scar')[0];
      const dist = Math.min(...cots.map((c) => c.object.position.distanceTo(d)));
      if (m) {
        near++;
        checkShape(t, m, all);
        expect(m.speciesIds[0]).toBe('crown_of_thorns');
        expect(scars.find((s) => s.hostUid === m.uids[1]), 'the second uid is the scarred colony').toBeTruthy();
        expect(['table_coral', 'foliose_coral', 'boulder_coral', 'brain_coral']).toContain(m.speciesIds[1]);
      } else if (dist > 11) far++;
      if (dist > 11.5) expect(m, 'gone when far').toBeUndefined();
    }
    expect(near).toBeGreaterThan(20);
    expect(far).toBeGreaterThan(5);
  });

  it('reports anemonefish down in their anemone when the diver is close, and not once the diver backs off', () => {
    const t = runtime({ site: stubSite({ seed: 5104 }) }), all = new Map(census(t).map((o) => [o.uid, o]));
    const an = census(t).find((o) => o.speciesId === 'magnificent_anemone'), a = v3(an.pos);
    const top = new THREE.Box3().setFromObject(an.object).max.y;
    t.run(2);
    expect(of(t, 'anemonefish_hide'), 'not before the diver comes').toEqual([]);
    t.controller.swimTo(an.uid); t.run(18);
    const away = () => { const d = state(t).diver; return Math.hypot(d.x - a.x, d.y - top, d.z - a.z); };
    for (let i = 0; i < 120 && away() > 1.3; i++) { t.controller.setInput({ forward: 0.3 }); t.step(50); }
    t.controller.setInput({ forward: 0 }); t.run(1.5);
    const m = of(t, 'anemonefish_hide')[0];
    expect(m, 'the fish have dropped in').toBeTruthy();
    checkShape(t, m, all);
    expect(m.speciesIds[0]).toBe('clownfish');
    expect(m.uids, 'with the anemone they hide in').toContain(an.uid);
    expect(m.distanceM).toBeLessThan(2.5);
    t.controller.setInput({ forward: -1 }); t.run(3); t.controller.setInput(null); t.run(6);
    expect(away()).toBeGreaterThan(3);
    expect(of(t, 'anemonefish_hide')).toEqual([]);
  });

  it('reports a plankton school sinking into its coral as the diver comes close', () => {
    const t = runtime(), all = new Map(census(t).map((o) => [o.uid, o]));
    const school = census(t).find((o) => o.speciesId === 'anthias');
    t.controller.swimTo(school.uid); t.run(15);
    t.controller.clearFocus();
    let seen = null;
    for (let i = 0; i < 200 && !seen; i++) {
      const d = diver(t), p = school.object.position;
      t.controller.setInput({ forward: d.distanceTo(p) > 0.6 ? 0.25 : 0 });
      t.step(50);
      seen = of(t, 'cloud_shelter').find((m) => m.uids[0] === school.uid) || null;
    }
    t.controller.setInput(null);
    expect(seen, 'sheltering').toBeTruthy();
    checkShape(t, seen, all);
    expect(seen.scenery).toBeUndefined();
    t.controller.setInput({ forward: -1 }); t.run(4); t.controller.setInput(null); t.run(8);
    expect(of(t, 'cloud_shelter').find((m) => m.uids[0] === school.uid), 'risen again once the diver has gone').toBeUndefined();
  });
});

describe('direction cues and change reports', () => {
  it('uses the nearby list\'s bearing and rise, and turning moves the bearing the right way', () => {
    const t = runtime();
    const cots = census(t).find((o) => o.speciesId === 'crown_of_thorns');
    t.controller.swimTo(cots.uid); t.run(20);
    let same = 0;
    for (let i = 0; i < 40; i++) {
      t.run(0.25);
      const s = state(t);
      for (const m of s.moments) {
        const n = s.nearby.find((x) => x.uid === m.uids[0]);
        if (n && !m.scenery) { same++; expect([m.bearingDeg, m.riseM, m.inView], m.kind).toEqual([n.bearingDeg, n.riseM, n.inView]); }
      }
    }
    expect(same).toBeGreaterThan(10);
    t.controller.clearFocus();
    const b0 = of(t, 'cots_scar')[0].bearingDeg;
    t.controller.setInput({ turn: 1 }); t.run(0.6); t.controller.setInput(null); t.run(0.3);
    const b1 = of(t, 'cots_scar')[0].bearingDeg;
    expect(b1, 'turning right swings it to the left').toBeLessThan(b0 - 10);
  });

  it('reports a new moment to onState promptly, and keeps the scan to a few times a second', () => {
    const states = [];
    const t = runtime({ onState: (s) => states.push({ at: t ? t.local.performance.now() : 0, key: s.moments.map((m) => m.kind + m.uids[0]).join(',') }) });
    const st = stations(t), spot = v3(st[0].spot);
    const cleaner = census(t).filter((o) => o.speciesId === 'cleaner_wrasse').sort((a, b) => v3(a.pos).distanceTo(spot) - v3(b.pos).distanceTo(spot))[0];
    t.controller.swimTo(cleaner.uid); t.run(12); t.controller.clearFocus();
    // Hover still, so nothing else about the diver changes.
    let changes = 0, late = 0, last = null;
    for (let i = 0; i < 1600; i++) {
      t.step(50);
      const now = t.local.performance.now(), key = state(t).moments.map((m) => m.kind + m.uids[0]).join(',');
      if (last !== null && key !== last) {
        changes++;
        t.run(0.6);
        const got = states.filter((s) => s.at > now - 300);
        if (!got.some((s) => s.key === key || s.key === state(t).moments.map((m) => m.kind + m.uids[0]).join(','))) late++;
      }
      last = state(t).moments.map((m) => m.kind + m.uids[0]).join(',');
    }
    expect(changes).toBeGreaterThan(4);
    expect(late, 'every change reached onState').toBe(0);
    // Between scans (250 ms) the list is the same objects' data.
    const a = state(t).moments, b = state(t).moments;
    expect(b).toEqual(a);
  });

  it('is empty before the dive is ready and stays the same while paused', () => {
    const t = runtime();
    t.run(1);
    t.controller.setPaused(true);
    const a = JSON.stringify(state(t).moments);
    t.run(3);
    expect(JSON.stringify(state(t).moments)).toBe(a);
    const staged = runtime({ staged: true });
    expect(staged.controller.getState().moments).toEqual([]);
  });
});

describe('the crowd clouds on the real reef', () => {
  it('reports a sheltering crowd cloud as scenery, looked at through the nearest school of its species', () => {
    const t = runtime({ site: siteOf('healthy'), quality: 'low' }, { species: 'real' }), all = new Map(census(t).map((o) => [o.uid, o]));
    let found = null;
    for (let i = 0; i < 60 && !found; i++) {
      t.run(0.5);
      found = of(t, 'cloud_shelter').find((m) => m.scenery) || null;
      if (!found && i % 10 === 9) t.controller.setInput({ forward: 0.4, turn: 0.2 });
    }
    expect(found, 'a cloud near the start drops into its coral').toBeTruthy();
    expect(['anthias', 'blue_green_chromis']).toContain(found.speciesId);
    expect(found.uids.length).toBeLessThanOrEqual(1);
    found.uids.forEach((uid) => expect(all.get(uid).speciesId).toBe(found.speciesId));
    // A nearby predator can shelter a cloud before the diver reaches it. Moments
    // retain their established 10 m observation radius for either disturbance.
    expect(found.distanceM).toBeLessThanOrEqual(10);
    expect(t.errors).toEqual([]);
  });
});
