// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const targetDna = 'ATGAAACCCAGGTTT';
const otherPams = 'ATGAAACCCGGGTTTAAATGGCCCTAA';
const sibling = Object.freeze({ fieldNote: 'Keep the ecology notebook.', revision: 15 });
const references = Object.freeze({ expSection: null, learnerNote: 'Keep the reference notebook.' });
const experiments = Object.freeze([{ id: 'control', label: 'Saved control', dnaSequence: 'ATGAAATAA', mutationLog: [] }]);
const mutationLog = Object.freeze([{ type: 'Substitution', pos: 2, from: 'C', to: 'G' }]);
const draft = Object.freeze({ learnerNote: 'Keep an extension draft.' });
const earlierEdit = Object.freeze({ type: 'HDR', pos: 4, desc: 'Earlier saved CRISPR observation.', time: 1234 });
const scenarioFields = Object.freeze({ dnaScenarioId: 'frameshift_deletion', dnaScenarioPrediction: 'Frameshift', dnaScenarioLockedPrediction: '',
  dnaScenarioRun: false, dnaScenarioScore: 0, dnaScenarioRevision: 'uncertain', dnaScenarioRevisionReason: 'Keep the inquiry reflection.', dnaScenarioComplete: false });
const nhejCases = [
  { length: 1, random: 0, deleted: 'A', output: 'ATGAACCCAGGTTT' },
  { length: 2, random: 0.4, deleted: 'AC', output: 'ATGAACCAGGTTT' },
  { length: 3, random: 0.9, deleted: 'ACC', output: 'ATGAACAGGTTT' }
];
const hdrCases = [
  { base: 'A', output: 'ATGAAAACCAGGTTT' }, { base: 'T', output: 'ATGAAATCCAGGTTT' },
  { base: 'G', output: 'ATGAAAGCCAGGTTT' }, { base: 'C', output: 'ATGAAACCCAGGTTT' }
];
let config, host, outside, root, latest, updateStore, changes, xp, announce, celebrate, beep, toast, ai, actDescriptor, matchMediaDescriptor;
const query = selector => host.querySelector(selector);
const workspace = () => query('[data-dna-workspace="crispr"]');
const field = name => query('#dna-crispr-' + name);
const action = expression => [...workspace().querySelectorAll('button')].find(button => expression.test(button.textContent));
const deploy = () => action(/Deploy Cas9/);
const repair = type => action(type === 'nhej' ? /Non-Homologous End Joining/ : /Homology-Directed Repair/);
const newEdit = () => action(/New Edit/);
const donor = base => [...workspace().querySelectorAll('[aria-label="Choose the donor-template base for the HDR model"] button')].find(button => button.textContent === base);
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce, celebrate, beep, addToast: toast,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(patch = {}, { reducedMotion = false } = {}) {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: query => ({ matches: reducedMotion && query.includes('prefers-reduced-motion'), media: query,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return true; } }) });
  const dnaLab = { tab: 'crispr', showHelix3d: false, dnaFocusMode: false, dnaGradeOverride: '9-12', visitedTabs: { build: true, crispr: true, mutate: true },
    dnaSequence: targetDna, mutationLog, crisprPhase: 'design', crisprScanPos: 0, crisprTargetPAM: 0, crisprRepairType: '', crisprEditLog: [earlierEdit], speed: 1,
    badges: { geneEditor: true, dnaMaster: false }, mRNA: 'EARLIER RNA', protein: ['Earlier protein'], animStep: 2,
    ...scenarioFields, dnaEvidenceClaim: 'frameshift', dnaEvidenceCitation: 'sequence', dnaEvidenceReasoning: 'Keep the saved evidence explanation.', dnaEvidenceScore: 2,
    dnaReportNote: 'Keep the student report reflection.', dnaExperimentHistory: experiments, unknownDraft: draft, ...patch };
  outside.focus(); await act(async () => { root.render(h(Host, { seed: { dnaLab, ecology: sibling, dna: references } })); });
}
async function patch(values) { await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, ...values } })); }); }
async function activate(element, ownFocus = true) {
  expect(element).toBeTruthy(); if (ownFocus) element.focus(); await act(async () => { element.click(); });
}
async function advance(milliseconds = 250) { await act(async () => { vi.advanceTimersByTime(milliseconds); }); }
function preserved() {
  expect(latest.ecology).toBe(sibling); expect(latest.dna).toBe(references); expect(latest.dnaLab.unknownDraft).toBe(draft); expect(latest.dnaLab.dnaExperimentHistory).toBe(experiments);
  expect(latest.dnaLab.mutationLog).toBe(mutationLog); expect(latest.dnaLab.dnaReportNote).toBe('Keep the student report reflection.');
  expect(latest.dnaLab.dnaEvidenceClaim).toBe('frameshift'); expect(latest.dnaLab.dnaEvidenceCitation).toBe('sequence');
  expect(latest.dnaLab.dnaEvidenceReasoning).toBe('Keep the saved evidence explanation.'); expect(latest.dnaLab.dnaEvidenceScore).toBe(2);
  for (const [key, value] of Object.entries(scenarioFields)) expect(latest.dnaLab[key]).toBe(value);
  for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function status(node) {
  expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status'); expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true');
}
beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia'); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));
  resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab'); changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); celebrate = vi.fn(); beep = vi.fn(); toast = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation';
  document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    if (matchMediaDescriptor) Object.defineProperty(window, 'matchMedia', matchMediaDescriptor); else delete window.matchMedia;
  }
});

