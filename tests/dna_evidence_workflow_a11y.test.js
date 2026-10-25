// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const sibling = Object.freeze({ fieldNote: 'Keep the ecology evidence.', revision: 12 });
const expansion = Object.freeze({ expSection: null, learnerNote: 'Keep the reference draft.' });
const unknownDraft = Object.freeze({ reflection: 'Keep an unknown saved field.' });
const history = Object.freeze([{ id: 'control', label: 'Saved control', dnaSequence: 'ATGAAATAA', mutationLog: [] }]);
const scenarioPlan = Object.freeze({ scenarioId: 'frameshift_deletion', sequenceBefore: 'ATGCGTACCTGAAACTGA', sequenceAfter: 'ATGGTACCTGAAACTGA',
  mutationType: 'Deletion', pos: 3, position: 4, from: 'C', to: '', beforeMrnaCodon: 'CGU', afterMrnaCodon: 'GUA' });
const scenario = Object.freeze({ dnaScenarioId: 'frameshift_deletion', dnaScenarioPrediction: '', dnaScenarioLockedPrediction: '', dnaScenarioPlan: scenarioPlan,
  dnaScenarioRun: false, dnaScenarioScore: 0, dnaScenarioRevision: 'uncertain', dnaScenarioRevisionReason: 'Keep the scenario reflection.', dnaScenarioComplete: false });
