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
