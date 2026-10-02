import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let core;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
  core = window.__MicrobiologyCore;
});
afterEach(() => vi.restoreAllMocks());
const conditions = (patch = {}) => ({ profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100, ...patch });
const savedRun = () => ({ dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original run notes.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }], futureEvidence: { keep: true } });
function config(lab) {
  return lab === 'growth' ? { api: core.growth, rows: 'trials', field: 'explanation', change: 'changeExplanation',
    make: (id, text = 'Original annotation.') => ({ id, control: conditions(), conditions: conditions({ oxygen: 0 }), prediction: 'higher', hypothesis: 'Before-run reasoning.', explanation: text, citedHours: [0, 6], futureTrial: { keep: true } }) } :
    { api: core.resistance, rows: 'records', field: 'reviewNote', change: 'changeReviewNote',
      make: (id, text = 'Original annotation.') => ({ id, evidence: savedRun(), reviewNote: text, futureRecord: { keep: true } }) };
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

describe.each(['growth', 'resistance'])('%s targeted saved annotation integrity', lab => {
  it('returns a frozen ownership token for the original retained record without freezing caller data', () => {
    const { api, rows, make } = config(lab), target = make(7), book = { [rows]: [target], selectedId: 7 };
    const owner = api.annotationOwner(book, 7);
    expect(owner).toEqual({ id: 7, record: target }); expect(owner.record).toBe(target);
    expect(Object.isFrozen(owner)).toBe(true); expect(Object.isFrozen(target)).toBe(false); expect(Object.isFrozen(book)).toBe(false);
    expect(api.annotationOwner(book, 8)).toBeNull(); expect(api.annotationOwner(book, '7')).toBeNull();
  });

  it('changes only the target annotation in a deeply frozen oversized raw import', () => {
    const { api, rows, field, change, make } = config(lab);
    const records = Array.from({ length: 24 }, (_, index) => make(index + 1, index === 23 ? 'Target before.' : 'x'.repeat(1400)));
    const target = records[23], rawRows = [null, ...records.slice(0, 20), { id: 'malformed', extra: 'KEEP' }, ...records.slice(20), 'bad tail'];
    const book = { [rows]: rawRows, selectedId: 22, nextId: 999, prediction: 'lower', hypothesis: 'Pending reasoning.', explanation: 'Pending root explanation.',
      control: { ...conditions({ tempC: 20 }), futureControl: ['keep'] }, sweep: { variable: 'pH', conditions: conditions() }, previousSweep: { variable: 'oxygen', conditions: conditions() },
      removed: lab === 'growth' ? { trial: make(40), index: 0, extra: 'RECOVERY' } : { record: make(40), index: 0, extra: 'RECOVERY' },
      comparison: { aId: 21, bId: 24 }, futureNotebook: { preserve: true } };
    const before = JSON.stringify(book), owner = api.annotationOwner(book, 24), targetIndex = rawRows.indexOf(target); freeze(book);
    const result = api[change](book, 24, 'Learner revision.', owner);
    expect(result).toMatchObject({ changed: true, status: 'updated', id: 24 }); expect(Object.isFrozen(result)).toBe(true);
    const expected = JSON.parse(before); expected[rows][targetIndex][field] = 'Learner revision.';
    expect(result.notebook).toEqual(expected); expect(result.notebook[rows]).toHaveLength(rawRows.length);
    expect(result.notebook).not.toBe(book); expect(result.notebook[rows]).not.toBe(rawRows); expect(result.notebook[rows][targetIndex]).not.toBe(target);
    rawRows.forEach((item, index) => { if (index !== targetIndex) expect(result.notebook[rows][index]).toBe(item); });
    for (const key of Object.keys(target).filter(key => key !== field)) expect(result.notebook[rows][targetIndex][key]).toBe(target[key]);
    expect(result.notebook.removed).toBe(book.removed); expect(result.notebook.futureNotebook).toBe(book.futureNotebook);
    expect(JSON.stringify(book)).toBe(before);
  });

  it('normalizes only the edited text while retaining whitespace, Unicode, line breaks and the 1200-character limit', () => {
    const { api, rows, field, change, make } = config(lab), book = { [rows]: [make(7), make(8, 'Unrelated\u0001' + 'z'.repeat(1400))] };
    const input = '  "Literal", café\n\tline\r\n\u0000\u0001' + 'a'.repeat(1400);
    const expected = ('  "Literal", café\n\tline\r\n' + 'a'.repeat(1400)).slice(0, 1200);
    const result = api[change](book, 7, input);
    expect(result.notebook[rows][0][field]).toBe(expected); expect(result.notebook[rows][0][field]).toHaveLength(1200);
    expect(result.notebook[rows][1]).toBe(book[rows][1]);
    expect(api.normalizeNotebook(result.notebook)[rows][0][field]).toBe(expected);
    expect(api[change](result.notebook, 7, '').notebook[rows][0][field]).toBe('');
  });

  it('preserves original raw bytes and object identity when normalized text has not changed', () => {
    const { api, rows, field, change, make } = config(lab);
    const cases = [['Same\u0001 text', 'Same text'], ['x'.repeat(1400), 'x'.repeat(1200)], [undefined, ''], [{ malformed: true }, '']];
    for (const [original, requested] of cases) {
      const record = make(7); if (original === undefined) delete record[field]; else record[field] = original;
      const book = freeze({ [rows]: [record], extra: 'UNCHANGED' }), before = JSON.stringify(book);
      const result = api[change](book, 7, requested, api.annotationOwner(book, 7));
      expect(result).toMatchObject({ changed: false, status: 'unchanged', id: 7 }); expect(result.notebook).toBe(book);
      expect(JSON.stringify(book)).toBe(before);
      if (original === undefined) expect(result.notebook[rows][0]).not.toHaveProperty(field);
    }
  });

  it('rejects unsupported roots, row containers, IDs, and nonstring edits without coercion', () => {
    const { api, rows, change, make } = config(lab);
    for (const invalid of [undefined, null, [], 'raw', 0, true, {}, { [rows]: {} }]) {
      const result = api[change](invalid, 7, 'Changed');
      expect(result).toMatchObject({ changed: false, status: 'invalid', id: null }); expect(result.notebook).toBe(invalid);
      expect(api.annotationOwner(invalid, 7)).toBeNull();
    }
    const book = { [rows]: [make(7)] };
    for (const id of [undefined, null, '7', 0, -1, 7.5, Infinity, 1000000001]) expect(api[change](book, id, 'Changed')).toMatchObject({ notebook: book, changed: false, status: 'invalid', id: null });
    for (const text of [undefined, null, false, 42, {}, [], new String('text')]) expect(api[change](book, 7, text)).toMatchObject({ notebook: book, changed: false, status: 'invalid', id: null });
    expect(api[change]({ [rows]: [] }, 7, 'Changed')).toMatchObject({ changed: false, status: 'missing', id: null });
  });

  it('targets the first retained valid-ID owner and rejects IDs allocated only by repair', () => {
    const { api, rows, field, change, make } = config(lab);
    const book = { [rows]: [make('bad', 'Invalid-ID owner'), make(1, 'First valid owner'), make(1, 'Duplicate owner'), make(9)], selectedId: 2 };
    expect(api.normalizeNotebook(book)[rows].map(record => record.id)).toEqual([2, 1, 3, 9]);
    expect(api.annotationOwner(book, 1).record).toBe(book[rows][1]);
    for (const id of [2, 3]) {
      expect(api.annotationOwner(book, id)).toBeNull();
      expect(api[change](book, id, 'Do not redirect')).toMatchObject({ notebook: book, changed: false, status: 'missing' });
    }
    const result = api[change](book, 1, 'First owner changed', api.annotationOwner(book, 1));
    expect(result.notebook[rows][1][field]).toBe('First owner changed');
    expect(result.notebook[rows][0]).toBe(book[rows][0]); expect(result.notebook[rows][2]).toBe(book[rows][2]);
    expect(result.notebook.selectedId).toBe(2); expect(api.normalizeNotebook(result.notebook).selectedId).toBeNull();
    expect(api[change](JSON.parse(JSON.stringify(result.notebook)), 2, 'Still unavailable').status).toBe('missing');
  });

  it('does not borrow ownership from a dropped record or a recoverable-only record', () => {
    const { api, rows, change, make } = config(lab);
    const records = [make(1), ...Array.from({ length: api.maxRecords - 1 }, (_, index) => make(index + 2)), make('bad')];
    const book = { [rows]: records, selectedId: 1 };
    expect(api.normalizeNotebook(book)[rows].at(-1).id).toBe(1);
    expect(api.annotationOwner(book, 1)).toBeNull(); expect(api[change](book, 1, 'Wrong owner').status).toBe('missing');
    const removedOnly = { [rows]: [], removed: lab === 'growth' ? { trial: make(7), index: 0 } : { record: make(7), index: 0 } };
    expect(api.annotationOwner(removedOnly, 7)).toBeNull(); expect(api[change](removedOnly, 7, 'Must restore first').notebook).toBe(removedOnly);
    expect(api[change](removedOnly, 7, 'Must restore first').status).toBe('missing');
  });

  it('rejects a stale owner after same-ID replacement, including a byte-identical JSON replacement', () => {
    const { api, rows, change, make } = config(lab), old = { [rows]: [make(7)] }, owner = api.annotationOwner(old, 7);
    for (const replacement of [make(7, 'Newer learner writing'), JSON.parse(JSON.stringify(old[rows][0]))]) {
      const latest = { [rows]: [replacement], latestExtra: 'keep' }, before = JSON.stringify(latest);
      const result = api[change](latest, 7, 'Stale field input', owner);
      expect(result).toMatchObject({ changed: false, status: 'stale', id: 7 }); expect(result.notebook).toBe(latest);
      expect(JSON.stringify(latest)).toBe(before);
    }
  });

  it('rejects prior ownership after deletion or a different duplicate takes first ownership', () => {
    const { api, rows, change, make } = config(lab), old = { [rows]: [make(7), make(8)] }, owner = api.annotationOwner(old, 7);
    const removed = { [rows]: [old[rows][1]] };
    expect(api[change](removed, 7, 'Late input', owner)).toMatchObject({ notebook: removed, changed: false, status: 'missing' });
    const duplicate = { [rows]: [make(7, 'New first owner'), ...old[rows]] };
    expect(api[change](duplicate, 7, 'Late input', owner)).toMatchObject({ notebook: duplicate, changed: false, status: 'stale' });
    for (const badOwner of [null, false, [], { id: 8, record: old[rows][0] }, { id: 7 }]) expect(api[change](old, 7, 'Late input', badOwner).status).toBe('stale');
  });

  it('permits the same original owner after unrelated latest-state edits and resolves its current raw position', () => {
    const { api, rows, field, change, make } = config(lab), target = make(7), old = { [rows]: [target, make(8)], selectedId: 7 };
    const owner = api.annotationOwner(old, 7), latest = { ...old, [rows]: [null, make(9), target, { ...old[rows][1], future: 'new' }], selectedId: 8, latestDraft: 'Do not erase' };
    const result = api[change](latest, 7, 'Latest valid input', owner);
    expect(result.status).toBe('updated'); expect(result.notebook[rows][2][field]).toBe('Latest valid input');
    expect(result.notebook[rows][1]).toBe(latest[rows][1]); expect(result.notebook[rows][3]).toBe(latest[rows][3]);
    expect(result.notebook.selectedId).toBe(8); expect(result.notebook.latestDraft).toBe('Do not erase');
  });

  it('permits a repaired displayed record only after its canonical identity was explicitly saved', () => {
    const { api, rows, field, change, make } = config(lab), raw = { [rows]: [make('bad'), make(9)] };
    expect(api[change](raw, 1, 'Unavailable').status).toBe('missing');
    const canonical = { ...api.normalizeNotebook(raw), selectedId: 1 }, owner = api.annotationOwner(canonical, 1);
    const result = api[change](canonical, 1, 'Explicit chosen record', owner);
    expect(result.status).toBe('updated'); expect(result.notebook[rows][0][field]).toBe('Explicit chosen record');
    expect(result.notebook.selectedId).toBe(1); expect(result.notebook[rows][1]).toBe(canonical[rows][1]);
  });

  it('supports the maximum valid ID without changing counters or legacy normalization shape', () => {
    const { api, rows, field, change, make } = config(lab), book = { [rows]: [make(1000000000)], selectedId: 1000000000, nextId: 1 };
    const prior = api.normalizeNotebook(book), result = api[change](book, 1000000000, 'Bounded ID annotation');
    expect(result.status).toBe('updated'); expect(result.notebook.nextId).toBe(1);
    const after = api.normalizeNotebook(result.notebook);
    expect(Object.keys(after)).toEqual(Object.keys(prior)); expect(Object.keys(after[rows][0])).toEqual(Object.keys(prior[rows][0]));
    expect(after[rows][0][field]).toBe('Bounded ID annotation');
  });

  it('leaves original evidence, other work, XP, RNG and timestamps untouched through annotation and JSON reload', () => {
    const { api, rows, field, change, make } = config(lab), notebook = { [rows]: [make(7)], selectedId: 7, nextId: 8, future: 'keep' };
    const state = { notebook, xp: 871, growthReviewHour: 6, resistancePlaying: true, resistanceComparison: { aId: 4, bId: 9 }, otherDraft: 'keep' };
    const before = JSON.stringify(state); freeze(state);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('No simulation'); });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('No timestamp'); });
    const result = api[change](notebook, 7, 'Later annotation', api.annotationOwner(notebook, 7));
    const reloaded = JSON.parse(JSON.stringify(result.notebook));
    expect(api[change](reloaded, 7, 'Later annotation', api.annotationOwner(reloaded, 7))).toMatchObject({ changed: false, status: 'unchanged' });
    const oldRecord = { ...notebook[rows][0] }, newRecord = { ...result.notebook[rows][0] }; delete oldRecord[field]; delete newRecord[field];
    expect(newRecord).toEqual(oldRecord); expect(JSON.stringify(state)).toBe(before); expect(state.xp).toBe(871);
    expect(random).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
  });
});

