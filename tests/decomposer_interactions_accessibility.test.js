import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_decomposer.js', 'desktop/web-app/public/stem_lab/stem_tool_decomposer.js'];
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;
const name = element => element.getAttribute('aria-label') || element.textContent.trim();
const disposers = [];
let frames;

// Real shipped React handlers, DOM focus, and state transitions are under test.
// Drawing and RAF scheduling are controlled because jsdom has no canvas layout.
function mountTool(path, seed = {}, overrides = {}) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let current, setCurrent;
  const announce = vi.fn();
  function Host() {
    const [data, setData] = React.useState({ decomposer: {
      tab: 'explore', selected: 'Water', materialsExplored: ['Water'], ...seed,
    } });
    current = data.decomposer;
    setCurrent = patch => setData(prev => ({ ...prev, decomposer: { ...prev.decomposer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, t: translate, announceToSR: announce, ...overrides }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, state: () => current, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)],
    button: text => [...host.querySelectorAll('button')].find(button => name(button) === text) };
}

function activate(button) {
  expect(button).not.toBeNull();
  expect(button).toBeDefined();
  button.focus();
  act(() => button.click());
}

function nextFrame() {
  const pending = frames.splice(0);
  act(() => pending.forEach(callback => callback(16)));
}

function enter(input) {
  input.focus();
  act(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })));
}

function fill(input, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

const question = () => ({
  text: 'Which formula represents water?', opts: ['H₂O', 'NaCl'], answer: 'H₂O',
  wrongFeedback: { NaCl: 'NaCl is table salt. Water is H₂O.' },
});

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    measureText: text => ({ width: String(text).length * 6 }),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});

afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
  // The browser's next animation frame releases disconnected canvas resources.
  frames.splice(0).forEach(callback => callback(16));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Material Decomposer interaction accessibility: %s', path => {
  it.each([
    ['explore', 'h4'], ['scenes', '[data-decomposer-object]'], ['reactions', 'h4'],
    ['states', 'input[type="range"]'], ['visualize', 'canvas'],
    ['quiz', '#stem-decomposer-quiz-start'], ['tutor', '#stem-decomposer-tutor-input'],
    ['decompHunt', '[aria-label="Decomposition hypothesis"]'],
  ])('includes material controls and the %s activity in its named tab panel', (tab, activitySelector) => {
    const view = mountTool(path, { tab, activeScene: 'kitchen', huntTarget: 'k_faucet' });
    const selectedTab = view.one('[role="tab"][aria-selected="true"]');
    const panel = view.one('#' + selectedTab.getAttribute('aria-controls'));
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(selectedTab.id);
    expect(panel.contains(view.one('[data-decomposer-material]'))).toBe(true);
    expect(panel.contains(view.one(activitySelector))).toBe(true);
  });

  it('focuses the new quiz question after Start Quiz removes the start button', () => {
    const view = mountTool(path, { tab: 'quiz' });
    activate(view.one('#stem-decomposer-quiz-start'));
    nextFrame();
    const heading = view.one('#stem-decomposer-quiz-question');
    expect(heading.tabIndex).toBe(-1);
    expect(heading.textContent.trim().length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(heading);
    expect(view.state()).toMatchObject({ quizMode: true });
  });

  it.each([['H₂O', 3, 4], ['NaCl', 2, 0]])('focuses readable feedback after answering %s and retains scoring rules', (choice, score, streak) => {
    const view = mountTool(path, { tab: 'quiz', quizMode: true, quizQ: question(), quizScore: 2, quizStreak: 3, bestStreak: 4, quizCorrectCount: 2 });
    activate(view.button(choice));
    nextFrame();
    const feedback = view.one('#stem-decomposer-quiz-feedback');
    expect(document.activeElement).toBe(feedback);
    expect(feedback.tabIndex).toBe(-1);
    const label = view.one('#' + feedback.getAttribute('aria-labelledby'));
    const description = view.one('#' + feedback.getAttribute('aria-describedby'));
    expect(label.textContent.trim().length).toBeGreaterThan(0);
    expect(description.textContent.trim().length).toBeGreaterThan(0);
    expect(feedback.contains(label) && feedback.contains(description)).toBe(true);
    expect(view.state()).toMatchObject({ quizScore: score, quizStreak: streak, bestStreak: 4,
      quizCorrectCount: score, quizQ: { answered: true, chosen: choice } });
    if (choice === 'NaCl') expect(description.textContent).toContain('NaCl is table salt. Water is H₂O.');
    expect(view.button(choice).disabled).toBe(true);
  });

  it('focuses the replacement question after Next Question without changing the score', () => {
    const answered = { ...question(), answered: true, chosen: 'H₂O' };
    const view = mountTool(path, { tab: 'quiz', quizMode: true, quizQ: answered, quizScore: 2 });
    activate(view.button('Next Question'));
    nextFrame();
    expect(document.activeElement).toBe(view.one('#stem-decomposer-quiz-question'));
    expect(view.state().quizQ).not.toBe(answered);
    expect(view.state().quizQ.answered).not.toBe(true);
    expect(view.state().quizScore).toBe(2);
  });

  it('resets quiz state and places focus on the restored Start Quiz button', () => {
    const view = mountTool(path, { tab: 'quiz', quizMode: true, quizQ: { ...question(), answered: true, chosen: 'H₂O' }, quizScore: 2, quizStreak: 2, bestStreak: 4 });
    activate(view.button('Reset Quiz'));
    nextFrame();
    expect(view.state()).toMatchObject({ quizMode: false, quizQ: null, quizScore: 0, quizStreak: 0, bestStreak: 4 });
    expect(document.activeElement).toBe(view.one('#stem-decomposer-quiz-start'));
    expect(view.one('#stem-decomposer-quiz-question')).toBeNull();
  });

  it('gives tutor controls descriptive names and exposes a named keyboard-scrollable conversation', () => {
    const view = mountTool(path, { tab: 'tutor' }, { callGemini: vi.fn() });
    expect(view.button('Send question')).toBeDefined();
    const suggestions = view.all('[data-decomposer-tutor-question]');
    expect(suggestions).toHaveLength(4);
    for (const suggestion of suggestions) {
      expect(name(suggestion)).toBe(suggestion.textContent.trim());
      expect(name(suggestion).length).toBeGreaterThan(12);
    }
    const log = view.one('[role="log"]');
    expect(log.tabIndex).toBe(0);
    expect(log.getAttribute('aria-label') || view.one('#' + log.getAttribute('aria-labelledby'))?.textContent).toBeTruthy();
    expect(log.getAttribute('aria-busy')).toBe('false');
    expect(view.one('#stem-decomposer-tutor-status').getAttribute('role')).toBe('status');
  });

  it('prevents a second tutor request while busy and reports the reply without taking the learner’s next focus', async () => {
    const request = deferred(), callGemini = vi.fn(() => request.promise);
    const view = mountTool(path, { tab: 'tutor' }, { callGemini });
    const input = view.one('#stem-decomposer-tutor-input');
    fill(input, 'Why does water evaporate?');
    activate(view.button('Send question'));
    await settle();
    nextFrame();
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(input);
    expect(view.one('[role="log"]').getAttribute('aria-busy')).toBe('true');
    const loading = view.one('#stem-decomposer-tutor-status').textContent;
    expect(loading.trim().length).toBeGreaterThan(0);
    fill(input, 'What happens after evaporation?');
    enter(input);
    for (const suggestion of view.all('[data-decomposer-tutor-question]')) {
      expect(suggestion.disabled).toBe(true);
      act(() => suggestion.click());
    }
    expect(view.button('Send question').disabled).toBe(true);
    await settle();
    expect(callGemini).toHaveBeenCalledTimes(1);
    const nextFocus = view.one('[data-decomposer-material]');
    nextFocus.focus();
    await act(async () => { request.resolve('Energy lets some water molecules escape into the air.'); await request.promise; });
    await settle();
    expect(view.one('[role="log"]').textContent).toContain('Energy lets some water molecules escape into the air.');
    expect(view.one('[role="log"]').getAttribute('aria-busy')).toBe('false');
    expect(view.one('#stem-decomposer-tutor-status').textContent).not.toBe(loading);
    expect(view.one('#stem-decomposer-tutor-status').textContent.trim().length).toBeGreaterThan(0);
    expect(document.activeElement).toBe(nextFocus);
    expect(view.state().aiQuestions).toBe(1);
    expect(view.state().aiMessages).toHaveLength(2);
  });

  it('exposes a failed tutor reply without stealing focus or leaving the conversation busy', async () => {
    const request = deferred(), callGemini = vi.fn(() => request.promise);
    const view = mountTool(path, { tab: 'tutor' }, { callGemini });
    activate(view.all('[data-decomposer-tutor-question]')[0]);
    await settle();
    nextFrame();
    expect(document.activeElement).toBe(view.one('#stem-decomposer-tutor-input'));
    const nextFocus = view.one('[data-decomposer-material]');
    nextFocus.focus();
    await act(async () => { request.reject(new Error('Offline fixture')); await Promise.resolve(); });
    await settle();
    expect(view.state().aiLoading).toBe(false);
    expect(view.state().aiMessages).toHaveLength(2);
    expect(view.one('[role="log"]').getAttribute('aria-busy')).toBe('false');
    expect(view.one('#stem-decomposer-tutor-status').textContent).toMatch(/try again|could not|unavailable/i);
    expect(document.activeElement).toBe(nextFocus);
  });

  it('explains unavailable tutoring and keeps request controls disabled', () => {
    const view = mountTool(path, { tab: 'tutor', aiInput: 'What is water?' }, { callGemini: null });
    expect(view.one('#stem-decomposer-tutor-status').textContent).toMatch(/unavailable|not available|connect/i);
    expect(view.button('Send question').disabled).toBe(true);
    for (const suggestion of view.all('[data-decomposer-tutor-question]')) expect(suggestion.disabled).toBe(true);
    enter(view.one('#stem-decomposer-tutor-input'));
    expect(view.state().aiLoading).not.toBe(true);
    expect(view.state().aiMessages || []).toHaveLength(0);
  });

  it('exposes global material selection through pressed state', () => {
    const view = mountTool(path);
    const water = view.one('[data-decomposer-material="Water"]'), salt = view.one('[data-decomposer-material="Table Salt"]');
    expect(water.getAttribute('aria-pressed')).toBe('true');
    expect(salt.getAttribute('aria-pressed')).toBe('false');
    activate(salt);
    expect(view.state().selected).toBe('Table Salt');
    expect(salt.getAttribute('aria-pressed')).toBe('true');
    expect(water.getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(salt);
  });

  it('exposes the chosen reactants through pressed state while retaining slot selection rules', () => {
    const view = mountTool(path, { tab: 'reactions' });
    const acid = view.one('[data-decomposer-reactant="Acetic Acid"]'), soda = view.one('[data-decomposer-reactant="Baking Soda"]');
    expect(acid.getAttribute('aria-pressed')).toBe('false');
    activate(acid);
    activate(soda);
    expect(view.state()).toMatchObject({ reactantA: 'Acetic Acid', reactantB: 'Baking Soda' });
    expect(acid.getAttribute('aria-pressed')).toBe('true');
    expect(soda.getAttribute('aria-pressed')).toBe('true');
  });

  it('names the temperature unit and updates its accessible value with the range input', () => {
    const view = mountTool(path, { tab: 'states', _simTemp: 25 });
    const range = view.one('input[type="range"]');
    expect(range.getAttribute('aria-label')).toBe('Temperature');
    expect(range.getAttribute('aria-valuetext')).toBe('25 degrees Celsius');
    fill(range, '80');
    expect(view.state()._simTemp).toBe(80);
    expect(range.getAttribute('aria-valuetext')).toBe('80 degrees Celsius');
  });

  it('updates the visualize action’s natural accessible name and pressed state when reassembling', () => {
    const view = mountTool(path, { tab: 'visualize' });
    const toggle = view.all('button').find(button => button.textContent.includes('Decompose') && button.getAttribute('aria-pressed') === 'false');
    expect(toggle).toBeDefined();
    expect(name(toggle)).toContain('Decompose');
    activate(toggle);
    expect(view.state().decomposed).toBe(true);
    expect(name(toggle)).toContain('Reassemble');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    activate(toggle);
    expect(view.state().decomposed).toBe(false);
    expect(name(toggle)).toContain('Decompose');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
});
