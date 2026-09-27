import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let host, root, state;

function mount(overrides = {}) {
  const tool = loadTool('stem_lab/stem_tool_bridgelab.js', 'bridgeLab');
  function Lab() {
    const [value, setValue] = React.useState({ bridgeLab: { tab: 'quiz', ...overrides } });
    state = value.bridgeLab;
    return tool.render(makeCtx({ toolData: value, setToolData: setValue }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Lab)));
}

function button(text) { return [...host.querySelectorAll('button')].find(node => node.textContent.includes(text)); }

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  document.getElementById('allo-live-bridgelab')?.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Bridge Lab accessible quiz', () => {
  it('groups named native radio choices and keeps one answer per question', () => {
    mount();
    const groups = host.querySelectorAll('fieldset');
    expect(groups.length).toBe(15);
    for (const group of groups) {
      expect(group.querySelector('legend').textContent.length).toBeGreaterThan(10);
      const options = [...group.querySelectorAll('input[type="radio"]')];
      expect(options.length).toBe(4);
      expect(new Set(options.map(option => option.name)).size).toBe(1);
      expect(options.every(option => option.closest('label').textContent.trim())).toBe(true);
    }
    const choices = groups[0].querySelectorAll('input');
    act(() => choices[1].click());
    expect(choices[1].checked).toBe(true);
    act(() => choices[2].click());
    expect(choices[1].checked).toBe(false);
    expect(choices[2].checked).toBe(true);
    expect(state.quizAnswers[0]).toBe(2);
    expect(button('Answer all questions').disabled).toBe(true);
  });

  it('requires all valid answers, then focuses and announces the result', () => {
    mount();
    const groups = [...host.querySelectorAll('fieldset')];
    for (const group of groups) act(() => group.querySelector('input').click());
    expect(button('Submit quiz').disabled).toBe(false);
    act(() => button('Submit quiz').click());
    expect(state.quizSubmitted).toBe(true);
    const summary = host.querySelector('#bridge-quiz-result');
    expect(document.activeElement).toBe(summary);
    expect(summary.textContent).toContain('5 / 15');
    expect(document.getElementById('allo-live-bridgelab').textContent).toContain('5 / 15');
    expect([...host.querySelectorAll('a')].some(link => link.href.includes('fhwa.dot.gov/bridge/lrfd'))).toBe(true);
    act(() => button('Retake quiz').click());
    expect(host.querySelectorAll('input[type="radio"]:checked').length).toBe(0);
    expect(button('Answer all questions').disabled).toBe(true);
  });

  it('does not count corrupt restored answer indexes as completed questions', () => {
    mount({ quizAnswers: Array(15).fill(99) });
    expect(button('Answer all questions (0/15)').disabled).toBe(true);
  });

  it('derives restored scores from the actual responses and names missing answers', () => {
    mount({ quizAnswers: [], quizSubmitted: true, quizCorrect: 15 });
    expect(host.querySelector('#bridge-quiz-result').textContent).toContain('0 / 15');
    expect(host.textContent).toContain('No answer recorded');
    expect(host.textContent).toContain('no single universal bridge safety factor');
  });

  it('handles a malformed saved answer collection without throwing', () => {
    mount({ quizAnswers: { 0: 2 } });
    expect(button('Answer all questions (0/15)').disabled).toBe(true);
  });
});
