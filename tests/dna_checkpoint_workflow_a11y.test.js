// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const baselineSequence = 'ATGCGTACCTGAAACTGA';
const silentSequence = 'ATGCGCACCTGAAACTGA';
const insertionSequence = 'ATGACGTACCTGAAACTGA';
const baseline = Object.freeze({ id: 'exp-a', label: 'Experiment 1', dnaSequence: baselineSequence, mutationLog: Object.freeze([]), timestamp: 101 });
const silentLog = Object.freeze([{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }]);
const silent = Object.freeze({ id: 'exp-b', label: 'Experiment 2', dnaSequence: silentSequence, mutationLog: silentLog, timestamp: 202 });
const insertionLog = Object.freeze([{ type: 'Insertion', pos: 3, to: 'A' }]);
const insertion = Object.freeze({ id: 'exp-c', label: 'Experiment 3', dnaSequence: insertionSequence, mutationLog: insertionLog, timestamp: 303 });
const sibling = Object.freeze({ fieldNote: 'Keep the ecology notebook.', revision: 16 });
const references = Object.freeze({ expSection: null, learnerNote: 'Keep the reference notebook.' });
const draft = Object.freeze({ learnerNote: 'Keep a custom saved extension.' });
const scenario = Object.freeze({ dnaScenarioId: 'frameshift_insertion', dnaScenarioPrediction: 'Frameshift', dnaScenarioLockedPrediction: 'Frameshift',
  dnaScenarioRun: true, dnaScenarioPlan: Object.freeze({ scenarioId: 'frameshift_insertion', sequenceBefore: baselineSequence, sequenceAfter: insertionSequence, mutationType: 'Insertion', pos: 3, position: 4, from: '', to: 'A', beforeMrnaCodon: 'CGU', afterMrnaCodon: 'ACG' }),
  dnaScenarioRevision: 'supported', dnaScenarioRevisionReason: 'Keep the inquiry reflection.', dnaScenarioScore: 3, dnaScenarioComplete: true, dnaScenarioRewarded: true });
const evidenceFields = Object.freeze({ dnaEvidenceClaim: 'frameshift', dnaEvidenceCitation: 'codon', dnaEvidenceCitationDetail: 'Saved codon evidence from the insertion.',
  dnaEvidenceCitationSequenceKey: 'ATGACGTACCTGAAACTGA|1|Insertion:3::A', dnaEvidenceReasoning: 'The shifted codon shows that downstream reading groups changed.' });
