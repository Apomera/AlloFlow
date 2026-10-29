import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  var ISS_OPS_INPUTS =');
const helperEnd = source.indexOf('  // User-started clocks', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station trajectory helpers not found');
const { trajectory, point, setup, target, power, inspectAir, inspectThermal, inspectAttitude } = new Function(
  source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) +
  '\nreturn {trajectory:issOpsTrajectory,point:issOpsTrajectoryPoint,setup:issOpsSetup,target:issOpsMeasurementTarget,power:issPowerState,inspectAir:issAirInspect,inspectThermal:issThermalInspect,inspectAttitude:issAttitudeInspect};'
)();
const measurementKeys = ['batteryMin', 'batteryEnd', 'co2Peak', 'cabinMin', 'cabinMax', 'cmgPeak', 'recovery', 'waterResupply', 'pointingEnd', 'propellantUsed'];
const burnSetup = minute => ({ opsCmg: 100, opsAttitudeTorque: 0, opsAttitudeDump: true, opsAttitudeBurnMinute: minute, opsAttitudeThrust: 5, opsAttitudeFuel: 1.5 });
function expected(model, minute) {
  const p = power(model.power, minute), a = inspectAir(model.air, minute), t = inspectThermal(model.thermal, minute), c = inspectAttitude(model.attitude, minute);
  return { minute, lit: p.lit, battery: p.percent, co2: Math.max(a.cabinPpm, a.localPpm), temp: t.cabin, cmg: c.percent, pointing: c.angleDeg, propellant: c.fuelUsed };
}