describe('CRISPR design and scientific target information', () => {
  it('restores the design view without changing saved work, awarding points, or taking focus', async () => {
    await mount(); expect(changes).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside);
    expect(workspace().textContent).toContain('Schematic guide window: pos 4-9'); expect(workspace().textContent).toContain('cut near pos 7');
    expect(workspace().textContent).toContain('PAM: AGG at pos 10'); expect(workspace().textContent).toContain('gRNA: UUUGGG');
    expect(workspace().textContent).toContain('six-base guide window is schematic'); expect(workspace().textContent).toContain('real SpCas9 spacers are typically 20 nt');
    expect(deploy().disabled).toBe(false); preserved();
  });

  it('limits offered PAM sites to forward NGG sites with the six-base upstream schematic window', async () => {
    await mount({ dnaSequence: otherPams });
    const targets = [...workspace().querySelectorAll('button')].filter(button => /^Pos \d+/.test(button.textContent));
    expect(targets.map(button => button.textContent)).toEqual(['Pos 9 (CGG)', 'Pos 10 (GGG)', 'Pos 19 (TGG)']);
    expect(targets.map(button => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    await activate(targets[2]); expect(latest.dnaLab.crisprTargetPAM).toBe(2); expect(document.activeElement).toBe(targets[2]);
    expect(workspace().textContent).toContain('Schematic guide window: pos 13-18'); expect(workspace().textContent).toContain('cut near pos 16');
    expect(latest.dnaLab.dnaSequence).toBe(otherPams); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('shows an actionable no-target explanation without changing the sequence or starting a scan', async () => {
    await mount({ dnaSequence: 'ATGAAATAA' }); expect(workspace().textContent).toContain('No forward-strand NGG sites');
    expect(workspace().textContent).toMatch(/Build/); expect(latest.dnaLab.crisprPhase).toBe('design'); expect(xp).not.toHaveBeenCalled();
    if (deploy()) expect(deploy().disabled || deploy().getAttribute('aria-disabled') === 'true').toBe(true);
    await advance(2000); expect(latest.dnaLab.crisprPhase).toBe('design'); expect(latest.dnaLab.dnaSequence).toBe('ATGAAATAA'); expect(changes).not.toHaveBeenCalled(); preserved();
  });
});

async function startPaused() { await activate(deploy()); await activate(field('pause')); }
async function reachCut() { await activate(deploy()); await activate(field('skip')); expect(latest.dnaLab.crisprPhase).toBe('cut'); }
async function runTimerToCut(interval = 200) {
  for (let count = 0; count < 12 && latest.dnaLab.crisprPhase === 'scanning'; count++) await advance(interval);
  expect(latest.dnaLab.crisprPhase).toBe('cut');
}
function currentAttempt() { return { sequence: targetDna, pamStart: 9, guideStart: 3, guideEnd: 9, cutSite: 6 }; }

describe('CRISPR scan controls and focus ownership', () => {
  it('deploys once, preserves a stable phase heading and feedback, and allows paused steps or skipping without repair credit', async () => {
    await mount(); const title = field('stage-title'), live = field('status'); status(live); expect(live.textContent).toBe(''); expect(title.tabIndex).toBe(-1);
    const button = deploy(); button.focus(); await act(async () => { button.click(); button.click(); });
    expect(latest.dnaLab.crisprPhase).toBe('scanning'); expect(latest.dnaLab.crisprScanPos).toBe(0); expect(latest.dnaLab.crisprAttempt).toEqual(currentAttempt());
    expect(field('stage-title')).toBe(title); expect(field('status')).toBe(live); expect(document.activeElement).toBe(title);
    const progress = workspace().querySelector('[role="progressbar"]'); expect(progress).not.toBeNull(); expect(progress.getAttribute('aria-label')).toBe('Cas9 scan progress');
    expect(progress.getAttribute('aria-live')).not.toBe('polite'); expect(progress.getAttribute('aria-valuenow')).toBe('0'); expect(progress.getAttribute('aria-valuemax')).toBe('6');
    const pause = field('pause'); await activate(pause); expect(latest.dnaLab.crisprPaused).toBe(true); expect(field('pause')).toBe(pause); expect(document.activeElement).toBe(pause);
    const paused = latest.dnaLab.crisprScanPos; await advance(4000); expect(latest.dnaLab.crisprScanPos).toBe(paused);
    await activate(field('step')); expect(latest.dnaLab.crisprScanPos).toBe(paused + 1); expect(latest.dnaLab.crisprPaused).toBe(true);
    await activate(field('skip')); expect(latest.dnaLab.crisprPhase).toBe('cut'); expect(document.activeElement).toBe(title); expect(field('status')).toBe(live);
    expect(latest.dnaLab.dnaSequence).toBe(targetDna); expect(latest.dnaLab.crisprEditLog).toEqual([earlierEdit]); expect(xp).not.toHaveBeenCalled(); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it('resumes from the current position on the same focused pause control', async () => {
    await mount(); await startPaused(); await activate(field('step')); const pause = field('pause'); expect(pause.textContent).toMatch(/resume/i);
    await activate(pause); expect(field('pause')).toBe(pause); expect(document.activeElement).toBe(pause); expect(latest.dnaLab.crisprPaused).toBe(false);
    await advance(199); expect(latest.dnaLab.crisprScanPos).toBe(1); await advance(1); expect(latest.dnaLab.crisprScanPos).toBe(2);
    expect(latest.dnaLab.crisprPhase).toBe('scanning'); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('preserves the original 200 divided by speed scan interval without taking unrelated focus when the target is found', async () => {
    await mount({ speed: 2 }); await activate(deploy()); outside.focus(); await advance(99); expect(latest.dnaLab.crisprScanPos).toBe(0);
    await advance(1); expect(latest.dnaLab.crisprScanPos).toBe(1); await runTimerToCut(100);
    expect(document.activeElement).toBe(outside); expect(latest.dnaLab.dnaSequence).toBe(targetDna); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('moves focus out of a disappearing scan control when automatic scanning reaches the target', async () => {
    await mount(); await activate(deploy()); const pause = field('pause'); pause.focus(); await runTimerToCut();
    expect(pause.isConnected).toBe(false); expect(document.activeElement).toBe(field('stage-title')); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('starts reduced-motion scans paused and requires a deliberate action before advancing', async () => {
    await mount({}, { reducedMotion: true }); await activate(deploy()); expect(latest.dnaLab.crisprPhase).toBe('scanning');
    expect(latest.dnaLab.crisprPaused).toBe(true); await advance(2000); expect(latest.dnaLab.crisprScanPos).toBe(0);
    await activate(field('step')); expect(latest.dnaLab.crisprScanPos).toBe(1); await advance(2000); expect(latest.dnaLab.crisprScanPos).toBe(1);
    await activate(field('skip')); expect(latest.dnaLab.crisprPhase).toBe('cut'); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('restores reduced-motion scans paused without an initial write, while respecting an explicitly resumed scan', async () => {
    await mount({ crisprPhase: 'scanning', crisprScanPos: 2, crisprAttempt: currentAttempt() }, { reducedMotion: true });
    expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside); await advance(1000); expect(latest.dnaLab.crisprScanPos).toBe(2);
    await activate(field('pause')); expect(latest.dnaLab.crisprPaused).toBe(false); await advance(200); expect(latest.dnaLab.crisprScanPos).toBe(3);
    expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('cancels pending scan work when leaving the lab tab and resumes safely when returning', async () => {
    await mount(); await activate(deploy()); await advance(200); const position = latest.dnaLab.crisprScanPos;
    outside.focus(); await patch({ tab: 'build' }); await advance(2000); expect(latest.dnaLab.crisprScanPos).toBe(position); expect(document.activeElement).toBe(outside);
    await patch({ tab: 'crispr' }); expect(document.activeElement).toBe(outside); await advance(200); expect(latest.dnaLab.crisprScanPos).toBe(position + 1);
    expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('does not move host focus when deploy is invoked without focus ownership or another control gains focus before commit', async () => {
    await mount(); outside.focus(); await activate(deploy(), false); expect(document.activeElement).toBe(outside);
    await activate(field('skip')); const button = repair('hdr'); button.focus(); await act(async () => { button.click(); outside.focus(); });
    expect(latest.dnaLab.crisprPhase).toBe('done'); expect(document.activeElement).toBe(outside); preserved();
  });

  it('cleans up the scan timer on unmount without later writes or focus changes', async () => {
    await mount(); await activate(deploy()); await act(async () => { root.unmount(); }); root = null; outside.focus(); changes.mockClear();
    await advance(4000); expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside); expect(xp).not.toHaveBeenCalled();
  });
});

describe('CRISPR repair outcomes and single-action rewards', () => {
  it.each(nhejCases)('retains the authored $length-base NHEJ deletion outcome and immutable edit record', async example => {
    await mount(); await reachCut(); vi.spyOn(Math, 'random').mockReturnValue(example.random); const live = field('status');
    await activate(repair('nhej')); expect(latest.dnaLab.dnaSequence).toBe(example.output); expect(latest.dnaLab.crisprRepairType).toBe('nhej'); expect(latest.dnaLab.crisprPhase).toBe('done');
    const desc = 'NHEJ: deleted ' + example.deleted + ' at pos 6 (error-prone, may cause frameshift)';
    expect(latest.dnaLab.crisprEditLog).toEqual([earlierEdit, { type: 'NHEJ', pos: 6, desc, time: Date.now() }]);
    expect(latest.dnaLab.crisprResult).toMatchObject({ before: targetDna, after: example.output, guideRNA: 'UUUGGG', pam: 'AGG', repairType: 'nhej', desc });
    expect(query('[data-dna-crispr-repaired-target]').textContent).toBe('In the repaired DNA, the PAM begins at base ' + (10 - example.length) + '; the repair boundary is near base 6.');
    expect(latest.dnaLab.mRNA).toBe(''); expect(latest.dnaLab.protein).toEqual([]); expect(latest.dnaLab.animStep).toBe(0);
    expect(field('status')).toBe(live); expect(document.activeElement).toBe(field('stage-title'));
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 20, 'Completed CRISPR gene edit'); expect(celebrate).toHaveBeenCalledTimes(1); preserved();
  });

  it.each(hdrCases)('retains the authored HDR donor $base substitution, including a no-change donor', async example => {
    await mount(); await reachCut(); await activate(donor(example.base)); expect(donor(example.base).getAttribute('aria-pressed')).toBe('true');
    const beforeEdit = latest.dnaLab.dnaSequence; await activate(repair('hdr')); expect(beforeEdit).toBe(targetDna); expect(latest.dnaLab.dnaSequence).toBe(example.output);
    const desc = 'HDR model: donor template replaced base at pos 7 with ' + example.base;
    expect(latest.dnaLab.crisprEditLog).toEqual([earlierEdit, { type: 'HDR', pos: 6, desc, time: Date.now() }]);
    expect(latest.dnaLab.crisprResult).toMatchObject({ before: targetDna, after: example.output, guideRNA: 'UUUGGG', pam: 'AGG', repairType: 'hdr', desc });
    expect(query('[data-dna-crispr-repaired-target]').textContent).toBe('In the repaired DNA, the PAM begins at base 10; the repair boundary is near base 7.');
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 20, 'Completed CRISPR gene edit'); expect(celebrate).toHaveBeenCalledTimes(1); preserved();
  });

  it('awards one repair when two pathways are activated before React commits', async () => {
    await mount(); await reachCut(); vi.spyOn(Math, 'random').mockReturnValue(0.4); const first = repair('nhej'), second = repair('hdr'); first.focus();
    await act(async () => { first.click(); second.click(); first.click(); }); expect(latest.dnaLab.dnaSequence).toBe(nhejCases[1].output);
    expect(latest.dnaLab.crisprEditLog).toHaveLength(2); expect(latest.dnaLab.crisprRepairType).toBe('nhej');
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 20, 'Completed CRISPR gene edit'); expect(celebrate).toHaveBeenCalledTimes(1); preserved();
  });

  it('retains the existing first-edit badge and celebration behavior', async () => {
    await mount({ badges: { dnaMaster: false } }); await reachCut(); await activate(repair('hdr'));
    expect(latest.dnaLab.badges).toEqual({ dnaMaster: false, geneEditor: true }); expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 20, 'Completed CRISPR gene edit');
    expect(celebrate).toHaveBeenCalledTimes(2); expect(toast.mock.calls.filter(args => String(args[0]).includes('Badge: Gene Editor'))).toHaveLength(1); preserved();
  });

  it('starts a deliberate new edit without clearing history or the repaired DNA and allows its own completion credit', async () => {
    await mount(); await reachCut(); await activate(donor('C')); await activate(repair('hdr')); const firstLog = latest.dnaLab.crisprEditLog;
    await activate(newEdit()); expect(latest.dnaLab.crisprPhase).toBe('design'); expect(latest.dnaLab.dnaSequence).toBe(targetDna); expect(latest.dnaLab.crisprEditLog).toBe(firstLog);
    expect(latest.dnaLab.crisprAttempt).toBeNull(); expect(latest.dnaLab.crisprResult).toBeNull(); expect(document.activeElement).toBe(field('stage-title'));
    await reachCut(); await activate(donor('G')); await activate(repair('hdr')); expect(latest.dnaLab.dnaSequence).toBe(hdrCases[2].output); expect(latest.dnaLab.crisprEditLog).toHaveLength(3);
    expect(xp.mock.calls).toEqual([['dnaLab', 20, 'Completed CRISPR gene edit'], ['dnaLab', 20, 'Completed CRISPR gene edit']]); expect(celebrate).toHaveBeenCalledTimes(2); preserved();
  });
});

describe('CRISPR target ownership and saved-state recovery', () => {
  it('stops an in-flight scan when its DNA changes and restarts only after a deliberate action', async () => {
    await mount(); await activate(deploy()); await advance(200); const attempt = latest.dnaLab.crisprAttempt;
    outside.focus(); const changedSequence = 'ATGTTTCCCAGGTTT'; await patch({ dnaSequence: changedSequence }); const stoppedAt = latest.dnaLab.crisprScanPos;
    expect(field('restart')).not.toBeNull(); expect(field('status').textContent).toMatch(/changed|stale|different/i); expect(latest.dnaLab.crisprAttempt).toBe(attempt);
    await advance(2000); expect(latest.dnaLab.crisprScanPos).toBe(stoppedAt); expect(latest.dnaLab.dnaSequence).toBe(changedSequence); expect(document.activeElement).toBe(outside);
    expect(latest.dnaLab.crisprEditLog).toEqual([earlierEdit]); expect(xp).not.toHaveBeenCalled();
    await activate(field('restart')); expect(latest.dnaLab.crisprPhase).toBe('design'); expect(latest.dnaLab.dnaSequence).toBe(changedSequence);
    expect(document.activeElement).toBe(field('stage-title')); expect(latest.dnaLab.crisprAttempt).toBeNull(); preserved();
  });

  it('invalidates a pending cut when another valid PAM is selected for the same DNA', async () => {
    await mount({ dnaSequence: otherPams }); await reachCut(); const before = latest.dnaLab.crisprAttempt;
    await patch({ crisprTargetPAM: 2 }); expect(latest.dnaLab.crisprAttempt).toBe(before); expect(field('restart')).not.toBeNull();
    for (const type of ['nhej', 'hdr']) { const button = repair(type); if (button) { expect(button.disabled || button.getAttribute('aria-disabled') === 'true').toBe(true); await activate(button); } }
    expect(latest.dnaLab.dnaSequence).toBe(otherPams); expect(latest.dnaLab.crisprEditLog).toEqual([earlierEdit]); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('restores a legacy cut without migration writes and safely binds it to the DNA originally restored', async () => {
    await mount({ crisprPhase: 'cut' }); expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside);
    expect(donor('G').getAttribute('aria-pressed')).toBe('true'); await activate(donor('A'));
    await patch({ dnaSequence: 'ATGTTTCCCAGGTTT' }); expect(field('restart')).not.toBeNull(); expect(field('status').textContent).toMatch(/changed|stale|different/i);
    for (const type of ['nhej', 'hdr']) { const button = repair(type); if (button) { expect(button.disabled || button.getAttribute('aria-disabled') === 'true').toBe(true); await activate(button); } }
    expect(latest.dnaLab.dnaSequence).toBe('ATGTTTCCCAGGTTT'); expect(latest.dnaLab.crisprEditLog).toEqual([earlierEdit]); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('allows a legacy cut to complete with its original HDR model outcome and one reward', async () => {
    await mount({ crisprPhase: 'cut' }); expect(changes).not.toHaveBeenCalled(); await activate(donor('T')); await activate(repair('hdr'));
    expect(latest.dnaLab.dnaSequence).toBe(hdrCases[1].output); expect(latest.dnaLab.crisprPhase).toBe('done');
    expect(xp).toHaveBeenCalledExactlyOnceWith('dnaLab', 20, 'Completed CRISPR gene edit'); preserved();
  });

  it('keeps completed before-and-after evidence tied to the finished edit when the current sequence changes later', async () => {
    await mount(); await reachCut(); await activate(donor('T')); await activate(repair('hdr')); const result = latest.dnaLab.crisprResult;
    outside.focus(); await patch({ dnaSequence: 'ATGTTTCCCAGGTTT' }); expect(latest.dnaLab.crisprPhase).toBe('done'); expect(latest.dnaLab.crisprResult).toBe(result);
    expect(workspace().textContent).toContain(targetDna); expect(workspace().textContent).toContain(hdrCases[1].output); expect(field('restart')).toBeNull();
    expect(query('[data-dna-crispr-repaired-target]')).toBeNull(); expect(query('[data-dna-crispr-result]')).not.toBeNull();
    expect(newEdit()).not.toBeNull(); expect(document.activeElement).toBe(outside); expect(xp).toHaveBeenCalledTimes(1); preserved();
  });

  it.each([99, -1, 0.5, Infinity, NaN, 'bad-index'])('falls back to the first valid PAM for saved invalid index %s without rewriting the notebook', async invalid => {
    await mount({ crisprTargetPAM: invalid }); expect(changes).not.toHaveBeenCalled(); expect(workspace().textContent).toContain('PAM: AGG at pos 10');
    const selected = workspace().querySelector('[data-dna-crispr-pam="0"]'); expect(selected.getAttribute('aria-pressed')).toBe('true');
    await reachCut(); expect(latest.dnaLab.crisprAttempt).toEqual(currentAttempt()); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('normalizes malformed saved phase, scan position, and history for rendering without changing saved drafts', async () => {
    await mount({ crisprPhase: 'unknown-phase', crisprScanPos: NaN, crisprEditLog: { old: 'malformed log' } });
    expect(changes).not.toHaveBeenCalled(); expect(deploy()).not.toBeNull(); expect(latest.dnaLab.crisprPhase).toBe('unknown-phase'); expect(document.activeElement).toBe(outside);
    await reachCut(); await activate(repair('hdr')); expect(latest.dnaLab.crisprEditLog).toHaveLength(1); expect(latest.dnaLab.dnaSequence).toBe(hdrCases[2].output); preserved();
  });

  it('normalizes an invalid saved donor to its complementary base without inserting invalid DNA characters', async () => {
    await mount({ crisprPhase: 'cut', crisprDonorBase: '<invalid>' }); expect(changes).not.toHaveBeenCalled(); expect(donor('G').getAttribute('aria-pressed')).toBe('true');
    await activate(repair('hdr')); expect(latest.dnaLab.dnaSequence).toBe(hdrCases[2].output); expect(latest.dnaLab.dnaSequence).toMatch(/^[ATGC]+$/); preserved();
  });
});

describe('CRISPR text alternatives and resilient saved results', () => {
  it('associates the canvas with full textual target details and exposes a named keyboard-scrollable edit history', async () => {
    await mount(); const canvas = field('canvas'); expect(canvas.getAttribute('role')).toBe('img'); expect(canvas.getAttribute('aria-label')).toBe('CRISPR-Cas9 target and repair model');
    const described = canvas.getAttribute('aria-describedby').split(/\s+/).map(id => document.getElementById(id)); expect(described.every(Boolean)).toBe(true);
    expect(described.map(node => node.textContent).join(' ')).toContain('cut near pos 7'); expect(field('sequence-details').tagName).toBe('DETAILS');
    expect(field('sequence-details').textContent).toContain(targetDna); const history = field('history'); expect(history.tabIndex).toBe(0); expect(history.getAttribute('role')).toBe('region');
    expect(document.getElementById(history.getAttribute('aria-labelledby')).textContent).toContain('CRISPR Edit History');
    expect(history.querySelectorAll('ol > li')).toHaveLength(1); expect(history.textContent).toContain(earlierEdit.desc); expect(history.hasAttribute('aria-live')).toBe(false); preserved();
  });

  it('keeps the scan clock and stable live text unchanged during an unrelated notebook update', async () => {
    await mount(); await activate(deploy()); const live = field('status'), text = live.textContent; await advance(150);
    await patch({ extraNotebookNote: 'A parallel observation.' }); await advance(49); expect(latest.dnaLab.crisprScanPos).toBe(0);
    await advance(1); expect(latest.dnaLab.crisprScanPos).toBe(1); expect(field('status')).toBe(live); expect(live.textContent).toBe(text); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it.each([
    { before: targetDna, after: targetDna },
    { before: targetDna, after: targetDna, site: null, guideRNA: 'UUUGGG', pam: 'AGG', desc: 'Incomplete saved result.' },
    { before: targetDna, after: targetDna, site: { pamStart: 9 }, guideRNA: { invalid: true }, pam: 'AGG', desc: 'Invalid guide.' },
    { before: targetDna, after: targetDna, site: { pamStart: 'invalid' }, guideRNA: 'UUUGGG', pam: 'AGG', desc: 'Invalid position.' }
  ])('renders a malformed saved result safely without rewriting or awarding it', async result => {
    await mount({ crisprPhase: 'done', crisprRepairType: 'hdr', crisprResult: result }); expect(workspace()).not.toBeNull(); expect(newEdit()).not.toBeNull();
    expect(query('[data-dna-crispr-result]')).toBeNull(); expect(latest.dnaLab.crisprResult).toBe(result); expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside);
    expect(xp).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); preserved();
  });
});

describe('Completed CRISPR target projection', () => {
  it.each([0, 4])('keeps saved evidence but omits an invalid %s-base NHEJ target projection', async removed => {
    const after = removed ? targetDna.slice(0, -removed) : targetDna;
    const result = { before: targetDna, after, site: currentAttempt(), guideRNA: 'UUUGGG', pam: 'AGG', repairType: 'nhej', desc: 'Saved NHEJ repair evidence.' };
    await mount({ dnaSequence: after, crisprPhase: 'done', crisprRepairType: 'nhej', crisprResult: result });
    expect(query('[data-dna-crispr-repaired-target]')).toBeNull(); const evidence = query('[data-dna-crispr-result]'); expect(evidence).not.toBeNull();
    expect(evidence.textContent).toContain('Before repair: ' + targetDna); expect(evidence.textContent).toContain('After repair: ' + after);
    expect(evidence.textContent).toContain('Original PAM: AGG at pos 10'); expect(latest.dnaLab.crisprResult).toBe(result);
    expect(changes).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside); preserved();
  });
});
