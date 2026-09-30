import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8').replace(/\r\n/g, '\n');
const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
const bankEnd = source.indexOf('// ──────────────────────────────────────────────────────────────────\n  // INTERACTIVE WIDGETS', bankStart);
if (bankStart < 0 || bankEnd <= bankStart) throw new Error('Microbiology quiz bank boundaries were not found.');
// Match the actual rotated bank instead of duplicating its answer positions.
// eslint-disable-next-line no-new-func
const bank = new Function(source.slice(bankStart, bankEnd) + '\nreturn QUIZ_QUESTIONS;')();
const correctAnswers = () => bank.map(question => question.answer);
const core = () => window.__MicrobiologyCore;
const actions = state => core().work.nextActions(state);

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology'); });

const claims = { pond: 'protist', budding: 'yeast', wall: 'bacterium', salt: 'archaeon', particle: 'phage', unresolved: 'unresolved' };
function mysteryReport(id) {
  return { claim: claims[id], evidence: ['structure', 'behavior'], reasoning: `The recorded evidence supports ${id}.`, limitation: 'bounded' };
}
function currentCase(id) {
  const record = mysteryReport(id);
  return { ...record, record, revealed: ['context', 'structure', 'behavior'] };
}
function allCurrentCases() { return Object.fromEntries(Object.keys(claims).map(id => [id, currentCase(id)])); }
function measurement(id, value, unit = 'um') {
  const context = {
    ecoli: { method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 },
    strep: { method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 1 },
    parame: { method: 'lightbright', mag: 400, zoom: 1, fieldUm: 450, scaleUm: 100, referenceUm: 250 },
    phage: { method: 'em', mag: 100000, zoom: 1, fieldUm: 0.4, scaleUm: 0.1, referenceUm: 0.2 }
  }[id];
  return { value, unit, context: { version: 1, specimen: id, ...context } };
}
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}

