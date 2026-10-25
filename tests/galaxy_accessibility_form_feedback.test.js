import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const LABEL = 'Your explanation';
const HELP = 'Explain how metallicity differed in the early universe compared with today.';
const SAVED = 'Later stellar generations can contain metals made by earlier stars.';

describe('Galaxy Metal Hunt explanation labels and instructions', () => {
  let instances, config, restoreCanvas, restoreLoops, originalMedia, errors;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; restoreLoops = installLoopStubs();
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    for (const instance of instances) { await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    restoreLoops(); restoreCanvas(); window.matchMedia = originalMedia;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    const messages = errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message));
    vi.restoreAllMocks(); expect(messages).toEqual([]);
  });
  async function mount(explanation, t) {
    const instance = { host: document.createElement('div'), root: null, state: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'metalHunt', galaxyAutoRotate: false, metalHunt: { understood: true, explanation, hypothesis: 'Keep my hypothesis.' } } });
      instance.state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1], ...(t ? { t } : {}) }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host);
    await React.act(async () => instance.root.render(React.createElement(Host)));
    return instance;
  }
  function verify(instance, value, labelText = LABEL, helpText = HELP) {
    const input = instance.host.querySelector('#mh-explanation'); expect(input).not.toBeNull();
    expect(input.value).toBe(value);
    const labels = [...input.labels]; expect(labels).toHaveLength(1);
    expect(labels[0].textContent).toBe(labelText); expect(labels[0].closest('[hidden]')).toBeNull();
    const help = instance.host.querySelector('#' + input.getAttribute('aria-describedby'));
    expect(help).not.toBeNull(); expect(help.textContent).toBe(helpText); expect(help.closest('[hidden]')).toBeNull();
    expect(instance.state.galaxy.metalHunt.hypothesis).toBe('Keep my hypothesis.');
    return input;
  }
  it.each(['', SAVED])('provides an associated visible label and persistent question for restored text %j', async explanation => {
    const instance = await mount(explanation); verify(instance, explanation);
  });
  it('retains the label, question and written explanation through editing and hide/reveal', async () => {
    const instance = await mount(SAVED), input = verify(instance, SAVED), edited = SAVED + ' This is my evidence.';
    input.focus();
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, edited);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(verify(instance, edited)).toBe(input); expect(document.activeElement).toBe(input);
    const checkbox = instance.host.querySelector('input[type="checkbox"]'); checkbox.focus();
    await React.act(async () => checkbox.click());
    expect(instance.host.querySelector('#mh-explanation')).toBeNull();
    expect(instance.state.galaxy.metalHunt.explanation).toBe(edited);
    expect(document.activeElement).toBe(checkbox);
    await React.act(async () => checkbox.click()); verify(instance, edited);
    expect(document.activeElement).toBe(checkbox);
  });
  it('preserves the translated label/help association when the saved answer is already filled', async () => {
    const strings = { 'stem.galaxy.mh_explanation_label': 'Votre explication', 'stem.galaxy.mh_explanation_placeholder': 'Expliquez comment la métallicité a changé.' };
    const instance = await mount(SAVED, (key, fallback) => strings[key] || fallback || key);
    verify(instance, SAVED, strings['stem.galaxy.mh_explanation_label'], strings['stem.galaxy.mh_explanation_placeholder']);
  });
});

const QUIZ = [
  { q: 'Which object is a star?', a: 'Sun', options: ['Sun', 'Moon'] },
  { q: 'What is our home galaxy?', a: 'Milky Way', options: ['Milky Way', 'Andromeda'] }
];