describe('space station read-only orbit trajectories', () => {
  it('normalizes the complete setup consistently without retaining unrelated state', () => {
    const raw = { opsCrew: '11', opsArrayAngle: 120, opsBattery: -1, opsAirFlow: '3', opsAirRestore: true,
      opsAirRestoreMinute: 57.12345, opsCabinStart: 30, opsAttitudeDump: 'true', opsPrediction: 'Do not modify', opsOrbitMinute: 70 };
    const canonical = setup(raw), result = trajectory(raw);
    expect(result.setup).toEqual(canonical);
    expect(result.setup).not.toBe(raw);
    expect(Object.keys(result)).toEqual(['setup', 'power', 'air', 'thermal', 'attitude', 'points']);
    expect(result.points).toEqual(trajectory(canonical).points);
    for (const invalid of [undefined, null, [], 'setup', { opsCrew: NaN, opsBattery: Infinity }]) expect(trajectory(invalid).points).toEqual(trajectory({}).points);
  });

  it.each([0, 40, 70, 92, 36.1256789, 57.12345, 57.123451])(
    'evaluates all six physical readings directly at minute %s', minute => {
      const model = trajectory({ opsEclipse: 35.12345, opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.12345,
        opsCmg: 78, opsAttitudeTorque: 2.4, opsAttitudeDump: true, opsAttitudeBurnMinute: 50.12345 });
      expect(point(model, minute)).toEqual(expected(model, minute));
      expect(Object.keys(point(model, minute))).toEqual(['minute', 'lit', 'battery', 'co2', 'temp', 'cmg', 'pointing', 'propellant']);
    }
  );

  it('retains a bounded ordered plot including every integer minute and exact fractional events', () => {
    const model = trajectory({ opsEclipse: 35.12345, opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.12345,
      opsCmg: 78, opsAttitudeTorque: 2.4, opsAttitudeDump: true, opsAttitudeBurnMinute: 50.12345 });
    const times = model.points.map(row => row.minute), p = power(model.power, 92);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(new Set(times).size).toBe(times.length);
    expect(times[0]).toBe(0);
    expect(times.at(-1)).toBe(92);
    expect(times.length).toBeLessThan(125);
    for (let minute = 0; minute <= 92; minute++) expect(times).toContain(minute);
    for (const minute of [p.sunlightMinutes, p.fullMinute, p.emptyMinute, model.air.restoreMinute, model.air.peakMinute,
      target(model.setup, 'cabinMin').minute, target(model.setup, 'cabinMax').minute,
      model.attitude.firstCaution / 60, model.attitude.firstCapacity / 60, model.attitude.burnStart / 60, model.attitude.burnEnd / 60].filter(value => value !== null)) {
      expect(times).toContain(minute);
    }
    for (const sample of model.points) expect(sample).toEqual(expected(model, sample.minute));
  });

  it('does not merge a real phase boundary with a nearly identical integer sample', () => {
    const model = trajectory({ opsEclipse: 35.0000000001, opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.0000000001 });
    const eclipse = power(model.power, 92).sunlightMinutes, times = model.points.map(row => row.minute);
    expect(times).toContain(57);
    expect(times).toContain(eclipse);
    expect(times).toContain(57.0000000001);
    expect(eclipse).not.toBe(57);
    expect(point(model, eclipse - 1e-8).lit).toBe(true);
    expect(point(model, eclipse).lit).toBe(false);
  });

  it('keeps each trajectory’s own lighting phase when eclipse durations differ', () => {
    const shorter = trajectory({ opsEclipse: 35 }), longer = trajectory({ opsEclipse: 45 });
    expect(point(shorter, 50).lit).toBe(true);
    expect(point(longer, 50).lit).toBe(false);
    expect(point(shorter, 50).battery).not.toBe(point(longer, 50).battery);
    expect(point(shorter, 57).lit).toBe(false);
    expect(point(longer, 47).lit).toBe(false);
  });

  it('reveals different mid-orbit behavior despite identical saved summary measurements', () => {
    const early = trajectory(burnSetup(10)), late = trajectory(burnSetup(70));
    const earlySummary = measurementKeys.map(key => target(early.setup, key).value);
    const lateSummary = measurementKeys.map(key => target(late.setup, key).value);
    expect(earlySummary).toEqual(lateSummary);
    expect(point(early, 40).cmg).toBe(8);
    expect(point(late, 40).cmg).toBe(100);
    expect(point(early, 40).propellant).toBeGreaterThan(point(late, 40).propellant);
    expect(point(early, 92)).toEqual(point(late, 92));
    expect(point(early, 92).propellant).toBe(1.012763602434897);
  });

  it('uses the physical model between plotted points rather than linear interpolation', () => {
    const model = trajectory({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.12345 });
    const before = point(model, 0), after = point(model, 1), midpoint = point(model, .5);
    expect(midpoint).toEqual(expected(model, .5));
    expect(midpoint.temp).not.toBeCloseTo((before.temp + after.temp) / 2, 10);
    const burn = trajectory(burnSetup(10)), cutoff = burn.attitude.burnEnd / 60;
    expect(point(burn, cutoff).propellant).toBe(point(burn, 92).propellant);
    expect(point(burn, cutoff - .0001).propellant).toBeLessThan(point(burn, cutoff).propellant);
  });

  it('keeps self-comparison symmetric and returns detached sampled and inspected readings', () => {
    const a = trajectory(burnSetup(10)), b = trajectory(burnSetup(10));
    expect(a.points).toEqual(b.points);
    expect(a).not.toBe(b);
    expect(a.points).not.toBe(b.points);
    expect(a.setup).not.toBe(b.setup);
    for (const minute of [0, 10, 13.641666666666667, 40.12345, 92]) expect(point(a, minute)).toEqual(point(b, minute));
    const original = point(a, 0);
    a.points[0].battery = -1;
    a.points[0].co2 = -1;
    a.points.push({ minute: 1000 });
    const inspected = point(a, 0);
    inspected.temp = -1000;
    expect(point(a, 0)).toEqual(original);
    expect(b.points[0]).toEqual(original);
    expect(trajectory(burnSetup(10)).points).toEqual(b.points);
  });

  it('leaves inputs, working clocks, saved evidence and existing model caches unchanged', () => {
    const savedSetup = Object.freeze(setup(burnSetup(70)));
    const savedResults = Object.freeze({ cmgPeak: 100, pointingEnd: 0, propellantUsed: 1.012763602434897 });
    const input = Object.freeze({ ...savedSetup, opsOrbitMinute: 42, opsWaterDay: 8, opsPressureMinute: 2,
      opsPrediction: 'Unfinished draft', opsTrials: Object.freeze([{ setup: savedSetup, results: savedResults }]) });
    const serialized = JSON.stringify(input), baseline = trajectory(input);
    const modelData = JSON.stringify({ power: baseline.power, air: baseline.air, thermal: baseline.thermal, attitude: baseline.attitude });
    for (const minute of [0, 15.4321, 40, 70, 92]) point(baseline, minute);
    const again = trajectory(input);
    expect(JSON.stringify(input)).toBe(serialized);
    expect(JSON.stringify({ power: again.power, air: again.air, thermal: again.thermal, attitude: again.attitude })).toBe(modelData);
    expect(again.points).toEqual(baseline.points);
  });

  it('clamps finite cursor values and defaults malformed cursor values without NaN readings', () => {
    const model = trajectory({ opsBattery: 0, opsArrayAngle: 0, opsCmg: 100, opsAttitudeTorque: 4 });
    expect(point(model, -100)).toEqual(point(model, 0));
    expect(point(model, 200)).toEqual(point(model, 92));
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, '', '40', [], {}, true]) expect(point(model, invalid)).toEqual(point(model, 0));
    for (const sample of [...model.points, point(model, 12.3456789)]) {
      expect(sample.minute).toBeGreaterThanOrEqual(0);
      expect(sample.minute).toBeLessThanOrEqual(92);
      for (const key of ['battery', 'co2', 'temp', 'cmg', 'pointing', 'propellant']) expect(Number.isFinite(sample[key])).toBe(true);
    }
  });
});
