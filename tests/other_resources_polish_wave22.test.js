import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import axe from 'axe-core';
import { loadAlloModule } from './setup.js';
import { setupHub, internals as hubInternals } from './helpers/research_hub_harness.js';
import { setupLane, laneConfig } from './helpers/research_lane_harness.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let LessonTeachingScriptView;
let WordSoundsGenerator;

const mounted = [];

function mountEl(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return host;
}

function unmountAll() {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => { root.unmount(); });
    host.remove();
  }
}

function setFieldValue(el, value) {
  const proto = el.tagName === 'SELECT'
    ? window.HTMLSelectElement.prototype
    : el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
  act(() => { el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
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

const NullIcon = () => null;
const emptyT = () => '';
const StubPrimitive = (props) => React.createElement('div', { 'data-stub-primitive': 'true' }, props && props.children);

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  window.AlloLanguageContext = React.createContext({ t: emptyT });
  window.AlloIcons = new Proxy({}, { get: () => NullIcon });
  window.__alloHooks = { useFocusTrap: () => {} };
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));

  loadAlloModule('resource_content_fingerprint_module.js');
  loadAlloModule('lesson_teaching_script_module.js');
  loadAlloModule('view_lesson_teaching_script_module.js');
  loadAlloModule('word_sounds_setup_module.js');

  LessonTeachingScriptView = window.AlloModules.LessonTeachingScriptView;
  WordSoundsGenerator = window.AlloModules.WordSoundsGenerator;

  setupHub();
  setupLane('engineering');
  setupLane('humanities');
});

afterEach(() => {
  unmountAll();
  vi.restoreAllMocks();
});

