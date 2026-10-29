import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  var ISS_OPS_INPUTS =');
const helperEnd = source.indexOf('  // User-started clocks', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station measurement inspection helpers not found');
const { target, setup, timeline, power, air, thermal, attitude, inspectAir, inspectThermal, inspectAttitude, withThermal } = new Function(
  source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) + `
  return {target:issOpsMeasurementTarget,setup:issOpsSetup,timeline:issOpsTimeline,power:issPowerState,air:issAirRun,thermal:issThermalRun,
    attitude:issAttitudeRun,inspectAir:issAirInspect,inspectThermal:issThermalInspect,inspectAttitude:issAttitudeInspect,
    withThermal:function(model,run){var original=issThermalRun;issThermalRun=function(){return model;};try{return run();}finally{issThermalRun=original;}}};`
)();

const keys = ['batteryMin', 'batteryEnd', 'co2Peak', 'cabinMin', 'cabinMax', 'cmgPeak', 'recovery', 'waterResupply', 'pointingEnd', 'propellantUsed'];
function models(value) {
  const s = setup(value);
  const settings = { generation: 160 * Math.sin(s.opsArrayAngle * Math.PI / 180), load: 68 + s.opsCrew * 1.6 + s.opsResearch * .22,
    eclipse: s.opsEclipse, battery: s.opsBattery, capacity: 210 };
  return { power: settings, recovery: s.opsRecovery,
    air: air({ power: settings, crew: s.opsCrew, scrub: s.opsScrub, flow: s.opsAirFlow, activity: s.opsAirActivity,
      startPpm: s.opsAirStart, restore: s.opsAirRestore, restoreMinute: s.opsAirRestoreMinute }),
    thermal: thermal({ power: settings, radiator: s.opsRadiator, cooling: s.opsCooling, cabinStart: s.opsCabinStart, crew: s.opsCrew }),
    attitude: attitude({ cmg: s.opsCmg, torque: s.opsAttitudeTorque, inertia: s.opsAttitudeInertia, dump: s.opsAttitudeDump,
      burnMinute: s.opsAttitudeBurnMinute, thrust: s.opsAttitudeThrust, fuel: s.opsAttitudeFuel }) };
}

