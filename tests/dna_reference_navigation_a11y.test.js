// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
// Independent inventory: adding keyboard navigation must retain every existing
// reference, including Mutation Inquiry and Trace trait, rather than the old
// stale summary count of 45.
const domains = [
  { label: 'DNA Basics', topics: [['bases', 'Base pairs'], ['code', 'Genetic code'], ['replication', 'DNA replication'], ['transcription', 'Transcription'],
    ['translation', 'Translation'], ['dnarna', 'DNA vs RNA'], ['mutations', 'Mutations'], ['amino', 'Amino acids'], ['mutInquiry', 'Mutation Inquiry']] },
  { label: 'Cell & Organelles', topics: [['organelles', 'Cell organelles'], ['celltypes', 'Cell types'], ['pathways', 'Cell pathways'], ['periodtable_bio', 'Bio elements'], ['devel', 'Embryology']] },
  { label: 'Genetics & Inheritance', topics: [['chromosomes', 'Chromosomes'], ['meiosis', 'Meiosis vs mitosis'], ['mendel', 'Mendelian genetics'],
    ['epigenetics', 'Epigenetics'], ['genomes', 'Genome sizes'], ['famousgenes', 'Famous genes']] },
  { label: 'Biotech & Lab', topics: [['biotech', 'Biotech tools'], ['biotech2', 'Biotech apps'], ['pcr', 'PCR + lab'], ['crispr', 'CRISPR detail'],
    ['sequencing', 'Sequencing tech'], ['modelorg', 'Model organisms'], ['ethics', 'Bioethics']] },
  { label: 'Disease & Health', topics: [['diseases', 'Disease genes'], ['cancer', 'Cancer biology'], ['immunity', 'Immune system'], ['viruses', 'Virus families'],
    ['microbiome', 'Microbiome'], ['organ_systems', 'Organ systems'], ['hormones', 'Hormones'], ['vitamins', 'Vitamins'], ['neuro', 'Neuroscience']] },
  { label: 'Life on Earth', topics: [['evolution', 'Evolution'], ['tree', 'Tree of life'], ['ecology', 'Ecology'], ['animals2', 'Animal facts'],
    ['animal_groups', 'Animal groups'], ['famous_orgs', 'Wild + dog DNA'], ['plants', 'Plant biology'], ['extinct', 'Extinct species']] },
  { label: 'Reference', topics: [['famous', 'History'], ['glossary', 'Glossary'], ['traceTrait', 'Trace trait']] }
];
const topics = domains.flatMap(domain => domain.topics);
const sibling = Object.freeze({ fieldNote: 'Keep the ecosystem observation.', revision: 10 });
const mainLab = Object.freeze({ tab: 'build', visitedTabs: Object.freeze({ build: true }), dnaSequence: 'ATGAAATAA', dnaFocusMode: false,
  dnaGradeOverride: '9-12', dnaReportNote: 'Keep my DNA reflection.', dnaEvidenceScore: 2, score: 31 });
const trace = Object.freeze({ score: 1, puzzles: Object.freeze({ p1: Object.freeze({ pick: 'autosomal_recessive',
  ranking: Object.freeze(['skip_generations', 'unaffected_carriers', 'no_sex_bias', 'present_in_homozygote']), revealed: true }) }) });
const inquiry = Object.freeze({ mutRate: 1e-7, popSize: 1e6, generations: 100, selection: 0,
  hypothesis: 'Keep the fixation hypothesis.', understood: true, explanation: 'Population size affects drift.',
  log: Object.freeze([{ state: 'Drift-dominated', t: '12:00:00', mu: '1.0e-7', N: '1.0e+6', g: 100, s: '0.000', fix: '0.00' }]) });
