// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const sequence = 'ATGC', template = 'TACG', transcript = 'AUGC';
const sibling = Object.freeze({ observations: 'Keep the ecology notebook.', revision: 23 });
const references = Object.freeze({ expSection: null, notes: 'Keep reference notes.' });
const mutationLog = Object.freeze([{ type: 'Substitution', pos: 3, from: 'A', to: 'C' }]);
const history = Object.freeze([{ id: 'control', label: 'Saved control', dnaSequence: 'ATGAAATAA', mutationLog: [] }]);
const draft = Object.freeze({ notes: 'Keep the custom notebook.' });
const savedProtein = Object.freeze([{ aa: 'Met', codon: 'AUG', pos: 0 }]);
const replAttempt = Object.freeze({ sequence: 'ATGAAATAA', step: 2 });
const scenario = Object.freeze({ dnaScenarioId: 'frameshift_deletion', dnaScenarioPrediction: 'Frameshift', dnaScenarioRun: false,
  dnaScenarioRevision: 'uncertain', dnaScenarioRevisionReason: 'Keep the scenario explanation.', dnaScenarioComplete: false, dnaScenarioScore: 0 });
const evidence = Object.freeze({ dnaEvidenceClaim: 'base_pairing', dnaEvidenceCitation: 'sequence', dnaEvidenceReasoning: 'The template directs complementary RNA.', dnaEvidenceScore: 3 });
let config, host, outside, root, latest, updateStore, changes, xp, announce, celebrate, toast, ai, actDescriptor, matchMediaDescriptor;
const query = selector => host.querySelector(selector);
const scope = () => query('[data-dna-transcription]');
const field = name => query('#dna-tx-' + name);
const radio = base => query('input[name="dna-tx-base"][value="' + base + '"]');
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce, celebrate, addToast: toast,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(patch = {}, { reducedMotion = false, strict = false } = {}) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: query => ({ matches: reducedMotion && query.includes('prefers-reduced-motion'), media: query,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; } }) });
  const dnaLab = { tab: 'transcribe', showHelix3d: false, dnaFocusMode: false, dnaGradeOverride: '9-12', visitedTabs: { build: true, transcribe: true, mutate: true },
    dnaSequence: sequence, mutationLog, mRNA: '', animStep: 0, animPlaying: false, speed: 1, protein: savedProtein,
    replSequence: replAttempt.sequence, replStep: replAttempt.step, replPlaying: false, replReflection: 'Keep replication notes.',
    dnaExperimentHistory: history, dnaCompareReflection: 'Keep comparison notes.', dnaReportNote: 'Keep report notes.', unknownDraft: draft,
    txReflection: 'Keep transcription notes.', badges: { messenger: true }, ...scenario, ...evidence, ...patch };
  outside.focus(); await act(async () => { const content = h(Host, { seed: { dnaLab, ecology: sibling, dna: references } }); root.render(strict ? h(React.StrictMode, null, content) : content); });
}
async function patch(values) { await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, ...values } })); }); }
async function activate(element, ownFocus = true) { expect(element).toBeTruthy(); if (ownFocus) element.focus(); await act(async () => { element.click(); }); }
async function advance(milliseconds = 600) { await act(async () => { vi.advanceTimersByTime(milliseconds); }); }
async function completeManually() { for (let i = 0; i < 12 && Number(latest.dnaLab.animStep || 0) < latest.dnaLab.dnaSequence.length; i++) await activate(field('step')); }
async function input(element, value) { expect(element?.tagName).toBe('TEXTAREA'); await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); }); }
function preserved({ reflection = 'Keep transcription notes.' } = {}) {
  expect(latest.ecology).toBe(sibling); expect(latest.dna).toBe(references); expect(latest.dnaLab.unknownDraft).toBe(draft);
  expect(latest.dnaLab.mutationLog).toBe(mutationLog); expect(latest.dnaLab.dnaExperimentHistory).toBe(history); expect(latest.dnaLab.protein).toBe(savedProtein);
  expect(latest.dnaLab.dnaCompareReflection).toBe('Keep comparison notes.'); expect(latest.dnaLab.dnaReportNote).toBe('Keep report notes.');
  expect(latest.dnaLab.replSequence).toBe(replAttempt.sequence); expect(latest.dnaLab.replStep).toBe(replAttempt.step); expect(latest.dnaLab.replReflection).toBe('Keep replication notes.');
  expect(latest.dnaLab.txReflection).toBe(reflection);
  for (const [key, value] of Object.entries(scenario)) expect(latest.dnaLab[key]).toBe(value); for (const [key, value] of Object.entries(evidence)) expect(latest.dnaLab[key]).toBe(value);
  for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function live(node) { expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status'); expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true'); }
