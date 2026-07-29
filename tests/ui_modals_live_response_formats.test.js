import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let components;
let root;
let host;

const t = (key) => key;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.UiLanguageSelector = () => null;
  window._fbDoc = (_db, ...parts) => parts.join('/');
  window.__uiModalWrites = [];
  window._fbUpdateDoc = async (ref, payload) => { window.__uiModalWrites.push({ ref, payload }); };
  window.__alloHooks = { useFocusTrap() {} };
  loadAlloModule('ui_modals_module.js');
  components = window.AlloModules;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  window.__uiModalWrites = [];
  delete window.__alloQuizChannelSend;
  vi.restoreAllMocks();
});

function session(overrides = {}) {
  return {
    quizState: {
      isActive: true,
      activityId: 'quiz:FORMAT1:attempt-1',
      mode: 'live-pulse',
      currentQuestionIndex: 0,
      phase: 'answering',
      responses: {},
      responseReceipts: {},
      teams: {},
      ...overrides,
    },
    roster: {},
    groups: {},
  };
}

async function mountQuestion(question, sessionData = session()) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(components.StudentQuizOverlay, {
      sessionData,
      generatedContent: { type: 'quiz', data: { questions: [question] } },
      user: { uid: 'student-1' },
      activeSessionCode: 'FORMAT1',
      targetAppId: 'app-1',
    }));
    await Promise.resolve();
  });
}

async function rerenderQuestion(question, sessionData) {
  await act(async () => {
    root.render(React.createElement(components.StudentQuizOverlay, {
      sessionData,
      generatedContent: { type: 'quiz', data: { questions: [question] } },
      user: { uid: 'student-1' },
      activeSessionCode: 'FORMAT1',
      targetAppId: 'app-1',
    }));
    await Promise.resolve();
  });
}

async function click(button) {
  await act(async () => {
    button.click();
    await Promise.resolve();
  });
}

