import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api = window.StemLab.ecosystemFoodWeb; });
const pose = (x, z, extra = {}) => ({ active: true, x, z, altitude: 0.02, state: 'Moving', ...extra });
const encounter = (last = 4) => ({ id: 'fixture', before: 0, after: last, actor: { id: 'foxes', index: 0 }, cue: { id: 'rabbits', index: 0 } });
const frame = (a, b) => ({ foxes: [pose(...a)], rabbits: [pose(...b)] });
const frames = () => [frame([0, 0], [3, 4]), frame([1, 0], [3, 4]), frame([2, 0], [3, 4]), frame([3, 0], [3, 4]), frame([3, 1], [3, 4])];

describe('recorded pair ruler measurements', () => {
  it('uses the exact same-time x/z ground positions rather than prior decision cues or altitude', () => {
    const f = frames(); f[0].foxes[0] = { ...f[0].foxes[0], altitude: 9, preyDistance: 99, prey: 'voles', preyIndex: 3 };
    const e = encounter(), before = JSON.stringify(f), measured = api.pairMeasurement(f, e, 0);
    expect(measured).toEqual({ step: 0, actor: { id: 'foxes', index: 0, x: 0, z: 0, state: 'Moving' }, cue: { id: 'rabbits', index: 0, x: 3, z: 4, state: 'Moving' }, gap: 5 });
    measured.actor.x = 999; measured.cue.state = 'Changed';
    expect(JSON.stringify(f)).toBe(before); expect(api.pairMeasurement(f, e, 0).gap).toBe(5);
  });

  it('supports a fixed distinct same-species neighbor and excludes self measurements', () => {
    const f = [{ rabbits: [pose(1, 2), pose(4, 6)] }], e = { before: 0, after: 0, actor: { id: 'rabbits', index: 0 }, cue: { id: 'rabbits', index: 1 } };
    expect(api.pairMeasurement(f, e, 0).gap).toBe(5); e.cue.index = 0; expect(api.pairMeasurement(f, e, 0)).toBeNull();
  });

  it('rejects invalid bounds, identities, absent representatives, non-finite data and overflow', () => {
    for (const value of [-1, 5, 0.1, NaN, Infinity, '1', null, undefined]) expect(api.pairMeasurement(frames(), encounter(), value)).toBeNull();
    for (const mutate of [e => { e.before = -1; }, e => { e.before = 0.2; }, e => { e.after = 5; }, e => { e.after = 0.2; }, e => { e.before = 3; e.after = 2; }, e => { e.actor.index = 16; }, e => { e.cue.index = -1; }, e => { e.actor.id = 'plants'; }, e => { e.cue.id = 'unknown'; }, e => { e.actor = null; }]) {
      const e = encounter(); mutate(e); expect(api.pairMeasurement(frames(), e, 0)).toBeNull();
    }
    for (const mutate of [f => { f[0].foxes[0].active = false; }, f => { f[0].rabbits[0].active = 1; }, f => { f[0].foxes[0].x = NaN; }, f => { f[0].rabbits[0].z = Infinity; }, f => { f[0].foxes[0].x = '0'; }, f => { f[0].foxes = {}; }, f => { f[0].rabbits = []; }, f => { f[0] = null; }, f => { f[0].foxes[0].x = 1e308; f[0].rabbits[0].x = -1e308; }]) {
      const f = frames(); mutate(f); expect(api.pairMeasurement(f, encounter(), 0)).toBeNull();
    }
    for (const f of [null, {}, 'frames']) expect(api.pairMeasurement(f, encounter(), 0)).toBeNull();
  });

  it('requires three strictly ordered checkpoints and continuous live representatives between them', () => {
    for (const steps of [[0, 2], [0, 1, 2, 3], [2, 1, 3], [0, 0, 4], [0, null, 4], ['0', 2, 4], [0, 0.5, 4], [0, 2, 5], null, 'bad']) expect(api.pairEvidence(frames(), encounter(), steps)).toBeNull();
    for (const mutate of [f => { f[1].foxes[0].active = false; }, f => { f[3].rabbits[0].active = false; }, f => { f[1].rabbits[0].z = NaN; }, f => { f[3] = null; }]) {
      const f = frames(); mutate(f); expect(api.pairMeasurement(f, encounter(), 0)).not.toBeNull(); expect(api.pairMeasurement(f, encounter(), 4)).not.toBeNull(); expect(api.pairEvidence(f, encounter(), [0, 2, 4])).toBeNull();
    }
  });

  it('computes actual sampled path totals rather than endpoint displacement', () => {
    const f = [frame([0, 0], [4, 0]), frame([0, 2], [4, 0]), frame([0, 0], [4, 0]), frame([0, -3], [4, 0]), frame([0, 0], [4, 0])], evidence = api.pairEvidence(f, encounter(), [0, 2, 4]);
    expect(evidence.intervals.map(i => i.actorTravel)).toEqual([4, 6]); expect(evidence.intervals.map(i => i.cueTravel)).toEqual([0, 0]);
    expect(evidence.samples.map(p => p.gap)).toEqual([4, 4, 4]); expect(evidence.trend).toBe('steady'); expect(evidence.netChange).toBe(0); expect(evidence.largestChange).toEqual([0, 1]);
  });

  it('distinguishes opening, closing, reversal and similarity from both intervals', () => {
    const withGaps = gaps => gaps.map(gap => frame([0, 0], [gap, 0]));
    for (const [gaps, trend] of [[[5, 4, 3], 'closer'], [[3, 4, 5], 'farther'], [[3, 4, 3], 'mixed'], [[3, 3.004, 3.002], 'steady'], [[3, 3.005, 3.010], 'steady'], [[3, 3.004, 2.9], 'closer'], [[3, 2.998, 3.1], 'farther']]) {
      const evidence = api.pairEvidence(withGaps(gaps), encounter(2), [0, 1, 2]); expect(evidence.trend).toBe(trend); expect(evidence.tolerance).toBe(0.005); expect(evidence.netChange).toBeCloseTo(gaps[2] - gaps[0], 12);
    }
    const evidence = api.pairEvidence(withGaps([3, 5, 4]), encounter(2), [0, 1, 2]); expect(evidence.largestChange).toEqual([0]);
  });

  it('is deterministic, detached and does not mutate the ecological run', () => {
    const config = { initial: { rabbits: 90, foxes: 6 }, enabled: { voles: false, owls: false }, cover: 10, event: 'none' }, pair = api.compare(config), original = JSON.stringify(pair), f = api.behaviorTimeline(config, pair.experiment), encounters = api.encounters(f, config), e = encounters.find(e => e.kind === 'listening') || encounters[0];
    expect(e).toBeTruthy(); const before = JSON.stringify(f), steps = [e.start, Math.floor((e.start + e.end) / 2), e.end], a = api.pairEvidence(f, e, steps), b = api.pairEvidence(f, e, steps);
    expect(a).toBeTruthy(); expect(a).toEqual(b); expect(a).not.toBe(b); expect(a.samples[0].actor).not.toBe(b.samples[0].actor);
    a.samples[0].actor.x = 100; a.intervals[0].delta = 999; expect(api.pairEvidence(f, e, steps)).toEqual(b); expect(JSON.stringify(f)).toBe(before); expect(JSON.stringify(pair)).toBe(original);
  });
});
