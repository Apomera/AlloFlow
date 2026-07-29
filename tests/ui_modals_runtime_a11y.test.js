import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let components;
let root;
let host;
let opener;

const t = (key, options) => {
  if (options?.returnObjects && key === 'codenames.adjectives') return ['Brave', 'Curious'];
  if (options?.returnObjects && key === 'codenames.animals') return ['Otter', 'Falcon'];
  return key;
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t });
  window.UiLanguageSelector = () => React.createElement('button', { type: 'button' }, 'Language');
  window.__alloFocusTrapStack = [];
  window.__uiModalWrites = [];
  window._fbDoc = (_db, ...parts) => parts.join('/');
  window._fbUpdateDoc = async (ref, payload) => { window.__uiModalWrites.push({ ref, payload }); };
  window.__alloHooks = {
    useFocusTrap(ref, isOpen, onEscape) {
      const escapeRef = React.useRef(onEscape);
      escapeRef.current = onEscape;
      React.useEffect(() => {
        if (!isOpen || !ref.current) return undefined;
        const dialog = ref.current;
        const previousFocus = document.activeElement;
        const stack = window.__alloFocusTrapStack;
        const trap = { root: dialog };
        stack.push(trap);
        const isTop = () => stack.at(-1) === trap;
        const focusable = () => Array.from(dialog.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ));
        const onKeyDown = (event) => {
          if (!isTop()) return;
          if (event.key === 'Escape') {
            if (escapeRef.current) {
              event.preventDefault();
              event.stopPropagation();
              escapeRef.current();
            }
            return;
          }
          if (event.key !== 'Tab') return;
          const items = focusable();
          const first = items[0];
          const last = items.at(-1);
          if (!dialog.contains(document.activeElement)) {
            event.preventDefault();
            (event.shiftKey ? last : first)?.focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        };
        document.addEventListener('keydown', onKeyDown);
        (focusable()[0] || dialog).focus();
        return () => {
          document.removeEventListener('keydown', onKeyDown);
          const wasTop = isTop();
          const index = stack.indexOf(trap);
          if (index >= 0) stack.splice(index, 1);
          if (wasTop && previousFocus?.isConnected) previousFocus.focus();
        };
      }, [isOpen, ref]);
    },
  };
  loadAlloModule('ui_modals_module.js');
  components = window.AlloModules;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  opener?.remove();
  host = opener = null;
  window.__alloFocusTrapStack = [];
  window.__uiModalWrites = [];
  delete window.__alloQuizChannelSend;
  vi.restoreAllMocks();
});

async function mount(element) {
  opener = document.createElement('button');
  opener.type = 'button';
  opener.textContent = 'Open modal';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });
}

