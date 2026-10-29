import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const numberStart = source.indexOf('  function issFlightNumber(');
const numberEnd = source.indexOf('  // Circular 420 km orbit', numberStart);
const helpersStart = source.indexOf('  var ISS_OPS_INPUTS =');
const helpersEnd = source.indexOf('  // User-started clocks', helpersStart);
if ([numberStart, numberEnd, helpersStart, helpersEnd].some(index => index < 0)) throw new Error('Station investigation helpers not found');
const { inputs, resultFields, setup, trial, trials, append, csv } = new Function(
  source.slice(numberStart, numberEnd) + source.slice(helpersStart, helpersEnd) +
  '\nreturn { inputs: ISS_OPS_INPUTS, resultFields: ISS_OPS_RESULTS, setup: issOpsSetup, trial: issOpsTrial, trials: issOpsTrials, append: issOpsAppendTrial, csv: issOpsTrialCsv };'
)();

const measurements = () => ({ batteryMin: 20, batteryEnd: 21.866860358216876, co2Peak: 2855.619689999139,
  cabinMin: 21.7, cabinMax: 22.38, cmgPeak: 38.16842105263158, recovery: 98, waterResupply: .532 });
const sample = (id = 1, changes = {}, notes = {}) => trial({ ...setup(), ...changes }, measurements(), notes, id);
const models = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  // Saved investigations')) +
  '\nreturn { power: issPowerState, air: issAirConfig, thermal: issThermalConfig, attitude: issAttitudeConfig };')();

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
    else if (ch === '\r' && text[i + 1] === '\n' && !quoted) { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += ch;
  }
  return rows;
}