const referenceNote = Object.freeze({ draft: 'Keep the reference comparison.', revision: 4 });
let config, host, root, outside, latest, updateStore, changes, xp, announce, ai, actDescriptor;
const query = selector => host.querySelector(selector);
const library = () => query('.dna-reference-library');
const summary = () => query('#dna-reference-summary');
const panel = () => query('#dna-reference-topic-panel');
const topic = id => query(`[data-dna-reference-topic="${id}"]`);
const topicButtons = () => [...host.querySelectorAll('[data-dna-reference-topic]')];
function nameOf(element) {
  if (!element || element.getAttribute('aria-hidden') === 'true') return '';
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/).map(id => nameOf(document.getElementById(id))).join(' ').replace(/\s+/g, ' ').trim();
  const copy = element.cloneNode(true); copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove()); return copy.textContent.replace(/\s+/g, ' ').trim();
}
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(selected = null, open = false) {
  outside.focus(); await act(async () => { root.render(h(Host, { seed: { ecology: sibling, dnaLab: mainLab,
    dna: { expSection: selected, traceTrait: trace, mutInquiry: inquiry, referenceNote } } })); });
  if (open) await setOpen(true);
}
async function setOpen(open) {
  await act(async () => { library().open = open; library().dispatchEvent(new Event('toggle')); });
}
async function activate(element, ownFocus = true) {
  expect(element).not.toBeNull(); expect(element).toBeDefined(); if (ownFocus) element.focus(); await act(async () => { element.click(); });
}
// Native default keyboard activation is absent in jsdom. Deliver its click only
// if keydown was not consumed; browser coverage checks actual Enter/Space keys.
async function activateByKey(element, key) {
  expect(element.tagName).toBe('BUTTON'); element.focus();
  await act(async () => {
    const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); element.dispatchEvent(down);
    if (key === 'Enter' && !down.defaultPrevented) element.click();
    element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
    if (key === ' ' && !down.defaultPrevented) element.click();
  });
}
async function waitForTimers() { await act(async () => { vi.advanceTimersByTime(1000); }); }
function preserved() {
  expect(latest.ecology).toBe(sibling); expect(latest.dnaLab).toBe(mainLab); expect(latest.dna.traceTrait).toBe(trace);
  expect(latest.dna.mutInquiry).toBe(inquiry); expect(latest.dna.referenceNote).toBe(referenceNote); expect(xp).not.toHaveBeenCalled();
  for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function expectSelection(id) {
  const expanded = topicButtons().filter(button => button.getAttribute('aria-expanded') === 'true');
  expect(expanded).toEqual(id ? [topic(id)] : []); expect(panel().hidden).toBe(!id);
  if (id) { expect(panel().getAttribute('aria-labelledby')).toBe(topic(id).id); expect(nameOf(panel())).toBe(nameOf(topic(id))); }
  for (const button of topicButtons()) { expect(button.getAttribute('aria-controls')).toBe(panel().id); expect(button.getAttribute('aria-expanded')).toBe(String(button === topic(id))); }
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
  changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()]; vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation'; document.body.append(outside, host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('DNA reference library disclosure and complete catalog', () => {
  it('keeps the native library closed and quiet, with a separate summary name and accurate topic-count description', async () => {
    await mount(); expect(library().tagName).toBe('DETAILS'); expect(library().open).toBe(false); expect(summary().tagName).toBe('SUMMARY');
    expect(summary().parentElement).toBe(library()); expect(summary().getAttribute('aria-labelledby')).toBe('dna-reference-summary-label');
    expect(nameOf(summary())).toBe('Biology reference library'); expect(query('#dna-reference-summary-label').textContent).toBe('Biology reference library');
    expect(summary().getAttribute('aria-describedby').split(/\s+/)).toContain('dna-reference-summary-note'); expect(query('#dna-reference-summary-note').textContent).toContain('47');
    expect(panel().getAttribute('role')).toBe('region'); expect(panel().tabIndex).toBe(-1); expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(outside); expect(changes).not.toHaveBeenCalled(); await waitForTimers(); expect(changes).not.toHaveBeenCalled(); preserved();
  });

  it('preserves all 47 topic IDs and visible domain names while removing decorative icons from button names', async () => {
    await mount(null, true); const navigation = query('#dna-reference-topics');
    expect(navigation.tagName === 'NAV' || navigation.getAttribute('role') === 'navigation').toBe(true); expect(nameOf(navigation)).toBe('Biology reference topics');
    expect(topicButtons()).toHaveLength(47); expect(new Set(topicButtons().map(button => button.dataset.dnaReferenceTopic)).size).toBe(47);
    expect(topicButtons().map(button => button.dataset.dnaReferenceTopic)).toEqual(topics.map(([id]) => id));
    for (const domain of domains) {
      const group = topic(domain.topics[0][0]).closest('[role="group"]'); expect(nameOf(group)).toBe(domain.label);
      const label = document.getElementById(group.getAttribute('aria-labelledby')); expect(label).not.toBeNull(); expect(label.textContent).toBe(domain.label); expect(label.getAttribute('aria-hidden')).not.toBe('true');
      for (const [id, text] of domain.topics) {
        const button = topic(id); expect(group.contains(button)).toBe(true); expect(button.id).toBe('dna-reference-topic-' + id); expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
        expect(nameOf(button)).toBe(text); expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull(); expect(button.getAttribute('role')).not.toBe('tab');
      }
    }
    expectSelection(null); preserved();
  });

  it('renders every existing topic in the same stable named panel with exactly one expanded source button', async () => {
    await mount(null, true); const sharedPanel = panel();
    for (const [id, label] of topics) {
      await activate(topic(id)); expect(panel()).toBe(sharedPanel); expectSelection(id); expect(latest.dna.expSection).toBe(id);
      expect(document.activeElement).toBe(sharedPanel); expect(nameOf(sharedPanel)).toBe(label); expect(sharedPanel.firstElementChild.id).toBe('dna-reference-back');
      expect(sharedPanel.textContent.trim().length).toBeGreaterThan(label.length + 20); preserved();
    }
    expect(topicButtons()).toHaveLength(47);
  });
});

