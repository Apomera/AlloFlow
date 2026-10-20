import { afterEach, describe, expect, it, vi } from 'vitest';
import { THREE, runtime, census, cleanup } from './helpers/reef_dive_harness.js';

// Lane H3: the dive notices how gently the student dives. Points on the diver
// (hands, chest, face, hips, knees, fin tips) are checked against the reef each
// unpaused frame; a brush of living coral or attached life counts once, then
// rests for 2 s of dive time from the last contact; Swim to never counts; the
// bare bottom counts apart; a sediment puff reuses the marine snow's program.
vi.setConfig({ testTimeout: 120000 });
afterEach(cleanup);

const BUOY_KEYS = ['calmS', 'diveS', 'lastReef', 'maxDepthM', 'reefContacts', 'sandContacts', 'state', 'touching'];
const SESSILE = /coral|sea_fan|sponge|clam|anemone/;

// Swim to each attached organism in turn, settle low beside it, then turn in
// place: the fins sweep round behind the diver. Returns the first organism whose
// sweep brushes it, with the step-by-step record of that sweep.
function bumpSubject(t, sweepSteps = 80) {
  for (const o of census(t).filter((c) => SESSILE.test(c.speciesId))) {
    t.controller.swimTo(o.uid); t.run(20);
    t.controller.setInput({ rise: -1 }); t.run(3); t.controller.setInput(null); t.run(0.5);
    const before = t.b().reefContacts, record = [];
    t.controller.setInput({ turn: 1 });
    for (let i = 0; i < sweepSteps; i++) {
      t.step(50); record.push(t.b());
      if (record.at(-1).reefContacts > before) return { o, before, record };
    }
    t.controller.setInput(null); t.run(3);
  }
  return null;
}
// Rising edges of contact, and which of them counted.
function edges(record) {
  const out = [];
  let lastTouch = -Infinity;
  for (let i = 1; i < record.length; i++) {
    const a = record[i - 1], b = record[i];
    if (b.touching && !a.touching) out.push({ at: b.diveS, sinceTouch: b.diveS - lastTouch, counted: b.reefContacts > a.reefContacts });
    else expect(b.reefContacts, 'a count only ever starts a contact').toBe(a.reefContacts);
    if (b.touching) lastTouch = b.diveS;
  }
  return out;
}

