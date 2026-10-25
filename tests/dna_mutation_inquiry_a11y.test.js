// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const defaults = Object.freeze({ mutRate: 1e-7, popSize: 1e6, generations: 100, selection: 0,
  hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] });
const sibling = Object.freeze({ observation: 'Keep the ecology field note.', revision: 11 });
const mainLab = Object.freeze({ tab: 'build', visitedTabs: Object.freeze({ build: true }), dnaSequence: 'ATGAAATAA', dnaFocusMode: false,
  dnaGradeOverride: '9-12', dnaReportNote: 'Keep the DNA claim.', dnaEvidenceScore: 2, score: 31 });
const trace = Object.freeze({ score: 1, puzzles: Object.freeze({ p1: Object.freeze({ pick: 'autosomal_recessive',
  ranking: Object.freeze(['skip_generations', 'unaffected_carriers', 'no_sex_bias', 'present_in_homozygote']), revealed: true }) }) });
const extraNote = Object.freeze({ draft: 'Keep an unknown saved field.', revision: 3 });
const referenceNote = Object.freeze({ draft: 'Keep the library note.' });
const scientificCases = [
  { name: 'neutral 1/(2N)', mutRate: .01, popSize: 10, generations: 10000, selection: 0, percent: '5.00%', fix: '0.50', state: 'Slow evolution' },
  { name: 'weak-selection exponential ratio', mutRate: .01, popSize: 10, generations: 10000, selection: .005, percent: '5.49%', fix: '0.55', state: 'Slow evolution' },
  { name: 'vanishing-coefficient neutral fallback', mutRate: .01, popSize: 100, generations: 10000, selection: 1e-20, percent: '0.50%', fix: '0.50', state: 'Slow evolution' },
  { name: 'positive overflow branch', mutRate: .001, popSize: 1000, generations: 1000, selection: .2, percent: '40.00%', fix: '4.00', state: 'Slow evolution' },
  { name: 'finite negative-selection ratio', mutRate: .01, popSize: 10, generations: 10000, selection: -.005, percent: '4.54%', fix: '0.45', state: 'Drift-dominated' },
  { name: 'negative overflow branch', mutRate: .001, popSize: 1000, generations: 1000, selection: -.5, percent: '0.00%', fix: '0.00', state: 'Static' },
  { name: 'existing 0.95 probability cap', mutRate: .01, popSize: 1000, generations: 1000, selection: .5, percent: '95.00%', fix: '95.00', state: 'Runaway adaptation' }
];
let config, host, root, outside, latest, updateStore, changes, xp, announce, ai, actDescriptor;
const query = selector => host.querySelector(selector);
const inquiry = () => query('[data-dna-inquiry]');
const range = key => query('#dna-inquiry-' + key);
const state = () => latest.dna.mutInquiry;
const result = () => query('#dna-inquiry-result');
function nameOf(element) {
  if (!element || element.getAttribute('aria-hidden') === 'true') return '';
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/).map(id => nameOf(document.getElementById(id))).join(' ').replace(/\s+/g, ' ').trim();
  if (element.labels?.length) return [...element.labels].map(label => nameOf(label)).join(' ').trim();
  const clone = element.cloneNode(true); clone.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove()); return clone.textContent.replace(/\s+/g, ' ').trim();
}
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(patch = {}, { raw = false, omit = false } = {}) {
  const dna = { expSection: 'mutInquiry', traceTrait: trace, referenceNote };
  if (!omit) dna.mutInquiry = raw ? patch : { ...defaults, hypothesis: 'Keep my earlier hypothesis.', explanation: 'Keep my earlier explanation.', notes: extraNote, ...patch };
  outside.focus(); await act(async () => { root.render(h(Host, { seed: { dnaLab: mainLab, ecology: sibling, dna } })); });
  const library = query('.dna-reference-library'); library.open = true;
}
function dispatchValue(element, value) {
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value)); element.dispatchEvent(new Event('input', { bubbles: true }));
}
async function input(element, value) { expect(element).not.toBeNull(); await act(async () => { dispatchValue(element, value); }); }
async function activate(element) {
  expect(element).not.toBeNull(); expect(element).toBeDefined(); element.focus(); await act(async () => { element.click(); });
}
async function activateByKey(element, key) {
  expect(element.tagName).toBe('BUTTON'); element.focus(); await act(async () => {
    const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); element.dispatchEvent(down);
    if (key === 'Enter' && !down.defaultPrevented) element.click();
    element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
    if (key === ' ' && !down.defaultPrevented) element.click();
  });
}
async function patchInquiry(values) {
  await act(async () => { updateStore(prev => ({ ...prev, dna: { ...prev.dna, mutInquiry: { ...prev.dna.mutInquiry, ...values } } })); });
}
async function advance() { await act(async () => { vi.advanceTimersByTime(1000); }); }
function expectStatus(node) {
  expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status'); expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true');
}
function preserved() {
  expect(latest.dnaLab).toBe(mainLab); expect(latest.ecology).toBe(sibling); expect(latest.dna.traceTrait).toBe(trace); expect(latest.dna.referenceNote).toBe(referenceNote);
  if (state()?.notes) expect(state().notes).toBe(extraNote);
  expect(xp).not.toHaveBeenCalled(); for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-24T16:30:45.000Z')); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
  changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()]; vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation'; document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Mutation Inquiry native controls and readable scientific evidence', () => {
  it('renders defaults without creating saved state, moving focus or writing during idle time', async () => {
    await mount({}, { omit: true }); expect(inquiry()).not.toBeNull(); expect(state()).toBeUndefined(); expect(document.activeElement).toBe(outside);
    expect(range('mutRate').value).toBe('-7'); expect(range('popSize').value).toBe('6'); expect(range('generations').value).toBe('100'); expect(range('selection').value).toBe('0');
    expectStatus(result()); expect(result().textContent).toContain('Static'); expect(query('#dna-inquiry-log-status').textContent).toBe('');
    expect(changes).not.toHaveBeenCalled(); await advance(); expect(changes).not.toHaveBeenCalled(); expect(state()).toBeUndefined(); preserved();
  });

  it('merges sparse saved drafts for display without mutating them or dropping unknown fields on the first action', async () => {
    const sparse = Object.freeze({ hypothesis: 'An older saved draft.', notes: extraNote }); await mount(sparse, { raw: true });
    expect(state()).toBe(sparse); expect(query('#dna-inquiry-hypothesis').value).toBe('An older saved draft.'); expect(range('popSize').value).toBe('6');
    expect(changes).not.toHaveBeenCalled(); await advance(); expect(state()).toBe(sparse); expect(changes).not.toHaveBeenCalled();
    await input(range('generations'), 250); expect(state().generations).toBe(250); expect(state().hypothesis).toBe('An older saved draft.'); expect(state().notes).toBe(extraNote);
    await activate(query('#dna-inquiry-record')); expect(state().log).toHaveLength(1); preserved();
  });

  it('provides stable explicit range labels and actual-unit value text while retaining native bounds and transformations', async () => {
    await mount();
    const contracts = [
      ['mutRate', 'Mutation rate μ (log)', '-10', '-2', '0.5', -3, .001, /per base/i],
      ['popSize', 'Population size N (log)', '1', '10', '0.5', 3, 1000, /individual|organism|population/i],
      ['generations', 'Generations', '1', '10000', '1', 250, 250, /generation/i],
      ['selection', 'Selection coef s', '0', '0.5', '0.005', .025, .025, /selection|coefficient/i]
    ];
    for (const [key, label, min, max, step, value, stored, unit] of contracts) {
      const control = range(key); expect(control.tagName).toBe('INPUT'); expect(control.type).toBe('range'); expect(control.labels).toHaveLength(1);
      expect(control.labels[0].htmlFor).toBe(control.id); expect(nameOf(control)).toBe(label); expect(control.min).toBe(min); expect(control.max).toBe(max); expect(control.step).toBe(step);
      expect(control.parentElement.querySelector('output').getAttribute('aria-live')).toBe('off');
      expect(control.getAttribute('aria-valuetext')).toMatch(unit); const oldName = nameOf(control); control.focus(); await input(control, value);
      expect(nameOf(control)).toBe(oldName); expect(state()[key]).toBeCloseTo(stored, 12); expect(control.getAttribute('aria-valuetext')).toMatch(unit); expect(document.activeElement).toBe(control);
    }
    preserved();
  });

  it('associates visible reflection labels and preserves explanation drafts while the understood checkbox hides their panel', async () => {
    await mount(); const hypothesis = query('#dna-inquiry-hypothesis'), explanation = query('#dna-inquiry-explanation'), checkbox = query('#dna-inquiry-understood'), reflection = query('#dna-inquiry-explanation-panel');
    for (const [field, title] of [[hypothesis, 'Evolutionary fixation hypothesis'], [explanation, 'Evolutionary fixation explanation']]) {
      expect(field.tagName).toBe('TEXTAREA'); expect(field.labels).toHaveLength(1); expect(field.labels[0].htmlFor).toBe(field.id); expect(field.labels[0].textContent.trim()).toBe(title); expect(nameOf(field)).toBe(title);
    }
    expect(checkbox.type).toBe('checkbox'); expect(checkbox.labels.length).toBeGreaterThan(0); expect(checkbox.getAttribute('aria-controls')).toBe(reflection.id); expect(reflection.hidden).toBe(true);
    await input(hypothesis, 'Mutation supply may change the fixation estimate.'); await activate(checkbox); expect(reflection.hidden).toBe(false); expect(document.activeElement).toBe(checkbox);
    await input(explanation, 'Selection and population size alter the probability of fixation.'); await activate(checkbox); expect(reflection.hidden).toBe(true); expect(query('#dna-inquiry-explanation')).toBe(explanation);
    await activate(checkbox); expect(explanation.value).toBe('Selection and population size alter the probability of fixation.'); expect(state().hypothesis).toBe('Mutation supply may change the fixation estimate.'); preserved();
  });

  it('keeps the open-questions control mounted and focused with a truthful persistent disclosure', async () => {
    await mount(); const toggle = query('#dna-inquiry-questions-toggle'), questions = query('#dna-inquiry-questions');
    expect(toggle.tagName).toBe('BUTTON'); expect(toggle.type).toBe('button'); expect(toggle.getAttribute('aria-controls')).toBe(questions.id); expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(questions.hidden).toBe(true);
    await activateByKey(toggle, 'Enter'); expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(questions.hidden).toBe(false); expect(questions.querySelectorAll('li')).toHaveLength(4); expect(document.activeElement).toBe(toggle);
    expect(questions.textContent).toContain('1/(2N)'); await activateByKey(toggle, ' '); expect(questions.hidden).toBe(true); expect(query('#dna-inquiry-questions-toggle')).toBe(toggle); expect(query('#dna-inquiry-questions')).toBe(questions);
    expect(document.activeElement).toBe(toggle); expect(state().hypothesis).toBe('Keep my earlier hypothesis.'); preserved();
  });

  it('describes the current chart evidence and keeps the maximum population point inside the displayed x domain', async () => {
    await mount({ popSize: 1e10 }); const graph = inquiry().querySelector('svg[role="img"]'), description = query('#dna-inquiry-chart-description'), point = query('[data-dna-inquiry-point]');
    expect(nameOf(graph)).toBe('Population size and mutation rate chart comparing genetic drift and selection regimes.'); expect(graph.getAttribute('aria-describedby').split(/\s+/)).toContain(description.id);
    expect(description.textContent).toMatch(/population/i); expect(description.textContent).toMatch(/mutation/i); expect(description.textContent).toMatch(/[0-9]/); expect(description.textContent).toContain('Static');
    for (const example of ['human N = 1.0e+4, μ = 1.0e-8', 'bacterial N = 1.0e+9, μ = 1.0e-9', 'viral N = 1.0e+8, μ = 1.0e-5']) expect(description.textContent).toContain(example);
    const horizontalAxis = graph.querySelector('line[y1="130"][y2="130"]'), left = Number(horizontalAxis.getAttribute('x1')), right = Number(horizontalAxis.getAttribute('x2'));
    expect(parseFloat(point.getAttribute('cx'))).toBeCloseTo(right, 8); expect(parseFloat(point.getAttribute('cx'))).toBeLessThan(320); expect(graph.textContent).toContain('10^10');
    const previousPoint = point; await input(range('popSize'), 1); expect(query('[data-dna-inquiry-point]')).toBe(previousPoint); expect(parseFloat(point.getAttribute('cx'))).toBeCloseTo(left + (right - left) / 10, 8); preserved();
  });

  it('provides a named keyboard-scrollable log, announces additions and displays only the last five while retaining all records', async () => {
    await mount(); const scroll = query('#dna-inquiry-log'), heading = query('#dna-inquiry-log-heading'), live = query('#dna-inquiry-log-status');
    expect(scroll.getAttribute('role')).toBe('region'); expect(scroll.tabIndex).toBe(0); expect(scroll.getAttribute('aria-labelledby').split(/\s+/)).toContain(heading.id); expect(nameOf(scroll)).toBe(nameOf(heading)); expectStatus(live); expect(live.textContent).toBe('');
    scroll.focus(); expect(document.activeElement).toBe(scroll);
    for (let generation = 1; generation <= 7; generation++) { await input(range('generations'), generation); await activate(query('#dna-inquiry-record')); }
    expect(state().log).toHaveLength(7); expect(state().log.map(entry => entry.g)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const visibleRows = scroll.querySelectorAll('li'); expect(visibleRows).toHaveLength(5); expect(scroll.textContent).not.toContain('g1 '); expect(live.textContent).toContain('7');
    expect(query('#dna-inquiry-log-status')).toBe(live); expect(query('#dna-inquiry-log')).toBe(scroll); expect(document.activeElement).toBe(query('#dna-inquiry-record')); preserved();
  });

  it('updates the same polite model result through all five authored classifications', async () => {
    await mount({ mutRate: .001, popSize: 1000, generations: 1000, selection: 0 }); const live = result(); expectStatus(live);
    const cases = [
      [{ selection: 0, popSize: 1000 }, 'Static', '0.01'],
      [{ selection: .005, popSize: 1000 }, 'Drift-dominated', '0.10'],
      [{ selection: .05, popSize: 1000 }, 'Slow evolution', '0.95'],
      [{ selection: .05, popSize: 10000 }, 'Fast evolution', '10.00'],
      [{ selection: .05, popSize: 100000 }, 'Runaway adaptation', '100.00']
    ];
    for (const [values, label, fixed] of cases) { await patchInquiry(values); expect(result()).toBe(live); expect(live.textContent).toContain(label); expect(live.textContent).toContain(fixed); }
    expect(announce).not.toHaveBeenCalled(); preserved();
  });
});

