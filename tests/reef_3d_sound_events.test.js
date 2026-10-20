import { describe, expect, it } from 'vitest';
import { runtime, puffs, siteOf } from './helpers/reef_sound_harness.js';

// Lane I3: the dive's optional onEvent hook for the lab's reef soundscape. Breaths come
// from the bubble clock (the exhale with its first bubbles), bites from the same
// closed-form grazing schedule as the sediment puffs. The hook only reads the dive.
const bubbleSizes = (t) => Array.from(t.scene.getObjectByName('reef-explore-bubbles').geometry.attributes.reefBubbleSize.array);
// A bubble is born in a slot that was empty last frame (a net count would miss a birth
// on a frame where an older bubble reaches the surface).
const anyBorn = (prev, now) => now.some((v, i) => v > 0 && !(prev[i] > 0));

describe('Reef3DExplore onEvent (sound events)', () => {
  it('reports each breath in step with the bubbles: an inhale, then an exhale as the first bubbles leave the regulator', () => {
    const events = [];
    const t = runtime({ onEvent: (e) => events.push({ ...e, frame: frame }) });
    let frame = 0, born = [];
    let before = bubbleSizes(t);
    for (frame = 1; frame <= 1200; frame++) {
      t.step(50);
      const now = bubbleSizes(t);
      if (anyBorn(before, now)) born.push(frame);
      before = now;
    }
    const breaths = events.filter((e) => e.type === 'inhale' || e.type === 'exhale');
    const exhales = breaths.filter((e) => e.type === 'exhale'), inhales = breaths.filter((e) => e.type === 'inhale');
    // 60 s at a 4.2 s breathing cycle.
    expect(exhales.length).toBeGreaterThanOrEqual(14);
    expect(exhales.length).toBeLessThanOrEqual(15);
    expect(Math.abs(inhales.length - exhales.length)).toBeLessThanOrEqual(1);
    // They alternate, and every exhale is the frame where new bubbles appear.
    for (let i = 1; i < breaths.length; i++) expect(breaths[i].type).not.toBe(breaths[i - 1].type);
    for (const e of exhales) {
      expect(born, 'bubbles appear on the exhale frame').toContain(e.frame);
      expect(e.lag).toBeGreaterThanOrEqual(0); expect(e.lag).toBeLessThan(0.051);
      expect(e.clumps[0]).toBe(0);
      expect(e.clumps.length).toBe(12);
      expect(e.duration).toBeGreaterThan(0.9);
    }
    // No bubbles start between an inhale and the following exhale.
    for (const e of inhales) {
      const next = exhales.find((x) => x.frame > e.frame);
      if (next) expect(born.filter((f) => f > e.frame && f < next.frame)).toEqual([]);
      expect(e.duration).toBeGreaterThan(1);
    }
    expect(t.errors).toEqual([]);
  });

  it('reports every parrotfish bite the puffs show, at the same moment, with distance and side for the listener', () => {
    const bites = new Map();
    const id = (k, time) => k + '@' + Math.round(time * 1000);
    // (The dive swallows a listener's errors, so duplicates are counted, not asserted in here.)
    let twice = 0;
    const t = runtime({ onEvent: (e) => { if (e.type === 'bite') { if (bites.has(id(e.key, e.t))) twice++; bites.set(id(e.key, e.t), e); } } });
    const puffSeen = new Map();
    for (let i = 0; i < 1200; i++) {
      t.step(50);
      for (const p of puffs(t)) if (!puffSeen.has(id(p.key, p.t))) puffSeen.set(id(p.key, p.t), { ...p, diver: t.controller.getState().diver });
    }
    expect(puffSeen.size, 'the dive shows puffs').toBeGreaterThan(8);
    let near = 0;
    for (const p of puffSeen.values()) {
      const d = Math.hypot(p.bx - p.diver.x, p.by - p.diver.y, p.bz - p.diver.z);
      if (d > 24) continue;
      near++;
      const b = bites.get(id(p.key, p.t));
      expect(b, 'a bite event for puff ' + p.key).toBeTruthy();
      expect(b.t).toBeCloseTo(p.t, 6);
      expect(Math.abs(b.distanceM - d)).toBeLessThan(1);
    }
    expect(near).toBeGreaterThan(8);
    const list = [...bites.values()];
    expect(list.every((b) => b.speciesId === 'parrotfish' || b.speciesId === 'bumphead_parrotfish')).toBe(true);
    expect(list.some((b) => b.school), 'the bumphead group bites too').toBe(true);
    expect(list.some((b) => !b.school)).toBe(true);
    expect(twice, 'each bite once').toBe(0);
    expect(list.every((b) => b.pan >= -1 && b.pan <= 1 && b.distanceM <= 25 && b.lag >= 0 && b.lag < 0.06)).toBe(true);
    expect(t.errors).toEqual([]);
  });

  it('is silent while the reef is paused, and a listener that throws never stops the dive', () => {
    let count = 0;
    const t = runtime({ onEvent: () => { count++; throw new Error('listener bug'); } });
    t.run(10);
    expect(count).toBeGreaterThan(3);
    t.controller.setPaused(true);
    const at = count;
    t.run(10);
    expect(count, 'no events while paused').toBe(at);
    t.controller.setPaused(false);
    t.run(10);
    expect(count).toBeGreaterThan(at);
    expect(t.errors).toEqual([]);
    expect(t.controller.getState().paused).toBe(false);
  });

  it('changes nothing in the dive: the same swim with and without a listener gives the same reef', () => {
    function swim(withHook) {
      const t = runtime({ site: siteOf('healthy'), ...(withHook ? { onEvent: () => {} } : {}) });
      const out = [];
      t.controller.setInput({ forward: 1, turn: 0.3 });
      for (let i = 0; i < 300; i++) { t.step(50); if (i % 30 === 0) { const s = t.controller.getState(), bub = [...t.scene.getObjectByName('reef-explore-bubbles').geometry.attributes.position.array]; out.push(JSON.stringify([s.diver, s.nearby, puffs(t).map((p) => [p.key, p.x, p.y, p.z]), bub])); } }
      return out;
    }
    expect(swim(true)).toEqual(swim(false));
  });
});
