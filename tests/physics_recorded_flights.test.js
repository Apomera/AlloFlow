import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

let P;
const copy = value => JSON.parse(JSON.stringify(value));
const tuples = trail => trail.map(p => [p.t, p.mX, p.mY, p.mVx, p.mVy]);
const metadata = trail => Object.fromEntries(['run', 'modelVersion', 'angle', 'velocity', 'gravity', 'mass', 'launchHeight', 'drag', 'parameters', 'apex', 'prediction', 'mission'].map(key => [key, trail[key]]));

beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
  window.StemLab._registry.physics.render({
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    icons: {}, toolData: { physics: {} }, setToolData() {}, gradeLevel: '5th Grade',
    t: (_key, fallback) => fallback, props: {}, toolSnapshots: [], addToast() {}, announceToSR() {},
  });
});

function recorded({ run = 1, angle = 35, velocity = 35, gravity = 9.8, mass = 2, launchHeight = 10, drag = false } = {}) {
  const parameters = { angle, velocity, gravity, mass, launchHeight, drag };
  const radians = angle * Math.PI / 180;
  const body = { t: 0, mX: 0, mY: launchHeight, mVx: velocity * Math.cos(radians), mVy: velocity * Math.sin(radians),
    grav: gravity, drag: drag ? P.DRAG_K : 0, mass, launchHeight, maxH: launchHeight };
  const point = value => ({ t: value.t, mX: value.mX, mY: value.mY, mVx: value.mVx, mVy: value.mVy });
  const trail = [point(body)];
  Object.assign(trail, parameters, { run, modelVersion: P.MODEL_VERSION, parameters: Object.freeze({ ...parameters }),
    prediction: 123.456789012345, mission: Object.freeze({ targetMode: false, targetRound: 3, challengeTier: null }) });
  for (let steps = 0; !body.landed && steps < 4096; steps++) {
    P.step(body, P.DT);
    P.recordSample(trail, body);
  }
  expect(body.landed).toBe(true);
  if (body.apex) trail.apex = Object.freeze({ tSec: body.apex.t, mX: body.apex.mX, mY: body.apex.mY, vx: body.apex.mVx });
  const summary = { n: run, angle, vel: velocity, grav: gravity, mass, launchHeight, drag,
    range: body.mX, maxH: body.maxH, time: body.t, modelVersion: P.MODEL_VERSION };
  const record = P.captureRecordedFlight(trail, summary, run);
  expect(record).not.toBeNull();
  return { body, trail, summary, record };
}

function rejects(record) {
  expect(P.normalizeRecordedFlights([record])).toEqual([]);
  expect(P.restoreRecordedFlight(record)).toBeNull();
}

// Storage-boundary data, not a numerical-accuracy fixture. Every tuple is finite,
// uses a coherent release velocity, and respects the recorder's maximum time gap.
function synthetic(run, count = 4096) {
  const p = { angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, drag: false };
  const vx = p.velocity * Math.cos(p.angle * Math.PI / 180), vy = p.velocity * Math.sin(p.angle * Math.PI / 180);
  return { version: 1, run, modelVersion: P.MODEL_VERSION, parameters: p,
    points: Array.from({ length: count }, (_, i) => [i * .01, i * .1234567890123456,
      i === 0 || i === count - 1 ? 0 : 10.123456789012345, i === 0 ? vx : 17.123456789012345,
      i === 0 ? vy : -.9876543210987654]),
    apex: null, prediction: 123.456789012345, mission: null };
}

