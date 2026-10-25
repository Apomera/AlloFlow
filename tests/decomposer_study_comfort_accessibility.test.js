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
const disposers = [];
let frames;

const answeredQuestion = () => ({ text: 'Which bond shares electrons?', opts: ['Covalent', 'Ionic'],
  answer: 'Covalent', chosen: 'Covalent', answered: true, concept: 'covalent bond' });

function mountTool(path, seed = {}, overrides = {}) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const award = vi.fn();
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ decomposer: {
      tab: 'quiz', selected: 'Water', materialsExplored: ['Water'], quizMode: true,
      quizQ: answeredQuestion(), quizScore: 3, quizStreak: 2, bestStreak: 2, vocabWordsStudied: [], ...seed,
    } });
    current = data.decomposer;
    setCurrent = patch => setData(prev => ({ ...prev, decomposer: { ...prev.decomposer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, t: translate, awardXP: award, ...overrides }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, award, state: () => current, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)],
    study: () => [...host.querySelectorAll('button')].find(button => button.textContent.includes('Study Term')) };
}

function activate(button) {
  expect(button).toBeTruthy();
  button.focus();
  act(() => button.click());
}

function nextFrame() {
  const pending = frames.splice(0);
  act(() => pending.forEach(callback => callback(16)));
}

function fill(input, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

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
  frames.splice(0).forEach(callback => callback(16));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Material Decomposer study comfort: %s', path => {
  it('focuses the concept and its definition and study acknowledgement when the credit action disappears', () => {
    const view = mountTool(path);
    expect(view.award).not.toHaveBeenCalled();
    const title = view.one('#stem-decomposer-concept-title');
    activate(view.study());
    nextFrame();
    expect(view.study()).toBeUndefined();
    expect(view.one('#stem-decomposer-concept-title')).toBe(title);
    expect(title.tagName).toBe('H5');
    expect(title.tabIndex).toBe(-1);
    expect(title.textContent).toContain('covalent bond');
    expect(document.activeElement).toBe(title);
    const descriptionIds = (title.getAttribute('aria-describedby') || '').split(/\s+/);
    expect(descriptionIds).toContain('stem-decomposer-concept-definition');
    expect(descriptionIds).toContain('stem-decomposer-concept-study-status');
    const definition = view.one('#stem-decomposer-concept-definition');
    const status = view.one('#stem-decomposer-concept-study-status');
    expect(definition.textContent).toMatch(/share electrons/i);
    expect(status.textContent).toMatch(/term studied/i);
    expect(status.closest('[hidden],[aria-hidden="true"]')).toBeNull();
    expect(view.state()).toMatchObject({ vocabWordsStudied: ['covalent bond'], quizScore: 3, quizStreak: 2, bestStreak: 2 });
    expect(view.award).toHaveBeenCalledTimes(1);
    expect(view.award).toHaveBeenCalledWith('decomposer', 5, 'Studied: covalent bond');
  });

  it('does not award the same concept again when another question reviews it', () => {
    const view = mountTool(path);
    activate(view.study());
    nextFrame();
    const next = view.all('button').find(button => button.getAttribute('aria-label') === 'Next Question');
    next.focus();
    view.patch({ quizQ: { ...answeredQuestion(), text: 'Do nonmetals share electrons in a covalent bond?' } });
    expect(view.study()).toBeUndefined();
    expect(view.one('#stem-decomposer-concept-study-status').textContent).toMatch(/term studied/i);
    expect(view.state().vocabWordsStudied).toEqual(['covalent bond']);
    expect(view.award).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(next);
  });

  it('restores an already studied concept without creating a second credit action or stealing focus on render', () => {
    const view = mountTool(path, { vocabWordsStudied: ['covalent bond'] });
    expect(view.study()).toBeUndefined();
    expect(view.one('#stem-decomposer-concept-study-status').textContent).toMatch(/term studied/i);
    expect(view.award).not.toHaveBeenCalled();
    const tab = view.one('#stem-decomposer-tab-quiz');
    tab.focus();
    view.patch({ _factIdx: 1 });
    expect(document.activeElement).toBe(tab);
    expect(view.award).not.toHaveBeenCalled();
  });

  it('leaves composing Enter untouched and submits once on the next ordinary Enter', async () => {
    const callGemini = vi.fn(() => Promise.resolve('A covalent bond shares electrons.'));
    const view = mountTool(path, { tab: 'tutor' }, { callGemini });
    const input = view.one('#stem-decomposer-tutor-input');
    fill(input, '水について教えてください');
    input.focus();
    const composingEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: true });
    expect(composingEnter.isComposing).toBe(true);
    act(() => input.dispatchEvent(composingEnter));
    await settle();
    expect(composingEnter.defaultPrevented).toBe(false);
    expect(callGemini).not.toHaveBeenCalled();
    expect(view.state().aiLoading).not.toBe(true);
    expect(view.state().aiInput).toBe('水について教えてください');
    expect(document.activeElement).toBe(input);
    const ordinaryEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, isComposing: false });
    act(() => input.dispatchEvent(ordinaryEnter));
    await settle();
    nextFrame();
    expect(ordinaryEnter.defaultPrevented).toBe(true);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(view.state().aiMessages).toHaveLength(2);
    expect(view.state().aiQuestions).toBe(1);
    expect(view.one('#stem-decomposer-tutor-status').textContent).toContain('A covalent bond shares electrons.');
    expect(document.activeElement).toBe(input);
  });

  it.each([false, true])('keeps the Hunt target cue static when reduced motion is %s', reducedMotion => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })));
    const view = mountTool(path, { tab: 'scenes', activeScene: 'kitchen', huntTarget: 'k_faucet' });
    const target = view.one('[data-decomposer-object="k_faucet"]');
    const cue = target.firstElementChild;
    expect(cue.style.borderStyle).toBe('solid');
    expect(parseFloat(cue.style.borderWidth)).toBeGreaterThan(0);
    expect(parseFloat(cue.style.opacity)).toBeGreaterThan(0);
    expect(['', 'none']).toContain(cue.style.animation);
    expect(['', 'none']).toContain(getComputedStyle(cue).animation);
    expect(view.one('#stem-decomposer-hunt-status').textContent).toContain('H₂O');
    expect(view.one('#stem-decomposer-hunt-status').textContent).toContain('Water');
  });
});
