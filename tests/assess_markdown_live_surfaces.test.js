// @vitest-environment jsdom
// AI quiz text keeps its light markdown (bold, italic, lists) beyond the Assess card: on the student's
// live-quiz screen, the teacher's live presenter, and the class dashboard. Labels get plain words.
// The class analytics PDF puts its HTML into the page with innerHTML, and its question text comes from
// student progress files, so markup there must arrive escaped, never as live elements.
//
// Mutation check: LIVE_MD_UI_MODALS=<pre-change ui_modals_module.js> and
// LIVE_MD_TEACHER=<pre-change teacher_module.js> make these tests fail.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = resolve(ROOT, 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
const { act } = require(resolve(modulesDir, 'react-dom/test-utils'));
let Overlay, Controls, Dashboard, markdown;
const roots = [];

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: key => key });
  window.__alloT = key => key;
  window.AlloIcons = window.AlloIcons || {};
  window.__alloFocusTrapStack = [];
  window._fbDoc = (_db, ...parts) => parts.join('/');
  window._fbUpdateDoc = async () => {};
  const hostSource = readFileSync(resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');
  const start = hostSource.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
  const end = hostSource.indexOf('window.__alloHooks = { useFocusTrap };', start);
  window.__alloHooks = { useFocusTrap: new Function('useRef', 'useEffect', hostSource.slice(start, end) + '\nreturn useFocusTrap;')(React.useRef, React.useEffect) };
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync(resolve(ROOT, 'view_quiz_module.js'), 'utf8'))(window);
  markdown = window.AlloModules.QuizView.markdown;
  new Function(readFileSync(resolve(ROOT, process.env.LIVE_MD_UI_MODALS || 'ui_modals_module.js'), 'utf8'))();
  new Function(readFileSync(resolve(ROOT, process.env.LIVE_MD_TEACHER || 'teacher_module.js'), 'utf8'))();
  Overlay = window.AlloModules.StudentQuizOverlay;
  Controls = window.AlloModules.TeacherLiveQuizControls;
  Dashboard = window.AlloModules.TeacherDashboard;
});

afterEach(() => {
  vi.restoreAllMocks();
  while (roots.length) { const { root, host } = roots.pop(); act(() => root.unmount()); host.remove(); }
  window.__alloFocusTrapStack = [];
  delete window.__alloQuizChannelSend;
  delete window.jspdf;
  window.AlloModules.QuizView = window.AlloModules.QuizView || { markdown };
  if (!window.AlloModules.QuizView.markdown) window.AlloModules.QuizView.markdown = markdown;
});

async function mount(type, props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  await act(async () => { root.render(React.createElement(type, props)); });
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
  return { host, rerender: async next => { await act(async () => { root.render(React.createElement(type, next)); }); await act(async () => { await new Promise(r => setTimeout(r, 5)); }); } };
}
const texts = (host, sel) => [...host.querySelectorAll(sel)].map(el => el.textContent);

describe("the student's live-quiz screen", () => {
  const question = {
    question: 'Which animal is **not** a mammal?', options: ['*Felis catus*', 'Salmon', 'Whale'], correctAnswer: 'Salmon',
    explanation: '**Salmon** breathe with gills.', factCheck: '[[KEY:CONFIRMED]]\n**Verified Correct Answer:** Salmon\n* Fish have gills.\n* Mammals nurse their young.'
  };
  const session = quizState => ({ quizState: { isActive: true, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {}, ...quizState }, roster: {} });
  const props = sessionData => ({ user: { uid: 's1' }, activeSessionCode: 'ABC', targetAppId: 'app', generatedContent: { type: 'quiz', data: { questions: [question] } }, sessionData });

  it('formats the question, options, review, and explanation; option names stay plain', async () => {
    window.__alloQuizChannelSend = () => true;
    const view = await mount(Overlay, props(session()));
    expect(view.host.querySelector('#student-quiz-question').innerHTML).toBe('Which animal is <strong>not</strong> a mammal?');
    const options = [...view.host.querySelectorAll('button[data-help-key="quiz_student_answer_option"]')];
    expect(options[0].querySelector('em')?.textContent).toBe('Felis catus');
    expect(options[0].getAttribute('aria-label')).toBe('Felis catus');
    await act(async () => { options[1].click(); });
    await view.rerender(props(session({ phase: 'revealed' })));
    const review = view.host.querySelector('[data-quiz-answer-review="true"]');
    expect(texts(review, 'strong')).toContain('Salmon');
    const explanation = view.host.querySelector('[data-quiz-explanation="true"]');
    expect(texts(explanation, 'li')).toEqual(['Fish have gills.', 'Mammals nurse their young.']);
    expect(explanation.textContent).not.toContain('**');
    expect(explanation.textContent).not.toContain('[[KEY');
  });

  it('without the Assess view the explanation still bolds and never echoes markup', async () => {
    window.__alloQuizChannelSend = () => true;
    const saved = window.AlloModules.QuizView;
    delete window.AlloModules.QuizView;
    try {
      const hostile = { ...question, factCheck: '**Verified Correct Answer:** Salmon\n<img src="x" data-injected="1">' };
      const p = sessionData => ({ ...props(sessionData), generatedContent: { type: 'quiz', data: { questions: [hostile] } } });
      const view = await mount(Overlay, p(session()));
      expect(view.host.querySelector('#student-quiz-question').textContent).toBe('Which animal is **not** a mammal?');
      await act(async () => { view.host.querySelectorAll('button[data-help-key="quiz_student_answer_option"]')[1].click(); });
      await view.rerender(p(session({ phase: 'revealed' })));
      const explanation = view.host.querySelector('[data-quiz-explanation="true"]');
      expect(texts(explanation, 'strong')).toContain('Verified Correct Answer:');
      expect(explanation.querySelector('[data-injected]')).toBeNull();
    } finally { window.AlloModules.QuizView = saved; }
  });
});

