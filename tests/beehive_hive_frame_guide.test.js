import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
const colony = (patch = {}) => ({ day: 15, experimentRunSerial: 3, simulationSeed: 0,
  modelVersion: 'colony-daily-1.2', honey: 40, syrup: 5, pollen: 12, brood: 6000,
  queenHealth: 90, actionPoints: 3, autoAdvance: false, colonySurvived: true,
  beekeeperNotebook: { prediction: 'Keep my prediction', evidence: 'Keep my evidence',
    explanation: 'Keep my explanation', evidenceReviewed: true }, ...patch });
const patternKeys = ['honey', 'pollen', 'brood', 'queenHealth'];
const topics = [
  { id: 'food', label: 'Food stores' }, { id: 'pollen', label: 'Pollen stores' },
  { id: 'brood', label: 'Developing brood' }, { id: 'queen', label: 'Queen' }
];
const selectionRows = [
  ...topics.map(topic => [topic.id, null]),
  ...['honey', 'pollen', 'open_brood', 'capped_brood', 'drone_brood', 'empty'].map(role => ['queen', role])
];
const guide = (data = colony(), frame = 2, topic = 'brood', role = null) => BH.bhHiveInteriorFrameGuide(data, frame, topic, role);
const frameKind = frame => frame === 0 || frame === 5 ? 'Outside' : frame === 1 || frame === 4 ? 'Shoulder' : 'Centre';
const acceptedCell = (cell, topic, role) => role === 'empty' ? ['empty', 'foundation'].includes(cell.role)
  : role ? cell.role === role
    : topic === 'food' ? cell.role === 'honey'
      : topic === 'pollen' ? cell.role === 'pollen'
        : topic === 'brood' ? ['open_brood', 'capped_brood', 'drone_brood'].includes(cell.role) : false;
const independentMatches = (data, topic, role) => Array.from({ length: 6 }, (_, frame) => frame)
  .filter(frame => BH.bhHiveInteriorFrameModel(data, frame).cells.some(cell => acceptedCell(cell, topic, role)));
const independentNext = (matches, current) => Array.from({ length: 5 }, (_, index) => (current + index + 1) % 6)
  .find(frame => matches.includes(frame)) ?? null;
function unavailable(result) {
  expect(result).toMatchObject({ available: false, mapped: false, matchingFrames: [], nextFrame: null });
  expect(result.reason.length).toBeGreaterThan(0);
  expect(result.frames).toEqual(Array.from({ length: 6 }, (_, frame) => ({
    frame, frameKind: frameKind(frame), status: 'unavailable', label: 'Unavailable'
  })));
}
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}
function knownSelection(data, current, topic, role) {
  const result = guide(data, current, topic, role), matches = independentMatches(data, topic, role);
  const label = role ? BH.BH_HIVE_INTERIOR_ROLES.find(item => item.id === role).label
    : topics.find(item => item.id === topic).label;
  const mapped = !!role || topic !== 'queen';
  expect(result).toMatchObject({ available: true, mapped, label, matchingFrames: matches,
    nextFrame: mapped ? independentNext(matches, current) : null });
  expect(result.frames).toEqual(Array.from({ length: 6 }, (_, frame) => ({
    frame, frameKind: frameKind(frame), status: !mapped ? 'unmapped' : matches.includes(frame) ? 'shown' : 'absent',
    label: !mapped ? 'Not mapped' : matches.includes(frame) ? 'Marks shown' : 'No matching marks'
  })));
  expect(Object.keys(result).sort()).toEqual(['available', 'frames', 'label', 'mapped', 'matchingFrames', 'nextFrame', 'reason'].sort());
  expect(result.reason).toContain('current model pattern');
  expect(result.reason).not.toMatch(/\d|%|percent|count|healthy|unhealthy|queenless|dead|failed/i);
  if (mapped) expect(result.reason).toContain('do not diagnose the colony');
  else expect(result.reason).toContain('queen’s location is not mapped');
  return result;
}

