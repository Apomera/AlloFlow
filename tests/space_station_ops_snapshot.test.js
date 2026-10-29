import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  function issOpsSnapshot(');
const helperEnd = source.indexOf('  function issOpsTimeline(', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station telemetry snapshot helpers not found');
const { snapshot, power, air, thermal, attitude, inspectAir, inspectThermal, inspectAttitude, runCounts } = new Function(
  source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) + `
  var runCounts = { air: 0, thermal: 0, attitude: 0 };
  var originalAir = issAirRun, originalThermal = issThermalRun, originalAttitude = issAttitudeRun;
  issAirRun = function (options) { runCounts.air++; return originalAir(options); };
  issThermalRun = function (options) { runCounts.thermal++; return originalThermal(options); };
  issAttitudeRun = function (options) { runCounts.attitude++; return originalAttitude(options); };
  return {snapshot:issOpsSnapshot,power:issPowerState,air:issAirRun,thermal:issThermalRun,attitude:issAttitudeRun,
    inspectAir:issAirInspect,inspectThermal:issThermalInspect,inspectAttitude:issAttitudeInspect,runCounts};`
)();

function scenario(options = {}) {
  const settings = options.power || {};
  return { power: settings, air: air({ power: settings, ...options.air }),
    thermal: thermal({ power: settings, ...options.thermal }), attitude: attitude(options.attitude), recovery: options.recovery ?? 98 };
}
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('space station synchronized telemetry snapshot', () => {
  it.each([0, 70, 92, 36.1256789, 57 - 1e-9, 57, 57 + 1e-9])(
    'matches every existing model at physical minute %s without rerunning them', minute => {
      const settings = scenario({ air: { flow: 3, restore: true, restoreMinute: 70 }, thermal: { cabinStart: 17 },
        attitude: { cmg: 78, torque: 2.4, dump: true, burnMinute: 50 }, recovery: 90 });
      const counts = { ...runCounts }, result = snapshot(settings, minute);
      const a = inspectAir(settings.air, minute), t = inspectThermal(settings.thermal, minute), c = inspectAttitude(settings.attitude, minute);
      expect(result).toEqual({ minute, lit: power(settings.power, minute).lit, power: power(settings.power, minute).percent,
        co2: Math.max(a.cabinPpm, a.localPpm), co2Zone: Math.abs(a.cabinPpm - a.localPpm) <= 1e-9 ? 'both' : a.localPpm > a.cabinPpm ? 'crew' : 'cabin',
        cabinPpm: a.cabinPpm, localPpm: a.localPpm, temp: t.cabin, cmg: c.percent, recovery: 90 });
      expect(runCounts).toEqual(counts);
    }
  );

  it('shows transient CO2 and CMG recovery without replacing the recorded orbit peaks', () => {
    const settings = scenario({ air: { flow: 3, restore: true, restoreMinute: 70 },
      attitude: { cmg: 78, torque: 2.4, dump: true, burnMinute: 50 } });
    const start = snapshot(settings, 0), airPeak = snapshot(settings, 70), end = snapshot(settings, 92);
    const capacity = snapshot(settings, settings.attitude.firstCapacity / 60);
    expect(start.co2).toBe(2600);
    expect(start.cmg).toBe(78);
    expect(airPeak.co2).toBe(settings.air.peakPpm);
    expect(airPeak.co2).toBeGreaterThan(4000);
    expect(end.co2).toBeLessThan(4000);
    expect(capacity.cmg).toBeCloseTo(100, 10);
    expect(end.cmg).toBeLessThan(80);
    expect(settings.air.peakPpm).toBeGreaterThan(4000);
    expect(settings.attitude.peakPercent).toBe(100);
  });

  it('reads the starting and depleted battery instead of the end-of-orbit value', () => {
    const settings = scenario({ power: { generation: 30, load: 100, battery: 15, eclipse: 45 } });
    const emptyMinute = power(settings.power, 92).emptyMinute;
    expect(snapshot(settings, 0).power).toBe(15);
    expect(snapshot(settings, emptyMinute).power).toBeCloseTo(0, 10);
    expect(snapshot(settings, 92).power).toBe(0);
    expect(snapshot(settings, 46.9).lit).toBe(true);
    expect(snapshot(settings, 47).lit).toBe(false);
  });

  it('tracks the highest air zone and identifies ties without averaging the readings', () => {
    const settings = scenario();
    expect(snapshot(settings, 0).co2Zone).toBe('both');
    expect(snapshot(settings, 1).co2Zone).toBe('crew');
    // The stock run begins uniformly mixed. A detached model state also
    // verifies a higher cabin reading, which the generic inspector supports.
    const uneven = JSON.parse(JSON.stringify(settings.air));
    uneven.samples[0].cabin = 3000 * uneven.config.gramsPerPpmM3 * uneven.config.cabinVolume;
    const result = snapshot({ ...settings, air: uneven }, 0);
    expect(result.co2Zone).toBe('cabin');
    expect(result.co2).toBe(result.cabinPpm);
    expect(result.co2).toBeGreaterThan(result.localPpm);
    uneven.samples[0].cabin = (2600 + 5e-10) * uneven.config.gramsPerPpmM3 * uneven.config.cabinVolume;
    const close = snapshot({ ...settings, air: uneven }, 0);
    expect(close.co2Zone).toBe('both');
    expect(close.co2).toBe(Math.max(close.cabinPpm, close.localPpm));
    uneven.samples[0].cabin = (2600 + 2e-9) * uneven.config.gramsPerPpmM3 * uneven.config.cabinVolume;
    expect(snapshot({ ...settings, air: uneven }, 0).co2Zone).toBe('cabin');
  });

  it('clamps finite time and recovery values and defaults invalid values safely', () => {
    const settings = scenario();
    expect(snapshot(settings, -1)).toEqual(snapshot(settings, 0));
    expect(snapshot(settings, 93)).toEqual(snapshot(settings, 92));
    expect(snapshot({ ...settings, recovery: 10 }, 20).recovery).toBe(70);
    expect(snapshot({ ...settings, recovery: 150 }, 20).recovery).toBe(99);
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, '', '45', [], {}, true]) {
      expect(snapshot(settings, invalid)).toEqual(snapshot(settings, 0));
      expect(snapshot({ ...settings, recovery: invalid }, 20).recovery).toBe(98);
    }
  });

  it('uses safe default models for missing and malformed shapes', () => {
    const expected = snapshot(scenario(), 36.125);
    for (const invalid of [undefined, null, [], {}, 'model', 20, { config: {}, samples: [] }, { config: {}, samples: [null] }]) {
      const result = snapshot({ power: {}, air: invalid, thermal: invalid, attitude: invalid }, 36.125);
      expect(result).toEqual(expected);
      expect(Object.values(result).filter(value => typeof value === 'number').every(Number.isFinite)).toBe(true);
    }
    for (const invalid of [undefined, null, [], 'options', 20]) expect(snapshot(invalid, 36.125)).toEqual(expected);
  });

  it('rejects nonfinite sample states and invalid model capacities before inspection', () => {
    const settings = scenario(), expected = snapshot(settings, 36.125);
    const badAir = JSON.parse(JSON.stringify(settings.air));
    badAir.samples[2].local = NaN;
    const badThermal = JSON.parse(JSON.stringify(settings.thermal));
    badThermal.config.cabinCapacity = 0;
    const badAttitude = JSON.parse(JSON.stringify(settings.attitude));
    badAttitude.segments[0].total = Infinity;
    expect(snapshot({ ...settings, air: badAir, thermal: badThermal, attitude: badAttitude }, 36.125)).toEqual(expected);
  });

  it('uses the supplied power setup when constructing fallback air and thermal models', () => {
    const settings = scenario({ power: { generation: 0, battery: 0, load: 100, eclipse: 45 } });
    expect(snapshot({ power: settings.power }, 70)).toEqual(snapshot(settings, 70));
  });

  it('does not mutate input settings or model samples and returns detached snapshots', () => {
    const settings = deepFreeze(scenario({ power: { battery: 20 }, recovery: 97.125 }));
    const before = JSON.stringify(settings), result = snapshot(settings, 13.12456789);
    expect(result.minute).toBe(13.12456789);
    result.power = -1;
    result.temp = 1000;
    expect(snapshot(settings, 13.12456789).power).not.toBe(-1);
    expect(snapshot(settings, 13.12456789).temp).not.toBe(1000);
    expect(JSON.stringify(settings)).toBe(before);
    expect(snapshot(JSON.parse(before), 13.12456789)).toEqual(snapshot(settings, 13.12456789));
  });
});
