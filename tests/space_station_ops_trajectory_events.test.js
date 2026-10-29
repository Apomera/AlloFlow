import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  var ISS_OPS_INPUTS =');
const helperEnd = source.indexOf('  // User-started clocks', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station trajectory event helpers not found');
const { events, trajectory, point, power, withNoModelRuns } = new Function(
  source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) + `
  return {events:issOpsTrajectoryEvents,trajectory:issOpsTrajectory,point:issOpsTrajectoryPoint,power:issPowerState,
    withNoModelRuns:function(run){
      var air=issAirRun,thermal=issThermalRun,attitude=issAttitudeRun;
      function forbidden(){throw new Error('Event discovery rebuilt a supplied model');}
      issAirRun=forbidden;issThermalRun=forbidden;issAttitudeRun=forbidden;
      try{return run();}finally{issAirRun=air;issThermalRun=thermal;issAttitudeRun=attitude;}
    }};`
)();
const event = (rows, id) => rows.find(row => row.id === id);
const burnSetup = minute => ({ opsCmg: 100, opsAttitudeTorque: 0, opsAttitudeDump: true, opsAttitudeBurnMinute: minute, opsAttitudeThrust: 5, opsAttitudeFuel: 1.5 });

describe('space station paired trajectory event discovery', () => {
  it.each(['battery', 'co2', 'temp', 'cmg', 'pointing', 'propellant'])(
    'routes only events relevant to %s and keeps common orbit checkpoints', metric => {
      const model = trajectory({ opsBattery: 0, opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 70,
        opsCabinStart: 30, opsCmg: 78, opsAttitudeTorque: 2.4, opsAttitudeDump: true, opsAttitudeBurnMinute: 50 });
      const rows = withNoModelRuns(() => events(model, metric));
      expect(event(rows, 'start')).toEqual({ id: 'start', minute: 0, kind: 'checkpoint' });
      expect(event(rows, 'eclipse')).toEqual({ id: 'eclipse', minute: 57, kind: 'checkpoint' });
      expect(event(rows, 'end')).toEqual({ id: 'end', minute: 92, kind: 'checkpoint' });
      const relevant = {
        battery: ['battery-reserve', 'battery-full', 'battery-empty', 'battery-min'],
        co2: ['air-limit', 'air-restore', 'co2-peak'], temp: ['thermal-limit', 'cabin-min', 'cabin-max'],
        cmg: ['attitude-caution', 'attitude-capacity', 'burn-start', 'burn-end', 'cmg-peak'],
        pointing: ['attitude-capacity', 'burn-start', 'burn-end'], propellant: ['attitude-capacity', 'burn-start', 'burn-end']
      };
      expect(rows.every(row => ['start', 'eclipse', 'end', ...relevant[metric]].includes(row.id))).toBe(true);
      expect(rows.map(row => row.minute)).toEqual(rows.map(row => row.minute).sort((a, b) => a - b));
      expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
      expect(rows.every(row => Object.keys(row).join(',') === 'id,minute,kind')).toBe(true);
      if (metric === 'battery') expect(event(rows, 'battery-min')).toMatchObject({ minute: 0, kind: 'minimum' });
      if (metric === 'co2') expect(event(rows, 'co2-peak')).toMatchObject({ minute: model.air.peakMinute, kind: 'peak' });
      if (metric === 'temp') {
        expect(event(rows, 'cabin-min')).toMatchObject({ kind: 'minimum' });
        expect(event(rows, 'cabin-max')).toMatchObject({ minute: 0, kind: 'maximum' });
      }
      if (metric === 'cmg') expect(event(rows, 'cmg-peak')).toMatchObject({ minute: model.attitude.firstCapacity / 60, kind: 'peak' });
      if (metric === 'pointing' || metric === 'propellant') expect(event(rows, 'attitude-caution')).toBeUndefined();
    }
  );

  it('preserves exact distinct burn endpoints for two otherwise equal-summary trajectories', () => {
    const early = trajectory(burnSetup(10)), late = trajectory(burnSetup(70));
    const a = events(early, 'cmg'), b = events(late, 'cmg');
    expect(event(a, 'burn-start').minute).toBe(10);
    expect(event(b, 'burn-start').minute).toBe(70);
    expect(event(a, 'burn-end').minute).toBe(13.641666666666667);
    expect(event(b, 'burn-end').minute).toBe(73.64166666666667);
    expect(point(early, event(a, 'burn-end').minute).cmg).toBe(8);
    expect(point(late, event(a, 'burn-end').minute).cmg).toBe(100);
    expect(point(early, 92)).toEqual(point(late, 92));
  });

  it('keeps a fractional restoration and coincident air peak as separate identities', () => {
    const model = trajectory({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.12345 });
    const rows = events(model, 'co2');
    expect(event(rows, 'air-restore')).toEqual({ id: 'air-restore', minute: 57.12345, kind: 'intervention' });
    expect(event(rows, 'co2-peak')).toEqual({ id: 'co2-peak', minute: 57.12345, kind: 'peak' });
    expect(rows.filter(row => row.minute === 57.12345).map(row => row.id)).toEqual(['air-restore', 'co2-peak']);
    expect(point(model, 57.12345).co2).toBe(model.air.peakPpm);
  });

  it('retains an inclusive battery boundary at exactly 25 percent without calling it a failure', () => {
    const model = trajectory({ opsBattery: 25, opsArrayAngle: 0 });
    const rows = events(model, 'battery');
    expect(point(model, 0).battery).toBe(25);
    expect(event(rows, 'battery-reserve')).toEqual({ id: 'battery-reserve', minute: 0, kind: 'boundary' });
    expect(event(rows, 'battery-min').minute).toBe(power(model.power, 92).emptyMinute);
    const charging = events(trajectory({ opsBattery: 25 }), 'battery');
    expect(event(charging, 'battery-reserve')).toBeUndefined();
  });

  it('uses each thermal extreme and chooses its earliest exact time when values tie', () => {
    const model = trajectory(), rows = events(model, 'temp');
    expect(event(rows, 'cabin-min').minute).toBe(0);
    expect(event(rows, 'cabin-max').minute).toBeCloseTo(64.83333333333299, 10);
    const tied = { ...model, thermal: { ...model.thermal, samples: [
      { minute: 70, cabin: 27 }, { minute: 40, cabin: 18 }, { minute: 10.12345, cabin: 27 }, { minute: 5.6789, cabin: 18 }
    ] } };
    expect(event(events(tied, 'temp'), 'cabin-min').minute).toBe(5.6789);
    expect(event(events(tied, 'temp'), 'cabin-max').minute).toBe(10.12345);
  });

  it('omits interventions when enabled controls produce no actual action', () => {
    for (const setup of [{ opsAttitudeDump: false }, { opsAttitudeDump: true, opsAttitudeFuel: 0 },
      { opsAttitudeDump: true, opsCmg: 0, opsAttitudeTorque: 0 }]) {
      const model = trajectory(setup);
      for (const metric of ['cmg', 'pointing', 'propellant']) {
        expect(events(model, metric).some(row => row.id === 'burn-start' || row.id === 'burn-end')).toBe(false);
      }
    }
    for (const setup of [{ opsAirRestore: false, opsAirFlow: 3 }, { opsAirRestore: true, opsAirFlow: 90 }, { opsAirRestore: true, opsAirFlow: 180 }]) {
      expect(event(events(trajectory(setup), 'co2'), 'air-restore')).toBeUndefined();
    }
  });

  it('keeps both sources’ own eclipses and near-coincident unequal event times', () => {
    const before = trajectory({ opsEclipse: 35 }), after = trajectory({ opsEclipse: 45 });
    expect(event(events(before, 'pointing'), 'eclipse').minute).toBe(57);
    expect(event(events(after, 'pointing'), 'eclipse').minute).toBe(47);
    expect(point(before, 50).lit).toBe(true);
    expect(point(after, 50).lit).toBe(false);
    const close = trajectory({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.0000000001 });
    const rows = events(close, 'co2');
    expect(event(rows, 'eclipse').minute).toBe(57);
    expect(event(rows, 'air-restore').minute).toBe(57.0000000001);
    expect(event(rows, 'eclipse').minute).not.toBe(event(rows, 'air-restore').minute);
  });

  it('preserves the exact later peak for a tiny CMG rise across 80 percent', () => {
    const model = trajectory({ opsCmg: 79.9999999999, opsAttitudeTorque: 1e-11 });
    const rows = events(model, 'cmg');
    expect(point(model, 0).cmg).toBeLessThan(80);
    expect(point(model, 92).cmg).toBeGreaterThan(80);
    expect(event(rows, 'cmg-peak')).toEqual({ id: 'cmg-peak', minute: 92, kind: 'peak' });
    expect(event(rows, 'attitude-caution').minute).toBe(model.attitude.firstCaution / 60);
    expect(rows.filter(row => row.minute === 92).map(row => row.id)).toEqual(['end', 'cmg-peak']);
  });

  it('defaults invalid metrics and returns detached events without mutating models or evidence', () => {
    const model = trajectory({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.12345 });
    const original = JSON.stringify(model), expected = events(model, 'battery');
    for (const invalid of [undefined, null, '', 'unknown', 'constructor', '__proto__', [], ['cmg'], {}]) expect(events(model, invalid)).toEqual(expected);
    const first = events(model, 'battery');
    first[0].minute = 12;
    first.push({ id: 'invented', minute: 200, kind: 'peak' });
    expect(events(model, 'battery')).toEqual(expected);
    expect(JSON.stringify(model)).toBe(original);
  });
});
