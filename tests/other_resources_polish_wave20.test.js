import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let StudentSubmitModal;
let DraftFeedbackInterface;
let InteractiveBlueprintCard;
let HarmonyMeter;
let CharacterColumn;
let StudentQuizOverlay;
let TeacherGate;
let RoleSelectionModal;
let StudentEntryModal;
let StudentWelcomeModal;
let AdventureView;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function setFieldValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  act(() => { el.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

async function runAxe(container) {
  const result = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  });
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
}

const PassthroughErrorBoundary = ({ children }) => React.createElement(React.Fragment, null, children);
const NullComponent = () => null;

const defaultT = (key, opts) => {
  if (opts?.returnObjects && key === 'codenames.adjectives') return ['Brave', 'Curious'];
  if (opts?.returnObjects && key === 'codenames.animals') return ['Otter', 'Falcon'];
  return key;
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  window.AlloLanguageContext = React.createContext({ t: defaultT });
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.UiLanguageSelector = () => React.createElement('button', { type: 'button' }, 'Language');
  window.__alloHooks = { useFocusTrap: () => {} };
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  loadAlloModule('student_interaction_module.js');
  loadAlloModule('persona_ui_module.js');
  loadAlloModule('ui_modals_module.js');
  loadAlloModule('view_adventure_module.js');

  StudentSubmitModal = window.AlloModules.StudentSubmitModal || window.StudentSubmitModal;
  DraftFeedbackInterface = window.AlloModules.DraftFeedbackInterface || window.DraftFeedbackInterface;
  InteractiveBlueprintCard = window.AlloModules.InteractiveBlueprintCard;
  HarmonyMeter = window.AlloModules.HarmonyMeter;
  CharacterColumn = window.AlloModules.CharacterColumn;
  StudentQuizOverlay = window.AlloModules.StudentQuizOverlay;
  TeacherGate = window.AlloModules.TeacherGate;
  RoleSelectionModal = window.AlloModules.RoleSelectionModal;
  StudentEntryModal = window.AlloModules.StudentEntryModal;
  StudentWelcomeModal = window.AlloModules.StudentWelcomeModal;
  AdventureView = window.AlloModules.AdventureView;
});

