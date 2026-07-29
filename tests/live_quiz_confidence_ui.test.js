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

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: key => key });
  window.UiLanguageSelector = () => null;
  window._fbDoc = (_db, ...parts) => parts.join('/');
  window.__confidenceWrites = [];
  window._fbUpdateDoc = async (ref, payload) => { window.__confidenceWrites.push({ ref, payload }); };
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
  window.__confidenceWrites = [];
  delete window.__alloQuizChannelSend;
  vi.restoreAllMocks();
});

function liveSession(question, overrides = {}) {
  return {
    generatedContent: { type: 'quiz', data: { questions: [question] } },
    sessionData: {
      quizState: {
        isActive: true,
        activityId: 'quiz:CONF1:attempt-1',
        mode: 'live-pulse',
        currentQuestionIndex: 0,
        phase: 'answering',
        responses: {},
        responseReceipts: {},
        teams: {},
        scoringPolicy: { accuracy: true, confidence: true, partialCredit: true },
        ...overrides,
      },
      roster: {},
      groups: {},
    },
  };
}

async function mount(question, overrides) {
  const props = liveSession(question, overrides);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(components.StudentQuizOverlay, {
      ...props,
      user: { uid: 'student-1' },
      activeSessionCode: 'CONF1',
      targetAppId: 'app-1',
    }));
    await Promise.resolve();
  });
}

async function click(element) {
  await act(async () => {
    element.click();
    await Promise.resolve();
  });
}

describe('teacher-paced confidence policy', () => {
  it('updates the same P2P response envelope without changing the selected answer', async () => {
    window.__alloQuizChannelSend = vi.fn(() => true);
    await mount({
      type: 'mcq',
      question: 'Choose A.',
      options: ['A', 'B'],
      correctAnswer: 'A',
      conceptLabel: 'Letters',
    });

    await click(host.querySelectorAll('[data-help-key="quiz_student_answer_option"]')[0]);
    expect(window.__alloQuizChannelSend).toHaveBeenLastCalledWith('boss:0', 0);

    const confidencePanel = host.querySelector('[data-live-confidence-policy="true"]');
    expect(confidencePanel).not.toBeNull();
    await click(Array.from(confidencePanel.querySelectorAll('button'))
      .find(button => button.textContent.includes('informed guess')));

    expect(window.__alloQuizChannelSend).toHaveBeenLastCalledWith('boss:0', expect.objectContaining({
      questionIdx: 0,
      itemType: 'mcq',
      conceptLabel: 'Letters',
      confidence: 'guessed',
      answer: {
        optionIdx: 0,
        optionText: 'A',
      },
    }));
  });

  it('never adds a second confidence layer to unscored opinion polls', async () => {
    window.__alloQuizChannelSend = vi.fn(() => true);
    await mount({
      type: 'opinion-mcq',
      question: 'Which do you prefer?',
      options: ['A', 'B'],
    });
    await click(host.querySelectorAll('[data-help-key="quiz_student_answer_option"]')[0]);
    expect(host.querySelector('[data-live-confidence-policy="true"]')).toBeNull();
  });

  it('keeps answer and confidence content out of the receipt-only fallback', async () => {
    window.__alloQuizChannelSend = vi.fn(() => false);
    await mount({
      type: 'mcq',
      question: 'Choose A.',
      options: ['Private A', 'Private B'],
      correctAnswer: 'Private A',
    });
    await click(host.querySelectorAll('[data-help-key="quiz_student_answer_option"]')[0]);
    const confidencePanel = host.querySelector('[data-live-confidence-policy="true"]');
    await click(Array.from(confidencePanel.querySelectorAll('button'))
      .find(button => button.textContent.includes('I knew this')));

    expect(window.__confidenceWrites.length).toBeGreaterThanOrEqual(2);
    const serialized = JSON.stringify(window.__confidenceWrites);
    expect(serialized).not.toContain('Private A');
    expect(serialized).not.toContain('confidence');
    expect(serialized).not.toContain('optionIdx');
    window.__confidenceWrites.forEach(({ payload }) => {
      expect(Object.keys(payload)).toEqual(['quizState.responseReceipts.student-1']);
    });
  });
});
