import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// Round 34, zone lane (zn34): self-test of the TEST HELPER roadready_zn34_invariants.cjs, the checker the
// real-app sweep (lane_zone\harness\sweep3.cjs) runs over every recorded step and the other zn34 tests use.
// It does not load the tool, so it passes on base and lane alike by design: it proves the checker can fail.

const require = createRequire(import.meta.url);
const INV = require('./roadready_zn34_invariants.cjs');
const meta = { weather: 'clear', hardBrakeLine: Math.max(0.5, 0.72 * 0.92 * 9.81) * 0.8, reactionSec: 1.5 };

describe('Road Ready zn34: the invariant checker', () => {
  const frame = (t, carSt, actors, zones) => ({ t, oneWay: false, car: { st: carSt, lat: 1.6, dir: -1, v: 10, len: 4.5, wid: 1.8, box: [carSt - 2.25, carSt + 2.25, 0.7, 2.5] }, actors, zones: zones || [], controls: [] });
  const ai = (id, st, lat, dir, v, extra) => Object.assign({ id, kind: 'vehicle', type: 'car', st, lat, dir, v, len: 4.5, wid: 1.8, cross: false, turning: false, box: [st - 2.25, st + 2.25, lat - 0.9, lat + 0.9] }, extra || {});
  const zone = (state) => ({ chunk: -14, lo: -461, hi: -403, coneLo: -445, coneHi: -419, flaggers: 1, state });

  it('work zone: inside the single lane against the go, entering past STOP, two opposite drivers inside', () => {
    const run = { meta, frames: [frame(0, -380, [ai('a', -463.5, -1.6, 1, 0)], [zone('green')]), frame(0.1, -381, [ai('a', -458.5, -1.6, 1, 4)], [zone('green')]), frame(0.2, -382, [ai('a', -455, -1.5, 1, 7), ai('b', -420, 1.6, -1, 7)], [zone('green')])] };
    expect(INV.checkWorkZone(run).map((v) => v.rule).sort()).toEqual(['against_go', 'entered_on_stop', 'opposed_pair']);
    expect(INV.checkWorkZone({ meta, frames: [frame(0, -380, [ai('a', -463.5, -1.6, 1, 0), ai('b', -430, 1.6, -1, 8)], [zone('green')])] })).toEqual([]);
    expect(INV.checkWorkZone({ meta, frames: [frame(0, -380, [ai('a', -440, 1.6, 1, 8)], [zone('red')])] })).toEqual([]);
  });

  it('head-on: an oncoming driver over the centre line in the learner\'s path; not one in its own lane', () => {
    expect(INV.checkHeadOn({ meta, frames: [frame(0, 0, [ai('a', -40, -1.6, 1, 9)])] })).toEqual([]);
    const v = INV.checkHeadOn({ meta, frames: [frame(0, 0, [ai('a', -40, 0.6, 1, 9)])] });
    expect(v.length).toBe(1); expect(v[0]).toMatchObject({ rule: 'head_on', id: 'a' });
  });

  it('gap: a driver who moves into the learner\'s path where the learner must brake harder than half the hard-brake line', () => {
    expect(INV.comfortDecel(meta)).toBeCloseTo(2.6, 1);
    expect(INV.requiredDecel(10, [{ dt: 0, gap: 40 }, { dt: 5, gap: 40 }], 1.5)).toBeLessThan(2.6);
    expect(INV.requiredDecel(10, [{ dt: 0, gap: 25 }, { dt: 5, gap: 25 }], 1.5)).toBeGreaterThan(2.6);
    const cut = (gap) => ({ meta, frames: [frame(0, 0, [ai('t', -gap - 2.25, -1.6, 1, 4)]), ...[0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 3].map((t) => frame(t, -10 * t, [ai('t', -gap - 2.25, 1.6, 0, 4, { cross: true })]))] });
    expect(INV.checkGap(cut(60))).toEqual([]);
    const v = INV.checkGap(cut(15));
    expect(v.length).toBe(1); expect(v[0].rule).toBe('gap');
  });
});
