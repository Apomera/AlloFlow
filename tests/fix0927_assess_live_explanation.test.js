// @vitest-environment jsdom
// Live quiz overlay (student device): a fact check that DISPUTES the answer
// key must never be shown after the teacher reveals the answer. Before the
// 2026-09-27 fix the overlay rendered q.factCheck verbatim, so students read
// "CORRECTION / WARNING ... Actual Correct Answer: <other option>" next to the
// keyed answer. A confirmed (or legacy, unparsed) explanation still shows.
// Mutation check: FIX0927_OVERLAY_MODULE=<module built from the pre-fix source>.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = resolve(ROOT, 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Overlay, root, host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: key => key });
  window.__alloFocusTrapStack = [];
  window._fbDoc = (_db, ...parts) => parts.join('/');
  window._fbUpdateDoc = async () => {};
  const hostSource = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const start = hostSource.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
  const end = hostSource.indexOf('window.__alloHooks = { useFocusTrap };', start);
  window.__alloHooks = { useFocusTrap: new Function('useRef', 'useEffect', hostSource.slice(start, end) + '\nreturn useFocusTrap;')(React.useRef, React.useEffect) };
  window.AlloModules = window.AlloModules || {};
  new Function(readFileSync(resolve(ROOT, process.env.FIX0927_OVERLAY_MODULE || 'ui_modals_module.js'), 'utf8'))();
  Overlay = window.AlloModules.StudentQuizOverlay;
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove();
  root = host = null;
  window.__alloFocusTrapStack = [];
  delete window.__alloQuizChannelSend;
  if (window.AlloModules) delete window.AlloModules.QuizView;
});

const session = quizState => ({ quizState: { isActive: true, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {}, ...quizState }, roster: {} });
const mcq = factCheck => ({ question: 'Which planet is closest to the Sun?', options: ['Mercury', 'Venus', 'Earth'], correctAnswer: 'Venus', factCheck });

async function answerThenReveal(question) {
  window.__alloQuizChannelSend = () => true;
  const content = { type: 'quiz', data: { questions: [question] } };
  const props = { user: { uid: 's1' }, activeSessionCode: 'ABC', targetAppId: 'app', generatedContent: content };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Overlay, { ...props, sessionData: session() })); });
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
  const option = Array.from(host.querySelectorAll('button[data-help-key="quiz_student_answer_option"]'))[0];
  await act(async () => { option.click(); });
  await act(async () => { root.render(React.createElement(Overlay, { ...props, sessionData: session({ phase: 'revealed' }) })); });
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
  return host.querySelector('[data-quiz-explanation="true"]');
}

const DISPUTED = '**CORRECTION / WARNING:** The keyed answer is wrong.\n**Actual Correct Answer:** Mercury\nDISPUTED_TEXT';

describe('live overlay fact-check visibility', () => {
  it('hides a disputed check (legacy header form)', async () => {
    expect(await answerThenReveal(mcq(DISPUTED))).toBeNull();
    expect(host.textContent).not.toContain('DISPUTED_TEXT');
  });

  it('hides a check stamped disputed at generation', async () => {
    expect(await answerThenReveal({ ...mcq('[[KEY:DISPUTED:1]]\nDISPUTED_TEXT'), keyCheck: { status: 'disputed', checkedKey: 'Venus' } })).toBeNull();
    expect(host.textContent).not.toContain('DISPUTED_TEXT');
  });

  it('still shows a confirmed explanation, without the verdict token', async () => {
    const explanation = await answerThenReveal(mcq('[[KEY:CONFIRMED]]\n**Verified Correct Answer:** Venus\nCONFIRMED_TEXT'));
    expect(explanation).toBeTruthy();
    expect(explanation.textContent).toContain('CONFIRMED_TEXT');
    expect(explanation.textContent).not.toContain('[[KEY');
  });
});
