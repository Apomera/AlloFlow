// @vitest-environment jsdom
// Student live quiz overlay: keyboard, connection and translation (2026-09-27).
//
// - While the quiz covers the screen it traps focus, so the host's connection
//   banner (outside the dialog) could not be reached by keyboard. The host now
//   passes the connection status in and the overlay shows it inside the trap,
//   reporting whether it covers the screen so the host can hide its own copy.
// - Opening the quiz focused "Minimize" (first in DOM since 2026-09-08); the
//   first answer is now nominated with data-autofocus, and focus that answering
//   dropped to <body> is handed to the next question's first control.
// - On reveal the student's own result comes first, then the correct answer,
//   then the (long) explanation; the live region announces only the result.
// - Every visible string goes through t(): rendered with a translator that
//   marks every key, no registered English text may appear.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = resolve(ROOT, 'desktop/web-app/node_modules');
const uiStrings = JSON.parse(readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8'));
const overlaySource = readFileSync(process.env.QUIZ_OVERLAY_SOURCE || resolve(ROOT, 'ui_modals_source.jsx'), 'utf8');
let React;
let ReactDOMClient;
let act;
let Overlay;
let root;
let host;
let translate = (key) => key;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: (key, params) => translate(key, params) });
  window.__alloFocusTrapStack = [];
  window._fbDoc = (_db, ...parts) => parts.join('/');
  window._fbUpdateDoc = async () => {};
  const hostSource = readFileSync(resolve(ROOT, process.env.QUIZ_HOST_SOURCE || 'AlloFlowANTI.txt'), 'utf8');
  const start = hostSource.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
  const end = hostSource.indexOf('window.__alloHooks = { useFocusTrap };', start);
  window.__alloHooks = { useFocusTrap: new Function('useRef', 'useEffect', hostSource.slice(start, end) + '\nreturn useFocusTrap;')(React.useRef, React.useEffect) };
  loadAlloModule(process.env.QUIZ_OVERLAY_MODULE || 'ui_modals_module.js');
  Overlay = window.AlloModules.StudentQuizOverlay;
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = host = null;
  window.__alloFocusTrapStack = [];
  translate = (key) => key;
  vi.useRealTimers();
});

const mcq = { question: 'Which answer is correct?', options: ['Alpha', 'Beta', 'Gamma'], correctAnswer: 'Alpha', factCheck: 'Because Alpha.' };
const session = (quizState) => ({ quizState: { isActive: true, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {}, ...quizState }, roster: {} });
const content = (questions = [mcq]) => ({ type: 'quiz', data: { questions } });

async function mount(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Overlay, { user: { uid: 's1' }, activeSessionCode: 'ABC', targetAppId: 'app', ...props })); });
  await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  return host.querySelector('[role="dialog"]');
}
async function rerender(props) {
  await act(async () => { root.render(React.createElement(Overlay, { user: { uid: 's1' }, activeSessionCode: 'ABC', targetAppId: 'app', ...props })); });
  await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
}

describe('connection notice inside the quiz', () => {
  it('renders inside the dialog with a Reconnect button wired to the host', async () => {
    const onConnectionAction = vi.fn();
    const dialog = await mount({ sessionData: session(), generatedContent: content(), connectionStatus: 'mailbox-stalled', onConnectionAction });
    const notice = dialog.querySelector('[data-quiz-connection-notice="mailbox-stalled"]');
    expect(notice).toBeTruthy();
    expect(notice.textContent).toContain('live_connection.retrying');
    const button = Array.from(notice.querySelectorAll('button')).find((b) => b.textContent === 'live_connection.reconnect');
    expect(dialog.contains(button)).toBe(true);
    button.click();
    expect(onConnectionAction).toHaveBeenCalledWith('reconnect');
  });

  it('offers Dismiss, not Reconnect, for a teacher-status warning', async () => {
    const onConnectionAction = vi.fn();
    const dialog = await mount({ sessionData: session(), generatedContent: content(), connectionStatus: 'host-stale', onConnectionAction });
    const notice = dialog.querySelector('[data-quiz-connection-notice="host-stale"]');
    expect(notice.textContent).toContain('live_connection.host_stale');
    expect(notice.textContent).not.toContain('live_connection.reconnect');
    notice.querySelector('button').click();
    expect(onConnectionAction).toHaveBeenCalledWith('dismiss');
  });

  it('shows nothing without a status', async () => {
    const dialog = await mount({ sessionData: session(), generatedContent: content(), connectionStatus: '', onConnectionAction: vi.fn() });
    expect(dialog.querySelector('[data-quiz-connection-notice]')).toBeNull();
  });

  it('tells the host when it covers the screen, and when it stops', async () => {
    const onCoverChange = vi.fn();
    const dialog = await mount({ sessionData: session(), generatedContent: content(), onCoverChange });
    expect(onCoverChange).toHaveBeenLastCalledWith(true);
    const minimize = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'quiz.live_student.minimize');
    await act(async () => { minimize.click(); });
    expect(onCoverChange).toHaveBeenLastCalledWith(false);
    await act(async () => { host.querySelector('[data-allo-ui-modal="student-quiz-return"]').click(); });
    expect(onCoverChange).toHaveBeenLastCalledWith(true);
    await act(async () => { root.unmount(); });
    root = null;
    expect(onCoverChange).toHaveBeenLastCalledWith(false);
  });
});