describe('completed recorded-flight round trips', () => {
  it('preserves real vacuum and drag samples, metadata, and every inspection snapshot through JSON', () => {
    for (const drag of [false, true]) for (const launchHeight of [0, 10]) {
      const { trail, record } = recorded({ drag, launchHeight });
      const before = { points: tuples(trail), metadata: metadata(trail) };
      const restored = P.restoreRecordedFlight(copy(record));
      expect(tuples(restored)).toEqual(before.points);
      expect(metadata(restored)).toEqual(before.metadata);
      expect(record.points).toEqual(before.points);
      for (let index = 0; index < trail.length; index++) {
        expect(P.inspectSample(restored, index)).toEqual(P.inspectSample(trail, index));
      }
      expect({ points: tuples(trail), metadata: metadata(trail) }).toEqual(before);
    }
  });

  it('keeps the horizontal release apex and does not invent omitted original apex metadata', () => {
    for (const drag of [false, true]) {
      const { record } = recorded({ angle: 0, launchHeight: 10, drag });
      expect(record.apex.tSec).toBe(0);
      const restored = P.restoreRecordedFlight(copy(record));
      expect(P.recordedMoments(restored).apexIndex).toBe(0);
      expect(P.inspectSample(restored, 0)).toMatchObject({ apex: true, vy: 0, y: 10 });
      const missing = copy(record); missing.apex = null;
      const withoutApex = P.restoreRecordedFlight(missing);
      expect(withoutApex.apex).toBeNull();
      expect(tuples(withoutApex)).toEqual(record.points);
      expect(P.recordedMoments(withoutApex).apexIndex).toBe(-1);
    }
  });

  it('retains distinct launch, apex, and impact when a whole flight ends within one tick', () => {
    for (const drag of [false, true]) {
      const { record } = recorded({ angle: 5, velocity: 5, gravity: 25, launchHeight: 0, drag });
      expect(record.points).toHaveLength(3);
      expect(record.points.at(-1)[0]).toBeLessThan(P.DT);
      const restored = P.restoreRecordedFlight(copy(record));
      expect(tuples(restored)).toEqual(record.points);
      expect(P.recordedMoments(restored)).toMatchObject({ launchIndex: 0, apexIndex: 1, latestIndex: 2, impact: true });
    }
  });

  it('owns deeply frozen evidence while every restoration creates independent runtime objects', () => {
    const { trail, record } = recorded();
    for (const value of [record, record.parameters, record.points, ...record.points, record.apex, record.mission]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    const before = copy(record), first = P.restoreRecordedFlight(record), second = P.restoreRecordedFlight(record);
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
    expect(first.parameters).not.toBe(second.parameters);
    for (const value of [first.parameters, first.apex, first.mission]) expect(Object.isFrozen(value)).toBe(true);
    trail[1].mX = 999;
    first[1].mY = 999;
    expect(record).toEqual(before);
    expect(tuples(second)).toEqual(before.points);
  });

  it('resolves only consistent run identities and preserves absent optional metadata as null', () => {
    const { trail, summary } = recorded({ run: 17 });
    delete trail.run; delete trail.prediction; delete trail.mission;
    expect(P.captureRecordedFlight(trail)).toBeNull();
    const inferred = P.captureRecordedFlight(trail, summary);
    expect(inferred).toMatchObject({ run: 17, prediction: null, mission: null });
    expect(P.captureRecordedFlight(trail, undefined, 17)).toEqual(inferred);
    expect(P.captureRecordedFlight(trail, summary, 18)).toBeNull();
    trail.run = 19;
    expect(P.captureRecordedFlight(trail, summary, 17)).toBeNull();
  });

  it('rejects unfinished traces and every mismatched summary identity without changing either input', () => {
    const { trail, record, summary } = recorded();
    const unfinished = P.restoreRecordedFlight(record); unfinished.pop();
    expect(P.captureRecordedFlight(unfinished, summary)).toBeNull();
    expect(P.captureRecordedFlight([])).toBeNull();
    const before = { points: tuples(trail), metadata: metadata(trail), summary: { ...summary } };
    for (const key of ['n', 'angle', 'vel', 'grav', 'mass', 'launchHeight', 'range', 'maxH', 'time']) {
      expect(P.captureRecordedFlight(trail, { ...summary, [key]: summary[key] + 1 }), key).toBeNull();
    }
    expect(P.captureRecordedFlight(trail, { ...summary, drag: !summary.drag })).toBeNull();
    expect(P.captureRecordedFlight(trail, { ...summary, modelVersion: 'projectile-v2' })).toBeNull();
    expect({ points: tuples(trail), metadata: metadata(trail), summary }).toEqual(before);
  });
});

describe('untrusted recording validation', () => {
  it('drops unsupported schemas/models, missing or extra fields, and invalid run identities whole', () => {
    const { record } = recorded();
    for (const change of [r => { r.version = 2; }, r => { r.modelVersion = 'projectile-v2'; },
      r => { delete r.parameters; }, r => { r.extra = true; }, r => { r.parameters.extra = 1; },
      ...[0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER].map(run => r => { r.run = run; })]) {
      const bad = copy(record); change(bad); rejects(bad);
    }
    for (const raw of [null, undefined, {}, 'recordings']) expect(P.normalizeRecordedFlights(raw)).toEqual([]);
    expect(P.normalizeRecordedFlights([null, copy(record), {}])).toEqual([record]);
  });

  it('rejects invalid numeric fields, parameter domains, tuples, and optional metadata', () => {
    const { record } = recorded();
    const changes = [
      r => { r.parameters.mass = 0; }, r => { r.parameters.gravity = 0; }, r => { r.parameters.velocity = 51; },
      r => { r.parameters.launchHeight = 51; }, r => { r.parameters.drag = 'yes'; },
      r => { r.points[1][2] = -1; }, r => { r.points[1] = [0, 0]; },
      r => { r.prediction = -1; }, r => { r.mission.targetMode = 1; }, r => { r.mission.targetRound = 11; },
      r => { r.mission.challengeTier = 4; },
    ];
    for (const invalid of [NaN, Infinity, -Infinity, '1', null, {}]) {
      for (let column = 0; column < 5; column++) changes.push(r => { r.points[1][column] = invalid; });
    }
    for (const change of changes) { const bad = copy(record); change(bad); rejects(bad); }
  });

  it('requires the original release, ordered bounded time gaps, forward positions, and a final impact', () => {
    const { record } = recorded();
    for (const change of [
      r => { r.points[0][0] = .001; }, r => { r.points[0][1] = 1; }, r => { r.points[0][2] += 1; },
      r => { r.points[2][0] = r.points[1][0]; }, r => { r.points[2][0] = r.points[1][0] - .001; },
      r => { r.points[1][0] = P.DT + .00001; }, r => { r.points[2][1] = r.points[1][1] - .01; },
      r => { r.points.at(-1)[2] = 1; }, r => { r.points.at(-1)[4] = 1; },
    ]) { const bad = copy(record); change(bad); rejects(bad); }
  });

  it('validates captured launch velocity and nonnegative horizontal velocity without rounding accepted data', () => {
    const { record } = recorded();
    for (const column of [3, 4]) {
      const allowed = copy(record); allowed.points[0][column] += 5e-11;
      const kept = P.normalizeRecordedFlights([allowed]);
      expect(kept).toHaveLength(1);
      expect(kept[0].points[0][column]).toBe(allowed.points[0][column]);
      const bad = copy(record); bad.points[0][column] += 2e-10; rejects(bad);
    }
    const reversed = copy(record); reversed.points[1][3] = -.0000001; rejects(reversed);
  });

  it('requires apex metadata to identify the exact recorded zero-vy highest point', () => {
    const { record } = recorded();
    for (const change of [
      r => { r.apex.tSec += .000001; }, r => { r.apex.vx += .000001; },
      r => { r.points.find(p => p[0] === r.apex.tSec)[4] = .000001; },
      r => { r.points[1][2] = r.apex.mY + 1; }, r => { r.apex.extra = true; },
    ]) { const bad = copy(record); change(bad); rejects(bad); }
  });

  it('revalidates mutable imports and foreign frozen lists while reusing only trusted immutable outputs', () => {
    const raw = [copy(recorded().record)], first = P.normalizeRecordedFlights(raw);
    expect(P.normalizeRecordedFlights(first)).toBe(first);
    raw[0].points[1][0] = 0;
    expect(P.normalizeRecordedFlights(raw)).toEqual([]);
    expect(first[0].points[1][0]).toBeGreaterThan(0);
    const foreign = Object.freeze([copy(recorded().record)]);
    expect(P.normalizeRecordedFlights(foreign)).toHaveLength(1);
    foreign[0].modelVersion = 'unknown';
    expect(P.normalizeRecordedFlights(foreign)).toEqual([]);
  });
});

describe('bounded whole-record retention and state compatibility', () => {
  it('keeps the newest valid duplicate, with malformed later duplicates unable to hide usable evidence', () => {
    const old = recorded({ run: 7 }).record, recent = copy(old);
    recent.prediction = 23.456789012345;
    const invalid = copy(recent); invalid.points[1][0] = 0;
    const result = P.normalizeRecordedFlights([old, recent, invalid]);
    expect(result).toEqual([recent]);
    expect(result[0].points).toEqual(old.points);
  });

  it('retains five newest records in input chronology rather than sorting or renumbering IDs', () => {
    const base = recorded().record;
    const records = [90, 2, 80, 4, 70, 6, 60].map(run => ({ ...copy(base), run }));
    const retained = P.normalizeRecordedFlights(records);
    expect(P.RECORDED_FLIGHT_LIMITS).toEqual({ version: 1, count: 5, points: 4096, characters: 600 * 1024 });
    expect(retained.map(r => r.run)).toEqual([80, 4, 70, 6, 60]);
    expect(retained.map(r => r.points)).toEqual(records.slice(-5).map(r => r.points));
  });

  it('accepts all 4096 coherent points and rejects a 4097-point record without truncation', () => {
    const atLimit = synthetic(1);
    const kept = P.normalizeRecordedFlights([atLimit]);
    expect(kept).toHaveLength(1);
    expect(kept[0].points).toEqual(atLimit.points);
    expect(tuples(P.restoreRecordedFlight(kept[0]))).toEqual(atLimit.points);
    rejects(synthetic(2, 4097));
  });

  it('enforces the total serialized budget by retaining newest whole traces without downsampling', () => {
    const small = recorded({ run: 1 }).record, olderLarge = synthetic(2), newestLarge = synthetic(3);
    const limit = 600 * 1024;
    expect(JSON.stringify([olderLarge, newestLarge]).length).toBeGreaterThan(limit);
    expect(JSON.stringify([small, newestLarge]).length).toBeLessThanOrEqual(limit);
    const kept = P.normalizeRecordedFlights([small, olderLarge, newestLarge]);
    expect(kept.map(r => r.run)).toEqual([1, 3]);
    expect(JSON.stringify(kept).length).toBeLessThanOrEqual(limit);
    expect(kept[0].points).toEqual(small.points);
    expect(kept[1].points).toEqual(newestLarge.points);
    expect(newestLarge.points).toHaveLength(4096);
  });

  it('fits a real extreme UI flight with every original observation and event intact', () => {
    const { trail, record } = recorded({ angle: 85, velocity: 50, gravity: 1, mass: 10, launchHeight: 50 });
    expect(record.points.length).toBeGreaterThan(2800);
    expect(record.points.length).toBeLessThanOrEqual(4096);
    expect(JSON.stringify([record]).length).toBeLessThanOrEqual(600 * 1024);
    const kept = P.normalizeRecordedFlights([copy(record)]);
    expect(kept).toEqual([record]);
    expect(tuples(P.restoreRecordedFlight(kept[0]))).toEqual(tuples(trail));
  });

  it('keeps captured settings and snapshots unchanged when current launch controls change', () => {
    const { record, trail } = recorded({ run: 25, drag: true });
    const records = P.normalizeRecordedFlights([record]);
    const state = P.normalizeState({ recordedFlights: records, angle: 80, velocity: 5, gravity: 1, mass: 10, launchHeight: 40, airResist: false });
    expect(state.recordedFlights).toBe(records);
    expect(state).toMatchObject({ angle: 80, velocity: 5, gravity: 1, mass: 10, launchHeight: 40, airResist: false });
    const restored = P.restoreRecordedFlight(state.recordedFlights[0]);
    expect(restored.parameters).toEqual(trail.parameters);
    expect(P.inspectSample(restored, 1)).toEqual(P.inspectSample(trail, 1));
  });

  it('recovers run IDs across recordings, archives, and legacy summaries without inventing lost traces', () => {
    const { record, summary } = recorded({ run: 40 });
    const legacy = { ...summary, n: 12, modelVersion: 'projectile-v2' }; delete legacy.launchHeight;
    const rows = [{ ...summary, n: 80 }, { ...summary, n: 81 }];
    const archive = P.createInvestigation({ title: 'Saved evidence', selectedRunIds: [80, 81] }, rows, 'saved', '2026-10-01T12:00:00.000Z');
    expect(archive).not.toBeNull();
    const damaged = { ...copy(record), run: 999, modelVersion: 'unsupported' };
    const state = P.normalizeState({ runCount: 2, runLog: [legacy], lastFlight: legacy,
      investigations: [copy(archive)], recordedFlights: [copy(record), damaged] });
    expect(state.runCount).toBe(81);
    expect(state.runLog).toEqual([{ ...legacy, launchHeight: 0 }]);
    expect(state.lastFlight).toEqual({ ...legacy, launchHeight: 0 });
    expect(state.investigations).toEqual([archive]);
    expect(state.recordedFlights).toEqual([record]);
    expect(legacy).not.toHaveProperty('launchHeight');
    expect(P.normalizeState({ recordedFlights: [{ ...copy(record), run: 900 }], investigations: [archive] }).runCount).toBe(900);
    expect(P.normalizeState({ runLog: [legacy], recordedFlights: [damaged] }).recordedFlights).toEqual([]);
  });
});