const insertion = Object.freeze({ dnaSequence: 'ATGACGTACCTGAAACTGA', mutationLog: Object.freeze([{ type: 'Insertion', pos: 3, to: 'A' }]), dnaImpactCodonIndex: 2 });
const codonDetail = 'Codon 2 (bases 4-6): mRNA CGU -> ACG; amino acid Arg -> Thr; predicted effect Frameshift.';
const codonKey = 'ATGACGTACCTGAAACTGA|1|Insertion:3::A';
const frameState = Object.freeze({ tab: 'translate', dnaSequence: 'AATGAAATAA', mutationLog: Object.freeze([]), dnaReadingFrame: 2 });
const frameDetail = 'Reading frame +2 groups codons beginning at base 2. Complete ORF: AUG starts at base 2; UAA stops translation at bases 8-10; protein Met-Lys (2 aa).';
const frameKey = 'AATGAAATAA|0|';
const validReasoning = 'The changed codon shows that the insertion shifted downstream reading.';
const rubricCases = [
  { name: 'unmutated base pairing', data: { dnaSequence: 'ATGCGTACCTGAAACTGA', mutationLog: [] },
    prompt: 'Connect complementary base pairing to the DNA evidence.', claims: ['base_pairing', 'sequence_to_rna', 'reading_frame'], citations: ['pairing', 'sequence', 'mrna', 'frame'] },
  { name: 'insertion frameshift', data: insertion, prompt: 'Explain how the insertion or deletion affected downstream codons.',
    claims: ['frameshift', 'protein_change'], citations: ['sequence', 'codon', 'protein', 'frame'] },
  { name: 'silent substitution', data: { dnaSequence: 'ATGCGCACCTGAAACTGA', mutationLog: [{ type: 'Substitution', pos: 5, from: 'T', to: 'C' }] },
    prompt: 'Explain why a DNA change did or did not change the protein.', claims: ['silent_change', 'codon_change_same_protein'], citations: ['sequence', 'codon', 'protein', 'frame'] },
  { name: 'protein-changing substitution', data: { dnaSequence: 'ATGAGTACCTGAAACTGA', mutationLog: [{ type: 'Substitution', pos: 3, from: 'C', to: 'A' }] },
    prompt: 'Explain how the DNA change affected the codon or protein evidence.', claims: ['protein_change', 'sequence_change'], citations: ['sequence', 'codon', 'protein', 'frame'] }
];
const sources = [
  { name: 'codon spotlight', data: { ...insertion, tab: 'mutate' }, id: 'dna-use-codon-evidence', citation: 'codon', detail: codonDetail, key: codonKey, returnName: 'Return to codon spotlight' },
  { name: 'reading-frame explorer', data: frameState, id: 'dna-use-frame-evidence', citation: 'frame', detail: frameDetail, key: frameKey, returnName: 'Return to reading-frame explorer' }
];
let config, host, root, outside, latest, updateStore, changes, xp, announce, celebrate, ai, actDescriptor, originalSequence, originalMutationLog;
const query = selector => host.querySelector(selector);
const evidence = () => query('[data-dna-evidence-mode]');
const field = key => query('#dna-evidence-' + key);
const feedback = () => field('feedback');
const snapshot = () => query('[data-dna-evidence-citation-detail]');
function nameOf(element) {
  if (!element || element.getAttribute('aria-hidden') === 'true') return '';
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/).map(id => nameOf(document.getElementById(id))).join(' ').replace(/\s+/g, ' ').trim();
  if (element.labels?.length) return [...element.labels].map(label => nameOf(label)).join(' ').trim();
  const clone = element.cloneNode(true); clone.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  // A wrapping label names its own form control from the caption, not from the
  // select's option inventory or the textarea's saved content.
  if (element.tagName === 'LABEL') clone.querySelectorAll('input,select,textarea,button').forEach(node => node.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce, celebrate,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(patch = {}) {
  const dnaLab = { tab: 'mutate', dnaFocusMode: false, dnaGradeOverride: '9-12', visitedTabs: { mutate: true }, ...insertion, ...scenario,
    dnaReportOpen: true, dnaReportNote: 'Keep the student report reflection.', dnaEvidenceClaim: '', dnaEvidenceCitation: '', dnaEvidenceCitationDetail: '',
    dnaEvidenceCitationSequenceKey: '', dnaEvidenceReasoning: '', dnaEvidenceScore: 0, dnaEvidenceFeedback: '', dnaExperimentHistory: history, unknownDraft, ...patch };
  originalSequence = dnaLab.dnaSequence; originalMutationLog = dnaLab.mutationLog; outside.focus();
  await act(async () => { root.render(h(Host, { seed: { dnaLab, ecology: sibling, dna: expansion } })); });
}
async function patch(values) { await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, ...values } })); }); }
async function input(element, value) {
  expect(element).not.toBeNull(); const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value)); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function select(element, value) {
  expect(element.tagName).toBe('SELECT'); await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function activate(element, ownFocus = true) {
  expect(element).not.toBeNull(); expect(element).toBeDefined(); if (ownFocus) element.focus(); await act(async () => { element.click(); });
}
async function activateByKey(element, key) {
  expect(element.tagName).toBe('BUTTON'); element.focus(); await act(async () => {
    const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); element.dispatchEvent(down);
    if (key === 'Enter' && !down.defaultPrevented) element.click();
    element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
    if (key === ' ' && !down.defaultPrevented) element.click();
  });
}
async function advance() { await act(async () => { vi.advanceTimersByTime(1000); }); }
function expectStatus(node) {
  expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status'); expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true');
}
function preserved(expectedSequence = originalSequence, expectedMutationLog = originalMutationLog) {
  expect(latest.ecology).toBe(sibling); expect(latest.dna).toBe(expansion); expect(latest.dnaLab.unknownDraft).toBe(unknownDraft); expect(latest.dnaLab.dnaExperimentHistory).toBe(history);
  expect(latest.dnaLab.dnaSequence).toBe(expectedSequence); expect(latest.dnaLab.mutationLog).toBe(expectedMutationLog);
  for (const [key, value] of Object.entries(scenario)) expect(latest.dnaLab[key]).toBe(value);
  expect(xp).not.toHaveBeenCalled(); for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab'); changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); celebrate = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation';
  document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Evidence & Reasoning visible labels and accessible feedback', () => {
  it('associates native fields with visible labels and persistent described guidance without initial writes or focus changes', async () => {
    await mount(); const controls = [[field('claim'), 'Claim'], [field('citation'), 'Evidence citation'],
      [field('reasoning'), 'Explain how the evidence supports the claim'], [query('#dna-report-reflection'), 'DNA lab report reflection or claim']];
    for (const [control, label] of controls) {
      expect(control.labels).toHaveLength(1); expect(control.labels[0].htmlFor).toBe(control.id); expect(nameOf(control.labels[0])).toBe(label);
      expect(nameOf(control).toLowerCase()).toContain(label.toLowerCase()); const help = control.getAttribute('aria-describedby').split(/\s+/);
      const described = help.map(id => document.getElementById(id)); expect(described.length).toBeGreaterThan(0); expect(described.every(Boolean)).toBe(true);
      expect(described.every(node => node.getAttribute('role') === 'status' || !!node.textContent.trim())).toBe(true);
      expect(described.some(node => !!node.textContent.trim())).toBe(true);
    }
    expect(field('claim').tagName).toBe('SELECT'); expect(field('citation').tagName).toBe('SELECT'); expect(field('reasoning').tagName).toBe('TEXTAREA');
    expect(field('reasoning').getAttribute('aria-describedby').split(/\s+/)).toContain('dna-evidence-reasoning-help'); expect(field('reasoning-help').textContent).toMatch(/8|eight/i);
    expect(field('reasoning-help').textContent).toMatch(/because|shows|therefore|so/i); expectStatus(feedback()); expect(feedback().textContent).toBe('');
    expect(document.activeElement).toBe(outside); expect(changes).not.toHaveBeenCalled(); preserved();
  });

  it('retains drafts when the report is hidden and clears only the evidence grade after deliberate form edits', async () => {
    await mount({ dnaEvidenceClaim: 'frameshift', dnaEvidenceCitation: 'sequence', dnaEvidenceReasoning: validReasoning, dnaEvidenceScore: 3, dnaEvidenceFeedback: 'Earlier feedback.' });
    await input(query('#dna-report-reflection'), 'A newly drafted report reflection.'); await input(field('reasoning'), 'A new codon explanation stays saved while the report closes.');
    expect(latest.dnaLab.dnaEvidenceScore).toBe(0); expect(feedback().textContent).toBe(''); expect(latest.dnaLab.dnaEvidenceClaim).toBe('frameshift'); expect(latest.dnaLab.dnaEvidenceCitation).toBe('sequence');
    await activate(query('#dna-report-toggle')); expect(evidence()).toBeNull(); await activate(query('#dna-report-toggle'));
    expect(query('#dna-report-reflection').value).toBe('A newly drafted report reflection.'); expect(field('reasoning').value).toBe('A new codon explanation stays saved while the report closes.'); preserved();
  });

  it('preserves the exact seven-to-eight word boundary and rejects eight words without a rubric keyword', async () => {
    await mount({ dnaEvidenceClaim: 'frameshift', dnaEvidenceCitation: 'sequence' }); const live = feedback();
    for (const [reasoning, score] of [['The codon changed because the insertion shifted', 2], ['I carefully observed this result and recorded it', 2],
      ['The codon changed because the insertion shifted downstream', 3]]) {
      await input(field('reasoning'), reasoning); await activate(field('check')); expect(latest.dnaLab.dnaEvidenceScore).toBe(score); expect(feedback()).toBe(live);
    }
    expect(celebrate).toHaveBeenCalledTimes(1); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it('continues accepting scientific linking keywords without requiring one particular connector', async () => {
    await mount({ dnaEvidenceClaim: 'frameshift', dnaEvidenceCitation: 'sequence' }); await input(field('reasoning'), 'The codon remained stable throughout this careful test'); await activate(field('check'));
    expect(latest.dnaLab.dnaEvidenceScore).toBe(3); expect(feedback().textContent).toContain('Strong claim-evidence-reasoning link.'); expect(celebrate).toHaveBeenCalledTimes(1); preserved();
  });

  it('keeps repeated grading deliberate, focused and quiet outside its single feedback status', async () => {
    await mount({ dnaEvidenceClaim: 'frameshift', dnaEvidenceCitation: 'sequence', dnaEvidenceReasoning: validReasoning }); const button = field('check'), live = feedback();
    await activateByKey(button, 'Enter'); await activateByKey(button, ' '); expect(latest.dnaLab.dnaEvidenceScore).toBe(3); expect(celebrate).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe(button); expect(feedback()).toBe(live); expect(announce).not.toHaveBeenCalled(); preserved();
  });

  it.each(rubricCases)('preserves all authored valid claims and citations for $name', async example => {
    await mount({ ...example.data, dnaEvidenceReasoning: validReasoning }); expect(evidence().textContent).toContain(example.prompt);
    expect([...field('claim').options].map(option => option.value).filter(Boolean)).toEqual(example.claims);
    let checks = 0;
    for (const claim of example.claims) for (const citation of example.citations) {
      await select(field('claim'), claim); await select(field('citation'), citation); await activate(field('check')); checks++;
      expect(latest.dnaLab.dnaEvidenceScore).toBe(3); expect(feedback().textContent).toContain('Your explanation connects the molecular evidence to the conclusion.');
    }
    expect(celebrate).toHaveBeenCalledTimes(checks); expect(announce).not.toHaveBeenCalled(); preserved();
  });
});

describe('Evidence citation freshness and refresh focus', () => {
  it('caps stale snapshot evidence at two points and separates full saved prose from concise live freshness feedback', async () => {
    await mount({ dnaEvidenceClaim: 'frameshift', dnaEvidenceCitation: 'codon', dnaEvidenceCitationDetail: codonDetail,
      dnaEvidenceCitationSequenceKey: 'earlier-sequence', dnaEvidenceReasoning: validReasoning });
    const detail = snapshot(), live = query('#dna-evidence-citation-status'); expect(detail.getAttribute('role')).toBe('region'); expect(detail.getAttribute('aria-labelledby')).toBe('dna-evidence-citation-title');
    expect(detail.hasAttribute('aria-live')).toBe(false); expect(detail.textContent).toContain(codonDetail); expectStatus(live); expect(live.textContent).toMatch(/earlier|stale|refresh/i); expect(live.textContent).not.toContain(codonDetail);
    await activate(field('check')); expect(latest.dnaLab.dnaEvidenceScore).toBe(2); expect(feedback().textContent).toContain('comes from an earlier sequence'); expect(celebrate).not.toHaveBeenCalled(); preserved();
  });

  it('keeps captured codon evidence and drafts after mutation reset while guarding an unavailable refresh and return', async () => {
    await mount({ dnaReportOpen: false, dnaEvidenceClaim: 'frameshift', dnaEvidenceReasoning: validReasoning });
    await activate(query('#dna-use-codon-evidence')); expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe(codonDetail);
    await input(query('#dna-report-reflection'), 'The earlier codon observation remains part of my report.');
    const capturedPanel = snapshot(), capturedRefresh = query('#dna-evidence-refresh');
    const resetSequence = 'ATGCGTACCTGAAACTGA', resetLog = [];
    await patch({ dnaSequence: resetSequence, mutationLog: resetLog });
    const detail = snapshot(), refresh = query('#dna-evidence-refresh'), citationStatus = query('#dna-evidence-citation-status');
    expect(detail).toBe(capturedPanel); expect(refresh).toBe(capturedRefresh);
    expect(query('#dna-evidence-return')).toBeNull(); expect(detail.hidden).toBe(false); expect(detail.getAttribute('data-stale')).toBe('true');
    expect(detail.textContent).toContain(codonDetail); expect(latest.dnaLab.dnaEvidenceCitationSequenceKey).toBe(codonKey);
    expect(citationStatus.textContent).toMatch(/no current mutation comparison/i);
    expect(citationStatus.textContent).toMatch(/another mutation|choose.*evidence/i);
    expect(refresh).not.toBeNull(); expect(refresh.disabled).toBe(false); expect(refresh.getAttribute('aria-disabled')).toBe('true'); expect(refresh.tabIndex).toBe(-1);
    const before = latest; await activateByKey(refresh, 'Enter'); await activateByKey(refresh, ' ');
    expect(latest).toBe(before); expect(query('#dna-evidence-refresh')).toBe(refresh); expect(snapshot()).toBe(detail);
    await activate(field('check')); expect(latest.dnaLab.dnaEvidenceScore).toBeLessThanOrEqual(2);
    expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe(codonDetail); expect(field('reasoning').value).toBe(validReasoning);
    expect(query('#dna-report-reflection').value).toBe('The earlier codon observation remains part of my report.');
    preserved(resetSequence, resetLog);
  });

  it('retains same-source snapshots, clears changed citation details and keeps the hidden snapshot region mounted', async () => {
    await mount({ dnaEvidenceCitation: 'codon', dnaEvidenceCitationDetail: codonDetail, dnaEvidenceCitationSequenceKey: codonKey }); const detail = snapshot(), refresh = query('#dna-evidence-refresh');
    await select(field('citation'), 'codon'); expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe(codonDetail); expect(latest.dnaLab.dnaEvidenceCitationSequenceKey).toBe(codonKey);
    await select(field('citation'), 'sequence'); expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe(''); expect(latest.dnaLab.dnaEvidenceCitationSequenceKey).toBe('');
    expect(snapshot()).toBe(detail); expect(detail.hidden).toBe(true); expect(query('#dna-evidence-citation-status').textContent).toBe('');
    expect(query('#dna-evidence-refresh')).toBe(refresh); expect(refresh.disabled).toBe(false); expect(refresh.getAttribute('aria-disabled')).toBe('true'); const before = latest;
    await activate(refresh); expect(latest).toBe(before); preserved();
  });

  it.each(sources)('refreshes the exact $name snapshot without removing its focused action', async source => {
    const claim = source.citation === 'codon' ? 'frameshift' : 'reading_frame';
    await mount({ ...source.data, dnaEvidenceClaim: claim, dnaEvidenceCitation: source.citation, dnaEvidenceCitationDetail: 'An earlier saved observation.',
      dnaEvidenceCitationSequenceKey: 'earlier-sequence', dnaEvidenceReasoning: validReasoning, dnaEvidenceScore: 2, dnaEvidenceFeedback: 'Refresh needed.' });
    const button = query('#dna-evidence-refresh'), detail = snapshot(); expect(button.getAttribute('aria-disabled')).toBe('false'); expect(button.disabled).toBe(false);
    expect(nameOf(button)).toContain(source.citation === 'frame' ? 'Refresh from frame explorer' : 'Refresh from spotlight'); await activateByKey(button, 'Enter');
    expect(query('#dna-evidence-refresh')).toBe(button); expect(snapshot()).toBe(detail); expect(document.activeElement).toBe(button); expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.tabIndex).toBe(-1);
    expect(latest.dnaLab.dnaEvidenceCitation).toBe(source.citation); expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe(source.detail); expect(latest.dnaLab.dnaEvidenceCitationSequenceKey).toBe(source.key);
    expect(latest.dnaLab.dnaEvidenceScore).toBe(0); expect(feedback().textContent).toBe(''); expect(latest.dnaLab.dnaEvidenceClaim).toBe(claim); expect(latest.dnaLab.dnaEvidenceReasoning).toBe(validReasoning);
    expect(detail.getAttribute('data-stale')).toBe('false'); const before = latest; await activateByKey(button, ' '); expect(latest).toBe(before); preserved();
  });
});