const codonRows = [
  ['1', 'AUG', 'AUG', 'Met', 'Met'], ['2', 'CGU', 'CGC', 'Arg', 'Arg'], ['3', 'ACC', 'ACC', 'Thr', 'Thr'],
  ['4', 'UGA', 'UGA', 'Stop', 'Stop'], ['5', 'AAC', 'AAC', 'Asn', 'Asn'], ['6', 'UGA', 'UGA', 'Stop', 'Stop']
];
let config, host, outside, root, latest, updateStore, changes, xp, announce, celebrate, toast, ai, actDescriptor;
const query = selector => host.querySelector(selector);
const history = () => query('[data-dna-experiment-history]');
const compare = () => query('[data-dna-experiment-compare]');
const card = id => query('[data-dna-experiment-card][data-checkpoint-id="' + id + '"]');
const slotButton = (id, slot) => card(id)?.querySelector('[data-comparison-slot-action="' + slot.toLowerCase() + '"]');
const restore = id => [...(card(id)?.querySelectorAll('button') || [])].find(button => /Restore checkpoint/.test(button.textContent));
const save = () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Save experiment');
const field = name => query('#dna-' + name);
const selectors = () => [...compare().querySelectorAll('select')];
const reflection = () => compare()?.querySelector('textarea');
const result = () => query('[data-dna-experiment-comparison-result]');
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce, celebrate, addToast: toast,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(patch = {}, { strict = false } = {}) {
  const dnaLab = { tab: 'mutate', showHelix3d: false, dnaFocusMode: false, dnaGradeOverride: '9-12', visitedTabs: { build: true, mutate: true, crispr: true },
    dnaSequence: insertionSequence, mutationLog: insertionLog, mRNA: 'EARLIER RNA', protein: ['Earlier protein'], animStep: 2,
    dnaExperimentHistory: [baseline, silent], dnaCompareLeft: 'exp-a', dnaCompareRight: 'exp-b', dnaCompareReflection: 'Keep the comparison evidence reflection.',
    ...scenario, ...evidenceFields, dnaEvidenceScore: 3, dnaEvidenceFeedback: 'Earlier successful evidence feedback.',
    dnaReportNote: 'Keep the student report reflection.', unknownDraft: draft, ...patch };
  outside.focus(); await act(async () => { const content = h(Host, { seed: { dnaLab, ecology: sibling, dna: references } }); root.render(strict ? h(React.StrictMode, null, content) : content); });
}
async function patch(values) { await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, ...values } })); }); }
async function activate(element, ownFocus = true) {
  expect(element).toBeTruthy(); if (ownFocus) element.focus(); await act(async () => { element.click(); });
}
async function choose(element, value) {
  expect(element?.tagName).toBe('SELECT'); element.focus(); await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function input(element, value) {
  expect(element?.tagName).toBe('TEXTAREA'); await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function preserved({ comparisonReflection = 'Keep the comparison evidence reflection.' } = {}) {
  expect(latest.ecology).toBe(sibling); expect(latest.dna).toBe(references); expect(latest.dnaLab.unknownDraft).toBe(draft); expect(latest.dnaLab.dnaReportNote).toBe('Keep the student report reflection.');
  expect(latest.dnaLab.dnaCompareReflection).toBe(comparisonReflection); for (const [key, value] of Object.entries(evidenceFields)) expect(latest.dnaLab[key]).toBe(value);
  for (const [key, value] of Object.entries(scenario)) expect(latest.dnaLab[key]).toBe(value);
  expect(xp).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function status(node) {
  expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status'); expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true');
}
function nameOf(element) {
  if (!element || element.getAttribute('aria-hidden') === 'true') return '';
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/).map(id => nameOf(document.getElementById(id))).join(' ').replace(/\s+/g, ' ').trim();
  if (element.labels?.length) return [...element.labels].map(label => nameOf(label)).join(' ').trim();
  const clone = element.cloneNode(true); clone.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  if (element.tagName === 'LABEL') clone.querySelectorAll('input,select,textarea,button').forEach(node => node.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}
beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T15:00:00.000Z')); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
  changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); celebrate = vi.fn(); toast = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation';
  document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally { host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
});

