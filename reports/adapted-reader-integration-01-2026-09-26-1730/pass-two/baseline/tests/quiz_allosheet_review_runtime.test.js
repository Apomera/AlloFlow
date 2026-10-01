import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));

let AssessmentItemAnalysisPanel;
let quizAggregators;
let root;
let host;
let background;

function loadQuizAnalysisPanelForRuntimeTest() {
  const aggregatorSource = readFileSync(resolve(process.cwd(), 'quiz_live_aggregators.js'), 'utf8');
  const moduleSource = readFileSync(resolve(process.cwd(), 'view_quiz_module.js'), 'utf8');
  const registration = '  window.AlloModules.QuizView = QuizView;';
  if (!moduleSource.includes(registration)) {
    throw new Error('QuizView registration point changed; update the runtime-test exposure.');
  }
  const instrumentedSource = moduleSource.replace(
    registration,
    `${registration}\n  window.AlloModules.__TestAssessmentItemAnalysisPanel = AssessmentItemAnalysisPanel;`,
  );

  window.AlloModules = {};
  window.React = React;
  window.__alloT = key => key;
  new Function('window', aggregatorSource)(window);
  new Function('window', instrumentedSource)(window);

  quizAggregators = window.AlloModules.QuizLiveAggregators;
  AssessmentItemAnalysisPanel = window.AlloModules.__TestAssessmentItemAnalysisPanel;
}

function privateQuizFixture(studentCount = 4) {
  const generatedContent = {
    id: 'PRIVATE RESOURCE ID RUNTIME',
    title: 'PRIVATE QUIZ TITLE RUNTIME',
    data: {
      mode: 'exit-ticket',
      questions: [{
        type: 'mcq',
        question: 'PRIVATE QUESTION WORDING RUNTIME',
        options: ['PRIVATE RIGHT OPTION RUNTIME', 'PRIVATE WRONG OPTION RUNTIME'],
        correctAnswer: 'PRIVATE RIGHT OPTION RUNTIME',
      }],
      reflections: ['PRIVATE REFLECTION PROMPT RUNTIME'],
    },
  };
  const roster = {};
  const allResponses = {};
  for (let index = 0; index < studentCount; index += 1) {
    const uid = `private-runtime-uid-${index}`;
    roster[uid] = { displayName: `PRIVATE LEARNER ${index}` };
    allResponses[uid] = {
      0: {
        itemType: 'mcq',
        answer: { optionIdx: 1 },
        confidence: 'knew',
      },
    };
  }
  return {
    quizState: {
      activityId: 'PRIVATE SESSION CODE RUNTIME',
      allResponses,
    },
    generatedContent,
    roster,
    analysis: {
      items: [{
        questionIdx: 0,
        questionText: 'PRIVATE QUESTION WORDING RUNTIME',
        type: 'mcq',
        respondents: studentCount,
        gradableCount: studentCount,
        correctCount: 0,
        incorrectCount: studentCount,
        omittedCount: 0,
        idkCount: 0,
        highConfidenceIncorrect: studentCount,
        correctRate: 0,
        smallSample: studentCount < 5,
        flags: [],
      }],
    },
  };
}

function buttonWithText(container, text) {
  return Array.from(container.querySelectorAll('button')).find(
    button => button.textContent.trim() === text,
  );
}

function dispatchDialogKey(dialog, key, shiftKey = false) {
  const event = new window.KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  dialog.dispatchEvent(event);
  return event;
}

function waitForTimer() {
  return new Promise(resolvePromise => window.setTimeout(resolvePromise, 5));
}

beforeAll(() => {
  loadQuizAnalysisPanelForRuntimeTest();
  expect(AssessmentItemAnalysisPanel).toBeTypeOf('function');
  expect(quizAggregators.buildQuizAlloSheetEnvelope).toBeTypeOf('function');
});

afterEach(async () => {
  if (root) {
    await React.act(async () => {
      root.unmount();
    });
  }
  if (host) host.remove();
  if (background) background.remove();
  root = null;
  host = null;
  background = null;
  vi.restoreAllMocks();
});

