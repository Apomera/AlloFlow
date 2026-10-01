import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let core, growth;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
  core = window.__MicrobiologyCore;
  growth = core.growth;
});
afterEach(() => vi.restoreAllMocks());
const conditions = (patch = {}) => ({ profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100, ...patch });
const trial = (id = 7, patch = {}) => ({ id, control: conditions(), conditions: conditions({ oxygen: 0 }), prediction: 'higher', hypothesis: 'Original hypothesis.', explanation: 'My later explanation.', ...patch });
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function csvRows(csv) {
  const records = []; let row = [];
  const cells = [...csv.matchAll(/"((?:[^"]|"")*)"(,|\r\n|$)/g)];
  expect(cells.map(cell => cell[0]).join('')).toBe(csv);
  for (const cell of cells) {
    row.push(cell[1].replace(/""/g, '"'));
    if (cell[2] !== ',') { records.push(row); row = []; }
  }
  const [headers, ...data] = records;
  return { headers, rows: data.map(values => {
    expect(values).toHaveLength(headers.length);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  }) };
}
const withoutCitations = value => Object.fromEntries(Object.entries(value).filter(([key]) => !key.startsWith('cited_')));

describe('Growth explanation evidence citations', () => {
  it('retains the first three distinct valid hours, then displays them chronologically', () => {
    const input = trial(7, { citedHours: [24, '6', null, 6, 24, 0, 12, true, 2.5, -1, 25, Infinity, NaN] });
    const normalized = growth.normalizeNotebook({ trials: [input] }).trials[0];
    expect(normalized.citedHours).toEqual([0, 6, 24]);
    expect(Object.isFrozen(normalized.citedHours)).toBe(true);
    expect(input.citedHours).toHaveLength(13);
    expect(growth.citedEvidence(input).map(point => point.hour)).toEqual([0, 6, 24]);
  });

  it('keeps the legacy normalized shape unchanged when there are no valid citations', () => {
    const expected = { id: 7, control: conditions(), conditions: conditions({ oxygen: 0 }), prediction: 'higher', hypothesis: 'Original hypothesis.', explanation: 'My later explanation.' };
    for (const citedHours of [undefined, null, [], {}, '6', [true, '0', 3.5, -1, 25, Infinity, NaN]]) {
      const normalized = growth.normalizeNotebook({ trials: [trial(7, { citedHours })] }).trials[0];
      expect(normalized).toEqual(expected);
      expect(normalized).not.toHaveProperty('citedHours');
    }
  });

  it('derives independent numeric populations from the original model conditions without accepting forged values', () => {
    const saved = trial(7, { citedHours: [6], citedEvidence: [{ hour: 6, controlPopulation: 900, trialPopulation: 800, difference: -100 }], population: 999 });
    // At these chosen optima, oxygen alone sets score 1 vs 0.65; lag is
    // 2 vs 4.1 hours and rate is 0.4 vs 0.26 per model hour.
    const expectedControl = 100 / (1 + 19 * Math.exp(-0.4 * (6 - 2)));
    const expectedTrial = 100 / (1 + 19 * Math.exp(-0.26 * (6 - 4.1)));
    const result = growth.evidenceAt(saved, 6);
    expect(Object.keys(result)).toEqual(['hour', 'controlPopulation', 'trialPopulation', 'difference']);
    expect(result.controlPopulation).toBeCloseTo(expectedControl, 12);
    expect(result.trialPopulation).toBeCloseTo(expectedTrial, 12);
    expect(result.difference).toBeCloseTo(expectedTrial - expectedControl, 12);
    expect(Object.isFrozen(result)).toBe(true);
    expect(growth.citedEvidence(saved)).toEqual([result]);
    expect(Object.isFrozen(growth.citedEvidence(saved))).toBe(true);
  });

  it('keeps shared inoculum evidence at hour zero and represents missing control values as null', () => {
    expect(growth.evidenceAt(trial(), 0)).toEqual({ hour: 0, controlPopulation: 5, trialPopulation: 5, difference: 0 });
    expect(growth.evidenceAt(trial(9, { control: null }), 0)).toEqual({ hour: 0, controlPopulation: null, trialPopulation: 5, difference: null });
    expect(growth.citedEvidence(trial(9, { control: null, citedHours: [0, 24] })).every(row => row.controlPopulation === null && row.difference === null)).toBe(true);
  });

  it.each([undefined, null, '6', true, {}, [], -1, 25, 6.5, Infinity, NaN])('rejects an invalid hour instead of rounding, coercing, or clamping it: %s', hour => {
    expect(growth.evidenceAt(trial(), hour)).toBeNull();
    const book = { trials: [trial()] };
    const result = growth.setCitedHour(book, 7, hour, true);
    expect(result.status).toBe('invalid'); expect(result.notebook).toBe(book);
  });

  it('rejects invalid trial data, identities and mutation flags without creating evidence', () => {
    for (const value of [null, [], {}, { conditions: [] }, { conditions: null }]) {
      expect(growth.evidenceAt(value, 6)).toBeNull();
      expect(growth.citedEvidence(value)).toEqual([]);
    }
    const book = { trials: [trial()] };
    for (const id of [0, -1, '7', 7.5, Infinity, 1000000001]) expect(growth.setCitedHour(book, id, 6, true)).toEqual({ notebook: book, status: 'invalid' });
    for (const pinned of [undefined, null, 0, 1, 'true']) expect(growth.setCitedHour(book, 7, 6, pinned)).toEqual({ notebook: book, status: 'invalid' });
    expect(growth.setCitedHour(book, 8, 6, true)).toEqual({ notebook: book, status: 'missing' });
    expect(growth.setCitedHour({}, 7, 6, true)).toEqual({ notebook: {}, status: 'missing' });
  });

  it('adds, deduplicates, caps, removes, and clears citations without silent replacement', () => {
    const initial = { trials: [trial()], nextId: 8, selectedId: 7 };
    let current = initial;
    for (const hour of [24, 0, 6]) {
      const result = growth.setCitedHour(current, 7, hour, true);
      expect(result.status).toBe('added'); current = result.notebook;
    }
    expect(current.trials[0].citedHours).toEqual([0, 6, 24]);
    expect(growth.setCitedHour(current, 7, 6, true)).toEqual({ notebook: current, status: 'unchanged' });
    expect(growth.setCitedHour(current, 7, 12, true)).toEqual({ notebook: current, status: 'full' });
    expect(growth.setCitedHour(current, 7, 12, false)).toEqual({ notebook: current, status: 'unchanged' });
    for (const hour of [6, 0, 24]) {
      const result = growth.setCitedHour(current, 7, hour, false);
      expect(result.status).toBe('removed'); current = result.notebook;
    }
    expect(current).toEqual(initial); expect(current.trials[0]).not.toHaveProperty('citedHours');
  });

  it('copies only the target raw citation list and preserves all unknown fields, texts, snapshots, and notebook fields', () => {
    const target = trial(7, { control: { ...conditions(), futureCalibration: { literal: true } }, conditions: { ...conditions(), oxygen: 'original legacy text', futureField: ['keep'] },
      hypothesis: 'x'.repeat(900), explanation: 'Original\u0001\n' + 'y'.repeat(1600), futureTrial: { kept: 'UNCHANGED' } });
    const book = { trials: [null, { bad: true }, target, trial(8)], selectedId: 8, nextId: 900, prediction: 'lower', hypothesis: 'Pending reasoning.', explanation: 'Pending explanation.',
      control: conditions({ tempC: 20 }), sweep: { variable: 'pH', conditions: conditions() }, previousSweep: { variable: 'oxygen', conditions: conditions() },
      removed: { trial: trial(9, { citedHours: [2] }), index: 0 }, futureNotebook: { keep: true }, citedHours: 'unrelated root field' };
    const before = JSON.stringify(book); freeze(book);
    const result = growth.setCitedHour(book, 7, 6, true);
    expect(result.status).toBe('added');
    const expected = JSON.parse(before); expected.trials[2].citedHours = [6];
    expect(result.notebook).toEqual(expected);
    expect(result.notebook).not.toBe(book); expect(result.notebook.trials).not.toBe(book.trials);
    expect(result.notebook.trials[2]).not.toBe(target);
    for (const index of [0, 1, 3]) expect(result.notebook.trials[index]).toBe(book.trials[index]);
    expect(result.notebook.trials[2].control).toBe(target.control);
    expect(result.notebook.trials[2].conditions).toBe(target.conditions);
    expect(result.notebook.removed).toBe(book.removed);
    expect(result.notebook.futureNotebook).toBe(book.futureNotebook);
    expect(JSON.stringify(book)).toBe(before);
  });

  it('keeps raw malformed citation fields unchanged when the request has no effect', () => {
    const book = { trials: [trial(7, { citedHours: [6, '6', 6, 0, 24, 12] })], future: 'keep' };
    for (const [hour, pinned, status] of [[6, true, 'unchanged'], [12, true, 'full'], [9, false, 'unchanged']]) {
      const result = growth.setCitedHour(book, 7, hour, pinned);
      expect(result.status).toBe(status); expect(result.notebook).toBe(book);
      expect(result.notebook.trials[0].citedHours).toEqual([6, '6', 6, 0, 24, 12]);
    }
    expect(growth.setCitedHour(book, 7, 6, false).notebook.trials[0].citedHours).toEqual([0, 24]);
  });

  it('updates the original raw position inside a 20-plus-row import without dropping overflow or malformed rows', () => {
    const rows = Array.from({ length: 24 }, (_, index) => trial(index + 1, { extra: 'raw row ' + index }));
    const rawTrials = [null, ...rows.slice(0, 18), { conditions: null, id: 999 }, ...rows.slice(18), 'malformed tail'];
    const book = { trials: rawTrials, selectedId: 20, nextId: 70, extra: 'root' }, before = JSON.stringify(book);
    const result = growth.setCitedHour(book, 20, 6, true);
    expect(result.status).toBe('added'); expect(result.notebook.trials).toHaveLength(rawTrials.length);
    const index = rawTrials.findIndex(item => item && item.id === 20);
    expect(result.notebook.trials[index]).toEqual({ ...rawTrials[index], citedHours: [6] });
    rawTrials.forEach((item, at) => { if (at !== index) expect(result.notebook.trials[at]).toBe(item); });
    expect(growth.normalizeNotebook(result.notebook).trials).toHaveLength(growth.maxRecords);
    expect(growth.setCitedHour(book, 1, 6, true)).toEqual({ notebook: book, status: 'missing' });
    expect(JSON.stringify(book)).toBe(before);
  });

  it('resolves duplicate valid IDs to their first retained owner and rejects newly repaired IDs', () => {
    const book = { trials: [trial('bad', { explanation: 'Malformed owner.' }), trial(1, { explanation: 'First valid owner.' }), trial(1, { explanation: 'Duplicate owner.' }), trial(9)], selectedId: 2 };
    const normalized = growth.normalizeNotebook(book);
    expect(normalized.trials.map(item => item.id)).toEqual([2, 1, 3, 9]);
    for (const id of [2, 3]) expect(growth.setCitedHour(book, id, 6, true)).toEqual({ notebook: book, status: 'missing' });
    const result = growth.setCitedHour(book, 1, 6, true);
    expect(result.notebook.trials[1].citedHours).toEqual([6]);
    expect(result.notebook.trials[0]).toBe(book.trials[0]); expect(result.notebook.trials[2]).toBe(book.trials[2]);
    expect(result.notebook.selectedId).toBe(2);
    expect(growth.normalizeNotebook(result.notebook).selectedId).toBeNull();
    expect(growth.setCitedHour(JSON.parse(JSON.stringify(result.notebook)), 2, 12, true).status).toBe('missing');
  });

  it('does not use an old ID outside the retained window to authorize a different repaired trial', () => {
    const trials = [trial(1), ...Array.from({ length: growth.maxRecords - 1 }, (_, index) => trial(index + 2)), trial('bad')];
    const book = { trials, selectedId: 1 };
    expect(growth.normalizeNotebook(book).trials.at(-1).id).toBe(1);
    expect(growth.setCitedHour(book, 1, 6, true)).toEqual({ notebook: book, status: 'missing' });
  });

  it('permits annotations after an explicitly selected repaired trial has its canonical identity saved', () => {
    const raw = { trials: [trial('bad'), trial(9)] };
    const canonical = { ...growth.normalizeNotebook(raw), selectedId: 1 };
    const result = growth.setCitedHour(canonical, 1, 6, true);
    expect(result.status).toBe('added'); expect(result.notebook.trials[0].id).toBe(1);
    expect(result.notebook.trials[0].citedHours).toEqual([6]); expect(result.notebook.selectedId).toBe(1);
  });

  it('keeps citations through JSON removal and recovery, without allowing annotation of a removed record', () => {
    const book = growth.setCitedHour({ trials: [trial(7), trial(8)], selectedId: 7, nextId: 9 }, 7, 6, true).notebook;
    const removed = growth.removeTrial(book, 7).notebook;
    expect(removed.removed.trial.citedHours).toEqual([6]);
    expect(growth.setCitedHour(removed, 7, 12, true)).toEqual({ notebook: removed, status: 'missing' });
    const restored = growth.restoreTrial(JSON.parse(JSON.stringify(removed))).notebook;
    expect(restored.trials[0]).toEqual(growth.normalizeNotebook(book).trials[0]);
    expect(restored.selectedId).toBe(7); expect(restored).not.toHaveProperty('removed');
  });

  it('starts a new trial without copying citations from older evidence or a root-level draft field', () => {
    const original = trial(7, { citedHours: [0, 6, 24] });
    const result = growth.saveTrial({ trials: [original], control: conditions(), prediction: 'lower', nextId: 8, selectedId: 7, citedHours: [6] }, conditions({ tempC: 35 }));
    expect(result.status).toBe('saved');
    expect(result.notebook.trials[0].citedHours).toEqual([0, 6, 24]);
    expect(result.notebook.trials[1]).not.toHaveProperty('citedHours');
  });

  it('uses each original control and leaves outcome-at-24 review independent of the selected evidence hours', () => {
    const first = trial(7, { conditions: conditions({ tempC: 35 }), prediction: 'similar', citedHours: [6] });
    const second = trial(8, { control: conditions({ oxygen: 0 }), conditions: conditions(), citedHours: [6] });
    const book = { trials: [first, second], control: conditions({ tempC: 80 }) };
    const at6 = growth.reviewNotebook(book, 6), at24 = growth.reviewNotebook(book, 24);
    expect(at6.rows[0].outcome).toBe('similar');
    expect(Math.abs(growth.citedEvidence(first)[0].difference)).toBeGreaterThan(2);
    expect(at24.rows[0].outcome).toBe(at6.rows[0].outcome);
    expect(growth.citedEvidence(second)[0].controlPopulation).toBe(growth.simulate(second.control).points[6].population);
    expect(growth.citedEvidence(second)[0].controlPopulation).not.toBe(growth.citedEvidence(first)[0].controlPopulation);
    const changedDraft = { ...book, control: conditions({ profile: 'thermus', tempC: 70 }) };
    expect(growth.citedEvidence(growth.normalizeNotebook(changedDraft).trials[0])).toEqual(growth.citedEvidence(first));
    expect(growth.reviewNotebook(changedDraft, 24).rows.map(row => row.outcome)).toEqual(at24.rows.map(row => row.outcome));
  });

  it.each(['csv', 'reviewCSV'])('appends citation columns to %s while keeping every existing column and value unchanged', method => {
    const original = trial(7, { hypothesis: '=SUM(A1:A2)', explanation: 'Quoted "evidence",\nsecond line.' });
    const before = csvRows(growth[method]({ trials: [original] }, 12));
    const after = csvRows(growth[method]({ trials: [{ ...original, citedHours: [24, 0, 6] }] }, 12));
    expect(after.headers.slice(-2)).toEqual(['cited_model_hours', 'cited_evidence_json']);
    expect(withoutCitations(after.rows[0])).toEqual(withoutCitations(before.rows[0]));
    expect(before.rows[0].cited_model_hours).toBe(''); expect(before.rows[0].cited_evidence_json).toBe('');
    expect(after.rows[0].cited_model_hours).toBe('0; 6; 24');
    expect(after.rows[0].hypothesis).toBe("'=SUM(A1:A2)"); expect(after.rows[0].explanation).toBe(original.explanation);
    const citations = JSON.parse(after.rows[0].cited_evidence_json);
    expect(citations.map(point => point.hour)).toEqual([0, 6, 24]);
    expect(citations[0]).toEqual({ hour: 0, controlPopulation: 5, trialPopulation: 5, difference: 0 });
    const independentControl = 100 / (1 + 19 * Math.exp(-0.4 * 4));
    const independentTrial = 100 / (1 + 19 * Math.exp(-0.26 * 1.9));
    expect(citations[1]).toEqual({ hour: 6, controlPopulation: Number(independentControl.toFixed(3)), trialPopulation: Number(independentTrial.toFixed(3)), difference: Number((independentTrial - independentControl).toFixed(3)) });
    expect(typeof citations[1].difference).toBe('number'); expect(citations[1].difference).toBeLessThan(0);
  });

  it('keeps missing comparison values explicitly null in citation CSV data and leaves removed trials outside active exports', () => {
    const saved = trial(7, { control: null, citedHours: [0, 6] });
    for (const method of ['csv', 'reviewCSV']) {
      const row = csvRows(growth[method]({ trials: [saved] }, 6)).rows[0];
      const citations = JSON.parse(row.cited_evidence_json);
      expect(citations.every(point => point.controlPopulation === null && point.difference === null)).toBe(true);
      expect(citations[0].trialPopulation).toBe(5); expect(row.control_profile).toBe('');
      const removed = growth.removeTrial({ trials: [saved] }, 7).notebook;
      expect(csvRows(growth[method](removed, 6)).rows).toEqual([]);
    }
  });

  it('includes cited values and provenance labels for active and recoverable portfolio evidence', () => {
    const raw = { trials: [trial(7, { citedHours: [6] })], removed: { trial: trial(9, { control: null, citedHours: [0] }), index: 0 } };
    const seed = { growthInvestigation: raw, growthReviewHour: 24 };
    const text = core.work.portfolio(seed).sections.find(section => section.id === 'growth').text;
    const active = text.slice(text.indexOf('Current saved evidence — Trial 7'), text.indexOf('Removed evidence'));
    const removed = text.slice(text.indexOf('Removed evidence'));
    expect(active).toContain('Evidence selected for my explanation');
    expect(active).toContain('Learner-selected model hours, using the original saved conditions.');
    expect(active).toContain('Original prediction: Higher population');
    const controlAt6 = 100 / (1 + 19 * Math.exp(-0.4 * 4)), trialAt6 = 100 / (1 + 19 * Math.exp(-0.26 * 1.9));
    expect(active).toContain([6, Number(controlAt6.toFixed(3)), Number(trialAt6.toFixed(3)), Number((trialAt6 - controlAt6).toFixed(3))].join('\t'));
    expect(removed).toContain('outside the active notebook) — Trial 9');
    expect(removed).toContain('0\tUnavailable\t5\tUnavailable');
    expect(removed).toContain('Comparison unavailable: no original control was saved.');
    expect(core.work.portfolio(JSON.parse(JSON.stringify(seed))).text).toBe(core.work.portfolio(seed).text);
  });

  it('does not invent citations from a root draft field or malformed imported hours', () => {
    const seed = { growthInvestigation: { control: conditions(), prediction: 'higher', hypothesis: 'Pending.', citedHours: [6], trials: [trial(7, { citedHours: ['6', -1] })], selectedId: null }, growthLab: conditions() };
    const before = JSON.stringify(seed), text = core.work.portfolio(seed).text;
    expect(text).not.toContain('Evidence selected for my explanation');
    expect(growth.normalizeNotebook(seed.growthInvestigation).trials[0]).not.toHaveProperty('citedHours');
    expect(JSON.stringify(seed)).toBe(before);
  });

  it('preserves frozen state and deterministic output across repeated annotation and JSON reload without RNG or XP effects', () => {
    const state = { xp: 840, tab: 'growthLab', growthReviewHour: 6, growthLab: { ...conditions({ tempC: 40 }), privateSetup: 'keep' },
      growthInvestigation: { trials: [trial(7)], control: conditions(), prediction: 'lower', hypothesis: 'Pending.', selectedId: 7, nextId: 8, future: 'keep' }, mysteryLab: { unknown: 'unchanged' } };
    const before = JSON.stringify(state); freeze(state);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('No random draws'); });
    const now = vi.spyOn(Date, 'now').mockImplementation(() => { throw new Error('No timestamp'); });
    const first = growth.setCitedHour(state.growthInvestigation, 7, 6, true);
    const reloaded = JSON.parse(JSON.stringify(first.notebook));
    expect(growth.setCitedHour(reloaded, 7, 6, true).status).toBe('unchanged');
    expect(growth.citedEvidence(first.notebook.trials[0])).toEqual(growth.citedEvidence(reloaded.trials[0]));
    expect(growth.csv(first.notebook)).toBe(growth.csv(reloaded));
    expect(JSON.stringify(state)).toBe(before); expect(state.xp).toBe(840); expect(state.growthReviewHour).toBe(6);
    expect(random).not.toHaveBeenCalled(); expect(now).not.toHaveBeenCalled();
  });
});