describe('Activity-specific annotation preservation', () => {
  it('Growth keeps exact original settings, citation descriptors and pending/recovery/sweep state while changing an explanation', () => {
    const { api, make } = config('growth'), target = make(7);
    target.control.futureControl = ['keep']; target.conditions.tempC = 'legacy numeric text'; target.citedHours = [24, 6, 6, '0'];
    const book = { trials: [target], control: conditions({ tempC: 20 }), prediction: 'lower', hypothesis: 'Pending hypothesis.', explanation: 'Pending explanation.',
      removed: { trial: make(9), index: 0 }, sweep: { variable: 'tempC', conditions: conditions() }, previousSweep: { variable: 'pH', conditions: conditions() } };
    const result = api.changeExplanation(book, 7, 'Explanation using the saved curve.', api.annotationOwner(book, 7));
    expect(result.notebook.trials[0].citedHours).toBe(target.citedHours); expect(result.notebook.trials[0].conditions).toBe(target.conditions);
    expect(result.notebook.trials[0].control).toBe(target.control); expect(result.notebook.trials[0].prediction).toBe('higher');
    for (const field of ['control', 'prediction', 'hypothesis', 'explanation', 'removed', 'sweep', 'previousSweep']) expect(result.notebook[field]).toBe(book[field]);
  });

  it('Resistance filters invalid or unobserved records before applying its retained window and never rewrites observed history', () => {
    const { api, make } = config('resistance'), records = Array.from({ length: 10 }, (_, index) => make(index + 1));
    const target = records[9]; target.evidence.notes = 'Original\u0001' + 'n'.repeat(1500); target.evidence.history[1].futureObservation = 'literal';
    const raw = { records: [records[0], { id: 99, evidence: { ...savedRun(), history: [{ day: 0, sensitive: 72, resistant: 8 }] } },
      ...records.slice(1), ...Array.from({ length: 10 }, (_, index) => ({ id: 200 + index, evidence: {} }))], nextId: 900 };
    const result = api.changeReviewNote(raw, 10, 'Reflection after reading counts.', api.annotationOwner(raw, 10));
    expect(result.status).toBe('updated'); expect(result.notebook.records).toHaveLength(raw.records.length);
    const at = raw.records.indexOf(target); expect(result.notebook.records[at].evidence).toBe(target.evidence);
    expect(result.notebook.records[at].evidence.history).toBe(target.evidence.history);
    expect(api.annotationOwner(raw, 1)).toBeNull(); expect(api.annotationOwner(raw, 99)).toBeNull();
    expect(api.normalizeNotebook(result.notebook).records.map(record => record.id)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('Resistance preserves raw comparison identity rules when another valid record is annotated', () => {
    const { api, make } = config('resistance'), raw = { records: [make('bad'), make(9)], selectedId: 1, nextId: 20 }, pair = { aId: 1, bId: 9 };
    const before = api.normalizeComparison(pair, raw);
    const result = api.changeReviewNote(raw, 9, 'Review the original valid record.', api.annotationOwner(raw, 9));
    expect(result.notebook.records[0]).toBe(raw.records[0]); expect(result.notebook.selectedId).toBe(1);
    expect(before).toEqual({ aId: null, bId: 9 }); expect(api.normalizeComparison(pair, result.notebook)).toEqual(before);
    expect(api.normalizeNotebook(JSON.parse(JSON.stringify(result.notebook))).selectedId).toBeNull();
  });

  it('retains the existing Resistance setReviewNote contract separately from targeted raw-preserving changes', () => {
    const { api, make } = config('resistance'), raw = { records: [make(7)], extra: 'raw-only' };
    const legacy = api.setReviewNote(raw, 7, 'Legacy annotation');
    expect(legacy.status).toBe('updated'); expect(legacy.notebook).toEqual(api.normalizeNotebook({ ...raw, records: [{ ...raw.records[0], reviewNote: 'Legacy annotation' }] }));
    expect(Object.isFrozen(legacy.notebook.records[0].evidence.history)).toBe(true);
    const targeted = api.changeReviewNote(raw, 7, 'Targeted annotation');
    expect(targeted.notebook.extra).toBe('raw-only'); expect(targeted.notebook.records[0].evidence).toBe(raw.records[0].evidence);
  });
});

describe.each(['growth', 'resistance'])('%s raw-preserving saved record selection', lab => {
  const selectName = lab === 'growth' ? 'selectTrial' : 'selectRecord';

  it('copies only selectedId in a deeply frozen oversized notebook and preserves every row and nested field', () => {
    const { api, rows, make } = config(lab), records = Array.from({ length: 24 }, (_, index) => make(index + 1, 'raw\u0001' + 'x'.repeat(1400)));
    const rawRows = [null, ...records, { invalid: true }, 'malformed tail'];
    const book = { [rows]: rawRows, selectedId: 23, nextId: 900, control: conditions({ tempC: 20 }), prediction: 'unsure', hypothesis: 'Draft.', explanation: 'Root note.',
      sweep: { variable: 'pH', conditions: conditions() }, previousSweep: { variable: 'oxygen', conditions: conditions() },
      removed: lab === 'growth' ? { trial: make(40), index: 0 } : { record: make(40), index: 0 }, comparison: { aId: 22, bId: 24 }, extra: { keep: true } };
    const before = JSON.stringify(book), owner = api.annotationOwner(book, 24); freeze(book);
    const result = api[selectName](book, 24, owner);
    expect(result).toMatchObject({ changed: true, status: 'selected', id: 24 }); expect(Object.isFrozen(result)).toBe(true);
    expect(result.notebook).toEqual({ ...book, selectedId: 24 }); expect(result.notebook).not.toBe(book);
    for (const key of Object.keys(book).filter(key => key !== 'selectedId')) expect(result.notebook[key]).toBe(book[key]);
    expect(result.notebook[rows]).toHaveLength(rawRows.length); expect(JSON.stringify(book)).toBe(before);
  });

  it('returns the original raw notebook when the legitimate selection is already current, without normalizing anything', () => {
    const { api, rows, make } = config(lab), book = freeze({ [rows]: [make('bad'), make(9, 'x'.repeat(1500))], selectedId: 9, extra: 'keep' });
    const result = api[selectName](book, 9, api.annotationOwner(book, 9));
    expect(result).toMatchObject({ changed: false, status: 'unchanged', id: 9 }); expect(result.notebook).toBe(book);
    expect(result.notebook[rows][0].id).toBe('bad');
    const replaced = { ...book, [rows]: [book[rows][0], make(9)] };
    expect(api[selectName](replaced, 9, api.annotationOwner(book, 9))).toMatchObject({ notebook: replaced, changed: false, status: 'stale' });
  });

  it('rejects invalid arguments and absent, removed, or generated identities even if selectedId already matches them', () => {
    const { api, rows, make } = config(lab), raw = { [rows]: [make('bad'), make(9)], selectedId: 1 };
    for (const input of [undefined, null, [], 'raw', {}, { [rows]: {} }]) {
      const result = api[selectName](input, 9); expect(result.status).toBe('invalid'); expect(result.notebook).toBe(input);
    }
    for (const id of [undefined, null, '9', 0, -1, 1.5, Infinity, 1000000001]) expect(api[selectName](raw, id)).toMatchObject({ notebook: raw, changed: false, status: 'invalid', id: null });
    expect(api[selectName](raw, 1)).toMatchObject({ notebook: raw, changed: false, status: 'missing', id: null });
    expect(api[selectName](raw, 8)).toMatchObject({ notebook: raw, changed: false, status: 'missing' });
    const removed = { [rows]: [], selectedId: 7, removed: lab === 'growth' ? { trial: make(7), index: 0 } : { record: make(7), index: 0 } };
    expect(api[selectName](removed, 7)).toMatchObject({ notebook: removed, changed: false, status: 'missing' });
  });

  it('selects the first original duplicate owner without repairing other IDs or activating stale comparison preferences', () => {
    const { api, rows, make } = config(lab), raw = { [rows]: [make('bad'), make(1, 'First owner'), make(1, 'Duplicate owner'), make(9)], selectedId: 3 };
    const result = api[selectName](raw, 1, api.annotationOwner(raw, 1));
    expect(result.status).toBe('selected'); expect(result.notebook[rows]).toBe(raw[rows]);
    expect(result.notebook[rows].map(record => record.id)).toEqual(['bad', 1, 1, 9]);
    expect(api.annotationOwner(result.notebook, 1).record).toBe(raw[rows][1]);
    for (const repaired of [2, 3]) expect(api[selectName](result.notebook, repaired).status).toBe('missing');
    if (lab === 'resistance') expect(api.normalizeComparison({ aId: 2, bId: 9 }, result.notebook)).toEqual({ aId: null, bId: 9 });
  });

  it('rejects stale same-ID replacements, shifted retained windows, and a different first duplicate owner', () => {
    const { api, rows, make } = config(lab), raw = { [rows]: [make(7), make(8)], selectedId: 8 }, owner = api.annotationOwner(raw, 7);
    const replaced = { ...raw, [rows]: [JSON.parse(JSON.stringify(raw[rows][0])), raw[rows][1]] };
    expect(api[selectName](replaced, 7, owner)).toMatchObject({ notebook: replaced, changed: false, status: 'stale' });
    const duplicate = { ...raw, [rows]: [make(7, 'New first owner'), ...raw[rows]] };
    expect(api[selectName](duplicate, 7, owner)).toMatchObject({ notebook: duplicate, changed: false, status: 'stale' });
    const shifted = { ...raw, [rows]: [...raw[rows], ...Array.from({ length: api.maxRecords }, (_, index) => make(100 + index))] };
    expect(api[selectName](shifted, 7, owner)).toMatchObject({ notebook: shifted, changed: false, status: 'missing' });
    const droppedId = { [rows]: [make(1), ...Array.from({ length: api.maxRecords - 1 }, (_, index) => make(index + 2)), make('bad')], selectedId: 1 };
    expect(api.normalizeNotebook(droppedId)[rows].at(-1).id).toBe(1);
    expect(api[selectName](droppedId, 1).status).toBe('missing');
  });

  it('uses latest unrelated notebook updates and retains original ownership for a subsequent targeted annotation', () => {
    const { api, rows, field, change, make } = config(lab), raw = { [rows]: [make(7), make(8)], selectedId: 8 }, owner = api.annotationOwner(raw, 7);
    const latest = { ...raw, [rows]: [null, ...raw[rows]], pending: 'A newer draft', nextId: 900 };
    const selected = api[selectName](latest, 7, owner);
    expect(selected.status).toBe('selected'); expect(selected.notebook[rows]).toBe(latest[rows]); expect(selected.notebook.pending).toBe('A newer draft');
    expect(api.annotationOwner(selected.notebook, 7).record).toBe(owner.record);
    const annotated = api[change](selected.notebook, 7, 'Written after selection', owner);
    expect(annotated.status).toBe('updated'); expect(annotated.notebook[rows][1][field]).toBe('Written after selection');
    expect(annotated.notebook.pending).toBe('A newer draft'); expect(annotated.notebook.selectedId).toBe(7);
  });

  it('preserves raw state and selection identity through JSON without RNG, timestamps, XP, or notebook canonicalization', () => {
    const { api, rows, make } = config(lab), notebook = { [rows]: [make('bad'), make(9)], selectedId: 1, nextId: 20, rawExtra: 'KEEP' };
    const state = { notebook, xp: 600, playing: true, comparison: { aId: 1, bId: 9 }, citedHour: 6 }, before = JSON.stringify(state); freeze(state);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('No sampling'); });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('No timestamp'); });
    const selected = api[selectName](notebook, 9, api.annotationOwner(notebook, 9));
    const reloaded = JSON.parse(JSON.stringify(selected.notebook));
    expect(reloaded[rows][0].id).toBe('bad'); expect(reloaded.selectedId).toBe(9);
    expect(api[selectName](reloaded, 9, api.annotationOwner(reloaded, 9)).status).toBe('unchanged');
    expect(api[selectName](reloaded, 1).status).toBe('missing'); expect(JSON.stringify(state)).toBe(before);
    expect(random).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled(); expect(state.xp).toBe(600);
  });
});
