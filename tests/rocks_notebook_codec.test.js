import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const main = readFileSync('stem_lab/stem_tool_rocks.js', 'utf8');
const marker = '// BEGIN ROCKS NOTEBOOK CODEC';
const endMarker = '// END ROCKS NOTEBOOK CODEC';
if (!main.includes(marker) || main.indexOf(endMarker) <= main.indexOf(marker)) throw new Error('Notebook codec source markers are missing from stem_tool_rocks.js');
const source = main.slice(main.indexOf(marker), main.indexOf(endMarker));
const { encode, decode, snapshot, byteLength } = new Function(source + '\nreturn {encode:rkNotebookEncode,decode:rkNotebookDecode,snapshot:rkNotebookSnapshot,byteLength:rkNotebookByteLength};')();
const config = {
  rockIds: ['granite', 'basalt', 'gabbro', 'rhyolite', 'marble', 'limestone'],
  mineralIds: ['quartz', 'feldspar', 'calcite', 'pyrite', 'magnetite', 'galena', 'garnet', 'halite'],
  cases: [{ id: 'deep-cooling', candidates: ['basalt', 'granite', 'gabbro', 'rhyolite'], answer: 'granite', required: ['grains', 'minerals'], clues: [{ id: 'grains' }, { id: 'minerals' }, { id: 'color' }] }],
};
const envelope = (data, version = 1) => ({ format: 'alloflow-rocks-notebook', version, createdAt: '2026-10-29T12:30:00.000Z', data });
const read = (data) => decode(JSON.stringify(envelope(data)), config);
const readV2 = (data) => decode(JSON.stringify(envelope(data, 2)), config);
const report = (n = 1) => ({
  id: 'investigation-' + n, specimenId: 'calcite', specimenLabel: 'Calcite', pool: 'standard',
  observations: [{ tool: 'lens', ref: '', choice: 'glassy', label: 'Glassy' }],
  evidence: [{ key: 'lens', text: 'Luster: glassy' }, { key: 'fizz', text: 'Acid: fizz' }],
  claimEvidence: ['luster', 'acid'], reasoning: 'Both measured properties fit calcite.', confidence: 'very',
  report: 'Mineral Workbench notebook\nClaim: calcite\nEvidence: glassy and fizz.', reflection: 'I would test hardness next time.',
});
const fieldWork = () => ({
  observed: ['grains', 'minerals'], cited: ['grains', 'minerals'], claim: 'granite', reasoning: 'Visible interlocking quartz and feldspar crystals.', feedback: 'supported', solved: true,
  attempts: [{ observed: ['grains', 'minerals'], cited: ['grains', 'minerals'], claim: 'granite', reasoning: 'Visible interlocking quartz and feldspar crystals.', result: 'supported' }],
});
const densityWork = () => ({
  mineralId: 'quartz', volume: 10, initialWater: 30, measured: { mass: true, before: true, after: true },
  estimate: '2.65', units: 'g/cm3', prediction: 'Mass doubles with volume.', explanation: 'The ratio stays the same.',
  trials: [{ mineralId: 'quartz', volume: 10, initialWater: 30, finalWater: 40, mass: 26.5, density: 2.65, estimate: '2.65', units: 'g/cm3', prediction: 'Mass doubles with volume.', explanation: 'The ratio stays the same.' }],
});