describe('Galaxy answer and lifecycle endpoint focus', () => {
  let config, instances, outside, restoreCanvas, loops, originalMedia, errors;
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
    for (const instance of instances) { await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    outside.remove(); loops(); restoreCanvas(); window.matchMedia = originalMedia;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    const messages = errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message));
    vi.restoreAllMocks(); expect(messages).toEqual([]);
  });
  async function mount(data = {}, overrides = {}) {
    const instance = { host: document.createElement('div'), root: null, state: null, set: null, award: vi.fn() };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'galaxy', webglError: true, galaxyAutoRotate: false, quizMode: true, dynamicQuiz: QUIZ, ...data } });
      instance.state = pair[0]; instance.set = pair[1];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1], awardXP: instance.award, ...overrides }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await React.act(async () => instance.root.render(React.createElement(Host)));
    return instance;
  }
  const act = async fn => React.act(async () => fn());
  const frame = async () => act(() => loops.step());
  const query = (instance, selector) => instance.host.querySelector(selector);
  function answer(instance, text) {
    const node = [...instance.host.querySelectorAll('[data-galaxy-quiz-answer]')].find(button => button.getAttribute('aria-label') === 'Select answer: ' + text);
    expect(node).toBeDefined(); return node;
  }
  async function click(node, focused = true) { expect(node).not.toBeNull(); if (focused) node.focus(); await act(() => node.click()); }
  async function patch(instance, data) { await act(() => instance.set(previous => ({ galaxy: { ...previous.galaxy, ...data } }))); }
  function graded(instance, pick, correct) {
    expect(instance.state.galaxy.quizFeedback).toMatchObject({ picked: pick, correct });
    const choices = [...instance.host.querySelectorAll('[data-galaxy-quiz-answer]')];
    expect(choices.every(node => !node.disabled && node.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(choices.filter(node => node.getAttribute('aria-pressed') === 'true')).toEqual([answer(instance, pick)]);
  }

  it.each([['Sun', true], ['Moon', false]])('keeps the chosen %s answer focused and exposes its answered state', async (pick, correct) => {
    const instance = await mount(), live = query(instance, '[data-galaxy-quiz-feedback-status]'), choice = answer(instance, pick);
    await click(choice); await frame();
    expect(document.activeElement).toBe(choice); graded(instance, pick, correct);
    expect(query(instance, '[data-galaxy-quiz-feedback-status]')).toBe(live); expect(live.textContent).not.toBe('');
    expect(instance.state.galaxy.quizScore).toBe(correct ? 1 : 0); expect(instance.award).toHaveBeenCalledTimes(correct ? 1 : 0);
  });

  it.each([['Sun', 'Moon', 1], ['Moon', 'Sun', 0]])('commits only the first rapid answer %s before rerender, despite later %s clicks', async (first, later, score) => {
    const instance = await mount(), firstButton = answer(instance, first), laterButton = answer(instance, later); firstButton.focus();
    await act(() => { firstButton.click(); firstButton.click(); laterButton.click(); laterButton.click(); });
    graded(instance, first, score === 1); expect(instance.state.galaxy.quizScore).toBe(score);
    expect(instance.award).toHaveBeenCalledTimes(score); expect(document.activeElement).toBe(firstButton);
    const snapshot = instance.state.galaxy;
    await act(() => { for (let index = 0; index < 4; index++) { laterButton.click(); firstButton.click(); } });
    expect(instance.state.galaxy).toEqual(snapshot); expect(instance.award).toHaveBeenCalledTimes(score);
  });

  it('allows one fresh grade after Next while preserving the accumulated score', async () => {
    const instance = await mount(); await click(answer(instance, 'Sun'));
    await click(query(instance, '[data-galaxy-quiz-next]')); await frame();
    const choice = answer(instance, 'Milky Way'); expect(choice.getAttribute('aria-disabled')).toBe('false');
    await click(choice); graded(instance, 'Milky Way', true);
    expect(instance.state.galaxy.quizScore).toBe(2); expect(instance.award).toHaveBeenCalledTimes(2);
  });

  it('clears the commit on Restart and allows the same question to be graded again', async () => {
    const instance = await mount(); await click(answer(instance, 'Sun'));
    await click(query(instance, '[data-galaxy-quiz-restart]')); await frame();
    expect(instance.state.galaxy.quizScore).toBe(0); expect(instance.state.galaxy.quizFeedback).toBeNull();
    const choice = answer(instance, 'Sun'); expect(choice.getAttribute('aria-disabled')).toBe('false');
    await click(choice); graded(instance, 'Sun', true); expect(instance.state.galaxy.quizScore).toBe(1); expect(instance.award).toHaveBeenCalledTimes(2);
  });

  it('clears the commit on results Retry and permits a new answer', async () => {
    const instance = await mount({ quizIdx: 1 }); await click(answer(instance, 'Milky Way'));
    await click(query(instance, '[data-galaxy-quiz-next]')); await frame();
    expect(instance.state.galaxy.quizDone).toBe(true);
    await click(query(instance, '[data-galaxy-quiz-retry]')); await frame();
    await click(answer(instance, 'Moon')); graded(instance, 'Moon', false);
    expect(instance.state.galaxy.quizScore).toBe(0); expect(instance.award).toHaveBeenCalledTimes(1);
  });

  it('permits grading an identical replacement bank after successful generation', async () => {
    const callGemini = vi.fn((_prompt, callback) => callback({ text: JSON.stringify(QUIZ) }));
    const instance = await mount({}, { callGemini }); await click(answer(instance, 'Sun'));
    await click(query(instance, '[data-galaxy-quiz-generate]')); await frame();
    expect(callGemini).toHaveBeenCalledOnce(); expect(instance.state.galaxy.quizScore).toBe(0);
    await click(answer(instance, 'Sun')); graded(instance, 'Sun', true);
    expect(instance.state.galaxy.quizScore).toBe(1); expect(instance.award).toHaveBeenCalledTimes(2);
  });

  it('recognizes externally restored unanswered state at the same bank and index', async () => {
    const instance = await mount(); await click(answer(instance, 'Sun'));
    await patch(instance, { quizFeedback: null, quizScore: 0, quizStreak: 0 });
    await click(answer(instance, 'Moon')); graded(instance, 'Moon', false); expect(instance.state.galaxy.quizScore).toBe(0);
    expect(instance.award).toHaveBeenCalledTimes(1);
  });

  it('does not steal outside focus for a programmatic answer or share its commit across instances', async () => {
    const first = await mount(), second = await mount(); outside.focus();
    await click(answer(first, 'Sun'), false); await frame(); expect(document.activeElement).toBe(outside);
    await click(answer(second, 'Sun'), false); await frame(); expect(document.activeElement).toBe(outside);
    expect(first.state.galaxy.quizScore).toBe(1); expect(second.state.galaxy.quizScore).toBe(1);
    expect(first.award).toHaveBeenCalledOnce(); expect(second.award).toHaveBeenCalledOnce();
  });

  it.each(['previous', 'next'])('keeps Star Life %s focused when it reaches its endpoint, without allowing further movement', async direction => {
    const instance = await mount({ simMode: 'star', quizMode: false, lifecycleMass: 1 });
    const button = query(instance, '[data-galaxy-stage-step="' + direction + '"]'); expect(button).not.toBeNull(); button.focus();
    for (let index = 0; index < 12 && button.getAttribute('aria-disabled') !== 'true'; index++) await click(button);
    expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.disabled).toBe(false);
    expect(document.activeElement).toBe(button);
    const stage = instance.state.galaxy.activeStage, status = query(instance, '[data-galaxy-stage-controls] [role="status"]').textContent;
    await act(() => { button.click(); button.click(); button.click(); }); await frame();
    expect(instance.state.galaxy.activeStage).toBe(stage); expect(document.activeElement).toBe(button);
    expect(query(instance, '[data-galaxy-stage-controls] [role="status"]').textContent).toBe(status);
    const other = query(instance, '[data-galaxy-stage-step="' + (direction === 'next' ? 'previous' : 'next') + '"]');
    expect(other.getAttribute('aria-disabled')).toBe('false'); await click(other);
    expect(instance.state.galaxy.activeStage).not.toBe(stage);
  });
});
