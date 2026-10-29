import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  var ISS_OPS_INPUTS =');
const helperEnd = source.indexOf('  // User-started clocks', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station learning helpers not found');
const { setup, changes, trial, trials, csv, compare, required, extra, air, attitude, inspectAttitude } = new Function(
  source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) +
  '\nreturn {setup:issOpsSetup,changes:issOpsSetupChanges,trial:issOpsTrial,trials:issOpsTrials,csv:issOpsTrialCsv,compare:issOpsRuleComparison,required:ISS_OPS_RESULTS,extra:ISS_OPS_EXTRA_RESULTS,air:issAirRun,attitude:issAttitudeRun,inspectAttitude:issAttitudeInspect};'
)();

const results = (extra = {}) => ({ batteryMin: 20, batteryEnd: 21.866860358216876, co2Peak: 2855.619689999139,
  cabinMin: 21.7, cabinMax: 22.38, cmgPeak: 38.16842105263158, recovery: 98, waterResupply: .532, ...extra });
const change = (before, after, key) => changes(before, after).find(row => row.key === key);
const burnSettings = value => ({ dump: value.opsAttitudeDump, burnMinute: value.opsAttitudeBurnMinute, thrust: value.opsAttitudeThrust,
  fuel: value.opsAttitudeFuel, cmg: value.opsCmg, torque: value.opsAttitudeTorque, inertia: value.opsAttitudeInertia });
const airSettings = value => ({ restore: value.opsAirRestore, restoreMinute: value.opsAirRestoreMinute, flow: value.opsAirFlow });
function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if (char === '\r' && text[index + 1] === '\n' && !quoted) { row.push(value); rows.push(row); row = []; value = ''; index++; }
    else value += char;
  }
  return rows;
}