describe("the teacher's live presenter", () => {
  it('formats the current question on the presenter screen', async () => {
    const noop = () => {};
    const sessionData = { groups: {}, roster: {}, quizState: { isActive: true, currentQuestionIndex: 0, phase: 'question', responses: {}, responseReceipts: {}, mode: 'standard', bossStats: null, teamScores: {}, scoringPolicy: 'standard', allResponses: {}, activityId: 'a1', roundId: 'r1' } };
    const view = await mount(Controls, {
      sessionData, generatedContent: { data: { resources: [], questions: [{ question: 'Which planet is **closest** to the Sun?', options: ['*Mercury*', 'Venus'], correctAnswer: '*Mercury*', imageUrl: '' }] } },
      activeSessionCode: 'ABCD', appId: 'test', onGenerateImage: noop, onRefineImage: noop, onCreateGroup: noop, onAssignStudent: noop, onSetGroupResource: noop,
      onSetGroupLanguage: noop, onSetGroupProfile: noop, onDeleteGroup: noop, onUpdateQuestionRoutingRules: noop, history: [], callGemini: async () => '', addToast: noop
    });
    const heading = [...view.host.querySelectorAll('h2')].find(el => el.textContent.includes('closest to the Sun'));
    expect(heading, 'presenter question heading').toBeTruthy();
    expect(heading.innerHTML).toBe('Which planet is <strong>closest</strong> to the Sun?');
    expect(view.host.textContent).not.toContain('**closest**');
  });
});

describe('the class dashboard', () => {
  const missed = '<img src="x" data-injected="1">Which animal is **not** a mammal?';
  const student = { id: 'u1', studentNickname: 'Brave Otter', timestamp: '2026-10-27T12:00:00.000Z', history: [{ id: 'q1', type: 'quiz', data: { questions: [{ question: missed, options: ['Cat', 'Salmon'], correctAnswer: 'Salmon' }] } }], responses: { q1: { 0: 0 } }, stats: { totalXP: 10 } };
  const dashboardProps = () => ({ onClose() {}, dashboardData: [student], setDashboardData() {}, addToast() {}, setSelectedStudentId() {}, selectedStudentId: null, setDashboardView() {}, dashboardView: 'list', generateResourceHTML: () => '', onOpenBehaviorLens() {}, callGemini: async () => '' });

  it('formats a missed question in Insights, as text', async () => {
    const view = await mount(Dashboard, dashboardProps());
    await act(async () => { view.host.querySelector('#teacher-dashboard-tab-insights').click(); });
    const item = [...view.host.querySelectorAll('p')].find(el => el.textContent.includes('a mammal?'));
    expect(item, 'misconception row').toBeTruthy();
    expect(texts(item, 'strong')).toEqual(['not']);
    expect(item.querySelector('[data-injected]')).toBeNull();
  });

  it('escapes question text in the analytics PDF instead of injecting it into the page', async () => {
    let captured = null;
    window.jspdf = { jsPDF: function () { this.html = async container => { captured = container.cloneNode(true); }; } };
    const view = await mount(Dashboard, dashboardProps());
    await act(async () => { view.host.querySelector('#teacher-dashboard-tab-insights').click(); });
    await act(async () => { view.host.querySelector('[data-help-key="dashboard_export_pdf_btn"]').click(); });
    await act(async () => { await new Promise(r => setTimeout(r, 5)); });
    expect(captured, 'the report was handed to jsPDF').toBeTruthy();
    expect(captured.querySelector('[data-injected]')).toBeNull();
    expect(captured.textContent).toContain('<img src="x" data-injected="1">Which animal is not a mammal?');
  });
});
