// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement;
const act = React.act;
const canonical = 'stem_lab/stem_tool_punnett.js';
const dialogSelector = '[data-punnett-vocab-dialog]';
const contentSelector = '[data-punnett-content]';
const stepsSelector = '[data-punnett-dna-steps]';
const evidence = Object.freeze({ hypothesis: 'Compare inherited alleles', observations: Object.freeze(['Keep my prediction']) });
const siblingDraft = Object.freeze({ draft: 'Keep the other tool open', count: 17 });

let config, root, host, shell, outside, preserved, alreadyInert, outerSibling, stylesheet;
let latest, setStore, changes, xp, toast, audio, ai, actDescriptor;

const query = selector => host.querySelector(selector);
const dialog = () => query(dialogSelector);
const closeButton = () => dialog().querySelector('button[aria-label="Close flashcard"]');
const studyButton = () => [...dialog().querySelectorAll('button')].find(button => button.textContent.includes('Study Term'));
const opener = (term = 'genotype') => query(`[data-punnett-vocab-term="${term}"]`);
function nameOf(element) {
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/)
    .map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
  return element.textContent.trim();
}
function initial(subtool = 'challenge', patch = {}) {
  return {
    siblingTool: siblingDraft,
    punnett: {
      subtool, _visited: { [subtool]: true }, _chalDiff: 'easy', _chalIdx: 0,
      _chalFeedback: '❌ Incorrect. Try again.', _selectedOption: 1,
      researchPoints: 17, _studiedVocab: {}, learningEvidence: evidence,
      parent1: ['A', 'a'], parent2: ['a', 'a'], ...patch
    }
  };
}
function Host({ seed }) {
  const [store, update] = React.useState(seed);
  latest = store;
  setStore = update;
  const setToolData = React.useCallback(arg => {
    changes(arg);
    update(prev => typeof arg === 'function' ? arg(prev) : arg);
  }, []);
  return h(React.Fragment, null,
    h('button', { 'data-fixture-leading': true }, 'Host control before the tool'),
    config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, addToast: toast,
      callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] })),
    h('button', { 'data-fixture-trailing': true }, 'Host control after the tool'));
}
async function mount(subtool = 'challenge', patch = {}) {
  await act(async () => { root.render(h(Host, { seed: initial(subtool, patch) })); });
}
async function commit(patch) {
  await act(async () => { setStore(prev => ({ ...prev, punnett: { ...prev.punnett, ...patch } })); });
}
async function activate(element) {
  expect(element).not.toBeNull();
  element.focus();
  await act(async () => { element.click(); });
}
async function key(element, pressed, options = {}) {
  const event = new KeyboardEvent('keydown', { key: pressed, bubbles: true, cancelable: true, ...options });
  await act(async () => { element.dispatchEvent(event); });
  return event;
}
function expectEvidencePreserved() {
  expect(latest.siblingTool).toBe(siblingDraft);
  expect(latest.punnett.learningEvidence).toBe(evidence);
  expect(evidence.observations).toEqual(['Keep my prediction']);
  expect(latest.punnett.parent1).toEqual(['A', 'a']);
  expect(latest.punnett.parent2).toEqual(['a', 'a']);
}
function expectBackgroundRestored() {
  expect(outside.hasAttribute('inert')).toBe(false);
  expect(outerSibling.hasAttribute('inert')).toBe(false);
  expect(preserved.getAttribute('inert')).toBe('saved-inert-value');
  expect(alreadyInert.hasAttribute('inert')).toBe(true);
  expect(alreadyInert.getAttribute('inert')).toBe('');
  expect(stylesheet.hasAttribute('inert')).toBe(false);
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  const registry = resetStemLab();
  audio = vi.fn(() => null);
  registry.audioContext = audio;
  config = loadTool(canonical, 'punnett');
  changes = vi.fn(); xp = vi.fn(); toast = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  outside = document.createElement('button'); outside.textContent = 'Page control';
  preserved = document.createElement('section'); preserved.setAttribute('inert', 'saved-inert-value');
  alreadyInert = document.createElement('section'); alreadyInert.setAttribute('inert', '');
  stylesheet = document.createElement('style');
  shell = document.createElement('section');
  outerSibling = document.createElement('button'); outerSibling.textContent = 'Shell control';
  host = document.createElement('div');
  shell.append(outerSibling, host, alreadyInert);
  document.body.append(outside, preserved, stylesheet, shell);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    shell?.remove(); outside?.remove(); preserved?.remove(); stylesheet?.remove();
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    root = null; host = null; setStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Punnett vocabulary dialog keyboard access and isolation', () => {
  it('opens the current question’s named, described dialog with Close focused and no automatic rewards, audio or AI', async () => {
    await mount();
    const before = latest.punnett;
    await activate(opener());
    expect(query('[data-punnett-root]')).toBe(query('[data-punnett-tool]'));
    expect(dialog().getAttribute('role')).toBe('dialog');
    expect(dialog().getAttribute('aria-modal')).toBe('true');
    expect(nameOf(dialog())).toBe('Genotype');
    const definition = document.getElementById(dialog().getAttribute('aria-describedby'));
    expect(definition.textContent).toContain('allele combination or DNA sequence');
    expect(document.activeElement).toBe(closeButton());
    expect(dialog().tabIndex).toBe(-1);
    await activate(closeButton());
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener());
    const { _studyConcept, ...after } = latest.punnett;
    expect(after).toEqual(before);
    await commit({ _chalIdx: 1 });
    await activate(opener('heterozygous'));
    expect(nameOf(dialog())).toBe('Heterozygous');
    expect(document.getElementById(dialog().getAttribute('aria-describedby')).textContent).toContain('two different alleles');
    await key(closeButton(), 'Escape');
    expect(document.activeElement).toBe(opener('heterozygous'));
    expect(xp).not.toHaveBeenCalled(); expect(toast).not.toHaveBeenCalled(); expect(audio).not.toHaveBeenCalled();
    for (const callback of ai) expect(callback).not.toHaveBeenCalled();
    expectEvidencePreserved();
  });

  it('wraps Tab both ways, skips disabled and hidden controls, and redirects outside focus', async () => {
    await mount(); await activate(opener());
    const close = closeButton(), study = studyButton();
    const disabled = document.createElement('button'); disabled.disabled = true; disabled.textContent = 'Disabled';
    const hidden = document.createElement('div'); hidden.hidden = true;
    hidden.append(document.createElement('button'));
    const invisible = document.createElement('button'); invisible.style.visibility = 'hidden';
    dialog().append(disabled, hidden, invisible);
    expect((await key(close, 'Tab')).defaultPrevented).toBe(false);
    study.focus();
    expect((await key(study, 'Tab')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
    expect((await key(close, 'Tab', { shiftKey: true })).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(study);
    outside.focus();
    expect(document.activeElement).toBe(close);
    const before = latest;
    await key(close, 'ArrowRight');
    expect(latest).toBe(before);
    expectEvidencePreserved();
  });

  it('keeps Tab inside the dialog when every action is temporarily disabled and still permits Escape', async () => {
    await mount(); await activate(opener());
    for (const button of dialog().querySelectorAll('button')) button.disabled = true;
    expect((await key(document.activeElement, 'Tab')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog());
    expect((await key(dialog(), 'Tab', { shiftKey: true })).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog());
    await key(dialog(), 'Escape');
    expect(dialog()).toBeNull(); expect(document.activeElement).toBe(opener());
    expectBackgroundRestored();
  });

  it('isolates tool and outer-page siblings and restores each original inert attribute on Close', async () => {
    await mount(); await activate(opener());
    for (const node of [query(contentSelector), query('[data-fixture-leading]'), query('[data-fixture-trailing]'), outside, outerSibling]) {
      expect(node.hasAttribute('inert')).toBe(true);
    }
    expect(dialog().closest('[inert]')).toBeNull();
    expect(query('[data-punnett-vocab-overlay]').contains(dialog())).toBe(true);
    expect(stylesheet.hasAttribute('inert')).toBe(false);
    await activate(closeButton());
    for (const node of [query(contentSelector), query('[data-fixture-leading]'), query('[data-fixture-trailing]')]) {
      expect(node.hasAttribute('inert')).toBe(false);
    }
    expectBackgroundRestored();
    expect(document.activeElement).toBe(opener());
  });

  it('restores page isolation on unmount and leaves no keyboard or focus guard attached', async () => {
    await mount(); await activate(opener());
    const originalOpener = opener(), title = query('[data-punnett-title]');
    const focusConnectivity = [];
    for (const node of [originalOpener, title]) {
      const focus = node.focus.bind(node);
      vi.spyOn(node, 'focus').mockImplementation(() => { focusConnectivity.push(node.isConnected); focus(); });
    }
    const before = changes.mock.calls.length;
    await act(async () => { root.unmount(); }); root = null;
    expect(originalOpener.isConnected).toBe(false);
    expect(focusConnectivity).not.toContain(false);
    expectBackgroundRestored();
    outside.focus(); expect(document.activeElement).toBe(outside);
    expect((await key(outside, 'Escape')).defaultPrevented).toBe(false);
    expect((await key(outside, 'Tab')).defaultPrevented).toBe(false);
    expect(changes).toHaveBeenCalledTimes(before);
  });

  it('returns focus to the lab heading when the original vocabulary opener is removed', async () => {
    await mount(); await activate(opener());
    const originalOpener = opener();
    await commit({ subtool: 'dna2protein', _visited: { challenge: true, dna2protein: true } });
    expect(originalOpener.isConnected).toBe(false);
    expect(dialog()).not.toBeNull();
    await key(closeButton(), 'Escape');
    const title = query('[data-punnett-title]');
    expect(title.tagName).toBe('H2'); expect(title.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(title);
    expectBackgroundRestored(); expectEvidencePreserved();
  });

  it('isolates only valid persisted concepts and rejects inherited names or objects without trapping focus or Escape', async () => {
    const invalid = ['__proto__', 'constructor', { toString: () => 'genotype' }];
    await mount('challenge', { _studyConcept: invalid[0] });
    for (const value of invalid) {
      if (value !== invalid[0]) await commit({ _studyConcept: value });
      expect(dialog()).toBeNull();
      expect(query(contentSelector).hasAttribute('inert')).toBe(false);
      expectBackgroundRestored();
      outside.focus(); expect(document.activeElement).toBe(outside);
      const before = changes.mock.calls.length;
      expect((await key(outside, 'Escape')).defaultPrevented).toBe(false);
      expect((await key(outside, 'Tab')).defaultPrevented).toBe(false);
      expect(changes).toHaveBeenCalledTimes(before);
      expect(latest.punnett._studyConcept).toBe(value);
    }
    outside.focus();
    await commit({ _studyConcept: 'phenotype' });
    expect(nameOf(dialog())).toBe('Phenotype');
    expect(document.activeElement).toBe(closeButton());
    expect(outside.hasAttribute('inert')).toBe(true);
    await key(closeButton(), 'Escape');
    expect(dialog()).toBeNull(); expect(document.activeElement).toBe(outside);
    expectBackgroundRestored();
    expect(audio).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expectEvidencePreserved();
  });

  it('keeps the first-study reward exactly once and restores focus after Study and already-studied Close', async () => {
    await mount();
    const before = latest.punnett;
    await activate(opener()); await activate(studyButton());
    expect(dialog()).toBeNull(); expect(document.activeElement).toBe(opener());
    expect(latest.punnett.researchPoints).toBe(22);
    expect(latest.punnett._studiedVocab).toEqual({ genotype: true });
    expect(xp).toHaveBeenCalledTimes(1);
    expect(xp).toHaveBeenCalledWith('studyVocab_genotype', 10, 'Study Vocab: Genotype');
    expect(toast).toHaveBeenCalledTimes(1);
    await activate(opener());
    expect(dialog().textContent).toContain('already studied this term');
    expect(studyButton()).toBeUndefined();
    const secondaryClose = [...dialog().querySelectorAll('button')].find(button => button.textContent === 'Close');
    await activate(secondaryClose);
    expect(dialog()).toBeNull(); expect(document.activeElement).toBe(opener());
    expect(latest.punnett.researchPoints).toBe(22); expect(xp).toHaveBeenCalledTimes(1); expect(toast).toHaveBeenCalledTimes(1);
    const { _studyConcept, _studiedVocab, researchPoints, ...after } = latest.punnett;
    const { _studiedVocab: oldStudied, researchPoints: oldRP, ...untouched } = before;
    expect(after).toEqual(untouched);
    expectBackgroundRestored(); expectEvidencePreserved();
    for (const callback of ai) expect(callback).not.toHaveBeenCalled();
  });
});

describe('Punnett DNA translation disclosure accessibility', () => {
  it('uses the visible DNA label and a stable named disclosure for every 0–2-base input', async () => {
    await mount('dna2protein', { _dnaSeq: '', _dnaShowSteps: false });
    const input = query('#punnett-dna-sequence');
    expect(input).not.toBeNull(); expect(input.value).toBe('');
    expect(input.hasAttribute('aria-label')).toBe(false);
    expect(input.labels).toHaveLength(1);
    expect(input.labels[0].htmlFor).toBe(input.id);
    expect(input.labels[0].textContent).toContain('DNA Template Strand');
    const toggle = query(stepsSelector), region = query('#punnett-dna-steps');
    expect(region).not.toBeNull();
    expect(toggle.getAttribute('aria-controls')).toBe(region.id);
    expect([...host.querySelectorAll('button')].filter(button => nameOf(button) === 'Sample 1')).toHaveLength(1);
    for (const sequence of ['', 'A', 'AT']) {
      await commit({ _dnaSeq: sequence, _dnaShowSteps: false });
      expect(query('#punnett-dna-sequence').value).toBe(sequence);
      expect(query('#punnett-dna-steps')).toBe(region);
      expect(region.hidden).toBe(true); expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(nameOf(toggle)).toContain('Show Steps'); expect(toggle.disabled).toBe(false);
      await activate(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(region.hidden).toBe(false);
      expect(nameOf(toggle)).toContain('Hide Steps');
      expect(region.textContent).toMatch(/(?:three|3).*base|base.*(?:three|3)/i);
      expect(query('#punnett-dna-steps')).toBe(region);
      await activate(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(region.hidden).toBe(true);
    }
    // Retain the existing truthiness of old saved state while exposing a boolean
    // expanded value; the string "false" must not describe an open region as closed.
    await commit({ _dnaShowSteps: 'false' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(region.hidden).toBe(false);
    expect(latest.punnett._dnaShowSteps).toBe('false');
    expect(xp).not.toHaveBeenCalled(); expect(audio).not.toHaveBeenCalled(); expectEvidencePreserved();
  });

  it('preserves input normalization and the existing transcription/codon results while steps show and hide', async () => {
    await mount('dna2protein', { _dnaSeq: 'ATG', _dnaShowSteps: false });
    const input = query('#punnett-dna-sequence');
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      nativeValue.call(input, 'atg aaa taa! 123');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(input.value).toBe('ATGAAATAA'); expect(latest.punnett._dnaSeq).toBe('ATGAAATAA');
    const region = query('#punnett-dna-steps'), toggle = query(stepsSelector);
    await activate(toggle);
    expect(region.hidden).toBe(false);
    expect(region.textContent).toContain('ATGAAATAA'); expect(region.textContent).toContain('AUGAAAUAA');
    expect(region.textContent).toContain('Transcription'); expect(region.textContent).toContain('Codons');
    for (const codon of ['AUG', 'AAA', 'UAA']) expect(region.textContent).toContain(codon);
    expect(host.textContent).toContain('Protein length: 2 amino acids');
    await activate(toggle);
    expect(query('#punnett-dna-steps')).toBe(region); expect(region.hidden).toBe(true);
    expect(input.value).toBe('ATGAAATAA'); expect(host.textContent).toContain('Protein length: 2 amino acids');
    expect(latest.punnett._dnaDone).toBeUndefined();
    expect(xp).not.toHaveBeenCalled(); expect(audio).not.toHaveBeenCalled();
    for (const callback of ai) expect(callback).not.toHaveBeenCalled();
    expectEvidencePreserved();
  });
});
