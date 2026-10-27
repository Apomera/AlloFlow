// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const sequence = 'ATGC', complement = 'TACG';
const sibling = Object.freeze({ observations: 'Keep the ecology notebook.', revision: 17 });
const references = Object.freeze({ expSection: null, notes: 'Keep the reference notebook.' });
const mutationLog = Object.freeze([{ type: 'Substitution', pos: 3, from: 'A', to: 'C' }]);
const history = Object.freeze([{ id: 'control', label: 'Saved control', dnaSequence: 'ATGAAATAA', mutationLog: [] }]);
const draft = Object.freeze({ notes: 'Keep a custom notebook field.' });
const scenario = Object.freeze({ dnaScenarioId: 'frameshift_deletion', dnaScenarioPrediction: 'Frameshift', dnaScenarioRun: false,
  dnaScenarioRevision: 'uncertain', dnaScenarioRevisionReason: 'Keep the scenario explanation.', dnaScenarioComplete: false, dnaScenarioScore: 0 });
const evidence = Object.freeze({ dnaEvidenceClaim: 'base_pairing', dnaEvidenceCitation: 'sequence', dnaEvidenceReasoning: 'Base pairing gives each daughter one parental and one new strand.', dnaEvidenceScore: 3 });
const savedProtein = Object.freeze([{ aa: 'Met', codon: 'AUG', pos: 0 }]);
let config, host, outside, root, latest, updateStore, changes, xp, announce, celebrate, toast, ai, actDescriptor, matchMediaDescriptor;
const query = selector => host.querySelector(selector);
const scope = () => query('[data-dna-replication]');
const field = name => query('#dna-repl-' + name);
const radio = base => query('input[name="dna-repl-base"][value="' + base + '"]');
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce, celebrate, addToast: toast,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(patch = {}, { reducedMotion = false, strict = false } = {}) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: query => ({ matches: reducedMotion && query.includes('prefers-reduced-motion'), media: query,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; } }) });
  const dnaLab = { tab: 'replicate', showHelix3d: false, dnaFocusMode: false, dnaGradeOverride: '9-12', visitedTabs: { build: true, replicate: true, mutate: true },
    dnaSequence: sequence, mutationLog, replStep: 0, replPlaying: false, speed: 1, mRNA: 'AUG', protein: savedProtein, animStep: 2,
    dnaExperimentHistory: history, dnaCompareReflection: 'Keep the comparison reflection.', dnaReportNote: 'Keep the student report reflection.', unknownDraft: draft,
    replReflection: 'Keep the replication reflection.', badges: { copyMachine: true, speedDemon: true }, ...scenario, ...evidence, ...patch };
  outside.focus(); await act(async () => { const content = h(Host, { seed: { dnaLab, ecology: sibling, dna: references } }); root.render(strict ? h(React.StrictMode, null, content) : content); });
}
async function patch(values) { await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, ...values } })); }); }
async function activate(element, ownFocus = true) {
  expect(element).toBeTruthy(); if (ownFocus) element.focus(); await act(async () => { element.click(); });
}
async function advance(milliseconds = 500) { await act(async () => { vi.advanceTimersByTime(milliseconds); }); }
async function completeManually() { for (let i = 0; i < 12 && Number(latest.dnaLab.replStep || 0) < latest.dnaLab.dnaSequence.length; i++) await activate(field('step')); }
async function input(element, value) {
  expect(element?.tagName).toBe('TEXTAREA'); await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
function preserved({ reflection = 'Keep the replication reflection.' } = {}) {
  expect(latest.ecology).toBe(sibling); expect(latest.dna).toBe(references); expect(latest.dnaLab.unknownDraft).toBe(draft);
  expect(latest.dnaLab.mutationLog).toBe(mutationLog); expect(latest.dnaLab.dnaExperimentHistory).toBe(history); expect(latest.dnaLab.mRNA).toBe('AUG');
  expect(latest.dnaLab.protein).toBe(savedProtein); expect(latest.dnaLab.animStep).toBe(2); expect(latest.dnaLab.dnaCompareReflection).toBe('Keep the comparison reflection.');
  expect(latest.dnaLab.dnaReportNote).toBe('Keep the student report reflection.'); expect(latest.dnaLab.replReflection).toBe(reflection);
  for (const [key, value] of Object.entries(scenario)) expect(latest.dnaLab[key]).toBe(value); for (const [key, value] of Object.entries(evidence)) expect(latest.dnaLab[key]).toBe(value);
  for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function status(node) {
  expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status'); expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true');
}
beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia'); vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
  changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); celebrate = vi.fn(); toast = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation';
  document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally { host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    if (matchMediaDescriptor) Object.defineProperty(window, 'matchMedia', matchMediaDescriptor); else delete window.matchMedia; }
});

