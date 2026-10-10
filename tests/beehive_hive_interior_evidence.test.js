import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});

const colony = (patch = {}) => ({
  day: 15, workers: 12000, honey: 40.123456, syrup: 5, pollen: 12.345678,
  brood: 6000.55555, queenHealth: 90.123456, varroaLevel: 8, morale: 75,
  colonySurvived: true, activeEvent: null, autoAdvance: false,
  experimentRunSerial: 3, simulationSeed: 0, modelVersion: 'colony-daily-1.2', ...patch
});
const study = (patch = {}, frame = 2, topic = 'brood', role = null, shown = true) =>
  BH.bhHiveInteriorEvidence(colony(patch), frame, topic, role, shown);

describe('Hive interior evidence readings', () => {
  it.each([
    ['food', 'honey', '40.123 honey-equivalent lb'],
    ['pollen', 'pollen', '12.346 lb'],
    ['brood', 'brood', '6,000.556 cells'],
    ['queen', 'queenHealth', '90.123 / 100']
  ])('uses the same raw %s reading and units in the display and evidence', (topic, key, value) => {
    const result = study({}, 2, topic);
    expect(result).toMatchObject({ available: true, value, topic: { id: topic, key, value } });
    expect(result.text).toContain(result.topic.label + ': ' + value);
    expect(result.text).toContain('Frame 3/6 · Centre · Model illustration');
    expect(result.text).toContain('Cell marks are a schematic; stage, caste and real-cell locations are not measured.');
    expect(result.text).not.toContain('%');
  });

  it.each([
    ['food', 'honey', '0 honey-equivalent lb'], ['pollen', 'pollen', '0 lb'],
    ['brood', 'brood', '0 cells'], ['queen', 'queenHealth', '0 / 100']
  ])('preserves an actual zero for %s and day zero', (topic, key, value) => {
    const result = study({ [key]: 0, day: 0 }, 0, topic);
    expect(result).toMatchObject({ available: true, patternKnown: true, value });
    expect(result.context).toContain('Day 0');
    expect(result.text).toContain(value);
  });

  it.each([['food', 'honey'], ['pollen', 'pollen'], ['brood', 'brood'], ['queen', 'queenHealth']])(
    'does not normalize invalid raw %s readings into evidence', (topic, key) => {
      for (const value of [undefined, null, '0', true, NaN, Infinity, -Infinity, -1, [], {}]) {
        const result = study({ [key]: value }, 2, topic);
        expect(result, String(value)).toMatchObject({ available: false, patternKnown: false, value: 'Not recorded' });
        expect(result.text).toContain(result.topic.label + ': Not recorded');
        expect(result.text).toContain('Pattern unavailable: a required colony reading is not recorded.');
      }
    }
  );

  it.each([
    ['food', 'honey', 1000000, '1,000,000 honey-equivalent lb'],
    ['pollen', 'pollen', 1000000, '1,000,000 lb'],
    ['brood', 'brood', 1000000, '1,000,000 cells'],
    ['queen', 'queenHealth', 100, '100 / 100']
  ])('accepts the raw %s upper bound and rejects readings above it', (topic, key, maximum, value) => {
    expect(study({ [key]: maximum }, 2, topic)).toMatchObject({ available: true, patternKnown: true, value });
    expect(study({ [key]: maximum + 0.001 }, 2, topic)).toMatchObject({ available: false, patternKnown: false, value: 'Not recorded' });
  });

  it('keeps a known topic reading available when another missing reading prevents the schematic', () => {
    const result = study({ pollen: null }, 2, 'food');
    expect(result).toMatchObject({ available: true, patternKnown: false, value: '40.123 honey-equivalent lb' });
    expect(result.text).toContain('Pattern unavailable: a required colony reading is not recorded.');
    expect(result.text).not.toContain('Selected category is shown');
  });

  it('uses current raw metrics rather than frame counts, saved observations, or another bee role', () => {
    const baseline = study();
    expect(study({
      hive3dFrame: 5, frameBrood: 99, openBrood: 123, emptyCells: 456,
      history: [{ d: 15, brood: 100 }], queen: { brood: 10 },
      observations: [{ brood: 20 }], drone: { brood: 30 }
    })).toEqual(baseline);
  });

  it.each([undefined, null, [], 'colony', 12])('handles an absent colony record without invented values (%j)', (input) => {
    const result = BH.bhHiveInteriorEvidence(input, 0, 'food', null, true);
    expect(result).toMatchObject({ available: false, patternKnown: false, value: 'Not recorded' });
    expect(result.context).toContain('Day Not recorded');
    expect(result.text).not.toMatch(/Day 0|40\.123|Selected category is shown/);
  });
});