describe('Saved checkpoint science and restoration defaults', () => {
  it('renders saved checkpoints without rewriting the notebook or moving focus', async () => {
    await mount(); expect(changes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(outside);
    expect(history()).not.toBeNull(); expect(compare()).not.toBeNull(); expect(latest.dnaLab.dnaSequence).toBe(insertionSequence); preserved();
  });

  it('preserves checkpoint metrics, isolated mutation effects, and complete sequence text alternatives', async () => {
    await mount({ dnaExperimentHistory: [baseline, silent, insertion] });
    const values = [
      [baseline, '18', '44', '3', '0', 'baseline'], [silent, '18', '50', '3', '1', 'silent'], [insertion, '19', '42', '6', '1', 'frameshift']
    ];
    for (const [entry, length, gc, protein, mutations, effect] of values) {
      const node = card(entry.id); expect(node.getAttribute('data-checkpoint-length')).toBe(length); expect(node.getAttribute('data-checkpoint-gc')).toBe(gc);
      expect(node.getAttribute('data-checkpoint-protein')).toBe(protein); expect(node.getAttribute('data-checkpoint-mutations')).toBe(mutations); expect(node.getAttribute('data-latest-effect')).toBe(effect);
      const fingerprint = node.querySelector('[data-dna-checkpoint-fingerprint]'); expect(fingerprint.getAttribute('role')).toBe('img');
      expect(fingerprint.getAttribute('aria-label')).toContain(entry.dnaSequence.split('').join(' '));
    }
    expect([...history().querySelectorAll('[data-dna-experiment-card]')].map(node => node.getAttribute('data-checkpoint-id'))).toEqual(['exp-c', 'exp-b', 'exp-a']); preserved();
  });

  it('compares the selected saved sequences independently of later edits to the active DNA', async () => {
    await mount(); const before = result().textContent, savedHistory = latest.dnaLab.dnaExperimentHistory;
    expect(before).toContain('1 aligned base difference'); expect(before).toContain('first difference at base 6'); expect(before).toContain('Met-Arg-Thr');
    await patch({ dnaSequence: 'ATGTTTTAA', mutationLog: [] }); expect(result().textContent).toBe(before); expect(latest.dnaLab.dnaExperimentHistory).toBe(savedHistory);
    expect(latest.dnaLab.dnaCompareLeft).toBe('exp-a'); expect(latest.dnaLab.dnaCompareRight).toBe('exp-b'); preserved();
  });
});

describe('Checkpoint saving and bounded history', () => {
  it('mounts an empty status and capacity instructions before saving the first checkpoint without moving focus', async () => {
    await mount({ dnaExperimentHistory: [], dnaCompareLeft: '', dnaCompareRight: '' }); const live = field('checkpoint-status'), button = save();
    status(live); expect(live.textContent).toBe(''); expect(history()).toBeNull(); expect(field('checkpoint-save-help').textContent).toMatch(/eight|8/i); expect(field('checkpoint-save-help').textContent).toMatch(/oldest/i);
    await activate(button); const [entry] = latest.dnaLab.dnaExperimentHistory; expect(entry.label).toBe('Experiment 1'); expect(entry.dnaSequence).toBe(insertionSequence);
    expect(entry.mutationLog).toEqual(insertionLog); expect(entry.mutationLog).not.toBe(insertionLog); expect(entry.timestamp).toBe(Date.now());
    expect(latest.dnaLab.dnaCompareLeft).toBe(entry.id); expect(latest.dnaLab.dnaCompareRight).toBe(''); expect(save()).toBe(button); expect(document.activeElement).toBe(button);
    expect(field('checkpoint-status')).toBe(live); expect(live.textContent).toContain('Experiment 1'); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it('deduplicates same-render Save activation but preserves later deliberate saves with unique IDs at the same timestamp', async () => {
    await mount({ dnaExperimentHistory: [], dnaCompareLeft: '', dnaCompareRight: '' }); const button = save(); button.focus();
    await act(async () => { button.click(); button.click(); button.click(); }); expect(latest.dnaLab.dnaExperimentHistory).toHaveLength(1);
    await activate(button); await activate(button); const entries = latest.dnaLab.dnaExperimentHistory;
    expect(entries.map(entry => entry.label)).toEqual(['Experiment 1', 'Experiment 2', 'Experiment 3']); expect(new Set(entries.map(entry => entry.id)).size).toBe(3);
    expect(new Set(entries.map(entry => entry.timestamp)).size).toBe(1); expect(latest.dnaLab.dnaExperimentSerial).toBe(3);
    expect(latest.dnaLab.dnaCompareLeft).toBe(entries[0].id); expect(latest.dnaLab.dnaCompareRight).toBe(entries[1].id); expect(document.activeElement).toBe(button); preserved();
  });

  it('retains the latest eight checkpoints and repairs only comparison slots whose entries are evicted', async () => {
    const entries = Array.from({ length: 8 }, (_, index) => ({ ...baseline, id: 'saved-' + (index + 1), label: 'Experiment ' + (index + 1) }));
    await mount({ dnaExperimentHistory: entries, dnaCompareLeft: 'saved-1', dnaCompareRight: 'saved-2' });
    await activate(save()); let saved = latest.dnaLab.dnaExperimentHistory;
    expect(saved).toHaveLength(8); expect(saved[0].id).toBe('saved-2'); expect(saved.at(-1).label).toBe('Experiment 9');
    expect(latest.dnaLab.dnaCompareLeft).toBe(saved.at(-1).id); expect(latest.dnaLab.dnaCompareRight).toBe('saved-2'); const ninthId = saved.at(-1).id;
    await activate(save()); saved = latest.dnaLab.dnaExperimentHistory; expect(saved).toHaveLength(8); expect(saved[0].id).toBe('saved-3'); expect(saved.at(-1).label).toBe('Experiment 10');
    expect(latest.dnaLab.dnaCompareLeft).toBe(ninthId); expect(latest.dnaLab.dnaCompareRight).toBe(saved.at(-1).id);
    await activate(save()); saved = latest.dnaLab.dnaExperimentHistory; expect(saved.map(entry => entry.label)).toEqual(Array.from({ length: 8 }, (_, index) => 'Experiment ' + (index + 4)));
    expect(new Set(saved.map(entry => entry.id)).size).toBe(8); expect(latest.dnaLab.dnaExperimentSerial).toBe(11); preserved();
  });

  it('uses the largest existing experiment number or saved serial instead of reusing an earlier label', async () => {
    await mount({ dnaExperimentHistory: [{ ...baseline, label: 'Experiment 40' }, { ...silent, label: 'My control' }], dnaExperimentSerial: 4 });
    await activate(save()); expect(latest.dnaLab.dnaExperimentHistory.at(-1).label).toBe('Experiment 41'); expect(latest.dnaLab.dnaExperimentSerial).toBe(41);
    await patch({ dnaExperimentSerial: 80 }); await activate(save()); expect(latest.dnaLab.dnaExperimentHistory.at(-1).label).toBe('Experiment 81'); preserved();
  });

  it('avoids colliding with an existing timestamp-based ID even when its old label was customized', async () => {
    await mount({ dnaExperimentHistory: [], dnaCompareLeft: '', dnaCompareRight: '' }); await activate(save()); const first = latest.dnaLab.dnaExperimentHistory[0];
    expect(first.id).toBe('dna-experiment-' + Date.now() + '-1');
    await patch({ dnaExperimentHistory: [{ ...first, label: 'Archived control' }], dnaExperimentSerial: 0 }); await activate(save());
    const entries = latest.dnaLab.dnaExperimentHistory; expect(entries).toHaveLength(2); expect(entries[0].id).toBe(first.id); expect(entries[1].id).not.toBe(first.id);
    expect(entries[1].label).toBe('Experiment 1'); expect(entries[1].id.startsWith(first.id + '-')).toBe(true);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(2); preserved();
  });

  it('captures the latest queued sequence and mutation trail instead of a stale render snapshot', async () => {
    await mount(); const button = save(), nextLog = [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }]; button.focus();
    await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, dnaSequence: silentSequence, mutationLog: nextLog, concurrentNote: 'Keep this queued update.' } })); button.click(); });
    const entry = latest.dnaLab.dnaExperimentHistory.at(-1); expect(entry.dnaSequence).toBe(silentSequence); expect(entry.mutationLog).toEqual(nextLog); expect(entry.mutationLog).not.toBe(nextLog);
    expect(latest.dnaLab.concurrentNote).toBe('Keep this queued update.'); expect(document.activeElement).toBe(button); preserved();
  });

  it('replaces invalid saved slot references when a new checkpoint is deliberately saved', async () => {
    await mount({ dnaCompareLeft: 'missing-a', dnaCompareRight: 'missing-b' }); expect(selectors().map(select => select.value)).toEqual(['', '']); expect(changes).not.toHaveBeenCalled();
    await activate(save()); const newest = latest.dnaLab.dnaExperimentHistory.at(-1); expect(latest.dnaLab.dnaCompareLeft).toBe(newest.id); expect(latest.dnaLab.dnaCompareRight).toBe(''); preserved();
  });
});

