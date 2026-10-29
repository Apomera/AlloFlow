import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const physics = require(resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js'));
const controls = { turns: 50, start: -60, finish: -20, duration: 1 };
const clone = (value) => JSON.parse(JSON.stringify(value));

describe('timed induction motion experiment', () => {
  it('records a complete uniform timeline with a zero initial sample', () => {
    const run = physics.inductionMotionExperiment(controls);
    expect(run).toMatchObject({ version: 1, type: 'induction-motion', controls: { ...controls, steps: 41 } });
    expect(run.samples).toHaveLength(41);
    expect(run.samples[0]).toMatchObject({ time: 0, x: -60, emf: 0 });
    expect(run.samples[40]).toMatchObject({ time: 1, x: -20 });
    run.samples.forEach((sample, index) => {
      expect(sample.time).toBeCloseTo(index / 40, 12);
      expect(sample.x).toBeCloseTo(-60 + index, 12);
      expect(sample.flux).toBeCloseTo(physics.fluxAt(sample.x, 40), 12);
      expect(Object.values(sample).every(Number.isFinite)).toBe(true);
    });
  });

  it('conserves signed voltage-time area through the endpoint flux change', () => {
    for (const steps of [3, 41, 81]) {
      const run = physics.inductionMotionExperiment({ ...controls, duration: 1.3, steps });
      const integrated = run.samples.slice(1).reduce((sum, sample, index) => sum + sample.emf * (sample.time - run.samples[index].time), 0);
      const expected = -controls.turns * 0.04 * (physics.fluxAt(controls.finish, 40) - physics.fluxAt(controls.start, 40));
      expect(run.signedImpulse).toBeCloseTo(expected, 11);
      expect(integrated).toBeCloseTo(expected, 11);
      expect(run.meanEMF).toBeCloseTo(expected / run.controls.duration, 11);
      expect(run.meanEMF).toBeCloseTo(physics.induceEMF(50, -60, -20, 1.3, 40) * 0.04, 11);
    }
  });

  it('quadruples pulse magnitude when the same path takes one-quarter the time', () => {
    const slow = physics.inductionMotionExperiment(controls);
    const fast = physics.inductionMotionExperiment({ ...controls, duration: 0.25 });
    slow.samples.forEach((sample, index) => {
      expect(fast.samples[index].x).toBe(sample.x);
      expect(fast.samples[index].flux).toBe(sample.flux);
      expect(fast.samples[index].emf).toBeCloseTo(sample.emf * 4, 10);
    });
    expect(fast.peakMagnitude / slow.peakMagnitude).toBeCloseTo(4, 10);
    expect(fast.meanEMF / slow.meanEMF).toBeCloseTo(4, 10);
    expect(fast.signedImpulse).toBeCloseTo(slow.signedImpulse, 10);
  });

  it('scales signed voltage and pulse area with turns while flux stays the same', () => {
    const original = physics.inductionMotionExperiment(controls);
    const doubled = physics.inductionMotionExperiment({ ...controls, turns: 100 });
    original.samples.forEach((sample, index) => {
      expect(doubled.samples[index].flux).toBe(sample.flux);
      expect(doubled.samples[index].emf).toBeCloseTo(sample.emf * 2, 10);
    });
    expect(doubled.peakMagnitude).toBeCloseTo(original.peakMagnitude * 2, 10);
    expect(doubled.signedImpulse).toBeCloseTo(original.signedImpulse * 2, 10);
  });

  it('reverses the voltage sign when the identical motion is run backward', () => {
    const forward = physics.inductionMotionExperiment(controls);
    const reverse = physics.inductionMotionExperiment({ ...controls, start: controls.finish, finish: controls.start });
    for (let index = 1; index < forward.samples.length; index++) {
      expect(reverse.samples[index].emf).toBeCloseTo(-forward.samples[forward.samples.length - index].emf, 10);
    }
    expect(reverse.signedImpulse).toBeCloseTo(-forward.signedImpulse, 10);
    expect(reverse.peakMagnitude).toBeCloseTo(forward.peakMagnitude, 10);
  });

  it('shows two opposite pulses for a full pass even though endpoint average voltage is zero', () => {
    const run = physics.inductionMotionExperiment({ ...controls, start: -80, finish: 80, duration: 2 });
    expect(run.samples.slice(1, 21).every((sample) => sample.emf < 0)).toBe(true);
    expect(run.samples.slice(21).every((sample) => sample.emf > 0)).toBe(true);
    expect(run.peakMagnitude).toBeGreaterThan(1);
    expect(run.meanEMF).toBeCloseTo(0, 11);
    expect(run.signedImpulse).toBeCloseTo(0, 11);
    const largestPositive = Math.max(...run.samples.map((sample) => sample.emf));
    const largestNegative = Math.min(...run.samples.map((sample) => sample.emf));
    expect(largestPositive).toBeCloseTo(-largestNegative, 10);
  });

  it('records zero voltage while a magnet is held still, including inside the coil', () => {
    for (const position of [-100, 0, 100]) {
      const run = physics.inductionMotionExperiment({ ...controls, start: position, finish: position });
      expect(run.samples.every((sample) => sample.x === position && sample.emf === 0)).toBe(true);
      expect(run).toMatchObject({ peakMagnitude: 0, meanEMF: 0, signedImpulse: 0 });
    }
  });

  it('rejects out-of-model and coerced controls without nonfinite output or excessive sample counts', () => {
    for (const input of [null, [], 1, 'run', {},
      ...['turns', 'start', 'finish', 'duration'].flatMap((key) => [null, undefined, '', true, Infinity, NaN, '50'].map((value) => ({ ...controls, [key]: value }))),
      ...[9, 201].map((turns) => ({ ...controls, turns })),
      ...[-101, 101].flatMap((position) => [{ ...controls, start: position }, { ...controls, finish: position }] ),
      ...[0, -1, 0.249, 4.001].map((duration) => ({ ...controls, duration })),
      ...[null, '41', 2, 82, 3.5, Infinity].map((steps) => ({ ...controls, steps })),
    ]) expect(physics.inductionMotionExperiment(input)).toBeNull();
    expect(physics.inductionMotionExperiment({ turns: 200, start: -100, finish: 100, duration: 4, steps: 81 }).samples).toHaveLength(81);
  });
});

describe('saved induction evidence and export', () => {
  it('round-trips a canonical experiment to an independent clean record', () => {
    const original = physics.inductionMotionExperiment(controls);
    const saved = clone(original);
    saved.unrelated = 'not scientific evidence';
    saved.controls.extra = 'not a control';
    const restored = physics.normalizeInductionMotionExperiment(saved);
    expect(restored).toEqual(original);
    expect(restored.samples).not.toBe(saved.samples);
    expect(restored.samples[1]).not.toBe(saved.samples[1]);
    expect(restored.controls).not.toBe(saved.controls);
    saved.samples[1].emf = 999;
    expect(restored.samples[1].emf).toBe(original.samples[1].emf);
  });

  it('rejects saved readings and summaries that disagree with acquisition controls', () => {
    const original = physics.inductionMotionExperiment(controls);
    const corruptions = [
      (record) => { record.version = 2; },
      (record) => { record.type = 'other'; },
      (record) => { record.controls.turns = 100; },
      (record) => { delete record.controls.steps; },
      (record) => { record.samples.pop(); },
      (record) => { record.samples[1].time += 0.01; },
      (record) => { record.samples[1].x += 1; },
      (record) => { record.samples[1].flux += 0.1; },
      (record) => { record.samples[1].emf = '0'; },
      (record) => { record.samples[1].emf = Infinity; },
      (record) => { record.peakMagnitude += 1; },
      (record) => { record.meanEMF += 1; },
      (record) => { record.signedImpulse += 1; },
    ];
    corruptions.forEach((corrupt) => {
      const saved = clone(original);
      corrupt(saved);
      expect(physics.normalizeInductionMotionExperiment(saved)).toBeNull();
    });
    expect(physics.normalizeInductionMotionExperiment(null)).toBeNull();
  });

  it('exports signed numeric samples with their controls, never user-supplied text', () => {
    const run = physics.inductionMotionExperiment({ ...controls, start: -80, finish: 80 });
    run.label = '=HYPERLINK("bad")';
    const csv = physics.inductionMotionCSV(run);
    const rows = csv.trim().split('\r\n');
    expect(rows[0]).toBe('time_s,position,flux_relative,emf_scaled_V,turns,start,finish,duration_s');
    expect(rows).toHaveLength(42);
    expect(csv).not.toContain('HYPERLINK');
    const data = rows.slice(1).map((row) => row.split(',').map(Number));
    expect(data.every((row) => row.length === 8 && row.every(Number.isFinite))).toBe(true);
    expect(data.some((row) => row[3] < 0)).toBe(true);
    expect(data.some((row) => row[3] > 0)).toBe(true);
    expect(data[40]).toEqual([1, 80, physics.fluxAt(80, 40), run.samples[40].emf, 50, -80, 80, 1]);
    expect(physics.inductionMotionCSV({ ...run, meanEMF: 20 })).toBeNull();
  });
});

describe('induction sign explanation', () => {
  it('names the opposed flux change with Faraday’s sign convention and no ambiguous viewpoint', () => {
    const approaching = physics.induceEMF(50, -60, -20, 1, 40) * 0.04;
    const withdrawing = physics.induceEMF(50, -20, -60, 1, 40) * 0.04;
    expect(physics.inductionLenzState(approaching)).toMatchObject({ active: true, sign: -1, fluxChange: 'increasing', opposes: 'increasing flux' });
    expect(physics.inductionLenzState(withdrawing)).toMatchObject({ active: true, sign: 1, fluxChange: 'decreasing', opposes: 'decreasing flux' });
    expect(physics.inductionLenzState(approaching).summary).not.toContain('clockwise');
    for (const zero of [0, -0, 1e-10, -1e-10]) expect(physics.inductionLenzState(zero)).toMatchObject({ active: false, sign: 0, fluxChange: 'unchanged' });
    for (const bad of [NaN, Infinity, undefined, null, '1']) expect(physics.inductionLenzState(bad)).toMatchObject({ active: false, fluxChange: 'unknown' });
  });
});
