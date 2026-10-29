import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  var ISS_OPS_INPUTS =');
const helperEnd = source.indexOf('  // User-started clocks', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station trajectory export helpers not found');
const { csv, trajectory, point, events, inputs, withNoRuns, withHeader } = new Function(
  source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) + `
  return {csv:issOpsTrajectoryCsv,trajectory:issOpsTrajectory,point:issOpsTrajectoryPoint,events:issOpsTrajectoryEvents,inputs:ISS_OPS_INPUTS,
    withNoRuns:function(run){var a=issAirRun,t=issThermalRun,c=issAttitudeRun;function no(){throw new Error('Export rebuilt a model');}issAirRun=no;issThermalRun=no;issAttitudeRun=no;try{return run();}finally{issAirRun=a;issThermalRun=t;issAttitudeRun=c;}},
    withHeader:function(label,run){var original=ISS_OPS_INPUTS[0].label;ISS_OPS_INPUTS[0].label=label;try{return run();}finally{ISS_OPS_INPUTS[0].label=original;}}};`
)();

const burn = minute => trajectory({ opsCmg: 100, opsAttitudeTorque: 0, opsAttitudeDump: true, opsAttitudeBurnMinute: minute, opsAttitudeThrust: 5, opsAttitudeFuel: 1.5 });
const pair = (before = burn(10), after = burn(70), options = {}) => ({ baseline: { id: 1, trajectory: before }, comparison: { id: 2, trajectory: after }, minute: 40, metric: 'cmg', ...options });
function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index++; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if (char === '\r' && text[index + 1] === '\n' && !quoted) { row.push(value); rows.push(row); row = []; value = ''; index++; }
    else value += char;
  }
  if (quoted || value || row.length) throw new Error('Malformed CSV terminator');
  return rows;
}
function records(text) {
  const [headers, ...rows] = parseCsv(text);
  return { headers, rows, records: rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index]]))) };
}
const at = (data, minute) => data.records.filter(row => Number(row['Time (minutes)']) === minute);

