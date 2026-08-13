import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(modulesDir, 'react'));
const ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));

function loadQuizSourceForVoiceTests() {
  const babel = require(resolve(modulesDir, '@babel/core'));
  const jsxPlugin = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));
  const source = readFileSync(resolve(process.cwd(), 'view_quiz_source.jsx'), 'utf8');
  const compiled = babel.transformSync(source, {
    plugins: [[jsxPlugin, { useBuiltIns: false }]],
    babelrc: false,
    configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  }).code;
  window.React = React;
  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = window.AlloIcons || {};
  window.__alloT = key => key;
  new Function('window', compiled + '\nwindow.__QuizVoiceTestView = QuizView;')(window);
  return window.__QuizVoiceTestView;
}

let QuizView;

beforeAll(() => {
  QuizView = loadQuizSourceForVoiceTests();
});
let runtimeRoot;
let runtimeHost;

afterEach(async () => {
  if (runtimeRoot) {
    await React.act(async () => {
      runtimeRoot.unmount();
    });
  }
  if (runtimeHost) runtimeHost.remove();
  runtimeRoot = null;
  runtimeHost = null;
  window.localStorage.clear();
  if (window.AlloModules) delete window.AlloModules.AlloCommands;
  vi.restoreAllMocks();
});
function quizRuntimeProps() {
  return {
    t: key => key,
    isTeacherMode: false,
    isParentMode: false,
    isIndependentMode: false,
    studentProjectSettings: {},
    activeSessionCode: null,
    sessionData: {},
    isPresentationMode: false,
    isReviewGame: false,
    isEditingQuiz: false,
    escapeRoomState: { isActive: false },
    presentationState: {},
    reviewGameState: {},
    soundEnabled: false,
    globalPoints: 0,
    inputText: '',
    isFactChecking: {},
    showQuizAnswers: false,
    leveledTextLanguage: 'English',
    generatedContent: {
      id: 'quiz-voice-runtime',
      data: {
        mode: 'exit-ticket',
        deliverySettings: { pacing: 'one-at-a-time', showProgress: true },
        questions: [
          { type: 'mcq', question: 'Two plus two equals?', options: ['Four', 'Five'], correctAnswer: 'Four' },
          { type: 'mcq', question: 'Three plus three equals?', options: ['Five', 'Six'], correctAnswer: 'Six' },
        ],
      },
    },
    addToast: vi.fn(),
    getRows: () => 1,
    formatInlineText: value => value,
    renderFormattedText: value => value,
    getReviewCategories: () => [],
    playSound: () => {},
  };
}