afterEach(async () => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    await act(async () => { root.unmount(); });
    host.remove();
  }
  delete window.__alloFocusTrapStack;
  delete window.__alloScrollLockState;
  delete window.__alloAiUsable;
  delete window.callGemini;
  delete window.callImagen;
  delete window.__alloQuizChannelSend;
  document.body.style.overflow = '';
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('Wave 20 polish — StudentInteraction, PersonaUI, UIModals, AdventureView', () => {
  it('StudentSubmitModal and DraftFeedbackInterface provide total count, receipt status badge, live word counters, rubric progressbars, and pass axe', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true, delivery: 'mailbox' }));
    const submitHost = mountEl(React.createElement(StudentSubmitModal, {
      isOpen: true,
      onClose: vi.fn(),
      onSubmit,
      history: [{ type: 'quiz' }, { type: 'simplified' }, { type: 'adventure' }],
      currentNickname: 'Brave Otter',
      submissionMethod: 'mailbox',
    }));

    expect(submitHost.querySelector('[data-submit-total-count="3"]')?.textContent).toContain('3');
    expect(submitHost.querySelector('h2')?.textContent).toBe('Submit Work');
    await runAxe(submitHost);

    const submitBtn = submitHost.querySelector('[data-help-key="submit_confirm_btn"]');
    await act(async () => {
      submitBtn.click();
      await Promise.resolve();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(submitHost.querySelector('[data-submit-receipt-badge="mailbox"]')?.textContent).toContain('Delivered');
    await runAxe(submitHost);

    function DraftHarness({ mode }) {
      const [draft, setDraft] = React.useState('Photosynthesis converts light energy into glucose.');
      return React.createElement(DraftFeedbackInterface, {
        status: mode,
        draftText: draft,
        setDraftText: setDraft,
        previousDraft: 'Plants use light.',
        draftCount: 1,
        rubricCriteria: ['Include scientific evidence', 'Explain cause and effect'],
        gradingDetails: {
          rawScore: 76,
          breakdown: [
            { criterion: 'Evidence', score: 5, max: 5, reason: 'Strong textual evidence.' },
            { criterion: 'Explanation', score: 2, max: 5, reason: 'Expand on chlorophyll role.' },
          ],
        },
        onSubmit: vi.fn(),
        onCancel: vi.fn(),
      });
    }

    const writeHost = mountEl(React.createElement(DraftHarness, { mode: 'writing' }));
    expect(writeHost.querySelector('[data-draft-rubric-disclosure="true"]')).toBeTruthy();
    expect(writeHost.querySelector('[data-draft-word-count="true"]')?.textContent).toContain('6 words');
    const clearBtn = writeHost.querySelector('[data-draft-clear="true"]');
    expect(clearBtn).toBeTruthy();
    await runAxe(writeHost);

    act(() => { clearBtn.click(); });
    expect(writeHost.querySelector('[data-draft-word-count="true"]')?.textContent).toContain('0 words');
    expect(writeHost.querySelector('[data-draft-clear="true"]')).toBeNull();

    const revHost = mountEl(React.createElement(DraftHarness, { mode: 'revision' }));
    expect(revHost.querySelector('[data-rubric-criterion-status="met"]')?.textContent).toContain('Met');
    expect(revHost.querySelector('[data-rubric-criterion-status="revise"]')?.textContent).toContain('Needs revision');
    const bars = revHost.querySelectorAll('[role="progressbar"]');
    expect(bars).toHaveLength(2);
    expect(bars[0].getAttribute('aria-valuetext')).toContain('5 of 5 (100%), Met');
    expect(revHost.querySelector('[role="region"][tabindex="0"]')).toBeTruthy();
    expect(revHost.querySelector('[data-draft-word-count="true"]')?.textContent).toContain('+3 vs previous draft');
    await runAxe(revHost);
  });

  it('PersonaUI BlueprintCard, HarmonyMeter, and CharacterColumn expose touch add buttons, run progressbar, copy status, aria-valuetext, and pass axe', async () => {
    window.__alloAiUsable = () => true;
    const onUpdate = vi.fn();
    const onCopyDiagnostics = vi.fn();
    const baseConfig = {
      lessonDNA: {
        essentialQuestion: 'How do ecosystems recover after disturbance?',
        goldenThread: ['Succession'],
        keyTerms: ['Biodiversity'],
      },
      resourcePlan: [
        { uiId: 'step-1', tool: 'glossary', directive: 'Define key ecosystem terms.' },
        { uiId: 'step-2', tool: 'quiz', directive: 'Check understanding of succession.' },
      ],
    };

    const runState = {
      done: false,
      status: 'running',
      rows: {
        'step-1': { tool: 'glossary', status: 'landed' },
        'step-2': { tool: 'quiz', status: 'running' },
      },
    };

    const bpRunHost = mountEl(React.createElement('div', null,
      React.createElement('h1', null, 'Lesson Studio'),
      React.createElement('h2', null, 'Plan'),
      React.createElement('h3', null, 'Blueprint'),
      React.createElement(InteractiveBlueprintCard, {
        config: baseConfig,
        run: runState,
        isRunning: true,
        onStopRun: vi.fn(),
        onCopyDiagnostics,
        onDownloadDiagnostics: vi.fn(),
        onUpdate,
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      })
    ));

    const runBar = bpRunHost.querySelector('[data-testid="bp-run-progress"] [role="progressbar"]');
    expect(runBar).toBeTruthy();
    expect(runBar.getAttribute('aria-valuetext')).toContain('1 of 2 steps finished (50%)');
    const copyBtn = bpRunHost.querySelector('[data-testid="bp-copy-diagnostics"]');
    act(() => { copyBtn.click(); });
    expect(onCopyDiagnostics).toHaveBeenCalledTimes(1);
    expect(copyBtn.textContent).toContain('Copied!');
    expect(bpRunHost.querySelector('[data-bp-copy-status="true"]')?.textContent).toContain('copied');
    await runAxe(bpRunHost);

    const bpEditHost = mountEl(React.createElement('div', null,
      React.createElement('h1', null, 'Lesson Studio'),
      React.createElement('h2', null, 'Plan'),
      React.createElement('h3', null, 'Blueprint'),
      React.createElement(InteractiveBlueprintCard, {
        config: baseConfig,
        run: null,
        isRunning: false,
        onUpdate,
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      })
    ));
    const editBtn = bpEditHost.querySelector('[data-help-key="blueprint_edit_toggle_btn"]');
    expect(editBtn.getAttribute('aria-pressed')).toBe('false');
    act(() => { editBtn.click(); });
    expect(editBtn.getAttribute('aria-pressed')).toBe('true');

    const conceptInput = bpEditHost.querySelector('input[aria-label="Add concept"]');
    setFieldValue(conceptInput, 'Resilience');
    const addConceptBtn = bpEditHost.querySelector('[data-golden-add-concept="true"]');
    expect(addConceptBtn).toBeTruthy();
    act(() => { addConceptBtn.click(); });
    expect(bpEditHost.querySelector('[data-golden-thread-status="true"]')?.textContent).toContain('Added concept "Resilience"');
    await runAxe(bpEditHost);

    const panelHost = mountEl(React.createElement('div', null,
      React.createElement('h1', null, 'Panel Debate'),
      React.createElement('h2', null, 'Speakers'),
      React.createElement(HarmonyMeter, { score: 85 }),
      React.createElement(CharacterColumn, {
        side: 'left',
        character: {
          name: 'Ada Lovelace',
          role: 'Mathematician',
          rapport: 75,
          accumulatedXP: 150,
          quests: [
            { id: 'q1', text: 'Ask about algorithms', difficulty: 20, isCompleted: true },
            { id: 'q2', text: 'Explore the Analytical Engine', difficulty: 40, isCompleted: false },
          ],
        },
      })
    ));

    const meters = panelHost.querySelectorAll('[role="progressbar"]');
    expect(meters).toHaveLength(3);
    expect(meters[0].getAttribute('aria-valuetext')).toContain('85%');
    expect(meters[0].getAttribute('aria-valuetext')).toContain('Common Ground');
    expect(meters[1].getAttribute('aria-valuetext')).toContain('Ada Lovelace rapport: 75% (High trust)');
    expect(meters[2].getAttribute('aria-valuetext')).toContain('Ada Lovelace XP: 150 of 300 (50%)');
    expect(panelHost.querySelector('[data-character-objectives-summary="true"]')?.textContent).toBe('1/2');
    await runAxe(panelHost);
  });

  it('UIModals QuizOverlay, TeacherGate, RoleSelection, StudentEntry, and StudentWelcome provide 44px controls, password toggle, valuetext, and pass axe', async () => {
    const bossQuizHost = mountEl(React.createElement(StudentQuizOverlay, {
      sessionData: {
        quizState: {
          isActive: true,
          mode: 'boss-battle',
          currentQuestionIndex: 0,
          phase: 'answering',
          responses: {},
          teams: {},
          bossStats: { name: 'Draco', currentHP: 60, maxHP: 100, classHP: 80, classMaxHP: 100 },
        },
        roster: {},
      },
      generatedContent: {
        type: 'quiz',
        data: {
          questions: [{
            question: 'Explain why seasons change.',
            type: 'self-explanation',
          }],
        },
      },
      user: { uid: 'student-1' },
      activeSessionCode: 'ROOM1',
      targetAppId: 'app-1',
    }));

    const bossBars = bossQuizHost.querySelectorAll('[role="progressbar"]');
    expect(bossBars).toHaveLength(2);
    expect(bossBars[0].getAttribute('aria-valuetext')).toBe('60 of 100 HP (60%)');
    expect(bossBars[1].getAttribute('aria-valuetext')).toBe('80 of 100 HP (80%)');

    const written = bossQuizHost.querySelector('#live-quiz-written-response');
    setFieldValue(written, 'Earth is tilted on its axis.');
    expect(bossQuizHost.querySelector('[data-live-written-count="true"]')?.textContent).toContain('28 / 6000');
    const clearWritten = bossQuizHost.querySelector('[data-live-written-clear="true"]');
    expect(clearWritten).toBeTruthy();
    await runAxe(bossQuizHost);
    act(() => { clearWritten.click(); });
    expect(bossQuizHost.querySelector('[data-live-written-clear="true"]')).toBeNull();

    const seqHost = mountEl(React.createElement(StudentQuizOverlay, {
      sessionData: {
        quizState: { isActive: true, mode: 'live-quiz', currentQuestionIndex: 0, phase: 'answering', responses: {}, teams: {} },
        roster: {},
      },
      generatedContent: {
        type: 'quiz',
        data: {
          questions: [{
            question: 'Check the sequence.',
            type: 'sequence-sense',
            items: ['Evaporation', 'Condensation', 'Precipitation'],
            presentedOrder: [0, 2, 1],
          }],
        },
      },
      user: { uid: 'student-1' },
      activeSessionCode: 'ROOM1',
      targetAppId: 'app-1',
    }));
    const yesOrderBtn = Array.from(seqHost.querySelectorAll('button')).find((b) => /order_yes|Yes, it is correct/i.test(b.textContent));
    expect(yesOrderBtn).toBeTruthy();
    act(() => { yesOrderBtn.click(); });
    const moveUpBtns = Array.from(seqHost.querySelectorAll('[data-live-sequence-arrange="true"] button[aria-label*="move_up"], [data-live-sequence-arrange="true"] button[aria-label*="Move up"]'));
    expect(moveUpBtns[1].className).toContain('min-h-11');
    act(() => { moveUpBtns[1].click(); });
    expect(seqHost.querySelector('[data-live-sequence-status="true"]')?.textContent).toContain('Moved');
    await runAxe(seqHost);

    const gateHost = mountEl(React.createElement(TeacherGate, {
      isOpen: true,
      onClose: vi.fn(),
      onUnlock: vi.fn(),
    }));
    const codeInput = gateHost.querySelector('#teacher-gate-access-code');
    const toggleBtn = gateHost.querySelector('[data-teacher-gate-toggle-visibility="true"]');
    expect(codeInput.type).toBe('password');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
    act(() => { toggleBtn.click(); });
    expect(codeInput.type).toBe('text');
    expect(toggleBtn.getAttribute('aria-pressed')).toBe('true');
    await runAxe(gateHost);

    const roleHost = mountEl(React.createElement(RoleSelectionModal, {
      onSelect: vi.fn(),
      onGateRequired: vi.fn(),
    }));
    expect(roleHost.querySelector('[data-help-key="role_voice_access"]')?.className).toContain('min-h-11');
    await runAxe(roleHost);

    const entryHost = mountEl(React.createElement(StudentEntryModal, {
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
    }));
    await runAxe(entryHost);

    const welcomeHost = mountEl(React.createElement(StudentWelcomeModal, {
      isOpen: true,
      onClose: vi.fn(),
      onUpload: vi.fn(),
    }));
    await runAxe(welcomeHost);
  });

  it('AdventureView provides energy aria-valuetext, composer word count/clear, debrief rating symbol, focus-safe fluency dialog, and passes axe', async () => {
    window.__alloAiUsable = () => true;
    function AdventureHarness() {
      const [textInput, setTextInput] = React.useState('Investigate the river valley carefully');
      const [advState, setAdvState] = React.useState({
        currentScene: {
          id: 'scene-1',
          text: 'You stand beside the misty river bridge. The lantern glows in the dusk.',
          options: ['Cross the wooden bridge', 'Inspect the river bank'],
        },
        history: [{
          type: 'feedback',
          text: 'Strong observation.',
          consequence: {
            version: 1,
            reasoning: 'strategic_success',
            explanation: 'You noticed the fresh footprints before crossing.',
            changes: [{ key: 'energy', label: 'Energy', before: 80, after: 75 }],
            concepts: ['Observation'],
          },
        }],
        level: 2,
        xp: 60,
        xpToNextLevel: 150,
        energy: 75,
        gold: 25,
        turnCount: 2,
        episodeTurnLimit: 12,
        inventory: [],
        stats: { decisions: 1, conceptsFound: ['Observation'] },
        isLoading: false,
        isGameOver: false,
        isImmersiveMode: false,
      });

      return React.createElement('main', null,
        React.createElement('h1', null, 'AlloFlow'),
        React.createElement('h2', null, 'Adventure'),
        React.createElement(AdventureView, {
          ErrorBoundary: PassthroughErrorBoundary,
          ClimaxProgressBar: NullComponent,
          AdventureAmbience: NullComponent,
          AdventureShop: NullComponent,
          AnimatedNumber: ({ value }) => React.createElement('span', null, String(value)),
          InventoryGrid: NullComponent,
          ConfettiExplosion: NullComponent,
          AdventureAudioControls: NullComponent,
          t: (key) => {
            const map = {
              'adventure.title': 'Interactive Adventure',
              'adventure.current_scene': 'Current Scene',
              'adventure.log_button': 'Log',
              'adventure.ledger_tooltip': 'Open journey ledger',
              'adventure.view_immersive': 'Immersive',
              'adventure.enter_immersive': 'Enter immersive mode',
              'adventure.auto_read_status_label': 'Auto-read',
              'adventure.auto_read_enable': 'Enable auto-read',
              'adventure.auto_read_disable': 'Disable auto-read',
              'common.on': 'On',
              'common.off': 'Off',
              'common.close': 'Close',
              'common.clear': 'Clear',
              'common.xp': 'XP',
              'common.level_abbrev': 'Lvl',
              'adventure.restart': 'Restart',
              'adventure.placeholder_action': 'Describe your next action...',
            };
            return map[key] || '';
          },
          theme: 'light',
          activeView: 'adventure',
          adventureState: advState,
          setAdventureState: setAdvState,
          adventureEffects: { xp: null, energy: null, levelUp: null },
          adventureInputMode: 'choice',
          adventureFreeResponseEnabled: true,
          adventureTypingPaceEnabled: false,
          adventureFluencyEnabled: true,
          adventureTextInput: textInput,
          setAdventureTextInput: setTextInput,
          adventureInputRef: { current: null },
          adventureScrollRef: { current: null },
          adventureAutoRead: false,
          setAdventureAutoRead: vi.fn(),
          adventureImageSize: 300,
          setAdventureImageSize: vi.fn(),
          isDictationMode: false,
          setIsDictationMode: vi.fn(),
          isEditingOptions: false,
          editingOptionsBuffer: [],
          isTeacherMode: false,
          isProcessing: false,
          isPlaying: false,
          playbackState: { currentIdx: -1 },
          playingContentId: '',
          soundEnabled: false,
          studentProjectSettings: { adventureMinXP: 100 },
          history: [],
          handleAdventureChoice: vi.fn(),
          handleAdventureTextSubmit: vi.fn(),
          handleStartAdventure: vi.fn(),
          handleSetShowLedgerToTrue: vi.fn(),
          handleSetShowLedgerToFalse: vi.fn(),
          handleToggleAdventureImmersive: vi.fn(),
          handleExitAdventureImmersive: vi.fn(),
          handleSetIsZenModeToTrue: vi.fn(),
          handleSpeak: vi.fn(),
          stopPlayback: vi.fn(),
          splitTextToSentences: (text) => text.split(/(?<=[.!?])\s+/).filter(Boolean),
          formatInteractiveText: (text) => text,
          renderFormattedText: (text) => text,
        })
      );
    }

    const advHost = mountEl(React.createElement(AdventureHarness));

    const energyBar = advHost.querySelector('[data-adventure-meter="energy"] [role="progressbar"]');
    expect(energyBar).toBeTruthy();
    expect(energyBar.getAttribute('aria-valuetext')).toBe('Energy: 75 of 100 (Strong)');
    expect(advHost.querySelector('[data-adventure-debrief-rating="effective"]')?.textContent).toContain('Effective strategy');
    expect(advHost.querySelector('[data-adventure-composer-count="true"]')?.textContent).toBe('5 words');

    const clearComposer = advHost.querySelector('[data-adventure-composer-clear="true"]');
    expect(clearComposer).toBeTruthy();
    await runAxe(advHost);

    act(() => { clearComposer.click(); });
    expect(advHost.querySelector('[data-adventure-composer-clear="true"]')).toBeNull();

    const fluencyBtn = advHost.querySelector('[data-help-key="adventure_scene_reading_practice"]');
    expect(fluencyBtn).toBeTruthy();
    act(() => { fluencyBtn.click(); });

    const fluencyDialog = advHost.querySelector('[role="dialog"][aria-labelledby="adventure-fluency-title"]');
    expect(fluencyDialog).toBeTruthy();
    expect(fluencyDialog.className).not.toContain('focus:outline-none');
    expect(fluencyDialog.querySelector('[role="region"][tabindex="0"]')).toBeTruthy();
    await runAxe(advHost);
  });
});