describe('Distinct comparison slots and accessible native controls', () => {
  it('names each selector and reflection from its visible label and persistent instructions', async () => {
    await mount(); const controls = [[field('compare-a'), 'Experiment A'], [field('compare-b'), 'Experiment B'], [field('comparison-reflection'), 'Comparison reflection']];
    for (const [control, visible] of controls) {
      expect(control).not.toBeNull(); expect(control.labels).toHaveLength(1); expect(control.labels[0].htmlFor).toBe(control.id);
      expect(nameOf(control.labels[0])).toBe(visible); expect(nameOf(control).toLowerCase()).toContain(visible.toLowerCase());
      const ids = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean); expect(ids.length).toBeGreaterThan(0);
      expect(ids.every(id => document.getElementById(id))).toBe(true); expect(ids.map(id => document.getElementById(id).textContent).join(' ').trim()).not.toBe('');
    }
    expect(field('compare-a').tagName).toBe('SELECT'); expect(field('compare-b').tagName).toBe('SELECT'); expect(field('comparison-reflection').tagName).toBe('TEXTAREA'); preserved();
  });

  it('retains focus on selected card actions, announces their state, and ignores repeated selection without a write', async () => {
    await mount({ dnaExperimentHistory: [baseline, silent, insertion] }); const button = slotButton('exp-c', 'A');
    expect(nameOf(button)).toContain(button.textContent); await activate(button); expect(slotButton('exp-c', 'A')).toBe(button); expect(document.activeElement).toBe(button);
    expect(button.disabled).toBe(false); expect(button.getAttribute('aria-pressed')).toBe('true'); expect(button.getAttribute('aria-disabled')).toBe('true'); expect(nameOf(button)).toContain(button.textContent);
    expect(latest.dnaLab.dnaCompareLeft).toBe('exp-c'); expect(latest.dnaLab.dnaCompareRight).toBe('exp-b'); const before = latest; changes.mockClear();
    await activate(button); expect(latest).toBe(before); expect(document.activeElement).toBe(button); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it('moves a checkpoint between A and B consistently from cards and selectors while clearing the other slot', async () => {
    await mount(); await activate(slotButton('exp-b', 'A')); expect(latest.dnaLab.dnaCompareLeft).toBe('exp-b'); expect(latest.dnaLab.dnaCompareRight).toBe('');
    expect(result()).toBeNull(); expect(query('[data-dna-comparison-readiness]').getAttribute('data-comparison-state')).toBe('one-selected');
    const b = selectors()[1]; await choose(b, 'exp-b'); expect(latest.dnaLab.dnaCompareLeft).toBe(''); expect(latest.dnaLab.dnaCompareRight).toBe('exp-b'); expect(document.activeElement).toBe(b);
    await choose(selectors()[0], 'exp-a'); expect(result()).not.toBeNull(); expect(query('[data-dna-comparison-readiness]').getAttribute('data-comparison-state')).toBe('ready');
    await choose(selectors()[1], ''); expect(latest.dnaLab.dnaCompareRight).toBe(''); expect(latest.dnaLab.dnaCompareLeft).toBe('exp-a'); expect(result()).toBeNull(); preserved();
  });

  it('resolves two slot changes in one React batch against the current state', async () => {
    await mount({ dnaExperimentHistory: [baseline, silent, insertion] }); const a = slotButton('exp-c', 'A'), b = slotButton('exp-c', 'B');
    await act(async () => { a.focus(); a.click(); b.focus(); b.click(); });
    expect(latest.dnaLab.dnaCompareLeft).toBe(''); expect(latest.dnaLab.dnaCompareRight).toBe('exp-c'); expect(document.activeElement).toBe(b); expect(result()).toBeNull(); preserved();
  });

  it('preserves a written comparison reflection when a slot is temporarily cleared and selected again', async () => {
    await mount(); const text = 'The codon changed but both codons still encode arginine.'; await input(reflection(), text);
    await choose(selectors()[1], ''); expect(latest.dnaLab.dnaCompareReflection).toBe(text); await choose(selectors()[1], 'exp-b'); expect(reflection().value).toBe(text);
    preserved({ comparisonReflection: text });
  });

  it('distinguishes duplicate legacy labels in cards, selectors, and comparison headers without rewriting saved entries', async () => {
    const entries = [{ ...baseline, label: 'Control' }, { ...silent, label: 'Control' }]; await mount({ dnaExperimentHistory: entries });
    expect(changes).not.toHaveBeenCalled(); expect(latest.dnaLab.dnaExperimentHistory).toBe(entries);
    expect(card('exp-a').textContent).toContain('Control (checkpoint 1)'); expect(card('exp-b').textContent).toContain('Control (checkpoint 2)');
    expect([...selectors()[0].options].map(option => option.textContent)).toEqual(['Choose experiment A', 'Control (checkpoint 1)', 'Control (checkpoint 2)']);
    const headers = [...compare().querySelectorAll('thead th')].map(th => th.textContent);
    expect(headers).toContain('A: Control (checkpoint 1)'); expect(headers).toContain('B: Control (checkpoint 2)');
    expect(nameOf(slotButton('exp-a', 'A'))).toContain('Control (checkpoint 1)'); expect(nameOf(restore('exp-b'))).toContain('Restore checkpoint'); expect(nameOf(restore('exp-b'))).toContain('Control (checkpoint 2)'); preserved();
  });
});

describe('Checkpoint restore and stale evidence', () => {
  it('restores the exact saved sequence and copied mutation trail while retaining focus, drafts, grades, and histories', async () => {
    await mount({ dnaReportOpen: true }); const button = restore('exp-b'), savedHistory = latest.dnaLab.dnaExperimentHistory, live = field('checkpoint-status');
    expect(nameOf(button)).toContain('Restore checkpoint'); await activate(button);
    expect(latest.dnaLab.dnaSequence).toBe(silentSequence); expect(latest.dnaLab.mutationLog).toEqual(silentLog); expect(latest.dnaLab.mutationLog).not.toBe(silentLog);
    expect(latest.dnaLab.mRNA).toBe(''); expect(latest.dnaLab.protein).toEqual([]); expect(latest.dnaLab.animStep).toBe(0); expect(latest.dnaLab.dnaExperimentHistory).toBe(savedHistory);
    expect(latest.dnaLab.dnaEvidenceScore).toBe(3); expect(latest.dnaLab.dnaEvidenceFeedback).toBe('Earlier successful evidence feedback.');
    expect(query('[data-dna-evidence-citation-detail]').getAttribute('data-stale')).toBe('true'); expect(field('evidence-citation-status').textContent).toMatch(/earlier|changed|refresh/i);
    expect(restore('exp-b')).toBe(button); expect(document.activeElement).toBe(button); expect(field('checkpoint-status')).toBe(live); expect(live.textContent).toContain('Experiment 2');
    expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it('restores a checkpoint resolved from the freshest history rather than an old button closure', async () => {
    await mount(); const button = restore('exp-b'), newerLog = [{ type: 'Insertion', pos: 3, to: 'A' }], newerEntry = { ...silent, dnaSequence: insertionSequence, mutationLog: newerLog }; button.focus();
    await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, dnaExperimentHistory: [baseline, newerEntry], parallelNote: 'Preserve the concurrent edit.' } })); button.click(); });
    expect(latest.dnaLab.dnaSequence).toBe(insertionSequence); expect(latest.dnaLab.mutationLog).toEqual(newerLog); expect(latest.dnaLab.mutationLog).not.toBe(newerLog);
    expect(latest.dnaLab.dnaExperimentHistory[1]).toBe(newerEntry); expect(latest.dnaLab.parallelNote).toBe('Preserve the concurrent edit.'); preserved();
  });

  it('ignores a stale restore action after its checkpoint has been removed from the current history', async () => {
    await mount(); const button = restore('exp-b'); button.focus();
    await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, dnaExperimentHistory: [baseline] } })); button.click(); });
    expect(latest.dnaLab.dnaSequence).toBe(insertionSequence); expect(latest.dnaLab.mutationLog).toBe(insertionLog); expect(latest.dnaLab.mRNA).toBe('EARLIER RNA');
    expect(latest.dnaLab.dnaExperimentHistory).toEqual([baseline]); preserved();
  });

  it('ignores a stale assignment action whose checkpoint was removed before its update applies', async () => {
    await mount({ dnaExperimentHistory: [baseline, silent, insertion] }); const button = slotButton('exp-c', 'A');
    await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, dnaExperimentHistory: [baseline, silent] } })); button.click(); });
    expect(latest.dnaLab.dnaCompareLeft).toBe('exp-a'); expect(latest.dnaLab.dnaCompareRight).toBe('exp-b'); expect(latest.dnaLab.dnaExperimentHistory).toEqual([baseline, silent]); preserved();
  });

  it('does not take host focus when restore is invoked without focus ownership', async () => {
    await mount(); outside.focus(); await activate(restore('exp-a'), false); expect(latest.dnaLab.dnaSequence).toBe(baselineSequence); expect(document.activeElement).toBe(outside); preserved();
  });

  it('keeps an existing CRISPR attempt and result intact while its established stale-target checks detect a restored sequence', async () => {
    const sequence = 'ATGAAACCCAGGTTT', attempt = { sequence, pamStart: 9, guideStart: 3, guideEnd: 9, cutSite: 6 };
    const editLog = [{ type: 'HDR', pos: 6, desc: 'Earlier CRISPR edit.', time: 12 }];
    await mount({ dnaSequence: sequence, crisprPhase: 'cut', crisprAttempt: attempt, crisprEditLog: editLog });
    await activate(restore('exp-a')); expect(latest.dnaLab.crisprAttempt).toBe(attempt); expect(latest.dnaLab.crisprEditLog).toBe(editLog); expect(latest.dnaLab.crisprPhase).toBe('cut');
    outside.focus(); await patch({ tab: 'crispr' }); expect(field('crispr-restart')).not.toBeNull(); expect(field('crispr-status').textContent).toMatch(/changed/i);
    expect(latest.dnaLab.dnaSequence).toBe(baselineSequence); expect(document.activeElement).toBe(outside); preserved();
  });
});

