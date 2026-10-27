// Assessment text formatting: AI-written stems, options, feedback, and explanations in Assess and
// Concept Quest render light markdown (bold, italic, code, line breaks, lists) instead of showing
// asterisks, while math-looking text, blanks, and identifiers stay exactly as written, and
// screen-reader names get plain words.
//
// Mutation check: MD_QUIZ_MODULE=<pre-change view_quiz_module.js> makes these tests fail.

import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import fs, { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { renderToStaticMarkup } = require('../desktop/web-app/node_modules/react-dom/server');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const QUIZ_MODULE = process.env.MD_QUIZ_MODULE || 'view_quiz_module.js';
const t = key => key;
let QuizView, md, Question;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.__alloT = t;
  window.AlloIcons = {};
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync(QUIZ_MODULE, 'utf8'))(window);
  QuizView = window.AlloModules.QuizView;
  md = QuizView.markdown || {};
  window.AlloModules.ConceptQuestSoloEngine = { isAnswerKeyDisputed: () => false, answerGuide: item => item.correctAnswer || '' };
  const compiled = require('@babel/core').transformSync(fs.readFileSync('concept_quest_solo_question_source.jsx', 'utf8'), {
    presets: [], plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] }
  }).code;
  Question = new Function('React', compiled + '\nreturn ConceptQuestSoloQuestion;')(React);
});
let root, host;
async function render(element) {
  if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); }
  await act(async () => root.render(element));
}
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null; localStorage.clear();
});
const html = node => renderToStaticMarkup(React.createElement('div', null, node));

describe('the formatter', () => {
  it('formats bold, italic, code, nesting, and line breaks', () => {
    expect(html(md.inline('Which is **not** a mammal?'))).toBe('<div>Which is <strong>not</strong> a mammal?</div>');
    expect(html(md.inline('The cat is *Felis catus*.'))).toBe('<div>The cat is <em>Felis catus</em>.</div>');
    expect(html(md.inline('Use __both__ and _one_.'))).toBe('<div>Use <strong>both</strong> and <em>one</em>.</div>');
    expect(html(md.inline('Run `npm test` now'))).toBe('<div>Run <code class="font-mono">npm test</code> now</div>');
    expect(html(md.inline('**Key *idea* here**'))).toBe('<div><strong>Key <em>idea</em> here</strong></div>');
    expect(html(md.inline('Line one\nLine two'))).toBe('<div>Line one<br/>Line two</div>');
  });

  it('leaves money, multiplication, blanks, identifiers, and markup exactly as written', () => {
    for (const text of ['Sam has $5 and spends $2.', 'What is 2 * 3 * 4?', 'Rivers carve ___ over time.', 'Fill in the _____ and the ___.', 'Call snake_case_name or a*b*c.', 'Price: $3.50 * 2', '5 * x = 10', '<b>not bold</b> & <script>x</script>'])
      expect(md.inline(text), text).toBe(text);
    expect(html(md.inline('<b>raw</b> **real**'))).toBe('<div>&lt;b&gt;raw&lt;/b&gt; <strong>real</strong></div>');
  });

  it('builds real lists, headings, and paragraphs for explanations', () => {
    const out = html(md.block('## Why\n**Verified Correct Answer:** Venus\n\n* Mars is farther out.\n* Earth is third.\n1. First\n2. Second'));
    expect(out).toBe('<div><div class="space-y-1.5"><p class="m-0 font-bold">Why</p><p class="m-0"><strong>Verified Correct Answer:</strong> Venus</p><ul class="list-disc ps-5 m-0 space-y-0.5"><li>Mars is farther out.</li><li>Earth is third.</li></ul><ol class="list-decimal ps-5 m-0 space-y-0.5"><li>First</li><li>Second</li></ol></div></div>');
    expect(md.block('   ')).toBeNull();
  });

  it('gives screen readers and speech plain words', () => {
    expect(md.plain('Which is **not** a *mammal*? Use `x`.')).toBe('Which is not a mammal? Use x.');
    expect(md.plain('## Tip\n* one\n- two')).toBe('Tip\n• one\n• two');
    expect(md.plain('Sam has $5 and spends $2; 2 * 3 = 6; fill ___.')).toBe('Sam has $5 and spends $2; 2 * 3 = 6; fill ___.');
  });
});