describe('keyboard focus', () => {
  it('opens on the first answer, not on Minimize', async () => {
    await mount({ sessionData: session(), generatedContent: content() });
    expect(document.activeElement.getAttribute('data-help-key')).toBe('quiz_student_answer_option');
    expect(document.activeElement.textContent).toContain('Alpha');
  });

  it('hands focus to the next question after answering dropped it', async () => {
    const questions = [mcq, { question: 'Second?', options: ['Delta', 'Epsilon'], correctAnswer: 'Delta' }];
    window.__alloQuizChannelSend = () => true;
    await mount({ sessionData: session(), generatedContent: content(questions) });
    await act(async () => { document.activeElement.click(); });
    // Answering disabled the focused button. Browsers then drop focus to <body>;
    // jsdom leaves it there, and React reuses that same <button> for the next
    // question's first answer, so a test that stopped here would pass with no
    // hand-off at all. Drop focus the way a browser does.
    expect(document.activeElement.disabled).toBe(true);
    const elsewhere = document.createElement('input');
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    elsewhere.remove();
    expect(document.activeElement).toBe(document.body);
    await rerender({ sessionData: session({ currentQuestionIndex: 1 }), generatedContent: content(questions) });
    // Name the element: <body>'s text also contains "Delta", so a text check
    // alone passes with focus still lost.
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement.getAttribute('data-help-key')).toBe('quiz_student_answer_option');
    expect(document.activeElement.textContent).toContain('Delta');
    delete window.__alloQuizChannelSend;
  });

  it('never pulls focus away from a control the student is using', async () => {
    const questions = [mcq, { question: 'Second?', options: ['Delta', 'Epsilon'], correctAnswer: 'Delta' }];
    const dialog = await mount({ sessionData: session(), generatedContent: content(questions) });
    const minimize = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'quiz.live_student.minimize');
    minimize.focus();
    await rerender({ sessionData: session({ currentQuestionIndex: 1 }), generatedContent: content(questions) });
    expect(document.activeElement).toBe(minimize);
  });
});

describe('reveal order', () => {
  it('result, then the correct answer, then the explanation; only the result is live', async () => {
    window.__alloQuizChannelSend = () => true;
    const dialog = await mount({ sessionData: session(), generatedContent: content() });
    const alpha = Array.from(dialog.querySelectorAll('button[data-help-key="quiz_student_answer_option"]'))[0];
    await act(async () => { alpha.click(); });
    await rerender({ sessionData: session({ phase: 'revealed' }), generatedContent: content() });
    const result = Array.from(host.querySelectorAll('[role="status"]')).find((el) => el.textContent.includes('quiz.status.result_correct'));
    const review = host.querySelector('[data-quiz-answer-review="true"]');
    const explanation = host.querySelector('[data-quiz-explanation="true"]');
    expect(result && review && explanation).toBeTruthy();
    const FOLLOWING = window.Node.DOCUMENT_POSITION_FOLLOWING;
    expect(result.compareDocumentPosition(review) & FOLLOWING).toBeTruthy();
    expect(review.compareDocumentPosition(explanation) & FOLLOWING).toBeTruthy();
    expect(result.contains(explanation)).toBe(false);
    expect(result.textContent).not.toContain('Because Alpha.');
    delete window.__alloQuizChannelSend;
  });
});

