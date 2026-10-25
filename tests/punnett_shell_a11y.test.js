// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const evidence = Object.freeze({ prediction: 'Compare inherited alleles', observations: Object.freeze(['Keep my explanation']) });
const siblingDraft = Object.freeze({ draft: 'Keep the ecology investigation', revision: 13 });
const disclosures = [
  ['guide', 'punnett-guide-panel', 'Guide'],
  ['quest', 'punnett-quest-progress', 'Quests'],
  ['badges', 'punnett-badge-panel', 'Badges'],
  ['tutor', 'punnett-ai-panel', 'Tutor']
];
let config, root, host, outside, latest, setStore, changes, xp, toast, tts, imagen, announce, audio, gemini, provider;
let snapshots, snapshotSetter, navigate, remountOnMode, actDescriptor;
const query = selector => host.querySelector(selector);
const toggle = name => query('#punnett-' + name + '-toggle');
const panel = id => query('#' + id);
const shell = name => query('[data-punnett-shell="' + name + '"]');
const question = () => query('#punnett-tutor-question');
const response = () => query('#punnett-tutor-response');
const tutorStatus = () => query('#punnett-tutor-status');
function nameOf(element) {
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/)
    .map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
  const copy = element.cloneNode(true);
  copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim();
}
function buttonNamed(scope, text) {
  return [...scope.querySelectorAll('button')].find(button => nameOf(button).includes(text));
}
const ask = () => query('#punnett-tutor-ask');
const stop = () => query('#punnett-tutor-stop');
function initial(patch = {}) {
  return { siblingTool: siblingDraft, punnett: {
    subtool: 'learn', _visited: { learn: true }, inheritMode: 'complete',
    parent1: ['A', 'a'], parent2: ['a', 'a'], researchPoints: 17, learningEvidence: evidence,
    _showLabGuide: false, _showQuestProgress: false, _showBadgePanel: false, _showAI: false,
    _badges: {}, _completedChallenges: {}, _aiQuestion: '', _aiLoading: false, _aiResponse: '',
    popRunning: false, ...patch
  } };
}
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; setStore = update;
  const setToolData = React.useCallback(arg => {
    changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg);
  }, []);
  const view = config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, addToast: toast,
    announceToSR: announce, callGemini: provider, callTTS: tts, callImagen: imagen,
    setToolSnapshots: snapshotSetter, setStemLabTool: navigate, gradeLevel: '8th Grade' }));
  return remountOnMode ? React.cloneElement(view, { key: store.punnett.subtool }) : view;
}
async function mount(patch = {}, options = {}) {
  remountOnMode = !!options.remountOnMode;
  await act(async () => { outside.focus(); root.render(h(Host, { seed: initial(patch) })); });
}
async function commit(patch) {
  await act(async () => { setStore(prev => ({ ...prev, punnett: { ...prev.punnett, ...patch } })); });
}
async function activate(element) {
  expect(element).toBeDefined(); expect(element).not.toBeNull();
  await act(async () => { element.focus(); element.click(); });
}
async function input(element, value) {
  expect(element).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function key(element, keyValue, extra = {}) {
  const event = new KeyboardEvent('keydown', { key: keyValue, bubbles: true, cancelable: true, ...extra });
  await act(async () => { element.dispatchEvent(event); });
  return event;
}
async function advance(milliseconds = 0) {
  await act(async () => { vi.advanceTimersByTime(milliseconds); });
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function settle(callback) {
  await act(async () => { callback(); await Promise.resolve(); await Promise.resolve(); });
}
function preserved() {
  expect(latest.siblingTool).toBe(siblingDraft);
  expect(latest.punnett.learningEvidence).toBe(evidence);
  expect(evidence.observations).toEqual(['Keep my explanation']);
  expect(latest.punnett.parent1).toEqual(['A', 'a']);
  expect(latest.punnett.parent2).toEqual(['a', 'a']);
}
function noTutorSideEffects() {
  expect(tts).not.toHaveBeenCalled(); expect(imagen).not.toHaveBeenCalled();
  expect(xp).not.toHaveBeenCalled(); expect(snapshotSetter).not.toHaveBeenCalled();
}
function expectTutorSemantics() {
  const status = tutorStatus(), output = response(), field = question();
  expect(field.tagName).toBe('INPUT'); expect(field.labels).toHaveLength(1);
  expect(field.labels[0].htmlFor).toBe(field.id);
  expect(field.labels[0].textContent.trim()).toBe('Ask the genetics tutor');
  expect(field.hasAttribute('aria-label')).toBe(false);
  expect(status.getAttribute('role')).toBe('status');
  expect(status.getAttribute('aria-live')).toBe('polite');
  expect(status.getAttribute('aria-atomic')).toBe('true');
  expect(output.getAttribute('role')).toBe('region');
  expect(ask().getAttribute('aria-controls')).toBe(output.id);
  expect(nameOf(output)).toBe('Tutor response');
}
beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; vi.useFakeTimers();
  const registry = resetStemLab(); audio = vi.fn(() => null); registry.audioContext = audio;
  config = loadTool('stem_lab/stem_tool_punnett.js', 'punnett');
  changes = vi.fn(); xp = vi.fn(); toast = vi.fn(); tts = vi.fn(); imagen = vi.fn(); announce = vi.fn();
  gemini = vi.fn(); provider = gemini; navigate = vi.fn(); snapshots = [];
  snapshotSetter = vi.fn(updater => { snapshots = typeof updater === 'function' ? updater(snapshots) : updater; });
  outside = document.createElement('button'); outside.textContent = 'Host navigation';
  host = document.createElement('div'); document.body.append(outside, host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    root = null; host = null; setStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Punnett shared shell disclosures, progress and navigation', () => {
  it('uses distinct visible disclosure names and stable hidden targets without invoking services or awarding progress', async () => {
    await mount();
    for (const [kind, id, text] of disclosures) {
      const control = toggle(kind), target = panel(id);
      expect(control.tagName).toBe('BUTTON'); expect(nameOf(control)).toContain(text);
      expect(control.hasAttribute('aria-pressed')).toBe(false);
      expect(control.getAttribute('aria-controls')).toBe(id); expect(control.getAttribute('aria-expanded')).toBe('false');
      expect(target).not.toBeNull(); expect(target.hidden).toBe(true);
      await activate(control); expect(control.getAttribute('aria-expanded')).toBe('true');
      expect(target.hidden).toBe(false); expect(document.activeElement).toBe(control);
      await activate(control); expect(target.hidden).toBe(true); expect(panel(id)).toBe(target);
    }
    const restored = { _showLabGuide: 'false', _showQuestProgress: 'false', _showBadgePanel: 'false', _showAI: 'false' };
    await commit(restored);
    for (const [kind, id] of disclosures) { expect(toggle(kind).getAttribute('aria-expanded')).toBe('true'); expect(panel(id).hidden).toBe(false); }
    for (const [key, value] of Object.entries(restored)) expect(latest.punnett[key]).toBe(value);
    for (const name of ['header', 'guide', 'quest', 'hero', 'badges', 'tutor', 'footer']) expect(shell(name)).not.toBeNull();
    expect(gemini).not.toHaveBeenCalled(); expect(audio).not.toHaveBeenCalled();
    expect(latest.punnett.researchPoints).toBe(17); noTutorSideEffects(); preserved();
  });

  it('closes Guide back to its invoking control while retaining independently expanded panels', async () => {
    await mount(); await activate(toggle('quest')); await activate(toggle('guide'));
    const guide = panel('punnett-guide-panel'), close = buttonNamed(guide, 'Close');
    await activate(close);
    expect(guide.hidden).toBe(true); expect(document.activeElement).toBe(toggle('guide'));
    expect(toggle('guide').getAttribute('aria-expanded')).toBe('false');
    expect(panel('punnett-quest-progress').hidden).toBe(false);
    expect(toggle('quest').getAttribute('aria-expanded')).toBe('true');
    expect(gemini).not.toHaveBeenCalled(); noTutorSideEffects(); preserved();
  });

  it('hands Guide route focus to the destination activity through a real host component remount', async () => {
    await mount({}, { remountOnMode: true });
    for (const [title, target] of [['Predict Traits', 'cross'], ['Trace Families', 'pedigree'], ['Model Populations', 'population'], ['Translate DNA', 'dna2protein']]) {
      if (!latest.punnett._showLabGuide) await activate(toggle('guide'));
      await activate(buttonNamed(panel('punnett-guide-panel'), title)); await advance(0);
      expect(latest.punnett.subtool).toBe(target);
      const destination = query('#punnett-activity-' + target);
      expect(destination.getAttribute('aria-current')).toBe('page'); expect(document.activeElement).toBe(destination);
      preserved();
    }
    expect(announce).toHaveBeenCalled(); expect(gemini).not.toHaveBeenCalled();
    expect(tts).not.toHaveBeenCalled(); expect(imagen).not.toHaveBeenCalled();
  });

  it('shows earned and unearned badge states with their criteria while opening the panel earns nothing', async () => {
    await mount({ _badges: { firstCross: true } }); await activate(toggle('badges'));
    const badgePanel = panel('punnett-badge-panel');
    const cardWith = title => [...badgePanel.querySelectorAll('div,article,li')].filter(node =>
      [...node.children].some(child => child.textContent.trim() === title)).sort((a, b) => a.textContent.length - b.textContent.length)[0];
    const earned = cardWith('First Cross'), locked = cardWith('Geneticist');
    expect(earned).toBeDefined(); expect(locked).toBeDefined();
    expect(earned.textContent).toMatch(/Earned/); expect(earned.textContent).toContain('Complete your first Punnett cross');
    expect(locked.textContent).toContain('Not yet earned'); expect(locked.textContent).toContain('Complete 10 crosses');
    expect(latest.punnett._badges).toEqual({ firstCross: true }); expect(latest.punnett.researchPoints).toBe(17);
    expect(xp).not.toHaveBeenCalled(); expect(gemini).not.toHaveBeenCalled(); preserved();
  });

  it('retains the existing single Snapshot write and DNA Lab navigation behavior', async () => {
    await mount({ _aiQuestion: 'Keep this draft.' });
    await activate(buttonNamed(shell('footer'), 'Snapshot'));
    expect(snapshotSetter).toHaveBeenCalledTimes(1); expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ tool: 'punnett', label: 'Learn', data: { _aiQuestion: 'Keep this draft.', learningEvidence: evidence } });
    expect(toast).toHaveBeenCalledTimes(1); expect(toast.mock.calls[0][0]).toContain('Snapshot saved');
    expect(announce).not.toHaveBeenCalled(); expect(gemini).not.toHaveBeenCalled();
    await activate(buttonNamed(shell('footer'), 'DNA Lab'));
    expect(navigate).toHaveBeenCalledTimes(1); expect(navigate).toHaveBeenCalledWith('dnaLab');
    expect(announce).toHaveBeenCalledTimes(1); expect(announce.mock.calls[0][0]).toContain('Opening DNA Lab');
    expect(tts).not.toHaveBeenCalled(); expect(imagen).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); preserved();
  });
});