describe('Accessible saved-sequence comparison evidence', () => {
  it('exposes exact codon and amino-acid evidence in a captioned table with named keyboard scrolling and textual change cues', async () => {
    await mount(); const scroller = field('comparison-table-scroll'); expect(scroller).not.toBeNull(); expect(scroller.tabIndex).toBe(0); expect(scroller.getAttribute('role')).toBe('region');
    expect(nameOf(scroller)).not.toBe(''); const table = scroller.querySelector('table'); expect(table.caption).not.toBeNull(); expect(table.caption.textContent.trim()).not.toBe('');
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(5); const rows = [...table.querySelectorAll('tbody tr')]; expect(rows).toHaveLength(6);
    expect(rows.map(row => [...row.children].map(cell => cell.textContent.replace(/\s*\(changed\)/i, '').trim()))).toEqual(codonRows);
    expect(rows[1].textContent).toContain('(changed)'); expect(rows[0].textContent).not.toContain('(changed)'); expect(rows.every(row => row.querySelector('th[scope="row"]'))).toBe(true);
    expect(result().textContent).toContain('1 aligned base difference'); expect(result().textContent).toContain('first difference at base 6');
    expect(result().textContent).toContain('Protein: Met-Arg-Thr'); preserved();
  });

  it('retains the original position-aligned comparison of unequal-length sequences, including the incomplete final codon', async () => {
    await mount({ dnaExperimentHistory: [baseline, silent, insertion] }); await choose(selectors()[1], 'exp-c');
    expect(result().textContent).toContain('13 aligned base differences'); expect(result().textContent).toContain('first difference at base 4');
    const rows = [...compare().querySelectorAll('tbody tr')]; expect(rows).toHaveLength(7);
    expect([...rows[1].querySelectorAll('td')].map(cell => cell.textContent)).toEqual(['CGU', 'ACG', 'Arg', 'Thr']);
    expect([...rows[6].querySelectorAll('td')].map(cell => cell.textContent)).toEqual(['—', 'A', '—', '—']);
    expect(result().textContent).toContain('Protein: Met-Thr-Tyr-Leu-Lys-Leu'); expect(latest.dnaLab.dnaSequence).toBe(insertionSequence); preserved();
  });

  it('shows no comparison result for equal saved slot IDs and lets the learner resolve them without an initial write', async () => {
    await mount({ dnaCompareLeft: 'exp-a', dnaCompareRight: 'exp-a' }); expect(changes).not.toHaveBeenCalled(); expect(result()).toBeNull();
    expect(query('[data-dna-comparison-readiness]').getAttribute('data-comparison-state')).not.toBe('ready');
    expect(selectors().map(select => select.value)).toEqual(['exp-a', 'exp-a']); expect(latest.dnaLab.dnaCompareRight).toBe('exp-a');
    await activate(slotButton('exp-a', 'B')); expect(latest.dnaLab.dnaCompareLeft).toBe(''); expect(latest.dnaLab.dnaCompareRight).toBe('exp-a');
    await choose(selectors()[0], 'exp-b'); expect(result()).not.toBeNull(); preserved();
  });
});