describe('translation', () => {
  const english = new Set(Object.values(uiStrings.quiz.live_student).concat([
    uiStrings.live_connection.host_paused, uiStrings.live_connection.host_stale,
    uiStrings.live_connection.dismiss, uiStrings.live_connection.dismiss_aria,
  // Skip pure placeholders and lowercase one-word labels ("size", "process"):
  // those also occur inside the rendered key markers themselves.
  ]).filter((text) => !/^\{[a-z]+\}/.test(text) && !/^[a-z-]+$/.test(text) && text.length > 3));

  it('every key the overlay uses is registered, and each fallback matches the registry', () => {
    const used = [...overlaySource.matchAll(/t\('((?:quiz\.live_student|live_connection)\.[a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(70);
    for (const key of new Set(used)) {
      const value = key.split('.').reduce((node, part) => node && node[part], uiStrings);
      expect(typeof value, key).toBe('string');
    }
    const withFallback = [...overlaySource.matchAll(/t\('((?:quiz\.live_student|live_connection)\.[a-z0-9_]+)'(?:, \{[^}]*\})?\) \|\| '((?:[^'\\]|\\.)*)'/g)];
    expect(withFallback.length).toBeGreaterThan(70);
    for (const [, key, fallback] of withFallback) {
      const value = key.split('.').reduce((node, part) => node && node[part], uiStrings);
      expect(fallback.replace(/\\'/g, "'"), key).toBe(value);
    }
  });

  const scenarios = [
    ['multiple choice, answering', { sessionData: session(), generatedContent: content(), connectionStatus: 'host-paused', onConnectionAction: () => {} }],
    ['boss battle ended', { sessionData: session({ mode: 'boss-battle', phase: 'battle-complete', bossStats: { name: '', maxHP: 100, currentHP: 40, classHP: 80, endReason: 'questions-complete', roundFeedback: { scoringPaused: true } } }), generatedContent: content() }],
    ['likert', { sessionData: session(), generatedContent: content([{ question: 'Agree?', type: 'likert', options: ['1', '2', '3', '4', '5'], scale: { steps: 5 } }]) }],
    ['written response', { sessionData: session(), generatedContent: content([{ question: 'Explain.', type: 'self-explanation' }]) }],
    ['fill in the blank', { sessionData: session(), generatedContent: content([{ question: 'The ___ is red.', type: 'fill-blank', expectedFill: 'apple' }]) }],
    ['numeric', { sessionData: session(), generatedContent: content([{ question: 'How many?', type: 'numeric-response', correctValue: 4, unit: 'm' }]) }],
    ['multi-select', { sessionData: session(), generatedContent: content([{ question: 'Pick all.', type: 'multi-select', options: ['One', 'Two'], correctAnswers: ['One'] }]) }],
    ['answer and evidence', { sessionData: session(), generatedContent: content([{ question: 'Claim?', type: 'answer-evidence', answerOptions: ['Yes', 'No'], evidenceOptions: ['E1', 'E2'] }]) }],
    ['sequence', { sessionData: session(), generatedContent: content([{ question: 'Order?', type: 'sequence-sense', items: ['a', 'b', 'c'] }]) }],
    ['relation mismatch', { sessionData: session(), generatedContent: content([{ question: 'Mismatch?', type: 'relation-mismatch', pairs: [{ left: 'x', right: 'y' }, { left: 'p', right: 'q' }] }]) }],
    ['waiting for the teacher', { sessionData: session({ phase: 'lobby' }), generatedContent: content() }],
  ];
  for (const [name, props] of scenarios) {
    it('shows no untranslated text: ' + name, async () => {
      translate = (key) => '⟦' + key + '⟧';
      const dialog = await mount(props);
      expect(dialog, name).toBeTruthy();
      const visible = dialog.textContent + ' ' + Array.from(dialog.querySelectorAll('[aria-label]')).map((el) => el.getAttribute('aria-label')).join(' ');
      const leaked = [...english].filter((text) => visible.includes(text));
      expect(leaked, name).toEqual([]);
    });
  }
});