function sampleScript() {
  return {
    id: 'script-w22',
    schemaVersion: 2,
    scope: 'segment',
    title: 'Compare fractions on a number line',
    createdAt: '2026-09-04T12:00:00.000Z',
    durationMinutes: 15,
    researchStatus: 'retrieved',
    warnings: ['Teaching guidance is not a verification of every generated step.'],
    inputSnapshot: {
      settings: { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', goal: 'Compare fractions' },
      materialIds: ['fractions-cards'],
      materialTitles: [],
    },
    sources: [{
      id: 'wwc',
      title: 'Developing Effective Fractions Instruction',
      url: 'https://ies.ed.gov/ncee/wwc/PracticeGuide/15',
      author: 'Institute of Education Sciences',
      publishedAt: '2010-09',
      retrievedAt: '2026-09-04',
      scope: 'K-8 fractions guidance, applied to this grade 4 lesson.',
      evidenceLevel: 'Moderate evidence',
      evidenceKind: 'content-specific',
      recommendations: [{
        id: 'number-line',
        text: 'Use number lines as a central representation of fractions.',
        locator: 'Recommendation 2',
        evidenceLevel: 'Moderate evidence',
      }],
    }],
    steps: [1, 2, 3].map((index) => ({
      id: 'step-' + index,
      title: 'Compare fractions ' + index,
      minutes: 5,
      phase: 'directInstruction',
      teacherSays: 'Place one half on our shared number line. Explain how equal spaces help you choose its position.',
      studentDoes: 'Learners explain their placements to a partner.',
      checkQuestion: 'How do you know where one half belongs?',
      possibleResponse: 'It is halfway between zero and one.',
      ifStruggling: 'Fold a paper strip into equal halves together.',
      ifReady: 'Compare one half with three fourths and explain.',
      resourceIds: ['fractions-cards'],
      recommendationIds: ['number-line'],
    })),
  };
}

function StatefulLaneHost({ laneName, initialStage }) {
  const lane = laneConfig(laneName);
  const [journal, setJournal] = React.useState(() => Object.assign(
    hubInternals().emptyJournal(),
    { activeLane: laneName, activeStage: initialStage },
  ));
  const ctx = {
    t: emptyT,
    lane,
    journal,
    setJournal,
    ask: async () => ({}),
    addToast: () => {},
    primitives: {
      SuggestionBadge: StubPrimitive,
      ExemplarPair: StubPrimitive,
      VoiceNoteBlock: StubPrimitive,
      CostMeter: StubPrimitive,
    },
    constants: { MAX_AI_CALLS_PER_SESSION: 8, ANSWER_HARD_CAP: 1200, VOICE_NOTE_MAX_SECONDS: 60 },
    onExitLane: () => {},
  };
  return React.createElement('div', { 'data-lane-host': laneName }, lane.render(ctx));
}

describe('Other Resources Polish — Wave 22', () => {
  it('polishes LessonTeachingScriptView and LessonSpokenDirections with accessible progress bars, non-color active badges, aria-busy, and zero axe violations', async () => {
    let resolveAudio;
    const pendingAudio = new Promise((yes) => { resolveAudio = yes; });
    const controller = {
      summary: () => ({ ready: 1, total: 6 }),
      resolve: vi.fn(() => pendingAudio),
      dispose: vi.fn(),
    };
    const host = mountEl(React.createElement(LessonTeachingScriptView, {
      generatedContent: {
        id: 'plan-w22',
        type: 'lesson-plan',
        data: {
          essentialQuestion: 'How can we compare fractions?',
          objectives: ['Compare fractions using models'],
          directInstruction: 'Original teacher plan',
          teachingScripts: [sampleScript()],
        },
      },
      history: [{ id: 'fractions-cards', type: 'source', title: 'Fraction models', data: { text: 'Use equal wholes.' } }],
      isTeacherMode: true,
      isParentMode: false,
      isIndependentMode: false,
      t: emptyT,
      capabilities: { canGenerate: true, canResearch: true },
      defaultSettings: {
        grade: '4th Grade',
        gradeSource: 'plan',
        subject: 'mathematics',
        subjectDetected: true,
        topic: 'Comparing fractions',
        language: 'English',
        standard: '',
        phases: ['directInstruction'],
        suggestedDuration: { segment: 15, lesson: 45 },
      },
      onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }),
      onCancelTeachingScript: vi.fn(),
      onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: true }),
      onOpenTeachingMaterial: vi.fn(),
      createTeachingScriptAudio: () => controller,
    }));

    const expandBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Teaching script+');
    expect(expandBtn).toBeTruthy();
    act(() => { expandBtn.click(); });

    const deliveryBar = host.querySelector('[data-script-delivery-progress="true"]');
    expect(deliveryBar).toBeTruthy();
    expect(deliveryBar.getAttribute('role')).toBe('progressbar');
    expect(deliveryBar.getAttribute('aria-valuenow')).toBe('0');
    expect(deliveryBar.getAttribute('aria-valuemax')).toBe('3');
    expect(deliveryBar.getAttribute('aria-valuetext')).toContain('0 of 3');

    const markDoneBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Mark done');
    expect(markDoneBtn).toBeTruthy();
    expect(markDoneBtn.className).toContain('focus-visible:ring-2');
    act(() => { markDoneBtn.click(); });
    expect(deliveryBar.getAttribute('aria-valuenow')).toBe('1');
    expect(deliveryBar.getAttribute('aria-valuetext')).toContain('1 of 3');

    await runAxe(host);

    const spokenBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Spoken directions');
    expect(spokenBtn).toBeTruthy();
    act(() => { spokenBtn.click(); });

    const spokenProgress = host.querySelector('[data-spoken-step-progress="true"]');
    expect(spokenProgress).toBeTruthy();
    expect(spokenProgress.getAttribute('role')).toBe('progressbar');
    expect(spokenProgress.getAttribute('aria-valuenow')).toBe('1');
    expect(spokenProgress.getAttribute('aria-valuemax')).toBe('3');
    expect(spokenProgress.getAttribute('aria-valuetext')).toContain('Step 1 of 3');

    const nextStepBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Next step');
    act(() => { nextStepBtn.click(); });
    expect(spokenProgress.getAttribute('aria-valuenow')).toBe('2');

    const playBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Play spoken block');
    expect(playBtn).toBeTruthy();
    await act(async () => { playBtn.click(); });
    const activeBadge = host.querySelector('[data-spoken-active-badge="true"]');
    expect(activeBadge).toBeTruthy();
    expect(activeBadge.textContent).toContain('Playing');
    expect(playBtn.getAttribute('aria-busy')).toBe('true');

    await runAxe(host);
    // Clean up pending promise without starting playback
    act(() => {
      const fullBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.trim() === 'Full script');
      fullBtn.click();
    });
    await act(async () => { resolveAudio('blob:noop'); });
  });

  it('polishes ResearchLaneEngineering with WAI-ARIA Tabs keyboard navigation, progress bar, stakeholder alert/counter, and zero axe violations', async () => {
    const host = mountEl(React.createElement(StatefulLaneHost, { laneName: 'engineering', initialStage: 'define_problem' }));

    const progress = host.querySelector('[data-lane-stage-progress="true"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('6');
    expect(progress.getAttribute('aria-valuetext')).toContain('0 of 6 stages started');
    expect(progress.getAttribute('aria-valuetext')).toContain('Define the Problem');

    const tablist = host.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    expect(tabs.length).toBe(6);
    expect(tabs[0].tabIndex).toBe(0);
    expect(tabs[1].tabIndex).toBe(-1);

    // Live textarea character count on Stage 1
    const charCounter = host.querySelector('[data-textarea-char-count="true"]');
    expect(charCounter).toBeTruthy();
    expect(charCounter.textContent).toContain('/');

    // StakeholderCard validation: generic name triggers aria-invalid + role="alert", plus live justification counter
    const justCount = host.querySelector('[data-stakeholder-just-count="true"]');
    expect(justCount).toBeTruthy();
    expect(justCount.getAttribute('role')).toBe('status');

    const nameInput = host.querySelector('input[type="text"]');
    expect(nameInput).toBeTruthy();
    expect(nameInput.style.minHeight).toBe('44px');
    setFieldValue(nameInput, 'students');
    expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    const alerts = Array.from(host.querySelectorAll('[role="alert"]'));
    expect(alerts.some((el) => el.textContent.toLowerCase().includes('generic') || el.textContent.toLowerCase().includes('specific'))).toBe(true);

    await runAxe(host);

    // WAI-ARIA Tabs Pattern keyboard navigation (ArrowRight, End, Home + IME guard)
    const composingEvt = new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composingEvt, 'isComposing', { value: true });
    act(() => { tabs[0].dispatchEvent(composingEvt); });
    expect(progress.getAttribute('aria-valuetext')).toContain('Define the Problem');

    act(() => { tabs[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(progress.getAttribute('aria-valuetext')).toContain('Develop Candidates');

    const activeTab2 = host.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]');
    act(() => { activeTab2.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true })); });
    expect(progress.getAttribute('aria-valuetext')).toContain('Communicate the Design');

    const activeTab6 = host.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]');
    act(() => { activeTab6.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true })); });
    // Moving backwards opens the pedagogical LoopBackPicker modal with aria-describedby
    const loopbackDialog = host.querySelector('[role="dialog"][aria-describedby="eng-loopback-help"]');
    expect(loopbackDialog).toBeTruthy();
    await runAxe(host);
  });

  it('polishes ResearchLaneHumanities with WAI-ARIA Tabs keyboard navigation, progress bar, positionality alert/counter, and zero axe violations', async () => {
    const host = mountEl(React.createElement(StatefulLaneHost, { laneName: 'humanities', initialStage: 'frame_question' }));

    const progress = host.querySelector('[data-lane-stage-progress="true"]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('6');
    expect(progress.getAttribute('aria-valuetext')).toContain('0 of 6 stages started');
    expect(progress.getAttribute('aria-valuetext')).toContain('Frame the Question');

    const charCounter = host.querySelector('[data-textarea-char-count="true"]');
    expect(charCounter).toBeTruthy();
    expect(charCounter.textContent).toContain('/');

    const posCounter = host.querySelector('[data-positionality-char-count="true"]');
    expect(posCounter).toBeTruthy();
    expect(posCounter.getAttribute('role')).toBe('status');

    // PositionalityCard textarea boilerplate denial sets aria-invalid="true" + role="alert"
    const posTextarea = posCounter.closest('div').parentElement.querySelector('textarea');
    expect(posTextarea).toBeTruthy();
    setFieldValue(posTextarea, 'I am a neutral observer with no bias.');
    expect(posTextarea.getAttribute('aria-invalid')).toBe('true');
    const alerts = Array.from(host.querySelectorAll('[role="alert"]'));
    expect(alerts.some((el) => el.textContent.toLowerCase().includes('boilerplate') || el.textContent.toLowerCase().includes('generic'))).toBe(true);

    await runAxe(host);

    // WAI-ARIA Tabs keyboard navigation + IME guard
    const tabs = Array.from(host.querySelectorAll('[role="tablist"] [role="tab"]'));
    expect(tabs[0].tabIndex).toBe(0);
    expect(tabs[1].tabIndex).toBe(-1);

    const composingEvt = new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(composingEvt, 'isComposing', { value: true });
    act(() => { tabs[0].dispatchEvent(composingEvt); });
    expect(progress.getAttribute('aria-valuetext')).toContain('Frame the Question');

    act(() => { tabs[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(progress.getAttribute('aria-valuetext')).toContain('SIFT Triage');

    const activeTab2 = host.querySelector('[role="tablist"] [role="tab"][aria-selected="true"]');
    act(() => { activeTab2.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true })); });
    // Moving backwards opens the pedagogical LoopBackPicker modal with aria-describedby
    const loopbackDialog = host.querySelector('[role="dialog"][aria-describedby="hum-loopback-help"]');
    expect(loopbackDialog).toBeTruthy();
    await runAxe(host);
  });

  it('polishes WordSoundsGenerator with visible dialog focus ring, accessible Select All label, live selection status, 44px probe fields, and zero axe violations', async () => {
    const host = mountEl(React.createElement(WordSoundsGenerator, {
      glossaryTerms: [{ term: 'cat' }, { term: 'dog' }, { term: 'sun' }],
      initialCustomWords: 'cat, dog, sun',
      onStartGame: vi.fn(),
      onClose: vi.fn(),
      onMinimize: vi.fn(),
      isTeacherMode: true,
      gradeLevel: '1st Grade',
      t: () => undefined,
      wordSoundsLanguage: 'en',
      probeStudentNames: ['Maya', 'Leo'],
    }));

    const dialog = host.querySelector('[data-ws-setup-dialog="true"]');
    expect(dialog).toBeTruthy();
    expect(dialog.className).toContain('focus-visible:ring-2');
    expect(dialog.className).not.toMatch(/(?<![:-])focus:outline-none/);

    // Select All / Deselect All must NOT carry empty aria-label="" (WCAG 2.5.3 Label in Name)
    const toggleAllBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      /Select All|Deselect All/i.test(b.textContent.trim()),
    );
    expect(toggleAllBtn).toBeTruthy();
    expect(toggleAllBtn.getAttribute('aria-label')).toBeNull();
    expect(toggleAllBtn.className).toContain('focus-visible:ring-2');

    // Selection count exposes polite status live region
    const statusRegions = Array.from(host.querySelectorAll('[role="status"]'));
    expect(statusRegions.some((el) => /\d+/.test(el.textContent) && /selected/i.test(el.textContent))).toBe(true);

    await runAxe(host);

    // Switch to Assessment mode to verify 44px touch targets & focus rings on probe inputs
    const assessBtn = Array.from(host.querySelectorAll('button')).find((b) => /Assessment/i.test(b.textContent.trim()));
    if (assessBtn) {
      act(() => { assessBtn.click(); });
      const studentInput = host.querySelector('#ws-probe-student');
      const skillSelect = host.querySelector('#ws-probe-skill');
      if (studentInput) {
        expect(studentInput.className).toContain('min-h-11');
        expect(studentInput.className).toContain('focus-visible:ring-2');
      }
      if (skillSelect) {
        expect(skillSelect.className).toContain('min-h-11');
        expect(skillSelect.className).toContain('focus-visible:ring-2');
      }
      await runAxe(host);
    }
  });
});