describe('Micro Lab next-action projection', () => {
  it('starts missing or malformed state without inventing saved work', () => {
    const expected = { mystery: { kind: 'unrecorded', id: 'pond' }, microscope: null, growth: null, resistance: null, gram: { kind: 'prediction' }, quiz: { kind: 'answer', id: 0 } };
    for (const state of [undefined, null, [], 42, 'damaged', {}]) expect(actions(state)).toEqual(expected);
    expect(actions({ mysteryLab: [], microscopeMeasurements: 'bad', growthInvestigation: { trials: [null, { conditions: [] }] }, gramStep: 4.1, quizSubmitted: true, quizAnswers: ['0'] })).toEqual(expected);
  });

  it('prioritizes Mystery revisions over drafts and prefers the active case only within the winning priority', () => {
    const cases = {
      salt: { ...currentCase('salt'), reasoning: 'A revised membrane explanation.' },
      budding: { ...currentCase('budding'), reasoning: 'A revised budding explanation.' },
      particle: { limitation: 'bounded' }
    };
    expect(actions({ mysteryLab: { active: 'particle', cases } }).mystery).toEqual({ kind: 'revision', id: 'budding' });
    expect(actions({ mysteryLab: { active: 'salt', cases } }).mystery).toEqual({ kind: 'revision', id: 'salt' });
    cases.salt = currentCase('salt'); cases.budding = currentCase('budding');
    expect(actions({ mysteryLab: { active: 'pond', cases } }).mystery).toEqual({ kind: 'draft', id: 'particle' });
  });

  it('uses canonical Mystery order and treats revealed evidence or a limitation as unfinished work', () => {
    const cases = { particle: { revealed: ['behavior'] }, wall: { limitation: 'species' } };
    expect(actions({ mysteryLab: { active: 'bad', cases } }).mystery).toEqual({ kind: 'draft', id: 'wall' });
    expect(actions({ mysteryLab: { active: 'particle', cases } }).mystery).toEqual({ kind: 'draft', id: 'particle' });
    const notDrafts = { pond: { reasoning: '  ', checked: true, evidence: ['behavior'], collapsed: ['context'], record: { claim: 'protist' } } };
    expect(actions({ mysteryLab: { active: 'salt', cases: notDrafts } }).mystery).toEqual({ kind: 'unrecorded', id: 'salt' });
  });

  it('advances Mystery actions when a revision is recorded and ignores presentation or previous-report changes', () => {
    const cases = allCurrentCases();
    cases.salt.reasoning = 'A newly revised explanation.';
    cases.pond = { revealed: ['context', 'size'] };
    expect(actions({ mysteryLab: { cases } }).mystery).toEqual({ kind: 'revision', id: 'salt' });
    cases.salt.record = { ...mysteryReport('salt'), reasoning: cases.salt.reasoning };
    expect(actions({ mysteryLab: { cases } }).mystery).toEqual({ kind: 'draft', id: 'pond' });
    cases.pond = { ...currentCase('pond'), reportView: 'recorded', collapsed: ['structure'], checked: false, previousRecord: { ...mysteryReport('pond'), reasoning: 'An earlier explanation.' } };
    expect(actions({ mysteryLab: { cases } }).mystery).toBeNull();
    // A saved record alone does not prove the independent working notes are current.
    cases.pond = { record: mysteryReport('pond') };
    expect(actions({ mysteryLab: { cases } }).mystery).toEqual({ kind: 'revision', id: 'pond' });
  });

  it('chooses a pending microscope estimate in canonical slide order with active-slide preference', () => {
    const microscopeMeasurements = {
      phage: { draft: measurement('phage', '0.3') },
      parame: { draft: measurement('parame', '300') },
      strep: { draft: measurement('strep', '1.2') }
    };
    expect(actions({ microscopeMeasurements }).microscope).toEqual({ kind: 'estimate', id: 'strep' });
    expect(actions({ microscopeMeasurements, scopeOrganism: 'phage' }).microscope).toEqual({ kind: 'estimate', id: 'phage' });
    expect(actions({ microscopeMeasurements, scopeOrganism: 'ecoli' }).microscope).toEqual({ kind: 'estimate', id: 'strep' });
  });

  it('ignores blank, already checked, and malformed measurement drafts while retaining invalid attempts to fix', () => {
    const microscopeMeasurements = {
      ecoli: { draft: measurement('ecoli', '2.0'), result: measurement('ecoli', 2) },
      strep: { draft: measurement('strep', '  ') },
      parame: { draft: { ...measurement('parame', '200'), context: {} } },
      unknown: { draft: measurement('phage', '0.2') }
    };
    expect(actions({ microscopeMeasurements }).microscope).toBeNull();
    microscopeMeasurements.strep.draft.value = 'not a number';
    expect(actions({ microscopeMeasurements }).microscope).toEqual({ kind: 'estimate', id: 'strep' });
  });

  it('advances after checking an estimate but does not accept a damaged result as completed work', () => {
    const microscopeMeasurements = {
      ecoli: { draft: measurement('ecoli', '2') },
      phage: { draft: measurement('phage', '0.2') }
    };
    expect(actions({ microscopeMeasurements }).microscope.id).toBe('ecoli');
    microscopeMeasurements.ecoli.result = measurement('ecoli', 2);
    expect(actions({ microscopeMeasurements }).microscope.id).toBe('phage');
    microscopeMeasurements.phage.result = measurement('phage', 0.2);
    expect(actions({ microscopeMeasurements }).microscope).toBeNull();
    microscopeMeasurements.ecoli.result.context.scaleUm = 900;
    expect(actions({ microscopeMeasurements }).microscope).toEqual({ kind: 'estimate', id: 'ecoli' });
  });

  it('resumes the selected unexplained Growth trial or the first saved one, including missing controls', () => {
    const growthInvestigation = { selectedId: 3, trials: [
      { id: 9, conditions: {}, control: null, explanation: ' ' },
      { id: 3, conditions: {}, control: {}, explanation: '' },
      { id: 2, conditions: {}, explanation: 'This trial has an explanation.' }
    ] };
    expect(actions({ growthInvestigation }).growth).toEqual({ kind: 'explanation', id: 3 });
    growthInvestigation.trials[1].explanation = 'The changed condition affected this model.';
    expect(actions({ growthInvestigation }).growth).toEqual({ kind: 'explanation', id: 9 });
    growthInvestigation.trials[0].explanation = 'The old control was unavailable, so I cannot reconstruct the comparison.';
    expect(actions({ growthInvestigation }).growth).toBeNull();
  });

  it('uses normalized Growth ids and does not invent an explanation target for unsaved work', () => {
    const growthInvestigation = { selectedId: 1, trials: [null, { conditions: [] }, { id: 8, conditions: {} }, { id: 8, conditions: {} }] };
    expect(core().growth.normalizeNotebook(growthInvestigation).selectedId).toBeNull();
    expect(actions({ growthInvestigation }).growth).toEqual({ kind: 'explanation', id: 8 });
    expect(actions({ growthInvestigation: { control: {}, explanation: 'Unsaved note', sweep: { conditions: {}, variable: 'pH' } }, growthLab: { log: ['old trial'] } }).growth).toBeNull();
  });

  it('prioritizes Growth recovery over explanations without restoring or changing selected work', () => {
    const growthInvestigation = freezeDeep({ selectedId: 3, control: {}, prediction: 'lower', nextId: 20, hypothesis: 'Next run draft',
      trials: [{ id: 3, conditions: {}, explanation: '' }], removed: { trial: { id: 7, conditions: {}, explanation: '' }, index: 0 } });
    const before = JSON.stringify(growthInvestigation);
    expect(actions({ growthInvestigation }).growth).toEqual({ kind: 'recovery', id: 7 });
    expect(actions({ growthInvestigation: JSON.parse(before) }).growth).toEqual({ kind: 'recovery', id: 7 });
    expect(JSON.stringify(growthInvestigation)).toBe(before);
    const restored = core().growth.restoreTrial(growthInvestigation).notebook;
    expect(actions({ growthInvestigation: restored }).growth).toEqual({ kind: 'explanation', id: 7 });
    const kept = core().growth.keepRemoval(growthInvestigation).notebook;
    expect(actions({ growthInvestigation: kept }).growth).toEqual({ kind: 'explanation', id: 3 });
    const saved = core().growth.saveTrial(growthInvestigation, {}).notebook;
    expect(actions({ growthInvestigation: saved }).growth).toEqual({ kind: 'explanation', id: 20 });
  });

  it('retains the intended original Growth ID and ignores colliding or orphaned recovery slots', () => {
    const trials = [{ id: 'bad', conditions: {}, explanation: '' }, { id: 1, conditions: {}, explanation: '' }];
    expect(actions({ growthInvestigation: { trials, selectedId: 1 } }).growth).toEqual({ kind: 'explanation', id: 1 });
    expect(actions({ growthInvestigation: { trials, selectedId: 2 } }).growth).toEqual({ kind: 'explanation', id: 2 }); // Canonical first trial, not an accepted stale selection.
    for (const removed of [{ trial: { id: 1, conditions: {} }, index: 0 }, { trial: { id: 7, conditions: {} }, index: 3 }]) {
      expect(actions({ growthInvestigation: { trials, selectedId: 1, removed } }).growth).toEqual({ kind: 'explanation', id: 1 });
    }
    expect(actions({ growthInvestigation: { removed: { trial: { id: 7, conditions: {} }, index: 0 } } }).growth).toEqual({ kind: 'recovery', id: 7 });
  });

  it('projects each Gram inquiry step and keeps independent reports separate from malformed or restarted drafts', () => {
    const record = { prediction: 'thin', interpretation: 'wall', explanation: 'The envelopes separate at decolorization.' };
    const states = [
      [{}, 'prediction'],
      [{ gramStep: 3 }, 'observe'],
      [{ gramInvestigation: { prediction: 'thin' } }, 'observe'],
      [{ gramInvestigation: { maxStep: 4, interpretation: 'species' } }, 'interpretation'],
      [{ gramInvestigation: { maxStep: 4, interpretation: 'wall', explanation: ' ' } }, 'explanation'],
      [{ gramInvestigation: { maxStep: 4, ...record } }, 'record'],
      [{ gramInvestigation: { maxStep: 4, step: 1, ...record, record } }, 'saved'],
      [{ gramStep: 4, gramInvestigation: { step: 99, maxStep: 4.1, record } }, 'prediction'],
      [{ gramInvestigation: { step: 0, maxStep: 0, record } }, 'prediction']
    ];
    for (const [state, kind] of states) expect(actions(state).gram).toEqual({ kind });
  });

  it('prioritizes Resistance snapshots without a reflection and prefers selection only within that group', () => {
    const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
    const records = [{ id: 3, evidence, reviewNote: 'I compared living counts and shares.' }, { id: 7, evidence, reviewNote: '  ' }, { id: 9, evidence }];
    const state = freezeDeep({ resistanceNotebook: { records, selectedId: 3 }, resistanceInvestigation: evidence });
    const before = JSON.stringify(state);
    expect(actions(state).resistance).toEqual({ kind: 'reflection', id: 7 });
    expect(actions({ resistanceNotebook: { records, selectedId: 9 } }).resistance).toEqual({ kind: 'reflection', id: 9 });
    const reflected = records.map(record => ({ ...record, reviewNote: 'A later interpretation.' }));
    expect(actions({ resistanceNotebook: { records: reflected, selectedId: 9 } }).resistance).toEqual({ kind: 'review', id: 9 });
    expect(actions(JSON.parse(before)).resistance).toEqual({ kind: 'reflection', id: 7 });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('prioritizes Resistance recovery over reflections and returns to normal resume after an explicit decision or new save', () => {
    const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase',
      history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
    const state = freezeDeep({ resistanceNotebook: {
      records: [{ id: 3, evidence: { ...evidence, notes: 'Active snapshot' }, reviewNote: '  ' }], selectedId: 3, nextId: 20,
      removed: { record: { id: 7, evidence: { ...evidence, notes: 'Removed original notes' }, reviewNote: '' }, index: 0 }
    }, resistanceInvestigation: { ...evidence, notes: 'Independent live work' }, resistanceComparison: { aId: null, bId: 3 } });
    const before = JSON.stringify(state), api = core().resistance;
    expect(actions(state).resistance).toEqual({ kind: 'recovery', id: 7 });
    expect(actions(JSON.parse(before)).resistance).toEqual({ kind: 'recovery', id: 7 });
    expect(actions({ ...state, resistanceNotebook: api.restoreRecord(state.resistanceNotebook).notebook }).resistance).toEqual({ kind: 'reflection', id: 7 });
    expect(actions({ ...state, resistanceNotebook: api.keepRemoval(state.resistanceNotebook).notebook }).resistance).toEqual({ kind: 'reflection', id: 3 });
    const saved = api.save(state.resistanceNotebook, { ...evidence, notes: 'A distinct new snapshot' });
    expect(saved.status).toBe('saved');
    expect(actions({ ...state, resistanceNotebook: saved.notebook }).resistance).toEqual({ kind: 'reflection', id: 20 });
    const duplicate = api.save(state.resistanceNotebook, state.resistanceNotebook.records[0].evidence);
    expect(duplicate.status).toBe('duplicate');
    expect(actions({ ...state, resistanceNotebook: duplicate.notebook }).resistance).toEqual({ kind: 'recovery', id: 7 });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('ignores invalid or colliding Resistance recovery but retains a removed-only snapshot with an imported position', () => {
    const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase',
      history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
    const records = [{ id: 3, evidence, reviewNote: '' }];
    for (const removed of [null, [], {}, { record: { id: 3, evidence }, index: 0 },
      { record: { id: '7', evidence }, index: 0 }, { record: { id: 7, evidence: {} }, index: 0 },
      { record: { id: 7, evidence }, index: 8 }, { record: { id: 7, evidence }, index: '0' }]) {
      const state = freezeDeep({ resistanceNotebook: { records, selectedId: 3, removed } }), before = JSON.stringify(state);
      expect(actions(state).resistance).toEqual({ kind: 'reflection', id: 3 });
      expect(JSON.stringify(state)).toBe(before);
    }
    const removedOnly = freezeDeep({ resistanceNotebook: { records: [], selectedId: 7, nextId: 8,
      removed: { record: { id: 7, evidence, reviewNote: 'Preserved later reflection' }, index: 7 } } });
    expect(actions(removedOnly).resistance).toEqual({ kind: 'recovery', id: 7 });
    expect(core().resistance.normalizeNotebook(removedOnly.resistanceNotebook).selectedId).toBeNull();
    expect(actions({ resistanceNotebook: core().resistance.keepRemoval(removedOnly.resistanceNotebook).notebook }).resistance).toBeNull();
  });

  it('projects Resistance review from retained snapshots without accepting stale repaired-ID preferences', () => {
    const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
    const resistanceNotebook = { records: [{ id: 'broken', evidence, reviewNote: 'Already reflected.' }, { id: 1, evidence, reviewNote: 'Also reflected.' }], selectedId: 2 };
    expect(core().resistance.normalizeNotebook(resistanceNotebook).selectedId).toBeNull();
    expect(actions({ resistanceNotebook }).resistance).toEqual({ kind: 'review', id: 2 });
    expect(actions({ resistanceNotebook: { records: [null, { id: 4, evidence: { history: [{ day: 0, sensitive: 80, resistant: 0 }] } }] } }).resistance).toBeNull();
  });

  it('returns the first unanswered quiz question after strict answer normalization, even with a forged submitted flag', () => {
    const quizAnswers = correctAnswers();
    quizAnswers[2] = '1'; quizAnswers[5] = 4;
    const state = { quizAnswers, quizSubmitted: true, quizIdx: 12, quizCorrect: 15, quizPractice: { answers: correctAnswers(), checked: Array(bank.length).fill(true) } };
    expect(actions(state).quiz).toEqual({ kind: 'answer', id: 2 });
    quizAnswers[2] = bank[2].answer;
    expect(actions(state).quiz).toEqual({ kind: 'answer', id: 5 });
  });

  it('offers quiz submission after all questions are answered without grading an unsubmitted attempt', () => {
    const quizAnswers = correctAnswers(); quizAnswers[1] = (quizAnswers[1] + 1) % 4;
    for (const quizSubmitted of [undefined, false, 'true', 1]) expect(actions({ quizAnswers, quizSubmitted }).quiz).toEqual({ kind: 'submit' });
    expect(actions({ quizAnswers, quizSubmitted: true }).quiz).toEqual({ kind: 'practice', id: 1 });
  });

  it('only counts a checked correct practice answer and advances in original question order', () => {
    const quizAnswers = correctAnswers();
    for (const i of [2, 7, 9]) quizAnswers[i] = (quizAnswers[i] + 1) % 4;
    const quizPractice = { answers: correctAnswers(), checked: Array(bank.length).fill(false) };
    const state = { quizAnswers, quizPractice, quizSubmitted: true, quizIdx: 9 };
    quizPractice.checked[2] = 'true';
    expect(actions(state).quiz).toEqual({ kind: 'practice', id: 2 });
    quizPractice.checked[2] = true; quizPractice.answers[2] = (bank[2].answer + 1) % 4;
    expect(actions(state).quiz).toEqual({ kind: 'practice', id: 2 });
    quizPractice.answers[2] = bank[2].answer;
    expect(actions(state).quiz).toEqual({ kind: 'practice', id: 7 });
    quizPractice.checked[7] = true; quizPractice.answers[7] = String(bank[7].answer);
    expect(actions(state).quiz).toEqual({ kind: 'practice', id: 7 });
    quizPractice.answers[7] = bank[7].answer;
    expect(actions(state).quiz).toEqual({ kind: 'practice', id: 9 });
    quizPractice.checked[9] = true;
    expect(actions(state).quiz).toBeNull();
  });

  it('has no quiz action for a perfect submitted attempt despite unrelated malformed practice data', () => {
    expect(actions({ quizAnswers: correctAnswers(), quizSubmitted: true, quizPractice: { answers: ['bad'], checked: [true] } }).quiz).toBeNull();
  });

  it('survives JSON restoration, leaves deeply frozen saved work unchanged, and returns independent descriptors', () => {
    const state = freezeDeep({
      mysteryLab: { active: 'salt', cases: { salt: { ...currentCase('salt'), limitation: 'safe' } } },
      scopeOrganism: 'phage', microscopeMeasurements: { phage: { draft: measurement('phage', '0.3'), result: measurement('phage', 0.2) } },
      growthInvestigation: { selectedId: 7, trials: [{ id: 7, conditions: {}, control: null, explanation: '' }] },
      gramInvestigation: { step: 1, prediction: 'both', record: { prediction: 'thick', interpretation: 'wall', explanation: 'An earlier report.' } },
      quizAnswers: [0], quizSubmitted: true
    });
    const serialized = JSON.stringify(state), result = actions(state), expected = structuredClone(result);
    expect(actions(JSON.parse(serialized))).toEqual(expected);
    result.mystery.id = 'pond'; result.gram.kind = 'saved'; result.quiz.id = 14;
    expect(actions(state)).toEqual(expected);
    expect(JSON.stringify(state)).toBe(serialized);
  });
});