describe('Punnett Tutor request lifecycle and accessible feedback', () => {
  it('provides a persistent native label and live status, rejecting blank and composing Enter without a request', async () => {
    await mount(); await activate(toggle('tutor')); expectTutorSemantics();
    expect(response().hidden).toBe(true); expect(ask().disabled).toBe(true); expect(stop().hidden).toBe(true);
    const stableStatus = tutorStatus(), stableResponse = response();
    await input(question(), '   '); await key(question(), 'Enter');
    await input(question(), 'What is an allele?'); await key(question(), 'Enter', { isComposing: true });
    await key(question(), 'Enter', { keyCode: 229 });
    expect(gemini).not.toHaveBeenCalled(); expect(latest.punnett._aiLoading).toBe(false);
    expect(tutorStatus()).toBe(stableStatus); expect(response()).toBe(stableResponse);
    await activate(toggle('tutor')); expect(panel('punnett-ai-panel').hidden).toBe(true);
    await activate(toggle('tutor')); expect(question().value).toBe('What is an allele?');
    noTutorSideEffects(); preserved();
  });

  it('submits only the explicit request, exposes loading and then renders the provider text as a named response', async () => {
    const pending = deferred(); gemini.mockReturnValue(pending.promise);
    await mount({ _showAI: true }); expectTutorSemantics();
    await input(question(), 'How do recessive alleles work?'); const field = question(), stableOutput = response();
    await activate(ask()); expect(gemini).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(field);
    const [prompt, ...argumentsAfterPrompt] = gemini.mock.calls[0];
    expect(prompt).toContain('friendly genetics tutor'); expect(prompt).toContain('"learn"');
    expect(prompt).toContain('How do recessive alleles work?'); expect(prompt).toContain('under 150 words');
    expect(argumentsAfterPrompt).toEqual([false, false, 0.7]);
    expect(latest.punnett._aiLoading).toBe(true); expect(latest.punnett._aiRequestId).toBeTruthy();
    expect(response().getAttribute('aria-busy')).toBe('true'); expect(ask().disabled).toBe(true);
    expect(nameOf(stop())).toContain('Stop waiting'); expect(stop().hidden).toBe(false); expect(tutorStatus().textContent).toMatch(/thinking|loading|waiting|asking/i);
    const focusedStop = stop(); await act(async () => { focusedStop.focus(); });
    const answer = 'A recessive phenotype can require two copies.\n<img src=x onerror=alert(1)>';
    await settle(() => pending.resolve(answer));
    expect(latest.punnett._aiLoading).toBe(false); expect(latest.punnett._aiResponse).toBe(answer);
    expect(response()).toBe(stableOutput); expect(response().hidden).toBe(false);
    expect(response().getAttribute('aria-busy')).toBe('false'); expect(response().textContent).toContain(answer);
    expect(response().querySelector('img')).toBeNull(); expect(tutorStatus().textContent).toMatch(/ready|received|available/i);
    expect(document.activeElement).toBe(focusedStop); expect(focusedStop.hidden).toBe(false);
    expect(focusedStop.getAttribute('aria-disabled')).toBe('true');
    const readyStatus = tutorStatus().textContent;
    await activate(focusedStop);
    expect(document.activeElement).toBe(focusedStop); expect(tutorStatus().textContent).toBe(readyStatus);
    expect(latest.punnett._aiResponse).toBe(answer);
    await act(async () => { field.focus(); });
    expect(document.activeElement).toBe(field); expect(stop()).toBe(focusedStop); expect(focusedStop.hidden).toBe(true);
    expect(field.value).toBe('How do recessive alleles work?'); noTutorSideEffects(); preserved();
  });
});


