import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const BANK = [
  { q: 'Which object is a star?', a: 'Sun', options: ['Sun', 'Moon'] },
  { q: 'What is our home galaxy?', a: 'Milky Way', options: ['Milky Way', 'Andromeda'] }
];
const NEW_BANK = [{ q: 'What powers the Sun?', a: 'Fusion', options: ['Fusion', 'Combustion'] }];
const response = { text: JSON.stringify(NEW_BANK) };

describe('Galaxy asynchronous accessible feedback', () => {
  let instances, outside, restoreCanvas, loops, originalMedia, errors, config;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    outside = document.createElement('button'); outside.textContent = 'Outside the tool'; document.body.appendChild(outside);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    for (const instance of instances) { if (instance.root) await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    outside.remove(); loops(); restoreCanvas(); window.matchMedia = originalMedia;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.useRealTimers(); vi.restoreAllMocks();
  });
  const act = async fn => React.act(async () => fn());
  async function frame() { await act(() => loops.step()); }
  async function mount(data = {}, callGemini = null) {
    const instance = { host: document.createElement('div'), root: null, state: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'galaxy', webglError: true, galaxyAutoRotate: false, quizMode: true, dynamicQuiz: BANK, ...data } });
      instance.state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1], callGemini }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await act(() => instance.root.render(React.createElement(Host)));
    return instance;
  }
  async function click(instance, selector, focused = true) {
    const control = instance.host.querySelector(selector); expect(control).not.toBeNull();
    if (focused) control.focus(); await act(() => control.click()); return control;
  }
  function pendingRequest() {
    const request = {};
    const promise = new Promise((resolve, reject) => { request.reject = reject; });
    request.call = vi.fn((prompt, callback) => { request.resolve = callback; return promise; });
    return request;
  }
  function status(instance) { return instance.host.querySelector('[data-galaxy-quiz-generation-status]'); }
  function question(instance) { return instance.host.querySelector('[data-galaxy-quiz-question]'); }
  function clean() { expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message))).toEqual([]); }

  it('registers an empty generation status before loading and focuses the replacement loading control', async () => {
    const request = pendingRequest(), instance = await mount({}, request.call), live = status(instance);
    expect(live.textContent).toBe(''); expect(live.getAttribute('role')).toBe('status');
    expect(live.getAttribute('aria-live')).toBe('polite'); expect(live.getAttribute('aria-atomic')).toBe('true');
    const trigger = await click(instance, '[data-galaxy-quiz-generate]');
    expect(trigger.isConnected).toBe(false); expect(status(instance)).toBe(live);
    expect(live.textContent).toBe('Loading new astronomy questions…');
    await frame(); expect(document.activeElement).toBe(instance.host.querySelector('[data-galaxy-quiz-keep-current]')); clean();
  });

  it('focuses the new question after an asynchronous response while retaining the same status node', async () => {
    const request = pendingRequest(), instance = await mount({}, request.call), live = status(instance);
    await click(instance, '[data-galaxy-quiz-generate]'); await frame();
    await act(() => request.resolve(response)); await frame();
    expect(instance.state.galaxy.dynamicQuiz).toEqual(NEW_BANK);
    expect(document.activeElement).toBe(question(instance)); expect(question(instance).textContent).toBe(NEW_BANK[0].q);
    expect(status(instance)).toBe(live); expect(live.textContent).toBe('New questions are ready.'); clean();
  });

  it.each(['synchronous', 'before the loading focus frame'])('handles a response %s without leaving focus on a removed control', async timing => {
    const request = pendingRequest();
    const call = timing === 'synchronous' ? vi.fn((prompt, callback) => callback(response)) : request.call;
    const instance = await mount({}, call);
    await click(instance, '[data-galaxy-quiz-generate]');
    if (timing !== 'synchronous') await act(() => request.resolve(response));
    await frame(); expect(document.activeElement).toBe(question(instance));
    expect(question(instance).textContent).toBe(NEW_BANK[0].q); clean();
  });

  it.each([false, true])('restores the current quiz after cancellation and ignores late responses; completed: %s', async quizDone => {
    const request = pendingRequest(), instance = await mount({ quizDone, quizScore: 1 }, request.call);
    await click(instance, '[data-galaxy-quiz-generate]'); await frame();
    await click(instance, '[data-galaxy-quiz-keep-current]'); await frame();
    const target = quizDone ? instance.host.querySelector('[data-galaxy-quiz-results-title]') : question(instance);
    expect(document.activeElement).toBe(target); expect(instance.state.galaxy.dynamicQuiz).toEqual(BANK);
    expect(status(instance).textContent).toBe('Kept your current quiz.');
    await act(() => request.resolve(response)); await frame();
    expect(document.activeElement).toBe(target); expect(instance.state.galaxy.dynamicQuiz).toEqual(BANK);
    expect(status(instance).textContent).toBe('Kept your current quiz.'); clean();
  });

  it('returns to an idle original quiz after leaving during generation and ignores a late response', async () => {
    const request = pendingRequest(), instance = await mount({ quizIdx: 1, quizScore: 1 }, request.call);
    await click(instance, '[data-galaxy-quiz-generate]'); await frame();
    expect(status(instance).textContent).toBe('Loading new astronomy questions…');
    const galaxyMode = await click(instance, '[data-galaxy-mode="galaxy"]'); await frame();
    expect(instance.state.galaxy.quizMode).toBe(false); expect(instance.state.galaxy.isGeneratingQuiz).toBe(false);
    expect(document.activeElement).toBe(galaxyMode);
    const quizMode = await click(instance, '[data-galaxy-mode="quiz"]'); await frame();
    expect(status(instance).textContent).toBe(''); expect(instance.host.querySelector('[data-galaxy-quiz-keep-current]')).toBeNull();
    expect(instance.host.querySelector('[data-galaxy-quiz-generate]')).not.toBeNull();
    expect(instance.state.galaxy.dynamicQuiz).toEqual(BANK); expect(instance.state.galaxy.quizIdx).toBe(1);
    expect(instance.state.galaxy.quizScore).toBe(1); expect(question(instance).textContent).toBe(BANK[1].q);
    expect(document.activeElement).toBe(quizMode);
    outside.focus(); await act(() => request.resolve(response)); await frame();
    expect(status(instance).textContent).toBe(''); expect(instance.state.galaxy.dynamicQuiz).toEqual(BANK);
    expect(question(instance).textContent).toBe(BANK[1].q); expect(document.activeElement).toBe(outside); clean();
  });

  it.each(['rejection', 'invalid response', 'timeout', 'synchronous error'])('retains the current quiz and meaningful focus after %s', async failure => {
    const request = pendingRequest(), quizDone = failure === 'timeout';
    const call = failure === 'synchronous error' ? vi.fn(() => { throw new Error('Unavailable'); }) : request.call;
    const instance = await mount({ quizDone }, call), live = status(instance);
    if (failure === 'timeout') vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await click(instance, '[data-galaxy-quiz-generate]');
    if (failure !== 'synchronous error') {
      await frame();
      if (failure === 'rejection') await act(() => request.reject(new Error('Unavailable')));
      if (failure === 'invalid response') await act(() => request.resolve({ text: 'not JSON' }));
      if (failure === 'timeout') await act(() => vi.advanceTimersByTime(25000));
    }
    await frame();
    expect(document.activeElement).toBe(quizDone ? instance.host.querySelector('[data-galaxy-quiz-results-title]') : question(instance));
    expect(instance.state.galaxy.dynamicQuiz).toEqual(BANK); expect(instance.state.galaxy.isGeneratingQuiz).toBe(false);
    expect(status(instance)).toBe(live); expect(live.textContent).toContain(failure === 'timeout' ? 'took too long' : 'could not be loaded'); clean();
  });

  it.each(['before loading focus', 'before response', 'before final focus'])('preserves the learner moving outside %s', async timing => {
    const request = pendingRequest(), instance = await mount({}, request.call);
    await click(instance, '[data-galaxy-quiz-generate]');
    if (timing === 'before loading focus') outside.focus();
    await frame();
    if (timing === 'before response') outside.focus();
    await act(() => request.resolve(response));
    if (timing === 'before final focus') outside.focus();
    await frame(); expect(document.activeElement).toBe(outside);
    expect(status(instance).textContent).toBe('New questions are ready.'); clean();
  });

  it('does not move focus for a load activated without focus', async () => {
    const request = pendingRequest(), instance = await mount({}, request.call); outside.focus();
    await click(instance, '[data-galaxy-quiz-generate]', false); await frame();
    expect(document.activeElement).toBe(outside);
    await act(() => request.resolve(response)); await frame(); expect(document.activeElement).toBe(outside); clean();
  });

  it('scopes generation focus to its own tool instance', async () => {
    const first = await mount(), request = pendingRequest(), second = await mount({}, request.call);
    await click(second, '[data-galaxy-quiz-generate]'); await frame();
    expect(document.activeElement).toBe(second.host.querySelector('[data-galaxy-quiz-keep-current]'));
    await act(() => request.resolve(response)); await frame();
    expect(document.activeElement).toBe(question(second)); expect(question(first).textContent).toBe(BANK[0].q); clean();
  });

  it('cancels deferred loading focus and ignores a late callback after unmount', async () => {
    const request = pendingRequest(), instance = await mount({}, request.call);
    await click(instance, '[data-galaxy-quiz-generate]');
    await act(() => instance.root.unmount()); instance.root = null; outside.focus();
    await act(() => request.resolve(response)); await frame(); expect(document.activeElement).toBe(outside); clean();
  });

  it.each([true, false])('clears a Metal comparison with status feedback and guarded focus; focused: %s', async focused => {
    const metalHunt = { metallicity: 0.5, mass: 2, age: 4, notes: 'Keep my reasoning', log: [{ z: 0.1, m: 1, a: 8 }], comparison: { z: 1, m: 1, a: 5 } };
    const instance = await mount({ simMode: 'metalHunt', quizMode: false, metalHunt });
    const live = instance.host.querySelector('[data-galaxy-metallicity-log-status]');
    if (!focused) outside.focus();
    const trigger = await click(instance, '[data-galaxy-metallicity-clear-comparison]', focused); await frame();
    expect(trigger.isConnected).toBe(false);
    expect(instance.state.galaxy.metalHunt).toEqual({ ...metalHunt, comparison: null });
    expect(document.activeElement).toBe(focused ? instance.host.querySelector('[data-galaxy-metallicity-log-add]') : outside);
    expect(instance.host.querySelector('[data-galaxy-metallicity-log-status]')).toBe(live);
    expect(live.textContent).toBe('Comparison cleared. Current inputs and notes are unchanged.'); clean();
  });

  it('keeps the Evidence status registered across checking, prediction changes, and mission changes without moving focus', async () => {
    const book = { mission: 'dust', entries: { dust: { prediction: 'dust', visited: [true, true], notes: ['First view', 'Second view'], explanation: '', checked: false, context: null } } };
    const instance = await mount({ quizMode: false, galaxyEvidenceWorkbench: book });
    const live = instance.host.querySelector('[data-galaxy-evidence-feedback]');
    expect(live).not.toBeNull(); expect(live.textContent).toBe('');
    expect(live.getAttribute('role')).toBe('status'); expect(live.getAttribute('aria-live')).toBe('polite'); expect(live.getAttribute('aria-atomic')).toBe('true');
    const check = await click(instance, '[data-galaxy-evidence-check]');
    expect(document.activeElement).toBe(check); expect(instance.host.querySelector('[data-galaxy-evidence-feedback]')).toBe(live);
    expect(live.textContent).toContain('What the evidence supports');
    const otherPrediction = instance.host.querySelector('[data-galaxy-evidence-prediction] input:not(:checked)');
    otherPrediction.focus(); await act(() => otherPrediction.click());
    expect(document.activeElement).toBe(otherPrediction); expect(live.textContent).toBe('');
    const mission = await click(instance, '[data-galaxy-evidence-mission="fuel"]');
    expect(document.activeElement).toBe(mission); expect(instance.host.querySelector('[data-galaxy-evidence-feedback]')).toBe(live);
    expect(live.textContent).toBe(''); expect(instance.host.querySelector('[data-galaxy-evidence-check]').disabled).toBe(true); clean();
  });
});
