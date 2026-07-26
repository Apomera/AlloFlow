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