describe('Empty checkpoints and React replay safety', () => {
  it('saves and restores an empty sequence as zero bases without replacing it with a default sequence', async () => {
    await mount({ dnaSequence: '', mutationLog: [], dnaExperimentHistory: [], dnaCompareLeft: '', dnaCompareRight: '' });
    await activate(save()); const saved = latest.dnaLab.dnaExperimentHistory[0]; expect(saved.dnaSequence).toBe(''); expect(saved.mutationLog).toEqual([]);
    const checkpoint = card(saved.id); expect(checkpoint.getAttribute('data-checkpoint-length')).toBe('0'); expect(checkpoint.getAttribute('data-checkpoint-gc')).toBe('0');
    expect(checkpoint.getAttribute('data-checkpoint-protein')).toBe('0'); expect(checkpoint.querySelector('[data-dna-checkpoint-fingerprint]').getAttribute('aria-label')).toContain('empty sequence');
    await patch({ dnaSequence: baselineSequence, mutationLog: [{ type: 'Substitution', pos: 3, from: 'A', to: 'C' }], mRNA: 'AUG', protein: [{ aa: 'Met' }], animStep: 3 });
    const button = restore(saved.id); await activate(button); expect(latest.dnaLab.dnaSequence).toBe(''); expect(latest.dnaLab.mutationLog).toEqual([]);
    expect(latest.dnaLab.mRNA).toBe(''); expect(latest.dnaLab.protein).toEqual([]); expect(latest.dnaLab.animStep).toBe(0);
    expect(card(saved.id).getAttribute('data-checkpoint-length')).toBe('0'); expect(document.activeElement).toBe(button); preserved();
  });

  it('does not duplicate saves or mutate existing checkpoint objects when StrictMode replays state updaters', async () => {
    const savedHistory = Object.freeze([baseline, silent]), frozenEvidence = JSON.stringify(savedHistory);
    await mount({ dnaExperimentHistory: savedHistory }, { strict: true }); expect(changes).not.toHaveBeenCalled(); const live = field('checkpoint-status');
    await activate(save()); let entries = latest.dnaLab.dnaExperimentHistory; expect(entries).toHaveLength(3); expect(entries.map(entry => entry.label)).toEqual(['Experiment 1', 'Experiment 2', 'Experiment 3']);
    expect(entries[0]).toBe(baseline); expect(entries[1]).toBe(silent); expect(JSON.stringify(savedHistory)).toBe(frozenEvidence);
    expect(host.querySelectorAll('#dna-checkpoint-status')).toHaveLength(1); expect(field('checkpoint-status')).toBe(live); expect(live.textContent.match(/Experiment 3 saved\./g)).toHaveLength(1);
    await activate(restore('exp-a')); expect(latest.dnaLab.dnaSequence).toBe(baselineSequence); expect(latest.dnaLab.mutationLog).not.toBe(baseline.mutationLog);
    await activate(save()); entries = latest.dnaLab.dnaExperimentHistory; expect(entries).toHaveLength(4); expect(entries.at(-1).label).toBe('Experiment 4'); expect(entries.at(-1).dnaSequence).toBe(baselineSequence);
    expect(new Set(entries.map(entry => entry.id)).size).toBe(4); expect(JSON.stringify(savedHistory)).toBe(frozenEvidence); expect(entries[0]).toBe(baseline); expect(entries[1]).toBe(silent);
    expect(host.querySelectorAll('#dna-checkpoint-status')).toHaveLength(1); expect(field('checkpoint-status')).toBe(live); preserved();
  });
});