describe('Mutation Inquiry scientific model and recorded evidence', () => {
  it.each(scientificCases)('preserves $name, its classification, and the original observation schema', async example => {
    await mount({ mutRate: example.mutRate, popSize: example.popSize, generations: example.generations, selection: example.selection });
    expect(result().textContent).toContain(example.state); expect(result().textContent).toContain(example.fix);
    const metric = key => inquiry().querySelector(`[data-dna-inquiry-metric="${key}"] dd`).textContent;
    expect(metric('fixProb')).toBe(example.percent);
    expect(metric('total')).toBe((example.mutRate * example.popSize * example.generations).toExponential(2));
    expect(metric('beneficial')).toBe((example.mutRate * example.popSize * example.generations * .01).toExponential(2));
    await activate(query('#dna-inquiry-record'));
    expect(state().log).toEqual([{ t: '16:30:45', mu: example.mutRate.toExponential(1), N: example.popSize.toExponential(1),
      g: example.generations, s: example.selection.toFixed(3), fix: example.fix, state: example.state }]);
    expect(state().selection).toBe(example.selection); expect(state().hypothesis).toBe('Keep my earlier hypothesis.'); preserved();
  });

  it('merges batched field edits and repeated records using the latest parameters and full saved history', async () => {
    const old = Object.freeze({ t: '12:00:00', mu: '1.0e-7', N: '1.0e+6', g: 100, s: '0.000', fix: '0.00', state: 'Static' });
    await mount({ log: [old] }); const record = query('#dna-inquiry-record');
    await act(async () => {
      dispatchValue(range('mutRate'), -3); dispatchValue(query('#dna-inquiry-hypothesis'), 'A fresh mutation-supply prediction.'); record.click();
      dispatchValue(range('popSize'), 3); record.click(); query('#dna-inquiry-understood').click();
      dispatchValue(query('#dna-inquiry-explanation'), 'A fresh explanation survives recording.'); dispatchValue(range('selection'), .05); record.click();
    });
    expect(state().mutRate).toBe(.001); expect(state().popSize).toBe(1000); expect(state().selection).toBe(.05); expect(state().hypothesis).toBe('A fresh mutation-supply prediction.');
    expect(state().understood).toBe(true); expect(state().explanation).toBe('A fresh explanation survives recording.'); expect(state().log).toHaveLength(4); expect(state().log[0]).toBe(old);
    expect(state().log.slice(1).map(entry => [entry.mu, entry.N, entry.s, entry.fix])).toEqual([
      ['1.0e-3', '1.0e+6', '0.000', '0.00'], ['1.0e-3', '1.0e+3', '0.000', '0.00'], ['1.0e-3', '1.0e+3', '0.050', '0.10']
    ]);
    expect(query('#dna-inquiry-log-status').textContent).toContain('4'); preserved();
  });

  it('resets only the four numerical parameters while retaining reflections, disclosures, extra fields and complete log', async () => {
    const log = [{ t: '12:00:00', mu: '1.0e-3', N: '1.0e+3', g: 1000, s: '0.050', fix: '0.95', state: 'Slow evolution' }];
    await mount({ mutRate: .001, popSize: 1000, generations: 1000, selection: .05, log, stuckRevealed: true, understood: true });
    const before = state(), reset = query('#dna-inquiry-reset'), live = query('#dna-inquiry-log-status'); await activate(reset);
    expect(state()).toEqual({ ...before, mutRate: 1e-7, popSize: 1e6, generations: 100, selection: 0 }); expect(state().log).toBe(log); expect(document.activeElement).toBe(reset);
    expect(query('#dna-inquiry-questions').hidden).toBe(false); expect(query('#dna-inquiry-explanation-panel').hidden).toBe(false); expect(query('#dna-inquiry-log-status')).toBe(live); expect(result().textContent).toContain('Static'); preserved();
  });

  it('retains saved inputs and observations when the reference topic is hidden and restored without reinitializing work', async () => {
    await mount({ mutRate: .001, popSize: 1000, generations: 250, selection: .025, understood: true }); await activate(query('#dna-inquiry-record')); const before = state();
    await act(async () => { updateStore(prev => ({ ...prev, dna: { ...prev.dna, expSection: 'glossary' } })); }); expect(inquiry()).toBeNull();
    await act(async () => { updateStore(prev => ({ ...prev, dna: { ...prev.dna, expSection: 'mutInquiry' } })); }); expect(state()).toBe(before);
    expect(query('#dna-inquiry-hypothesis').value).toBe('Keep my earlier hypothesis.'); expect(query('#dna-inquiry-explanation').value).toBe('Keep my earlier explanation.');
    expect(range('popSize').value).toBe('3'); expect(state().log).toHaveLength(1); await advance(); expect(state()).toBe(before); preserved();
  });
});
