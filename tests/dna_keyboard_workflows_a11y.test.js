// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const siblingDraft = Object.freeze({ draft: 'An unfinished ecology observation', revision: 12 });
const evidence = Object.freeze({ observations: Object.freeze(['Compare the codons before claiming an effect']) });
const mutationLog = Object.freeze([]);
const history = Object.freeze([Object.freeze({ id: 'control', label: 'Saved control', dnaSequence: 'ATGAAATAA', mutationLog })]);
const effectIds = ['silent', 'missense', 'nonsense', 'frameshift', 'inframe'];
// Independently stated teaching examples; they are not extracted from production code.
const examples = [
  { index: 0, correct: 'silent', before: 'ATG GCC TTC TAA', after: 'ATG GCC TTT TAA', protein: 'Met-Ala-Phe-stop' },
  { index: 2, correct: 'nonsense', before: 'ATG CAG GCC TAA', after: 'ATG TAG GCC TAA', protein: 'Met-STOP' },
  { index: 4, correct: 'inframe', before: 'ATG GCC TTC TAA', after: 'ATG GCC GGG TTC TAA', protein: 'Met-Ala-Gly-Phe-stop' }
];
let config, host, root, outside, latest, setStore, changes, xp, announce, toast, ai, actDescriptor;
const query = selector => host.querySelector(selector);
const frames = () => [...host.querySelectorAll('[data-dna-reading-frame]')];
const frame = n => query(`[data-dna-reading-frame="${n}"]`);
const guided = () => query('[data-dna-guided]');
const guidedRadios = () => [...guided().querySelectorAll('[role="radio"]')];
const sleuth = () => query('[data-dna-mutation-sleuth]');
const msAnswer = id => query(`[data-dna-ms-answer="${id}"]`);
function nameOf(element) {
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/)
    .map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
  const copy = element.cloneNode(true); copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim();
}
function buttonNamed(container, text) {
  return [...container.querySelectorAll('button')].find(button => nameOf(button).includes(text));
}
function initial(tab, patch) {
  return { siblingTool: siblingDraft, dnaLab: {
    tab, dnaFocusMode: false, dnaGradeOverride: '9-12', visitedTabs: { [tab]: true },
    dnaSequence: 'ATGCGTACCTGAAACTGA', mutationLog, dnaExperimentHistory: history, learningEvidence: evidence,
    dnaReportNote: 'Keep my reflection about uncertainty.', dnaEvidenceClaim: 'A codon comparison supports my claim.',
    dnaEvidenceCitation: 'frame', dnaEvidenceCitationDetail: 'Keep the original frame observation.',
    dnaEvidenceCitationSequenceKey: 'saved-sequence', dnaEvidenceReasoning: 'Count bases and compare amino acids.', dnaEvidenceScore: 3,
    ...patch
  } };
}
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; setStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce, addToast: toast,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(tab, patch = {}) {
  outside.focus(); await act(async () => { root.render(h(Host, { seed: initial(tab, patch) })); });
}
async function commit(patch) {
  await act(async () => { setStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, ...patch } })); });
}
async function activate(element) {
  expect(element).toBeDefined(); expect(element).not.toBeNull(); element.focus();
  await act(async () => { element.click(); });
}
async function key(element, value, modifiers = {}) {
  expect(element).not.toBeNull(); element.focus();
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...modifiers });
  await act(async () => { element.dispatchEvent(event); }); return event;
}
// jsdom does not perform browser default button activation. Deliver its native
// click only when keydown was not consumed; browser coverage checks actual keys.
async function activateByKey(element, value) {
  expect(element.tagName).toBe('BUTTON'); element.focus();
  await act(async () => {
    const down = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true });
    element.dispatchEvent(down);
    if (value === 'Enter' && !down.defaultPrevented) element.click();
    element.dispatchEvent(new KeyboardEvent('keyup', { key: value, bubbles: true, cancelable: true }));
    if (value === ' ' && !down.defaultPrevented) element.click();
  });
}
async function advance(milliseconds = 0) { await act(async () => { vi.advanceTimersByTime(milliseconds); }); }
function preserved(expectedMutationLog = mutationLog) {
  expect(latest.siblingTool).toBe(siblingDraft); expect(latest.dnaLab.learningEvidence).toBe(evidence);
  expect(latest.dnaLab.mutationLog).toBe(expectedMutationLog); expect(latest.dnaLab.dnaExperimentHistory).toBe(history);
  expect(latest.dnaLab.dnaReportNote).toBe('Keep my reflection about uncertainty.');
  expect(latest.dnaLab.dnaEvidenceClaim).toBe('A codon comparison supports my claim.');
  expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe('Keep the original frame observation.');
  expect(latest.dnaLab.dnaEvidenceReasoning).toBe('Count bases and compare amino acids.');
  expect(latest.dnaLab.dnaEvidenceScore).toBe(3);
  for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function expectRadioGroup(radios, checkedIndex, tabIndex = checkedIndex < 0 ? 0 : checkedIndex) {
  expect(radios.length).toBeGreaterThan(1); const group = radios[0].closest('[role="radiogroup"]');
  expect(group).not.toBeNull(); expect(nameOf(group).length).toBeGreaterThan(0);
  expect(radios.filter(radio => radio.tabIndex === 0)).toEqual([radios[tabIndex]]);
  radios.forEach((radio, index) => {
    expect(radio.tagName).toBe('BUTTON'); expect(radio.getAttribute('role')).toBe('radio');
    expect(radio.getAttribute('aria-checked')).toBe(String(index === checkedIndex));
    expect(radio.tabIndex).toBe(index === tabIndex ? 0 : -1);
  });
}
function msStatus() {
  const status = query('#dna-ms-feedback'); expect(status).not.toBeNull(); expect(status.getAttribute('role')).toBe('status');
  expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true'); return status;
}
function expectAnswerSemantics(answered = false) {
  const group = query('[data-dna-ms-answers]'); expect(group.getAttribute('role')).toBe('group');
  expect(nameOf(group).length).toBeGreaterThan(0); expect(group.querySelector('[role="radio"]')).toBeNull();
  expect([...group.querySelectorAll('button')]).toHaveLength(5);
  for (const id of effectIds) {
    const answer = msAnswer(id); expect(answer.tagName).toBe('BUTTON'); expect(answer.type).toBe('button');
    expect(answer.disabled).toBe(false); expect(answer.getAttribute('role')).not.toBe('radio');
    expect(answer.hasAttribute('aria-checked')).toBe(false); expect(answer.tabIndex).toBe(0);
    expect(answer.getAttribute('aria-disabled')).toBe(answered ? 'true' : 'false');
    const labelIds = answer.getAttribute('aria-labelledby').split(/\s+/), descriptionIds = answer.getAttribute('aria-describedby').split(/\s+/);
    expect(labelIds.every(id => !!document.getElementById(id))).toBe(true);
    expect(nameOf(answer).length).toBeGreaterThan(0);
    expect(descriptionIds.every(id => !!document.getElementById(id))).toBe(true);
    expect(descriptionIds.some(id => document.getElementById(id).textContent.trim().length > 20)).toBe(true);
    if (answered) expect(descriptionIds).toContain('dna-ms-feedback');
  }
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
  changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); toast = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  // Canvas rendering is covered elsewhere; keep this suite about DOM interaction.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  outside = document.createElement('button'); outside.textContent = 'Host navigation'; host = document.createElement('div');
  document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    root = null; host = null; setStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('DNA reading-frame keyboard comparison', () => {
  it.each([1, 2, 3, 99])('has one tab stop for saved frame %s without stealing initial focus', async saved => {
    await mount('translate', { dnaReadingFrame: saved });
    expectRadioGroup(frames(), saved === 99 ? 0 : saved - 1); expect(document.activeElement).toBe(outside);
    expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('wraps both Arrow axes and Home/End, resetting translation exactly when a frame is selected', async () => {
    await mount('translate', { dnaReadingFrame: 1, transPlaying: true, transStep: 1,
      builtProtein: [{ aa: 'Met', codon: 'AUG', pos: 0 }], protein: [{ aa: 'Met', codon: 'AUG', pos: 0 }] });
    for (const [from, pressed, selected] of [[1, 'ArrowRight', 2], [2, 'ArrowDown', 3], [3, 'ArrowRight', 1],
      [1, 'ArrowLeft', 3], [3, 'ArrowUp', 2], [2, 'Home', 1], [1, 'End', 3]]) {
      expect((await key(frame(from), pressed)).defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(frame(selected)); expectRadioGroup(frames(), selected - 1);
      expect(latest.dnaLab.dnaReadingFrame).toBe(selected); expect(latest.dnaLab.transPlaying).toBe(false);
      expect(latest.dnaLab.transStep).toBe(0); expect(latest.dnaLab.builtProtein).toEqual([]); expect(latest.dnaLab.protein).toEqual([]);
      expect(announce).toHaveBeenLastCalledWith(`Reading frame plus ${selected} selected. Translation reset.`);
    }
    await advance(5000); expect(latest.dnaLab.builtProtein).toEqual([]); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('leaves browser modifier shortcuts and unrelated keys alone', async () => {
    await mount('translate', { dnaReadingFrame: 2 }); const before = changes.mock.calls.length;
    for (const modifiers of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
      expect((await key(frame(2), 'ArrowRight', modifiers)).defaultPrevented).toBe(false);
    }
    expect((await key(frame(2), 'Tab')).defaultPrevented).toBe(false);
    expect((await key(frame(2), 'x')).defaultPrevented).toBe(false);
    expectRadioGroup(frames(), 1); expect(changes.mock.calls).toHaveLength(before); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('does not reset an existing translation when Home keeps its already checked first frame', async () => {
    const built = [{ aa: 'Met', codon: 'AUG', pos: 0 }];
    await mount('translate', { dnaReadingFrame: 1, transPlaying: true, transStep: 1, builtProtein: built, protein: [] });
    const before = changes.mock.calls.length; expect((await key(frame(1), 'Home')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(frame(1)); expect(changes.mock.calls).toHaveLength(before);
    expect(latest.dnaLab.transPlaying).toBe(true); expect(latest.dnaLab.transStep).toBe(1); expect(latest.dnaLab.builtProtein).toBe(built);
    expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('keeps no-AUG frames selectable while protecting ribosome execution', async () => {
    await mount('translate', { dnaReadingFrame: 1, dnaGradeOverride: 'K-2' });
    await activateByKey(frame(2), ' '); expectRadioGroup(frames(), 1); expect(frame(2).disabled).toBe(false);
    expect(query('[data-dna-reading-frame-detail]').getAttribute('data-frame-status')).toBe('no-start');
    const run = buttonNamed(query('[data-dna-workspace="translate"]'), 'No AUG in frame +2'); expect(run.disabled).toBe(true);
    expect(latest.dnaLab.transPlaying).toBe(false); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('translates the selected +2 ORF into Met-Lys with the original completion reward', async () => {
    await mount('translate', { dnaSequence: 'AATGAAATAA', dnaReadingFrame: 1 });
    await key(frame(1), 'ArrowDown'); expect(query('[data-dna-reading-frame-detail]').getAttribute('data-frame-status')).toBe('complete');
    expect(query('[data-dna-reading-frame-detail]').textContent).toContain('Met-Lys');
    await activate(buttonNamed(query('[data-dna-workspace="translate"]'), 'Translate frame +2'));
    await advance(800); await advance(800); await advance(800);
    expect(latest.dnaLab.protein).toEqual([{ codon: 'AUG', aa: 'Met', pos: 1 }, { codon: 'AAA', aa: 'Lys', pos: 4 }]);
    expect(latest.dnaLab.transPlaying).toBe(false);
    expect(xp.mock.calls.filter(call => call[2] === 'Completed translation')).toEqual([['dnaLab', 15, 'Completed translation']]); preserved();
  });
});

describe('DNA guided checkpoint selection and station gating', () => {
  it.each(['', 'G', 'invalid saved choice'])('gives selection %j one predictable tab stop without submitting', async selected => {
    await mount('build', { guidedStarted: true, guidedStep: 0, guidedSelectedAnswer: selected, guidedAnswers: {} });
    expectRadioGroup(guidedRadios(), selected === 'G' ? 1 : -1); expect(document.activeElement).toBe(outside);
    expect(latest.dnaLab.guidedSelectedAnswer).toBe(selected); expect(latest.dnaLab.guidedAnswers).toEqual({}); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('navigates and wraps the checkpoint choices without grading until Check answer, then preserves station gating and XP', async () => {
    await mount('build', { guidedStarted: true, guidedStep: 0, guidedSelectedAnswer: '', guidedAnswers: {}, guidedActions: {} });
    for (const [from, pressed, selected] of [[0, 'Home', 0], [0, 'ArrowLeft', 2], [2, 'ArrowDown', 0], [0, 'ArrowRight', 1],
      [1, 'ArrowUp', 0], [0, 'End', 2], [2, 'Home', 0]]) {
      expect((await key(guidedRadios()[from], pressed)).defaultPrevented).toBe(true);
      expectRadioGroup(guidedRadios(), selected); expect(document.activeElement).toBe(guidedRadios()[selected]);
      expect(latest.dnaLab.guidedAnswers).toEqual({}); expect(xp).not.toHaveBeenCalled();
    }
    await activateByKey(guidedRadios()[1], 'Enter'); await activate(buttonNamed(guided(), 'Check answer'));
    expect(latest.dnaLab.guidedAnswers.pairing).toEqual({ attempts: 1, answer: 'G', correct: false });
    expect(buttonNamed(guided(), 'Continue')).toBeUndefined(); expect(xp).not.toHaveBeenCalled();
    await key(guidedRadios()[1], 'Home'); await activate(buttonNamed(guided(), 'Check answer'));
    expect(latest.dnaLab.guidedAnswers.pairing).toEqual({ attempts: 2, answer: 'T', correct: true });
    expect(buttonNamed(guided(), 'Continue')).toBeUndefined(); expect(buttonNamed(guided(), 'Confirm base pairing')).toBeDefined();
    await activate(buttonNamed(guided(), 'Check answer')); expect(xp.mock.calls.filter(call => call[2] === 'Guided DNA checkpoint')).toEqual([['dnaLab', 5, 'Guided DNA checkpoint']]);
    await activate(buttonNamed(guided(), 'Confirm base pairing')); await activate(buttonNamed(guided(), 'Continue'));
    expect(latest.dnaLab.guidedStep).toBe(1); expect(latest.dnaLab.tab).toBe('transcribe'); expect(latest.dnaLab.guidedActions).toEqual({ pairing: true });
    expect(latest.dnaLab.guidedSelectedAnswer).toBe(''); expectRadioGroup(guidedRadios(), -1); preserved();
  });

  it('keeps a saved final checkpoint selectable and requires the actual insertion before completing', async () => {
    await mount('mutate', { dnaGradeOverride: '6-8', guidedStarted: true, guidedStep: 3, guidedSelectedAnswer: 'No possible change', guidedAnswers: {}, guidedActions: {} });
    expectRadioGroup(guidedRadios(), 1); await key(guidedRadios()[1], 'Home'); await activate(buttonNamed(guided(), 'Check answer'));
    expect(latest.dnaLab.guidedAnswers.mutation.correct).toBe(true); expect(buttonNamed(guided(), 'Finish investigation')).toBeUndefined();
    expect(guided().textContent).toContain('Apply a one-base insertion');
    const stationMutationLog = [{ type: 'Insertion', pos: 3, to: 'A' }];
    await commit({ mutationLog: stationMutationLog }); await activate(buttonNamed(guided(), 'Finish investigation'));
    expect(latest.dnaLab.guidedComplete).toBe(true); expect(latest.dnaLab.guidedStarted).toBe(false);
    expect(xp.mock.calls.filter(call => call[2] === 'Completed guided DNA investigation')).toEqual([['dnaLab', 20, 'Completed guided DNA investigation']]);
    preserved(stationMutationLog);
  });
});

describe('DNA lab report disclosure and return focus', () => {
  it('exposes a truthful conditional relationship and returns focus from Hide report without changing the draft', async () => {
    await mount('build'); const toggle = query('#dna-report-toggle');
    expect(toggle.tagName).toBe('BUTTON'); expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(toggle.hasAttribute('aria-controls')).toBe(false);
    expect(query('[data-dna-lab-report]')).toBeNull(); await activateByKey(toggle, 'Enter');
    const panel = query('#dna-lab-report-panel'); expect(panel.getAttribute('data-dna-lab-report')).toBe('true'); expect(panel.getAttribute('role')).toBe('region');
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(toggle.getAttribute('aria-controls')).toBe(panel.id); expect(nameOf(panel)).toBe('Student DNA lab report');
    await activate(buttonNamed(panel, 'Hide report')); await advance(); expect(document.activeElement).toBe(toggle);
    expect(query('#dna-lab-report-panel')).toBeNull(); expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(toggle.hasAttribute('aria-controls')).toBe(false);
    expect(announce).toHaveBeenCalledWith('Lab report preview closed.'); expect(xp).not.toHaveBeenCalled(); preserved();
  });
});

describe('Mutation Effect Sleuth accessible answer actions', () => {
  it('keeps the disclosure truthful and focuses a question only after explicit Start', async () => {
    await mount('protein'); const toggle = query('#dna-ms-toggle'); expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(document.activeElement).toBe(outside);
    await activate(toggle); expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement).toBe(toggle);
    expect(query('#dna-ms-feedback')).toBeNull(); await activateByKey(query('#dna-ms-start'), 'Enter'); await advance();
    const question = query('#dna-ms-vignette'); expect(question.tagName).toBe('H3'); expect(question.tabIndex).toBe(-1); expect(document.activeElement).toBe(question);
    expect(latest.dnaLab.msSeed).toBe(16818); expect(latest.dnaLab.msIdx).toBe(8); expect(latest.dnaLab.msShown).toEqual([8]);
    expectAnswerSemantics(); expect(msStatus().textContent.trim()).toBe('');
    await activate(query('#dna-ms-toggle')); expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(document.activeElement).toBe(toggle); preserved();
  });

  it.each(examples)('preserves science for vignette index $index and announces only the concise answer result', async example => {
    await mount('protein', { msOpen: true, msIdx: example.index, msShown: [example.index], msSeed: 42, msScore: 2, msRounds: 3, msStreak: 1, msBest: 4 });
    const live = msStatus(); expect(live.textContent.trim()).toBe(''); expect(document.activeElement).toBe(outside); expectAnswerSemantics();
    expect(sleuth().textContent).toContain(example.before); expect(sleuth().textContent).toContain(example.after);
    const answer = msAnswer(example.correct); await activateByKey(answer, ' ');
    expect(latest.dnaLab.msAnswered).toBe(true); expect(latest.dnaLab.msPick).toBe(example.correct);
    expect(latest.dnaLab.msScore).toBe(3); expect(latest.dnaLab.msRounds).toBe(4); expect(latest.dnaLab.msStreak).toBe(2); expect(latest.dnaLab.msBest).toBe(4);
    expect(live.textContent).toMatch(/correct/i); expect(live.textContent.length).toBeLessThan(180); expect(live.querySelector('button')).toBeNull();
    expect(sleuth().textContent).toContain(example.protein); expect(query('#dna-ms-feedback')).toBe(live); expect(document.activeElement).toBe(answer); expectAnswerSemantics(true);
    const before = changes.mock.calls.length; await activateByKey(answer, 'Enter'); await activate(msAnswer('missense'));
    expect(latest.dnaLab.msScore).toBe(3); expect(latest.dnaLab.msRounds).toBe(4); expect(changes.mock.calls).toHaveLength(before);
    expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('does not turn arrow exploration into submission and accepts only the first same-turn answer', async () => {
    await mount('protein', { msOpen: true, msIdx: 0, msShown: [0], msSeed: 42, msScore: 2, msRounds: 3, msStreak: 2, msBest: 3 });
    await key(msAnswer('missense'), 'ArrowRight'); expect(latest.dnaLab.msAnswered).not.toBe(true); expect(latest.dnaLab.msRounds).toBe(3);
    const wrong = msAnswer('missense'), correct = msAnswer('silent'); wrong.focus();
    await act(async () => { wrong.click(); correct.click(); });
    expect(latest.dnaLab.msPick).toBe('missense'); expect(latest.dnaLab.msRounds).toBe(4); expect(latest.dnaLab.msScore).toBe(2);
    expect(latest.dnaLab.msStreak).toBe(0); expect(latest.dnaLab.msBest).toBe(3); expect(document.activeElement).toBe(wrong);
    expect(msStatus().textContent).toMatch(/silent/i); expect(msStatus().textContent).toMatch(/missense/i); expectAnswerSemantics(true); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('waits for manual Next, preserves seeded choice order and clears the same result node before focusing the new vignette', async () => {
    await mount('protein', { msOpen: true, msIdx: 0, msShown: [0], msSeed: 1, msScore: 0, msRounds: 0, msStreak: 0, msBest: 0 });
    const live = msStatus(); await activate(msAnswer('silent')); await advance(60000);
    expect(latest.dnaLab.msIdx).toBe(0); expect(latest.dnaLab.msShown).toEqual([0]); expect(latest.dnaLab.msRounds).toBe(1);
    await activate(buttonNamed(sleuth(), 'Next vignette')); await advance();
    // seed 16818 chooses offset 6 of the nine unused indices [1..9].
    expect(latest.dnaLab.msSeed).toBe(16818); expect(latest.dnaLab.msIdx).toBe(7); expect(latest.dnaLab.msShown).toEqual([0, 7]);
    expect(latest.dnaLab.msAnswered).toBe(false); expect(latest.dnaLab.msPick).toBeNull(); expect(latest.dnaLab.msScore).toBe(1); expect(latest.dnaLab.msRounds).toBe(1);
    expect(query('#dna-ms-feedback')).toBe(live); expect(live.textContent.trim()).toBe(''); expect(document.activeElement).toBe(query('#dna-ms-vignette')); expectAnswerSemantics(); preserved();
  });

  it('completes and restarts without deleting the best streak or reseeding future practice', async () => {
    await mount('protein', { msOpen: true, msIdx: 0, msShown: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], msSeed: 9876, msScore: 9, msRounds: 9, msStreak: 9, msBest: 9 });
    await activate(msAnswer('silent')); expect(latest.dnaLab.msScore).toBe(10); expect(latest.dnaLab.msRounds).toBe(10); expect(latest.dnaLab.msBest).toBe(10);
    expect(sleuth().textContent).toContain('All 10 vignettes complete'); expect(buttonNamed(sleuth(), 'Next vignette')).toBeUndefined();
    await activate(buttonNamed(sleuth(), 'Restart')); await advance(); expect(document.activeElement).toBe(query('#dna-ms-start'));
    expect(latest.dnaLab.msIdx).toBe(-1); expect(latest.dnaLab.msShown).toEqual([]); expect(latest.dnaLab.msScore).toBe(0); expect(latest.dnaLab.msRounds).toBe(0); expect(latest.dnaLab.msStreak).toBe(0);
    expect(latest.dnaLab.msBest).toBe(10); expect(latest.dnaLab.msSeed).toBe(9876); expect(query('#dna-ms-feedback')).toBeNull(); expect(xp).not.toHaveBeenCalled(); preserved();
  });
});
