import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_climateExplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const disposers = [];
let frames;

function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'climateExplorer');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn(), award = vi.fn();
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ climateExplorer: { tab: 'solutions', quizOpen: true, ...seed } });
    current = data.climateExplorer;
    setCurrent = patch => setData(previous => ({ ...previous, climateExplorer: { ...previous.climateExplorer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: announce, awardXP: award }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, award, state: () => current, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)],
    answer: text => [...host.querySelectorAll('#ce-quiz-panel button')].find(button => button.textContent.includes(text)),
    next: () => [...host.querySelectorAll('#ce-quiz-panel button')].find(button => /Next Question/i.test(button.textContent)) };
}
async function settleFocus() {
  await act(async () => {
    await Promise.resolve();
    vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16));
    await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy(); expect(button.disabled).toBe(false);
  button.focus(); act(() => button.click()); await settleFocus();
}
async function shortcut(target) {
  target.focus();
  act(() => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', altKey: true, bubbles: true, cancelable: true })));
  await settleFocus();
}
function expectQuestion(view, contains) {
  const region = view.one('#ce-quiz-question');
  expect(region).toBeTruthy(); expect(region.tabIndex).toBe(-1);
  expect(region.getAttribute('role')).toBe('region');
  expect(region.getAttribute('aria-labelledby')).toBe('ce-quiz-question-title');
  expect(region.getAttribute('aria-describedby')?.split(/\s+/)).toContain('ce-quiz-progress');
  expect(view.one('#ce-quiz-question-title').tagName).toBe('H3');
  expect(view.one('#ce-quiz-question-title').textContent).toContain(contains);
  return region;
}
function expectFeedback(view, correct) {
  const feedback = view.one('#ce-quiz-feedback');
  expect(feedback).toBeTruthy(); expect(feedback.tabIndex).toBe(-1);
  expect(feedback.getAttribute('role')).toBe('region');
  expect(feedback.getAttribute('aria-labelledby')).toBe('ce-quiz-feedback-title');
  expect(feedback.getAttribute('aria-describedby')?.split(/\s+/)).toContain('ce-quiz-feedback-detail');
  expect(view.one('#ce-quiz-feedback-detail').textContent).toContain(correct);
  expect(document.activeElement).toBe(feedback);
  return feedback;
}

beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose()); await settleFocus();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Climate quiz accessibility: %s', path => {
  it('names the quiz, current question and answer group without taking focus on initial render', async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    const view = mountTool(path); await settleFocus();
    expect(document.activeElement).toBe(outside);
    const panel = view.one('#ce-quiz-panel');
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-labelledby')).toBe('ce-quiz-title');
    expectQuestion(view, 'What gas do cars produce');
    expect(view.one('#ce-quiz-progress').textContent.trim()).toBeTruthy();
    const group = view.one('#ce-quiz-panel [role="group"]');
    expect(group.getAttribute('aria-labelledby')).toBe('ce-quiz-question-title');
    expect(group.querySelectorAll('button')).toHaveLength(3);
    expect(view.one('#ce-quiz-feedback')).toBeNull();
  });

  it('shows readable correct-answer feedback and a working Next action with focus on the next question', async () => {
    const view = mountTool(path);
    await activate(view.answer('Carbon dioxide'));
    expectFeedback(view, 'Carbon dioxide');
    expect(view.one('#ce-quiz-feedback-title').textContent).toMatch(/correct/i);
    expect(view.state()).toMatchObject({ quizAnswer: 0, quizCorrect: 1, quizTotal: 1 });
    expect(view.award).toHaveBeenCalledTimes(1);
    expect(view.award).toHaveBeenCalledWith('climateExplorer', 10);
    const next = view.next(); await activate(next);
    expect(next.isConnected).toBe(false);
    expect(document.activeElement).toBe(expectQuestion(view, 'Which uses less energy'));
    expect(view.one('#ce-quiz-feedback')).toBeNull();
    expect(view.state()).toMatchObject({ quizIdx: 1, quizCorrect: 1, quizTotal: 1 });
    await activate(view.answer('Walking'));
    expectFeedback(view, 'Walking');
    expect(view.state()).toMatchObject({ quizCorrect: 2, quizTotal: 2 });
    expect(view.award).toHaveBeenCalledTimes(2);
  });

  it('identifies both the chosen and correct options in text after a wrong answer', async () => {
    const view = mountTool(path);
    await activate(view.answer('Pure oxygen gas'));
    expectFeedback(view, 'Carbon dioxide');
    expect(view.answer('Pure oxygen gas').textContent).toMatch(/your answer/i);
    expect(view.answer('Carbon dioxide').textContent).toMatch(/correct answer/i);
    expect(view.state().quizTotal).toBe(1);
    expect(view.state().quizCorrect || 0).toBe(0);
    expect(view.award).not.toHaveBeenCalled();
    expect(view.next()).toBeTruthy();
  });

  it('keeps answered options inspectable but prevents a second attempt or extra score', async () => {
    const view = mountTool(path);
    await activate(view.answer('Carbon dioxide'));
    for (const button of view.all('#ce-quiz-panel [role="group"] button')) {
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    }
    await activate(view.answer('Pure oxygen gas'));
    await activate(view.answer('Carbon dioxide'));
    expect(view.state()).toMatchObject({ quizAnswer: 0, quizCorrect: 1, quizTotal: 1 });
    expect(view.award).toHaveBeenCalledTimes(1);
  });

  it('toggles the quiz with an exposed expanded state and returns focus when closed', async () => {
    const view = mountTool(path, { quizOpen: false });
    const toggle = view.one('#ce-quiz-toggle');
    expect(toggle.getAttribute('aria-controls')).toBe('ce-quiz-panel');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(view.one('#ce-quiz-panel').hidden).toBe(true);
    await activate(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(view.one('#ce-quiz-panel').hidden).toBe(false);
    expect(document.activeElement).toBe(expectQuestion(view, 'What gas do cars produce'));
    await activate(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(view.one('#ce-quiz-panel').hidden).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it('opens and closes with Alt+Q while retaining an answered round', async () => {
    const view = mountTool(path, { quizOpen: false });
    await shortcut(view.one('#ce-quiz-toggle'));
    expect(document.activeElement).toBe(expectQuestion(view, 'What gas do cars produce'));
    await activate(view.answer('Carbon dioxide'));
    await shortcut(view.one('#ce-quiz-feedback'));
    expect(view.one('#ce-quiz-panel').hidden).toBe(true);
    expect(document.activeElement).toBe(view.one('#ce-quiz-toggle'));
    await shortcut(view.one('#ce-quiz-toggle'));
    expect(view.one('#ce-quiz-panel').hidden).toBe(false);
    expect(view.state()).toMatchObject({ quizAnswer: 0, quizCorrect: 1, quizTotal: 1 });
    expect(view.one('#ce-quiz-feedback')).toBeTruthy();
    expect(view.next()).toBeTruthy();
    expect(view.award).toHaveBeenCalledTimes(1);
  });

  it.each([-1, 0.5, 'not-a-question', Infinity])('recovers from the invalid restored question index %j', async quizIdx => {
    const view = mountTool(path, { quizIdx, quizAnswer: 999 });
    expectQuestion(view, 'What gas do cars produce');
    expect(view.one('#ce-quiz-feedback')).toBeNull();
    await activate(view.answer('Carbon dioxide'));
    expectFeedback(view, 'Carbon dioxide');
    expect(view.state().quizTotal).toBe(1);
  });

  it('does not move focus on unrelated state updates', async () => {
    const view = mountTool(path);
    const toggle = view.one('#ce-quiz-toggle'); toggle.focus();
    view.patch({ exportedReport: 'A retained report' }); await settleFocus();
    expect(document.activeElement).toBe(toggle);
    expectQuestion(view, 'What gas do cars produce');
  });

  it('installs visible focus styles when another tool already installed shared reduced-motion styles', async () => {
    document.getElementById('ce-explorer-focus-css')?.remove();
    document.getElementById('allo-stem-motion-reduce-css')?.remove();
    const shared = document.createElement('style');
    shared.id = 'allo-stem-motion-reduce-css';
    shared.textContent = '@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}';
    document.head.appendChild(shared);
    disposers.push(() => { shared.remove(); document.getElementById('ce-explorer-focus-css')?.remove(); });
    const view = mountTool(path);
    await activate(view.answer('Carbon dioxide'));
    expectFeedback(view, 'Carbon dioxide');
    expect(document.getElementById('allo-stem-motion-reduce-css')).toBe(shared);
    const focusStyle = document.getElementById('ce-explorer-focus-css');
    expect(focusStyle).toBeTruthy();
    expect(focusStyle.textContent).toContain('[data-ce-quiz-focus]:focus');
    expect(focusStyle.textContent).toContain('outline: 3px solid');
    expect(focusStyle.textContent).toContain('forced-colors:active');
    expect(document.querySelectorAll('#ce-explorer-focus-css')).toHaveLength(1);
  });
});