describe('Repeated checkpoint feedback', () => {
  it('updates the stable status contents for a real repeated restore while keeping no-op and retired actions quiet', async () => {
    await mount(); const live = field('checkpoint-status'); status(live); await activate(restore('exp-a'));
    const firstChild = live.firstElementChild, firstText = live.textContent, firstNotice = latest.dnaLab.dnaCheckpointNoticeId;
    expect(firstChild).not.toBeNull(); expect(firstNotice).toBe(1); expect(latest.dnaLab.dnaSequence).toBe(baselineSequence);
    await patch({ dnaSequence: insertionSequence, mutationLog: insertionLog }); await activate(restore('exp-a'));
    expect(field('checkpoint-status')).toBe(live); expect(live.textContent).toBe(firstText); expect(live.firstElementChild).not.toBe(firstChild);
    expect(latest.dnaLab.dnaCheckpointNoticeId).toBe(firstNotice + 1); expect(latest.dnaLab.dnaSequence).toBe(baselineSequence);
    const secondChild = live.firstElementChild, secondNotice = latest.dnaLab.dnaCheckpointNoticeId; await activate(slotButton('exp-a', 'A'));
    expect(latest.dnaLab.dnaCheckpointNoticeId).toBe(secondNotice); expect(live.firstElementChild).toBe(secondChild);
    const retiredRestore = restore('exp-b'); await act(async () => {
      updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, dnaExperimentHistory: [baseline] } })); retiredRestore.click();
    });
    expect(latest.dnaLab.dnaCheckpointNoticeId).toBe(secondNotice); expect(live.firstElementChild).toBe(secondChild); expect(field('checkpoint-status')).toBe(live);
    expect(latest.dnaLab.dnaSequence).toBe(baselineSequence); expect(announce).not.toHaveBeenCalled(); preserved();
  });
});
