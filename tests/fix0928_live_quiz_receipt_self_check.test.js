// @vitest-environment jsdom
// 2026-09-28 decision 4: a live-quiz answer that failed peer-to-peer delivery stays
// on the student's device and only a content-free participation receipt is saved.
// After the reveal it stays "not scored" and never shows "Incorrect". For a
// single-answer choice item the student now also gets a local self-check that
// says it was not recorded. Delivered answers keep the scored result card, and
// unscored or advanced items get no self-check (and no verdict card).
// Mutation check: FIX0928_OVERLAY_MODULE=<module built from the pre-fix source>.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = resolve(ROOT, 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Overlay, root, host;
const writes = [];
// English for the scored result card; every other key falls back to the
// component's English copy, as it does when a translation is missing.
const COPY = { 'quiz.status.result_correct': 'Correct!', 'quiz.status.result_incorrect': 'Incorrect', 'quiz.result_label': 'Result' };
const t = (key) => COPY[key] || '';

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloFocusTrapStack = [];
  window._fbDoc = (_db, ...parts) => parts.join('/');
  window._fbUpdateDoc = async (ref, payload) => { writes.push({ ref, payload }); };
  const hostSource = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const start = hostSource.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
  const end = hostSource.indexOf('window.__alloHooks = { useFocusTrap };', start);
  window.__alloHooks = { useFocusTrap: new Function('useRef', 'useEffect', hostSource.slice(start, end) + '\nreturn useFocusTrap;')(React.useRef, React.useEffect) };
  window.AlloModules = window.AlloModules || {};
  new Function(readFileSync(resolve(ROOT, process.env.FIX0928_OVERLAY_MODULE || 'ui_modals_module.js'), 'utf8'))();
  Overlay = window.AlloModules.StudentQuizOverlay;
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = host = null;
  window.__alloFocusTrapStack = [];
  writes.length = 0;
  delete window.__alloQuizChannelSend;
  vi.restoreAllMocks();
});

const session = (quizState) => ({ quizState: { isActive: true, activityId: 'quiz:ABC:attempt-1', mode: 'live-pulse', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {}, ...quizState }, roster: {} });
const mcq = (extra = {}) => ({ question: 'Which planet is closest to the Sun?', options: ['Mercury', 'Venus', 'Earth'], correctAnswer: 'Mercury', ...extra });
const text = () => host.querySelector('[role="dialog"]').textContent;
const selfCheck = () => host.querySelector('[data-live-quiz-self-check]');

async function mountQuestion(question, { delivered }) {
  window.__alloQuizChannelSend = vi.fn(() => delivered);
  const content = { type: 'quiz', data: { questions: [question] } };
  const props = { user: { uid: 's1' }, activeSessionCode: 'ABC', targetAppId: 'app', generatedContent: content };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Overlay, { ...props, sessionData: session() })); });
  return {
    reveal: async () => { await act(async () => { root.render(React.createElement(Overlay, { ...props, sessionData: session({ phase: 'revealed' }) })); }); },
  };
}
async function choose(index) {
  const option = Array.from(host.querySelectorAll('button[data-help-key="quiz_student_answer_option"]'))[index];
  await act(async () => { option.click(); await Promise.resolve(); });
}

describe('Receipt-only live quiz answers: local self-check after the reveal', () => {
  it('a different choice names the correct answer and the choice, says it was not recorded, and never says Incorrect', async () => {
    const quiz = await mountQuestion(mcq(), { delivered: false });
    await choose(1);
    expect(writes).toHaveLength(1);
    expect(JSON.stringify(writes[0].payload)).not.toContain('Venus');
    // Retry stays available while the question is open.
    expect(Array.from(host.querySelectorAll('button')).some(b => b.textContent === 'Retry sending answer')).toBe(true);
    await quiz.reveal();
    expect(text()).toContain('Your teacher received participation only. This answer was not scored.');
    expect(selfCheck()?.getAttribute('data-live-quiz-self-check')).toBe('different');
    expect(selfCheck().textContent).toBe('The correct answer was A (Mercury). You chose B (Venus). This was not recorded.');
    // Announced through the existing status region.
    expect(selfCheck().closest('[role="status"]')).not.toBeNull();
    expect(text()).not.toContain('Incorrect');
    expect(text()).not.toContain('Correct!');
    expect(Array.from(host.querySelectorAll('button')).some(b => b.textContent === 'Retry sending answer')).toBe(false);
  });

  it('a matching choice says it matched and was not recorded, with no scored result card', async () => {
    const quiz = await mountQuestion(mcq(), { delivered: false });
    await choose(0);
    await quiz.reveal();
    expect(selfCheck()?.getAttribute('data-live-quiz-self-check')).toBe('matched');
    expect(selfCheck().textContent).toBe('Your answer matched the correct answer. It was not recorded because it did not reach your teacher.');
    expect(text()).toContain('This answer was not scored.');
    expect(text()).not.toContain('Correct!');
    expect(text()).not.toContain('Incorrect');
  });

  it('a delivered answer keeps the scored result card and gets no self-check', async () => {
    const quiz = await mountQuestion(mcq(), { delivered: true });
    await choose(1);
    expect(writes).toHaveLength(0);
    await quiz.reveal();
    expect(text()).toContain('Incorrect');
    expect(selfCheck()).toBeNull();
    expect(text()).not.toContain('This was not recorded');
    expect(text()).not.toContain('not scored');
  });

  it('an opinion item gets no self-check even when it carries a key', async () => {
    const quiz = await mountQuestion(mcq({ itemType: 'opinion-mcq' }), { delivered: false });
    await choose(1);
    await quiz.reveal();
    expect(text()).toContain('This answer was not scored.');
    expect(selfCheck()).toBeNull();
    expect(text()).not.toContain('not recorded');
  });

  it('an advanced item gets no self-check and no verdict card when only a receipt was saved', async () => {
    const quiz = await mountQuestion({ type: 'multi-select', question: 'Select all planets.', options: ['Mars', 'Moon', 'Sun'], correctAnswers: ['Mars'] }, { delivered: false });
    const choices = Array.from(host.querySelectorAll('[aria-label="Select every answer that applies"] button'));
    await act(async () => { choices[1].click(); });
    await act(async () => { Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Submit selections')).click(); await Promise.resolve(); });
    expect(writes).toHaveLength(1);
    await quiz.reveal();
    expect(text()).toContain('This answer was not scored.');
    expect(selfCheck()).toBeNull();
    expect(text()).not.toContain('This response needs another look.');
    expect(text()).not.toContain('Correct response.');
    expect(text()).not.toContain('Partially correct response.');
  });

  it('a delivered advanced item still shows its verdict card', async () => {
    const quiz = await mountQuestion({ type: 'multi-select', question: 'Select all planets.', options: ['Mars', 'Moon', 'Sun'], correctAnswers: ['Mars'] }, { delivered: true });
    const choices = Array.from(host.querySelectorAll('[aria-label="Select every answer that applies"] button'));
    await act(async () => { choices[1].click(); });
    await act(async () => { Array.from(host.querySelectorAll('button')).find(b => b.textContent.includes('Submit selections')).click(); await Promise.resolve(); });
    await quiz.reveal();
    expect(text()).toMatch(/This response needs another look\.|Partially correct response\.|Response submitted for review\./);
    expect(selfCheck()).toBeNull();
  });
});