describe('space station operational and inactive setup differences', () => {
  it('normalizes setups, ignores unrelated fields, and returns canonical detached changes', () => {
    expect(changes(undefined, {})).toEqual([]);
    expect(changes({ opsCrew: '7', opsAirRestore: 'false', other: 1 }, setup())).toEqual([]);
    expect(changes({ opsCrew: -10 }, { opsCrew: 3 })).toEqual([]);
    const before = Object.freeze(setup()), after = Object.freeze(setup({ opsCrew: 11, opsResearch: 20 }));
    const saved = JSON.stringify([before, after]), rows = changes(before, after);
    expect(rows).toEqual([
      { key: 'opsCrew', before: 7, after: 11, activeBefore: true, activeAfter: true, inactiveReason: null },
      { key: 'opsResearch', before: 60, after: 20, activeBefore: true, activeAfter: true, inactiveReason: null }
    ]);
    rows[0].after = 0;
    expect(changes(before, after)[0].after).toBe(11);
    expect(JSON.stringify([before, after])).toBe(saved);
  });

  it.each(['opsAttitudeBurnMinute', 'opsAttitudeThrust', 'opsAttitudeFuel'])(
    'checks both unloading states before treating %s as inactive', key => {
      const before = setup(), after = setup({ [key]: key === 'opsAttitudeBurnMinute' ? 80 : key === 'opsAttitudeThrust' ? 10 : 3 });
      expect(change(before, after, key)).toMatchObject({ activeBefore: false, activeAfter: false, inactiveReason: 'unloading-disabled' });
      expect(change({ ...before, opsAttitudeDump: true }, after, key)).toMatchObject({ activeBefore: true, activeAfter: false, inactiveReason: null });
      expect(change(before, { ...after, opsAttitudeDump: true }, key)).toMatchObject({ activeBefore: false, activeAfter: true, inactiveReason: null });
      expect(change({ ...before, opsAttitudeDump: true }, { ...after, opsAttitudeDump: true }, key)).toMatchObject({ activeBefore: true, activeAfter: true, inactiveReason: null });
    }
  );

  it('treats restoration timing as active only with an enabled restoration below 90 m3/h', () => {
    const before = setup({ opsAirRestoreMinute: 10 }), after = setup({ opsAirRestoreMinute: 80 });
    expect(change(before, after, 'opsAirRestoreMinute')).toMatchObject({ activeBefore: false, activeAfter: false, inactiveReason: 'restoration-inactive' });
    for (const flow of [90, 100, 180]) {
      expect(change({ ...before, opsAirRestore: true, opsAirFlow: flow }, { ...after, opsAirRestore: true, opsAirFlow: flow }, 'opsAirRestoreMinute'))
        .toMatchObject({ activeBefore: false, activeAfter: false, inactiveReason: 'restoration-inactive' });
    }
    const activeBefore = { ...before, opsAirRestore: true, opsAirFlow: 89.999 };
    const activeAfter = { ...after, opsAirRestore: true, opsAirFlow: 3 };
    expect(change(activeBefore, after, 'opsAirRestoreMinute')).toMatchObject({ activeBefore: true, activeAfter: false, inactiveReason: null });
    expect(change(before, activeAfter, 'opsAirRestoreMinute')).toMatchObject({ activeBefore: false, activeAfter: true, inactiveReason: null });
    expect(change(activeBefore, activeAfter, 'opsAirRestoreMinute')).toMatchObject({ activeBefore: true, activeAfter: true, inactiveReason: null });
  });

  it('keeps feature switches and active but outcome-independent controls conservative', () => {
    const before = setup({ opsCmg: 0, opsAttitudeTorque: 0, opsAttitudeFuel: 0 });
    const after = { ...before, opsAttitudeDump: true, opsAttitudeInertia: 160, opsAirRestore: true };
    expect(changes(before, after).every(row => row.activeBefore && row.activeAfter && row.inactiveReason === null)).toBe(true);
    expect(attitude(burnSettings(after)).burnSeconds).toBe(0);
    // A planned but unnecessary/unfueled burn still enables its setup fields;
    // classification describes dependencies, not predicted effect sizes.
    expect(change(after, { ...after, opsAttitudeBurnMinute: 80 }, 'opsAttitudeBurnMinute'))
      .toMatchObject({ activeBefore: true, activeAfter: true, inactiveReason: null });
  });

  it('agrees with the models that disabled settings do not alter their physical trajectories', () => {
    const before = setup({ opsAttitudeBurnMinute: 10, opsAttitudeThrust: 2, opsAttitudeFuel: .1, opsAirRestoreMinute: 10 });
    const after = setup({ opsAttitudeBurnMinute: 80, opsAttitudeThrust: 15, opsAttitudeFuel: 3, opsAirRestoreMinute: 80 });
    expect(changes(before, after)).toHaveLength(4);
    expect(changes(before, after).every(row => !row.activeBefore && !row.activeAfter)).toBe(true);
    expect(attitude(burnSettings(before)).segments).toEqual(attitude(burnSettings(after)).segments);
    expect(air(airSettings(before)).samples).toEqual(air(airSettings(after)).samples);
    const restoredBefore = { ...before, opsAirRestore: true, opsAirFlow: 90 };
    const restoredAfter = { ...after, opsAirRestore: true, opsAirFlow: 90 };
    expect(air(airSettings(restoredBefore)).samples).toEqual(air(airSettings(restoredAfter)).samples);
  });

  it('separates an operational change from unrelated inactive schedule differences', () => {
    const rows = changes(setup(), setup({ opsScrub: 55, opsAirRestoreMinute: 80, opsAttitudeBurnMinute: 10 }));
    expect(rows.filter(row => row.activeBefore || row.activeAfter).map(row => row.key)).toEqual(['opsScrub']);
    expect(rows.filter(row => !row.activeBefore && !row.activeAfter).map(row => row.key)).toEqual(['opsAirRestoreMinute', 'opsAttitudeBurnMinute']);
  });
});

