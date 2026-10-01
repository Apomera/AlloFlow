import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act;
const control = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const previousActSetting = globalThis.IS_REACT_ACT_ENVIRONMENT;
let config;
let mounted;

function trial(id, extra = {}) {
  return { id, control: { ...control }, conditions: { ...control, oxygen: 0 }, prediction: 'lower',
    hypothesis: 'Original reasoning ' + id, explanation: 'My explanation ' + id, ...extra };
}
function fixture(extra = {}) {
  return {
    tab: 'growthLab', showMicroLibrary: false, selectedBacterium: 'ecoli', selectedVirus: 'covid',
    selectedScope: 'lightbright', selectedMicrobiome: 'gut', selectedFerment: 'sourdough', selectedCase: 'snow',
    scopeOrganism: 'ecoli', magnification: 400, microscopeFocus: 10, microscopeTargetFocus: 50,
    gramStep: 0, quizIdx: 0, quizAnswers: [], quizSubmitted: false, quizCorrect: 0,
    growthLab: { profile: 'thermus', tempC: 65, pH: 7.5, oxygen: 25, hypothesis: 'Legacy draft',
      stuckRevealed: true, understood: true, explanation: 'Legacy explanation', log: [{ old: true }], legacyExtra: { kept: true } },
    growthReviewHour: 6, earnedXP: 17, microscopeSeenSlides: ['ecoli'], legacyRoot: { keep: ['literal'] },
    growthInvestigation: { control: { profile: 'yeast', tempC: 25, pH: 6, oxygen: 35 },
      trials: [trial(4, { customTrialField: { keep: true } }), trial(9, { conditions: { ...control, tempC: 30 }, citedHours: [2] })],
      selectedId: 4, nextId: 10, prediction: 'higher', hypothesis: 'Next-run draft', explanation: 'Notebook draft',
      sweepVariable: 'tempC', sweep: { variable: 'tempC', conditions: { ...control } },
      previousSweep: { variable: 'pH', conditions: { ...control } },
      removed: { index: 1, trial: trial(7, { citedHours: [3], explanation: 'Removed explanation' }) },
      customNotebookField: { intact: ['unknown', 5] } },
    ...extra
  };
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
  vi.useFakeTimers();
});
afterEach(() => {
  if (mounted) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActSetting;
});
function mount(seed = fixture()) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: seed });
    view.state = data.microbiology;
    view.setData = setData;
    return config.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
  }
  mounted = view;
  act(() => view.root.render(React.createElement(Host)));
  return view;
}
function node(selector) { return mounted.container.querySelector(selector); }
function click(selectorOrNode) {
  const target = typeof selectorOrNode === 'string' ? node(selectorOrNode) : selectorOrNode;
  expect(target).toBeTruthy();
  act(() => target.click());
}
function button(label) {
  const result = [...mounted.container.querySelectorAll('button')].find(item => item.textContent.trim() === label);
  expect(result, label).toBeTruthy();
  return result;
}
function write(selector, value) {
  const target = node(selector);
  expect(target, selector).toBeTruthy();
  const prototype = target.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLTextAreaElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(target, String(value));
    target.dispatchEvent(new Event(target.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
function focus(selector) { act(() => node(selector).focus()); }
function flush() { act(() => vi.runOnlyPendingTimers()); }
function book() { return window.__MicrobiologyCore.growth.normalizeNotebook(mounted.state.growthInvestigation); }
function values(selector) {
  return Object.fromEntries([...node(selector).querySelectorAll('[data-evidence-value]')].map(item => [item.dataset.evidenceValue, item.textContent]));
}
function keyboardActivate(target) {
  // JSDOM has no native Enter-to-click default action; reproduce that final activation explicitly.
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    target.click();
    target.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  });
}

describe('Growth evidence citations beside a saved explanation', { timeout: 30000 }, () => {
  it('uses saved snapshots and the shared inspection hour while original prediction feedback remains at hour 24', () => {
    mount();
    const originalState = JSON.parse(JSON.stringify(mounted.state));
    const predictionFeedback = node('.micro-growth-result-head').textContent;
    const metrics = node('.micro-growth-metrics').textContent;
    const evidence = window.__MicrobiologyCore.growth.evidenceAt(book().trials[0], 6);
    const preview = values('#gl-evidence-preview');
    expect(Number(preview.control)).toBeCloseTo(evidence.controlPopulation, 3);
    expect(Number(preview.trial)).toBeCloseTo(evidence.trialPopulation, 3);
    expect(Number(preview.difference)).toBeCloseTo(evidence.difference, 3);
    expect(node('[data-growth-citations]').textContent).toContain('37 °C');
    expect(node('[data-growth-citations]').textContent).not.toContain('65 °C');
    expect(node('label[for="gl-evidence-hour"]').textContent).toBe('Model hour to cite');
    expect(node('#gl-evidence-hour').getAttribute('aria-describedby')).toBe('gl-evidence-help');
    expect(node('#gl-evidence-help').textContent).toContain('arbitrary population units');
    write('#gl-evidence-hour', 12);
    expect(node('#gl-review-hour').value).toBe('12');
    expect(node('#gl-evidence-preview').dataset.evidenceHour).toBe('12');
    write('#gl-review-hour', 4);
    expect(node('#gl-evidence-hour').value).toBe('4');
    expect(node('.micro-growth-result-head').textContent).toBe(predictionFeedback);
    expect(node('.micro-growth-metrics').textContent).toBe(metrics);
    expect(mounted.state).toEqual({ ...originalState, growthReviewHour: 4 });
  });

  it('keeps keyboard focus and exact raw drafts, recovery, sweep and unknown fields when pinning a model hour', () => {
    mount();
    const before = JSON.parse(JSON.stringify(mounted.state));
    const random = vi.spyOn(Math, 'random');
    const pin = node('#gl-evidence-pin');
    focus('#gl-evidence-pin');
    keyboardActivate(pin);
    const expected = JSON.parse(JSON.stringify(before));
    expected.growthInvestigation.trials[0].citedHours = [6];
    expect(mounted.state).toEqual(expected);
    expect(node('#gl-evidence-pin')).toBe(pin);
    expect(document.activeElement).toBe(pin);
    expect(node('#gl-evidence-pin').getAttribute('aria-disabled')).toBe('true');
    expect(node('#gl-evidence-status').textContent).toContain('Kept model hour 6.');
    expect(node('#gl-evidence-status').textContent).toContain('Your written explanation and original prediction are unchanged.');
    expect(node('#gl-explanation').value).toBe(before.growthInvestigation.trials[0].explanation);
    expect(mounted.awardXP).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });

  it('blocks duplicate and fourth pins for both pointer and Enter activation, then permits a replacement hour', () => {
    mount();
    for (const hour of [6, 12, 18]) { write('#gl-evidence-hour', hour); click('#gl-evidence-pin'); }
    expect(book().trials[0].citedHours).toEqual([6, 12, 18]);
    const before = mounted.state;
    expect(node('#gl-evidence-limit').textContent).toContain('already kept');
    click('#gl-evidence-pin'); keyboardActivate(node('#gl-evidence-pin'));
    expect(mounted.state).toBe(before);
    write('#gl-evidence-hour', 24);
    const fullState = mounted.state;
    expect(node('#gl-evidence-limit').textContent).toContain('Three hours are kept');
    expect(node('#gl-evidence-pin').getAttribute('aria-describedby')).toContain('gl-evidence-limit');
    click('#gl-evidence-pin'); keyboardActivate(node('#gl-evidence-pin'));
    expect(mounted.state).toBe(fullState);
    click('[data-remove-cited-hour="12"]');
    expect(node('#gl-evidence-pin').getAttribute('aria-disabled')).toBe('false');
    click('#gl-evidence-pin');
    expect(book().trials[0].citedHours).toEqual([6, 18, 24]);
  });

  it('clearly retains unavailable control and difference alongside a usable saved trial value', () => {
    const seed = fixture();
    seed.growthInvestigation.trials[0].control = null;
    mount(seed);
    const preview = values('#gl-evidence-preview');
    expect(preview.control).toBe('Unavailable');
    expect(preview.difference).toBe('Unavailable');
    expect(Number(preview.trial)).toBeGreaterThan(0);
    expect(node('[data-growth-citations]').textContent).toContain('This trial has no saved control.');
    click('#gl-evidence-pin');
    expect(values('[data-cited-hour="6"]')).toEqual(preview);
    expect(book().trials[0].prediction).toBe('lower');
  });

  it('requires a valid selected saved trial, including explicit selection of an ID repaired from saved data', () => {
    mount(fixture({ growthReviewHour: '6', growthInvestigation: { selectedId: 1, trials: [trial(null)] } }));
    expect(node('#gl-evidence-hour')).toBe(null);
    click('#gl-trial-1');
    expect(node('#gl-evidence-hour').value).toBe('24');
    expect(node('#gl-evidence-pin').textContent).toBe('Keep model hour 24');
    click('#gl-evidence-pin');
    expect(book().trials[0].citedHours).toEqual([24]);
    act(() => mounted.setData({ microbiology: fixture({ growthInvestigation: { trials: [null, {}, []], selectedId: 1 } }) }));
    expect(node('#gl-evidence-hour')).toBe(null);
    expect(node('#gl-evidence-pin')).toBe(null);
  });

  it('returns focused removals to an adjacent remove control and finally the stable pin', () => {
    const seed = fixture(); seed.growthInvestigation.trials[0].citedHours = [6, 12, 18];
    mount(seed);
    for (const [removed, next] of [[12, '#gl-evidence-remove-18'], [18, '#gl-evidence-remove-6'], [6, '#gl-evidence-pin']]) {
      focus('#gl-evidence-remove-' + removed); click('#gl-evidence-remove-' + removed); flush();
      expect(document.activeElement).toBe(node(next));
    }
    expect(book().trials[0]).not.toHaveProperty('citedHours');
    expect(node('#gl-evidence-status').textContent).toContain('Removed kept hour 6.');
  });

  it.each(['explanation focus', 'outside focus', 'trial selection', 'inspection hour', 'tab navigation', 'JSON remount'])
  ('cancels a queued removal focus after a newer %s action', action => {
    const seed = fixture(); seed.growthInvestigation.trials[0].citedHours = [6, 12];
    mount(seed);
    focus('#gl-evidence-remove-6'); click('#gl-evidence-remove-6');
    const obsoleteTarget = node('#gl-evidence-remove-12');
    let expectedFocus;
    if (action === 'explanation focus') { focus('#gl-explanation'); expectedFocus = node('#gl-explanation'); }
    if (action === 'outside focus') { focus('#micro-tab-quiz'); expectedFocus = node('#micro-tab-quiz'); }
    if (action === 'trial selection') { focus('#gl-trial-9'); click('#gl-trial-9'); expectedFocus = node('#gl-trial-9'); }
    if (action === 'inspection hour') { focus('#gl-evidence-hour'); write('#gl-evidence-hour', 18); expectedFocus = node('#gl-evidence-hour'); }
    if (action === 'tab navigation') { focus('#micro-tab-home'); click('#micro-tab-home'); expectedFocus = node('#micro-tab-home'); }
    if (action === 'JSON remount') {
      const saved = JSON.parse(JSON.stringify(mounted.state));
      act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
      mount(saved); focus('#gl-hypothesis'); expectedFocus = node('#gl-hypothesis');
    }
    flush();
    expect(document.activeElement).toBe(expectedFocus);
    expect(document.activeElement).not.toBe(obsoleteTarget);
    expect(book().trials.find(item => item.id === 4).citedHours).toEqual([12]);
  });

  it('clears notices permanently across hour changes and trial switches and announces a repeated action freshly', () => {
    mount();
    click('#gl-evidence-pin');
    const firstNotice = node('#gl-evidence-status span');
    write('#gl-evidence-hour', 12); write('#gl-evidence-hour', 6);
    expect(node('#gl-evidence-status').textContent).toBe('');
    click('#gl-evidence-remove-6'); click('#gl-evidence-pin');
    expect(node('#gl-evidence-status').textContent).toContain('Kept model hour 6.');
    expect(node('#gl-evidence-status span')).not.toBe(firstNotice);
    click('#gl-trial-9'); click('#gl-trial-4');
    expect(node('#gl-evidence-status').textContent).toBe('');
    expect(book().trials[0].citedHours).toEqual([6]);
    expect(book().trials[1].citedHours).toEqual([2]);
  });

  it('retains literal explanation text and kept hours through tab navigation and a JSON reload without regrading', () => {
    mount();
    write('#gl-explanation', '<img src=x onerror=alert(1)> My reasoning');
    click('#gl-evidence-pin');
    const before = JSON.parse(JSON.stringify(mounted.state));
    click('#micro-tab-home'); click('#micro-tab-growthLab');
    expect(mounted.state).toEqual(before);
    expect(node('#gl-evidence-status').textContent).toBe('');
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(JSON.parse(JSON.stringify(before)));
    expect(mounted.state).toEqual(before);
    expect(node('#gl-explanation').value).toBe('<img src=x onerror=alert(1)> My reasoning');
    expect(node('[data-growth-citations] img')).toBe(null);
    expect(node('[data-cited-hour="6"]')).toBeTruthy();
    expect(node('#gl-evidence-status').textContent).toBe('');
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('shows removed citations read-only even with no active trial and restores them with their original notes', () => {
    const seed = fixture();
    seed.growthInvestigation = { ...seed.growthInvestigation, trials: [trial(4, { citedHours: [0, 6, 24] })], removed: null };
    mount(seed);
    const expected = values('[data-cited-hour="6"]');
    click(button('Remove selected trial'));
    expect(node('#gl-evidence-hour')).toBe(null);
    expect(node('#gl-evidence-pin')).toBe(null);
    expect(node('#gl-removed-evidence-pins')).toBeTruthy();
    expect(node('#gl-removed-evidence-pins button')).toBe(null);
    expect(values('[data-removed-cited-hour="6"]')).toEqual(expected);
    expect(node('#gl-removed-trial').textContent).toContain('Restore the trial to change its kept hours.');
    const saved = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(saved);
    expect(node('[data-removed-cited-hour="24"]')).toBeTruthy();
    click('#gl-restore-removed');
    expect(book().trials[0]).toMatchObject({ citedHours: [0, 6, 24], explanation: 'My explanation 4', prediction: 'lower' });
    expect(values('[data-cited-hour="6"]')).toEqual(expected);
    expect(node('#gl-removed-evidence-pins')).toBe(null);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });
});