describe('space station measurement inspection targets', () => {
  it('routes all ten measurements to their own modeled values and relevant lab', () => {
    const s = setup(), m = models(s), schedule = timeline(m), powerEnd = power(m.power, 92), attitudeEnd = inspectAttitude(m.attitude, 92);
    const cold = m.thermal.samples.find(sample => sample.cabin === m.thermal.minCabin);
    const hot = m.thermal.samples.find(sample => sample.cabin === m.thermal.maxCabin);
    const need = s.opsCrew * 3.8;
    const expected = {
      batteryMin: { mode: 'power', lab: null, minute: schedule.inspections.power.minute, kind: 'minimum', value: powerEnd.minimumPercent },
      batteryEnd: { mode: 'power', lab: null, minute: 92, kind: 'end', value: powerEnd.percent },
      co2Peak: { mode: 'eclss', lab: 'air', minute: m.air.peakMinute, kind: 'peak', value: m.air.peakPpm },
      cabinMin: { mode: 'thermal', lab: null, minute: cold.minute, kind: 'minimum', value: m.thermal.minCabin },
      cabinMax: { mode: 'thermal', lab: null, minute: hot.minute, kind: 'maximum', value: m.thermal.maxCabin },
      cmgPeak: { mode: 'attitude', lab: null, minute: schedule.inspections.attitude.minute, kind: 'peak', value: m.attitude.peakPercent },
      recovery: { mode: 'eclss', lab: 'water', minute: null, kind: 'setup', value: s.opsRecovery },
      waterResupply: { mode: 'eclss', lab: 'water', minute: null, kind: 'setup', value: need - need * s.opsRecovery / 100 },
      pointingEnd: { mode: 'attitude', lab: null, minute: 92, kind: 'end', value: attitudeEnd.angleDeg },
      propellantUsed: { mode: 'attitude', lab: null, minute: 92, kind: 'end', value: attitudeEnd.fuelUsed }
    };
    for (const key of keys) expect(target(s, key)).toEqual({ key, ...expected[key] });
  });

  it('keeps distinct cabin extrema rather than sending both rows to the worst flight-rule reading', () => {
    const defaults = models();
    expect(target({}, 'cabinMin')).toMatchObject({ minute: 0, kind: 'minimum', value: 22 });
    expect(target({}, 'cabinMax').minute).toBeCloseTo(64.83333333333299, 10);
    expect(target({}, 'cabinMax').value).toBe(defaults.thermal.maxCabin);
    const hot = { opsCabinStart: 30 }, m = models(hot);
    expect(target(hot, 'cabinMin')).toMatchObject({ minute: 92, kind: 'minimum', value: m.thermal.minCabin });
    expect(target(hot, 'cabinMax')).toMatchObject({ minute: 0, kind: 'maximum', value: 30 });
    expect(timeline(m).inspections.thermal.kind).toBe('maximum');
  });

  it('preserves fractional thermal extrema and air recovery peaks exactly', () => {
    const thermalSetup = { opsEclipse: 35.12345 }, thermalModel = models(thermalSetup).thermal;
    const thermalPeak = target(thermalSetup, 'cabinMax');
    expect(thermalPeak.minute).toBe(thermalModel.samples.find(sample => sample.cabin === thermalModel.maxCabin).minute);
    expect(thermalPeak.minute).toBeCloseTo(64.70988333333325, 10);
    expect(inspectThermal(thermalModel, thermalPeak.minute).cabin).toBe(thermalPeak.value);
    const airSetup = { opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.12345 }, airModel = models(airSetup).air;
    const airPeak = target(airSetup, 'co2Peak');
    expect(airPeak.minute).toBe(57.12345);
    expect(airPeak.value).toBeGreaterThan(4000);
    const reading = inspectAir(airModel, airPeak.minute);
    expect(Math.max(reading.cabinPpm, reading.localPpm)).toBe(airPeak.value);
    expect(inspectAir(airModel, 92).localPpm).toBeLessThan(airPeak.value);
  });

  it('selects the earliest CMG peak including exact saturation and a pre-unloading maximum', () => {
    const saturated = { opsCmg: 78, opsAttitudeTorque: 2.4, opsAttitudeDump: true, opsAttitudeBurnMinute: 50.12345 };
    const m = models(saturated), result = target(saturated, 'cmgPeak');
    expect(result.minute).toBe(m.attitude.firstCapacity / 60);
    expect(result.minute).toBeCloseTo(29.02777777777778, 10);
    expect(result.value).toBe(100);
    expect(inspectAttitude(m.attitude, 92).percent).toBeLessThan(80);
    const unsaturated = { opsCmg: 50, opsAttitudeTorque: .35, opsAttitudeDump: true, opsAttitudeBurnMinute: 70.12345 };
    expect(target(unsaturated, 'cmgPeak').minute).toBe(70.12345);
    expect(target({ opsCmg: 100, opsAttitudeTorque: 0 }, 'cmgPeak').minute).toBe(0);
    expect(target({ opsCmg: 28, opsAttitudeTorque: 0 }, 'cmgPeak').minute).toBe(0);
  });

  it('inspects the earliest minimum battery rather than a later depletion plateau', () => {
    const initiallyEmpty = { opsBattery: 0 };
    expect(target(initiallyEmpty, 'batteryMin')).toMatchObject({ minute: 0, value: 0 });
    const declining = { opsBattery: 15, opsArrayAngle: 10, opsResearch: 95, opsEclipse: 45 };
    const m = models(declining), end = power(m.power, 92);
    expect(target(declining, 'batteryMin')).toMatchObject({ minute: end.emptyMinute, value: 0 });
    expect(target(declining, 'batteryMin').minute).toBeLessThan(92);
    expect(target(declining, 'batteryEnd')).toMatchObject({ minute: 92, value: 0 });
    expect(target({ opsBattery: 20 }, 'batteryMin').minute).toBe(0);
    expect(target({ opsBattery: 100 }, 'batteryMin').minute).toBe(92);
  });

  it('opens the actual tiny CMG maximum after it crosses the 80 percent rule boundary', () => {
    const settings = { opsCmg: 79.9999999999, opsAttitudeTorque: 1e-11 };
    const model = models(settings).attitude, result = target(settings, 'cmgPeak');
    expect(inspectAttitude(model, 0).percent).toBeLessThan(80);
    expect(result.value).toBeGreaterThan(80);
    expect(result.minute).toBe(92);
    expect(inspectAttitude(model, result.minute).percent).toBe(result.value);
    expect(timeline(models(settings)).inspections.attitude.minute).toBe(result.minute);
  });

  it.each([{ dump: false, expected: 92 }, { dump: true, expected: 70.12345 }])(
    'uses the true unsaturated maximum rather than a near-equal earlier reading: %j', ({ dump, expected }) => {
      const settings = { opsCmg: 50, opsAttitudeTorque: 1e-11, opsAttitudeDump: dump, opsAttitudeBurnMinute: 70.12345 };
      const model = models(settings).attitude, result = target(settings, 'cmgPeak');
      expect(result.value - inspectAttitude(model, 0).percent).toBeGreaterThan(0);
      expect(result.value - inspectAttitude(model, 0).percent).toBeLessThan(1e-8);
      expect(result.minute).toBe(expected);
      expect(inspectAttitude(model, result.minute).percent).toBe(result.value);
    }
  );

  it('selects the exact first saturated instant before a later unloading burn', () => {
    const settings = { opsCmg: 25, opsAttitudeTorque: Math.PI, opsAttitudeDump: true, opsAttitudeBurnMinute: 85 };
    const model = models(settings).attitude, result = target(settings, 'cmgPeak');
    expect(result.value).toBe(100);
    expect(result.minute).toBe(model.firstCapacity / 60);
    expect(result.minute).not.toBe(Math.round(result.minute));
    expect(inspectAttitude(model, result.minute - .0001).percent).toBeLessThan(100);
    expect(inspectAttitude(model, 84).percent).toBe(100);
    expect(inspectAttitude(model, 92).percent).toBeLessThan(100);
  });

  it('resolves equal thermal extrema to the earliest exact time without mutating the model', () => {
    const samples = Object.freeze([
      Object.freeze({ minute: 70, cabin: 27 }), Object.freeze({ minute: 40, cabin: 18 }),
      Object.freeze({ minute: 10.12345, cabin: 27 }), Object.freeze({ minute: 5.6789, cabin: 18 })
    ]);
    const model = Object.freeze({ samples });
    withThermal(model, () => {
      expect(target({}, 'cabinMin')).toMatchObject({ minute: 5.6789, value: 18 });
      expect(target({}, 'cabinMax')).toMatchObject({ minute: 10.12345, value: 27 });
    });
    expect(samples.map(sample => sample.minute)).toEqual([70, 40, 10.12345, 5.6789]);
  });

  it('reports optional end measurements at orbit end and fixed water values without a time', () => {
    const settings = { opsCmg: 85, opsAttitudeTorque: 2.4, opsAttitudeInertia: 40 }, m = models(settings);
    expect(target(settings, 'pointingEnd')).toMatchObject({ minute: 92, value: inspectAttitude(m.attitude, 92).angleDeg });
    const burn = { opsCmg: 100, opsAttitudeTorque: 0, opsAttitudeDump: true, opsAttitudeBurnMinute: 70 };
    expect(target(burn, 'propellantUsed').value).toBeCloseTo(1.012763602434897, 12);
    for (const key of ['recovery', 'waterResupply']) expect(target({}, key)).toMatchObject({ mode: 'eclss', lab: 'water', minute: null, kind: 'setup' });
    const need = 11 * 3.8;
    expect(target({ opsCrew: 11, opsRecovery: 98.5 }, 'waterResupply').value).toBe(need - need * 98.5 / 100);
  });

  it('normalizes defaults, strings and extreme inputs consistently with the existing models', () => {
    const numeric = { opsCrew: 11, opsEclipse: 35.12345, opsAirRestore: true, opsAirFlow: 3, opsAirRestoreMinute: 57.12345 };
    const strings = { opsCrew: '11', opsEclipse: '35.12345', opsAirRestore: true, opsAirFlow: '3', opsAirRestoreMinute: '57.12345' };
    for (const key of keys) {
      expect(target(strings, key)).toEqual(target(numeric, key));
      for (const invalid of [undefined, null, [], 'setup', { opsCrew: NaN, opsBattery: Infinity, opsAirRestore: 'true' }]) expect(target(invalid, key)).toEqual(target({}, key));
      const extreme = { opsCrew: 99, opsBattery: -100, opsResearch: 500, opsArrayAngle: 1000, opsEclipse: -1,
        opsRecovery: 1, opsAirFlow: -10, opsAirStart: Infinity, opsCabinStart: 99, opsAttitudeFuel: 99, opsAttitudeDump: true };
      const result = target(extreme, key);
      expect(result).toEqual(target(setup(extreme), key));
      expect(Number.isFinite(result.value)).toBe(true);
      if (result.minute !== null) { expect(Number.isFinite(result.minute)).toBe(true); expect(result.minute).toBeGreaterThanOrEqual(0); expect(result.minute).toBeLessThanOrEqual(92); }
    }
  });

  it('ignores unknown measurements and does not mutate a saved setup or evidence', () => {
    const saved = Object.freeze({ setup: Object.freeze(setup({ opsBattery: 20, opsCmg: 85, opsAttitudeTorque: 2.4 })), results: Object.freeze({ batteryMin: 20 }) });
    const before = JSON.stringify(saved);
    for (const key of [undefined, null, '', 'unknown', 'opsBattery', '__proto__', {}, 1]) expect(target(saved.setup, key)).toBeNull();
    const result = target(saved.setup, 'pointingEnd');
    result.minute = 0;
    result.value = -1;
    expect(target(saved.setup, 'pointingEnd').minute).toBe(92);
    expect(target(saved.setup, 'pointingEnd').value).not.toBe(-1);
    expect(JSON.stringify(saved)).toBe(before);
    expect(Object.hasOwn(saved.results, 'pointingEnd')).toBe(false);
  });
});
