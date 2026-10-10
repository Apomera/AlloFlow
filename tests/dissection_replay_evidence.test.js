import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE_PATH = 'stem_lab/stem_tool_dissection.js';
const RUNTIME_PATH = 'desktop/web-app/public/stem_lab/stem_tool_dissection.js';
const source = readFileSync(SOURCE_PATH, 'utf8');

// Evaluate the production helper, without mounting the lab or substituting its logic.
function loadProductionFunction(name) {
  const declaration = new RegExp('^([ \\t]*)function ' + name + '\\(', 'm').exec(source);
  if (!declaration) throw new Error('Missing production function: ' + name);
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < 0) throw new Error('Missing function ending: ' + name);
  return new Function('return (' + source.slice(start, end + ending.length) + ');')();
}

const replayEvidence = loadProductionFunction('procedureReplayEvidence');
const replaySetting = loadProductionFunction('procedureReplaySetting');
const incision = [{ x: 0.2, y: 0.3 }, { x: 0.4, y: 0.5 }, { x: 0.6, y: 0.7 }];
const extension = [{ x: 0.25, y: 0.35 }, { x: 0.45, y: 0.55 }];
const samples = [{ pressure: 0.2 }, { pressure: 0.7 }];

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function expectTeaching(evidence) {
  expect(evidence).toEqual({
    path: null, samples: [], pathLabel: 'TEACHING PATH',
    pressureRecorded: false, alignmentAvailable: false,
  });
}

