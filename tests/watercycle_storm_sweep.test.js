import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let K;

beforeAll(() => {
  const element = () => ({ style: {}, appendChild() {}, setAttribute() {} });
  const window = {};
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_watercycle.js', 'utf8'), {
    window,
    document: { head: element(), body: element(), createElement: element, getElementById: () => null },
    console, Math, Date, Object, Array, Number, String, Boolean, JSON, isFinite,
    setTimeout, clearTimeout, setInterval, clearInterval,
  });
  K = window.WaterCyclePrecipitationKernel;
});

describe('Storm Lab controlled variable sweeps', () => {
  it('samples every supported physical range using the shipped precipitation model', () => {
    for (const input of K.sweepInputs) {
      const sweep = K.sweep(K.presets.gentleRain, input.key);
      expect(sweep.count).toBe(11);
      expect(sweep.input).toEqual(input);
      expect(sweep.samples[0].value).toBe(input.min);
      expect(sweep.samples.at(-1).value).toBe(input.max);
      expect(sweep.samples.map(sample => sample.value)).toEqual(
        [...sweep.samples.map(sample => sample.value)].sort((a, b) => a - b),
      );
      for (const sample of sweep.samples) {
        const expected = K.compute(sample.config);
        expect(sample.model).toEqual(expected);
        expect(sample).toMatchObject({
          visualType: expected.visualType,
          displayLabel: expected.displayLabel,
          reachesGround: expected.reachesGround,
          intensity: expected.relativeIntensity,
          intensityLabel: expected.intensityLabel,
        });
      }
    }
  });

  it('fixes every other physical input including the normalized middle layer and storm time', () => {
    const source = { tempC: -10, surfaceTempC: 10, stormTime: 16, windDirection: 'west',
      terrain: 'mountains', stormDistanceKm: 8, stormAutoPlay: true };
    const sweep = K.sweep(source, 'surfaceTempC');
    expect(sweep.baseline.midLevelTempC).toBe(1);
    for (const sample of sweep.samples) {
      for (const key of Object.keys(sweep.baseline)) {
        if (key !== 'surfaceTempC') expect(sample.config[key]).toBe(sweep.baseline[key]);
      }
      expect(sample.model.config.stormAutoPlay).toBe(false);
      expect(sample.model.lifecycle.time).toBe(16);
    }
    expect(source).not.toHaveProperty('midLevelTempC');
    expect(source.stormAutoPlay).toBe(true);
  });

  it('finds sampled phase changes even when the intensity index stays unchanged', () => {
    const sweep = K.sweep({ ...K.presets.mountainSnow, stormTime: 52 }, 'surfaceTempC', {
      count: 21, start: -2, end: 8,
    });
    expect(sweep.summary.outcomeKinds).toEqual(['snow', 'mix', 'rain']);
    expect(sweep.summary.minimumIntensity).toBe(sweep.summary.maximumIntensity);
    expect(sweep.transitions).toHaveLength(2);
    for (const transition of sweep.transitions) {
      expect(transition.changed).toEqual(['type']);
      expect(transition.intensityDelta).toBe(0);
      expect(transition.toIndex).toBe(transition.fromIndex + 1);
      const previous = sweep.samples[transition.fromIndex];
      const next = sweep.samples[transition.toIndex];
      expect(transition.fromValue).toBe(previous.value);
      expect(transition.toValue).toBe(next.value);
      expect(previous.visualType).not.toBe(next.visualType);
    }
    expect(sweep.limitation).toContain('not exact real-world thresholds');
    expect(sweep.limitation).toContain('not a rainfall rate');
  });

  it('records ground arrival and intensity differences without inventing a separate model', () => {
    const sweep = K.sweep({ ...K.presets.virga, stormTime: 52 }, 'lowLevelHumidity');
    expect(sweep.samples[0].visualType).toBe('virga');
    expect(sweep.samples.at(-1).reachesGround).toBe(true);
    expect(sweep.transitions.some(transition => transition.changed.includes('arrival'))).toBe(true);
    expect(sweep.transitions.some(transition => transition.changed.includes('intensity'))).toBe(true);
    for (const transition of sweep.transitions) {
      const previous = sweep.samples[transition.fromIndex];
      const next = sweep.samples[transition.toIndex];
      expect(transition.intensityDelta).toBe(next.intensity - previous.intensity);
      expect(transition.changed.includes('arrival')).toBe(previous.reachesGround !== next.reachesGround);
      expect(transition.changed.includes('intensity')).toBe(previous.intensity !== next.intensity);
    }
    expect(sweep.summary.minimumIntensity).toBe(Math.min(...sweep.samples.map(sample => sample.intensity)));
    expect(sweep.summary.maximumIntensity).toBe(Math.max(...sweep.samples.map(sample => sample.intensity)));
  });

  it('retains unchanged outcomes as evidence rather than requiring a transition', () => {
    const sweep = K.sweep({ ...K.presets.gentleRain, stormTime: 52 }, 'wind');
    expect(sweep.summary.outcomeKinds).toEqual(['rain']);
    expect(sweep.transitions).toEqual([]);
    expect(sweep.samples).toHaveLength(11);
  });

  it.each(['__proto__', 'constructor', 'toString', 'stormTime', 'stormDistanceKm',
    'soundEnabled', 'viewMode', 'terrain', 'notACondition', undefined, null, {}])(
    'rejects unsupported and nonphysical keys (%s)', key => {
      expect(() => K.sweep(K.presets.gentleRain, key)).toThrow(/supported physical/);
    },
  );

  it('bounds, orders, and normalizes sample counts and physical ranges', () => {
    expect(K.sweep({}, 'updraft', { count: 1000000 }).count).toBe(21);
    expect(K.sweep({}, 'updraft', { count: -50 }).count).toBe(2);
    expect(K.sweep({}, 'updraft', { count: '6.9' }).count).toBe(6);
    for (const count of [NaN, Infinity, 'bad', '', null, false, {}, Symbol('invalid')]) {
      expect(K.sweep({}, 'updraft', { count }).count).toBe(11);
    }
    const sweep = K.sweep({}, 'surfaceTempC', { start: 90, end: -100, count: 3 });
    expect(sweep.start).toBe(-15);
    expect(sweep.end).toBe(35);
    expect(sweep.samples.map(sample => sample.value)).toEqual([-15, 10, 35]);
    const defaults = K.sweep({}, 'surfaceTempC', { start: NaN, end: Infinity });
    expect(defaults.start).toBe(-15);
    expect(defaults.end).toBe(35);
  });

  it('handles a bounded constant range without false transitions or arithmetic failures', () => {
    const sweep = K.sweep({}, 'updraft', { start: 200, end: 400, count: 2 });
    expect(sweep.start).toBe(100);
    expect(sweep.end).toBe(100);
    expect(sweep.samples.map(sample => sample.value)).toEqual([100, 100]);
    expect(sweep.transitions).toEqual([]);
  });

  it('produces deterministic, independent, immutable records suitable for evidence export', () => {
    const config = { ...K.presets.summerStorm, stormTime: 42 };
    const sweep = K.sweep(config, 'updraft', { count: 7 });
    const record = JSON.stringify(sweep);
    expect(JSON.stringify(K.sweep(config, 'updraft', { count: 7 }))).toBe(record);
    config.moisture = 0;
    K.sweep(config, 'updraft');
    expect(JSON.stringify(sweep)).toBe(record);
    expect(() => { sweep.samples[0].model.config.moisture = 0; }).toThrow();
    expect(() => { sweep.samples[0].config.updraft = 80; }).toThrow();
    expect(() => { sweep.samples.push({}); }).toThrow();
    expect(() => { sweep.summary.outcomeKinds.push('invented'); }).toThrow();
    expect(Object.isFrozen(sweep)).toBe(true);
    expect(Object.isFrozen(K.sweepInputs)).toBe(true);
    expect(Object.isFrozen(K.sweepInputs[0])).toBe(true);
    expect(JSON.parse(record).baseline.stormTime).toBe(42);
  });
});
