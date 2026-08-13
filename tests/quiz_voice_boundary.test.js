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

function evidenceReflectionRuntimeProps() {
  const props = quizRuntimeProps();
  props.generatedContent = {
    id: 'quiz-voice-evidence-reflections',
    data: {
      mode: 'exit-ticket',
      deliverySettings: { pacing: 'one-at-a-time', showProgress: true },
      questions: [{
        type: 'answer-evidence',
        question: 'What change forms clouds?',
        answerOptions: ['Evaporation', 'Condensation'],
        correctAnswer: 'Condensation',
        evidencePrompt: 'Which observation best supports the answer?',
        evidenceOptions: ['Water vapor cools into droplets', 'Sunlight warms surface water'],
        correctEvidence: 'Water vapor cools into droplets',
      }],
      reflections: [
        'What helped you choose your evidence?',
        { prompt: 'What would you review next?' },
      ],
    },
  };
  return props;
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
    expect(scope.isActive({
      contentIsQuiz: true,
      quizVoiceFrontmost: true,
      getCurrentLearnerResource: () => ({ id: 'quiz-voice-runtime', type: 'quiz', frontmost: true }),
    })).toBe(true);
    expect(scope.isActive({
      contentIsQuiz: true,
      quizVoiceFrontmost: false,
      testPrepHubOpen: true,
      getCurrentLearnerResource: () => ({ id: 'quiz-voice-runtime', type: 'quiz', frontmost: false }),
    })).toBe(false);
    expect(scope.getCommands({
      contentIsQuiz: true,
      quizVoiceFrontmost: false,
      getCurrentLearnerResource: () => ({ id: 'quiz-voice-runtime', type: 'quiz', frontmost: false }),
    })).toEqual([]);

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
    const publicState = scope.getState();
    expect(publicState).toMatchObject({
      questionNumber: 1,
      itemType: 'mcq',
      optionCount: 2,
      hasSelection: true,
    });
    expect(publicState).not.toHaveProperty('question');
    expect(publicState).not.toHaveProperty('options');
    expect(publicState).not.toHaveProperty('itemState');
    expect(publicState).not.toHaveProperty('selectedOptionIndex');

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

  it('does not manufacture recognition confidence in the Quiz grammar', () => {
    for (const utterance of ['help', 'choose option B', 'response followed by my explanation']) {
      const parsed = QuizView.voiceBoundary.parseScopedUtterance(utterance);
      expect(parsed).toBeTruthy();
      expect(parsed).not.toHaveProperty('confidence');
    }
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
  it('parses exact evidence parts and explicit reflection grammar without stealing ambiguous choices', () => {
    expect(QuizView.voiceBoundary.parseScopedUtterance('choose answer option B')).toMatchObject({
      commandId: 'quiz_choose_answer', params: { choice: 'b' },
    });
    expect(QuizView.voiceBoundary.parseScopedUtterance('select evidence first')).toMatchObject({
      commandId: 'quiz_choose_evidence', params: { choice: 'first' },
    });
    expect(QuizView.voiceBoundary.parseScopedUtterance('select reflection second')).toMatchObject({
      commandId: 'quiz_select_reflection', params: { reflection: 'second' },
    });
    expect(QuizView.voiceBoundary.parseScopedUtterance('set reflection to I compared both observations')).toMatchObject({
      commandId: 'quiz_set_reflection', params: { response: 'I compared both observations' },
    });
    expect(QuizView.voiceBoundary.parseScopedUtterance('append to my reflection and checked the prompt')).toMatchObject({
      commandId: 'quiz_append_reflection', params: { response: 'and checked the prompt' },
    });
    expect(QuizView.voiceBoundary.parseScopedUtterance('choose B')).toMatchObject({
      commandId: 'quiz_choose',
    });
  });

  it('keeps evidence/reflection voice mutations state-driven and confirms destructive paths', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_quiz_source.jsx'), 'utf8');
    const voiceSlice = source.slice(source.indexOf('// QUIZ VOICE SURFACE:'), source.indexOf('// QUIZ_VOICE_EFFECT'));
    expect(voiceSlice).not.toMatch(/\.click\s*\(/);
    expect(voiceSlice).not.toContain('querySelector');
    expect(source).toContain("confirmationToken: 'reset-answer-evidence'");
    expect(source).toContain("confirmationToken: 'clear-reflection'");
    expect(source).toContain("confirmationToken: 'submit-reflection'");
    expect(source).toContain('setReflectionDraft(rIdx, nextText)');
    expect(source).toContain('clearReflection(rIdx)');
    expect(source).toContain('submitReflection(rIdx)');
  });
  it('completes Answer + Evidence and reflection lifecycles through semantic runtime events', async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let scope;
    window.AlloModules.AlloCommands = {
      registerCommandScope: vi.fn(spec => { scope = spec; return vi.fn(); }),
    };
    runtimeHost = document.createElement('div');
    document.body.appendChild(runtimeHost);
    runtimeRoot = ReactDOMClient.createRoot(runtimeHost);
    await React.act(async () => {
      runtimeRoot.render(React.createElement(QuizView, evidenceReflectionRuntimeProps()));
    });
    const send = async (action, extra = {}) => {
      let response;
      await React.act(async () => {
        window.dispatchEvent(new window.CustomEvent('alloflow:quiz-voice-control', {
          detail: { action, ...extra, respond: value => { response = value; } },
        }));
      });
      return response;
    };

    const initial = await send('status');
    expect(initial).toMatchObject({ type: 'answer-evidence', questionNumber: 1 });
    expect(initial.message).toContain('Part 1, choose the best answer');
    expect(initial.message).not.toContain('Evidence options:');
    expect(JSON.stringify(initial)).not.toMatch(/correctAnswer|correctEvidence/);
    expect(await send('choose', { choice: 'B' })).toMatchObject({ state: 'ambiguous-choice' });
    expect(await send('choose-answer', { choice: 'B' })).toMatchObject({
      ok: true, part: 'answer', selectedLabel: 'B',
    });
    expect((await send('status')).message).toContain('Evidence options:');
    expect(scope.getCommands().map(command => command.id)).toContain('quiz_choose_evidence');
    expect(await send('choose-evidence', { choice: 'Water vapor cools into droplets' })).toMatchObject({
      ok: true, part: 'evidence', selectedLabel: 'A',
    });
    expect(await send('check')).toMatchObject({ ok: true, state: 'checked', correct: true, score: 2 });
    expect(await send('try-again')).toMatchObject({ state: 'confirmation-required', confirmationToken: 'reset-answer-evidence' });
    expect(await send('try-again', { confirmed: true })).toMatchObject({ ok: true, state: 'reset' });

    expect((await send('list-reflections')).message).toContain('Reflection 2: What would you review next?');
    expect(await send('select-reflection', { reflection: '2' })).toMatchObject({
      ok: true, surfaceMode: 'reflection', reflectionNumber: 2,
    });
    expect(await send('set-reflection', { response: 'I would review the water cycle.' })).toMatchObject({ state: 'reflection-set' });
    expect(await send('append-reflection', { response: 'Then compare another example.' })).toMatchObject({ state: 'reflection-appended' });
    expect((await send('read-reflection-response')).message).toContain('I would review the water cycle. Then compare another example.');
    const reflectionCommands = scope.getCommands();
    expect(reflectionCommands.find(command => command.id === 'quiz_clear_reflection')).toMatchObject({ confirmation: 'always' });
    expect(reflectionCommands.find(command => command.id === 'quiz_submit_reflection')).toMatchObject({ confirmation: 'always' });
    expect(await send('clear-reflection')).toMatchObject({ state: 'confirmation-required', confirmationToken: 'clear-reflection' });
    expect(await send('clear-reflection', { confirmed: true })).toMatchObject({ ok: true, state: 'reflection-cleared' });
    await send('set-reflection', { response: 'I would review condensation.' });
    expect(await send('submit-reflection')).toMatchObject({ state: 'confirmation-required', confirmationToken: 'submit-reflection' });
    expect(await send('submit-reflection', { confirmed: true })).toMatchObject({ ok: true, state: 'reflection-submitted' });
    expect(await send('set-reflection', { response: 'This should stay locked.' })).toMatchObject({ state: 'locked' });
    expect(await send('edit-reflection')).toMatchObject({ ok: true, state: 'reflection-editing' });
    expect(await send('set-reflection', { response: 'I would review both phase changes.' })).toMatchObject({ state: 'confirmation-required', confirmationToken: 'replace-reflection' });
    expect(await send('set-reflection', { response: 'I would review both phase changes.', confirmed: true })).toMatchObject({ ok: true, state: 'reflection-set' });
  });
});