describe('Deliberate evidence handoff and return navigation', () => {
  it.each(sources)('opens the report from $name, focuses its evidence heading and returns without changing saved work', async source => {
    await mount({ ...source.data, dnaReportOpen: false, dnaEvidenceReasoning: validReasoning }); const origin = query('#' + source.id); await activateByKey(origin, 'Enter');
    const title = query('#dna-evidence-mode-title'); expect(latest.dnaLab.dnaReportOpen).toBe(true); expect(title.tabIndex).toBe(-1); expect(document.activeElement).toBe(title);
    expect(latest.dnaLab.dnaEvidenceCitation).toBe(source.citation); expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe(source.detail); expect(latest.dnaLab.dnaEvidenceCitationSequenceKey).toBe(source.key);
    const back = query('#dna-evidence-return'); expect(nameOf(back)).toBe(source.returnName); const before = latest; await activateByKey(back, ' ');
    expect(document.activeElement).toBe(origin); expect(latest).toBe(before); expect(latest.dnaLab.dnaEvidenceReasoning).toBe(validReasoning); preserved();
  });

  it('applies programmatic evidence capture quietly when its source does not own focus', async () => {
    await mount({ dnaReportOpen: false }); outside.focus(); await activate(query('#dna-use-codon-evidence'), false);
    expect(latest.dnaLab.dnaReportOpen).toBe(true); expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe(codonDetail); expect(document.activeElement).toBe(outside); preserved();
  });

  it('does not take focus back when another control gains focus before the handoff commits', async () => {
    await mount({ dnaReportOpen: false }); const origin = query('#dna-use-codon-evidence'); origin.focus();
    await act(async () => { origin.click(); outside.focus(); }); expect(latest.dnaLab.dnaReportOpen).toBe(true); expect(document.activeElement).toBe(outside); preserved();
  });

  it('restores a saved current citation and report without fabricating a return origin or moving focus', async () => {
    await mount({ dnaEvidenceCitation: 'codon', dnaEvidenceCitationDetail: codonDetail, dnaEvidenceCitationSequenceKey: codonKey });
    expect(snapshot().hidden).toBe(false); expect(snapshot().getAttribute('data-stale')).toBe('false'); expect(query('#dna-evidence-return')).toBeNull(); expect(document.activeElement).toBe(outside);
    expect(changes).not.toHaveBeenCalled(); await advance(); expect(document.activeElement).toBe(outside); expect(changes).not.toHaveBeenCalled(); preserved();
  });

  it('does not expose a return control for an origin on a different current lab tab', async () => {
    await mount({ dnaReportOpen: false }); await activate(query('#dna-use-codon-evidence')); expect(query('#dna-evidence-return')).not.toBeNull(); outside.focus();
    await patch({ tab: 'build' }); expect(query('#dna-evidence-return')).toBeNull(); expect(document.activeElement).toBe(outside); expect(latest.dnaLab.dnaEvidenceCitationDetail).toBe(codonDetail); preserved();
  });

  it('cannot move host focus after the tool unmounts during an evidence handoff', async () => {
    await mount({ dnaReportOpen: false }); const origin = query('#dna-use-codon-evidence'); origin.focus();
    await act(async () => { origin.click(); root.unmount(); }); root = null; outside.focus(); await advance();
    expect(document.activeElement).toBe(outside); expect(host.childElementCount).toBe(0); preserved();
  });
});