async function expectNoSeriousAxe(dialog) {
  const results = await axe.run(dialog, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`))
    .toEqual([]);
}

describe('Shared UI modals rendered accessibility', () => {
  it('opens the live quiz after an inactive render without changing hook order', async () => {
    const inactive = {
      quizState: { isActive: false, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {} },
      roster: {},
    };
    const active = { ...inactive, quizState: { ...inactive.quizState, isActive: true } };
    const generatedContent = {
      type: 'quiz',
      data: { questions: [{ question: 'Which answer is correct?', options: ['Alpha', 'Beta'], correctAnswer: 'Alpha' }] },
    };
    await mount(React.createElement(components.StudentQuizOverlay, {
      sessionData: inactive,
      generatedContent,
      user: { uid: 'student-1' },
      activeSessionCode: 'ABC123',
      targetAppId: 'app-1',
    }));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => {
      root.render(React.createElement(components.StudentQuizOverlay, {
        sessionData: active,
        generatedContent,
        user: { uid: 'student-1' },
        activeSessionCode: 'ABC123',
        targetAppId: 'app-1',
      }));
      await Promise.resolve();
    });
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('keeps the selected answer local and writes only a bounded receipt when P2P fails', async () => {
    const submittedAt = 1_721_234_567_890;
    vi.spyOn(Date, 'now').mockReturnValue(submittedAt);
    const p2pSend = vi.fn(() => false);
    window.__alloQuizChannelSend = p2pSend;
    const activityId = 'quiz:' + 'a'.repeat(140);
    const sessionData = {
      quizState: {
        isActive: true,
        activityId,
        mode: 'live-pulse',
        currentQuestionIndex: 0,
        phase: 'answering',
        responses: {},
        teams: {},
      },
      roster: {},
    };
    const generatedContent = {
      type: 'quiz',
      data: {
        questions: [{
          question: 'Which answer is correct?',
          options: ['Alpha', 'Beta'],
          correctAnswer: 'Alpha',
        }],
      },
    };

    const render = async (nextSessionData) => {
      await act(async () => {
        root.render(React.createElement(components.StudentQuizOverlay, {
          sessionData: nextSessionData,
          generatedContent,
          user: { uid: 'student-1' },
          activeSessionCode: 'ABC123',
          targetAppId: 'app-1',
        }));
        await Promise.resolve();
      });
    };
    await mount(React.createElement(components.StudentQuizOverlay, {
      sessionData,
      generatedContent,
      user: { uid: 'student-1' },
      activeSessionCode: 'ABC123',
      targetAppId: 'app-1',
    }));

    const answerButtons = Array.from(host.querySelectorAll('button[data-help-key="quiz_student_answer_option"]'));
    await act(async () => {
      answerButtons[1].click();
      await Promise.resolve();
    });

    expect(p2pSend).toHaveBeenCalledWith('boss:0', 1);
    expect(window.__uiModalWrites).toHaveLength(1);
    const { payload } = window.__uiModalWrites[0];
    const receiptKey = 'quizState.responseReceipts.student-1';
    expect(Object.keys(payload)).toEqual([receiptKey]);
    expect(payload[receiptKey]).toEqual({
      activityId: activityId.slice(0, 120),
      questionIndex: 0,
      submittedAt,
      flow: 'presentation',
    });
    expect(Object.keys(payload[receiptKey]).sort()).toEqual([
      'activityId',
      'flow',
      'questionIndex',
      'submittedAt',
    ]);
    expect(JSON.stringify(payload)).not.toContain('Beta');
    expect(JSON.stringify(payload)).not.toContain('optionIndex');
    expect(answerButtons[1].getAttribute('aria-pressed')).toBe('true');

    await render({
      ...sessionData,
      quizState: {
        ...sessionData.quizState,
        phase: 'revealed',
        responses: {},
        responseReceipts: { 'student-1': payload[receiptKey] },
      },
    });
    expect(host.querySelector('[role="dialog"]').textContent).toContain('quiz.status.result_incorrect');
  });

  it('does not publish a receipt when the P2P answer succeeds', async () => {
    window.__alloQuizChannelSend = vi.fn(() => true);
    const sessionData = {
      quizState: {
        isActive: true,
        activityId: 'quiz:ABC123:attempt-1',
        mode: 'live-pulse',
        currentQuestionIndex: 0,
        phase: 'answering',
        responses: {},
        teams: {},
      },
      roster: {},
    };
    const generatedContent = {
      type: 'quiz',
      data: { questions: [{ question: 'Choose one.', options: ['Alpha', 'Beta'], correctAnswer: 'Alpha' }] },
    };
    await mount(React.createElement(components.StudentQuizOverlay, {
      sessionData,
      generatedContent,
      user: { uid: 'student-1' },
      activeSessionCode: 'ABC123',
      targetAppId: 'app-1',
    }));
    const answer = host.querySelector('button[data-help-key="quiz_student_answer_option"]');
    await act(async () => {
      answer.click();
      await Promise.resolve();
    });
    expect(window.__alloQuizChannelSend).toHaveBeenCalledWith('boss:0', 0);
    expect(window.__uiModalWrites).toEqual([]);
    expect(answer.getAttribute('aria-pressed')).toBe('true');
  });

  it('reuses existing question and option images in the live quiz with stable accessible option names', async () => {
    const questionImage = 'data:image/png;base64,QUFB';
    const nextQuestionImage = 'data:image/png;base64,QkJC';
    const optionImageA = 'data:image/png;base64,Q0ND';
    const optionImageB = 'data:image/png;base64,RERE';
    const nextOptionImage = 'data:image/png;base64,RUVF';
    const sessionData = {
      quizState: { isActive: true, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {} },
      roster: { 'student-1': { groupId: 'group-1' } },
      groups: { 'group-1': { name: 'French readers', language: 'French' } },
    };
    const generatedContent = {
      type: 'quiz',
      data: {
        questions: [{
          question: 'Which map shows the river?',
          question_en: 'Which map shows the river?',
          imageUrl: questionImage,
          imageAlt: 'Map with a river running through the eastern valley',
          options: ['Map A', 'Map B', 'Map C'],
          options_en: ['Carte A', 'Carte B', 'Carte C'],
          optionImageUrls: [optionImageA, optionImageB, null],
          correctAnswer: 'Map A',
        }, {
          question: 'Which map shows the lake?',
          imageUrl: nextQuestionImage,
          options: ['Map D', 'Map E'],
          optionImageUrls: [null, nextOptionImage],
          correctAnswer: 'Map E',
        }],
      },
    };

    await mount(React.createElement(components.StudentQuizOverlay, {
      sessionData,
      generatedContent,
      user: { uid: 'student-1' },
      activeSessionCode: 'MEDIA1',
      targetAppId: 'app-1',
    }));

    const dialog = host.querySelector('[role="dialog"]');
    const renderedQuestionImage = dialog.querySelector('[data-live-quiz-question-image="true"]');
    expect(renderedQuestionImage).not.toBeNull();
    expect(renderedQuestionImage.getAttribute('src')).toBe(questionImage);
    expect(renderedQuestionImage.getAttribute('alt')).toBe('Map with a river running through the eastern valley');
    expect(renderedQuestionImage.getAttribute('loading')).toBe('eager');

    const renderedOptionImages = Array.from(dialog.querySelectorAll('[data-live-quiz-option-image]'));
    expect(renderedOptionImages).toHaveLength(2);
    expect(renderedOptionImages.map(image => image.getAttribute('alt'))).toEqual(['', '']);
    expect(renderedOptionImages.every(image => image.getAttribute('aria-hidden') === 'true')).toBe(true);

    const answerButtons = Array.from(dialog.querySelectorAll('button[data-help-key="quiz_student_answer_option"]'));
    expect(answerButtons.map(button => button.getAttribute('aria-label'))).toEqual(['Map A. Carte A', 'Map B. Carte B', 'Map C. Carte C']);
    expect(answerButtons.map(button => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);
    await act(async () => {
      answerButtons[0].click();
      await Promise.resolve();
    });
    expect(answerButtons[0].getAttribute('aria-pressed')).toBe('true');

    act(() => renderedOptionImages[1].dispatchEvent(new Event('error')));
    expect(renderedOptionImages[1].hidden).toBe(true);

    const nextSessionData = {
      ...sessionData,
      quizState: { ...sessionData.quizState, currentQuestionIndex: 1, responses: {} },
    };
    await act(async () => {
      root.render(React.createElement(components.StudentQuizOverlay, {
        sessionData: nextSessionData,
        generatedContent,
        user: { uid: 'student-1' },
        activeSessionCode: 'MEDIA1',
        targetAppId: 'app-1',
      }));
      await Promise.resolve();
    });
    expect(dialog.querySelector('[data-live-quiz-question-image="true"]').getAttribute('src')).toBe(nextQuestionImage);
    const nextImages = Array.from(dialog.querySelectorAll('[data-live-quiz-option-image]'));
    expect(nextImages).toHaveLength(1);
    expect(nextImages[0].getAttribute('data-live-quiz-option-image')).toBe('1');
    expect(nextImages[0].getAttribute('src')).toBe(nextOptionImage);
    expect(dialog.innerHTML).not.toContain(optionImageA);
    await expectNoSeriousAxe(dialog);
  });

  it('reuses roster groups for deterministic Team Showdown colors and reports individual correctness honestly', async () => {
    const groups = {
      'group-d': { name: 'Delta' },
      'group-b': { name: 'Beta' },
      'group-c': { name: 'Gamma' },
      'group-a': { name: 'Alpha' },
    };
    const baseSession = {
      quizState: { isActive: true, mode: 'team-showdown', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {} },
      roster: {
        'student-1': { groupId: 'group-b' },
        'student-2': { groupId: 'group-b' },
        'student-3': { groupId: 'group-d' },
      },
      groups,
    };
    const generatedContent = {
      type: 'quiz',
      data: { questions: [{ question: 'Choose Alpha.', options: ['Alpha', 'Beta'], correctAnswer: 'Alpha' }] },
    };
    const renderFor = async (user) => {
      await act(async () => {
        root.render(React.createElement(components.StudentQuizOverlay, {
          sessionData: baseSession,
          generatedContent,
          user,
          activeSessionCode: 'TEAM1',
          targetAppId: 'app-1',
        }));
        await Promise.resolve();
      });
    };

    await mount(React.createElement(components.StudentQuizOverlay, {
      sessionData: baseSession,
      generatedContent,
      user: { uid: 'student-1' },
      activeSessionCode: 'TEAM1',
      targetAppId: 'app-1',
    }));
    await renderFor({ uid: 'student-2' });
    await renderFor({ uid: 'student-3' });

    const assignments = window.__uiModalWrites
      .map(write => Object.entries(write.payload).find(([key]) => key.startsWith('quizState.teams.')))
      .filter(Boolean)
      .map(([key, value]) => [key.split('.').at(-1), value]);
    expect(assignments).toEqual([
      ['student-1', 'Blue'],
      ['student-2', 'Blue'],
      ['student-3', 'Yellow'],
    ]);

    const revealed = {
      ...baseSession,
      quizState: {
        ...baseSession.quizState,
        phase: 'revealed',
        responses: { 'student-1': 0 },
        teams: { 'student-1': 'Blue' },
      },
    };
    await act(async () => {
      root.render(React.createElement(components.StudentQuizOverlay, {
        sessionData: revealed,
        generatedContent,
        user: { uid: 'student-1' },
        activeSessionCode: 'TEAM1',
        targetAppId: 'app-1',
      }));
      await Promise.resolve();
    });
    const dialogText = host.querySelector('[role="dialog"]').textContent;
    expect(dialogText).toContain('quiz.status.result_correct');
    expect(dialogText).not.toContain('quiz.status.result_score');
    expect(dialogText).not.toContain('quiz.status.result_no_points');
  });

  it('contains live-quiz focus, permits Escape, restores focus, and offers re-entry', async () => {
    const sessionData = {
      quizState: { isActive: true, mode: 'live-pulse', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {} },
      roster: {},
    };
    const generatedContent = {
      type: 'quiz',
      data: { questions: [{ question: 'Which answer is correct?', options: ['Alpha', 'Beta'], correctAnswer: 'Alpha' }] },
    };
    await mount(React.createElement(components.StudentQuizOverlay, {
      sessionData,
      generatedContent,
      user: { uid: 'student-1' },
      activeSessionCode: 'ABC123',
      targetAppId: 'app-1',
    }));
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('student-quiz-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('student-quiz-question');
    expect(document.activeElement.textContent).toContain('Alpha');
    await expectNoSeriousAxe(dialog);

    const first = dialog.querySelector('button[data-help-key="quiz_student_answer_option"]');
    const exit = dialog.querySelector('button[aria-label="Leave live quiz view"]');
    exit.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(first);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(exit);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector('button').textContent).toContain('Return to live quiz');
    expect(document.activeElement).toBe(opener);
  });

  it('renders the four shared setup dialogs with names, descriptions, and no serious axe violations', async () => {
    const cases = [
      [components.TeacherGate, { isOpen: true, onClose: vi.fn(), onUnlock: vi.fn() }, 'teacher-gate-title'],
      [components.RoleSelectionModal, { onSelect: vi.fn(), onGateRequired: vi.fn() }, 'role-selection-title'],
      [components.StudentEntryModal, { isOpen: true, onClose: vi.fn(), onConfirm: vi.fn() }, 'student-entry-title'],
      [components.StudentWelcomeModal, { isOpen: true, onClose: vi.fn(), onUpload: vi.fn() }, 'student-welcome-title'],
    ];
    for (const [Component, props, titleId] of cases) {
      await mount(React.createElement(Component, props));
      const dialog = host.querySelector('[role="dialog"]');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe(titleId);
      expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
      if (titleId === 'teacher-gate-title') {
        expect(document.activeElement.id).toBe('teacher-gate-access-code');
      }
      await expectNoSeriousAxe(dialog);
      act(() => root.unmount());
      root = null;
      host.remove();
      opener.remove();
      host = opener = null;
      window.__alloFocusTrapStack = [];
    }
  });

  it('exposes boss and class health values and announces remote outcome changes', async () => {
    const sessionData = {
      quizState: {
        isActive: true,
        mode: 'boss-battle',
        currentQuestionIndex: 0,
        phase: 'revealed',
        responses: { 'student-1': 0 },
        teams: {},
        bossStats: {
          name: 'Syntax Serpent',
          currentHP: 70,
          maxHP: 100,
          classHP: 85,
          classMaxHP: 100,
          lastDamage: 10,
          lastClassDamage: 5,
          isGenerating: false,
        },
      },
      roster: {},
    };
    const generatedContent = {
      type: 'quiz',
      data: { questions: [{ question: 'Choose the verb.', options: ['Run', 'Blue'], correctAnswer: 'Run' }] },
    };
    await mount(React.createElement(components.StudentQuizOverlay, {
      sessionData,
      generatedContent,
      user: { uid: 'student-1' },
      activeSessionCode: 'BOSS1',
      targetAppId: 'app-1',
    }));
    const dialog = host.querySelector('[role="dialog"]');
    const progressbars = Array.from(dialog.querySelectorAll('[role="progressbar"]'));
    expect(progressbars).toHaveLength(2);
    expect(progressbars[0].getAttribute('aria-label')).toBe('Syntax Serpent health');
    expect(progressbars[0].getAttribute('aria-valuenow')).toBe('70');
    expect(progressbars[0].getAttribute('aria-valuemax')).toBe('100');
    expect(progressbars[1].getAttribute('aria-label')).toBe('quiz.boss.class_hp');
    expect(progressbars[1].getAttribute('aria-valuenow')).toBe('85');
    expect(dialog.querySelectorAll('[role="status"]').length).toBeGreaterThanOrEqual(2);
    await expectNoSeriousAxe(dialog);
  });

  it('keeps microphone feedback outside the disabled control and exposes busy state', async () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    await mount(React.createElement(components.RoleSelectionModal, {
      onSelect: vi.fn(),
      onGateRequired: vi.fn(),
    }));
    const micButton = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('roles.mic_enable'));
    act(() => micButton.click());
    await act(async () => { await Promise.resolve(); });
    expect(micButton.getAttribute('aria-busy')).toBe('false');
    expect(micButton.textContent).toContain('roles.voice_not_supported');
    const status = host.querySelector('#role-mic-status');
    expect(status.textContent).toContain('roles.voice_not_supported');
    expect(micButton.contains(status)).toBe(false);
  });
});