describe('space station paired trajectory CSV evidence', () => {
  it('exports exactly 39 named columns and two ordered rows at every shared time', () => {
    const options = pair(), text = withNoRuns(() => csv(options)), data = records(text);
    expect(data.headers).toHaveLength(39);
    expect(data.headers.slice(0, 17)).toEqual(['Data provenance', 'Model version', 'Orbit duration (minutes)', 'Selected measurement', 'Side', 'Source kind', 'Trial ID', 'Time (minutes)', 'Selected cursor', 'Phase', 'Events',
      'Battery reserve (%)', 'Highest zone CO2 (ppm)', 'Cabin temperature (C)', 'CMG storage used (%)', 'Pointing change (degrees)', 'Unloading propellant used (kg)']);
    expect(data.headers.slice(17)).toEqual(inputs.map(field => field.label + (field.unit ? ' (' + field.unit + ')' : '')));
    expect(data.rows.every(row => row.length === 39)).toBe(true);
    expect(data.rows.length).toBeGreaterThanOrEqual(186);
    expect(data.rows.length).toBeLessThan(300);
    expect(text.endsWith('\r\n')).toBe(true);
    expect(text.startsWith('"Data provenance",')).toBe(true);
    for (let index = 0; index < data.records.length; index += 2) {
      const [a, b] = data.records.slice(index, index + 2);
      expect(a.Side).toBe('baseline'); expect(b.Side).toBe('comparison');
      expect(a['Time (minutes)']).toBe(b['Time (minutes)']);
      if (index) expect(Number(a['Time (minutes)'])).toBeGreaterThan(Number(data.records[index - 2]['Time (minutes)']));
      for (const row of [a, b]) expect(row).toMatchObject({ 'Data provenance': 'Recomputed from setup using current classroom model', 'Model version': '1', 'Orbit duration (minutes)': '92', 'Selected measurement': 'cmg', 'Source kind': 'saved' });
    }
  });

  it('carries the burn timing evidence that identical final summary results omit', () => {
    const data = records(csv(pair())), [a, b] = at(data, 40);
    expect(a['CMG storage used (%)']).toBe('8');
    expect(b['CMG storage used (%)']).toBe('100');
    expect(a['Unloading propellant used (kg)']).toBe('1.012763602434897');
    expect(b['Unloading propellant used (kg)']).toBe('0');
    const final = at(data, 92);
    for (const header of data.headers.slice(11, 17)) expect(final[0][header]).toBe(final[1][header]);
    expect(at(data, 13.641666666666667)[0].Events.split('; ')).toContain('burn-end');
    expect(at(data, 13.641666666666667)[1].Events).not.toContain('burn-end');
    expect(at(data, 73.64166666666667)[1].Events.split('; ')).toContain('burn-end');
  });

  it('includes all-source events and exact near-coincident times independently of selected metric', () => {
    const a = trajectory({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.0000000001 });
    const b = trajectory({ opsEclipse: 35.12345, opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 57.12345 });
    const data = records(csv(pair(a, b, { metric: 'pointing' })));
    expect(at(data, 57)).toHaveLength(2);
    expect(at(data, 57.0000000001)).toHaveLength(2);
    expect(at(data, 57.12345)).toHaveLength(2);
    expect(at(data, 57.0000000001)[0].Events.split('; ')).toContain('air-restore');
    expect(at(data, a.air.peakMinute)[0].Events.split('; ')).toContain('co2-peak');
    expect(at(data, 57.12345)[1].Events.split('; ')).toEqual(expect.arrayContaining(['air-restore', 'co2-peak']));
    for (const [model, side] of [[a, 'baseline'], [b, 'comparison']]) {
      for (const metric of ['battery', 'co2', 'temp', 'cmg', 'pointing', 'propellant']) {
        for (const event of events(model, metric)) {
          const row = at(data, event.minute).find(row => row.Side === side);
          expect(row.Events.split('; ')).toContain(event.id);
          expect(new Set(row.Events.split('; ')).size).toBe(row.Events.split('; ').length);
        }
      }
    }
  });

  it('includes an off-grid cursor once per source and uses each side’s own lighting phase', () => {
    const a = trajectory({ opsEclipse: 35 }), b = trajectory({ opsEclipse: 45 }), minute = 50.123456789;
    const data = records(csv(pair(a, b, { minute })));
    const marked = data.records.filter(row => row['Selected cursor'] === 'true');
    expect(marked).toHaveLength(2);
    expect(marked.map(row => row['Time (minutes)'])).toEqual([String(minute), String(minute)]);
    expect(marked.map(row => row.Phase)).toEqual(['sunlight', 'eclipse']);
    expect(data.records.filter(row => row['Selected cursor'] !== 'true').every(row => row['Selected cursor'] === 'false')).toBe(true);
  });

  it('evaluates all six channels at every shared timestamp rather than zipping unequal sample grids', () => {
    const a = trajectory({ opsAirFlow: 3, opsAirRestore: true, opsAirRestoreMinute: 70.12345 }), b = burn(10.54321);
    const data = records(csv(pair(a, b, { minute: 12.3456789, metric: 'co2' })));
    const columns = { battery: 'Battery reserve (%)', co2: 'Highest zone CO2 (ppm)', temp: 'Cabin temperature (C)', cmg: 'CMG storage used (%)', pointing: 'Pointing change (degrees)', propellant: 'Unloading propellant used (kg)' };
    for (const row of data.records) {
      const expected = point(row.Side === 'baseline' ? a : b, Number(row['Time (minutes)']));
      for (const [key, header] of Object.entries(columns)) { expect(Number(row[header])).toBe(expected[key]); expect(Number.isFinite(Number(row[header]))).toBe(true); }
    }
  });

  it('captures current-source controls in every row and preserves saved and legacy evidence', () => {
    const legacy = { id: 7, setup: Object.freeze(trajectory().setup), results: Object.freeze({ batteryMin: 72.98, batteryEnd: 72.98, co2Peak: 2855.6, cabinMin: 22, cabinMax: 22.38, cmgPeak: 38.16, recovery: 98, waterResupply: .532 }), prediction: 'Original prediction', reflection: 'Original reflection' };
    const working = { ...legacy.setup, opsCrew: 11, opsAttitudeDump: true, opsAttitudeBurnMinute: 12.34567, opsAirRestore: true, opsAirFlow: 3 };
    const a = trajectory(legacy.setup), b = trajectory(working), before = JSON.stringify({ legacy, working, a, b });
    const data = records(csv({ baseline: { id: 7, trajectory: a }, comparison: { id: null, trajectory: b }, minute: 40, metric: 'propellant' }));
    for (const row of data.records) {
      const isCurrent = row.Side === 'comparison', model = isCurrent ? b : a;
      expect(row['Source kind']).toBe(isCurrent ? 'current' : 'saved');
      expect(row['Trial ID']).toBe(isCurrent ? '' : '7');
      inputs.forEach((field, index) => expect(row[data.headers[17 + index]]).toBe(String(model.setup[field.key])));
    }
    working.opsCrew = 3;
    expect(data.records.find(row => row.Side === 'comparison')['Crew aboard (people)']).toBe('11');
    working.opsCrew = 11;
    expect(JSON.stringify({ legacy, working, a, b })).toBe(before);
    expect(Object.hasOwn(legacy.results, 'pointingEnd')).toBe(false);
  });

  it('exports self-comparisons as two identical-value rows with distinct side labels', () => {
    const model = burn(10), data = records(csv(pair(model, model, { comparison: { id: 1, trajectory: model } })));
    for (let index = 0; index < data.records.length; index += 2) {
      const [a, b] = data.records.slice(index, index + 2);
      expect({ ...a, Side: 'comparison' }).toEqual(b);
    }
  });

  it('normalizes only display preferences while strictly rejecting ambiguous source identities', () => {
    const valid = pair(trajectory(), trajectory());
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '', '40', [], {}, true]) {
      const data = records(csv({ ...valid, minute: value, metric: value }));
      expect(data.records.filter(row => row['Selected cursor'] === 'true').map(row => row['Time (minutes)'])).toEqual(['0', '0']);
      expect(data.records.every(row => row['Selected measurement'] === 'battery')).toBe(true);
    }
    expect(records(csv({ ...valid, minute: -1 })).records.filter(row => row['Selected cursor'] === 'true')[0]['Time (minutes)']).toBe('0');
    expect(records(csv({ ...valid, minute: 100 })).records.filter(row => row['Selected cursor'] === 'true')[0]['Time (minutes)']).toBe('92');
    for (const invalid of [undefined, null, [], 'export', {}]) expect(() => csv(invalid)).toThrow(TypeError);
    for (const id of [undefined, null, 0, -1, 1.5, 1000000001, '1', true, NaN, Infinity]) expect(() => csv({ ...valid, baseline: { ...valid.baseline, id } })).toThrow(/baseline.*identity/);
    for (const id of [undefined, 0, -1, 1.5, 1000000001, '1', true, NaN, Infinity]) expect(() => csv({ ...valid, comparison: { ...valid.comparison, id } })).toThrow(/comparison.*identity/);
    expect(() => csv({ ...valid, baseline: { ...valid.baseline, id: 1000000000 } })).not.toThrow();
  });

  it('rejects malformed model descriptors without rebuilding them or producing nonfinite data', () => {
    const valid = pair(trajectory(), trajectory());
    for (const invalid of [undefined, null, [], {}, { setup: {} }, { ...valid.baseline.trajectory, points: [] }]) {
      expect(() => withNoRuns(() => csv({ ...valid, baseline: { id: 1, trajectory: invalid } }))).toThrow(TypeError);
    }
    const damaged = JSON.parse(JSON.stringify(valid.baseline.trajectory));
    damaged.air.samples[5].local = NaN;
    expect(() => withNoRuns(() => csv({ ...valid, comparison: { id: null, trajectory: damaged } }))).toThrow(/comparison.*samples/);
    for (const peakMinute of [-1, 92.1]) {
      const damagedPeak = { ...valid.baseline.trajectory, air: { ...valid.baseline.trajectory.air, peakMinute } };
      expect(() => withNoRuns(() => csv({ ...valid, baseline: { id: 1, trajectory: damagedPeak } }))).toThrow(/baseline.*model/);
    }
  });

  it('quotes commas, double quotes and newlines and neutralizes formula-like string cells', () => {
    const options = pair(trajectory(), trajectory());
    const label = 'Crew, "count"\naboard';
    expect(withHeader(label, () => records(csv(options)).headers[17])).toBe(label + ' (people)');
    for (const label of ['=crew', '+crew', '-crew', '@crew', '  =crew', '\tcrew', '\uFEFF=crew']) {
      expect(withHeader(label, () => records(csv(options)).headers[17])).toBe("'" + label + ' (people)');
    }
  });
});