describe('Punnett Tutor duplicate, failure, remount and recovery regressions', () => {
  it('deduplicates repeated Ask clicks and Enter presses before and after a loading render', async () => {
    const pending = deferred(); gemini.mockReturnValue(pending.promise);
    await mount({ _showAI: true, _aiQuestion: 'Explain a test cross.' });
    const submit = ask(), field = question();
    await act(async () => {
      submit.focus(); submit.click(); submit.click();
      field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(gemini).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(field); const id = latest.punnett._aiRequestId;
    await key(question(), 'Enter'); await key(question(), 'Enter');
    expect(gemini).toHaveBeenCalledTimes(1); expect(latest.punnett._aiRequestId).toBe(id);
    await settle(() => pending.resolve('A test cross compares offspring with a recessive parent.'));
    expect(latest.punnett._aiLoading).toBe(false); noTutorSideEffects(); preserved();
  });

  it('handles an unavailable provider without losing the draft or entering a stuck loading state', async () => {
    provider = null;
    await mount({ _showAI: true, _aiQuestion: 'Keep this question while offline.' });
    await activate(ask());
    expect(latest.punnett._aiLoading).toBe(false); expect(latest.punnett._aiRequestId).toBeFalsy();
    expect(question().value).toBe('Keep this question while offline.');
    expect(tutorStatus().textContent).toMatch(/not available|unavailable|cannot|could not|error|unable/i);
    expect(gemini).not.toHaveBeenCalled(); noTutorSideEffects(); preserved();
  });

  it('recovers from a synchronous provider throw and a rejected promise without leaking loading or awarding anything', async () => {
    const failed = deferred();
    gemini.mockImplementationOnce(() => { throw new Error('synchronous connection failure'); })
      .mockReturnValueOnce(failed.promise);
    await mount({ _showAI: true, _aiQuestion: 'Why are alleles paired?' });
    await activate(ask()); await settle(() => {});
    expect(latest.punnett._aiLoading).toBe(false);
    expect(tutorStatus().textContent).toMatch(/not available|unavailable|cannot|could not|error|unable/i);
    expect(question().value).toBe('Why are alleles paired?');
    await activate(ask()); expect(latest.punnett._aiLoading).toBe(true); expect(gemini).toHaveBeenCalledTimes(2);
    await settle(() => failed.reject(new Error('offline')));
    expect(latest.punnett._aiLoading).toBe(false); expect(ask().disabled).toBe(false);
    expect(tutorStatus().textContent).toMatch(/not available|unavailable|cannot|could not|error|unable/i);
    expect(question().value).toBe('Why are alleles paired?'); noTutorSideEffects(); preserved();
  });

  it('normalizes a synchronous string provider through the same successful response lifecycle', async () => {
    gemini.mockReturnValue('A genotype describes the alleles carried at a locus.');
    await mount({ _showAI: true, _aiQuestion: 'What is a genotype?' });
    await key(question(), 'Enter'); await settle(() => {});
    expect(gemini).toHaveBeenCalledTimes(1); expect(latest.punnett._aiLoading).toBe(false);
    expect(latest.punnett._aiResponse).toBe('A genotype describes the alleles carried at a locus.');
    expect(response().hidden).toBe(false); expect(response().textContent).toContain('alleles carried at a locus');
    expect(tutorStatus().textContent).toMatch(/ready|received|available/i);
    noTutorSideEffects(); preserved();
  });

  it('finishes a pending request across a real host remount while preserving newer learning fields', async () => {
    const pending = deferred(); gemini.mockReturnValue(pending.promise);
    await mount({ _showAI: true, _aiQuestion: 'How does a pedigree help?' }, { remountOnMode: true });
    await activate(ask()); const id = latest.punnett._aiRequestId, oldQuestion = question();
    await commit({ subtool: 'traits', laterObservation: 'The complex trait needs more evidence.' });
    expect(oldQuestion.isConnected).toBe(false); expect(latest.punnett._aiLoading).toBe(true);
    expect(latest.punnett._aiRequestId).toBe(id); expect(gemini).toHaveBeenCalledTimes(1);
    await settle(() => pending.resolve('A pedigree organizes family evidence across generations.'));
    expect(latest.punnett._aiLoading).toBe(false);
    expect(response().textContent).toContain('family evidence across generations');
    expect(latest.punnett.subtool).toBe('traits');
    expect(latest.punnett.laterObservation).toBe('The complex trait needs more evidence.');
    expect(question().value).toBe('How does a pedigree help?');
    noTutorSideEffects(); preserved();
  });

  it('stops waiting without erasing the draft and rejects an older completion after a newer request starts', async () => {
    const old = deferred(), current = deferred();
    gemini.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await mount({ _showAI: true, _aiQuestion: 'First question about alleles.' });
    await activate(ask()); const firstId = latest.punnett._aiRequestId;
    await activate(stop());
    expect(latest.punnett._aiLoading).toBe(false); expect(latest.punnett._aiRequestId).toBeFalsy();
    expect(question().value).toBe('First question about alleles.'); expect(tutorStatus().textContent).toMatch(/stopp|cancel/i);
    await input(question(), 'Second question about inheritance.'); await activate(ask());
    const currentId = latest.punnett._aiRequestId;
    expect(currentId).toBeTruthy(); expect(currentId).not.toBe(firstId); expect(gemini).toHaveBeenCalledTimes(2);
    const currentStop = stop(); await act(async () => { currentStop.focus(); });
    await settle(() => old.resolve('OLD RESULT MUST NOT REPLACE THE CURRENT REQUEST'));
    expect(latest.punnett._aiLoading).toBe(true); expect(latest.punnett._aiRequestId).toBe(currentId);
    expect(latest.punnett._aiResponse).not.toContain('OLD RESULT'); expect(document.activeElement).toBe(currentStop);
    expect(response().textContent).not.toContain('OLD RESULT');
    await settle(() => current.resolve('The current response explains inheritance.'));
    expect(latest.punnett._aiLoading).toBe(false); expect(latest.punnett._aiResponse).toBe('The current response explains inheritance.');
    expect(question().value).toBe('Second question about inheritance.'); noTutorSideEffects(); preserved();
  });

  it('recovers a hydrated loading state through Stop waiting without making an automatic network request', async () => {
    const pending = deferred(); gemini.mockReturnValue(pending.promise);
    await mount({ _showAI: true, _aiQuestion: 'A saved tutor question.', _aiLoading: true, _aiRequestId: 'saved-orphan-request' });
    expect(gemini).not.toHaveBeenCalled(); expect(ask().disabled).toBe(true); expect(stop()).toBeDefined();
    expect(response().getAttribute('aria-busy')).toBe('true');
    await activate(stop());
    expect(latest.punnett._aiLoading).toBe(false); expect(latest.punnett._aiRequestId).toBeFalsy();
    expect(question().value).toBe('A saved tutor question.'); expect(tutorStatus().textContent).toMatch(/stopp|cancel/i);
    await activate(ask()); expect(gemini).toHaveBeenCalledTimes(1);
    expect(latest.punnett._aiRequestId).not.toBe('saved-orphan-request');
    await settle(() => pending.resolve('The saved question now has a current response.'));
    expect(latest.punnett._aiLoading).toBe(false); expect(response().textContent).toContain('current response');
    noTutorSideEffects(); preserved();
  });
});