async function setValue(control, value) {
  const prototype = control.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  await act(async () => {
    setter.call(control, value);
    control.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

function sentPayload() {
  const call = window.__alloQuizChannelSend.mock.calls.at(-1);
  expect(call?.[0]).toBe('boss:0');
  return call?.[1];
}

describe('StudentQuizOverlay generalized live response formats', () => {
  it('keeps opinion MCQ numeric and unscored before and after reveal', async () => {
    window.__alloQuizChannelSend = vi.fn(() => true);
    const question = {
      type: 'opinion-mcq',
      question: 'Which approach would you choose?',
      options: ['Plan first', 'Explore first'],
      correctAnswer: 'Plan first',
    };
    const active = session();
    await mountQuestion(question, active);
    const options = Array.from(host.querySelectorAll('[data-help-key="quiz_student_answer_option"]'));
    await click(options[1]);
    expect(sentPayload()).toBe(1);

    await rerenderQuestion(question, session({
      phase: 'revealed',
      responses: { 'student-1': 1 },
    }));
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('quiz.poll_completed');
    expect(dialog.textContent).not.toContain('quiz.status.result_correct');
    expect(dialog.textContent).not.toContain('quiz.status.result_incorrect');
    expect(dialog.querySelector('.bg-red-500')).toBeNull();
    expect(dialog.querySelector('.bg-green-700')).toBeNull();
  });

  it('submits multi-select in the existing deterministic response envelope', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_725_000_000_001);
    window.__alloQuizChannelSend = vi.fn(() => true);
    await mountQuestion({
      type: 'multi-select',
      question: 'Select the prime numbers.',
      options: ['2', '4', '5'],
      correctAnswers: ['2', '5'],
      conceptLabel: 'Prime numbers',
    });
    const choices = Array.from(host.querySelectorAll('[aria-label="Select every answer that applies"] button'));
    await click(choices[0]);
    await click(choices[2]);
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Submit selections')));
    expect(sentPayload()).toEqual({
      questionIdx: 0,
      itemType: 'multi-select',
      conceptLabel: 'Prime numbers',
      answer: {
        selectedIndices: [0, 2],
        selectedTexts: ['2', '5'],
        status: 'correct',
        score: 100,
      },
      timestamp: 1_725_000_000_001,
    });
  });

  it.each([
    ['fill-blank', { expectedFill: 'evaporation' }, 'Evaporation', 'correct'],
    ['short-answer', {}, 'A concise student explanation.', 'submitted'],
    ['self-explanation', {}, 'First the particles gain energy, then they spread out.', 'submitted'],
  ])('submits bounded %s text without creating another storage path', async (type, extra, answerText, status) => {
    window.__alloQuizChannelSend = vi.fn(() => true);
    await mountQuestion({ type, question: 'Respond in your own words.', ...extra });
    const control = host.querySelector('#live-quiz-written-response');
    await setValue(control, answerText);
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Submit response')));
    expect(sentPayload()).toMatchObject({
      questionIdx: 0,
      itemType: type,
      answer: { text: answerText.trim(), status },
    });
    expect(window.__uiModalWrites).toEqual([]);
  });

  it('uses numeric and unit inputs and sends a deterministic numeric payload', async () => {
    window.__alloQuizChannelSend = vi.fn(() => true);
    await mountQuestion({
      type: 'numeric-response',
      question: 'What is the speed?',
      correctValue: 12.5,
      tolerance: 0.1,
      unit: 'm/s',
      acceptableUnits: ['meters per second'],
    });
    const inputs = host.querySelectorAll('[data-live-response-type="numeric-response"] input');
    await setValue(inputs[0], '12.55');
    await setValue(inputs[1], 'm/s');
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Submit numeric answer')));
    expect(sentPayload()).toMatchObject({
      itemType: 'numeric-response',
      answer: {
        text: '12.55 m/s',
        numericValue: 12.55,
        unit: 'm/s',
        valueCorrect: true,
        unitCorrect: true,
        status: 'correct',
        score: 100,
      },
    });
  });

  it('submits answer-plus-evidence, sequence-sense, and relation-mismatch shapes', async () => {
    window.__alloQuizChannelSend = vi.fn(() => true);
    const answerEvidence = {
      type: 'answer-evidence',
      question: 'Which claim is supported?',
      answerOptions: ['Claim A', 'Claim B'],
      correctAnswer: 'Claim A',
      evidencePrompt: 'Which detail supports it?',
      evidenceOptions: ['Detail 1', 'Detail 2'],
      correctEvidence: 'Detail 2',
    };
    await mountQuestion(answerEvidence);
    const answerGroups = host.querySelectorAll('[data-live-response-type="answer-evidence"] fieldset');
    await click(answerGroups[0].querySelectorAll('button')[0]);
    await click(answerGroups[1].querySelectorAll('button')[1]);
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Submit answer and evidence')));
    expect(sentPayload()).toMatchObject({
      itemType: 'answer-evidence',
      answer: { answerIdx: 0, answerText: 'Claim A', evidenceIdx: 1, evidenceText: 'Detail 2', status: 'correct', score: 2 },
    });

    act(() => root.unmount());
    root = null;
    host.remove();
    host = null;
    window.__alloQuizChannelSend.mockClear();
    await mountQuestion({
      type: 'sequence-sense',
      question: 'Check the process order.',
      items: ['Start', 'Middle', 'Finish'],
      presentedOrder: [0, 2, 1],
      intentionallyWrongIndex: 1,
      orderingPrinciple: 'process',
      principleOptions: ['chronological', 'process'],
    });
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('No, something is misplaced')));
    const sequenceRows = host.querySelectorAll('[data-live-response-type="sequence-sense"] ol button');
    await click(sequenceRows[1]);
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === 'process'));
    expect(sentPayload()).toMatchObject({
      itemType: 'sequence-sense',
      answer: { verifyAnswer: 'no', clickedIdx: 1, principleAnswer: 'process', status: 'correct', score: 3 },
    });

    act(() => root.unmount());
    root = null;
    host.remove();
    host = null;
    window.__alloQuizChannelSend.mockClear();
    await mountQuestion({
      type: 'relation-mismatch',
      question: 'Find the mismatched pair.',
      pairs: [{ left: 'Bird', right: 'Nest' }, { left: 'Bee', right: 'Den' }],
      wrongPairIndex: 1,
      correctPartnerForWrong: 'Hive',
      candidatePartners: ['Hive', 'Web'],
    });
    const pairs = host.querySelectorAll('[aria-label="Find the mismatched pair"] button');
    await click(pairs[1]);
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === 'Hive'));
    expect(sentPayload()).toMatchObject({
      itemType: 'relation-mismatch',
      answer: { clickedPairIdx: 1, partnerAnswer: 'Hive', status: 'correct', score: 2 },
    });
  });

  it('keeps advanced response content out of the receipt fallback', async () => {
    window.__alloQuizChannelSend = vi.fn(() => false);
    await mountQuestion({
      type: 'multi-select',
      question: 'Select all.',
      options: ['Secret A', 'Secret B'],
      correctAnswers: ['Secret A'],
    });
    const choices = Array.from(host.querySelectorAll('[aria-label="Select every answer that applies"] button'));
    await click(choices[0]);
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Submit selections')));
    expect(sentPayload()).toMatchObject({ itemType: 'multi-select' });
    expect(window.__uiModalWrites).toHaveLength(1);
    const payload = window.__uiModalWrites[0].payload;
    expect(Object.keys(payload)).toEqual(['quizState.responseReceipts.student-1']);
    expect(payload['quizState.responseReceipts.student-1']).toEqual({
      activityId: 'quiz:FORMAT1:attempt-1',
      questionIndex: 0,
      submittedAt: expect.any(Number),
      flow: 'presentation',
    });
    expect(JSON.stringify(payload)).not.toContain('Secret A');
    expect(JSON.stringify(payload)).not.toContain('selectedIndices');
  });

  it('bounds malformed option data instead of allowing an oversized response payload', async () => {
    window.__alloQuizChannelSend = vi.fn(() => true);
    const options = Array.from({ length: 45 }, (_, index) => `Option ${index} ${'x'.repeat(600)}`);
    await mountQuestion({
      type: 'multi_select',
      question: 'Pick one.',
      options,
      correctAnswers: [options[0]],
      conceptLabel: 'c'.repeat(400),
    });
    const choices = Array.from(host.querySelectorAll('[aria-label="Select every answer that applies"] button'));
    expect(choices).toHaveLength(30);
    expect(choices[0].textContent.length).toBeLessThanOrEqual(501);
    await click(choices[0]);
    await click(Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Submit selections')));
    const payload = sentPayload();
    expect(payload.itemType).toBe('multi-select');
    expect(payload.conceptLabel).toHaveLength(240);
    expect(payload.answer.selectedTexts[0].length).toBeLessThanOrEqual(500);
  });
});