describe('Quiz item-analysis AlloSheet source review runtime', () => {
  it('requires confirmation, traps focus, isolates the background, and stays busy until aggregate receipt', async () => {
    const priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    const offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
      window.HTMLElement.prototype,
      'offsetWidth',
    );
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        return this.hidden ? 0 : 1;
      },
    });

    const fixture = privateQuizFixture(4);
    const originalBuilder = quizAggregators.buildQuizAlloSheetEnvelope;
    const buildEnvelope = vi.fn((...args) => originalBuilder(...args));
    quizAggregators.buildQuizAlloSheetEnvelope = buildEnvelope;
    let resolveOpen;
    const pendingOpen = new Promise(resolvePromise => {
      resolveOpen = resolvePromise;
    });
    const onOpenAlloSheet = vi.fn(() => pendingOpen);

    background = document.createElement('div');
    background.setAttribute('data-testid', 'quiz-review-background');
    background.innerHTML = '<button type="button">Background action</button>';
    document.body.appendChild(background);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    try {
      await React.act(async () => {
        root.render(React.createElement(AssessmentItemAnalysisPanel, {
          ...fixture,
          mode: 'exit-ticket',
          aiGradedCache: {
            'private-runtime-uid-0:0': {
              status: 'incorrect',
              feedback: 'PRIVATE AI FEEDBACK RUNTIME',
            },
          },
          teacherOverrides: {},
          onOpenAlloSheet,
        }));
      });

      const opener = buttonWithText(host, 'Open in AlloSheet');
      expect(opener).toBeTruthy();
      expect(onOpenAlloSheet).not.toHaveBeenCalled();
      expect(buildEnvelope).not.toHaveBeenCalled();

      await React.act(async () => {
        opener.click();
        await Promise.resolve();
      });

      let dialog = host.querySelector(
        '[role="dialog"][aria-labelledby="quiz-allosheet-review-title"]',
      );
      expect(dialog).toBeTruthy();
      expect(onOpenAlloSheet).not.toHaveBeenCalled();
      expect(buildEnvelope).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(dialog);
      expect(background.inert).toBe(true);
      expect(background.getAttribute('aria-hidden')).toBe('true');

      const reviewText = dialog.textContent.replace(/\s+/g, ' ').trim();
      expect(reviewText).toContain(
        'Excluded: learner names and IDs, question and option wording, raw answers, reflections, AI feedback, session codes, resource IDs, and cohort arrays.',
      );
      expect(reviewText).toContain(
        'Signal codes remain blank until at least five learners respond.',
      );
      expect(reviewText).toContain(
        'The transfer cannot enable AI or write back to Quiz.',
      );

      const cancel = buttonWithText(dialog, 'Cancel');
      const confirm = buttonWithText(dialog, 'Confirm and open AlloSheet');
      expect(cancel).toBeTruthy();
      expect(confirm).toBeTruthy();

      confirm.focus();
      const forwardTab = dispatchDialogKey(dialog, 'Tab');
      expect(forwardTab.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(cancel);

      cancel.focus();
      const backwardTab = dispatchDialogKey(dialog, 'Tab', true);
      expect(backwardTab.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(confirm);

      let escapeEvent;
      await React.act(async () => {
        escapeEvent = dispatchDialogKey(dialog, 'Escape');
        await waitForTimer();
      });
      expect(escapeEvent.defaultPrevented).toBe(true);
      expect(host.querySelector('[aria-labelledby="quiz-allosheet-review-title"]')).toBeNull();
      expect(document.activeElement).toBe(opener);
      expect(background.inert).toBe(false);
      expect(background.hasAttribute('aria-hidden')).toBe(false);
      expect(onOpenAlloSheet).not.toHaveBeenCalled();

      await React.act(async () => {
        opener.click();
        await Promise.resolve();
      });
      dialog = host.querySelector(
        '[role="dialog"][aria-labelledby="quiz-allosheet-review-title"]',
      );
      expect(dialog).toBeTruthy();
      const confirmedButton = buttonWithText(dialog, 'Confirm and open AlloSheet');

      await React.act(async () => {
        confirmedButton.click();
        await Promise.resolve();
      });

      expect(buildEnvelope).toHaveBeenCalledTimes(1);
      expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);
      const envelope = onOpenAlloSheet.mock.calls[0][0];
      expect(envelope).toMatchObject({
        kind: 'alloflow.tabular.v1',
        title: 'Quiz item analysis',
        privacy: {
          identifierIncluded: false,
          transferEnablesAI: false,
        },
        capabilities: {
          writeBack: false,
          aiEnabled: false,
        },
      });
      expect(envelope.tables).toHaveLength(1);
      expect(envelope.tables[0].id).toBe('quiz_item_analysis');
      expect(envelope.tables[0].rows[0].values).toMatchObject({
        respondents: 4,
        incorrect_count: 4,
        correct_rate_percent: 0,
        sample_status: 'early_signal',
        signal_codes: '',
      });
      const serializedEnvelope = JSON.stringify(envelope);
      [
        'PRIVATE RESOURCE ID RUNTIME',
        'PRIVATE QUIZ TITLE RUNTIME',
        'PRIVATE QUESTION WORDING RUNTIME',
        'PRIVATE RIGHT OPTION RUNTIME',
        'PRIVATE WRONG OPTION RUNTIME',
        'PRIVATE REFLECTION PROMPT RUNTIME',
        'PRIVATE SESSION CODE RUNTIME',
        'PRIVATE LEARNER',
        'private-runtime-uid',
        'PRIVATE AI FEEDBACK RUNTIME',
      ].forEach(secret => expect(serializedEnvelope).not.toContain(secret));

      dialog = host.querySelector(
        '[role="dialog"][aria-labelledby="quiz-allosheet-review-title"]',
      );
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute('aria-busy')).toBe('true');
      expect(buttonWithText(dialog, 'Cancel').disabled).toBe(true);
      expect(buttonWithText(dialog, 'Waiting for AlloSheet…').disabled).toBe(true);
      expect(dialog.textContent).toContain(
        'Opening AlloSheet and waiting for secure receipt…',
      );
      expect(background.inert).toBe(true);

      await React.act(async () => {
        dispatchDialogKey(dialog, 'Escape');
        await Promise.resolve();
      });
      expect(host.querySelector('[aria-labelledby="quiz-allosheet-review-title"]')).toBeTruthy();
      expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);

      await React.act(async () => {
        resolveOpen(true);
        await pendingOpen;
        await Promise.resolve();
        await waitForTimer();
      });

      expect(host.querySelector('[aria-labelledby="quiz-allosheet-review-title"]')).toBeNull();
      expect(background.inert).toBe(false);
      expect(background.hasAttribute('aria-hidden')).toBe(false);
      expect(document.activeElement).toBe(opener);
      expect(onOpenAlloSheet).toHaveBeenCalledTimes(1);
    } finally {
      quizAggregators.buildQuizAlloSheetEnvelope = originalBuilder;
      if (offsetWidthDescriptor) {
        Object.defineProperty(
          window.HTMLElement.prototype,
          'offsetWidth',
          offsetWidthDescriptor,
        );
      } else {
        delete window.HTMLElement.prototype.offsetWidth;
      }
      globalThis.IS_REACT_ACT_ENVIRONMENT = priorActFlag;
    }
  });
  it('restores background isolation when live analysis disappears during review', async () => {
    const priorActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const fixture = privateQuizFixture(4);
    const onOpenAlloSheet = vi.fn();

    background = document.createElement('div');
    background.setAttribute('aria-hidden', 'false');
    background.innerHTML = '<button type="button">Background action</button>';
    document.body.appendChild(background);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    try {
      await React.act(async () => {
        root.render(React.createElement(AssessmentItemAnalysisPanel, {
          ...fixture,
          mode: 'exit-ticket',
          onOpenAlloSheet,
        }));
      });

      const opener = buttonWithText(host, 'Open in AlloSheet');
      await React.act(async () => {
        opener.click();
        await Promise.resolve();
      });

      expect(host.querySelector('[aria-labelledby="quiz-allosheet-review-title"]')).toBeTruthy();
      expect(background.inert).toBe(true);
      expect(background.getAttribute('aria-hidden')).toBe('true');

      await React.act(async () => {
        root.render(React.createElement(AssessmentItemAnalysisPanel, {
          ...fixture,
          analysis: { items: [] },
          mode: 'exit-ticket',
          onOpenAlloSheet,
        }));
        await Promise.resolve();
      });

      expect(host.querySelector('[aria-labelledby="quiz-allosheet-review-title"]')).toBeNull();
      expect(host.querySelector('[aria-labelledby="item-analysis-heading"]')).toBeNull();
      expect(background.inert).toBe(false);
      expect(background.getAttribute('aria-hidden')).toBe('false');
      expect(onOpenAlloSheet).not.toHaveBeenCalled();

      await React.act(async () => {
        root.render(React.createElement(AssessmentItemAnalysisPanel, {
          ...fixture,
          mode: 'exit-ticket',
          onOpenAlloSheet,
        }));
        await Promise.resolve();
      });

      expect(buttonWithText(host, 'Open in AlloSheet')).toBeTruthy();
      expect(host.querySelector('[aria-labelledby="quiz-allosheet-review-title"]')).toBeNull();
      expect(background.inert).toBe(false);
      expect(background.getAttribute('aria-hidden')).toBe('false');
    } finally {
      globalThis.IS_REACT_ACT_ENVIRONMENT = priorActFlag;
    }
  });
});