describe('Current hive schematic frame guide', () => {
  it.each(selectionRows.flatMap(([topic, role]) => Array.from({ length: 6 }, (_, frame) => [topic, role, frame])))
    ('matches the actual current diagram for topic %s / role %s from frame %s', (topic, role, frame) => {
      const raw = colony(), original = structuredClone(raw);
      knownSelection(raw, frame, topic, role);
      expect(raw).toEqual(original);
    });

  const fixtures = [
    ['all recorded zeros', { honey: 0, pollen: 0, brood: 0, queenHealth: 0 }],
    ['no food stores', { honey: 0 }],
    ['pollen without brood', { honey: 0, pollen: 30, brood: 0, queenHealth: 100 }],
    ['brood with no pollen', { pollen: 0 }],
    ['zero laying score', { queenHealth: 0 }],
    ['recorded upper bounds', { honey: 1000000, pollen: 1000000, brood: 1000000, queenHealth: 100 }],
    ['tiny recorded values', { honey: 0.0001, pollen: 0.0001, brood: 0.001, queenHealth: 100 }]
  ];
  it.each(fixtures.flatMap(([name, patch]) => selectionRows.map(([topic, role]) => [name, patch, topic, role])))
    ('uses the existing pattern for %s (%j), topic %s / role %s', (name, patch, topic, role) => {
      const raw = freezeDeep(colony(patch));
      knownSelection(raw, 5, topic, role);
    });

  it('groups both empty comb and foundation under the unmarked cell key', () => {
    const raw = colony({ honey: 0, pollen: 0, brood: 0, queenHealth: 0 });
    const drawnRoles = new Set(BH.bhHiveInteriorFrameModel(raw, 2).cells.map(cell => cell.role));
    expect(drawnRoles.has('empty')).toBe(true); expect(drawnRoles.has('foundation')).toBe(true);
    expect(guide(raw, 2, 'queen', 'empty')).toMatchObject({ label: 'Unmarked comb', mapped: true,
      matchingFrames: [0, 1, 2, 3, 4, 5], nextFrame: 3 });
  });

  it('finds the union of brood types instead of silently substituting a single brood key', () => {
    const raw = colony();
    const result = guide(raw, 0, 'brood');
    const union = new Set(['open_brood', 'capped_brood', 'drone_brood'].flatMap(role => guide(raw, 0, 'food', role).matchingFrames));
    expect(result.matchingFrames).toEqual([...union].sort((a, b) => a - b));
    expect(result.label).toBe('Developing brood');
  });

  it('lets every recognized cell key override the topic category', () => {
    for (const role of BH.BH_HIVE_INTERIOR_ROLES) {
      const fromFood = guide(colony(), 2, 'food', role.id);
      const fromQueen = guide(colony(), 2, 'queen', role.id);
      expect(fromFood).toEqual(fromQueen);
      expect(fromFood.label).toBe(role.label);
    }
  });

  it('treats omitted and null role selection as the topic itself', () => {
    for (const topic of topics) {
      expect(BH.bhHiveInteriorFrameGuide(colony(), 2, topic.id, undefined)).toEqual(guide(colony(), 2, topic.id, null));
    }
  });

  it('wraps from the last frame to the next matching frame without revisiting the current frame', () => {
    const raw = colony(), food = guide(raw, 5, 'food'), brood = guide(raw, 5, 'brood');
    expect(food.matchingFrames).toContain(0); expect(food.nextFrame).toBe(0);
    expect(brood.matchingFrames).not.toContain(0); expect(brood.matchingFrames).toContain(1);
    expect(brood.nextFrame).toBe(1);
    for (let frame = 0; frame < 6; frame++) {
      for (const [topic, role] of selectionRows) {
        const result = guide(raw, frame, topic, role);
        expect(result.nextFrame).not.toBe(frame);
        if (result.nextFrame !== null) expect(result.matchingFrames).toContain(result.nextFrame);
      }
    }
  });

  it('keeps missing schematic categories distinct from unavailable readings', () => {
    const raw = colony({ honey: 0, pollen: 0, brood: 0, queenHealth: 0 });
    for (const [topic, role] of selectionRows.filter(([topic, role]) => topic !== 'queen' || role && role !== 'empty')) {
      expect(guide(raw, 3, topic, role)).toMatchObject({ available: true, mapped: true,
        matchingFrames: [], nextFrame: null });
      expect(guide(raw, 3, topic, role).frames.every(frame => frame.status === 'absent')).toBe(true);
      expect(guide(raw, 3, topic, role).reason).toContain('No matching marks');
    }
  });

  it('never claims to locate or establish absence of the queen', () => {
    for (const score of [0, 50, 100]) {
      const result = guide(colony({ queenHealth: score }), 3, 'queen');
      expect(result).toMatchObject({ available: true, mapped: false, label: 'Queen', matchingFrames: [], nextFrame: null });
      expect(result.frames.every(frame => frame.status === 'unmapped' && frame.label === 'Not mapped')).toBe(true);
      expect(result.reason).toContain('Choosing a frame does not establish where she is');
      expect(result.reason).not.toMatch(/absent|missing|queenless|found|shown/i);
    }
  });

  it.each(patternKeys)('requires an own finite recorded %s without coercion or clamping', key => {
    const maximum = key === 'queenHealth' ? 100 : 1000000;
    for (const value of [undefined, null, NaN, Infinity, -Infinity, -0.00001, maximum + 0.01, '0', '', true, false, [], {}, new Number(0)]) {
      unavailable(guide(colony({ [key]: value })));
      unavailable(guide(colony({ [key]: value }), 0, 'queen'));
    }
    const raw = colony(); delete raw[key]; unavailable(guide(raw));
    expect(guide(colony({ [key]: -0 })).available).toBe(true);
    expect(guide(colony({ [key]: maximum })).available).toBe(true);
  });

  it.each(patternKeys)('rejects inherited %s instead of reading it as recorded data', key => {
    let reads = 0;
    const prototype = {};
    Object.defineProperty(prototype, key, { get() { reads++; throw new Error('Inherited read'); } });
    const raw = Object.defineProperties(Object.create(prototype), Object.getOwnPropertyDescriptors(colony())); delete raw[key];
    unavailable(guide(raw)); expect(reads).toBe(0);
  });

  it.each(patternKeys)('does not invoke a recorded %s accessor', key => {
    let reads = 0;
    const raw = colony();
    Object.defineProperty(raw, key, { get() { reads++; throw new Error('Accessor read'); }, enumerable: true });
    unavailable(guide(raw)); expect(reads).toBe(0);
  });

  it.each([undefined, null, [], Object.assign([], colony()), 'colony', 0, true, () => colony()])
    ('does not reinterpret non-record data %j as a current pattern', value => unavailable(BH.bhHiveInteriorFrameGuide(value, 2, 'brood', null)));

  it.each([undefined, null, -1, 6, 2.5, '2', true, [], {}, NaN, Infinity, new Number(2)])
    ('does not clamp or coerce invalid current frame %j', value => unavailable(BH.bhHiveInteriorFrameGuide(colony(), value, 'food', null)));

  it.each([undefined, null, '', 'honey', 'queenHealth', 'unknown', '__proto__', 0, [], {}, true])
    ('does not substitute a category for unknown topic %j', topic => {
      unavailable(BH.bhHiveInteriorFrameGuide(colony(), 2, topic, null));
      unavailable(BH.bhHiveInteriorFrameGuide(colony(), 2, topic, 'honey'));
    });

  it.each(['', false, 'foundation', 'queen', 'unavailable', 'unknown', 0, [], {}, true])
    ('does not ignore invalid role %j and fall back to a topic', role => unavailable(guide(colony(), 2, 'brood', role)));

  it('accepts recorded non-enumerable data without enumerating unrelated state', () => {
    const raw = Object.create(null);
    for (const key of patternKeys) Object.defineProperty(raw, key, { value: colony()[key], enumerable: false });
    expect(guide(raw)).toEqual(guide(colony()));
  });

  it('reads only the four raw data descriptors, never resources, identity, notebook or proxy getters', () => {
    const requested = [], raw = colony();
    for (const key of ['day', 'experimentRunSerial', 'simulationSeed', 'modelVersion', 'actionPoints', 'workers', 'syrup', 'beekeeperNotebook']) {
      Object.defineProperty(raw, key, { get() { throw new Error('Unrelated state read: ' + key); } });
    }
    const guarded = new Proxy(raw, {
      get() { throw new Error('Direct property read'); },
      ownKeys() { throw new Error('Unrelated state enumeration'); },
      getOwnPropertyDescriptor(target, key) { requested.push(key); return Object.getOwnPropertyDescriptor(target, key); }
    });
    expect(guide(guarded)).toEqual(guide(colony()));
    expect(requested).toEqual(patternKeys);
  });

  it('returns an unavailable guide when raw descriptors cannot be inspected', () => {
    const guarded = new Proxy(colony(), { getOwnPropertyDescriptor() { throw new Error('Unreadable descriptor'); } });
    unavailable(guide(guarded));
  });

  it('returns fresh primitive records and arrays with no aliases to input or prior results', () => {
    const raw = freezeDeep(colony()), original = JSON.stringify(raw);
    const first = guide(raw), second = guide(raw);
    expect(first).toEqual(second); expect(first).not.toBe(second);
    expect(first.frames).not.toBe(second.frames); expect(first.matchingFrames).not.toBe(second.matchingFrames);
    first.frames.forEach((frame, index) => {
      expect(frame).not.toBe(second.frames[index]);
      expect(Object.getPrototypeOf(frame)).toBe(Object.prototype);
      Object.values(frame).forEach(value => expect(['string', 'number']).toContain(typeof value));
      expect(Object.keys(frame).sort()).toEqual(['frame', 'frameKind', 'label', 'status']);
    });
    expect(Object.getPrototypeOf(first)).toBe(Object.prototype);
    first.frames[0].status = 'changed'; first.matchingFrames.push(999); first.label = 'Changed';
    expect(guide(raw)).toEqual(second); expect(JSON.stringify(raw)).toBe(original);
  });

  it('recomputes the same schematic categories after a real management choice without applying or spending it', () => {
    const raw = freezeDeep(colony()), original = structuredClone(raw);
    const action = BH.bhManagementAction(raw, 'feed_bees');
    expect(action.eligible).toBe(true);
    const fed = freezeDeep({ ...raw, ...action.patch, actionPoints: raw.actionPoints - action.cost }), fedOriginal = structuredClone(fed);
    for (const [topic, role] of selectionRows) knownSelection(fed, 1, topic, role);
    expect(raw).toEqual(original); expect(fed).toEqual(fedOriginal);
    expect(raw.actionPoints).toBe(3); expect(fed.actionPoints).toBe(2);
    expect(raw.beekeeperNotebook).toEqual(original.beekeeperNotebook);
  });

  it('reflects symmetric model positions without inventing a single matching frame', () => {
    for (const [, patch] of fixtures) {
      for (const [topic, role] of selectionRows) {
        const result = guide(colony(patch), 2, topic, role);
        for (const frame of result.matchingFrames) expect(result.matchingFrames).toContain(5 - frame);
        expect(result.matchingFrames.length).not.toBe(1);
        if (result.matchingFrames.includes(2)) expect(result.nextFrame).not.toBeNull();
      }
    }
  });
});