describe('Hive interior categories and model limits', () => {
  it.each([
    ['honey', 'food', 'Food cells'], ['pollen', 'pollen', 'Pollen cells'],
    ['open_brood', 'brood', 'Open brood'], ['capped_brood', 'brood', 'Capped brood'],
    ['drone_brood', 'brood', 'Drone brood']
  ])('pairs the %s cell key with its compatible colony topic', (role, topic, label) => {
    const result = study({}, 2, 'queen', role);
    expect(result).toMatchObject({ topic: { id: topic }, role: { id: role, label } });
    expect(result.text).toContain('Selected: ' + label + '. Selected category is shown in this model pattern.');
    expect(result.text).toContain('The reading covers the whole colony; it does not count highlighted cells or measure this frame.');
  });

  it.each(['open_brood', 'capped_brood', 'drone_brood'])('never turns %s marks into a stage or caste census', (role) => {
    const result = study({ openBrood: 99, cappedBrood: 100, droneBrood: 101 }, 3, 'brood', role);
    expect(result.value).toBe('6,000.556 cells');
    expect(result.text).toContain('Whole-colony reading — Developing brood: 6,000.556 cells');
    expect(result.text).not.toMatch(/: 99|: 100 |: 101 /);
    expect(result.role.description).toContain('does not measure stage or caste counts');
  });

  it.each(['food', 'pollen', 'brood', 'queen'])('keeps %s as separate context when unmarked comb is selected', (topic) => {
    const result = study({ emptyCells: 70 }, 1, topic, 'empty');
    expect(result.topic.id).toBe(topic);
    expect(result.text).toContain('Selected: Unmarked comb.');
    expect(result.text).toContain('No separate colony reading for unmarked comb. The accompanying reading is separate colony context.');
    expect(result.text).toContain(result.topic.label + ': ' + result.value);
    expect(result.text).not.toContain('70 cells');
    expect(result.role.description).toContain('does not diagnose a missing queen');
  });

  it('reports absence of matching schematic cells without declaring missing colony brood', () => {
    const result = study({}, 0, 'brood', 'open_brood', false);
    expect(result.value).toBe('6,000.556 cells');
    expect(result.text).toContain('No selected-category cells are shown in this model pattern.');
    expect(result.text).not.toMatch(/no brood in the colony|queen is missing/i);
  });

  it('requires an explicit shown boolean before claiming matching cells are visible', () => {
    for (const shown of [undefined, null, 1, 'true', {}]) {
      const result = BH.bhHiveInteriorEvidence(colony(), 2, 'brood', 'open_brood', shown);
      expect(result.text).toContain('No selected-category cells are shown in this model pattern.');
    }
  });

  it('treats queen selection as a score without a location or discovery claim', () => {
    for (const shown of [true, false]) {
      const result = study({}, 2, 'queen', null, shown);
      expect(result.text).toContain('The cutaway does not show the queen’s location.');
      expect(result.text).toContain('Current model score — Queen: 90.123 / 100');
      expect(result.text).not.toContain('Selected category is shown');
      expect(result.topic.description).toContain('does not count as finding her');
    }
  });

  it('normalizes unknown preferences without inventing a category or frame', () => {
    const result = study({}, 99, 'missing-topic', 'missing-role');
    expect(result).toMatchObject({ frame: 0, frameKind: 'Outside', topic: { id: 'brood' }, role: null });
    expect(result.text).toContain('Frame 1/6 · Outside');
    for (const frame of [-1, 6, 2.5, '2', null, undefined, NaN, Infinity]) {
      expect(BH.bhHiveInteriorEvidence(colony(), frame, 'food', null, true).frame).toBe(0);
    }
  });

  it('labels outside, shoulder and centre frames consistently across both sides', () => {
    const kinds = ['Outside', 'Shoulder', 'Centre', 'Centre', 'Shoulder', 'Outside'];
    kinds.forEach((frameKind, frame) => {
      const result = study({}, frame);
      expect(result).toMatchObject({ frame, frameKind });
      expect(result.text).toContain('Frame ' + (frame + 1) + '/6 · ' + frameKind);
    });
  });
});