describe('reef contact sensing', () => {
  it('reports a buoyancy reading in the snapshot, starting from zero at the spawn depth', () => {
    const t = runtime();
    const s = t.state();
    expect(Object.keys(s.buoyancy).sort()).toEqual(BUOY_KEYS);
    expect(s.buoyancy).toMatchObject({ reefContacts: 0, sandContacts: 0, calmS: 0, diveS: 0, state: 'swim', lastReef: null, touching: false });
    expect(s.buoyancy.maxDepthM).toBeCloseTo(s.diver.depthM, 1);
    t.controller.setInput({ rise: -1 }); t.run(3);
    const b = t.b();
    expect(b.diveS).toBeCloseTo(3, 0);
    expect(b.maxDepthM).toBeCloseTo(Math.max(s.diver.depthM, t.state().diver.depthM), 1);
    // A staged mount reports zeros before its build has run.
    const staged = runtime({ staged: true });
    expect(staged.state().ready).toBe(false);
    expect(staged.state().buoyancy).toMatchObject({ reefContacts: 0, sandContacts: 0, diveS: 0, state: 'swim' });
  });

  it('open-water swimming counts nothing and adds no calm time', () => {
    const t = runtime();
    t.controller.setInput({ rise: 1 }); t.run(2);
    t.controller.setInput({ forward: 1, turn: 0.2 }); t.run(40);
    const b = t.b();
    expect(b.diveS).toBeGreaterThan(41);
    expect(b.reefContacts).toBe(0);
    expect(b.sandContacts).toBe(0);
    expect(b.calmS, 'swimming fast high above the reef is not hovering').toBeLessThan(1);
    expect(t.scene.getObjectByName('reef-explore-touch-puff'), 'no puff was ever needed').toBeUndefined();
  });

  it('a deliberate coral bump counts once, and a brush that comes back within the rest is the same contact', () => {
    const t = runtime();
    const hit = bumpSubject(t);
    expect(hit, 'turning low beside an attached organism sweeps the fins into it').toBeTruthy();
    const first = hit.record.at(-1);
    expect(first.reefContacts).toBe(hit.before + 1);
    expect(first.touching).toBe(true);
    expect(first.state).toBe('touch');
    expect(['coral', 'life']).toContain(first.lastReef);
    // Keep sweeping, then rock back and forth through it: in, out, in again.
    const record = [first];
    for (let i = 0; i < 60; i++) { t.step(50); record.push(t.b()); }
    for (let k = 0; k < 16; k++) { t.controller.setInput({ turn: k % 2 ? 1 : -1 }); for (let i = 0; i < 8; i++) { t.step(50); record.push(t.b()); } }
    t.controller.setInput(null);
    for (let i = 0; i < 60; i++) { t.step(50); record.push(t.b()); }
    const list = edges(record);
    expect(list.some((e) => !e.counted), 'some brush came back within the rest').toBe(true);
    for (const e of list) expect(e.counted, 'at ' + e.at + ' s, ' + e.sinceTouch.toFixed(2) + ' s after the last contact').toBe(e.sinceTouch > 2);
    // The cue state settles once the diver is clear.
    t.run(4);
    if (!t.b().touching) expect(t.b().state).not.toBe('touch');
  });

  it('never counts a contact made while Swim to is steering the diver', () => {
    const t = runtime();
    let touchedOnTheWay = 0;
    for (const o of census(t).filter((c) => SESSILE.test(c.speciesId)).slice(0, 8)) {
      const before = t.b().reefContacts;
      t.controller.swimTo(o.uid);
      for (let i = 0; i < 400; i++) { t.step(50); if (t.b().touching) touchedOnTheWay++; }
      expect(t.b().reefContacts, o.uid).toBe(before);
    }
    expect(touchedOnTheWay, 'some swims brushed the reef on the way').toBeGreaterThan(0);
  });

  it('counts the bare bottom apart from the living reef', () => {
    const t = runtime();
    t.controller.setInput({ rise: -1 }); t.run(4);
    t.controller.setInput({ forward: -1, rise: -1, turn: 0.1 });
    let sandSteps = 0, prev = t.b();
    for (let i = 0; i < 1200; i++) {
      t.step(50); const b = t.b();
      if (b.sandContacts > prev.sandContacts) { sandSteps++; expect(b.reefContacts, 'a sand touch is not a reef touch').toBe(prev.reefContacts); }
      prev = b;
    }
    expect(sandSteps, 'backing up low brushes the bottom').toBeGreaterThan(0);
    expect(prev.sandContacts).toBe(sandSteps);
  });

  it('adds up calm time while hovering steadily near the reef', () => {
    const t = runtime();
    t.controller.setInput({ rise: -1 }); t.run(4); t.controller.setInput(null); t.run(3);
    const a = t.b(); t.run(10); const b = t.b();
    expect(b.calmS - a.calmS).toBeGreaterThan(9.5);
    expect(['calm', 'close']).toContain(b.state);
    t.controller.setInput({ forward: 1 }); t.run(3);
    const c = t.b(); t.run(5);
    expect(t.b().calmS - c.calmS, 'swimming is not hovering').toBeLessThan(0.5);
  });

  it('the counters start again with a new dive', () => {
    const t = runtime();
    expect(bumpSubject(t)).toBeTruthy();
    expect(t.b().reefContacts).toBeGreaterThan(0);
    expect(t.b().diveS).toBeGreaterThan(20);
    const next = runtime();
    expect(next.b()).toMatchObject({ reefContacts: 0, sandContacts: 0, calmS: 0, diveS: 0, touching: false, lastReef: null });
    expect(t.b().reefContacts, 'the first dive keeps its own count').toBeGreaterThan(0);
  });

  it('is deterministic for the same inputs and frame times', () => {
    const run = () => { const t = runtime(); const hit = bumpSubject(t); for (let i = 0; i < 20; i++) t.step(50); return { hit, b: t.b(), puff: Array.from(t.scene.getObjectByName('reef-explore-touch-puff').geometry.attributes.position.array) }; };
    const a = run(), b = run();
    expect(b.hit.o.uid).toBe(a.hit.o.uid);
    expect(b.hit.record).toEqual(a.hit.record);
    expect(b.b).toEqual(a.b);
    expect(b.puff).toEqual(a.puff);
  });
});