function completionAwards() { return xp.mock.calls.filter(call => call[2] === 'Completed transcription'); }
function guidedContinue() { return [...query('[data-dna-guided]').querySelectorAll('button')].find(button => button.textContent.trim() === 'Continue'); }
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

describe('Transcription controls and deliberate playback', () => {
  it('opens without writing saved state or taking focus and exposes named native controls, progress and feedback', async () => {
    await mount(); expect(changes).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside);
    for (const name of ['play', 'step', 'reset', 'check']) expect(field(name).tagName).toBe('BUTTON');
    live(field('status')); live(field('prediction-feedback')); expect(field('status').textContent).toMatch(/ready|predict|RNA/i);
    expect(field('progress').getAttribute('role')).toBe('progressbar'); expect(field('progress').getAttribute('aria-valuenow')).toBe('0'); expect(field('progress').getAttribute('aria-valuemax')).toBe('4');
    const speeds = [...scope().querySelectorAll('[data-dna-tx-speed]')]; expect(speeds.map(node => node.getAttribute('data-dna-tx-speed'))).toEqual(['0.5', '1', '2', '4']);
    expect(speeds.map(node => node.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']); preserved();
  });
  it('adds exactly one coding-derived RNA base per deliberate step and mirrors progress for existing consumers', async () => {
    await mount(); const button = field('step'), status = field('status'); await activate(button);
    expect(latest.dnaLab.txAttempt).toMatchObject({ sequence, step: 1, rna: 'A' }); expect(latest.dnaLab.mRNA).toBe('A'); expect(latest.dnaLab.animStep).toBe(1); expect(latest.dnaLab.animPlaying).toBe(false);
    expect(field('step')).toBe(button); expect(document.activeElement).toBe(button); expect(field('status')).toBe(status); await advance(4000); expect(latest.dnaLab.animStep).toBe(1);
    await activate(button); expect(latest.dnaLab.txAttempt).toMatchObject({ sequence, step: 2, rna: 'AU' }); expect(latest.dnaLab.mRNA).toBe('AU'); expect(latest.dnaLab.dnaSequence).toBe(sequence); expect(xp).not.toHaveBeenCalled(); preserved();
  });
  it('ignores accidental same-render duplicate steps rather than skipping transcript bases', async () => {
    await mount(); const step = field('step'); step.focus(); await act(async () => { step.click(); step.click(); step.click(); });
    expect(latest.dnaLab.animStep).toBe(1); expect(latest.dnaLab.mRNA).toBe('A'); expect(document.activeElement).toBe(step); expect(xp).not.toHaveBeenCalled(); preserved();
  });
  it('keeps play and pause focus, blocks stepping while playing, and uses the original 600 divided by speed interval', async () => {
    await mount({ speed: 2 }); const play = field('play'), status = field('status'); await activate(play); expect(latest.dnaLab.animPlaying).toBe(true); expect(play.textContent).toMatch(/pause/i); expect(document.activeElement).toBe(play);
    expect(field('step').getAttribute('aria-disabled')).toBe('true'); await activate(field('step')); expect(latest.dnaLab.animStep).toBe(0);
    const text = status.textContent; await advance(299); expect(latest.dnaLab.animStep).toBe(0); await advance(1); expect(latest.dnaLab.mRNA).toBe('A'); expect(status.textContent).toBe(text);
    await activate(play); expect(latest.dnaLab.animPlaying).toBe(false); expect(play.textContent).toMatch(/resume/i); expect(document.activeElement).toBe(play); await advance(1600); expect(latest.dnaLab.mRNA).toBe('A');
    await activate(play); await advance(300); expect(latest.dnaLab.mRNA).toBe('AU'); expect(field('play')).toBe(play); preserved();
  });
  it('does not starve a pending tick when unrelated report notes update', async () => {
    await mount(); await activate(field('play')); await advance(400); await patch({ unrelatedPracticeNote: 'Typing while the model runs.' }); await advance(199); expect(latest.dnaLab.animStep).toBe(0); await advance(1); expect(latest.dnaLab.mRNA).toBe('A'); preserved();
  });
  it('stops on leaving transcription and requires explicit Resume after returning', async () => {
    await mount(); await activate(field('play')); await advance(); expect(latest.dnaLab.mRNA).toBe('A'); await patch({ tab: 'build' }); await advance(4000); expect(latest.dnaLab.mRNA).toBe('A');
    await patch({ tab: 'transcribe' }); await advance(4000); expect(latest.dnaLab.mRNA).toBe('A'); expect(field('play').textContent).toMatch(/resume/i); await activate(field('play')); await advance(); expect(latest.dnaLab.mRNA).toBe('AU'); preserved();
  });
  it('provides manual steps for reduced-motion learners while allowing their explicit timed run', async () => {
    await mount({}, { reducedMotion: true }); await advance(4000); expect(latest.dnaLab.animStep).toBe(0); await activate(field('step')); await advance(4000); expect(latest.dnaLab.mRNA).toBe('A');
    await activate(field('play')); await advance(); expect(latest.dnaLab.mRNA).toBe('AU'); preserved();
  });
  it.each([{ animStep: 2, mRNA: 'AU' }, { animStep: 4, mRNA: transcript }])('keeps restored playing progress $animStep quiet without free completion credit', async restored => {
    await mount({ ...restored, animPlaying: true }); expect(changes).not.toHaveBeenCalled(); await advance(10000); expect(latest.dnaLab.mRNA).toBe(restored.mRNA); expect(latest.dnaLab.animStep).toBe(restored.animStep); expect(xp).not.toHaveBeenCalled(); preserved();
  });
  it('cancels the pending timer on unmount without writing or announcing afterward', async () => {
    await mount(); await activate(field('play')); const before = changes.mock.calls.length; await act(async () => { root.unmount(); }); root = null; await advance(5000); expect(changes).toHaveBeenCalledTimes(before); expect(xp).not.toHaveBeenCalled(); expect(announce).not.toHaveBeenCalled();
  });
});

describe('RNA prediction, strand evidence and reflection', () => {
  it.each([{ step: 0, template: 'T', correct: 'A' }, { step: 1, template: 'A', correct: 'U' }, { step: 2, template: 'C', correct: 'G' }, { step: 3, template: 'G', correct: 'C' }])('predicts RNA $correct from template $template at position $step without advancing or awarding credit', async example => {
    await mount({ animStep: example.step, mRNA: transcript.slice(0, example.step), txAttempt: { sequence, step: example.step, rna: transcript.slice(0, example.step) } });
    expect(radio('T')).toBeNull(); expect([...query('#dna-tx-prediction').querySelectorAll('input[type=radio]')].map(node => node.value)).toEqual(['A', 'U', 'G', 'C']);
    const wrong = example.correct === 'A' ? 'U' : 'A'; await activate(radio(wrong)); const before = latest.dnaLab.mRNA; await activate(field('check'));
    expect(latest.dnaLab.txPrediction).toMatchObject({ sequence, step: example.step, choice: wrong }); expect(field('prediction-feedback').textContent).toContain(example.correct);
    expect(latest.dnaLab.animStep).toBe(example.step); expect(latest.dnaLab.mRNA).toBe(before); expect(xp).not.toHaveBeenCalled();
    await activate(radio(example.correct)); await activate(field('check')); expect(field('prediction-feedback').textContent).toMatch(/correct/i); expect(latest.dnaLab.mRNA).toBe(before); expect(document.activeElement).toBe(field('check')); preserved();
  });
  it('clears the prior position prediction on stepping and preserves the optional reflection across Reset', async () => {
    await mount(); await activate(radio('A')); await activate(field('check')); await input(field('reflection'), 'Template T directs RNA A, while RNA uses U in place of coding-strand T.'); await activate(field('step'));
    expect(query('input[name="dna-tx-base"]:checked')).toBeNull(); expect(field('prediction-feedback').textContent.trim()).toBe(''); await activate(field('reset'));
    expect(latest.dnaLab.txAttempt).toMatchObject({ sequence, step: 0, rna: '' }); expect(latest.dnaLab.animStep).toBe(0); expect(latest.dnaLab.mRNA).toBe(''); expect(document.activeElement).toBe(field('reset'));
    const reflection = 'Template T directs RNA A, while RNA uses U in place of coding-strand T.'; expect(field('reflection').value).toBe(reflection); preserved({ reflection });
  });
  it('exposes coding DNA, antiparallel template and completed mRNA in visible named evidence', async () => {
    await mount(); await completeManually(); const evidence = field('evidence'); expect(evidence.getAttribute('role')).toBe('region'); expect(evidence.getAttribute('aria-labelledby')).toBeTruthy();
    expect([...evidence.querySelectorAll('dd[data-dna-tx-strand]')].map(node => node.textContent)).toEqual([sequence, template, transcript]);
    expect(evidence.querySelector('details').open).toBe(false); expect(evidence.querySelector('summary').textContent).toBe('Compare with the expected RNA');
    expect(evidence.textContent).toContain(sequence); expect(evidence.textContent).toContain(template); expect(evidence.textContent).toContain(transcript); expect(evidence.textContent).toContain("Template 3' -> 5'"); expect(evidence.textContent).toContain("mRNA 5' -> 3'");
    const canvas = field('canvas'); expect(canvas.getAttribute('role')).toBe('img'); expect(canvas.tabIndex).toBe(0); const description = canvas.getAttribute('aria-describedby').split(/\s+/).map(id => query('#' + id)?.textContent || '').join(' '); expect(description).toMatch(/template|RNA|transcri/i);
    expect(field('reflection').labels[0].textContent).toMatch(/transcription reflection/i); expect(field('reflection').getAttribute('aria-describedby')).toBeTruthy(); preserved();
  });
});

describe('Transcription snapshot ownership and saved-state recovery', () => {
  it('keeps an earlier RNA snapshot when mutation clears the shared progress fields, then resets only on request', async () => {
    await mount(); await activate(field('step')); await activate(field('step')); const attempt = latest.dnaLab.txAttempt; expect(attempt).toMatchObject({ sequence, step: 2, rna: 'AU' });
    await patch({ dnaSequence: 'TTAA', animStep: 0, mRNA: '', animPlaying: false }); await advance(5000);
    expect(latest.dnaLab.txAttempt).toBe(attempt); expect(field('progress').getAttribute('aria-valuenow')).toBe('2'); expect(field('status').textContent).toMatch(/changed|earlier|reset/i);
    expect(field('play').getAttribute('aria-disabled')).toBe('true'); expect(field('step').getAttribute('aria-disabled')).toBe('true'); await activate(field('step')); expect(latest.dnaLab.mRNA).toBe(''); expect(latest.dnaLab.animStep).toBe(0); expect(xp).not.toHaveBeenCalled();
    await activate(field('reset')); expect(latest.dnaLab.txAttempt).toMatchObject({ sequence: 'TTAA', step: 0, rna: '' }); await activate(field('step')); expect(latest.dnaLab.mRNA).toBe('U'); expect(latest.dnaLab.animStep).toBe(1); preserved();
  });
  it('stops a running earlier sequence before a pending timer can overwrite changed DNA or its cleared RNA', async () => {
    await mount(); await activate(field('play')); await advance(); const attempt = latest.dnaLab.txAttempt; await patch({ dnaSequence: 'TTAA', animStep: 0, mRNA: '' }); await advance(5000);
    expect(latest.dnaLab.dnaSequence).toBe('TTAA'); expect(latest.dnaLab.mRNA).toBe(''); expect(latest.dnaLab.animStep).toBe(0); expect(latest.dnaLab.txAttempt).toBe(attempt); expect(xp).not.toHaveBeenCalled(); preserved();
  });
  it('requires Reset after same-DNA external RNA or progress changes instead of silently replacing saved RNA', async () => {
    await mount(); await activate(field('step')); await activate(field('step')); const attempt = latest.dnaLab.txAttempt;
    await patch({ animStep: 1, mRNA: 'G' }); const before = latest.dnaLab; await activate(field('play')); await activate(field('step')); await advance(5000);
    expect(latest.dnaLab.txAttempt).toBe(attempt); expect(latest.dnaLab.mRNA).toBe('G'); expect(latest.dnaLab.animStep).toBe(1); expect(latest.dnaLab).toBe(before); expect(field('status').textContent).toMatch(/reset/i); expect(xp).not.toHaveBeenCalled();
    await activate(field('reset')); await activate(field('step')); expect(latest.dnaLab.mRNA).toBe('A'); preserved();
  });
  it('captures a legacy consistent partial run without a migration write and binds it before later DNA changes', async () => {
    await mount({ animStep: 2, mRNA: 'AU', animPlaying: true }); expect(changes).not.toHaveBeenCalled(); expect(latest.dnaLab.txAttempt).toBeUndefined(); await patch({ dnaSequence: 'TTAA', animStep: 0, mRNA: '' });
    expect(field('progress').getAttribute('aria-valuenow')).toBe('2'); expect(field('step').getAttribute('aria-disabled')).toBe('true'); expect(latest.dnaLab.mRNA).toBe(''); expect(xp).not.toHaveBeenCalled(); preserved();
  });
  it('preserves inconsistent legacy RNA unchanged and makes recovery explicit', async () => {
    await mount({ animStep: 2, mRNA: 'GG', animPlaying: true }); expect(changes).not.toHaveBeenCalled(); await advance(5000);
    expect(latest.dnaLab.mRNA).toBe('GG'); expect(field('status').textContent).toMatch(/reset/i); await activate(field('play')); await activate(field('step')); expect(latest.dnaLab.mRNA).toBe('GG'); expect(xp).not.toHaveBeenCalled();
    await activate(field('reset')); expect(latest.dnaLab.mRNA).toBe(''); expect(latest.dnaLab.animStep).toBe(0); await activate(field('step')); expect(latest.dnaLab.mRNA).toBe('A'); preserved();
  });
  it('rejects a stale step closure when another update changes the DNA before the action is applied', async () => {
    await mount(); const step = field('step'); await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, dnaSequence: 'TTAA', mRNA: '', animStep: 0 } })); step.click(); });
    expect(latest.dnaLab.dnaSequence).toBe('TTAA'); expect(latest.dnaLab.mRNA).toBe(''); expect(latest.dnaLab.animStep).toBe(0); expect(xp).not.toHaveBeenCalled(); preserved();
  });
  it('keeps empty DNA at zero progress with no invalid percentages or completion paths', async () => {
    await mount({ dnaSequence: '', animStep: 0, mRNA: '', animPlaying: true }); expect(changes).not.toHaveBeenCalled(); expect(scope().textContent).not.toMatch(/NaN|Infinity/);
    expect(field('progress').getAttribute('aria-valuenow')).toBe('0'); expect(field('play').getAttribute('aria-disabled')).toBe('true'); expect(field('step').getAttribute('aria-disabled')).toBe('true');
    await activate(field('play')); await activate(field('step')); await advance(10000); expect(latest.dnaLab.mRNA).toBe(''); expect(xp).not.toHaveBeenCalled(); preserved();
  });
  it.each([{ value: -2, expected: 0 }, { value: 2.8, expected: 2 }, { value: Infinity, expected: 0 }, { value: NaN, expected: 0 }, { value: 'invalid', expected: 0 }, { value: 99, expected: 4 }])('normalizes saved progress $value for presentation without rewriting its original value', async example => {
    await mount({ animStep: example.value, mRNA: transcript.slice(0, example.expected) }); expect(changes).not.toHaveBeenCalled(); expect(latest.dnaLab.animStep).toBe(example.value);
    expect(field('progress').getAttribute('aria-valuenow')).toBe(String(example.expected)); expect(scope().textContent).not.toMatch(/NaN|Infinity/); expect(xp).not.toHaveBeenCalled(); preserved();
  });
  it.each([-1, 0, 3, Infinity, 'fast'])('uses safe local playback speed for invalid saved speed %j without a migration write', async invalid => {
    await mount({ speed: invalid }); expect(changes).not.toHaveBeenCalled(); expect(latest.dnaLab.speed).toBe(invalid); expect(query('[data-dna-tx-speed="1"]').getAttribute('aria-pressed')).toBe('true');
    await activate(field('play')); await advance(599); expect(latest.dnaLab.animStep).toBe(0); await advance(1); expect(latest.dnaLab.mRNA).toBe('A'); expect(latest.dnaLab.speed).toBe(invalid); preserved();
  });
});

