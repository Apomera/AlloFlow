// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const evidence = Object.freeze({ prediction: 'Compare inheritance evidence', observations: Object.freeze(['Keep this field note']) });
const siblingDraft = Object.freeze({ draft: 'An unfinished ecology observation', revision: 11 });
let config, root, host, outside, latest, setStore, changes, xp, toast, tts, ai, announce, audio, actDescriptor, remountOnMode, gradeLevel;
const query = selector => host.querySelector(selector);
const activity = mode => query(`[data-punnett-activity="${mode}"]`);
const buttons = mode => [...activity(mode).querySelectorAll('button')];
function nameOf(element) {
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
  const copy = element.cloneNode(true); copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim();
}
const buttonNamed = (mode, text) => buttons(mode).find(button => nameOf(button).includes(text));
const callsFor = id => xp.mock.calls.filter(call => call[0] === id);
function discovery(patch = {}) { return { p: 50, selection: 0, mutation: 0, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [], ...patch }; }
function initial(mode, patch = {}) {
  return { siblingTool: siblingDraft, punnett: {
    subtool: mode, _visited: { [mode]: true }, parent1: ['A', 'a'], parent2: ['a', 'a'], inheritMode: 'complete',
    researchPoints: 17, learningEvidence: evidence, _learnTopic: -1, _traitFilter: 'all', _traitSelected: -1,
    popFreqA: .6, popSize: 200, popGens: 10, popSelection: 0, popMutation: 0, popDrift: false, popRunning: false, popHistory: null,
    _pedPreset: 0, _pedSolveMode: false, _pedShowGeno: true, _pedSolveAnswer: '', _pedSolveFeedback: null,
    freqDyn: discovery(), ...patch
  } };
}
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; setStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  const view = config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, addToast: toast, announceToSR: announce,
    callTTS: tts, callGemini: ai[0], callImagen: ai[1], gradeLevel }));
  // The real host recreates the plugin fiber on a subtool switch. Use it for navigation/cleanup cases.
  return remountOnMode ? React.cloneElement(view, { key: store.punnett.subtool }) : view;
}
async function mount(mode, patch = {}, options = {}) {
  remountOnMode = !!options.remountOnMode; gradeLevel = options.gradeLevel || '5th Grade';
  outside.focus(); await act(async () => { root.render(h(Host, { seed: initial(mode, patch) })); });
}
async function commit(patch) { await act(async () => { setStore(prev => ({ ...prev, punnett: { ...prev.punnett, ...patch } })); }); }
async function activate(element) { expect(element).toBeDefined(); expect(element).not.toBeNull(); element.focus(); await act(async () => { element.click(); }); }
async function input(element, value) {
  expect(element).not.toBeNull();
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value)); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function advance(milliseconds) { await act(async () => { vi.advanceTimersByTime(milliseconds); }); }
function preserved() {
  expect(latest.siblingTool).toBe(siblingDraft); expect(latest.punnett.learningEvidence).toBe(evidence);
  expect(evidence.observations).toEqual(['Keep this field note']); expect(latest.punnett.parent1).toEqual(['A', 'a']); expect(latest.punnett.parent2).toEqual(['a', 'a']);
  for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function status(selector) { const node = query(selector); expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status'); return node; }
const runButton = () => buttons('population').find(button => /(?:Simulate|Resume|Pause)/.test(nameOf(button)));
const genoButton = () => buttons('pedigree').find(button => /(?:Show|Hide) Genotypes/.test(nameOf(button)));
const solveButton = () => buttons('pedigree').find(button => /Solve Mode/.test(nameOf(button)));

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); const registry = resetStemLab(); audio = vi.fn(() => null); registry.audioContext = audio;
  config = loadTool('stem_lab/stem_tool_punnett.js', 'punnett'); changes = vi.fn(); xp = vi.fn(); toast = vi.fn(); tts = vi.fn(); ai = [vi.fn(), vi.fn()]; announce = vi.fn();
  outside = document.createElement('button'); outside.textContent = 'Host navigation'; host = document.createElement('div'); document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally { host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; setStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT; }
});