describe('space station integrated investigation evidence', () => {
  it('describes and normalizes only the integrated orbit inputs', () => {
    const defaults = setup();
    expect(Object.keys(defaults)).toEqual(inputs.map(field => field.key));
    expect(inputs).toHaveLength(22);
    expect(defaults).toMatchObject({ opsCrew: 7, opsBattery: 76, opsRecovery: 98, opsCabinStart: 22,
      opsAirRestore: false, opsAirRestoreMinute: 45, opsAttitudeDump: false, opsAttitudeFuel: 1.5 });
    expect(setup({ ...defaults, opsCrew: '9', opsWaterClean: 20, opsDebrisSpeed: 6, opsPressureLeak: .6,
      opsExercise: 2, opsMode: 'thermal', opsOrbitMinute: 92, unrelated: { unsafe: true } }))
      .toEqual({ ...defaults, opsCrew: 9 });
    for (const field of inputs) {
      expect(field.label).toBeTruthy();
      expect(typeof field.unit).toBe('string');
      if (field.type === 'number') {
        expect(setup({ [field.key]: field.min - 1000 })[field.key]).toBe(field.min);
        expect(setup({ [field.key]: field.max + 1000 })[field.key]).toBe(field.max);
        for (const corrupt of [null, undefined, '', ' ', 'not a number', NaN, Infinity, -Infinity, [], {}, true]) {
          expect(setup({ [field.key]: corrupt })[field.key]).toBe(field.defaultValue);
        }
      } else {
        expect(setup({ [field.key]: true })[field.key]).toBe(true);
        for (const corrupt of [false, 'true', 1, [], {}]) expect(setup({ [field.key]: corrupt })[field.key]).toBe(false);
      }
    }
    for (const corrupt of [null, undefined, [], 'settings', 10]) expect(setup(corrupt)).toEqual(defaults);
    expect(setup(Object.create({ opsCrew: 11 }))).toEqual(defaults);
  });

  it('captures detached full-precision measurements without recomputing after edits', () => {
    const input = setup({ opsBattery: 20 }), results = measurements();
    const notes = { prediction: 'Lower reserve will fail the reserve check.', reflection: 'Reserve fell below 25%.' };
    const saved = trial(input, results, notes, 3);
    const original = JSON.parse(JSON.stringify(saved));
    input.opsBattery = 99;
    results.batteryEnd = 100;
    notes.prediction = 'Changed prediction';
    expect(saved).toEqual(original);
    expect(saved.results.batteryEnd).toBe(21.866860358216876);
    const normalized = trials([saved]);
    expect(normalized).toEqual([original]);
    expect(normalized[0]).not.toBe(saved);
    expect(normalized[0].setup).not.toBe(saved.setup);
    expect(normalized[0].results).not.toBe(saved.results);
    normalized[0].results.batteryEnd = 0;
    expect(saved).toEqual(original);
    expect(trials(JSON.parse(JSON.stringify([saved])))).toEqual([saved]);
  });

  it('keeps recorded control defaults and limits in agreement with the actual physics models', () => {
    const bindings = [
      ['opsBattery', models.power, 'battery', 'percent'],
      ['opsEclipse', models.power, 'eclipse', 'sunlightMinutes', value => 92 - value],
      ['opsCrew', models.air, 'crew', 'crew'],
      ['opsScrub', models.air, 'scrub', 'scrub'],
      ['opsAirFlow', models.air, 'flow', 'flow'],
      ['opsAirActivity', models.air, 'activity', 'activity'],
      ['opsAirStart', models.air, 'startPpm', 'startPpm'],
      ['opsAirRestore', models.air, 'restore', 'restore'],
      ['opsAirRestoreMinute', models.air, 'restoreMinute', 'restoreMinute'],
      ['opsCabinStart', models.thermal, 'cabinStart', 'cabinStart'],
      ['opsRadiator', models.thermal, 'radiator', 'area', value => value / 320 * 100],
      ['opsCooling', models.thermal, 'cooling', 'conductance', value => value / 4 * 100],
      ['opsCmg', models.attitude, 'cmg', 'initialPercent'],
      ['opsAttitudeTorque', models.attitude, 'torque', 'disturbance'],
      ['opsAttitudeInertia', models.attitude, 'inertia', 'inertia', value => value / 1e6],
      ['opsAttitudeDump', models.attitude, 'dump', 'dump'],
      ['opsAttitudeBurnMinute', models.attitude, 'burnMinute', 'burnMinute'],
      ['opsAttitudeThrust', models.attitude, 'thrust', 'thrust'],
      ['opsAttitudeFuel', models.attitude, 'fuel', 'fuel']
    ];
    for (const [key, model, parameter, reading, convert = value => value] of bindings) {
      const metadata = inputs.find(field => field.key === key);
      const values = metadata.type === 'boolean' ? [undefined, false, true] : [undefined, -1e6, 1e6, metadata.defaultValue];
      for (const raw of values) {
        const recorded = setup({ [key]: raw })[key];
        const actual = convert(model({ [parameter]: raw }, 0)[reading]);
        if (metadata.type === 'boolean') expect(recorded).toBe(actual);
        else expect(recorded).toBeCloseTo(actual, 10);
      }
    }
  });

  it('requires every finite numerical result and discards unrelated fields', () => {
    for (const field of resultFields) {
      const missing = measurements();
      delete missing[field.key];
      expect(trial({}, missing, {}, 1)).toBeNull();
      for (const corrupt of [null, undefined, '12', NaN, Infinity, -Infinity, true, {}]) {
        expect(trial({}, { ...measurements(), [field.key]: corrupt }, {}, 1)).toBeNull();
      }
    }
    for (const invalid of [undefined, null, [], 'result', Object.create(measurements())]) expect(trial({}, invalid, {}, 1)).toBeNull();
    expect(trial({}, { ...measurements(), unrelated: 'discard' }, {}, 1).results).toEqual(measurements());
    expect(trial({}, { ...measurements(), cabinMin: -12.75 }, {}, 1).results.cabinMin).toBe(-12.75);
  });

  it('bounds IDs and notes at creation without accepting non-text notes', () => {
    expect(sample(-10).id).toBe(1);
    expect(sample(3.9).id).toBe(3);
    expect(sample('7').id).toBe(7);
    expect(sample(1e30).id).toBe(1e9);
    expect(sample(NaN).id).toBe(1);
    const saved = sample(1, {}, { prediction: 'p'.repeat(900), reflection: 'r'.repeat(1500), unrelated: 'discard' });
    expect(saved.prediction).toHaveLength(600);
    expect(saved.reflection).toHaveLength(1200);
    expect(Object.keys(saved)).toEqual(['version', 'id', 'setup', 'results', 'prediction', 'reflection']);
    expect(sample(1, {}, { prediction: {}, reflection: 45 })).toMatchObject({ prediction: '', reflection: '' });
  });

  it('retains the latest six valid unique trials and never repairs damaged evidence into a different setup', () => {
    const records = Array.from({ length: 8 }, (_, index) => sample(index + 1));
    expect(trials(records).map(row => row.id)).toEqual([3, 4, 5, 6, 7, 8]);
    const duplicate = sample(7, { opsCrew: 11 });
    const invalidDuplicate = { ...sample(7), results: { ...measurements(), batteryMin: null } };
    expect(trials([...records, duplicate, invalidDuplicate]).map(row => row.id)).toEqual([3, 4, 5, 6, 8, 7]);
    expect(trials([...records, duplicate, invalidDuplicate]).at(-1).setup.opsCrew).toBe(11);
    const saved = sample();
    const invalid = [null, [], {}, { ...saved, version: 2 }, { ...saved, id: '1' }, { ...saved, id: 0 },
      { ...saved, id: 1.5 }, { ...saved, id: Infinity }, { ...saved, id: 1e9 + 1 }, { ...saved, setup: {} },
      { ...saved, setup: { ...saved.setup, opsCrew: 12 } }, { ...saved, setup: { ...saved.setup, opsCrew: '7' } },
      { ...saved, setup: { ...saved.setup, opsAttitudeDump: 'false' } }, { ...saved, setup: [] }];
    expect(trials(invalid)).toEqual([]);
    for (const corrupt of [null, undefined, {}, 'saved trials']) expect(trials(corrupt)).toEqual([]);
    expect(trials([{ ...saved, unsafe: 'discard', setup: { ...saved.setup, opsDebrisSpeed: 12 } }])).toEqual([saved]);
  });

  it('retains the chosen baseline and the newest five other trials without mutating evidence', () => {
    const baseline = sample(1), original = JSON.parse(JSON.stringify(baseline));
    let saved = [baseline];
    for (let id = 2; id <= 9; id++) saved = append(saved, sample(id, { opsResearch: id * 10 }), baseline.id);
    expect(saved.map(row => row.id)).toEqual([1, 5, 6, 7, 8, 9]);
    expect(saved[0]).toEqual(original);
    expect(baseline).toEqual(original);
    expect(saved[0]).not.toBe(baseline);
    const changedBaseline = append(saved, sample(10), 5);
    expect(changedBaseline.map(row => row.id)).toEqual([5, 6, 7, 8, 9, 10]);
    expect(saved.map(row => row.id)).toEqual([1, 5, 6, 7, 8, 9]);
    expect(trials(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it('appends safely when the baseline is missing, input is corrupt, or an identity repeats', () => {
    const saved = Array.from({ length: 6 }, (_, i) => sample(i + 1));
    expect(append(saved, sample(7), 999).map(row => row.id)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(append(saved, null, 1)).toEqual(saved);
    expect(append(null, sample(2), null)).toEqual([sample(2)]);
    const replacement = sample(1, { opsResearch: 95 });
    const next = append(saved, replacement, 1);
    expect(next).toHaveLength(6);
    expect(new Set(next.map(row => row.id)).size).toBe(6);
    expect(next.at(-1)).toEqual(replacement);
    expect(saved[0].setup.opsResearch).toBe(60);
  });

  it('exports physical units, settings, full-precision readings and quoted multiline notes', () => {
    const saved = sample(3, { opsBattery: 20 }, { prediction: 'Reduce load, then compare "A" and "B".', reflection: 'First line\nSecond line\r\nThird line' });
    const rows = parseCsv(csv([saved]));
    expect(rows).toHaveLength(2);
    const [headers, values] = rows;
    expect(values).toHaveLength(headers.length);
    const record = Object.fromEntries(headers.map((heading, index) => [heading, values[index]]));
    expect(record).toMatchObject({ 'Trial ID': '3', 'Model version': '1', 'Orbit duration (minutes)': '92',
      'Initial battery reserve (%)': '20', 'Final battery reserve (%)': '21.866860358216876',
      'Water makeup requirement (L/day)': '0.532', Prediction: saved.prediction, Reflection: saved.reflection });
    expect(csv([saved]).endsWith('\r\n')).toBe(true);
    expect(parseCsv(csv([]))).toHaveLength(1);
    expect(parseCsv(csv([{ ...saved, results: {} }]))).toHaveLength(1);
  });

  it('neutralizes spreadsheet formulas in user text while preserving negative numerical readings', () => {
    for (const text of ['=1+1', '+SUM(A1)', '-1+1', '@SUM(A1)', '  =1+1', '\t=1+1', '\rcommand', '\ncommand', '\uFEFF=1+1']) {
      const saved = trial({}, { ...measurements(), cabinMin: -12.75 }, { prediction: text, reflection: text }, 1);
      const [headers, values] = parseCsv(csv([saved]));
      expect(values[headers.indexOf('Prediction')]).toBe("'" + text);
      expect(values[headers.indexOf('Reflection')]).toBe("'" + text);
      expect(values[headers.indexOf('Minimum cabin temperature (C)')]).toBe('-12.75');
    }
  });
});
