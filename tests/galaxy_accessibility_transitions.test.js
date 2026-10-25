import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

const BANK = [
  { q: 'Which object is a star?', a: 'Sun', options: ['Sun', 'Moon'] },
  { q: 'What is our home galaxy?', a: 'Milky Way', options: ['Milky Way', 'Andromeda'] }
];

describe('Galaxy accessible content transitions', () => {
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
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  const act = async fn => React.act(async () => fn());
  async function frame() { await act(() => loops.step()); }
  async function mount(data = {}) {
    const instance = { host: document.createElement('div'), root: null, state: null, set: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'galaxy', webglError: true, galaxyAutoRotate: false, quizMode: true, dynamicQuiz: BANK, ...data } });
      instance.state = pair[0]; instance.set = pair[1];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1] }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await act(() => instance.root.render(React.createElement(Host)));
    return instance;
  }
  async function click(instance, selector, focused = true) {
    const button = instance.host.querySelector(selector); expect(button).not.toBeNull();
    if (focused) button.focus(); await act(() => button.click()); return button;
  }
  async function answer(instance) { await click(instance, '[aria-label^="Select answer:"]'); }
  async function patch(instance, data) { await act(() => instance.set(prev => ({ galaxy: { ...prev.galaxy, ...data } }))); }
  function clean() { expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message))).toEqual([]); }

  it('registers feedback before answers and announces a meaningful question position', async () => {
    const instance = await mount(), status = instance.host.querySelector('[data-galaxy-quiz-feedback-status]');
    expect(status).not.toBeNull(); expect(status.textContent).toBe('');
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(instance.host.querySelector('[role="progressbar"]').getAttribute('aria-valuetext')).toBe('Question 1 of 2');
    const question = instance.host.querySelector('[data-galaxy-quiz-question]');
    expect(question.tagName).toBe('H4'); expect(question.getAttribute('tabindex')).toBe('-1');
    expect(instance.host.querySelector('#' + question.getAttribute('aria-describedby')).textContent).toContain('Question 1/2');
    await answer(instance);
    expect(instance.host.querySelector('[data-galaxy-quiz-feedback-status]')).toBe(status);
    expect(status.textContent).not.toBe(''); clean();
  });

  it('moves focus from the removed Next button to the next question after commit', async () => {
    const instance = await mount(); await answer(instance);
    const next = await click(instance, '[data-galaxy-quiz-next]');
    expect(next.isConnected).toBe(false); await frame();
    expect(document.activeElement).toBe(instance.host.querySelector('[data-galaxy-quiz-question]'));
    expect(document.activeElement.textContent).toBe(BANK[1].q);
    expect(instance.host.querySelector('[data-galaxy-quiz-position]').textContent).toContain('Question 2/2');
    expect(instance.host.querySelector('[role="progressbar"]').getAttribute('aria-valuetext')).toBe('Question 2 of 2'); clean();
  });

  it('focuses the results heading and restores question focus when retrying', async () => {
    const instance = await mount({ quizIdx: 1 }); await answer(instance);
    await click(instance, '[data-galaxy-quiz-next]'); await frame();
    const results = instance.host.querySelector('[data-galaxy-quiz-results-title]');
    expect(document.activeElement).toBe(results); expect(results.textContent).toBe('Quiz complete');
    expect(results.closest('[role="status"]')).toBeNull();
    expect(instance.host.querySelector('#' + results.getAttribute('aria-describedby')).textContent).toContain('/ 2');
    await click(instance, '[data-galaxy-quiz-retry]'); await frame();
    expect(document.activeElement).toBe(instance.host.querySelector('[data-galaxy-quiz-question]'));
    expect(document.activeElement.textContent).toBe(BANK[0].q); clean();
  });

  it('returns focus to the persistent tool heading when leaving quiz results', async () => {
    const instance = await mount({ quizDone: true }); await click(instance, '[data-galaxy-quiz-back]'); await frame();
    expect(instance.state.galaxy.quizMode).toBe(false);
    expect(document.activeElement).toBe(instance.host.querySelector('#galaxy-tool-title')); clean();
  });

  it('moves to the first question after a focused restart, while unrelated updates keep focus', async () => {
    const instance = await mount({ quizIdx: 1 }); await click(instance, '[data-galaxy-quiz-restart]'); await frame();
    expect(document.activeElement).toBe(instance.host.querySelector('[data-galaxy-quiz-question]'));
    expect(document.activeElement.textContent).toBe(BANK[0].q);
    outside.focus(); await patch(instance, { quizIdx: 1 }); await frame();
    expect(document.activeElement).toBe(outside); clean();
  });

  it('does not steal focus if the learner moves elsewhere before the deferred handoff', async () => {
    const instance = await mount(); await answer(instance); await click(instance, '[data-galaxy-quiz-next]');
    outside.focus(); await frame(); expect(document.activeElement).toBe(outside); clean();
  });

  it('scopes deferred question focus to the instance whose Next button was activated', async () => {
    const first = await mount(), second = await mount();
    await answer(second); await click(second, '[data-galaxy-quiz-next]'); await frame();
    expect(document.activeElement).toBe(second.host.querySelector('[data-galaxy-quiz-question]'));
    expect(first.host.querySelector('[data-galaxy-quiz-question]').textContent).toBe(BANK[0].q); clean();
  });

  it.each([true, false])('focuses revealed prompts only when the removed prompt button held focus: %s', async focused => {
    const instance = await mount({ simMode: 'metalHunt', quizMode: false });
    if (!focused) outside.focus();
    const trigger = await click(instance, '[data-galaxy-metallicity-show-prompts]', focused); await frame();
    expect(trigger.isConnected).toBe(false);
    const heading = instance.host.querySelector('[data-galaxy-metallicity-prompts-title]');
    expect(heading.textContent).toBe('Prompts to explore');
    expect(document.activeElement).toBe(focused ? heading : outside); clean();
  });

  it('keeps a persistent polite log status and re-announces repeated logs at capacity without slider chatter', async () => {
    const logs = Array.from({ length: 8 }, () => ({ z: 1, m: 1, a: 5, st: 'popI' }));
    const instance = await mount({ simMode: 'metalHunt', quizMode: false, metalHunt: { metallicity: 1, mass: 1, age: 5, log: logs } });
    const status = instance.host.querySelector('[data-galaxy-metallicity-log-status]');
    expect(status.textContent).toBe(''); expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true');
    await click(instance, '[data-galaxy-metallicity-log-add]'); await frame();
    expect(instance.state.galaxy.metalHunt.log).toHaveLength(8); expect(status.textContent).toBe('Combination logged. 8 of 8 saved combinations.');
    await click(instance, '[data-galaxy-metallicity-log-add]'); expect(status.textContent).toBe(''); await frame();
    expect(instance.host.querySelector('[data-galaxy-metallicity-log-status]')).toBe(status);
    expect(status.textContent).toBe('Combination logged. 8 of 8 saved combinations.');
    await patch(instance, { metalHunt: { ...instance.state.galaxy.metalHunt, mass: 2 } }); await frame();
    expect(status.textContent).toBe('Combination logged. 8 of 8 saved combinations.');
    await click(instance, '[data-galaxy-metallicity-reset]'); await frame();
    expect(instance.state.galaxy.metalHunt.log).toEqual([]); expect(status.textContent).toBe('Investigation reset. Saved combinations cleared.'); clean();
  });

  it.each([[1, '[data-galaxy-star-keep]'], [0.05, '[data-galaxy-star-use-sun]']])('keeps meaningful focus when clearing the Star Life reference at mass %s', async (mass, target) => {
    const instance = await mount({ simMode: 'star', quizMode: false, lifecycleMass: mass, stellarMassReference: 1 });
    const trigger = await click(instance, '[data-galaxy-star-clear-reference]'); await frame();
    expect(trigger.isConnected).toBe(false); expect(instance.state.galaxy.stellarMassReference).toBeNull();
    expect(document.activeElement).toBe(instance.host.querySelector(target)); clean();
  });

  it('cancels pending focus and status callbacks when the instance is removed', async () => {
    const instance = await mount({ simMode: 'metalHunt', quizMode: false });
    await click(instance, '[data-galaxy-metallicity-show-prompts]');
    await click(instance, '[data-galaxy-metallicity-log-add]', false);
    await act(() => instance.root.unmount()); instance.root = null;
    outside.focus(); await frame(); expect(document.activeElement).toBe(outside); clean();
  });
});