describe('Remaining Punnett activity structure and learning navigation', () => {
  it('exposes each remaining activity while retaining the cross model, header scopes and saved learning', async () => {
    await mount('cross'); expect(activity('cross')).not.toBeNull();
    const ratio = [...activity('cross').querySelectorAll('p')].find(node => node.textContent.startsWith('Genotype Ratios:'));
    expect(ratio.textContent).toBe('Genotype Ratios: Aa: 2/4 | aa: 2/4');
    const cellGenotypes = [...activity('cross').querySelectorAll('td[aria-label]')].map(cell => cell.getAttribute('aria-label').match(/genotype ([^,]+)/)[1]);
    expect(cellGenotypes).toEqual(['Aa', 'Aa', 'aa', 'aa']);
    expect(activity('cross').querySelector('th[scope="col"]')).not.toBeNull(); expect(activity('cross').querySelector('th[scope="row"]')).not.toBeNull();
    for (const mode of ['pedigree', 'population', 'traits', 'learn', 'freqDyn']) { await commit({ subtool: mode }); expect(activity(mode)).not.toBeNull(); }
    expect(tts).not.toHaveBeenCalled(); preserved();
  });

  it('keeps every Learn disclosure panel addressable while opening and closing only the selected topic', async () => {
    await mount('learn'); const first = query('#punnett-learn-topic-0'), second = query('#punnett-learn-topic-1');
    const firstPanel = query('#punnett-learn-panel-0'), secondPanel = query('#punnett-learn-panel-1');
    for (const [button, panel] of [[first, firstPanel], [second, secondPanel]]) {
      expect(button.tagName).toBe('BUTTON'); expect(button.getAttribute('aria-controls')).toBe(panel.id); expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(panel.hidden).toBe(true); expect(panel.getAttribute('role')).toBe('region'); expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
    }
    await activate(first); expect(firstPanel.hidden).toBe(false); expect(first.getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement).toBe(first);
    await activate(second); expect(firstPanel.hidden).toBe(true); expect(secondPanel.hidden).toBe(false);
    await activate(second); expect(secondPanel.hidden).toBe(true); expect(query('#punnett-learn-panel-1')).toBe(secondPanel);
    expect(tts).not.toHaveBeenCalled(); preserved();
  });

  it('reads the visible grade-specific lesson only after a deliberate Read Aloud action', async () => {
    await mount('learn', {}, { gradeLevel: '8th Grade' }); const read = buttonNamed('learn', 'Read Aloud'); expect(read.disabled).toBe(true);
    await activate(query('#punnett-learn-topic-0')); const panel = query('#punnett-learn-panel-0');
    const lesson = [...panel.querySelectorAll('p')].find(node => node.textContent.includes('double-stranded polymer'));
    expect(lesson).toBeDefined(); expect(read.disabled).toBe(false); expect(tts).not.toHaveBeenCalled();
    await activate(read); expect(tts).toHaveBeenCalledTimes(1); expect(tts).toHaveBeenCalledWith(lesson.textContent);
    await activate(query('#punnett-learn-topic-0')); expect(read.disabled).toBe(true); expect(tts).toHaveBeenCalledTimes(1); preserved();
  });

  it('keeps Try names visible and hands focus to the destination activity even when the host remounts the tool', async () => {
    await mount('learn', {}, { remountOnMode: true });
    for (const [index, destination] of [[0, 'dna2protein'], [1, 'cross'], [2, 'pedigree'], [3, 'population']]) {
      if (latest.punnett.subtool !== 'learn') await commit({ subtool: 'learn' });
      await activate(query('#punnett-learn-topic-' + index));
      const panel = query('#punnett-learn-panel-' + index), button = [...panel.querySelectorAll('button')].find(node => node.textContent.includes('Try'));
      expect(button.hasAttribute('aria-label')).toBe(false); const expectedName = nameOf(button); expect(expectedName).toContain('Try');
      await activate(button); expect(latest.punnett.subtool).toBe(destination); await advance(0);
      const destinationButton = query('#punnett-activity-' + destination); expect(document.activeElement).toBe(destinationButton); expect(destinationButton.getAttribute('aria-current')).toBe('page');
    }
    expect(announce).toHaveBeenCalled(); expect(tts).not.toHaveBeenCalled(); preserved();
  });

  it('keeps trait detail IDs stable, preserves expansion across filtering, and retains complex-trait evidence', async () => {
    await mount('traits'); const button = query('#punnett-trait-button-0'), panel = query('#punnett-trait-detail-0');
    expect(panel.hidden).toBe(true); expect(button.getAttribute('aria-controls')).toBe(panel.id); expect(button.getAttribute('aria-expanded')).toBe('false');
    await activate(button); expect(panel.hidden).toBe(false); expect(panel.getAttribute('aria-labelledby')).toBe(button.id); expect(panel.textContent).toContain('Complex trait; do not infer a genotype');
    await activate(button); expect(panel.hidden).toBe(true); expect(query('#punnett-trait-detail-0')).toBe(panel);
    await activate(button); await activate(buttonNamed('traits', 'Dominant/Rec')); expect(query('#punnett-trait-button-0')).toBeNull();
    await activate(buttonNamed('traits', 'All Traits')); expect(query('#punnett-trait-button-0').getAttribute('aria-expanded')).toBe('true'); expect(query('#punnett-trait-detail-0').hidden).toBe(false); preserved();
  });
});

