import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool, mounted;
const act = React.act, priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology'); });
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct; vi.restoreAllMocks(); vi.useRealTimers();
});
const core = () => window.__MicrobiologyCore;
function mount(seed = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'home', ...seed } }); view.state = data.microbiology;
    return tool.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
function button(name) {
  const node = [...mounted.container.querySelectorAll('button')].find(el => el.textContent.trim() === name);
  expect(node, name).toBeTruthy(); return node;
}
function click(node) { act(() => (typeof node === 'string' ? button(node) : node).click()); }
function measurement(value = 2, unit = 'um') {
  return { value, unit, context: { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 } };
}
function caseRecord() { return { claim: 'protist', evidence: ['structure', 'behavior'], reasoning: 'Nuclei and coordinated cilia support a ciliated protist.', limitation: 'bounded' }; }

describe('Micro Lab saved-work overview', { timeout: 20000 }, () => {
  it('starts with six accurate empty activity cards and no invented completion', () => {
    mount(); const summary = core().work.summarize({});
    expect(summary.started).toBe(0);
    expect(mounted.container.querySelectorAll('[data-work-card]')).toHaveLength(6);
    expect(mounted.container.querySelector('#micro-workspace-title').textContent).toBe('Choose your first investigation');
    expect([...mounted.container.querySelectorAll('.micro-workspace-status')].every(n => n.textContent === 'Ready to begin')).toBe(true);
    expect(mounted.container.querySelector('[data-work-card="microscope"] strong').textContent).toBe('0/5');
    expect(mounted.container.querySelector('[data-work-card="quiz"] strong').textContent).toBe('0/15');
    expect(mounted.container.querySelector('[role="tablist"]').compareDocumentPosition(mounted.container.querySelector('.micro-workspace-home')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('distinguishes recorded work, pending revisions, unchecked estimates, and missing explanations', () => {
    const record = caseRecord(), measured = measurement();
    const active = { initRes: 3, dose: 50, duration: 3, prediction: 'increase', history: [{ day: 0, sensitive: 78, resistant: 2 }, { day: 1, sensitive: 30, resistant: 2 }] };
    const state = {
      mysteryLab: { cases: { pond: { ...record, revealed: ['context', 'structure', 'behavior'], reasoning: 'A revised explanation.', record }, budding: { reasoning: 'A question about budding.' } } },
      microscopeMeasurements: { ecoli: { result: measured, draft: { ...measured, value: '3' } }, phage: { result: { ...measured, context: { ...measured.context, specimen: 'phage' } } } },
      growthInvestigation: { trials: [{ id: 7, conditions: {}, control: {}, explanation: '' }], control: {}, sweep: { variable: 'pH', conditions: {} } },
      resistanceInvestigation: active,
      resistanceNotebook: { records: [{ id: 4, evidence: core().resistance.evidence(active) }] },
      gramInvestigation: { step: 2, maxStep: 4, prediction: 'thick', interpretation: 'wall', explanation: 'Thick peptidoglycan retains dye.', record: { prediction: 'thick', interpretation: 'wall', explanation: 'Thick peptidoglycan retains dye.' } },
      quizAnswers: [0, 1], quizSubmitted: false
    };
    const snapshot = JSON.stringify(state), summary = core().work.summarize(state);
    expect(summary.started).toBe(6);
    expect(summary.mystery).toMatchObject({ records: 1, drafts: 1, revisions: 1 });
    expect(summary.microscope).toMatchObject({ records: 1, drafts: 1 });
    expect(summary.growth).toMatchObject({ records: 1, unexplained: 1, control: true, sweep: true });
    expect(summary.resistance).toMatchObject({ records: 1, round: 1, status: 'in-progress' });
    expect(summary.gram).toMatchObject({ step: 2, observed: 4, recorded: true, revision: false, nextStep: 'saved' });
    expect(summary.quiz).toMatchObject({ answered: 2, submitted: false });
    expect(JSON.stringify(state)).toBe(snapshot);
    mount(state);
    expect(mounted.container.querySelector('[data-work-card="mystery"]').textContent).toContain('Reports with working revisions: 1');
    expect(mounted.container.querySelector('[data-work-card="growth"]').textContent).toContain('Saved trials without a written explanation: 1');
  });

  it('ignores malformed records and never treats a forged submitted flag or score as progress', () => {
    const bad = { mysteryLab: { cases: { pond: { record: { claim: 'anything', reasoning: 'x' } } } }, microscopeMeasurements: { ecoli: { result: measurement(Infinity) } }, growthInvestigation: { trials: [null] }, resistanceNotebook: { records: [null] }, quizAnswers: Array(15).fill('1'), quizCorrect: 500, quizSubmitted: 'true', gramInvestigation: { step: -12, maxStep: 'all', record: 'yes' } };
    const summary = core().work.summarize(bad);
    expect(summary.started).toBe(0);
    expect(summary.quiz).toMatchObject({ answered: 0, submitted: false, correct: 0 });
    expect(core().work.summarize({ quizSubmitted: true, quizAnswers: [] }).quiz).toMatchObject({ started: false, submitted: false });
    expect(core().work.summarize({ quizSubmitted: true, quizAnswers: [0] }).quiz).toMatchObject({ started: true, submitted: false, answered: 1 });
    for (const value of [null, [], 42, 'damaged']) expect(core().work.summarize(value).started).toBe(0);
    mount(bad); expect(mounted.container.textContent).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('does not turn invalid Gram stages into observed progress, while preserving an independent saved report', () => {
    for (const invalid of [99, 4.5, -1, '4']) {
      expect(core().work.summarize({ gramStep: invalid }).gram).toMatchObject({ observed: 0, started: false, nextStep: 'prediction' });
      expect(core().work.summarize({ gramInvestigation: { step: invalid, maxStep: invalid } }).gram).toMatchObject({ observed: 0, started: false });
    }
    const record = { prediction: 'thick', interpretation: 'wall', explanation: 'The different envelopes explain dye retention at decolorization.' };
    const seed = { gramStep: 99, gramInvestigation: { step: 99, maxStep: 4.5, record } };
    expect(core().work.summarize(seed).gram).toMatchObject({ observed: 0, recorded: true, revision: true, nextStep: 'prediction' });
    mount(seed);
    const card = mounted.container.querySelector('[data-work-card="gram"]');
    expect(card.querySelector('strong').textContent).toBe('0/4');
    expect(card.textContent).toContain('An unfinished revision is separate from your saved report.');
    expect(card.textContent).toContain('Next: choose a prediction for this investigation.');
    click('Open Gram-stain investigation');
    expect(mounted.container.querySelector('.micro-gram-record blockquote').textContent).toBe(record.explanation);
    expect(button('Save Gram-stain report').disabled).toBe(true);
  });

  it('shows the next Gram action as a revision changes and preserves the report after restarting and restoring', () => {
    vi.useFakeTimers();
    const record = { prediction: 'both', interpretation: 'wall', explanation: 'The two models separate at decolorization.' };
    mount({ gramInvestigation: { ...record, step: 2, maxStep: 4, record } });
    const home = () => click(mounted.container.querySelector('#micro-tab-home'));
    const cardText = () => mounted.container.querySelector('[data-work-card="gram"]').textContent;
    const open = () => { click('Open Gram-stain investigation'); act(() => vi.runOnlyPendingTimers()); };
    const choose = value => click(mounted.container.querySelector(`input[name="micro-gram-interpretation"][value="${value}"]`));
    const write = text => {
      const node = mounted.container.querySelector('#micro-gram-explanation');
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, text);
        node.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };
    expect(cardText()).toContain('Your saved report matches the current draft.');
    expect(cardText()).not.toContain('An unfinished revision');
    open(); choose('shape'); home();
    expect(cardText()).toContain('An unfinished revision is separate from your saved report.');
    expect(cardText()).toContain('Next: choose the interpretation supported by the observations.');
    open(); choose('wall'); write(' '); home();
    expect(cardText()).toContain('Next: write your evidence and explanation.');
    open(); write('My revised explanation connects the color difference to envelope structure.'); home();
    expect(cardText()).toContain('Next: save the current explanation as your report.');
    expect(mounted.state.gramInvestigation.record).toEqual(record);
    open(); click('Start a new investigation'); act(() => vi.runOnlyPendingTimers()); home();
    expect(cardText()).toContain('Next: choose a prediction for this investigation.');
    const restored = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(restored);
    expect(cardText()).toContain('An unfinished revision is separate from your saved report.');
    expect(cardText()).toContain('Next: choose a prediction for this investigation.');
    open();
    expect(mounted.container.querySelector('.micro-gram-record blockquote').textContent).toBe(record.explanation);
    click(mounted.container.querySelector('#micro-gram-prediction-thick')); home();
    expect(cardText()).toContain('Next: continue observing the staining stages.');
  });

  it('shares measurement calibration validation with the microscope and counts only changed drafts', () => {
    const result = measurement();
    const raw = { ecoli: { result, draft: { ...result, value: '2.0' } }, strep: { result: { ...result, context: { ...result.context, specimen: 'strep' } } } };
    expect(core().work.summarize({ microscopeMeasurements: raw }).microscope).toEqual({ records: 1, drafts: 0, started: true });
    raw.ecoli.draft.value = '2000'; raw.ecoli.draft.unit = 'nm';
    expect(core().work.summarize({ microscopeMeasurements: raw }).microscope.drafts).toBe(1);
    raw.ecoli.result.context.scaleUm = 99;
    expect(core().measurements.normalize(raw).ecoli).toBeUndefined();
    expect(core().work.summarize({ microscopeMeasurements: raw }).microscope.records).toBe(0);
  });

  it('keeps older growth notes discoverable without presenting them as new trial records', () => {
    const state = { growthLab: { hypothesis: 'Earlier notes', log: [] } };
    expect(core().work.summarize(state).growth).toMatchObject({ started: true, legacyNotes: true, records: 0 });
    mount(state); expect(mounted.container.querySelector('[data-work-card="growth"]').textContent).toContain('Notes from the earlier Growth Lab');
  });

  it('opens each activity without changing its saved work and focuses the requested section', () => {
    vi.useFakeTimers();
    const saved = { mysteryLab: { active: 'unresolved' }, growthInvestigation: { hypothesis: 'Keep this draft' }, microscopeMeasurements: { ecoli: { result: measurement() } }, gramInvestigation: { step: 2, maxStep: 3, prediction: 'thin', explanation: 'Keep this too' } };
    mount(saved);
    const destinations = [
      ['Open specimen cases', 'mystery'], ['Open measurement lab', 'microscope'], ['Open Gram-stain investigation', 'bacteria'],
      ['Open growth notebook', 'growthLab'], ['Open resistance notebook', 'resistance'], ['Open quiz and practice', 'quiz']
    ];
    for (const [label, tab] of destinations) {
      click(label); act(() => vi.runOnlyPendingTimers());
      expect(mounted.state.tab).toBe(tab);
      expect(document.activeElement.id).toBe(tab === 'bacteria' ? 'micro-gram-heading' : 'micro-content');
      expect(mounted.state.mysteryLab).toEqual(saved.mysteryLab);
      expect(mounted.state.growthInvestigation).toEqual(saved.growthInvestigation);
      expect(mounted.state.microscopeMeasurements).toEqual(saved.microscopeMeasurements);
      const home = [...mounted.container.querySelectorAll('[role="tab"]')].find(el => el.textContent.includes('Home')); click(home);
    }
  });

  it('restores the same overview after JSON storage and leaves topic-library access available', () => {
    mount({ growthInvestigation: { control: {}, hypothesis: 'My next comparison' }, microscopeMeasurements: { ecoli: { result: measurement() } } });
    const text = mounted.container.querySelector('.micro-workspace-home').textContent;
    const seed = JSON.parse(JSON.stringify(mounted.state)); act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(seed); expect(mounted.container.querySelector('.micro-workspace-home').textContent).toBe(text);
    click('Show topic library');
    expect(button('Hide topic library').getAttribute('aria-expanded')).toBe('true');
    expect(mounted.container.querySelectorAll('[role="tab"]')).toHaveLength(19);
  });

  it('surfaces a removed-only Growth notebook as work to revisit without counting the removed trial as saved', () => {
    const seed = { growthInvestigation: { trials: [], selectedId: null, removed: { trial: { id: 7, conditions: {}, explanation: 'Recover this evidence.' }, index: 0 }, nextId: 20 } };
    const before = JSON.stringify(seed), summary = core().work.summarize(seed);
    expect(summary.growth).toMatchObject({ records: 0, unexplained: 0, removedId: 7, started: true });
    expect(summary.started).toBe(1);
    mount(seed);
    const card = mounted.container.querySelector('[data-work-card="growth"]');
    expect(mounted.container.querySelector('#micro-workspace-title').textContent).toBe('Continue your investigations');
    expect(card.querySelector('.micro-workspace-status').textContent).toBe('Work to revisit');
    expect(card.querySelector('strong').textContent).toBe('0');
    expect(card.querySelector('[data-work-recovery="growth"]').textContent).toContain('Removed trial 7.');
    expect(card.querySelector('[data-work-recovery="growth"]').textContent).toContain('not included in the saved-trial count');
    expect(card.querySelector('[data-work-next="growth"]').textContent).toBe('Review removed trial 7');
    expect(JSON.stringify(seed)).toBe(before);
  });

  it('keeps pending explanations visible alongside recovery and ignores malformed removal data', () => {
    const growthInvestigation = { trials: [{ id: 3, conditions: {}, explanation: '' }], selectedId: 3,
      removed: { trial: { id: 7, conditions: {}, explanation: 'Prior evidence' }, index: 1 } };
    mount({ growthInvestigation });
    const card = mounted.container.querySelector('[data-work-card="growth"]');
    expect(card.querySelector('strong').textContent).toBe('1');
    expect(card.textContent).toContain('Saved trials without a written explanation: 1');
    expect(card.querySelector('[data-work-next="growth"]').textContent).toBe('Review removed trial 7');
    for (const removed of [null, { trial: { id: 7, conditions: [] }, index: 0 }, { trial: { id: 7, conditions: {} }, index: 2 }]) {
      expect(core().work.summarize({ growthInvestigation: { removed } }).growth).toMatchObject({ records: 0, removedId: null, started: false });
    }
  });
});