describe('ordinary Quiz voice boundary', () => {
  it('exposes stable semantic events and does not simulate DOM clicks', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_quiz_source.jsx'), 'utf8');
    expect(QuizView.voiceBoundary).toMatchObject({
      controlEvent: 'alloflow:quiz-voice-control',
      statusEvent: 'alloflow:quiz-voice-status',
      choiceRange: 'A-H / 1-8 / first-eighth',
    });
    expect(source).toContain('selectMcqOption(status.questionIndex, requestedIndex');
    expect(source).toContain('goToAssessmentQuestion(nextQuestionIdx)');
    const voiceSlice = source.slice(source.indexOf('// QUIZ VOICE SURFACE:'), source.indexOf('if (attemptReceipt &&', source.indexOf('// QUIZ VOICE SURFACE:')));
    expect(voiceSlice).not.toContain('.click()');
    expect(voiceSlice).not.toContain('querySelector');
    expect(source).toContain('This Quiz host did not provide a close action.');
  });

  it('routes runtime events through Quiz state and keeps one current-state learner scope', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let scope;
    const unregister = vi.fn();
    const registerCommandScope = vi.fn(spec => {
      scope = spec;
      return unregister;
    });
    window.AlloModules.AlloCommands = { registerCommandScope };
    window.localStorage.clear();
    runtimeHost = document.createElement('div');
    document.body.appendChild(runtimeHost);
    runtimeRoot = ReactDOMClient.createRoot(runtimeHost);

    await React.act(async () => {
      runtimeRoot.render(React.createElement(QuizView, quizRuntimeProps()));
    });

    expect(registerCommandScope).toHaveBeenCalledTimes(1);
    expect(scope).toBeTruthy();
    expect(scope.isActive()).toBe(true);

    const send = async (action, extra = {}) => {
      let response;
      await React.act(async () => {
        window.dispatchEvent(new window.CustomEvent('alloflow:quiz-voice-control', {
          detail: {
            action,
            requestId: 'runtime-' + action,
            ...extra,
            respond: payload => { response = payload; },
          },
        }));
      });
      return response;
    };

    const initial = await send('status');
    expect(initial).toMatchObject({
      ok: true,
      ready: true,
      questionNumber: 1,
      selectedOptionIndex: null,
    });
    expect(initial.options.map(option => option.text)).toEqual(['Four', 'Five']);
    expect(initial).not.toHaveProperty('correctAnswer');

    const selected = await send('choose', { choice: 'B' });
    expect(selected).toMatchObject({
      ok: true,
      state: 'selected',
      selectedOptionIndex: 1,
      selectedOptionLabel: 'B',
    });
    expect(scope.getState()).toMatchObject({
      questionNumber: 1,
      selectedOptionIndex: 1,
    });

    const firstCommands = scope.getCommands().map(command => command.id);
    expect(firstCommands).toContain('quiz_next');
    expect(firstCommands).not.toContain('quiz_previous');
    expect(firstCommands).toContain('quiz_repeat_feedback');
    expect(firstCommands).toContain('quiz_submit');

    expect(await send('next')).toMatchObject({
      ok: true,
      state: 'navigated',
      questionNumber: 2,
    });
    expect(scope.getCommands().map(command => command.id)).toContain('quiz_previous');

    const read = await send('read-question');
    expect(read.message).toContain('Three plus three equals?');
    expect(JSON.stringify(read)).not.toContain('correctAnswer');

    await React.act(async () => {
      runtimeRoot.unmount();
    });
    runtimeRoot = null;
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['A', 0], ['option H', 7], ['1', 0], ['8', 7],
    ['first', 0], ['second', 1], ['eighth', 7],
    ['choose B', 1], ['answer option 3', 2],
  ])('parses %s as option index %i', (spoken, expected) => {
    expect(QuizView.voiceBoundary.parseChoice(spoken, 8)).toBe(expected);
  });

  it('rejects missing and out-of-range answer choices', () => {
    expect(QuizView.voiceBoundary.parseChoice('I am not sure', 8)).toBe(-1);
    expect(QuizView.voiceBoundary.parseChoice('H', 4)).toBe(-1);
    expect(QuizView.voiceBoundary.parseChoice('9', 8)).toBe(-1);
  });

  it('keeps single-letter answers scoped to Quiz grammar', () => {
    expect(QuizView.voiceBoundary.parseScopedUtterance('A')).toMatchObject({
      commandId: 'quiz_choose',
      params: { choice: 'a' },
    });
    expect(QuizView.voiceBoundary.parseScopedUtterance('choose option H')).toMatchObject({
      commandId: 'quiz_choose',
      params: { choice: 'h' },
    });
    expect(QuizView.voiceBoundary.parseScopedUtterance('open quiz')).toBeNull();
  });

  it('registers a state-aware learner scope with exact destructive submit confirmation', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_quiz_source.jsx'), 'utf8');
    expect(source).toContain("module.registerCommandScope({");
    expect(source).toContain("id: 'quiz'");
    expect(source).toContain("priority: 80");
    expect(source).toContain("risk: 'destructive'");
    expect(source).toContain("confirmMessage: 'Submit this assessment now? Say yes or no.'");
    expect(source).toContain("if (meta && meta.confirmed === true) detail.confirmed = true");
    expect(source).toContain("quizVoiceScopeRef.current.getStatus = getQuizVoiceBoundaryStatus");
    expect(source).toContain("quizVoiceScopeRef.current.getCommands = getQuizVoiceScopedCommands");
    expect(source).toContain("status.state !== 'unsupported-mode'");
    expect(source).toContain("var attempts = 0;");
    expect(source).toContain("attempts >= 40");
  });

  it('never exposes the answer key in pre-check status/read payloads', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_quiz_source.jsx'), 'utf8');
    const payloadStart = source.indexOf('function _quizVoiceQuestionPayload');
    const payloadEnd = source.indexOf('function _quizFocusableElements', payloadStart);
    const payloadSource = source.slice(payloadStart, payloadEnd);
    expect(payloadSource).not.toContain('correctAnswer');
    expect(source).toContain("if (action === 'check' || (action === 'submit-or-check' && !draftNamespace))");
    expect(source).toContain("question.options[selectedOptionIdx] === question.correctAnswer");
  });

  it('routes supported non-MCQ input through semantic item controllers and fails honestly otherwise', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_quiz_source.jsx'), 'utf8');
    expect(source).toContain("canEnterFreeformByVoice: itemActions.indexOf('enter-response') >= 0");
    expect(source).toContain("itemController.execute('choose', request)");
    expect(source).toContain("itemController.execute(action, request)");
    expect(source).toContain("checkController.execute('check', request)");
    expect(source).toContain("type: 'multi-select'");
    expect(source).toContain("type: 'numeric-response'");
    expect(source).toContain("type: 'sequence-sense'");
    expect(source).toContain("type: 'relation-mismatch'");
    expect(source).toContain("type: q.type || 'short-answer'");
  });
});
