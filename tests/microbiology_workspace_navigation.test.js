import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')();
const act = React.act, priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
let tool, mounted;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
});
function mount(seed = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'home', ...seed } }); view.state = data.microbiology;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
const node = selector => mounted.container.querySelector(selector);
function click(selector) { const target = node(selector); expect(target, selector).toBeTruthy(); act(() => target.click()); }
const flush = () => act(() => vi.runOnlyPendingTimers());
function open(id) { click(`[data-work-next="${id}"]`); flush(); }
const record = { claim: 'protist', evidence: ['structure', 'behavior'], reasoning: 'Nuclei and cilia support this broad classification.', limitation: 'bounded' };

describe('Micro Lab contextual Home navigation', { timeout: 20000 }, () => {
  it.each([
    ['working notes', '#micro-resistance-notes'],
    ['a tab without selecting it', '#micro-tab-quiz'],
    ['the topic library control', '.micro-library-toggle']
  ])('keeps a newer focus-only action on %s after opening Resistance from Home', (_, selector) => {
    mount({ resistanceNotebook: { records: [{ id: 7, evidence: { dose: 30, duration: 3, initRes: 10, prediction: 'increase',
      history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] } }], selectedId: 7 } });
    click('[data-work-next="resistance"]');
    const before = JSON.stringify(mounted.state), target = node(selector); target.focus(); flush();
    expect(document.activeElement).toBe(target); expect(JSON.stringify(mounted.state)).toBe(before);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('respects a newer native disclosure action without opening the queued saved-reflection target', () => {
    mount({ resistanceNotebook: { records: [{ id: 7, evidence: { dose: 30, duration: 3, initRes: 10,
      history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] } }], selectedId: 7 } });
    click('[data-work-next="resistance"]');
    const summary = node('.micro-resistance-comparison > summary'); summary.focus(); act(() => summary.click()); flush();
    expect(document.activeElement).toBe(summary); expect(summary.parentElement.open).toBe(true);
    expect(node('.micro-resistance-saved').open).toBe(false);
  });

  it('opens a pending Mystery revision in working view and preserves every evidence snapshot', () => {
    const prior = { ...record, reasoning: 'Earlier reasoning.' };
    const cases = { pond: { ...record, reasoning: 'A revised explanation.', revealed: ['context', 'structure', 'behavior'], collapsed: ['structure'], checked: true, reportView: 'recorded', record, previousRecord: prior } };
    mount({ mysteryLab: { active: 'unresolved', cases, notice: 'saved' } });
    expect(node('[data-work-next="mystery"]').textContent).toContain('Review working revision · A: Freshwater drifter');
    open('mystery');
    expect(document.activeElement.id).toBe('micro-mystery-report-heading');
    expect(document.activeElement.getAttribute('data-case')).toBe('pond');
    expect(document.activeElement.getAttribute('data-report-view')).toBe('working');
    expect(mounted.state.mysteryLab).toEqual({ active: 'pond', notice: '', cases: { pond: { ...cases.pond, reportView: 'working' } } });
    expect(node('#micro-mystery-reasoning').value).toBe(cases.pond.reasoning);
  });

  it('reopens an unrecorded case with notes before an untouched case', () => {
    const draft = { reasoning: 'Why might budding matter?', revealed: ['context', 'behavior'], collapsed: ['behavior'] };
    mount({ mysteryLab: { active: 'unresolved', cases: { budding: draft } } });
    expect(node('[data-work-next="mystery"]').textContent).toContain('Continue case notes · B:');
    open('mystery');
    expect(document.activeElement.id).toBe('micro-mystery-observation-heading');
    expect(document.activeElement.getAttribute('data-case')).toBe('budding');
    expect(mounted.state.mysteryLab.cases.budding).toEqual({ ...draft, reportView: 'working' });
  });

  it('opens the unchecked estimate disclosure without changing the microscope view or measurement', () => {
    const context = { version: 1, specimen: 'strep', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 1 };
    const seed = { scopeOrganism: 'ecoli', selectedScope: 'em', magnification: 10000, microscopeZoom: 4, microscopeFocus: 15, microscopeTargetFocus: 50,
      microscopeMeasurements: { strep: { draft: { value: '1.5', unit: 'um', context } } } };
    mount(seed); open('microscope');
    expect(document.activeElement.id).toBe('micro-measurement-notebook-strep');
    expect(document.activeElement.closest('details').open).toBe(true);
    for (const [key, value] of Object.entries(seed)) expect(mounted.state[key], key).toEqual(value);
    expect(node('[data-measurement-draft="strep"]').textContent).toContain('1.5 µm');
  });

  it('keeps the requested estimate focus when a focused microscope persists an observed slide on mount', () => {
    const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
    mount({ scopeOrganism: 'ecoli', selectedScope: 'lightbright', magnification: 1000, microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50,
      microscopeMeasurements: { ecoli: { draft: { value: '3', unit: 'um', context } } } });
    node('[data-work-next="microscope"]').focus(); open('microscope');
    expect(mounted.state.microscopeSeenSlides).toEqual(['ecoli']);
    expect(document.activeElement.id).toBe('micro-measurement-notebook-ecoli');
    expect(document.activeElement.closest('details').open).toBe(true);
  });

  it('focuses the activity after Resistance persists its culture on mount', () => {
    mount(); const target = [...mounted.container.querySelectorAll('button')].find(button => button.textContent === 'Open resistance notebook');
    target.focus(); act(() => target.click()); flush();
    expect(mounted.state.resistanceInvestigation).toBeTruthy(); expect(document.activeElement.id).toBe('micro-content');
  });

  it('selects a saved trial needing explanation while preserving control, evidence, setup, and inspection hour', () => {
    const book = { selectedId: 9, nextId: 10, conditions: { tempC: 18, oxygen: 25 }, control: { tempC: 30 }, prediction: 'lower', hypothesis: 'My next comparison',
      trials: [{ id: 7, conditions: { pH: 5 }, control: {}, prediction: 'lower', hypothesis: 'Before seven', explanation: ' ' }, { id: 9, conditions: {}, control: {}, explanation: 'Already explained.' }] };
    const seed = { growthInvestigation: book, growthReviewHour: 6, growthLab: { hypothesis: 'Earlier notes' } };
    mount(seed); expect(node('[data-work-next="growth"]').textContent).toBe('Explain saved trial 7'); open('growth');
    expect(document.activeElement.id).toBe('gl-explanation');
    expect(node('#gl-saved-result').getAttribute('data-micro-growth-result')).toBe('7');
    expect(mounted.state.growthInvestigation).toEqual({ ...book, selectedId: 7 });
    expect(mounted.state.growthReviewHour).toBe(6); expect(mounted.state.growthLab).toEqual(seed.growthLab);
  });

  it('opens removed-only Growth recovery after JSON reload without restoring until explicitly requested', () => {
    const growthInvestigation = { trials: [], selectedId: null, nextId: 20, removed: { trial: { id: 7, conditions: {}, control: null, prediction: 'lower', hypothesis: 'Original reasoning', explanation: '' }, index: 0 } };
    mount({ growthInvestigation });
    const restored = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(restored);
    expect(node('[data-work-next="growth"]').textContent).toBe('Review removed trial 7');
    open('growth');
    expect(document.activeElement.id).toBe('gl-restore-removed');
    expect(mounted.state.growthInvestigation).toEqual(growthInvestigation);
    expect(node('.micro-growth-trials')).toBeNull();
    click('#gl-restore-removed');
    expect(document.activeElement.id).toBe('gl-trial-7');
    expect(mounted.state.growthInvestigation.trials[0]).toMatchObject(growthInvestigation.removed.trial);
    expect(mounted.state.growthInvestigation).not.toHaveProperty('removed');
    click('#micro-tab-home');
    expect(node('[data-work-next="growth"]').textContent).toBe('Explain saved trial 7');
    expect(node('[data-work-recovery="growth"]')).toBeNull();
  });

  it('prioritizes the recovery decision while preserving the selected unfinished trial, settings, drafts, sweep, and hour', () => {
    const growthInvestigation = { selectedId: 3, nextId: 20, control: { profile: 'ecoli', tempC: 30, pH: 7, oxygen: 100 }, prediction: 'lower', hypothesis: 'Next question', explanation: 'Next note',
      sweepVariable: 'pH', sweep: { variable: 'oxygen', conditions: {} }, trials: [{ id: 3, conditions: {}, control: {}, explanation: '' }],
      removed: { trial: { id: 7, conditions: {}, explanation: 'Keep available' }, index: 1 } };
    const seed = { growthInvestigation, growthReviewHour: 6, growthLab: { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100, hypothesis: 'Earlier notes' } };
    mount(seed); open('growth');
    expect(document.activeElement.id).toBe('gl-restore-removed');
    for (const [key, value] of Object.entries(seed)) expect(mounted.state[key], key).toEqual(value);
    expect(node('#gl-saved-result').getAttribute('data-micro-growth-result')).toBe('3');
    click('#gl-keep-removal'); click('#micro-tab-home');
    expect(node('[data-work-next="growth"]').textContent).toBe('Explain saved trial 3');
    expect(node('[data-work-card="growth"]').textContent).toContain('Saved trials without a written explanation: 1');
    expect(mounted.state.growthReviewHour).toBe(6);
    expect(mounted.state.growthLab).toEqual(seed.growthLab);
  });

  it('focuses the recovery panel when an imported full notebook cannot restore without replacing a record', () => {
    const growthInvestigation = { trials: Array.from({ length: 12 }, (_, index) => ({ id: index + 1, conditions: {}, explanation: '' })), selectedId: 3,
      removed: { trial: { id: 20, conditions: {} }, index: 4 }, nextId: 21 };
    mount({ growthInvestigation }); open('growth');
    expect(document.activeElement).toBe(node('#gl-removed-trial'));
    expect(node('#gl-removed-trial').tabIndex).toBe(-1);
    expect(node('#gl-restore-removed').disabled).toBe(true);
    expect(mounted.state.growthInvestigation).toEqual(growthInvestigation);
  });

  it('makes an explicitly chosen repaired trial selectable without attaching a stale restored selection automatically', () => {
    const growthInvestigation = { trials: [{ id: 'bad', conditions: {}, explanation: '' }, { id: 1, conditions: {}, explanation: 'Already explained.' }],
      selectedId: 2, nextId: 20, control: { tempC: 30 }, prediction: 'lower', hypothesis: 'Preserved draft' };
    mount({ growthInvestigation, growthReviewHour: 6 });
    expect(window.__MicrobiologyCore.growth.normalizeNotebook(growthInvestigation).selectedId).toBeNull();
    expect(node('[data-work-next="growth"]').textContent).toBe('Explain saved trial 2');
    open('growth');
    expect(document.activeElement.id).toBe('gl-explanation');
    expect(node('#gl-saved-result').getAttribute('data-micro-growth-recovered')).toBe('2');
    expect(mounted.state.growthInvestigation.trials.map(trial => trial.id)).toEqual([2, 1]);
    expect(mounted.state.growthInvestigation.trials[1].explanation).toBe('Already explained.');
    for (const field of ['control', 'prediction', 'hypothesis', 'nextId']) expect(mounted.state.growthInvestigation[field]).toEqual(growthInvestigation[field]);
    expect(mounted.state.growthReviewHour).toBe(6);
  });

  const resistanceEvidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original counts matter.',
    history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };

  it('opens removed-only Resistance recovery after JSON reload without changing the notebook or restoring evidence', () => {
    const resistanceNotebook = { records: [], selectedId: null, nextId: 20,
      removed: { record: { id: 7, evidence: resistanceEvidence, reviewNote: 'Keep this later reflection.' }, index: 0 } };
    const resistanceInvestigation = window.__MicrobiologyCore.normalizeResistanceInvestigation({ ...resistanceEvidence, notes: 'Independent current notes.' });
    const resistanceComparison = { aId: null, bId: null };
    const seed = { resistanceNotebook, resistanceInvestigation, resistanceComparison, growthLab: { hypothesis: 'Keep other work.' } };
    mount(seed);
    const restored = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(restored);
    const random = vi.spyOn(Math, 'random');
    expect(node('[data-work-next="resistance"]').textContent).toBe('Review removed evidence 7');
    open('resistance');
    expect(document.activeElement).toBe(node('#micro-resistance-restore-removed'));
    expect(node('#micro-resistance-restore-removed').disabled).toBe(false);
    expect(node('.micro-resistance-saved')).toBeNull();
    expect(node('[data-resistance-removed-reflection]').textContent).toBe('Keep this later reflection.');
    for (const [key, value] of Object.entries(seed)) expect(mounted.state[key], key).toEqual(value);
    expect(mounted.state.resistanceNotebook.records).toEqual([]);
    expect(mounted.state.resistanceNotebook.removed.record.id).toBe(7);
    expect(mounted.awardXP).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });

  it('focuses a full imported Resistance recovery panel without evicting records or changing the selected snapshot', () => {
    const resistanceNotebook = { records: Array.from({ length: 8 }, (_, index) => ({
      id: index + 1, evidence: { ...resistanceEvidence, notes: 'Saved evidence ' + index }, reviewNote: ''
    })), selectedId: 3, nextId: 100,
    removed: { record: { id: 99, evidence: resistanceEvidence, reviewNote: 'Recovery reflection' }, index: 7 } };
    const resistanceComparison = { aId: 3, bId: 4 };
    const resistanceInvestigation = window.__MicrobiologyCore.normalizeResistanceInvestigation({ ...resistanceEvidence, notes: 'Live notes' });
    mount({ resistanceNotebook, resistanceComparison, resistanceInvestigation });
    expect(node('[data-work-next="resistance"]').textContent).toBe('Review removed evidence 99');
    open('resistance');
    expect(document.activeElement).toBe(node('#micro-resistance-removed-evidence'));
    expect(node('#micro-resistance-removed-evidence').tabIndex).toBe(-1);
    expect(node('#micro-resistance-restore-removed').disabled).toBe(true);
    click('#micro-resistance-restore-removed');
    expect(mounted.state.resistanceNotebook).toEqual(resistanceNotebook);
    expect(mounted.state.resistanceNotebook.records).toHaveLength(8);
    expect(mounted.state.resistanceComparison).toEqual(resistanceComparison);
    expect(mounted.state.resistanceInvestigation).toEqual(resistanceInvestigation);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('cancels queued Home Resistance recovery focus after a newer active-tab action', () => {
    const resistanceNotebook = { records: [], selectedId: null, nextId: 8,
      removed: { record: { id: 7, evidence: resistanceEvidence, reviewNote: '' }, index: 0 } };
    mount({ resistanceNotebook });
    click('[data-work-next="resistance"]');
    click('#micro-tab-resistance');
    node('#micro-tab-resistance').focus(); flush();
    expect(document.activeElement).toBe(node('#micro-tab-resistance'));
    expect(mounted.state.resistanceNotebook).toEqual(resistanceNotebook);
    expect(node('#micro-resistance-restore-removed').disabled).toBe(false);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('opens the saved Resistance reflection while keeping original evidence, a live run, and comparison choices', () => {
    const resistanceNotebook = { records: [{ id: 3, evidence: resistanceEvidence, reviewNote: 'Already explained.' }, { id: 7, evidence: resistanceEvidence }], selectedId: 3, nextId: 8 };
    const resistanceComparison = { aId: 3, bId: 7 };
    const current = { ...resistanceEvidence, dose: 60, notes: 'Independent working notes.' };
    mount({ resistanceNotebook, resistanceComparison, resistanceInvestigation: current, growthLab: { hypothesis: 'Keep this note.' } });
    const random = vi.spyOn(Math, 'random');
    expect(node('[data-work-next="resistance"]').textContent).toBe('Reflect on saved evidence 7');
    open('resistance');
    expect(document.activeElement.id).toBe('micro-resistance-reflection-7');
    expect(document.activeElement.closest('details').open).toBe(true);
    expect(mounted.state.resistanceNotebook).toEqual({ ...resistanceNotebook, selectedId: 7 });
    expect(mounted.state.resistanceComparison).toEqual(resistanceComparison);
    expect(mounted.state.resistanceInvestigation.notes).toBe(current.notes);
    expect(mounted.state.resistanceInvestigation.dose).toBe(60);
    expect(mounted.state.resistanceInvestigation.history).toEqual(current.history);
    expect(mounted.state.growthLab.hypothesis).toBe('Keep this note.');
    expect(mounted.awardXP).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });

  it('establishes an explicitly reviewed repaired Resistance ID while clearing stale pair aliases', () => {
    const resistanceNotebook = { records: [{ id: 'broken', evidence: resistanceEvidence }, { id: 1, evidence: resistanceEvidence, reviewNote: 'Already reflected.' }], selectedId: 2, nextId: 20 };
    mount({ resistanceNotebook, resistanceComparison: { aId: 2, bId: 1 } });
    expect(window.__MicrobiologyCore.resistance.normalizeNotebook(resistanceNotebook).selectedId).toBeNull();
    open('resistance');
    expect(document.activeElement.id).toBe('micro-resistance-reflection-2');
    expect(mounted.state.resistanceNotebook.records.map(record => record.id)).toEqual([2, 1]);
    expect(mounted.state.resistanceNotebook.selectedId).toBe(2);
    expect(mounted.state.resistanceComparison).toEqual({ aId: null, bId: 1 });
    const restored = JSON.parse(JSON.stringify(mounted.state));
    expect(window.__MicrobiologyCore.resistance.normalizeNotebook(restored.resistanceNotebook).selectedId).toBe(2);
    expect(window.__MicrobiologyCore.resistance.normalizeComparison(restored.resistanceComparison, restored.resistanceNotebook)).toEqual({ aId: null, bId: 1 });
  });

  it('cancels the queued Resistance reflection focus after another explicit tab action', () => {
    mount({ resistanceNotebook: { records: [{ id: 7, evidence: resistanceEvidence }] } });
    click('[data-work-next="resistance"]'); click('#micro-tab-resistance');
    node('#micro-tab-resistance').focus(); flush();
    expect(document.activeElement.id).toBe('micro-tab-resistance');
  });

  const savedGram = { prediction: 'both', interpretation: 'wall', explanation: 'The models separate at decolorization.' };
  it.each([
    ['prediction', {}, 'micro-gram-prediction-thick'],
    ['observe', { prediction: 'thin', step: 1, maxStep: 2 }, 'micro-gram-stage-3'],
    ['interpretation', { prediction: 'thick', step: 4, maxStep: 4, interpretation: 'shape' }, 'micro-gram-interpretation-heading'],
    ['explanation', { prediction: 'thick', step: 4, maxStep: 4, interpretation: 'wall', explanation: ' ' }, 'micro-gram-explanation'],
    ['record', { ...savedGram, step: 3, maxStep: 4 }, 'micro-gram-save'],
    ['saved', { ...savedGram, step: 2, maxStep: 4, record: savedGram }, 'micro-gram-record-heading']
  ])('focuses the Gram %s action without observing, editing, or saving it', (_, gram, target) => {
    mount({ gramInvestigation: gram, gramStep: gram.step || 0 }); const before = JSON.stringify(mounted.state);
    open('gram'); expect(document.activeElement.id).toBe(target);
    expect(mounted.state.gramInvestigation).toEqual(JSON.parse(before).gramInvestigation);
    expect(mounted.state.gramStep).toBe(JSON.parse(before).gramStep);
    if (target === 'micro-gram-stage-3') expect(node('#micro-gram-stage-1').getAttribute('aria-current')).toBe('step');
  });

  it('focuses the first missing quiz question without repairing or grading answers on navigation', () => {
    const answers = [0, 'bad', 1]; mount({ quizAnswers: answers, quizSubmitted: true, quizCorrect: 500 });
    expect(node('[data-work-next="quiz"]').textContent).toContain('Q2'); open('quiz');
    expect(document.activeElement.id).toBe('micro-quiz-question-1');
    expect(mounted.state.quizAnswers).toEqual(answers); expect(mounted.state.quizCorrect).toBe(500);
    expect(node('[data-quiz-original-score]')).toBeNull(); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('opens the next missed practice question without changing original answers, checked practice, or score', () => {
    const answers = bank.map((q, i) => [0, 7].includes(i) ? (q.answer + 1) % 4 : q.answer);
    const practice = { answers: bank.map(q => q.answer), checked: bank.map((_, i) => i === 0) };
    mount({ quizAnswers: answers, quizSubmitted: true, quizCorrect: 13, quizPractice: practice, quizMode: 'review' });
    expect(node('[data-work-next="quiz"]').textContent).toBe('Continue practice · Q8'); open('quiz');
    expect(document.activeElement.id).toBe('micro-quiz-question-7');
    expect(mounted.state.quizMode).toBe('practice'); expect(mounted.state.quizAnswers).toEqual(answers);
    expect(mounted.state.quizPractice).toEqual(practice); expect(mounted.state.quizCorrect).toBe(13);
    expect(node('[data-quiz-original-score]').textContent).toContain('13/15'); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('opens quiz submission without submitting or awarding XP', () => {
    const answers = bank.map(q => q.answer); mount({ quizAnswers: answers, quizSubmitted: false }); open('quiz');
    expect(document.activeElement.id).toBe('micro-quiz-submit'); expect(document.activeElement.disabled).toBe(false);
    expect(mounted.state.quizSubmitted).toBe(false); expect(mounted.state.quizAnswers).toEqual(answers);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('cancels deferred Home focus after tab away and back navigation', () => {
    mount(); click('[data-work-next="gram"]'); click('#micro-tab-home'); click('#micro-tab-bacteria');
    node('#micro-tab-bacteria').focus(); flush(); expect(document.activeElement.id).toBe('micro-tab-bacteria');
  });

  it('cancels deferred Home focus when the learner changes the selected trial', () => {
    mount({ growthInvestigation: { selectedId: 1, trials: [{ id: 1, conditions: {}, control: {}, explanation: '' }, { id: 2, conditions: {}, control: {}, explanation: '' }] } });
    click('[data-work-next="growth"]'); click('[data-next-unexplained-trial="2"]'); flush();
    expect(mounted.state.growthInvestigation.selectedId).toBe(2); expect(document.activeElement.id).toBe('gl-explanation');
    expect(node('#gl-saved-result').getAttribute('data-micro-growth-result')).toBe('2');
  });

  it('does not apply a stale Home focus intent to a remounted lab', () => {
    mount(); click('[data-work-next="gram"]'); const saved = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(saved);
    node('#micro-tab-bacteria').focus(); flush(); expect(document.activeElement.id).toBe('micro-tab-bacteria');
  });
});