describe('Transcription completion and guided learning compatibility', () => {
  it('keeps original 10 XP credit when a same-render final-step action is repeated', async () => {
    await mount({ animStep: 3, mRNA: 'AUG', txAttempt: { sequence, step: 3, rna: 'AUG' } }); const step = field('step'); step.focus(); await act(async () => { step.click(); step.click(); });
    expect(latest.dnaLab.animStep).toBe(4); expect(latest.dnaLab.mRNA).toBe(transcript); expect(latest.dnaLab.txAttempt).toMatchObject({ sequence, step: 4, rna: transcript }); expect(latest.dnaLab.animPlaying).toBe(false);
    expect(completionAwards()).toEqual([['dnaLab', 10, 'Completed transcription']]); expect(latest.dnaLab.txRewardedSequence).toBe(sequence); expect(document.activeElement).toBe(step); expect(step.getAttribute('aria-disabled')).toBe('true'); expect(field('status').textContent).toMatch(/complete/i); preserved();
  });
  it('earns the existing Messenger badge without replacing other saved badges', async () => {
    await mount({ badges: { copyMachine: true } }); await completeManually(); expect(latest.dnaLab.badges).toMatchObject({ copyMachine: true, messenger: true }); expect(completionAwards()).toEqual([['dnaLab', 10, 'Completed transcription']]); preserved();
  });
  it('completes timed transcription without stealing external focus and leaves the result available for review', async () => {
    await mount(); await activate(field('play')); outside.focus(); for (let i = 0; i < 4; i++) await advance();
    expect(document.activeElement).toBe(outside); expect(latest.dnaLab.mRNA).toBe(transcript); expect(latest.dnaLab.animPlaying).toBe(false); expect(field('play').textContent).toMatch(/replay/i); expect(completionAwards()).toEqual([['dnaLab', 10, 'Completed transcription']]); preserved();
  });
  it('allows replay and remount of the same completed DNA without duplicate completion credit', async () => {
    await mount(); await completeManually(); expect(completionAwards()).toHaveLength(1); await activate(field('reset')); await completeManually(); expect(completionAwards()).toHaveLength(1);
    const saved = latest.dnaLab; await act(async () => { root.unmount(); }); root = ReactDOMClient.createRoot(host); await mount(saved); await advance(5000); expect(completionAwards()).toHaveLength(1);
    await activate(field('reset')); await completeManually(); expect(completionAwards()).toHaveLength(1); preserved();
  });
  it('allows completion of a different DNA sequence after an explicit reset', async () => {
    await mount(); await completeManually(); await patch({ dnaSequence: 'TTAA', mRNA: '', animStep: 0 }); await activate(field('reset')); await completeManually();
    expect(latest.dnaLab.mRNA).toBe('UUAA'); expect(latest.dnaLab.txRewardedSequence).toBe('TTAA'); expect(completionAwards()).toHaveLength(2); preserved();
  });
  it('does not duplicate final credit when StrictMode replays rendering and state updates', async () => {
    await mount({ animStep: 3, mRNA: 'AUG', txAttempt: Object.freeze({ sequence, step: 3, rna: 'AUG' }), badges: { copyMachine: true } }, { strict: true }); await activate(field('step'));
    expect(latest.dnaLab.mRNA).toBe(transcript); expect(completionAwards()).toHaveLength(1); expect(latest.dnaLab.badges).toMatchObject({ copyMachine: true, messenger: true }); preserved();
  });
  it('keeps the guided orientation checkpoint blocked until transcription produces its exact complete mRNA', async () => {
    await mount({ guidedStarted: true, guidedStep: 1, guidedSelectedAnswer: "3' -> 5'", guidedAnswers: { orientation: { attempts: 1, answer: "3' -> 5'", correct: true } }, guidedActions: { pairing: true } });
    expect(guidedContinue()).toBeUndefined(); await activate(field('step')); expect(guidedContinue()).toBeUndefined(); await completeManually(); expect(guidedContinue()).toBeDefined();
    expect(latest.dnaLab.mRNA).toBe(transcript); await activate(guidedContinue()); expect(latest.dnaLab.guidedStep).toBe(2); expect(latest.dnaLab.tab).toBe('translate'); expect(latest.dnaLab.guidedAnswers.orientation.correct).toBe(true); preserved();
  });
  it('honors an existing completed guided transcript without requiring a new save or awarding on mount', async () => {
    await mount({ mRNA: transcript, animStep: 4, guidedStarted: true, guidedStep: 1, guidedAnswers: { orientation: { attempts: 1, answer: "3' -> 5'", correct: true } } });
    expect(guidedContinue()).toBeDefined(); expect(changes).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); preserved();
  });
});


describe('Malformed persisted transcript recovery', () => {
  it('does not rewrite a null RNA snapshot on mount and can reset it into a working attempt', async () => {
    const malformed = Object.freeze({ sequence, step: 0, rna: null });
    await mount({ txAttempt: malformed, mRNA: '', animStep: 0 }); expect(changes).not.toHaveBeenCalled(); expect(latest.dnaLab.txAttempt).toBe(malformed);
    expect(field('status').textContent).toMatch(/reset/i); expect(field('play').getAttribute('aria-disabled')).toBe('true'); expect(field('step').getAttribute('aria-disabled')).toBe('true');
    await activate(field('play')); await activate(field('step')); expect(latest.dnaLab.txAttempt).toBe(malformed); expect(xp).not.toHaveBeenCalled();
    await activate(field('reset')); expect(latest.dnaLab.txAttempt).toEqual({ sequence, step: 0, rna: '' }); expect(field('step').getAttribute('aria-disabled')).toBe('false');
    await activate(field('step')); expect(latest.dnaLab.txAttempt).toEqual({ sequence, step: 1, rna: 'A' }); expect(latest.dnaLab.mRNA).toBe('A'); preserved();
  });
});