describe('the sediment puff', () => {
  const spread = (puff) => {
    const p = puff.geometry.attributes.position, n = p.count;
    let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += p.getX(i); cz += p.getZ(i); } cx /= n; cz /= n;
    let max = 0; for (let i = 0; i < n; i++) max = Math.max(max, Math.hypot(p.getX(i) - cx, p.getZ(i) - cz));
    return max;
  };
  it('rises softly at the contact, fades away, and shares the marine snow program', () => {
    const t = runtime();
    expect(bumpSubject(t)).toBeTruthy();
    const puff = t.scene.getObjectByName('reef-explore-touch-puff'), motes = t.scene.getObjectByName('reef-explore-motes');
    expect(puff.isPoints).toBe(true);
    expect(puff.visible).toBe(true);
    expect(puff.geometry.attributes.position.count).toBe(18);
    // Same material type, settings and cache key as the snow: three reuses its program.
    expect(puff.material.type).toBe(motes.material.type);
    expect(puff.material.customProgramCacheKey()).toBe(motes.material.customProgramCacheKey());
    for (const k of ['sizeAttenuation', 'vertexColors', 'fog', 'transparent', 'depthWrite', 'alphaTest', 'blending', 'premultipliedAlpha', 'toneMapped'])
      expect(puff.material[k], k).toEqual(motes.material[k]);
    const compile = (m) => { const shader = { uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.points.uniforms), vertexShader: THREE.ShaderLib.points.vertexShader, fragmentShader: THREE.ShaderLib.points.fragmentShader }; m.onBeforeCompile(shader, t.renderer); return shader; };
    const a = compile(puff.material), b = compile(motes.material);
    expect(a.vertexShader).toBe(b.vertexShader);
    expect(a.fragmentShader).toBe(b.fragmentShader);
    // Its own parcel: it never wraps round the camera like the snow.
    expect(a.uniforms.reefSnowCenter).not.toBe(b.uniforms.reefSnowCenter);
    expect(a.uniforms.reefSnowTime.value).toBe(0);
    expect(a.uniforms.reefTorch).toBe(b.uniforms.reefTorch);
    const s0 = spread(puff);
    for (let i = 0; i < 6; i++) t.step(50);
    const o1 = puff.material.opacity, s1 = spread(puff);
    expect(o1).toBeGreaterThan(0.3);
    expect(s1).toBeGreaterThan(s0);
    t.run(4);
    expect(puff.visible, 'gone after its life').toBe(false);
    expect(puff.material.opacity).toBe(0);
  });

  it('respects reduced motion: fewer specks that barely drift', () => {
    const calm = runtime({ reducedMotion: true }), lively = runtime();
    expect(bumpSubject(calm)).toBeTruthy(); expect(bumpSubject(lively)).toBeTruthy();
    const a = calm.scene.getObjectByName('reef-explore-touch-puff'), b = lively.scene.getObjectByName('reef-explore-touch-puff');
    expect(a.geometry.attributes.position.count).toBe(8);
    for (let i = 0; i < 16; i++) { calm.step(50); lively.step(50); }
    expect(spread(a)).toBeLessThan(spread(b) * 0.5);
    calm.run(2);
    expect(a.visible, 'and it is over sooner').toBe(false);
  });

  it('freezes with a paused reef, and so do the counters', () => {
    const t = runtime();
    expect(bumpSubject(t)).toBeTruthy();
    const puff = t.scene.getObjectByName('reef-explore-touch-puff');
    t.step(50); t.step(50);
    t.controller.setPaused(true);
    const b = t.b(), pos = Array.from(puff.geometry.attributes.position.array), op = puff.material.opacity;
    t.controller.setInput({ turn: -1 }); t.run(3);
    expect(t.b()).toEqual({ ...b, state: b.state });
    expect(Array.from(puff.geometry.attributes.position.array)).toEqual(pos);
    expect(puff.material.opacity).toBe(op);
    t.controller.setPaused(false); t.run(1);
    expect(t.b().diveS).toBeGreaterThan(b.diveS + 0.5);
  });
});
