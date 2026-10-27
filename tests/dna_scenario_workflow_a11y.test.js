// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const originalDna = 'ATGCGTACCTGAAACTGA';
const sibling = Object.freeze({ fieldNote: 'Keep the ecology observations.', revision: 14 });
const references = Object.freeze({ expSection: null, learnerNote: 'Keep the reference notebook.' });
const history = Object.freeze([{ id: 'control', label: 'Saved control', dnaSequence: 'ATGAAATAA', mutationLog: [] }]);
const draft = Object.freeze({ learnerNote: 'Keep a saved extension field.' });
const longReason = 'The codon evidence changes the downstream reading frame.';
const scienceCases = [
  { id: 'frameshift_deletion', prediction: 'Frameshift', sequence: 'ATGGTACCTGAAACTGA', codon: 'GUA', type: 'Deletion', from: 'C', to: '',
    log: { type: 'Deletion', pos: 3, from: 'C', length: 1, scenario: 'frameshift_deletion' } },
  { id: 'frameshift_insertion', prediction: 'Frameshift', sequence: 'ATGACGTACCTGAAACTGA', codon: 'ACG', type: 'Insertion', from: '', to: 'A',
    log: { type: 'Insertion', pos: 3, to: 'A', length: 1, scenario: 'frameshift_insertion' } },
  { id: 'substitution', prediction: 'Missense', sequence: 'ATGAGTACCTGAAACTGA', codon: 'AGU', type: 'Substitution', from: 'C', to: 'A',
    log: { type: 'Substitution', pos: 3, from: 'C', to: 'A', scenario: 'substitution' } }
];
let config, host, outside, root, latest, updateStore, changes, xp, announce, celebrate, ai, actDescriptor;
const query = selector => host.querySelector(selector);
const scenario = () => query('[data-dna-scenario-challenge]');
const field = name => query('#dna-scenario-' + name);
const radio = value => query('input[name="dna-scenario-prediction"][value="' + value + '"]');
const revision = value => query('input[name="dna-scenario-revision"][value="' + value + '"]');
const scenarioSelect = () => scenario().querySelector('select');
const action = expression => [...scenario().querySelectorAll('button')].find(button => expression.test(button.textContent));
const run = () => action(/Choose a prediction first|Lock prediction and run|Prediction locked/);
const save = () => action(/Save comparison and progress|Inquiry cycle saved/);
const reset = () => action(/Start another prediction/);
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce, celebrate,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(patch = {}) {
  const dnaLab = { tab: 'build', showHelix3d: false, dnaFocusMode: false, dnaGradeOverride: '9-12', visitedTabs: { build: true, mutate: true },
    dnaSequence: originalDna, mutationLog: [], dnaScenarioId: 'frameshift_deletion', dnaScenarioPrediction: '', dnaScenarioLockedPrediction: '',
    dnaScenarioRun: false, dnaScenarioScore: 0, dnaScenarioFeedback: '', dnaScenarioRevision: '', dnaScenarioRevisionReason: '', dnaScenarioComplete: false,
    dnaEvidenceClaim: 'frameshift', dnaEvidenceCitation: 'sequence', dnaEvidenceReasoning: 'Keep the student evidence explanation.', dnaEvidenceScore: 0,
    dnaReportNote: 'Keep the student report reflection.', dnaExperimentHistory: history, unknownDraft: draft, ...patch };
  outside.focus(); await act(async () => { root.render(h(Host, { seed: { dnaLab, ecology: sibling, dna: references } })); });
}
async function patch(values) { await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, ...values } })); }); }
async function activate(element, ownFocus = true) {
  expect(element).toBeTruthy(); if (ownFocus) element.focus(); await act(async () => { element.click(); });
}
async function select(value) {
  const element = scenarioSelect(); element.focus(); await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function reason(value) {
  const element = field('revision-reason'); expect(element).not.toBeNull();
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function begin(prediction = 'Frameshift') { await activate(radio(prediction)); await activate(run()); }
async function ready({ choice = 'supported', explanation = longReason, evidence = 3 } = {}) {
  await patch({ dnaEvidenceScore: evidence }); await activate(revision(choice)); await reason(explanation);
}
function preserved() {
  expect(latest.ecology).toBe(sibling); expect(latest.dna).toBe(references); expect(latest.dnaLab.unknownDraft).toBe(draft);
  expect(latest.dnaLab.dnaExperimentHistory).toBe(history); expect(latest.dnaLab.dnaReportNote).toBe('Keep the student report reflection.');
  expect(latest.dnaLab.dnaEvidenceClaim).toBe('frameshift'); expect(latest.dnaLab.dnaEvidenceCitation).toBe('sequence');
  expect(latest.dnaLab.dnaEvidenceReasoning).toBe('Keep the student evidence explanation.');
  for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function status(node) {
  expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status'); expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true');
}
function description(element) {
  const ids = (element.getAttribute('aria-describedby') || '').trim().split(/\s+/).filter(Boolean); expect(ids.length).toBeGreaterThan(0);
  return ids.map(id => { const node = document.getElementById(id); expect(node).not.toBeNull(); return node.textContent; }).join(' ');
}
beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab'); changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); celebrate = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation';
  document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally { host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
});

describe('DNA scenario science and draft preservation', () => {
  it('opens a saved notebook without writing state or moving host focus', async () => {
    await mount(); expect(document.activeElement).toBe(outside); expect(changes).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled();
    expect(scenarioSelect().tagName).toBe('SELECT'); expect(scenarioSelect().labels.length).toBe(1); expect(radio('Frameshift').type).toBe('radio');
    expect(run().disabled).toBe(true); expect(run().getAttribute('aria-disabled')).toBe('true'); preserved();
  });

  it.each(scienceCases)('applies exactly the displayed $id plan and records the original scientific result', async example => {
    await mount({ dnaScenarioId: example.id, mRNA: 'OLD', protein: ['Old'], animStep: 4, dnaEvidenceScore: 3, dnaEvidenceFeedback: 'Earlier evidence score.' });
    await activate(radio(example.prediction)); const plan = latest.dnaLab.dnaScenarioPreparedPlan;
    expect(plan).toEqual({ scenarioId: example.id, mutationType: example.type, sequenceBefore: originalDna, sequenceAfter: example.sequence,
      pos: 3, position: 4, from: example.from, to: example.to, beforeMrnaCodon: 'CGU', afterMrnaCodon: example.codon });
    expect(latest.dnaLab.dnaSequence).toBe(originalDna); expect(xp).not.toHaveBeenCalled(); await activate(run());
    expect(latest.dnaLab.dnaSequence).toBe(example.sequence); expect(latest.dnaLab.dnaScenarioPlan).toBe(plan); expect(latest.dnaLab.mutationLog).toEqual([example.log]);
    expect(latest.dnaLab.dnaScenarioLockedPrediction).toBe(example.prediction); expect(latest.dnaLab.dnaScenarioScore).toBe(1); expect(latest.dnaLab.dnaScenarioRun).toBe(true);
    expect(latest.dnaLab.tab).toBe('mutate'); expect(latest.dnaLab.mRNA).toBe(''); expect(latest.dnaLab.protein).toEqual([]); expect(latest.dnaLab.animStep).toBe(0);
    expect(latest.dnaLab.dnaEvidenceScore).toBe(0); expect(latest.dnaLab.dnaEvidenceFeedback).toBe(''); expect(scenarioSelect().disabled).toBe(true); expect(radio(example.prediction).disabled).toBe(true);
    expect(query('[data-dna-scenario-result]').textContent).toContain(example.prediction); expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 3, 'Ran DNA scenario'); preserved();
  });

  it('changes scenarios before committing without altering DNA, report drafts, or unrelated notebook state', async () => {
    await mount(); await activate(radio('Frameshift')); await select('substitution');
    expect(latest.dnaLab.dnaScenarioId).toBe('substitution'); expect(latest.dnaLab.dnaScenarioPrediction).toBe(''); expect(latest.dnaLab.dnaScenarioPreparedPlan).toBeNull();
    expect(latest.dnaLab.dnaSequence).toBe(originalDna); expect(latest.dnaLab.mutationLog).toEqual([]); expect(run().disabled).toBe(true);
    expect([...scenario().querySelectorAll('input[name="dna-scenario-prediction"]')].map(node => node.value)).toEqual(['Silent', 'Missense', 'Nonsense']);
    expect(document.activeElement).toBe(scenarioSelect()); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('keeps the committed prediction immutable and preserves the existing mutation history when running one controlled edit', async () => {
    const previous = { type: 'Substitution', pos: 8, from: 'A', to: 'C' }; await mount({ mutationLog: [previous] });
    await begin(); expect(latest.dnaLab.mutationLog).toEqual([previous, scienceCases[0].log]); const committed = latest;
    await activate(radio('In-frame indel')); expect(latest).toBe(committed); expect(latest.dnaLab.dnaScenarioLockedPrediction).toBe('Frameshift'); preserved();
  });
});

describe('DNA scenario guidance and stable status messages', () => {
  it('keeps feedback mounted from the empty state and places Save after the reflection fields', async () => {
    await mount(); const feedback = field('feedback'); status(feedback); expect(feedback.textContent).toBe(''); await begin();
    expect(field('feedback')).toBe(feedback); expect(feedback.textContent).toContain('Prediction locked');
    expect(field('revision-reason').compareDocumentPosition(save()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const readiness = field('revision-status'); status(readiness); await ready(); expect(field('revision-status')).toBe(readiness);
    expect(readiness.textContent).toContain('Reflection ready to save'); await activate(save()); expect(field('feedback')).toBe(feedback);
    expect(feedback.textContent).toContain('actual effect is Frameshift'); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it.each([{ grade: 'K-2', minimum: 3 }, { grade: '3-5', minimum: 12 }, { grade: '6-8', minimum: 12 }, { grade: '9-12', minimum: 12 }])(
    'explains and enforces the original trimmed-character boundary for $grade', async ({ grade, minimum }) => {
      await mount({ dnaGradeOverride: grade }); await begin(); const textarea = field('revision-reason');
      expect(textarea.labels).toHaveLength(1); expect(textarea.labels[0].htmlFor).toBe(textarea.id);
      expect(textarea.labels[0].textContent).toBe('What evidence strengthened or changed your explanation?');
      expect(textarea.maxLength).toBe(500); const help = description(textarea); expect(help).toContain(String(minimum)); expect(help).toContain('500');
      await activate(revision('uncertain')); await reason('  ' + 'a'.repeat(minimum - 1) + '  '); expect(save().disabled || save().getAttribute('aria-disabled') === 'true').toBe(true);
      const unready = latest; await activate(save()); expect(latest.dnaLab.dnaScenarioScore).toBe(unready.dnaLab.dnaScenarioScore); expect(latest.dnaLab.dnaScenarioComplete).toBe(false);
      await reason('  ' + 'a'.repeat(minimum) + '  '); expect(save().disabled).toBe(false); expect(save().getAttribute('aria-disabled')).toBe('false');
      await activate(save()); expect(latest.dnaLab.dnaScenarioScore).toBe(2); expect(latest.dnaLab.dnaScenarioComplete).toBe(false);
      expect(latest.dnaLab.dnaScenarioFeedback).toContain('Complete the Evidence & Reasoning check');
      expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 3, 'Ran DNA scenario'); preserved();
    }
  );

  it('retains a 500-character reflection cap without changing the report or evidence draft', async () => {
    await mount(); await begin(); await activate(revision('revised')); await reason('x'.repeat(501));
    expect(latest.dnaLab.dnaScenarioRevisionReason).toBe('x'.repeat(500)); expect(field('revision-reason').value.length).toBe(500); preserved();
  });

  it('allows the same hypothesis to be selected again after the DNA changes and applies only its new plan', async () => {
    await mount(); await activate(radio('Frameshift')); const earlierPlan = latest.dnaLab.dnaScenarioPreparedPlan;
    await patch({ dnaSequence: 'ATGAAATGA' }); expect(run().disabled).toBe(true); expect(radio('Frameshift').checked).toBe(false);
    expect(latest.dnaLab.dnaScenarioPrediction).toBe('Frameshift'); expect(latest.dnaLab.dnaScenarioPreparedPlan).toBe(earlierPlan);
    expect(scenario().textContent).toContain('The DNA changed'); const current = scenario().querySelector('[aria-current="step"]'); expect(current.textContent).toContain('Predict');
    await activate(run()); expect(xp).not.toHaveBeenCalled(); expect(latest.dnaLab.dnaSequence).toBe('ATGAAATGA');
    await activate(radio('Frameshift')); expect(radio('Frameshift').checked).toBe(true); expect(run().disabled).toBe(false);
    expect(latest.dnaLab.dnaScenarioPredictionSequence).toBe('ATGAAATGA'); expect(latest.dnaLab.dnaScenarioPreparedPlan.sequenceBefore).toBe('ATGAAATGA');
    await activate(run()); expect(latest.dnaLab.dnaSequence).toBe('ATGAATGA'); expect(latest.dnaLab.mutationLog).toEqual([{ ...scienceCases[0].log, from: 'A' }]);
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 3, 'Ran DNA scenario'); preserved();
  });
});

describe('DNA scenario deliberate keyboard handoffs', () => {
  it('moves from a focused Run action to the result heading, then from Reset to the scenario selector', async () => {
    await mount(); await begin(); expect(field('result-title').tabIndex).toBe(-1); expect(document.activeElement).toBe(field('result-title'));
    const sequence = latest.dnaLab.dnaSequence, mutationLog = latest.dnaLab.mutationLog;
    await activate(reset()); expect(document.activeElement).toBe(scenarioSelect()); expect(latest.dnaLab.dnaScenarioRun).toBe(false);
    expect(latest.dnaLab.dnaScenarioPrediction).toBe(''); expect(latest.dnaLab.dnaScenarioRevision).toBe(''); expect(latest.dnaLab.dnaScenarioRevisionReason).toBe('');
    expect(latest.dnaLab.dnaSequence).toBe(sequence); expect(latest.dnaLab.mutationLog).toBe(mutationLog); expect(run().disabled).toBe(true); preserved();
  });

  it('does not take focus from host navigation when Run is invoked without owning focus', async () => {
    await mount(); await activate(radio('Frameshift')); outside.focus(); await activate(run(), false);
    expect(latest.dnaLab.dnaScenarioRun).toBe(true); expect(document.activeElement).toBe(outside); preserved();
  });

  it('honors a newer focus destination between Run and the committed result', async () => {
    await mount(); await activate(radio('Frameshift')); const button = run(); button.focus();
    await act(async () => { button.click(); outside.focus(); }); expect(latest.dnaLab.dnaScenarioRun).toBe(true); expect(document.activeElement).toBe(outside); preserved();
  });

  it('honors a newer focus destination when Reset removes its original focused action', async () => {
    await mount(); await begin(); const button = reset(); button.focus();
    await act(async () => { button.click(); outside.focus(); }); expect(latest.dnaLab.dnaScenarioRun).toBe(false); expect(document.activeElement).toBe(outside); preserved();
  });

  it('opens Evidence & Reasoning and returns to the revision without overwriting any draft or score', async () => {
    await mount(); await begin(); await ready(); const before = latest.dnaLab;
    await activate(field('evidence')); expect(latest.dnaLab.dnaReportOpen).toBe(true); expect(document.activeElement).toBe(query('#dna-evidence-mode-title'));
    expect(field('return')).not.toBeNull(); const afterOpen = latest; await activate(field('return'));
    expect(document.activeElement).toBe(field('revision-title')); expect(latest).toBe(afterOpen);
    for (const key of ['dnaSequence', 'mutationLog', 'dnaScenarioLockedPrediction', 'dnaScenarioPlan', 'dnaScenarioScore', 'dnaScenarioRevision', 'dnaScenarioRevisionReason', 'dnaEvidenceScore']) {
      expect(latest.dnaLab[key]).toBe(before[key]);
    }
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 3, 'Ran DNA scenario'); preserved();
  });

  it('restores a saved inquiry and open report quietly while offering a deliberate path to its reflection', async () => {
    const example = scienceCases[0]; const plan = { scenarioId: example.id, sequenceBefore: originalDna, sequenceAfter: example.sequence, mutationType: example.type,
      pos: 3, position: 4, from: example.from, to: example.to, beforeMrnaCodon: 'CGU', afterMrnaCodon: example.codon };
    await mount({ tab: 'mutate', dnaSequence: example.sequence, mutationLog: [example.log], dnaScenarioRun: true, dnaScenarioPlan: plan,
      dnaScenarioPrediction: 'Frameshift', dnaScenarioLockedPrediction: 'Frameshift', dnaScenarioRevision: 'supported', dnaScenarioRevisionReason: longReason, dnaReportOpen: true });
    expect(field('return')).not.toBeNull(); expect(document.activeElement).toBe(outside); expect(changes).not.toHaveBeenCalled();
    expect(field('revision-reason').value).toBe(longReason); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('cannot steal focus after unmounting during a scenario run', async () => {
    await mount(); await activate(radio('Frameshift')); const button = run(); button.focus();
    await act(async () => { button.click(); root.unmount(); }); root = null; outside.focus(); await act(async () => { vi.advanceTimersByTime(1000); });
    expect(document.activeElement).toBe(outside); expect(host.childElementCount).toBe(0);
  });
});

describe('DNA inquiry progress and once-per-trial rewards', () => {
  it('rewards a complete evidence-and-reflection cycle equally when the original hypothesis differs from the result', async () => {
    await mount(); await begin('In-frame indel'); await ready({ choice: 'revised' }); await activate(save());
    expect(latest.dnaLab.dnaScenarioLockedPrediction).toBe('In-frame indel'); expect(latest.dnaLab.dnaScenarioScore).toBe(3); expect(latest.dnaLab.dnaScenarioComplete).toBe(true);
    expect(latest.dnaLab.dnaScenarioFeedback).toContain('result differed from your prediction'); expect(latest.dnaLab.dnaScenarioFeedback).toContain('prediction accuracy does not affect inquiry progress');
    expect(xp.mock.calls).toEqual([['dnaLab', 3, 'Ran DNA scenario'], ['dnaLab', 10, 'Completed DNA inquiry cycle']]); expect(celebrate).toHaveBeenCalledTimes(1); preserved();
  });

  it('applies the controlled mutation and run reward once when activation is repeated before React commits', async () => {
    await mount(); await activate(radio('Frameshift')); const button = run(); button.focus(); await act(async () => { button.click(); button.click(); button.click(); });
    expect(latest.dnaLab.dnaSequence).toBe(scienceCases[0].sequence); expect(latest.dnaLab.mutationLog).toEqual([scienceCases[0].log]);
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 3, 'Ran DNA scenario'); expect(document.activeElement).toBe(field('result-title')); preserved();
  });

  it('records one completion award for repeated Save activations, including the same render batch', async () => {
    await mount(); await begin(); await ready(); const button = save(); button.focus(); await act(async () => { button.click(); button.click(); button.click(); });
    expect(latest.dnaLab.dnaScenarioScore).toBe(3); expect(latest.dnaLab.dnaScenarioComplete).toBe(true); expect(latest.dnaLab.dnaScenarioRewarded).toBe(true);
    expect(document.activeElement).toBe(button); await activate(save()); expect(xp.mock.calls).toEqual([['dnaLab', 3, 'Ran DNA scenario'], ['dnaLab', 10, 'Completed DNA inquiry cycle']]);
    expect(celebrate).toHaveBeenCalledTimes(1); preserved();
  });

  it('lets learners improve a completed reflection without collecting its completion reward again', async () => {
    await mount(); await begin(); await ready(); await activate(save()); await reason('I revised this explanation after comparing the codons again.');
    expect(latest.dnaLab.dnaScenarioComplete).toBe(false); expect(latest.dnaLab.dnaScenarioScore).toBe(2); expect(latest.dnaLab.dnaScenarioRewarded).toBe(true);
    await activate(revision('uncertain')); await activate(save()); expect(latest.dnaLab.dnaScenarioScore).toBe(3); expect(latest.dnaLab.dnaScenarioComplete).toBe(true);
    expect(xp.mock.calls).toEqual([['dnaLab', 3, 'Ran DNA scenario'], ['dnaLab', 10, 'Completed DNA inquiry cycle']]); expect(celebrate).toHaveBeenCalledTimes(1); preserved();
  });

  it('preserves legacy completion credit on edit without writing a migration during initial rendering', async () => {
    const example = scienceCases[0], plan = { scenarioId: example.id, sequenceBefore: originalDna, sequenceAfter: example.sequence, mutationType: example.type,
      pos: 3, position: 4, from: example.from, to: example.to, beforeMrnaCodon: 'CGU', afterMrnaCodon: example.codon };
    await mount({ tab: 'mutate', dnaSequence: example.sequence, mutationLog: [example.log], dnaScenarioRun: true, dnaScenarioPlan: plan,
      dnaScenarioPrediction: 'Frameshift', dnaScenarioLockedPrediction: 'Frameshift', dnaScenarioRevision: 'supported', dnaScenarioRevisionReason: longReason,
      dnaScenarioComplete: true, dnaScenarioScore: 3, dnaEvidenceScore: 3 });
    expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside); expect(latest.dnaLab.dnaScenarioRewarded).toBeUndefined();
    await reason('The same saved trial now has a clearer evidence explanation.'); expect(latest.dnaLab.dnaScenarioRewarded).toBe(true); await activate(save());
    expect(latest.dnaLab.dnaScenarioComplete).toBe(true); expect(latest.dnaLab.dnaScenarioScore).toBe(3); expect(xp).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); preserved();
  });

  it('allows a deliberate new trial to earn its own run and completion credit', async () => {
    await mount(); await begin(); await ready(); await activate(save()); const firstSequence = latest.dnaLab.dnaSequence;
    await activate(reset()); expect(latest.dnaLab.dnaScenarioRewarded).toBe(false); expect(latest.dnaLab.dnaSequence).toBe(firstSequence);
    await begin(); await ready({ choice: 'uncertain' }); await activate(save()); expect(latest.dnaLab.mutationLog).toHaveLength(2);
    expect(xp.mock.calls).toEqual([['dnaLab', 3, 'Ran DNA scenario'], ['dnaLab', 10, 'Completed DNA inquiry cycle'], ['dnaLab', 3, 'Ran DNA scenario'], ['dnaLab', 10, 'Completed DNA inquiry cycle']]);
    expect(celebrate).toHaveBeenCalledTimes(2); expect(latest.dnaLab.dnaScenarioScore).toBe(3); preserved();
  });
});

describe('Persisted scenario completion credit', () => {
  it('retains an edited legacy completion across unmount and restore without awarding the same trial again', async () => {
    const example = scienceCases[0], plan = { scenarioId: example.id, sequenceBefore: originalDna, sequenceAfter: example.sequence, mutationType: example.type,
      pos: 3, position: 4, from: example.from, to: example.to, beforeMrnaCodon: 'CGU', afterMrnaCodon: example.codon };
    await mount({ tab: 'mutate', dnaSequence: example.sequence, mutationLog: [example.log], dnaScenarioRun: true, dnaScenarioPlan: plan,
      dnaScenarioPrediction: 'Frameshift', dnaScenarioLockedPrediction: 'Frameshift', dnaScenarioRevision: 'supported', dnaScenarioRevisionReason: longReason,
      dnaScenarioComplete: true, dnaScenarioScore: 3, dnaEvidenceScore: 3 });
    await reason('My updated explanation cites the regrouped downstream codons.');
    const savedNotebook = JSON.parse(JSON.stringify(latest.dnaLab)); expect(savedNotebook.dnaScenarioRewarded).toBe(true); expect(savedNotebook.dnaScenarioComplete).toBe(false);
    await act(async () => { root.unmount(); }); root = ReactDOMClient.createRoot(host); changes.mockClear(); xp.mockClear(); celebrate.mockClear();
    // Preserve fixture sentinels while replaying exactly the saved activity fields.
    await mount({ ...savedNotebook, dnaExperimentHistory: history, unknownDraft: draft });
    expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside); expect(field('revision-reason').value).toBe(savedNotebook.dnaScenarioRevisionReason);
    await activate(save()); expect(latest.dnaLab.dnaScenarioScore).toBe(3); expect(latest.dnaLab.dnaScenarioComplete).toBe(true);
    expect(xp).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); preserved();
  });
});