describe('Hive interior provenance and purity', () => {
  it.each([0, 10000000])('accepts the recorded day boundary %s', (day) => {
    const result = study({ day });
    expect(result.available).toBe(true);
    expect(result.context).toContain('Day ' + day + ' ·');
  });

  it.each([undefined, null, '15', -1, 0.5, NaN, Infinity, 10000001, Number.MAX_SAFE_INTEGER])('requires a valid recorded day to add evidence (%s)', (day) => {
    const result = study({ day });
    expect(result.available).toBe(false);
    expect(result.context).toContain('Day Not recorded');
    expect(result.value).toBe('6,000.556 cells');
  });

  it.each([
    [{ autoAdvance: true }, 'Automatic days on'],
    [{ autoAdvance: true, activeEvent: { id: 'storm' } }, 'Event awaiting review'],
    [{ autoAdvance: true, activeEvent: { id: 'storm' }, colonySurvived: false }, 'Colony ended'],
    [{ autoAdvance: false }, 'Manual days']
  ])('shares the current-colony capture context for %j', (patch, clock) => {
    const input = colony(patch);
    const result = BH.bhHiveInteriorEvidence(input, 2, 'brood', null, true);
    expect(result.context).toBe(BH.bhBeekeeperNotebookCapture(input).context);
    expect(result.context).toContain('Day 15 · ' + clock + ' · Run 3 · Seed 0 · Model colony-daily-1.2');
    expect(result.text).toContain('Hive interior study | ' + result.context + ' |');
  });

  it('keeps missing run identity explicit while preserving recorded readings', () => {
    const result = study({ experimentRunSerial: null, simulationSeed: null, modelVersion: null });
    expect(result.available).toBe(true);
    expect(result.context).toContain('Run Not recorded · Seed Not recorded · Model Not recorded');
  });

  it('is deterministic and leaves frozen colony, preferences, and notebook inputs unchanged', () => {
    const input = Object.freeze(colony({
      hive3dFramesSeen: Object.freeze([0, 2]), hive3dFoundQueen: false,
      notebook: Object.freeze({ beekeeper: Object.freeze({ evidence: 'Existing observation.' }) }),
      history: Object.freeze([Object.freeze({ d: 12, h: 20 })])
    }));
    const before = JSON.stringify(input);
    const first = BH.bhHiveInteriorEvidence(input, 2, 'brood', 'open_brood', true);
    expect(BH.bhHiveInteriorEvidence(input, 2, 'brood', 'open_brood', true)).toEqual(first);
    first.topic.value = 'edited preview';
    expect(BH.bhHiveInteriorEvidence(input, 2, 'brood', 'open_brood', true).value).toBe('6,000.556 cells');
    expect(JSON.stringify(input)).toBe(before);
    expect(first.text).not.toMatch(/capturedAt|timestamp|XP/);
  });
});

describe('Hive interior evidence notebook append', () => {
  it('appends the exact display preview and clears only the evidence review mark', () => {
    const text = study({}, 4, 'food', 'honey').text;
    const entry = Object.freeze({
      evidence: 'My existing observation. ', prediction: 'The pattern will vary.',
      explanation: 'This is my explanation.', customNote: 'Keep this too.',
      review: Object.freeze({ prediction: true, evidence: true, explanation: true })
    });
    const before = JSON.stringify(entry);
    const result = BH.bhAppendNotebookEvidence(entry, text);
    expect(result.status).toBe('added');
    expect(result.entry).toMatchObject({
      evidence: 'My existing observation. \n' + text,
      prediction: entry.prediction, explanation: entry.explanation, customNote: entry.customNote,
      review: { prediction: true, evidence: false, explanation: true }
    });
    expect(result.entry).not.toBe(entry);
    expect(result.entry.review).not.toBe(entry.review);
    expect(JSON.stringify(entry)).toBe(before);
  });

  it('recognizes a duplicate interior record and preserves its writing and review flags', () => {
    const text = study({}, 2, 'brood', 'capped_brood').text;
    const entry = Object.freeze({
      evidence: 'Before.\n' + text + '\nAfter.', explanation: 'Keep my interpretation.',
      review: Object.freeze({ prediction: true, evidence: true, explanation: false })
    });
    const result = BH.bhAppendNotebookEvidence(entry, text);
    expect(result).toMatchObject({ status: 'duplicate', entry });
    expect(result.entry).toBe(entry);
    expect(result.entry.review.evidence).toBe(true);
  });

  it('fits an exact 1,200-character record without truncating the preview', () => {
    const text = study({}, 5, 'pollen', 'pollen').text;
    expect(text.length).toBeLessThan(1199);
    const prefix = 'x'.repeat(1200 - text.length - 1);
    const result = BH.bhAppendNotebookEvidence({ evidence: prefix }, text);
    expect(result.status).toBe('added');
    expect(result.entry.evidence).toBe(prefix + '\n' + text);
    expect(result.entry.evidence).toHaveLength(1200);
  });

  it('refuses an over-capacity record atomically and reports the exact additional room needed', () => {
    const text = study({}, 1, 'queen', 'empty').text;
    const prefix = 'x'.repeat(1200 - text.length);
    const entry = Object.freeze({
      evidence: prefix, prediction: 'Keep prediction.', explanation: 'Keep explanation.',
      review: Object.freeze({ prediction: true, evidence: true, explanation: true })
    });
    const before = JSON.stringify(entry);
    const result = BH.bhAppendNotebookEvidence(entry, text);
    expect(result).toMatchObject({ status: 'full', entry, needed: 1 });
    expect(result.entry).toBe(entry);
    expect(JSON.stringify(entry)).toBe(before);
    const full = Object.freeze({ evidence: 'x'.repeat(1200), review: Object.freeze({ evidence: true }) });
    expect(BH.bhAppendNotebookEvidence(full, text)).toMatchObject({ status: 'full', entry: full, needed: text.length + 1 });
  });
});