describe('portable rocks notebook codec', () => {
  it('round-trips comparison notes, field revisions, archived reports and density investigations', () => {
    const work = {
      compare: { kind: 'rocks', left: 'granite', right: 'basalt', notes: { 'rocks:basalt:granite': 'Visible grains help distinguish them.', 'minerals:calcite:quartz': 'Acid and hardness differ.' }, query: 'quartz', exportText: 'stale snapshot' },
      fieldCases: { activeId: 'deep-cooling', records: { 'deep-cooling': fieldWork() }, notebookText: 'stale snapshot', exportStatus: 'copied' },
      wb: { spId: 'halite', archiveSerial: 99, archive: [report(3)], anim: 'lens' },
      densityLab: { ...densityWork(), feedback: 'correct', recorded: true, exportText: 'stale export' },
      specimenNotes: { 'rocks:granite': { note: 'Interlocking crystals are visible.', question: 'What controls the crystal size?', bookmarked: true } },
      quizScore: 17,
    };
    const saved = JSON.parse(encode(work, config));
    expect(saved.format).toBe('alloflow-rocks-notebook');
    expect(saved.version).toBe(2);
    expect(new Date(saved.createdAt).toISOString()).toBe(saved.createdAt);
    expect(saved.data).not.toHaveProperty('wb');
    expect(saved.data).not.toHaveProperty('quizScore');
    expect(saved.data.compare).not.toHaveProperty('query');
    expect(saved.data.fieldCases).not.toHaveProperty('notebookText');
    expect(saved.data.densityLab).not.toHaveProperty('feedback');
    const restored = decode(JSON.stringify(saved), config);
    expect(restored.archive).toEqual([report(3)]);
    expect(restored.fieldCases.records['deep-cooling']).toEqual(fieldWork());
    expect(restored.compare.notes).toEqual(work.compare.notes);
    expect(restored.densityLab).toEqual(densityWork());
    expect(restored.specimenNotes).toEqual(work.specimenNotes);
    expect(decode(encode({ compare: restored.compare, fieldCases: restored.fieldCases, wb: { archive: restored.archive }, densityLab: restored.densityLab, specimenNotes: restored.specimenNotes }, config), config)).toEqual(restored);
  });

  it('fills missing optional sections and fields without inventing completed work', () => {
    expect(read({})).toEqual({ compare: { notes: {} }, fieldCases: { records: {} }, archive: [] });
    const work = read({ fieldCases: { records: { 'deep-cooling': {} } }, densityLab: {} });
    expect(work.fieldCases.records['deep-cooling']).toEqual({ observed: [], cited: [], claim: '', reasoning: '', solved: false, feedback: '', attempts: [] });
    expect(work.densityLab.measured).toEqual({ mass: false, before: false, after: false });
    expect(work.densityLab.trials).toEqual([]);
  });

  it('preserves Unicode and literal markup as inert text', () => {
    const note = 'معدن 🪨 café <script>bad()</script> __proto__ constructor prototype';
    expect(read({ compare: { notes: { 'rocks:basalt:granite': note } } }).compare.notes['rocks:basalt:granite']).toBe(note);
    expect(byteLength(note)).toBe(Buffer.byteLength(note, 'utf8'));
    expect(byteLength('\ud800')).toBe(Buffer.byteLength('\ud800', 'utf8'));
  });

  it.each([
    [null, /object/], [[], /object/], ['not JSON', /JSON/],
    [{ ...envelope({}), format: 'other' }, /not an AlloFlow/],
    [{ ...envelope({}), version: 3 }, /version/],
    [{ ...envelope({}), version: '1' }, /version/],
    [{ ...envelope({}), createdAt: '2026-02-31T12:00:00.000Z' }, /creation time/],
    [{ ...envelope({}), data: [] }, /data must be an object/],
    [{ ...envelope({}), unrelated: {} }, /unsupported top-level/],
  ])('rejects a malformed envelope %#', (input, message) => {
    expect(() => decode(typeof input === 'string' ? input : JSON.stringify(input), config)).toThrow(message);
  });

  it.each(['__proto__', 'constructor', 'prototype'])('rejects %s properties at any nesting depth without prototype mutation', (key) => {
    const text = JSON.stringify(envelope({ archive: [{ ...report(), observations: [JSON.parse('{"' + key + '":{"polluted":true},"tool":"lens"}')] }] }));
    expect(() => decode(text, config)).toThrow(/forbidden property/);
    expect({}.polluted).toBeUndefined();
  });

  it.each([
    { compare: { notes: { 'rocks:granite:basalt': 'unsorted pair' } } },
    { compare: { notes: { 'rocks:basalt:unknown': 'unknown rock' } } },
    { compare: { notes: { 'minerals:granite:quartz': 'mixed domains' } } },
    { compare: { notes: { 'rocks:basalt:basalt': 'same specimen' } } },
    { compare: { kind: 'minerals', left: 'granite' } },
    { fieldCases: { activeId: 'unknown-case' } },
    { fieldCases: { records: { missing: {} } } },
    { archive: [{ ...report(), specimenId: 'granite' }] },
  ])('rejects unknown specimen and case identifiers %#', (data) => {
    expect(() => read(data)).toThrow(/Notebook:/);
  });

  it('rejects field evidence that was not collected, duplicate evidence, and non-string attempt claims', () => {
    const data = (work) => ({ fieldCases: { records: { 'deep-cooling': work } } });
    expect(() => read(data({ observed: ['grains'], cited: ['minerals'] }))).toThrow(/cited/);
    expect(() => read(data({ observed: ['grains', 'grains'] }))).toThrow(/duplicate/);
    expect(() => read(data({ attempts: [{ ...fieldWork().attempts[0], claim: { bad: true } }] }))).toThrow(/claim/);
    expect(() => read(data({ ...fieldWork(), solved: 'true' }))).toThrow(/true or false/);
  });

  it('rejects bounds violations rather than truncating saved student work', () => {
    expect(() => read({ compare: { notes: { 'rocks:basalt:granite': 'x'.repeat(6001) } } })).toThrow(/6000 characters/);
    expect(() => read({ fieldCases: { records: { 'deep-cooling': { attempts: Array(31).fill(fieldWork().attempts[0]) } } } })).toThrow(/30 entries/);
    expect(() => read({ archive: Array.from({ length: 31 }, (_, i) => report(i + 1)) })).toThrow(/30 entries/);
    expect(() => read({ archive: [{ ...report(), report: 'x'.repeat(60001) }] })).toThrow(/60000 characters/);
    expect(() => read({ archive: [{ ...report(), reflection: 'x'.repeat(2001) }] })).toThrow(/2000 characters/);
    expect(() => read({ archive: [{ ...report(), observations: Array(121).fill({}) }] })).toThrow(/120 entries/);
  });

  it('rejects duplicate archive IDs and unsafe serial numbers', () => {
    expect(() => read({ archive: [report(), report()] })).toThrow(/duplicates/);
    expect(() => read({ archive: [{ ...report(), id: 'investigation-9007199254740992' }] })).toThrow(/identifier/);
  });

  it.each([
    { mineralId: 'halite' }, { volume: 31 }, { volume: 11 }, { initialWater: 0 },
    { measured: { mass: 'yes' } }, { units: 'pounds' }, { estimate: '1'.repeat(33) },
    { prediction: 'x'.repeat(2001) }, { explanation: 'x'.repeat(4001) },
    { trials: [{ ...densityWork().trials[0], mass: '26.5' }] },
    { trials: [{ ...densityWork().trials[0], finalWater: 150 }] },
    { trials: [{ ...densityWork().trials[0], density: -1 }] },
    { trials: [{ ...densityWork().trials[0], finalWater: 45 }] },
    { trials: [{ ...densityWork().trials[0], density: 3 }] },
    { trials: [{ ...densityWork().trials[0], mass: 0, density: 0 }] },
    { trials: [{ ...densityWork().trials[0], mineralId: undefined }] },
    { trials: [{ ...densityWork().trials[0], volume: undefined }] },
  ])('rejects invalid density measurements or written-work values %#', (patch) => {
    expect(() => read({ densityLab: { ...densityWork(), ...patch } })).toThrow(/densityLab/);
  });

  it('enforces the 1 MB UTF-8 limit before parsing and after encoding', () => {
    expect(() => decode(' '.repeat(1024 * 1024 + 1), config)).toThrow(/1 MB/);
    const unicode = JSON.stringify(envelope({ compare: { notes: { 'rocks:basalt:granite': '🪨'.repeat(270000) } } }));
    expect(unicode.length).toBeLessThan(1024 * 1024);
    expect(() => decode(unicode, config)).toThrow(/1 MB/);
    const wb = { archive: Array.from({ length: 30 }, (_, i) => ({ ...report(i + 1), report: 'x'.repeat(40000) })) };
    expect(snapshot({ wb }, config).archive).toHaveLength(30);
    expect(() => encode({ wb }, config)).toThrow(/1 MB/);
  });

  it('does not mutate caller state, evaluate accessors, or accept functions as saved writing', () => {
    const state = { compare: { notes: { 'rocks:basalt:granite': 'Keep exactly.' } }, wb: { archive: [report()] } };
    const before = JSON.stringify(state);
    const decoded = decode(encode(state, config), config);
    decoded.archive[0].reflection = 'Changed elsewhere';
    expect(JSON.stringify(state)).toBe(before);
    expect(() => encode({ compare: { notes: { 'rocks:basalt:granite': () => 'not text' } } }, config)).toThrow(/must be text/);
    let accessed = false;
    const notes = {};
    Object.defineProperty(notes, 'rocks:basalt:granite', { enumerable: true, get() { accessed = true; return 'bad'; } });
    expect(() => encode({ compare: { notes } }, config)).toThrow(/stored value/);
    expect(accessed).toBe(false);
    expect(() => encode({ wb: { archive: new Array(1) } }, config)).toThrow(/stored value/);
  });

  it('distinguishes legacy backups from an explicitly empty version 2 journal', () => {
    expect(read({})).not.toHaveProperty('specimenNotes');
    expect(readV2({ specimenNotes: {} }).specimenNotes).toEqual({});
    expect(() => read({ specimenNotes: {} })).toThrow(/version 1 does not support/);
    expect(() => readV2({})).toThrow(/version 2 must include/);
    expect(JSON.parse(encode({}, config))).toMatchObject({ version: 2, data: { specimenNotes: {} } });
  });

  it('keeps Unicode study writing, bookmarks and questions but omits empty entries', () => {
    const note = '岩石 🪨 <script>inert()</script>';
    const journal = { 'rocks:granite': { note, question: 'Can grains grow later?', bookmarked: true }, 'minerals:quartz': { bookmarked: true }, 'rocks:basalt': { note: '  ', question: '\n', bookmarked: false } };
    const result = readV2({ specimenNotes: journal }).specimenNotes;
    expect(result['rocks:granite']).toEqual(journal['rocks:granite']);
    expect(result['minerals:quartz']).toEqual({ note: '', question: '', bookmarked: true });
    expect(result).not.toHaveProperty('rocks:basalt');
    expect(journal['rocks:basalt'].note).toBe('  ');
  });

  it.each([
    { 'rocks:missing': { bookmarked: true } },
    { 'rocks:quartz': { note: 'Wrong catalogue' } },
    { 'minerals:granite': { note: 'Wrong catalogue' } },
    { 'minerals:quartz:extra': { note: 'Extra key part' } },
    { 'rocks:granite': { note: 'x'.repeat(3001) } },
    { 'rocks:granite': { question: 'x'.repeat(1001) } },
    { 'rocks:granite': { bookmarked: 'true' } },
    { 'rocks:granite': { note: 42 } },
    { 'rocks:granite': { grading: 'correct' } },
    { 'rocks:granite': null }, null, [],
  ])('rejects invalid specimen journal records without truncation %#', (specimenNotes) => {
    expect(() => readV2({ specimenNotes })).toThrow(/specimenNotes/);
  });

  it('accepts every known catalogue ID once and bounds the journal by that catalogue', () => {
    const specimenNotes = Object.fromEntries(config.rockIds.map(id => ['rocks:' + id, { bookmarked: true }]).concat(config.mineralIds.map(id => ['minerals:' + id, { bookmarked: true }])));
    expect(Object.keys(readV2({ specimenNotes }).specimenNotes)).toHaveLength(config.rockIds.length + config.mineralIds.length);
    expect(() => readV2({ specimenNotes: { ...specimenNotes, 'rocks:extra': { bookmarked: true } } })).toThrow(/number of known specimens/);
  });

  it('rejects journal accessors without evaluating them and never derives notes from a mystery sample', () => {
    let accessed = false;
    const state = {};
    Object.defineProperty(state, 'specimenNotes', { enumerable: true, get() { accessed = true; return {}; } });
    expect(() => snapshot(state, config)).toThrow(/stored value/);
    expect(accessed).toBe(false);
    const entry = {};
    Object.defineProperty(entry, 'note', { enumerable: true, get() { accessed = true; return 'not safe'; } });
    expect(() => snapshot({ specimenNotes: { 'rocks:granite': entry } }, config)).toThrow(/stored value/);
    expect(accessed).toBe(false);
    expect(snapshot({ wb: { spId: 'halite', guess: 'quartz' }, selectedRock: 'granite' }, config).specimenNotes).toEqual({});
    expect(() => snapshot({ specimenNotes: null }, config)).toThrow(/specimenNotes/);
  });
});
