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
  // The REAL focus trap from the host. A hand copy here fell behind it (it never
  // learned `data-autofocus`), so focus bugs and fixes were measured against a
  // hook the app does not run.
  const hostSource = require('node:fs').readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  const trapStart = hostSource.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
  const trapEnd = hostSource.indexOf('window.__alloHooks = { useFocusTrap };', trapStart);
  if (trapStart < 0 || trapEnd < 0) throw new Error('useFocusTrap not found in AlloFlowANTI.txt');
  const realUseFocusTrap = new Function('useRef', 'useEffect', hostSource.slice(trapStart, trapEnd) + '\nreturn useFocusTrap;')(React.useRef, React.useEffect);
  window.__alloHooks = { useFocusTrap: realUseFocusTrap };
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
    // Since 2026-09-08 (0bb48eb97) an answer that reached the teacher only as a
    // participation receipt was never scored, so there is no Correct/Incorrect
    // card: the student is told it was not scored, and the options still mark
    // the right answer and their own pick.
    const revealedText = host.querySelector('[role="dialog"]').textContent;
    expect(revealedText).toContain('quiz.live_student.receipt_not_scored');
    expect(revealedText).not.toContain('quiz.status.result_incorrect');
    expect(revealedText).not.toContain('quiz.status.result_correct');
    const revealedOptions = Array.from(host.querySelectorAll('button[data-help-key="quiz_student_answer_option"]'));
    expect(revealedOptions[0].className).toContain('bg-green-700');
    expect(revealedOptions[1].className).toContain('bg-red-600');
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
    // Name the element: <body>'s text contains "Alpha" too.
    expect(document.activeElement.getAttribute('data-help-key')).toBe('quiz_student_answer_option');
    expect(document.activeElement.textContent).toContain('Alpha');
    await expectNoSeriousAxe(dialog);

    // Focus stays inside: Tab from the last control wraps to the first (Minimize,
    // first in the header since 2026-09-08) and Shift+Tab wraps back.
    const exit = dialog.querySelector('button[aria-label="quiz.live_student.minimize_aria"]');
    const enabled = Array.from(dialog.querySelectorAll('button:not([disabled])'));
    expect(enabled[0]).toBe(exit);
    const last = enabled[enabled.length - 1];
    last.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(exit);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(last);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector('button').textContent).toContain('quiz.live_student.return_to_quiz');
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
    // The boss's NAME must reach screen readers, which only a translator that
    // fills {placeholders} can show: resolve from the real registry, as the host does.
    const uiStrings = JSON.parse(require('node:fs').readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
    const registryT = (key, params = {}) => {
      let value = String(key).split('.').reduce((node, part) => node && node[part], uiStrings);
      if (typeof value !== 'string') return undefined;
      Object.keys(params || {}).forEach((name) => { value = value.replace('{' + name + '}', params[name]); });
      return value;
    };
    await mount(React.createElement(window.AlloLanguageContext.Provider, { value: { t: registryT } },
      React.createElement(components.StudentQuizOverlay, {
        sessionData,
        generatedContent,
        user: { uid: 'student-1' },
        activeSessionCode: 'BOSS1',
        targetAppId: 'app-1',
      })));
    const dialog = host.querySelector('[role="dialog"]');
    const progressbars = Array.from(dialog.querySelectorAll('[role="progressbar"]'));
    expect(progressbars).toHaveLength(2);
    expect(progressbars[0].getAttribute('aria-label')).toBe('Syntax Serpent health');
    expect(progressbars[0].getAttribute('aria-valuenow')).toBe('70');
    expect(progressbars[0].getAttribute('aria-valuemax')).toBe('100');
    expect(progressbars[1].getAttribute('aria-label')).toBe(uiStrings.quiz.boss.class_hp);
    expect(progressbars[1].getAttribute('aria-valuenow')).toBe('85');
    expect(dialog.querySelectorAll('[role="status"]').length).toBeGreaterThanOrEqual(2);
    await expectNoSeriousAxe(dialog);
  });

  it('renders one description under every role card, inside the button that names it', async () => {
    await mount(React.createElement(components.RoleSelectionModal, {
      onSelect: vi.fn(),
      onGateRequired: vi.fn(),
    }));
    const expected = {
      role_student: 'Join your class and learn with a private codename.',
      role_teacher: 'Build accessible lessons and adapt materials for your class.',
      role_parent: 'Support learning at home with family-friendly tools.',
      role_independent: 'Study at your own pace with progress tracking and no class to join.',
    };
    for (const [helpKey, description] of Object.entries(expected)) {
      const card = host.querySelector(`button[data-help-key="${helpKey}"]`);
      expect(card, helpKey).toBeTruthy();
      // The description is part of the button's accessible name, so a screen-reader user hears
      // what the role means before choosing it.
      expect(card.textContent, helpKey).toContain(description);
      expect(card.querySelectorAll('span.text-xs.text-slate-600'), helpKey).toHaveLength(1);
    }
    await expectNoSeriousAxe(host.querySelector('[role="dialog"]'));
  });

  it('keeps microphone feedback outside the disabled control and exposes busy state', async () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    await mount(React.createElement(components.RoleSelectionModal, {
      onSelect: vi.fn(),
      onGateRequired: vi.fn(),
    }));
    const micButton = host.querySelector('[data-help-key="role_voice_access"]');
    expect(micButton).toBeTruthy();
    act(() => micButton.click());
    await act(async () => { await Promise.resolve(); });
    expect(micButton.getAttribute('aria-busy')).toBe('false');
    expect(micButton.textContent).toContain('Voice features are not supported in this browser.');
    const status = host.querySelector('#role-mic-status');
    expect(status.textContent).toContain('Voice features are not supported in this browser.');
    expect(micButton.contains(status)).toBe(false);
  });
});