describe('Replication controls and explicit participation', () => {
  it('opens with native controls, named progress and stable feedback without writing or taking host focus', async () => {
    await mount(); expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside); expect(xp).not.toHaveBeenCalled();
    for (const name of ['play', 'step', 'reset', 'check']) expect(field(name).tagName).toBe('BUTTON');
    status(field('status')); expect(field('status').textContent).toMatch(/ready|predict|copy/i); const progress = field('progress'); expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('0'); expect(progress.getAttribute('aria-valuemax')).toBe('4');
    const speeds = [...scope().querySelectorAll('[data-dna-repl-speed]')]; expect(speeds.map(button => button.getAttribute('data-dna-repl-speed'))).toEqual(['0.5', '1', '2', '4']);
    expect(speeds.map(button => button.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']); preserved();
  });

  it('copies one base pair per deliberate action and keeps the focused action and stable status mounted', async () => {
    await mount(); const button = field('step'), live = field('status'); await activate(button);
    expect(latest.dnaLab.replStep).toBe(1); expect(latest.dnaLab.replSequence).toBe(sequence); expect(latest.dnaLab.replPlaying).toBe(false);
    expect(field('step')).toBe(button); expect(document.activeElement).toBe(button); expect(field('status')).toBe(live); expect(live.textContent).not.toBe('');
    expect(field('progress').getAttribute('aria-valuenow')).toBe('1'); await advance(2000); expect(latest.dnaLab.replStep).toBe(1);
    expect(latest.dnaLab.dnaSequence).toBe(sequence); expect(xp).not.toHaveBeenCalled(); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it('deduplicates a repeated same-render step without skipping a base pair', async () => {
    await mount(); const button = field('step'); button.focus(); await act(async () => { button.click(); button.click(); button.click(); });
    expect(latest.dnaLab.replStep).toBe(1); expect(document.activeElement).toBe(button); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('retains play and pause focus, rejects manual stepping during playback, and honors 500 divided by speed timing', async () => {
    await mount({ speed: 2 }); const play = field('play'), live = field('status'); await activate(play);
    expect(field('play')).toBe(play); expect(document.activeElement).toBe(play); expect(play.textContent).toMatch(/pause/i); expect(latest.dnaLab.replPlaying).toBe(true);
    expect(field('step').getAttribute('aria-disabled')).toBe('true'); await activate(field('step')); expect(latest.dnaLab.replStep).toBe(0);
    const runningText = live.textContent; await advance(249); expect(latest.dnaLab.replStep).toBe(0); await advance(1); expect(latest.dnaLab.replStep).toBe(1); expect(live.textContent).toBe(runningText);
    await activate(play); expect(latest.dnaLab.replPlaying).toBe(false); expect(document.activeElement).toBe(play); expect(play.textContent).toMatch(/resume/i);
    await advance(1000); expect(latest.dnaLab.replStep).toBe(1); await activate(play); await advance(250); expect(latest.dnaLab.replStep).toBe(2); preserved();
  });

  it('leaves the original pending tick intact after an unrelated notebook update', async () => {
    await mount(); await activate(field('play')); await advance(350); await patch({ parallelNotebookNote: 'A separate observation.' });
    await advance(149); expect(latest.dnaLab.replStep).toBe(0); await advance(1); expect(latest.dnaLab.replStep).toBe(1);
    expect(latest.dnaLab.parallelNotebookNote).toBe('A separate observation.'); preserved();
  });

  it('pauses on leaving the replication tab and requires an explicit action after returning', async () => {
    await mount(); await activate(field('play')); await advance(500); const step = latest.dnaLab.replStep; outside.focus();
    await patch({ tab: 'build' }); await advance(2000); expect(latest.dnaLab.replStep).toBe(step); await patch({ tab: 'replicate' });
    await advance(2000); expect(latest.dnaLab.replStep).toBe(step); expect(document.activeElement).toBe(outside);
    await activate(field('play')); await advance(500); expect(latest.dnaLab.replStep).toBe(step + 1); preserved();
  });

  it('keeps reduced-motion learners in control of manual steps while allowing an explicit timed run', async () => {
    await mount({}, { reducedMotion: true }); await advance(2000); expect(latest.dnaLab.replStep).toBe(0);
    await activate(field('step')); expect(latest.dnaLab.replStep).toBe(1); await advance(2000); expect(latest.dnaLab.replStep).toBe(1);
    await activate(field('play')); await advance(500); expect(latest.dnaLab.replStep).toBe(2); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('does not resume or reward a restored playing state, including a completed legacy run', async () => {
    await mount({ replStep: 9999, replPlaying: true }); expect(changes).not.toHaveBeenCalled(); expect(field('progress').getAttribute('aria-valuenow')).toBe('4');
    await advance(5000); expect(changes).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside);
    await activate(field('play')); expect(latest.dnaLab.replStep).toBe(0); expect(latest.dnaLab.replPlaying).toBe(true); await advance(500); expect(latest.dnaLab.replStep).toBe(1); preserved();
  });

  it('cancels pending work on unmount without later updates or focus movement', async () => {
    await mount(); await activate(field('play')); await act(async () => { root.unmount(); }); root = null; changes.mockClear(); outside.focus(); await advance(3000);
    expect(changes).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside);
  });
});

describe('Replication prediction and molecular evidence', () => {
  it.each([{ step: 0, correct: 'T', wrong: 'A' }, { step: 1, correct: 'A', wrong: 'G' }, { step: 2, correct: 'C', wrong: 'T' }, { step: 3, correct: 'G', wrong: 'C' }])(
    'checks the complementary base at position $step without advancing the model or awarding points', async ({ step, correct, wrong }) => {
      await mount({ replStep: step }); const prediction = field('prediction'); expect(prediction.tagName).toBe('FIELDSET'); expect(prediction.querySelector('legend').textContent.trim()).not.toBe('');
      expect([...prediction.querySelectorAll('input')].map(input => input.value)).toEqual(['A', 'T', 'G', 'C']);
      await activate(radio(wrong)); await activate(field('check')); expect(latest.dnaLab.replPrediction).toMatchObject({ sequence, step, choice: wrong });
      expect(latest.dnaLab.replPrediction.feedback).toMatch(/try|pair|complement|not/i); expect(latest.dnaLab.replStep).toBe(step);
      await activate(radio(correct)); await activate(field('check')); expect(latest.dnaLab.replPrediction).toMatchObject({ sequence, step, choice: correct });
      expect(latest.dnaLab.replPrediction.feedback).toMatch(/correct|matches|pairs/i); expect(latest.dnaLab.replStep).toBe(step); expect(xp).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(field('check')); preserved();
    }
  );

  it('clears only the old prediction on advancing and retains an authored replication reflection through Reset', async () => {
    await mount(); const text = 'Each daughter has one original DNA strand and one complementary newly made strand.';
    const reflection = field('reflection'); expect(reflection.labels).toHaveLength(1); expect(reflection.labels[0].htmlFor).toBe(reflection.id);
    const ids = reflection.getAttribute('aria-describedby').split(/\s+/); expect(ids.every(id => document.getElementById(id))).toBe(true);
    await input(reflection, text); await activate(radio('T')); await activate(field('check')); await activate(field('step'));
    expect(latest.dnaLab.replPrediction?.choice || '').toBe(''); expect(latest.dnaLab.replReflection).toBe(text); expect([...field('prediction').querySelectorAll('input')].some(input => input.checked)).toBe(false);
    const reset = field('reset'); await activate(reset); expect(latest.dnaLab.replStep).toBe(0); expect(latest.dnaLab.replPlaying).toBe(false);
    expect(field('reset')).toBe(reset); expect(document.activeElement).toBe(reset); expect(field('reflection').value).toBe(text); preserved({ reflection: text });
  });

  it('explains both parental and new daughter strands in a named region without requiring the canvas', async () => {
    await mount(); await completeManually(); const region = field('evidence'); expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-labelledby') || region.getAttribute('aria-label')).toBeTruthy(); expect(region.textContent).toContain(sequence); expect(region.textContent).toContain(complement);
    expect(region.textContent).toMatch(/parental|original/i); expect(region.textContent).toMatch(/new/i); expect(region.textContent).toMatch(/daughter/i);
    expect([...region.querySelectorAll('[data-dna-repl-strand=parent]')].map(node => node.textContent)).toEqual([sequence, complement]);
    expect([...region.querySelectorAll('[data-dna-repl-strand=new]')].map(node => node.textContent)).toEqual([complement, sequence]);
    const canvas = scope().querySelector('canvas'), described = canvas.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id));
    expect(described.every(Boolean)).toBe(true); expect(described.map(node => node.textContent).join(' ')).toMatch(/strand evidence below/i);
    expect(latest.dnaLab.dnaSequence).toBe(sequence); preserved();
  });
});

describe('Replication sequence ownership and robust restoration', () => {
  it('freezes a running snapshot when the DNA changes and copies the changed sequence only after Reset', async () => {
    await mount(); await activate(field('play')); await advance(500); const snapshot = latest.dnaLab.replSequence; outside.focus();
    await patch({ dnaSequence: 'GGCC' }); expect(snapshot).toBe(sequence); expect(field('status').textContent).toMatch(/changed|reset/i);
    expect(field('evidence').textContent).toContain(sequence); expect(field('evidence').textContent).toContain(complement);
    await advance(2000); expect(latest.dnaLab.replStep).toBe(1); expect(latest.dnaLab.replSequence).toBe(snapshot); expect(document.activeElement).toBe(outside);
    const before = latest; await activate(field('step')); await activate(field('play')); expect(latest.dnaLab.replStep).toBe(before.dnaLab.replStep); expect(xp).not.toHaveBeenCalled();
    await activate(field('reset')); expect(latest.dnaLab.replSequence).toBe('GGCC'); expect(latest.dnaLab.replStep).toBe(0); expect(field('evidence').textContent).toContain('GGCC');
    await activate(field('step')); expect(latest.dnaLab.replStep).toBe(1); expect(latest.dnaLab.dnaSequence).toBe('GGCC'); preserved();
  });

  it('captures a restored partial run in memory without writing and detects subsequent sequence changes', async () => {
    await mount({ replStep: 2, replPlaying: true }); expect(changes).not.toHaveBeenCalled(); expect(latest.dnaLab.replSequence).toBeUndefined();
    await advance(1500); expect(latest.dnaLab.replStep).toBe(2); await patch({ dnaSequence: 'TTAA' }); expect(field('status').textContent).toMatch(/changed|reset/i);
    expect(field('evidence').textContent).toContain(sequence); expect(field('progress').getAttribute('aria-valuenow')).toBe('2'); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('keeps empty DNA at zero progress and blocks all completion paths without NaN percentages or rewards', async () => {
    await mount({ dnaSequence: '' }); expect(scope().textContent).not.toContain('NaN'); expect(field('progress').getAttribute('aria-valuenow')).toBe('0');
    expect(field('play').getAttribute('aria-disabled')).toBe('true'); expect(field('step').getAttribute('aria-disabled')).toBe('true');
    await activate(field('play')); await activate(field('step')); await activate(field('check')); await advance(3000);
    expect(latest.dnaLab.dnaSequence).toBe(''); expect(latest.dnaLab.replStep).toBe(0); expect(xp).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); preserved();
  });

  it.each([{ value: -2, expected: '0' }, { value: 2.8, expected: '2' }, { value: Infinity, expected: '0' }, { value: NaN, expected: '0' }, { value: 'invalid', expected: '0' }, { value: 99, expected: '4' }])(
    'normalizes saved progress $value for presentation without a migration write', async ({ value, expected }) => {
      await mount({ replStep: value }); expect(changes).not.toHaveBeenCalled(); expect(field('progress').getAttribute('aria-valuenow')).toBe(expected);
      expect(scope().textContent).not.toContain('NaN'); expect(xp).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside); preserved();
    }
  );

  it.each([-1, 0, 3, Infinity, 'fast'])('uses safe local playback speed for saved invalid speed %s without rewriting unrelated state', async value => {
    await mount({ speed: value }); expect(changes).not.toHaveBeenCalled(); expect(query('[data-dna-repl-speed="1"]').getAttribute('aria-pressed')).toBe('true');
    await activate(field('play')); await advance(499); expect(latest.dnaLab.replStep).toBe(0); await advance(1); expect(latest.dnaLab.replStep).toBe(1);
    expect(latest.dnaLab.speed).toBe(value); preserved();
  });
});

describe('Replication completion and reward persistence', () => {
  it('awards the original completion credit once when the final manual step is repeated in the same batch', async () => {
    await mount({ replStep: 3 }); const button = field('step'); button.focus(); await act(async () => { button.click(); button.click(); button.click(); });
    expect(latest.dnaLab.replStep).toBe(4); expect(latest.dnaLab.replPlaying).toBe(false); expect(latest.dnaLab.replRewardedSequence).toBe(sequence);
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 15, 'Completed DNA replication'); expect(celebrate).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(button);
    await activate(button); expect(xp).toHaveBeenCalledTimes(1); expect(latest.dnaLab.dnaSequence).toBe(sequence); preserved();
  });

  it('preserves both first-completion badges at speed four without overwriting the earlier badge', async () => {
    await mount({ speed: 4, badges: { existingBadge: true } }); await completeManually();
    expect(latest.dnaLab.badges).toEqual({ existingBadge: true, copyMachine: true, speedDemon: true });
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 15, 'Completed DNA replication'); expect(celebrate).toHaveBeenCalledTimes(3); preserved();
  });

  it('completes timed copying without stealing host focus and keeps the full result available for review', async () => {
    await mount(); await activate(field('play')); outside.focus(); for (let step = 0; step < 4; step++) await advance(500);
    expect(latest.dnaLab.replStep).toBe(4); expect(latest.dnaLab.replPlaying).toBe(false); expect(document.activeElement).toBe(outside);
    expect(field('status').textContent).toMatch(/complete/i); expect(field('evidence').textContent).toContain(sequence); expect(field('evidence').textContent).toContain(complement);
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 15, 'Completed DNA replication'); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it('lets a learner replay or restore the same completed sequence without collecting its reward again', async () => {
    await mount(); await completeManually(); await activate(field('reset')); await completeManually(); expect(xp).toHaveBeenCalledTimes(1);
    const saved = { ...latest.dnaLab }; await act(async () => { root.unmount(); }); root = ReactDOMClient.createRoot(host); xp.mockClear(); changes.mockClear(); celebrate.mockClear();
    await mount(saved); expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside); await activate(field('reset')); await completeManually();
    expect(latest.dnaLab.replStep).toBe(4); expect(xp).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); preserved();
  });

  it('allows a different DNA sequence to earn completion credit after a deliberate reset', async () => {
    await mount(); await completeManually(); await patch({ dnaSequence: 'GGCC' }); await activate(field('reset')); await completeManually();
    expect(latest.dnaLab.replRewardedSequence).toBe('GGCC'); expect(xp.mock.calls).toEqual([['dnaLab', 15, 'Completed DNA replication'], ['dnaLab', 15, 'Completed DNA replication']]);
    expect(latest.dnaLab.dnaSequence).toBe('GGCC'); expect(latest.dnaLab.replStep).toBe(4); preserved();
  });

  it('does not duplicate final-step credit under StrictMode rendering and updater replay', async () => {
    await mount({ replStep: 3 }, { strict: true }); expect(changes).not.toHaveBeenCalled(); await activate(field('step'));
    expect(latest.dnaLab.replStep).toBe(4); expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 15, 'Completed DNA replication'); expect(celebrate).toHaveBeenCalledTimes(1); preserved();
  });
});