describe('dissection replay evidence', () => {
  it('keeps the desktop runtime byte-identical to the source', () => {
    expect(readFileSync(RUNTIME_PATH).equals(readFileSync(SOURCE_PATH))).toBe(true);
  });

  it('retains valid saved paths and pressure for direct input without changing the record', () => {
    const state = freezeDeep({
      incisionPath: incision, incisionSamples: samples,
      extensionPath: extension, extensionSamples: [{ pressure: 0.45 }],
    });
    for (const inputType of ['mouse', 'pen', 'stylus', 'touch', 'pointer']) {
      const actions = freezeDeep([{ action: 'scalpel', inputType }, { action: 'scissors', inputType }]);
      const before = JSON.stringify({ state, actions });
      expect(replayEvidence(state, actions, 0)).toEqual({
        path: incision, samples, pathLabel: 'SAVED PATH',
        pressureRecorded: true, alignmentAvailable: true,
      });
      expect(replayEvidence(state, actions, 1)).toEqual({
        path: extension, samples: [{ pressure: 0.45 }], pathLabel: 'SAVED PATH',
        pressureRecorded: true, alignmentAvailable: true,
      });
      expect(JSON.stringify({ state, actions })).toBe(before);
    }
  });

  it('uses teaching evidence for history-only and malformed saved paths', () => {
    const actions = [{ action: 'scalpel', inputType: 'pointer' }];
    expectTeaching(replayEvidence({}, [{ action: 'scalpel' }], 0));
    for (const path of [
      undefined, null, {}, [], [{ x: 0.2, y: 0.3 }],
      [{ x: 0.2, y: 0.3 }, null],
      [{ x: 0.2, y: 0.3 }, { x: '0.4', y: 0.5 }],
      [{ x: 0.2, y: 0.3 }, { x: 0.4, y: NaN }],
      [{ x: Infinity, y: 0.3 }, { x: 0.4, y: 0.5 }],
      [{ x: -0.01, y: 0.3 }, { x: 0.4, y: 0.5 }],
      [{ x: 0.2, y: 1.01 }, { x: 0.4, y: 0.5 }],
    ]) {
      expectTeaching(replayEvidence({ incisionPath: path, incisionSamples: samples }, actions, 0));
    }
  });

  it('identifies supported actions even when imported records include pressure samples', () => {
    const state = { incisionPath: incision, incisionSamples: samples };
    for (const entry of [
      { action: 'scalpel', inputType: 'motor-neutral' },
      { action: 'scalpel', inputType: 'button' },
      { action: 'scalpel', inputType: 'pointer', assistance: 'motor-neutral' },
    ]) {
      expect(replayEvidence(state, [entry], 0)).toEqual({
        path: incision, samples: [], pathLabel: 'SUPPORTED PATH',
        pressureRecorded: false, alignmentAvailable: false,
      });
    }
  });

  it('retains a legacy saved path without claiming known direct-input alignment', () => {
    for (const inputType of [undefined, 'unknown', 'legacy-import']) {
      expect(replayEvidence(
        { incisionPath: incision, incisionSamples: samples },
        [{ action: 'scalpel', inputType }], 0,
      )).toEqual({
        path: incision, samples, pathLabel: 'SAVED PATH',
        pressureRecorded: true, alignmentAvailable: false,
      });
    }
  });

  it('reserves each stored stroke for its latest matching action and never borrows the incision for scissors', () => {
    const state = { incisionPath: incision, incisionSamples: samples, extensionPath: extension, extensionSamples: samples };
    const actions = [
      { action: 'scalpel', inputType: 'pointer' },
      { action: 'scissors', inputType: 'pointer' },
      { action: 'scalpel', inputType: 'pointer' },
    ];
    expectTeaching(replayEvidence(state, actions, 0));
    expect(replayEvidence(state, actions, 1).path).toEqual(extension);
    expect(replayEvidence(state, actions, 2).path).toEqual(incision);
    expectTeaching(replayEvidence(
      { incisionPath: incision, incisionSamples: samples },
      [{ action: 'scissors', inputType: 'pointer' }], 0,
    ));
  });

  it('accepts zero pressure and rejects the entire pressure series when any sample is unusable', () => {
    const actions = [{ action: 'scalpel', inputType: 'pointer' }];
    const edgePath = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const edgeSamples = [{ pressure: 0 }, { pressure: 1 }];
    expect(replayEvidence({ incisionPath: edgePath, incisionSamples: edgeSamples }, actions, 0)).toEqual({
      path: edgePath, samples: edgeSamples, pathLabel: 'SAVED PATH',
      pressureRecorded: true, alignmentAvailable: true,
    });
    for (const invalidSamples of [
      undefined, null, {}, [], [null], [{}],
      [{ pressure: 0.2 }, { pressure: NaN }],
      [{ pressure: 0.2 }, { pressure: Infinity }],
      [{ pressure: 0.2 }, { pressure: -0.1 }],
      [{ pressure: 0.2 }, { pressure: 1.1 }],
      [{ pressure: 0.2 }, { pressure: '0.5' }],
      [{ pressure: 0.2 }, { pressure: null }],
    ]) {
      expect(replayEvidence({ incisionPath: incision, incisionSamples: invalidSamples }, actions, 0)).toEqual({
        path: incision, samples: [], pathLabel: 'SAVED PATH',
        pressureRecorded: false, alignmentAvailable: true,
      });
    }
  });

  it('does not attach cutting evidence to non-cutting actions', () => {
    const state = { incisionPath: incision, incisionSamples: samples, extensionPath: extension, extensionSamples: samples };
    for (const action of ['inspect', 'forceps', 'pin', 'probe', 'dropper', 'wick']) {
      expectTeaching(replayEvidence(state, [{ action, inputType: 'pointer' }], 0));
    }
  });

  it('returns recorded numeric settings including zero and bounded saline doses without mutation', () => {
    const entry = freezeDeep({ toolCalibration: { forcepsGrip: 0, pinAngle: 100, probePressure: 27, salineDose: 1 } });
    const before = JSON.stringify(entry);
    expect(replaySetting(entry, 'forcepsGrip')).toBe(0);
    expect(replaySetting(entry, 'pinAngle')).toBe(100);
    expect(replaySetting(entry, 'probePressure')).toBe(27);
    expect(replaySetting(entry, 'salineDose')).toBe(1);
    expect(replaySetting({ toolCalibration: { salineDose: 3 } }, 'salineDose')).toBe(3);
    expect(JSON.stringify(entry)).toBe(before);
  });

  it('leaves absent, inherited, nonnumeric, and out-of-range settings unrecorded', () => {
    for (const entry of [undefined, null, {}, { toolCalibration: null }, { toolCalibration: {} }]) {
      expect(replaySetting(entry, 'forcepsGrip')).toBeNull();
    }
    expect(replaySetting({ toolCalibration: Object.create({ forcepsGrip: 50 }) }, 'forcepsGrip')).toBeNull();
    for (const value of [undefined, null, '', '34', false, NaN, Infinity, -Infinity, -1, 101]) {
      expect(replaySetting({ toolCalibration: { forcepsGrip: value } }, 'forcepsGrip')).toBeNull();
    }
    for (const value of [0, 0.9, 3.1, 100]) {
      expect(replaySetting({ toolCalibration: { salineDose: value } }, 'salineDose')).toBeNull();
    }
  });
});
