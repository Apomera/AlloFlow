import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console };
vm.runInNewContext(source.replace("window.StemLab.registerTool('bridgeLab', {", `
  window.seismicModel = { bridgeSeismicResponse, bridgeSeismicSample, bridgeSeismicForces, bridgeSeismicTrials, bridgeSeismicTimeline, bridgeSeismicComparison, bridgeSeismicScanPoint, bridgeSeismicScanSummary, BRIDGE_RESPONSE_ARCHETYPES };
  window.StemLab.registerTool('bridgeLab', {`), sandbox);
const { bridgeSeismicResponse: response, bridgeSeismicSample: sample, BRIDGE_RESPONSE_ARCHETYPES: archetypes } = sandbox.window.seismicModel;

describe('Bridge Lab illustrative seismic response', () => {
  it('reports power consistent with the equation of motion across modes and damping settings', () => {
    for (const archetype of archetypes) for (const dampingRatio of [0, 0.05, 0.4]) {
      const result = response({ archetype: archetype.id, dampingRatio, intensityG: 0.5, groundFrequencyHz: 3 });
      const omega = 2 * Math.PI * result.naturalFrequencyHz;
      for (const p of result.samples.filter((_, i) => i % 37 === 0)) {
        expect(p.inputPowerWPerKg).toBeCloseTo(-p.groundAccelerationMps2 * p.velocityMps, 10);
        expect(p.dampingPowerWPerKg).toBeCloseTo(2 * dampingRatio * omega * p.velocityMps ** 2, 10);
        expect(p.elasticPowerWPerKg).toBeCloseTo(omega ** 2 * p.relativeM * p.velocityMps, 10);
        expect(p.kineticPowerWPerKg).toBeCloseTo(p.velocityMps * p.relativeAccelerationMps2, 10);
        expect(p.kineticPowerWPerKg + p.elasticPowerWPerKg).toBeCloseTo(p.storedPowerWPerKg, 10);
        expect(p.inputPowerWPerKg - p.dampingPowerWPerKg).toBeCloseTo(p.storedPowerWPerKg, 10);
        expect(p.dampingPowerWPerKg).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('matches power to independently differenced energy histories', () => {
    const r = response({ dampingRatio: 0.05, groundFrequencyHz: 1.1 });
    for (const time of [5, 7, 12, 17]) {
      const i = Math.round(time / r.sampleStepS);
      for (const [energy, rate] of [['kineticJPerKg', 'kineticPowerWPerKg'], ['strainJPerKg', 'elasticPowerWPerKg'],
        ['storedJPerKg', 'storedPowerWPerKg'], ['dissipatedJPerKg', 'dampingPowerWPerKg'], ['inputJPerKg', 'inputPowerWPerKg']]) {
        const slope = (r.samples[i-2][energy] - 8*r.samples[i-1][energy] + 8*r.samples[i+1][energy] - r.samples[i+2][energy]) / (12*r.sampleStepS);
        expect(Math.abs(slope - r.samples[i][rate]), energy + ' at ' + time).toBeLessThan(0.0002 * Math.max(1, Math.abs(r.samples[i][rate])));
      }
    }
  });

  it('preserves the power balance between stored samples and during negative input work', () => {
    const r = response({ dampingRatio: 0.05 });
    const returning = r.samples.find(p => p.inputPowerWPerKg < -0.001);
    expect(returning).toBeTruthy();
    expect(returning.storedPowerWPerKg).toBeLessThan(0);
    for (const time of [0.0123, 7.217, 15.99, 16.01, 23.999]) {
      const p = sample(r, time);
      expect(p.kineticPowerWPerKg + p.elasticPowerWPerKg).toBeCloseTo(p.storedPowerWPerKg, 12);
      expect(p.inputPowerWPerKg - p.dampingPowerWPerKg).toBeCloseTo(p.storedPowerWPerKg, 12);
      expect(p.dampingPowerWPerKg).toBeGreaterThanOrEqual(0);
    }
  });

  it('retains internal energy exchange with no damping after input work ends', () => {
    const points = response({ dampingRatio: 0 }).samples.filter(p => p.timeS >= 16);
    expect(points.some(p => p.elasticPowerWPerKg > 0.001)).toBe(true);
    expect(points.some(p => p.elasticPowerWPerKg < -0.001)).toBe(true);
    for (const p of points) {
      expect(p.inputPowerWPerKg).toBe(0);
      expect(p.dampingPowerWPerKg).toBe(0);
      expect(p.storedPowerWPerKg).toBe(0);
      expect(p.kineticPowerWPerKg).toBe(-p.elasticPowerWPerKg);
    }
  });

  it('keeps zero-input power exactly zero and scales rates quadratically with shaking amplitude', () => {
    const a=response({ intensityG: 0.1 }), b=response({ intensityG: 0.2 }), zero=response({ intensityG: 0 });
    const fields=['inputPowerWPerKg','dampingPowerWPerKg','elasticPowerWPerKg','kineticPowerWPerKg','storedPowerWPerKg'];
    for (const p of zero.samples) for (const key of fields) expect(p[key]).toBe(0);
    for (const i of [301, 487, 799, 1103]) for (const key of fields) expect(b.samples[i][key]).toBeCloseTo(a.samples[i][key] * 4, 12);
  });

  it('scans the same complete response model without mutating fixed inputs or retaining histories', () => {
    const settings = { archetype: 'balanced', intensityG: 0.12, dampingRatio: 0.05 };
    for (const frequencyHz of [0.2, 1.1, 3]) {
      const point = sandbox.window.seismicModel.bridgeSeismicScanPoint(settings, frequencyHz);
      const full = response({ ...settings, groundFrequencyHz: frequencyHz });
      expect(point).toEqual({ frequencyHz, relativeCm: full.peaks.relativeM * 100,
        accelerationG: full.peaks.absoluteAccelerationMps2 / 9.80665,
        motionTimeS: full.milestones.peakMotionS, accelerationTimeS: full.milestones.peakAccelerationS });
      expect(full.peaks.groundAccelerationMps2 / 9.80665).toBeCloseTo(0.12, 3);
      expect(Object.values(point).every(Number.isFinite)).toBe(true);
      expect(point.motionTimeS).toBeGreaterThanOrEqual(0);
      expect(point.accelerationTimeS).toBeLessThanOrEqual(24);
    }
    expect(settings).toEqual({ archetype: 'balanced', intensityG: 0.12, dampingRatio: 0.05 });
  });

  it('distinguishes frequency and damping effects under the same ground acceleration', () => {
    const point = (frequencyHz, dampingRatio = 0.05) => sandbox.window.seismicModel.bridgeSeismicScanPoint({
      archetype: 'balanced', intensityG: 0.12, dampingRatio }, frequencyHz);
    const near = point(1.1), far = point(3), damped = point(1.1, 0.2);
    expect(near.relativeCm).toBeGreaterThan(far.relativeCm);
    expect(near.accelerationG).toBeGreaterThan(far.accelerationG);
    expect(damped.relativeCm).toBeLessThan(near.relativeCm);
    expect(damped.accelerationG).toBeLessThan(near.accelerationG);
  });

  it('selects maxima by measure, maps actual frequency spacing, and keeps zero-input curves finite', () => {
    const summary = sandbox.window.seismicModel.bridgeSeismicScanSummary;
    const rows = [{ frequencyHz: 0.2, relativeCm: 2, accelerationG: 0.8 },
      { frequencyHz: 1.1, relativeCm: 4, accelerationG: 0.5 }, { frequencyHz: 3, relativeCm: 1, accelerationG: 0.2 }];
    const motion = summary(rows, 'relative'), acceleration = summary(rows, 'acceleration');
    expect(motion.bestIndex).toBe(1);
    expect(acceleration.bestIndex).toBe(0);
    expect(motion.unit).toBe('cm');
    expect(acceleration.unit).toBe('g');
    expect(motion.x(0.2)).toBe(0);
    expect(motion.x(3)).toBe(600);
    expect(motion.x(1.1)).toBeCloseTo(600 * 0.9 / 2.8);
    expect(motion.y(0)).toBe(172);
    expect(motion.y(4)).toBeGreaterThan(8);
    for (const input of [[], rows.map(row => ({ ...row, relativeCm: 0, accelerationG: 0 }))]) {
      for (const measure of ['relative', 'acceleration', 'constructor']) {
        const chart = summary(input, measure);
        expect(chart.maximum).toBe(0);
        expect(chart.bestIndex).toBe(0);
        expect(chart.scale).toBeGreaterThan(0);
        expect(chart.points).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('compares both histories on one scale with correct displacement, acceleration, and energy units', () => {
    const reference = response({ intensityG: 0.1 }), current = response({ intensityG: 0.2 });
    for (const [measure, factor, unit, field] of [
      ['relative', 2, 'cm', 'relativeM'], ['acceleration', 2, 'g', 'absoluteAccelerationMps2'], ['stored', 4, 'J/kg', 'storedJPerKg']
    ]) {
      const chart = sandbox.window.seismicModel.bridgeSeismicComparison(reference, current, measure);
      const reversed = sandbox.window.seismicModel.bridgeSeismicComparison(current, reference, measure);
      expect(chart.limit).toBe(reversed.limit);
      expect(chart.reference).toBe(reversed.current);
      expect(chart.current).toBe(reversed.reference);
      expect(chart.metric.unit).toBe(unit);
      const index = 480, origin = chart.metric.positive ? 172 : 90;
      const a = chart.reference.split(' ')[index].split(',').map(Number);
      const b = chart.current.split(' ')[index].split(',').map(Number);
      expect(a[0]).toBe(b[0]);
      expect(b[1] - origin).toBeCloseTo((a[1] - origin) * factor, 1);
      expect(b[1]).toBeCloseTo(chart.y(current.samples[index][field] * (unit === 'g' ? 1 / 9.80665 : unit === 'cm' ? 100 : 1)), 2);
      expect(chart.current.split(' ').at(-1).split(',')[0]).toBe('600.00');
    }
  });

  it('keeps zero-input comparisons finite and uses a supported measure for malformed chart settings', () => {
    const zero = response({ intensityG: 0 });
    for (const measure of ['relative', 'acceleration', 'stored', '__proto__', 'constructor', null]) {
      const chart = sandbox.window.seismicModel.bridgeSeismicComparison(zero, zero, measure);
      expect(chart.limit).toBeGreaterThan(0);
      expect(chart.reference).toBe(chart.current);
      expect(chart.current).not.toMatch(/NaN|Infinity/);
    }
  });

  it('draws energy bands with thickness proportional to each contribution and a matching work boundary', () => {
    const result = response();
    const chart = sandbox.window.seismicModel.bridgeSeismicTimeline(result, 'energy');
    const points = value => value.split(' ').map(pair => pair.split(',').map(Number));
    const kinetic = points(chart.kinetic), elastic = points(chart.elastic), dissipated = points(chart.dissipated), input = points(chart.input);
    const count = result.samples.length;
    for (const index of [0, 321, 600, 960, count - 1]) {
      const point = result.samples[index], bottom = count * 2 - 1 - index;
      expect(kinetic[index][0]).toBeCloseTo(point.timeS / 24 * 600, 2);
      expect(kinetic[bottom][1] - kinetic[index][1]).toBeCloseTo(point.kineticJPerKg / chart.limit * 164, 1);
      expect(elastic[bottom][1] - elastic[index][1]).toBeCloseTo(point.strainJPerKg / chart.limit * 164, 1);
      expect(dissipated[bottom][1] - dissipated[index][1]).toBeCloseTo(point.dissipatedJPerKg / chart.limit * 164, 1);
      expect(input[index][1]).toBeCloseTo(dissipated[index][1], 1);
    }
    expect(input.at(-1)[0]).toBe(600);
    expect([...kinetic, ...elastic, ...dissipated, ...input].every(([x, y]) => x >= 0 && x <= 600 && y >= 0 && y <= 180)).toBe(true);
  });

  it('keeps both timeline scales finite at zero input and plots ground and deck on the same motion scale', () => {
    const zero = response({ intensityG: 0 });
    for (const kind of ['motion', 'energy']) {
      const chart = sandbox.window.seismicModel.bridgeSeismicTimeline(zero, kind);
      expect(chart.limit).toBeGreaterThan(0);
      expect(JSON.stringify(chart)).not.toMatch(/NaN|Infinity/);
    }
    const result = response({ archetype: 'flexible', groundFrequencyHz: 0.65 });
    const chart = sandbox.window.seismicModel.bridgeSeismicTimeline(result, 'motion');
    const index = 400, point = result.samples[index];
    const ground = chart.ground.split(' ')[index].split(',').map(Number);
    const deck = chart.deck.split(' ')[index].split(',').map(Number);
    expect(ground[0]).toBe(deck[0]);
    expect(deck[1] - ground[1]).toBeCloseTo(-point.relativeM * 100 / chart.limit * 82, 1);
  });

  it('locates inspectable peak frames and keeps force directions consistent with the motion equation', () => {
    const result = response();
    const peak = sample(result, result.milestones.peakMotionS);
    expect(Math.abs(peak.relativeM)).toBeGreaterThan(result.peaks.relativeM * 0.999);
    const acceleration = sample(result, result.milestones.peakAccelerationS);
    expect(Math.abs(acceleration.absoluteAccelerationMps2)).toBeGreaterThan(result.peaks.absoluteAccelerationMps2 * 0.999);
    expect(result.milestones.freeVibrationS).toBe(16);
    for (const time of [0, 3.4, 7.2, 12, 16, 20]) {
      const point = sample(result, time);
      const forces = sandbox.window.seismicModel.bridgeSeismicForces(result, point);
      expect(forces.springNPerKg + forces.dampingNPerKg).toBeCloseTo(point.absoluteAccelerationMps2, 10);
      expect(forces.springNPerKg * point.relativeM).toBeLessThanOrEqual(0);
      expect(forces.dampingNPerKg * point.velocityMps).toBeLessThanOrEqual(0);
    }
    const zero = response({ intensityG: 0 });
    expect(zero.milestones).toEqual({ peakMotionS: 0, peakAccelerationS: 0, freeVibrationS: 16 });
    const undamped = response({ dampingRatio: 0 });
    expect(Math.abs(sandbox.window.seismicModel.bridgeSeismicForces(undamped, sample(undamped, 7)).dampingNPerKg)).toBe(0);
  });

  it('accepts only complete supported saved inputs without replacing corrupt values with defaults', () => {
    const valid = { version: 'bridge-seismic-v1', inputs: response().settings, timeS: 7.2 };
    const records = [valid, { ...valid, version: 'future' }, { ...valid, inputs: {} },
      { ...valid, timeS: Infinity }, { ...valid, inputs: { ...valid.inputs, intensityG: -1 } }, null];
    expect(sandbox.window.seismicModel.bridgeSeismicTrials(records)).toEqual([valid]);
    expect(records).toHaveLength(6);
    expect(sandbox.window.seismicModel.bridgeSeismicTrials(Array(8).fill(valid))).toHaveLength(4);
    expect(sandbox.window.seismicModel.bridgeSeismicTrials('damaged')).toEqual([]);
  });

  it('starts at rest, uses a finite coherent ground packet, and continues through free decay', () => {
    const result = response();
    expect(result.settings).toEqual({ archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 });
    expect(result).toMatchObject({ durationS: 24, shakingDurationS: 16, sampleStepS: 1 / 60, integrationStepS: 1 / 240 });
    expect(result.samples).toHaveLength(1441);
    expect(result.samples[0]).toMatchObject({ timeS: 0, relativeM: 0, velocityMps: 0, groundM: 0,
      groundAccelerationMps2: 0, inputJPerKg: 0, dissipatedJPerKg: 0 });
    for (const point of result.samples.filter(point => point.timeS >= 16)) {
      expect(point.groundM).toBe(0);
      expect(point.groundVelocityMps).toBe(0);
      expect(point.groundAccelerationMps2).toBe(0);
    }
    expect(result.peaks.groundAccelerationMps2).toBeCloseTo(0.12 * 9.80665, 10);
    expect(Math.abs(sample(result, 16).relativeM)).toBeGreaterThan(0);
    expect(result.energyConvention).toContain('Relative modal energy');
    expect(result.model).toContain('synthetic');
  });

  it('preserves exact zero motion and zero energy at zero intensity', () => {
    const result = response({ intensityG: 0 });
    for (const point of result.samples) {
      for (const [key, value] of Object.entries(point)) if (key !== 'timeS') expect(value, key).toBe(0);
    }
    expect(Object.values(result.peaks).every(value => value === 0)).toBe(true);
    expect(result.energyBalanceError).toBe(0);
  });

  it('scales displacement and acceleration linearly and energies quadratically with intensity', () => {
    const single = response({ groundFrequencyHz: 0.75, intensityG: 0.1, dampingRatio: 0.08 });
    const double = response({ groundFrequencyHz: 0.75, intensityG: 0.2, dampingRatio: 0.08 });
    for (let index = 0; index < single.samples.length; index += 17) {
      for (const key of ['groundM', 'relativeM', 'velocityMps', 'absoluteM', 'absoluteAccelerationMps2']) {
        expect(double.samples[index][key], key).toBeCloseTo(2 * single.samples[index][key], 10);
      }
      for (const key of ['kineticJPerKg', 'strainJPerKg', 'storedJPerKg', 'dissipatedJPerKg', 'inputJPerKg']) {
        expect(double.samples[index][key], key).toBeCloseTo(4 * single.samples[index][key], 10);
      }
    }
  });

  it.each([0, 0.05, 0.4])('balances independently integrated work and energy with damping ratio %s', dampingRatio => {
    const result = response({ archetype: 'stiff', groundFrequencyHz: 1.8, intensityG: 0.3, dampingRatio });
    let priorDissipation = 0;
    for (const point of result.samples) {
      expect(point.kineticJPerKg).toBeGreaterThanOrEqual(0);
      expect(point.strainJPerKg).toBeGreaterThanOrEqual(0);
      expect(point.dissipatedJPerKg).toBeGreaterThanOrEqual(priorDissipation);
      expect(Math.abs(point.inputJPerKg - point.kineticJPerKg - point.strainJPerKg - point.dissipatedJPerKg))
        .toBeLessThan(2e-6 * Math.max(1, result.peaks.inputJPerKg));
      priorDissipation = point.dissipatedJPerKg;
    }
    if (dampingRatio === 0) {
      expect(result.peaks.dissipatedJPerKg).toBe(0);
      const stopped = sample(result, 16), final = sample(result, 24);
      expect(final.storedJPerKg / stopped.storedJPerKg).toBeCloseTo(1, 5);
    }
  });

  it('matches the analytical damped free-vibration solution after the shaking stops', () => {
    const result = response({ dampingRatio: 0.07, groundFrequencyHz: 1.1 });
    const initial = sample(result, 16);
    const omega = 2 * Math.PI * result.naturalFrequencyHz;
    const zeta = result.settings.dampingRatio;
    const omegaD = omega * Math.sqrt(1 - zeta ** 2);
    for (const elapsed of [0.5, 1, 2.5, 4, 8]) {
      const expected = Math.exp(-zeta * omega * elapsed) * (initial.relativeM * Math.cos(omegaD * elapsed)
        + (initial.velocityMps + zeta * omega * initial.relativeM) / omegaD * Math.sin(omegaD * elapsed));
      expect(sample(result, 16 + elapsed).relativeM).toBeCloseTo(expected, 7);
    }
  });

  it('shows stronger response near the assumed mode frequency for equal peak ground acceleration', () => {
    const low = response({ groundFrequencyHz: 0.45, dampingRatio: 0.03 });
    const matched = response({ groundFrequencyHz: 1.1, dampingRatio: 0.03 });
    const high = response({ groundFrequencyHz: 2.4, dampingRatio: 0.03 });
    expect(matched.frequencyRatio).toBe(1);
    expect(matched.peaks.relativeM).toBeGreaterThan(3 * low.peaks.relativeM);
    expect(matched.peaks.relativeM).toBeGreaterThan(3 * high.peaks.relativeM);
    expect(matched.peaks.groundAccelerationMps2).toBeCloseTo(low.peaks.groundAccelerationMps2, 10);
    expect(matched.peaks.groundAccelerationMps2).toBeCloseTo(high.peaks.groundAccelerationMps2, 10);
  });

  it('reduces resonant motion and remaining stored energy when damping is increased', () => {
    const low = response({ groundFrequencyHz: 1.1, dampingRatio: 0.02 });
    const high = response({ groundFrequencyHz: 1.1, dampingRatio: 0.25 });
    expect(high.peaks.relativeM).toBeLessThan(low.peaks.relativeM / 2);
    expect(sample(high, 24).storedJPerKg).toBeLessThan(sample(low, 24).storedJPerKg / 100);
    expect(sample(high, 24).dissipatedJPerKg / sample(high, 24).inputJPerKg).toBeGreaterThan(0.999);
  });

  it('uses consistent reference frames and differentiates the displayed ground displacement correctly', () => {
    const result = response({ groundFrequencyHz: 1.1 });
    const omega = 2 * Math.PI * result.naturalFrequencyHz;
    for (let index = 1; index < 960; index += 11) {
      const before = result.samples[index - 1], point = result.samples[index], after = result.samples[index + 1];
      const accelerationFromDisplacement = (after.groundM - 2 * point.groundM + before.groundM) / result.sampleStepS ** 2;
      expect(Math.abs(accelerationFromDisplacement - point.groundAccelerationMps2)).toBeLessThan(0.002 * result.peaks.groundAccelerationMps2);
      expect(point.absoluteM).toBeCloseTo(point.groundM + point.relativeM, 12);
      expect(point.absoluteVelocityMps).toBeCloseTo(point.groundVelocityMps + point.velocityMps, 12);
      expect(point.relativeAccelerationMps2 + point.groundAccelerationMps2).toBeCloseTo(point.absoluteAccelerationMps2, 12);
      expect(point.relativeAccelerationMps2 + 2 * result.settings.dampingRatio * omega * point.velocityMps
        + omega ** 2 * point.relativeM + point.groundAccelerationMps2).toBeCloseTo(0, 10);
    }
    expect(result.samples.some(point => point.inputPowerWPerKg < 0)).toBe(true);
  });

  it('normalizes corrupt inputs without mutation and remains finite at every control boundary', () => {
    const input = { archetype: 'suspension', groundFrequencyHz: Infinity, intensityG: -10, dampingRatio: '0.2' };
    const result = response(input);
    expect(result.settings).toEqual({ archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0, dampingRatio: 0.2 });
    expect(input.groundFrequencyHz).toBe(Infinity);
    for (const archetype of archetypes) {
      for (const frequency of [0.2, 3]) {
        const bounded = response({ archetype: archetype.id, groundFrequencyHz: frequency, intensityG: 2, dampingRatio: 2 });
        expect(bounded.settings).toMatchObject({ intensityG: 0.5, dampingRatio: 0.4 });
        expect(bounded.naturalFrequencyHz).toBe(archetype.naturalFrequencyHz);
        expect(bounded.samples.every(point => Object.values(point).every(Number.isFinite))).toBe(true);
        expect(JSON.parse(JSON.stringify(bounded)).samples).toHaveLength(1441);
      }
    }
  });

  it('interpolates shared scene/readout samples and clamps invalid or out-of-range times', () => {
    const result = response();
    const first = result.samples[123], second = result.samples[124];
    const interpolated = sample(result, (first.timeS + second.timeS) / 2);
    for (const key of Object.keys(first)) expect(interpolated[key], key).toBeCloseTo((first[key] + second[key]) / 2, 12);
    expect(sample(result, -20)).toEqual(result.samples[0]);
    expect(sample(result, NaN)).toEqual(result.samples[0]);
    expect(sample(result, Infinity)).toEqual(result.samples[0]);
    expect(sample(result, 999)).toEqual(result.samples.at(-1));
    expect(sample(result, '8').timeS).toBe(8);
    expect(sample(null, 4)).toBeNull();
    expect(sample({ samples: [] }, 4)).toBeNull();
    expect(sample(result, 0)).not.toBe(result.samples[0]);
  });
});
