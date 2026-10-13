import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Use the production helpers together; refuse missing or ambiguous source anchors.
function loadProductionFunction(name, bindings = {}) {
  const declarations = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (declarations.length !== 1) throw new Error('Expected one production function: ' + name);
  const declaration = declarations[0];
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (start < 0 || end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const details = loadProductionFunction('procedureReplayDetails', {
  calibrationControlDefinition: loadProductionFunction('calibrationControlDefinition'),
  procedureReplaySetting: loadProductionFunction('procedureReplaySetting'),
  procedureReplayEvidence: loadProductionFunction('procedureReplayEvidence'),
});

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

const path = [{ x: 0.2, y: 0.3 }, { x: 0.7, y: 0.8 }];
const samples = [{ pressure: 0 }, { pressure: 0.35 }, { pressure: 1 }];
const savedState = () => ({ incisionPath: path, incisionSamples: samples, extensionPath: path, extensionSamples: samples });
const values = rows => Object.fromEntries(rows.map(row => [row.label, row.value]));
const settingCases = [
  ['scalpel', 'bladeAngle', 30, 'Blade angle', '30°'],
  ['scissors', 'scissorsAperture', 40, 'Scissors aperture', '40%'],
  ['forceps', 'forcepsGrip', 45, 'Forceps grip', '45%'],
  ['pin', 'pinAngle', 65, 'Pin angle', '65°'],
  ['probe', 'probePressure', 25, 'Probe pressure', '25%'],
  ['dropper', 'salineDose', 3, 'Saline dose', '3 drops'],
];

describe('dissection replay details', () => {
  it.each(settingCases)('shows the saved %s setting with its label and unit', (action, key, value, label, display) => {
    const rows = details({}, [{ action, toolCalibration: { [key]: value } }], 0);
    expect(rows[0]).toEqual({ label, value: display });
    expect(rows.at(-1)).toEqual({ label: 'Recorded result', value: 'No result recorded for this action.' });
  });

  it('uses singular and plural drop units', () => {
    expect([1, 2, 3].map(salineDose => values(details({}, [{ action: 'dropper', toolCalibration: { salineDose } }], 0))['Saline dose']))
      .toEqual(['1 drop', '2 drops', '3 drops']);
  });

  it('reads each duplicate action by index rather than name, timestamp or current calibration', () => {
    const actions = [1, 2, 3].map(salineDose => ({ action: 'dropper', label: 'Hydrated', at: 100, toolCalibration: { salineDose } }));
    const state = { toolCalibration: { salineDose: 1 }, salineDose: 1 };
    expect(actions.map((_, index) => values(details(state, actions, index))['Saline dose'])).toEqual(['1 drop', '2 drops', '3 drops']);
  });

  it('keeps all six missing settings explicit even when current state has calibration values', () => {
    const state = { toolCalibration: Object.fromEntries(settingCases.map(([, key, value]) => [key, value])) };
    for (const [action, key, , label] of settingCases) {
      for (const calibration of [undefined, null, {}, Object.create({ [key]: 25 })]) {
        expect(values(details(state, [{ action, toolCalibration: calibration }], 0))[label]).toBe('Not recorded');
      }
    }
  });

  it('rejects invalid saved numbers without substituting live defaults', () => {
    for (const [action, key, liveValue, label] of settingCases) {
      const invalid = [undefined, null, '25', true, NaN, Infinity, -Infinity, -1, 101];
      if (action === 'dropper') invalid.push(0, 4);
      for (const value of invalid) {
        const state = { toolCalibration: { [key]: liveValue } };
        expect(values(details(state, [{ action, toolCalibration: { [key]: value } }], 0))[label]).toBe('Not recorded');
      }
    }
  });

  it.each(['scalpel', 'scissors'])('distinguishes the earlier illustrative %s from the latest saved cut', action => {
    const actions = [{ action, inputType: 'pointer', at: 100 }, { action: 'inspect', at: 100 }, { action, inputType: 'pointer', at: 100 }];
    const earlier = values(details(savedState(), actions, 0));
    const latest = values(details(savedState(), actions, 2));
    expect(earlier.Path).toBe('Illustrative path; this action has no saved path.');
    expect(earlier['Pressure samples']).toBe('Not recorded');
    expect(latest.Path).toBe('Saved path');
    expect(latest['Pressure samples']).toBe('Recorded along this path');
  });

  it('uses the corresponding incision and extension evidence independently', () => {
    const state = { incisionPath: path, incisionSamples: samples, extensionPath: [], extensionSamples: samples };
    const actions = [{ action: 'scalpel', inputType: 'pen' }, { action: 'scissors', inputType: 'pen' }];
    expect(values(details(state, actions, 0)).Path).toBe('Saved path');
    expect(values(details(state, actions, 1)).Path).toBe('Illustrative path; this action has no saved path.');
    expect(values(details(state, actions, 1))['Pressure samples']).toBe('Not recorded');
  });

  it.each([
    ['button input', { inputType: 'button' }],
    ['motor-neutral input', { inputType: 'motor-neutral' }],
    ['motor-neutral assistance', { inputType: 'pointer', assistance: 'motor-neutral' }],
  ])('does not claim independent pressure for %s', (_, provenance) => {
    for (const action of ['scalpel', 'scissors']) {
      const result = values(details(savedState(), [{ action, ...provenance }], 0));
      expect(result.Path).toBe('Supported path');
      expect(result['Pressure samples']).toBe('Not recorded');
    }
  });

  it('rejects missing, incomplete and malformed paths despite available samples', () => {
    const invalidPaths = [undefined, null, {}, [], [path[0]], [null, path[1]], [{ x: NaN, y: 0.3 }, path[1]], [{ x: 0.2, y: Infinity }, path[1]], [{ x: -0.1, y: 0.3 }, path[1]], [{ x: 0.2, y: 1.1 }, path[1]], [{ x: '0.2', y: 0.3 }, path[1]]];
    for (const invalidPath of invalidPaths) {
      const result = values(details({ incisionPath: invalidPath, incisionSamples: samples }, [{ action: 'scalpel', inputType: 'pointer' }], 0));
      expect(result.Path).toBe('Illustrative path; this action has no saved path.');
      expect(result['Pressure samples']).toBe('Not recorded');
    }
  });

  it('keeps a valid path while rejecting missing or invalid pressure samples', () => {
    const invalidSamples = [undefined, null, {}, [], [null], [{}], [{ pressure: NaN }], [{ pressure: Infinity }], [{ pressure: -0.01 }], [{ pressure: 1.01 }], [{ pressure: '0.3' }], [{ pressure: 0.3 }, { pressure: undefined }]];
    for (const invalid of invalidSamples) {
      const result = values(details({ incisionPath: path, incisionSamples: invalid }, [{ action: 'scalpel', inputType: 'pointer' }], 0));
      expect(result.Path).toBe('Saved path');
      expect(result['Pressure samples']).toBe('Not recorded');
    }
  });

  it('shows recorded result text without inferring a result from labels or other records', () => {
    const actions = [{ action: 'dropper', label: 'Hydrated', outcome: '  Hydration improved  ', outcomeDetail: 'A distinct long detail' }, { action: 'dropper', label: 'Hydrated' }];
    expect(values(details({}, actions, 0))['Recorded result']).toBe('Hydration improved');
    expect(values(details({}, actions, 1))['Recorded result']).toBe('No result recorded for this action.');
  });

  it('uses the result fallback for absent, blank and non-text outcomes', () => {
    for (const outcome of [undefined, null, '', ' \n\t ', 42, false, {}, []]) {
      expect(details({}, [{ action: 'inspect', outcome }], 0)).toEqual([{ label: 'Recorded result', value: 'No result recorded for this action.' }]);
    }
  });

  it('does not invent calibration or cutting evidence for uncalibrated and legacy actions', () => {
    for (const action of ['inspect', 'wick', 'unknown', undefined]) {
      expect(details(savedState(), [{ action, outcome: 'Saved observation' }], 0)).toEqual([{ label: 'Recorded result', value: 'Saved observation' }]);
    }
  });

  it('returns no details for unavailable lists, invalid indices and missing entries', () => {
    for (const actions of [undefined, null, {}, 'records', []]) expect(details({}, actions, 0)).toEqual([]);
    const actions = [{ action: 'dropper' }];
    for (const index of [undefined, null, '0', false, NaN, Infinity, -Infinity, -1, 0.5, 1]) expect(details({}, actions, index)).toEqual([]);
    for (const entry of [undefined, null, 'dropper', 42, true]) expect(details({}, [entry], 0)).toEqual([]);
    expect(details({}, Array(1), 0)).toEqual([]);
  });

  it('leaves saved actions, paths, calibration and outcomes immutable and returns fresh rows', () => {
    const state = freezeDeep(savedState());
    const actions = freezeDeep([{ action: 'scalpel', inputType: 'pen', toolCalibration: { bladeAngle: 32 }, outcome: '  Clean incision  ' }]);
    const before = JSON.stringify({ state, actions });
    const first = details(state, actions, 0);
    const second = details(state, actions, 0);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    first[0].value = 'Changed outside saved state';
    expect(second[0]).toEqual({ label: 'Blade angle', value: '32°' });
    expect(JSON.stringify({ state, actions })).toBe(before);
    expect(actions[0].outcome).toBe('  Clean incision  ');
  });
});