describe('Allele Discovery controls, prompts and saved inquiry', () => {
  it('labels the native ranges and announces each modeled classification without changing its math', async () => {
    await mount('freqDyn'); const live = status('#punnett-discovery-state'); expect(live.textContent).toMatch(/equilibrium/i); expect(live.textContent).not.toContain('Δp');
    for (const [id, min, max] of [['fd-p', '1', '99'], ['fd-selection', '-50', '50'], ['fd-mutation', '0', '20']]) {
      const range = query('#' + id); expect(range.type).toBe('range'); expect(range.min).toBe(min); expect(range.max).toBe(max); expect(range.labels).toHaveLength(1); expect(range.labels[0].htmlFor).toBe(id);
    }
    await input(query('#fd-selection'), 20); expect(live.textContent).toMatch(/strong selection/i); expect(activity('freqDyn').textContent).toMatch(/Δp\s*≈\s*10\.00%/);
    await input(query('#fd-selection'), 0); await input(query('#fd-mutation'), 20); expect(live.textContent).toMatch(/mutation-driven/i); expect(activity('freqDyn').textContent).toMatch(/Δp\s*≈\s*1\.00%/);
    await input(query('#fd-mutation'), 0); await input(query('#fd-p'), 60); await input(query('#fd-selection'), 1);
    expect(live.textContent).toMatch(/drift potential/i); expect(activity('freqDyn').textContent).toMatch(/Δp\s*≈\s*0\.60%/); expect(query('#punnett-discovery-state')).toBe(live);
    expect(tts).not.toHaveBeenCalled(); preserved();
  });

  it('gives both reflection fields persistent matching labels and keeps drafts when reflection is hidden or activities change', async () => {
    await mount('freqDyn'); const hypothesis = query('#punnett-discovery-hypothesis'), explanation = query('#punnett-discovery-explanation');
    for (const [element, name] of [[hypothesis, 'Allele frequency hypothesis'], [explanation, 'Explain allele selection and mutation']]) {
      expect(element.tagName).toBe('TEXTAREA'); expect(element.labels).toHaveLength(1); expect(element.labels[0].textContent.trim()).toBe(name); expect(nameOf(element)).toBe(name);
    }
    await input(hypothesis, 'Selection may offset mutation.'); const checkbox = activity('freqDyn').querySelector('input[type="checkbox"]'), reflection = query('#punnett-discovery-reflection');
    expect(checkbox.getAttribute('aria-controls')).toBe(reflection.id); expect(reflection.hidden).toBe(true);
    await activate(checkbox); expect(reflection.hidden).toBe(false); await input(explanation, 'The allele frequencies respond to both forces.');
    await activate(checkbox); expect(reflection.hidden).toBe(true); expect(query('#punnett-discovery-explanation')).toBe(explanation);
    await activate(checkbox); expect(explanation.value).toBe('The allele frequencies respond to both forces.');
    await commit({ subtool: 'learn' }); await commit({ subtool: 'freqDyn' });
    expect(query('#punnett-discovery-hypothesis').value).toBe('Selection may offset mutation.'); expect(query('#punnett-discovery-explanation').value).toBe('The allele frequencies respond to both forces.'); preserved();
  });

  it('reveals and hides prompts from a persistent disclosure without losing keyboard focus or the inquiry draft', async () => {
    await mount('freqDyn', { freqDyn: discovery({ hypothesis: 'Keep my question' }) });
    const toggle = query('[data-punnett-discovery-prompts]'), panel = query('#punnett-discovery-prompts');
    expect(toggle.tagName).toBe('BUTTON'); expect(toggle.getAttribute('aria-controls')).toBe(panel.id); expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(panel.hidden).toBe(true);
    await activate(toggle); expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(panel.hidden).toBe(false); expect(document.activeElement).toBe(toggle); expect(panel.querySelectorAll('li')).toHaveLength(3);
    await activate(toggle); expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(panel.hidden).toBe(true); expect(query('[data-punnett-discovery-prompts]')).toBe(toggle); expect(document.activeElement).toBe(toggle);
    expect(latest.punnett.freqDyn.hypothesis).toBe('Keep my question'); preserved();
  });

  it('logs the newest eight observations in a captioned keyboard-scrollable table and announces capped additions before Reset', async () => {
    await mount('freqDyn'); const live = status('#punnett-discovery-log-status');
    for (let p = 1; p <= 10; p++) { await input(query('#fd-p'), p); await activate(buttonNamed('freqDyn', 'Log')); }
    expect(latest.punnett.freqDyn.log).toHaveLength(8); expect(latest.punnett.freqDyn.log.map(row => row.p)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    const table = activity('freqDyn').querySelector('table'); expect(table.caption?.textContent.trim().length).toBeGreaterThan(0); expect(table.tBodies[0].rows).toHaveLength(8);
    for (const th of table.tHead.querySelectorAll('th')) expect(th.getAttribute('scope')).toBe('col');
    const scroller = table.closest('[tabindex="0"]'); expect(scroller).not.toBeNull(); scroller.focus(); expect(document.activeElement).toBe(scroller);
    expect(live.textContent).toMatch(/8/); const before = live.textContent; await activate(buttonNamed('freqDyn', 'Log')); expect(live.textContent).not.toBe(before); expect(latest.punnett.freqDyn.log).toHaveLength(8);
    await activate(buttonNamed('freqDyn', 'Reset')); expect(latest.punnett.freqDyn).toEqual(discovery()); expect(query('#punnett-discovery-log-status')).toBe(live); preserved();
  });
});

describe('Population pacing, accessible lifecycle and recorded generation data', () => {
  it('starts a fresh simulation once, keeps lifecycle status quiet during ticks, and pauses without discarding history', async () => {
    await mount('population'); const live = status('#punnett-population-status'); expect(nameOf(runButton())).toContain('Simulate');
    await activate(runButton()); expect(latest.punnett.popRunning).toBe(true); expect(latest.punnett.popHistory).toEqual([.6]); expect(nameOf(runButton())).toContain('Pause');
    expect(callsFor('popSim')).toEqual([['popSim', 10, 'Population Simulation']]); const runningStatus = live.textContent;
    await advance(150); expect(latest.punnett.popHistory).toEqual([.6, .6]); expect(live.textContent).toBe(runningStatus);
    await activate(runButton()); const paused = [...latest.punnett.popHistory]; expect(latest.punnett.popRunning).toBe(false); expect(nameOf(runButton())).toContain('Resume'); await advance(1000);
    expect(latest.punnett.popHistory).toEqual(paused); expect(query('#punnett-population-status')).toBe(live); preserved();
  });

  it('resumes saved history from its last p value with unchanged selection/mutation math and no new simulation award', async () => {
    await mount('population', { popFreqA: .1, popHistory: [.5, .6], popSelection: .2, popMutation: .001, _popSimDone: true }, { gradeLevel: '10th Grade' });
    expect(nameOf(runButton())).toContain('Resume'); await activate(runButton()); expect(latest.punnett.popHistory).toEqual([.5, .6]); expect(callsFor('popSim')).toEqual([]);
    await advance(150); expect(latest.punnett.popHistory).toHaveLength(3);
    // Independently derived from selection against aa (wAA=wAa=1, waa=.8), then symmetric mutation .001.
    expect(latest.punnett.popHistory[2]).toBeCloseTo(.6195950413223141, 12); expect(latest.punnett.popFreqA).toBe(.1);
    await activate(runButton()); await activate(runButton()); expect(callsFor('popSim')).toEqual([]); preserved();
  });

  it('auto-pauses on a real host subtool remount, cancels the pending tick, and returns ready to Resume', async () => {
    await mount('population', { popHistory: [.5, .55], popRunning: true, _popSimDone: true }, { remountOnMode: true });
    const original = [...latest.punnett.popHistory]; await commit({ subtool: 'learn' }); expect(latest.punnett.popRunning).toBe(false);
    await advance(1500); expect(latest.punnett.popHistory).toEqual(original); await commit({ subtool: 'population' }); expect(nameOf(runButton())).toContain('Resume');
    await advance(1500); expect(latest.punnett.popHistory).toEqual(original); expect(callsFor('popSim')).toEqual([]); preserved();
  });

  it('finishes at the requested generation, exposes every p/q record on demand, and starts a fresh run after completion', async () => {
    await mount('population', { popFreqA: .4, popGens: 10, popHistory: Array(10).fill(.6), _popSimDone: true });
    await activate(runButton()); await advance(150); expect(latest.punnett.popHistory).toHaveLength(11); expect(latest.punnett.popRunning).toBe(false); expect(nameOf(runButton())).toContain('Simulate');
    const disclosure = query('[data-punnett-population-data]'); expect(disclosure.tagName).toBe('DETAILS'); expect(disclosure.querySelector('summary').textContent).toContain('Recorded generation data');
    await activate(disclosure.querySelector('summary')); expect(disclosure.open).toBe(true); const table = disclosure.querySelector('table'); expect(table.caption.textContent).toBe('Allele frequencies by generation');
    expect(table.tBodies[0].rows).toHaveLength(11);
    [...table.tBodies[0].rows].forEach((row, generation) => { const cells = [...row.children]; expect(parseInt(cells[0].textContent, 10)).toBe(generation); expect(parseFloat(cells[1].textContent)).toBeCloseTo(.6, 4); expect(parseFloat(cells[2].textContent)).toBeCloseTo(.4, 4); });
    await activate(runButton()); expect(latest.punnett.popHistory).toEqual([.4]); expect(latest.punnett.popRunning).toBe(true); expect(callsFor('popSim')).toEqual([['popSim', 10, 'Population Simulation']]);
    await activate(buttonNamed('population', 'Reset')); expect(latest.punnett.popHistory).toBeNull(); expect(latest.punnett.popRunning).toBe(false); expect(nameOf(runButton())).toContain('Simulate'); preserved();
  });
});

describe('Pedigree solve-mode names, visibility and feedback', () => {
  it('exposes Solve Mode by its native visible name and truthfully disables genotype reveal during solving', async () => {
    await mount('pedigree'); const toggle = solveButton(); expect(toggle.hasAttribute('aria-label')).toBe(false); expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(nameOf(genoButton())).toContain('Hide Genotypes'); expect(genoButton().disabled).toBe(false);
    await activate(toggle); const genotypes = genoButton(); expect(toggle.getAttribute('aria-pressed')).toBe('true'); expect(genotypes.disabled).toBe(true); expect(genotypes.getAttribute('aria-pressed')).toBe('false'); expect(nameOf(genotypes)).toContain('Show Genotypes');
    expect(query('#punnett-pedigree-solve-note').textContent.trim().length).toBeGreaterThan(0); expect(activity('pedigree').querySelector('svg').textContent).not.toMatch(/\bAa\b|\baa\b/);
    const live = status('#punnett-pedigree-feedback'); expect(live.textContent).toBe(''); await activate(toggle); expect(genoButton().disabled).toBe(false); expect(nameOf(genoButton())).toContain('Hide Genotypes'); preserved();
  });

  it('renders persisted solve-mode genotype state consistently without revealing or enabling an answer hint', async () => {
    await mount('pedigree', { _pedSolveMode: true, _pedShowGeno: true });
    expect(genoButton().disabled).toBe(true); expect(genoButton().getAttribute('aria-pressed')).toBe('false'); expect(nameOf(genoButton())).toContain('Show Genotypes');
    expect(activity('pedigree').querySelector('svg').textContent).not.toMatch(/\bAa\b|\baa\b/); expect(activity('pedigree').querySelector('details').textContent).not.toContain('genotype '); preserved();
  });

  it('labels the answer group from its question, retains focus and feedback, and preserves the existing correct reward', async () => {
    await mount('pedigree', { _pedSolveMode: true, _pedShowGeno: false });
    const heading = query('#punnett-pedigree-question'), group = activity('pedigree').querySelector('[role="group"][aria-labelledby="punnett-pedigree-question"]');
    expect(heading).not.toBeNull(); expect(nameOf(group)).toBe(heading.textContent); const live = status('#punnett-pedigree-feedback');
    const answer = text => [...group.querySelectorAll('button')].find(button => nameOf(button) === text);
    const wrong = answer('Autosomal Recessive'); await activate(wrong); expect(live.textContent).toMatch(/Not quite/i); expect(document.activeElement).toBe(wrong); expect(callsFor('pedigreeSolve')).toEqual([]);
    const correct = answer('Autosomal Dominant'); await activate(correct); expect(live.textContent).toMatch(/Correct!/); expect(document.activeElement).toBe(correct); expect(latest.punnett._pedigreeSolved).toBe(true);
    expect(callsFor('pedigreeSolve')).toEqual([['pedigreeSolve', 20, 'Pedigree Analysis']]); expect(query('#punnett-pedigree-feedback')).toBe(live);
    const preset = buttons('pedigree').find(button => nameOf(button) === 'Autosomal Recessive' && !group.contains(button)); await activate(preset); expect(latest.punnett._pedSolveAnswer).toBe(''); expect(live.textContent).toBe(''); preserved();
  });
});