const quizBase = extra => ({
  t, isTeacherMode: false, isParentMode: false, isIndependentMode: false, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
  isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
  isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English',
  formatInlineText: v => v, renderFormattedText: v => v, getReviewCategories: () => [], getRows: () => 1, playSound: vi.fn(), addToast: vi.fn(),
  handleToggleIsPresentationMode: vi.fn(), handleToggleIsReviewGame: vi.fn(), handleToggleIsEditingQuiz: vi.fn(), handleToggleShowQuizAnswers: vi.fn(),
  handlePresentationOptionClick: vi.fn(), togglePresentationAnswer: vi.fn(), togglePresentationExplanation: vi.fn(), resetPresentation: vi.fn(),
  handleQuizChange: vi.fn(), handleFactCheck: vi.fn(), handleQuizQuestionAction: vi.fn(),
  ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, Stamp: ({ label }) => React.createElement('span', { 'data-stamp': label }),
  ...extra
});

describe('Assess renders it for students', () => {
  it('formats a multiple-choice stem and options, and keeps a money option intact', async () => {
    const quiz = { id: 'quiz-md', type: 'quiz', title: 'Animals', data: { questions: [
      { type: 'mcq', question: 'Which animal is **not** a mammal?', options: ['*Felis catus*', 'Salmon', 'Whale', 'It costs $5 or $10'], correctAnswer: 'Salmon' }
    ] } };
    await render(React.createElement(QuizView, quizBase({ generatedContent: quiz })));
    const strong = [...host.querySelectorAll('strong')].find(el => el.textContent === 'not');
    expect(strong).toBeTruthy();
    expect([...host.querySelectorAll('em')].some(el => el.textContent === 'Felis catus')).toBe(true);
    expect(host.textContent).not.toContain('**');
    expect(host.textContent).toContain('It costs $5 or $10');
  });

  it('formats other item types and keeps their blanks', async () => {
    const quiz = { id: 'quiz-md2', type: 'quiz', title: 'Rivers', data: { questions: [
      { type: 'fill-blank', question: 'A **river** carves a ___ over time.', expectedFill: 'valley', acceptableAlternatives: [] },
      { type: 'multi-select', question: 'Pick the *two* landforms.', options: ['**Delta**', 'Cloud', 'Canyon', 'Wind'], correctAnswers: ['**Delta**', 'Canyon'] }
    ] } };
    await render(React.createElement(QuizView, quizBase({ generatedContent: quiz })));
    expect(host.textContent).toContain('A river carves a ___ over time.');
    expect([...host.querySelectorAll('strong')].map(el => el.textContent)).toEqual(expect.arrayContaining(['river', 'Delta']));
    expect([...host.querySelectorAll('em')].map(el => el.textContent)).toContain('two');
    expect(host.textContent).not.toContain('**');
  });
});

describe('Concept Quest uses the same formatting', () => {
  it('formats the encounter question and choices, and names move buttons in plain words', async () => {
    const item = { type: 'mcq', question: 'Which is **not** a planet?', options: ['*Pluto*', 'Mars'], correctAnswer: '*Pluto*' };
    await render(React.createElement(Question, { item, response: {}, onChange: () => {}, t }));
    expect(host.querySelector('h4').innerHTML).toBe('Which is <strong>not</strong> a planet?');
    expect([...host.querySelectorAll('em')].map(el => el.textContent)).toContain('Pluto');
    const order = { type: 'sequence-sense', question: 'Order the **steps**.', items: ['*Melt*', 'Boil', 'Steam'], presentedOrder: [0, 1, 2], principleOptions: ['process', 'size'] };
    await render(React.createElement(Question, { item: order, response: {}, onChange: () => {}, t }));
    const labels = [...host.querySelectorAll('button[aria-label]')].map(el => el.getAttribute('aria-label'));
    expect(labels).toContain('Move down: Melt');
    expect(labels.join(' ')).not.toContain('*');
  });

  it('shows plain text, never a crash, when the Assess view is not loaded', async () => {
    const saved = window.AlloModules.QuizView;
    delete window.AlloModules.QuizView;
    try {
      await render(React.createElement(Question, { item: { type: 'mcq', question: 'Which is **not** a planet?', options: ['Pluto', 'Mars'] }, response: {}, onChange: () => {}, t }));
      expect(host.querySelector('h4').textContent).toBe('Which is **not** a planet?');
    } finally { window.AlloModules.QuizView = saved; }
  });
});