describe('DNA reference library deliberate keyboard focus', () => {
  it('hands focus to the selected topic on native Enter and Space activation', async () => {
    await mount(null, true); await activateByKey(topic('bases'), 'Enter'); expectSelection('bases'); expect(document.activeElement).toBe(panel());
    expect(panel().textContent).toContain('Adenine'); await activateByKey(topic('code'), ' '); expectSelection('code'); expect(document.activeElement).toBe(panel());
    expect(panel().textContent).toContain('AUG'); expect(panel().textContent).toContain('Methionine'); preserved();
  });

  it('updates an open library quietly when activation does not own keyboard focus', async () => {
    await mount(null, true); outside.focus(); await activate(topic('glossary'), false); expectSelection('glossary'); expect(document.activeElement).toBe(outside);
    expect(panel().textContent).toContain('Pedigree'); preserved();
  });

  it('does not move focus into a closed outer disclosure after programmatic topic selection', async () => {
    await mount(); await activate(topic('mendel'), false); expect(library().open).toBe(false); expectSelection('mendel'); expect(document.activeElement).toBe(outside);
    await setOpen(true); expectSelection('mendel'); expect(document.activeElement).toBe(outside); preserved();
  });

  it('collapses the active topic from its own button without removing that focused control', async () => {
    await mount('bases', true); const button = topic('bases'), sharedPanel = panel(); await activateByKey(button, 'Enter');
    expect(latest.dna.expSection).toBeNull(); expectSelection(null); expect(panel()).toBe(sharedPanel); expect(document.activeElement).toBe(button);
    expect(query('#dna-reference-close')).toBeNull(); preserved();
  });

  it('returns owned Close section focus to its source topic and changes only the selected-topic field', async () => {
    await mount('traceTrait', true); const previous = latest.dna, button = topic('traceTrait'); await activate(query('#dna-reference-close'));
    expectSelection(null); expect(document.activeElement).toBe(button); expect(latest.dna).toEqual({ ...previous, expSection: null });
    expect(query('#dna-reference-close')).toBeNull(); expect(latest.dna.traceTrait.puzzles.p1.revealed).toBe(true); preserved();
  });

  it('closes programmatically without pulling focus away from another host control', async () => {
    await mount('glossary', true); outside.focus(); await activate(query('#dna-reference-close'), false);
    expectSelection(null); expect(document.activeElement).toBe(outside); preserved();
  });

  it('puts Back to topics first in the content and returns focus without closing, writing state or altering learning', async () => {
    await mount('mutInquiry', true); const button = query('#dna-reference-back'), before = latest;
    expect(panel().firstElementChild).toBe(button); expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(nameOf(button)).toMatch(/Back to topics/i);
    await activateByKey(button, ' '); expect(document.activeElement).toBe(topic('mutInquiry')); expect(latest).toBe(before); expectSelection('mutInquiry');
    expect(library().open).toBe(true); preserved();
  });
});

describe('DNA reference library saved selection and disclosure lifecycle', () => {
  it('returns focus from a hidden descendant to the outer summary while preserving selection and work across reopening', async () => {
    await mount('traceTrait', true); panel().focus(); const before = latest, sharedPanel = panel(); await setOpen(false);
    expect(document.activeElement).toBe(summary()); expect(library().open).toBe(false); expect(latest).toBe(before); expect(latest.dna.expSection).toBe('traceTrait');
    await setOpen(true); expectSelection('traceTrait'); expect(panel()).toBe(sharedPanel); expect(document.activeElement).toBe(summary()); expect(latest).toBe(before);
    expect(panel().textContent).toContain('Pattern correct'); preserved();
  });

  it('restores a valid saved topic without opening the library, moving focus or initializing unrelated progress', async () => {
    await mount('code'); const before = latest; expectSelection('code'); expect(library().open).toBe(false); expect(document.activeElement).toBe(outside);
    expect(panel().textContent).toContain('AUG'); expect(changes).not.toHaveBeenCalled(); await waitForTimers(); expect(latest).toBe(before); expect(changes).not.toHaveBeenCalled(); preserved();
  });

  it('treats an unknown saved topic as inactive UI while retaining the persisted value and draft objects', async () => {
    await mount('unknown-saved-topic'); const before = latest; expectSelection(null); expect(query('#dna-reference-close')).toBeNull(); expect(latest.dna.expSection).toBe('unknown-saved-topic');
    expect(document.activeElement).toBe(outside); expect(changes).not.toHaveBeenCalled(); await waitForTimers(); expect(latest).toBe(before); expect(changes).not.toHaveBeenCalled(); preserved();
  });

  it('keeps the native outer open state through unrelated host rerenders and selection changes', async () => {
    await mount('bases', true); const nativeLibrary = library(); await activate(topic('pcr')); expect(library().open).toBe(true);
    await act(async () => { updateStore(prev => ({ ...prev, hostRevision: 2 })); }); expect(library()).toBe(nativeLibrary); expect(library().open).toBe(true); expectSelection('pcr');
    await setOpen(false); await act(async () => { updateStore(prev => ({ ...prev, hostRevision: 3 })); }); expect(library()).toBe(nativeLibrary); expect(library().open).toBe(false);
    expect(latest.dna.expSection).toBe('pcr'); expectSelection('pcr'); preserved();
  });
});