describe('space station supplemental investigation evidence', () => {
  it('keeps the eight required results and five flight rules unchanged', () => {
    expect(required).toHaveLength(8);
    expect(extra).toEqual([
      { key: 'pointingEnd', label: 'Final pointing change', unit: 'degrees' },
      { key: 'propellantUsed', label: 'Unloading propellant used', unit: 'kg' }
    ]);
    const legacy = trial({}, results(), {}, 1);
    expect(legacy.version).toBe(1);
    expect(Object.keys(legacy.results)).toEqual(required.map(field => field.key));
    expect(compare(legacy.results, results({ pointingEnd: 15, propellantUsed: 2 }))).toHaveLength(5);
    expect(compare(legacy.results, results({ pointingEnd: NaN, propellantUsed: Infinity }))).toHaveLength(5);
    for (const field of required) {
      const missing = results({ pointingEnd: 15, propellantUsed: 2 });
      delete missing[field.key];
      expect(trial({}, missing, {}, 1)).toBeNull();
      expect(compare(legacy.results, missing)).toBeNull();
    }
  });

  it('records an inertia effect that the original CMG measurement alone cannot show', () => {
    const before = setup({ opsCmg: 85, opsAttitudeTorque: 2.4, opsAttitudeInertia: 40 });
    const after = setup({ opsCmg: 85, opsAttitudeTorque: 2.4, opsAttitudeInertia: 160 });
    const a = attitude(burnSettings(before)), b = attitude(burnSettings(after));
    const aEnd = inspectAttitude(a, 92), bEnd = inspectAttitude(b, 92);
    expect(a.peakPercent).toBe(100);
    expect(b.peakPercent).toBe(100);
    expect(aEnd.angleDeg).toBeCloseTo(32.26420956713728, 10);
    expect(bEnd.angleDeg).toBeCloseTo(aEnd.angleDeg / 4, 10);
    const aTrial = trial(before, results({ cmgPeak: a.peakPercent, pointingEnd: aEnd.angleDeg, propellantUsed: aEnd.fuelUsed }), {}, 1);
    const bTrial = trial(after, results({ cmgPeak: b.peakPercent, pointingEnd: bEnd.angleDeg, propellantUsed: bEnd.fuelUsed }), {}, 2);
    expect(aTrial.results.pointingEnd).not.toBe(bTrial.results.pointingEnd);
    expect(aTrial.results.propellantUsed).toBe(0);
    expect(compare(aTrial.results, bTrial.results).every(row => row.state === (row.before ? 'still-go' : 'still-check'))).toBe(true);
  });

  it('captures detached optional finite measurements without recomputing or rounding', () => {
    const input = setup({ opsAttitudeDump: true });
    const measurements = results({ pointingEnd: 32.26420956713728, propellantUsed: .062794294487 });
    const saved = trial(input, measurements, { prediction: 'Unload earlier.', reflection: 'Read the pointing curve.' }, 4);
    const original = JSON.parse(JSON.stringify(saved));
    measurements.pointingEnd = 0;
    measurements.propellantUsed = 3;
    input.opsAttitudeDump = false;
    expect(saved).toEqual(original);
    const restored = trials(JSON.parse(JSON.stringify([saved])));
    expect(restored).toEqual([original]);
    restored[0].results.pointingEnd = -1;
    expect(saved).toEqual(original);
    expect(saved.version).toBe(1);
  });

  it('omits missing, inherited, and damaged optional evidence while preserving valid required values', () => {
    for (const field of extra) {
      for (const invalid of [undefined, null, '', '0', '12.5', NaN, Infinity, -Infinity, true, [], {}]) {
        const saved = trial({}, results({ [field.key]: invalid }), {}, 1);
        expect(saved.results).toEqual(results());
        expect(Object.hasOwn(saved.results, field.key)).toBe(false);
      }
      const inherited = Object.assign(Object.create({ [field.key]: 12 }), results());
      expect(trial({}, inherited, {}, 1).results).toEqual(results());
      const validZero = trial({}, results({ [field.key]: 0 }), {}, 1);
      expect(Object.hasOwn(validZero.results, field.key)).toBe(true);
      expect(validZero.results[field.key]).toBe(0);
    }
    const partial = trial({}, results({ pointingEnd: -12.75, propellantUsed: NaN, unrelated: 7 }), {}, 1);
    expect(partial.results).toEqual(results({ pointingEnd: -12.75 }));
    expect(trials([{ ...partial, results: { ...partial.results, propellantUsed: Infinity } }])[0].results).toEqual(partial.results);
  });

  it('preserves mixed legacy and supplemental evidence with CSV blanks distinct from numeric zero', () => {
    const legacy = trial({}, results(), { prediction: 'Old evidence.' }, 1);
    const zero = trial({}, results({ pointingEnd: 0, propellantUsed: 0 }), {}, 2);
    const measured = trial({}, results({ pointingEnd: -12.75, propellantUsed: .062794294487 }), { reflection: 'Full precision.' }, 3);
    const mixed = trials(JSON.parse(JSON.stringify([legacy, zero, measured])));
    expect(mixed).toEqual([legacy, zero, measured]);
    expect(Object.keys(mixed[0].results)).toHaveLength(8);
    const [headers, ...rows] = parseCsv(csv(mixed));
    const pointing = headers.indexOf('Final pointing change (degrees)'), propellant = headers.indexOf('Unloading propellant used (kg)');
    expect(pointing).toBeGreaterThan(headers.indexOf('Water makeup requirement (L/day)'));
    expect(propellant).toBe(pointing + 1);
    expect(headers.indexOf('Prediction')).toBe(propellant + 1);
    expect(rows.map(row => [row[pointing], row[propellant]])).toEqual([['', ''], ['0', '0'], ['-12.75', '0.062794294487']]);
    expect(rows.every(row => row.length === headers.length)).toBe(true);
    expect(rows[0][headers.indexOf('Prediction')]).toBe('Old evidence.');
    expect(rows[2][headers.indexOf('Reflection')]).toBe('Full precision.');
  });
});
