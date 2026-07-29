// Math Fluency (math_fluency_module.js) runtime UI-localization: renders cleanly,
// and its DISPLAY chrome auto-translates into the student's UI language via the
// app's global window.callGemini, keyed by currentUiLanguage, cached per-device.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, MathFluency, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('math_fluency_module.js');
  MathFluency = window.AlloModules.MathFluency;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.__alloTextLanguage;
  delete window.callGemini;
  delete window.MATH_PROBE_BANKS;
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
});

async function mount(extraProps = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(MathFluency, Object.assign({ gradeLevel: '3rd Grade', t: (k) => k, addToast: () => {}, onProbeComplete: () => {}, handleScoreUpdate: () => {} }, extraProps)));
  });
}

async function change(element, value) {
  await act(async () => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
    if (descriptor && descriptor.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function click(element) {
  await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

async function confirmEarlyFinish() {
  await click(document.querySelector('button[aria-label="End probe early"]'));
  const safeguard = document.querySelector('[role="alertdialog"][aria-labelledby="mf-end-early-title"]');
  expect(safeguard).toBeTruthy();
  const confirm = Array.from(safeguard.querySelectorAll('button')).find((button) => button.textContent.includes('End & save'));
  expect(confirm).toBeTruthy();
  await click(confirm);
}

describe('Math Fluency UI localization', () => {
  it('renders the setup screen without error in English by default', async () => {
    await mount();
    expect(host.textContent).toContain('Operation');
    expect(host.textContent).not.toContain('ES·');
  });

  it('renders the refreshed setup and operation-themed practice hierarchy', async () => {
    await mount();
    const hero = host.querySelector('header.mf-fluency-hero');
    const config = host.querySelector('.mf-config-grid');
    expect(hero).toBeTruthy();
    expect(hero.querySelector('h2').textContent).toContain('Math Fluency Probe');
    expect(hero.textContent).toContain('Build accuracy, confidence, and efficient recall');
    expect(config.style.borderRadius).toBe('13px');
    expect(getComputedStyle(config.querySelector('select')).minHeight).toBe('40px');

    await click(host.querySelector('button[aria-label="Start practice"]'));
    const dialog = document.querySelector('[role="dialog"]');
    const card = dialog.querySelector('.mf-problem-card[data-operation="add"]');
    expect(card).toBeTruthy();
    expect(card.style.borderTop).toContain('6px solid');
    expect(card.querySelector('.mf-operation-eyebrow').textContent).toContain('Addition');
    expect(card.querySelector('.mf-equation-operator').textContent).toContain('+');
    expect(card.querySelector('input[aria-label="Your answer"]').style.borderRadius).toBe('12px');
    expect(dialog.querySelector('.mf-probe-progress').style.backdropFilter).toBe('blur(8px)');
  });

  it('batch-translates display chrome into the UI language via window.callGemini, keeping keys/data English', async () => {
    window.__alloTextLanguage = 'Spanish';
    let uiPromptSeen = null;
    window.callGemini = async (p) => {
      if (typeof p === 'string' && p.includes('Return ONLY a JSON object mapping each ENGLISH')) {
        uiPromptSeen = p;
        const list = JSON.parse(p.slice(p.indexOf('[')));
        const out = {}; list.forEach((k) => { out[k] = 'ES·' + k; });
        return JSON.stringify(out);
      }
      return '{}';
    };
    await mount();
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });

    expect(uiPromptSeen).toBeTruthy();
    expect(host.textContent).toContain('ES·'); // display chrome localized
    // keyboard keys / data NOT wrapped → never sent for translation
    expect(uiPromptSeen).not.toContain('"ArrowDown"');
    expect(uiPromptSeen).not.toContain('"YYYY-MM-DD"');
    const cache = JSON.parse(localStorage.getItem('allo_mathfluency_ui_i18n_v1'));
    expect(cache.Spanish.Operation).toBe('ES·Operation');
  });
});


describe('Math Fluency probe modes and administration integrity', () => {
  it('keeps custom practice settings even when fixed banks are loaded', async () => {
    window.MATH_PROBE_BANKS = { '3': { A: { operation: 'add', difficulty: 'fixed', timeLimit: 42, problems: [{ a: 1, b: 1, op: 'add', symbol: '+', answer: 2 }] } } };
    await mount();
    const operation = host.querySelector('select[aria-label="Math operation"]');
    await change(operation, 'div');
    await click(host.querySelector('button[aria-label="Start practice"]'));
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('÷');
    expect(dialog.textContent).not.toContain('0:42');
  });

  it('previews the exact session beside the primary action and blocks unavailable fixed forms', async () => {
    window.MATH_PROBE_BANKS = { '3': { A: { operation: 'add', difficulty: 'fixed', timeLimit: 42, problems: [{ a: 1, b: 1, op: 'add', symbol: '+', answer: 2 }] } } };
    await mount();

    const supports = host.querySelector('details.mf-learning-supports');
    expect(supports).toBeTruthy();
    expect(supports.open).toBe(false);
    expect(supports.querySelector('summary').textContent).toContain('1 on');

    let preview = host.querySelector('#mf-session-preview');
    let start = host.querySelector('button[aria-label="Start practice"]');
    expect(preview.textContent).toContain('Ready to start');
    expect(preview.textContent).toContain('Timed practice');
    expect(preview.textContent).toContain('120 facts');
    expect(preview.textContent).toContain('120 seconds');
    expect(start.textContent).toContain('Start 120-Second Practice');
    expect(start.getAttribute('aria-describedby')).toBe('mf-session-preview');

    await change(host.querySelector('select[aria-label="Time limit"]'), '0');
    preview = host.querySelector('#mf-session-preview');
    start = host.querySelector('button[aria-label="Start practice"]');
    expect(preview.textContent).toContain('Accuracy Focus');
    expect(preview.textContent).toContain('No countdown');
    expect(start.textContent).toContain('Start Accuracy Focus');

    await change(host.querySelector('select[aria-label="Probe Mode"]'), 'benchmark');
    preview = host.querySelector('#mf-session-preview');
    start = host.querySelector('button[aria-label="Start fixed form"]');
    expect(preview.textContent).toContain('Fixed Form A');
    expect(preview.textContent).toContain('1 fact');
    expect(preview.textContent).toContain('42 seconds');
    expect(start.disabled).toBe(false);
    expect(start.textContent).toContain('Start Fixed Form A');

    await change(host.querySelector('select[aria-label="Fixed probe form"]'), 'B');
    preview = host.querySelector('#mf-session-preview');
    start = host.querySelector('button[aria-label="Start fixed form"]');
    expect(preview.textContent).toContain('Choose an available form');
    expect(start.disabled).toBe(true);
    expect(start.textContent).toContain('Fixed Form Unavailable');
  });

  it('keeps the launch action ahead of collapsed personalized analytics', async () => {
    localStorage.setItem('allo_fluency_fact_mastery_v1', JSON.stringify({
      'add|2|3': { key: 'add|2|3', a: 2, b: 3, op: 'add', symbol: '+', answer: 5, attempts: 4, correct: 3, responseMsTotal: 5000, timedAttempts: 4, lastSeen: new Date().toISOString() },
    }));
    await mount();

    const preview = host.querySelector('#mf-session-preview');
    const start = host.querySelector('button[aria-label="Start practice"]');
    const mastery = host.querySelector('details.mf-mastery-map');
    const teacher = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Teacher Report'));
    expect(mastery).toBeTruthy();
    expect(mastery.open).toBe(false);
    expect(preview.compareDocumentPosition(mastery) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(start.compareDocumentPosition(teacher) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.textContent).toContain('Personalized insights');
  });

  it('speaks practice facts on request and keeps Calm Display free of live performance pressure', async () => {
    const spoken = [];
    let cancelCount = 0;
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function SpeechSynthesisUtterance(text) { this.text = text; } });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel: () => { cancelCount += 1; },
      speak: (utterance) => { spoken.push(utterance.text); },
    } });
    localStorage.setItem('allo_fluency_support_prefs_v1', JSON.stringify({ readAloud: true, calmDisplay: true, adaptivePractice: true }));
    const completed = [];
    await mount({ onProbeComplete: (entry) => completed.push(entry) });

    expect(host.querySelector('input[aria-label="Read facts aloud"]').checked).toBe(true);
    expect(host.querySelector('input[aria-label="Calm display"]').checked).toBe(true);
    await click(host.querySelector('button[aria-label="Start practice"]'));
    await act(async () => { await Promise.resolve(); });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('data-calm-display')).toBe('true');
    expect(dialog.textContent.toLowerCase()).not.toContain('dcpm');
    expect(dialog.textContent).not.toContain('\u2705');
    expect(dialog.textContent).toContain('Time is running');
    expect(dialog.textContent).not.toContain('2:00');
    expect(dialog.querySelector('[aria-label="Time remaining: 120 seconds"]')).toBeTruthy();
    expect(dialog.querySelector('[role="progressbar"]').getAttribute('aria-label')).toBe('Time remaining: 120 seconds');
    expect(dialog.querySelector('.mf-adaptive-level')).toBeNull();
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toContain('What is the answer?');

    await click(dialog.querySelector('button[aria-label="Replay spoken math fact"]'));
    expect(spoken).toHaveLength(2);
    expect(cancelCount).toBeGreaterThan(0);
    await confirmEarlyFinish();
    expect(completed[0].data).toMatchObject({ readAloud: true, calmDisplay: true });
    expect(host.textContent).toContain('Learning supports used');
    expect(host.textContent).toContain('spoken facts');
    expect(host.textContent).toContain('calm display');
  });

  it('normalizes ordinal grade labels and administers the selected fixed form with locked metadata', async () => {
    const completed = [];
    window.MATH_PROBE_BANKS = { '3': {
      A: { operation: 'add', difficulty: 'within20', timeLimit: 60, problems: [{ a: 1, b: 1, op: 'add', symbol: '+', answer: 2 }] },
      B: { operation: 'sub', difficulty: 'within20', timeLimit: 42, problems: [{ a: 9, b: 4, op: 'sub', symbol: '−', answer: 5 }] },
      C: { operation: 'mul', difficulty: 'facts', timeLimit: 60, problems: [{ a: 2, b: 3, op: 'mul', symbol: '×', answer: 6 }] },
    } };
    await mount({ onProbeComplete: (entry) => completed.push(entry) });
    await change(host.querySelector('select[aria-label="Probe Mode"]'), 'benchmark');
    await change(host.querySelector('select[aria-label="Fixed probe form"]'), 'B');
    expect(host.querySelector('select[aria-label="Math operation"]').disabled).toBe(true);
    await click(host.querySelector('button[aria-label="Start fixed form"]'));
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog.textContent).toContain('9 − 4');
    expect(dialog.textContent).toContain('0:42');

    const input = dialog.querySelector('input[aria-label="Your answer"]');
    await change(input, '5');
    await click(dialog.querySelector('button[type="submit"]'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 80)); });
    expect(completed).toHaveLength(1);
    expect(completed[0].data).toMatchObject({ mode: 'benchmark', form: 'B', grade: '3', operation: 'sub', difficulty: 'within20', timeLimit: 42, problemCount: 1 });
  });

  it('rejects decimal answers without advancing the problem', async () => {
    await mount();
    await click(host.querySelector('button[aria-label="Start practice"]'));
    const dialog = document.querySelector('[role="dialog"]');
    const input = dialog.querySelector('input[aria-label="Your answer"]');
    await change(input, '3.9');
    await click(dialog.querySelector('button[type="submit"]'));
    expect(dialog.querySelector('[role="alert"]').textContent).toContain('whole-number');
    expect(dialog.textContent).toContain('#1');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps fixed comparable forms neutral and requires explicit submission', async () => {
    window.MATH_PROBE_BANKS = { '3': { A: {
      operation: 'add', difficulty: 'fixed', timeLimit: 60,
      problems: [
        { a: 1, b: 1, op: 'add', symbol: '+', answer: 2 },
        { a: 2, b: 2, op: 'add', symbol: '+', answer: 4 },
      ],
    } } };
    await mount();
    await change(host.querySelector('select[aria-label="Probe Mode"]'), 'benchmark');
    const autoButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Auto'));
    expect(autoButton.disabled).toBe(true);
    expect(autoButton.getAttribute('aria-disabled')).toBe('true');

    await click(host.querySelector('button[aria-label="Start fixed form"]'));
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.textContent.toLowerCase()).not.toContain('dcpm');
    expect(dialog.textContent).toContain('#1 / 2');
    expect(dialog.textContent).not.toContain('\u2705');

    await change(dialog.querySelector('input[aria-label="Your answer"]'), '9');
    await click(dialog.querySelector('button[type="submit"]'));
    expect(dialog.textContent).toContain('#2 / 2');
    expect(dialog.textContent.toLowerCase()).not.toContain('dcpm');
    expect(dialog.style.backgroundColor).toBe('transparent');
  });

  it('records an early finish as incomplete and excludes it from DCPM and XP', async () => {
    const completed = [];
    const scoreUpdates = [];
    await mount({
      onProbeComplete: (entry) => completed.push(entry),
      handleScoreUpdate: (...args) => scoreUpdates.push(args),
    });
    await click(host.querySelector('button[aria-label="Start practice"]'));
    await click(document.querySelector('button[aria-label="End probe early"]'));
    expect(completed).toHaveLength(0);
    const safeguard = document.querySelector('[role="alertdialog"][aria-labelledby="mf-end-early-title"]');
    const confirm = Array.from(safeguard.querySelectorAll('button')).find((button) => button.textContent.includes('End & save'));
    await click(confirm);

    expect(completed).toHaveLength(1);
    expect(completed[0].data).toMatchObject({
      finishReason: 'early', completionStatus: 'incomplete',
      validForComparison: false, dcpm: null,
    });
    expect(scoreUpdates).toHaveLength(0);
    expect(host.textContent).toContain('Incomplete run');
    expect(host.textContent).toContain('excluded from trends');
  });

  it('marks a fixed form interrupted by page visibility changes as non-comparable', async () => {
    const completed = [];
    const scoreUpdates = [];
    window.MATH_PROBE_BANKS = { '3': { A: {
      operation: 'add', difficulty: 'fixed', timeLimit: 60,
      problems: [{ a: 1, b: 1, op: 'add', symbol: '+', answer: 2 }],
    } } };
    await mount({
      onProbeComplete: (entry) => completed.push(entry),
      handleScoreUpdate: (...args) => scoreUpdates.push(args),
    });
    await change(host.querySelector('select[aria-label="Probe Mode"]'), 'benchmark');
    await click(host.querySelector('button[aria-label="Start fixed form"]'));

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(document.querySelector('[role="dialog"]').textContent).toContain('excluded from comparable trends');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });

    const input = document.querySelector('input[aria-label="Your answer"]');
    await change(input, '2');
    await click(document.querySelector('button[type="submit"]'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 80)); });

    expect(completed).toHaveLength(1);
    expect(completed[0].data).toMatchObject({
      finishReason: 'complete', completionStatus: 'interrupted',
      validForComparison: false, interruptionCount: 1, dcpm: null,
    });
    expect(scoreUpdates).toHaveLength(0);
    expect(host.textContent).toContain('Interrupted run');
    expect(host.textContent).toContain('excluded from trends');
    delete document.hidden;
  });
});

describe('Math Fluency personalized practice workflow', () => {
  it('turns a missed fact into persisted one-click focused practice', async () => {
    const completed = [];
    await mount({ onProbeComplete: (entry) => completed.push(entry) });
    const practiceSet = host.querySelector('select[aria-label="Practice Set"]');
    expect(practiceSet).toBeTruthy();
    expect(practiceSet.options[practiceSet.selectedIndex].textContent).toContain('Grade 3 Recommended');

    await click(host.querySelector('button[aria-label="Start practice"]'));
    let dialog = document.querySelector('[role="dialog"]');
    await change(dialog.querySelector('input[aria-label="Your answer"]'), '-1');
    await click(dialog.querySelector('button[type="submit"]'));
    await confirmEarlyFinish();

    expect(completed).toHaveLength(1);
    expect(completed[0].data.focusFacts).toHaveLength(1);
    expect(completed[0].data.factInsights[0]).toMatchObject({ attempts: 1, correct: 0, accuracy: 0 });
    const storedMastery = JSON.parse(localStorage.getItem('allo_fluency_fact_mastery_v1'));
    const storedRows = Object.values(storedMastery);
    expect(storedRows).toHaveLength(1);
    expect(storedRows[0]).toMatchObject({ attempts: 1, correct: 0, timedAttempts: 1 });

    const retry = host.querySelector('button[aria-label="Practice missed facts"]');
    expect(retry).toBeTruthy();
    await click(retry);
    dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain(completed[0].data.focusFacts[0].symbol);
  });
});

describe('Math Fluency Accuracy Focus mode', () => {
  it('completes an untimed focus run without speed scoring or a countdown', async () => {
    localStorage.setItem('allo_fluency_fact_mastery_v1', JSON.stringify({
      'add|2|3': {
        key: 'add|2|3', a: 2, b: 3, op: 'add', symbol: '+', answer: 5,
        attempts: 1, correct: 0, responseMsTotal: 3000, timedAttempts: 1,
        lastSeen: '2026-07-26T12:00:00.000Z',
      },
    }));
    const completed = [];
    const scoreUpdates = [];
    await mount({
      onProbeComplete: (entry) => completed.push(entry),
      handleScoreUpdate: (...args) => scoreUpdates.push(args),
    });

    const timerSelect = host.querySelector('select[aria-label="Time limit"]');
    await change(timerSelect, '0');
    const goalSelect = host.querySelector('select[aria-label="Session goal"]');
    expect(goalSelect.value).toBe('accuracy-90');
    expect(goalSelect.querySelector('option[value="personal-best"]').disabled).toBe(true);
    expect(host.textContent).toContain('Accuracy Focus supports accuracy goals only.');
    expect(host.textContent).toContain('Accuracy Focus removes the countdown');
    await click(host.querySelector('button[aria-label="Practice my focus facts"]'));

    let dialog = document.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Accuracy Focus');
    expect(dialog.textContent.toLowerCase()).not.toContain('dcpm');
    expect(dialog.querySelector('[role="progressbar"]').getAttribute('aria-label')).toContain('Problem progress');
    const pauseButton = dialog.querySelector('button[aria-label="Pause Accuracy Focus"]');
    expect(pauseButton).toBeTruthy();
    await click(pauseButton);
    dialog = document.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Accuracy Focus paused');
    expect(dialog.querySelector('input[aria-label="Your answer"]')).toBeNull();
    expect(dialog.querySelector('button[aria-label="Resume Accuracy Focus"]')).toBeTruthy();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    });
    dialog = document.querySelector('[role="dialog"]');
    expect(dialog.querySelector('input[aria-label="Your answer"]')).toBeTruthy();

    for (let i = 0; i < 10; i += 1) {
      dialog = document.querySelector('[role="dialog"]');
      await change(dialog.querySelector('input[aria-label="Your answer"]'), '5');
      await click(dialog.querySelector('button[type="submit"]'));
    }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 80)); });

    expect(completed).toHaveLength(1);
    expect(completed[0].data).toMatchObject({
      mode: 'practice', difficulty: 'focus', untimed: true,
      completionStatus: 'complete', validForComparison: false,
      dcpm: null, totalCorrect: 10, accuracy: 100,
      practicePauseCount: 1,
      goal: { id: 'accuracy-90', metric: 'accuracy', target: 90 },
      goalResult: { met: true, status: 'met' },
    });
    expect(scoreUpdates).toHaveLength(1);
    expect(scoreUpdates[0][0]).toBe(2);
    expect(host.textContent).toContain('Accuracy Focus Practice');
    expect(host.textContent).toContain('Not scored in Accuracy Focus');
    expect(host.textContent).toContain('Pause accommodation used');
    expect(host.querySelector('.mf-pause-result').textContent).toContain('1 pause');
    expect(host.querySelector('.mf-goal-result').textContent).toContain('Goal Met');
    const resultHeader = host.querySelector('.mf-results-header');
    const accuracyRing = host.querySelector('.mf-accuracy-ring');
    const metricCards = Array.from(host.querySelectorAll('.mf-metric-card'));
    expect(resultHeader.textContent).toContain('Accuracy Focus');
    expect(accuracyRing.getAttribute('data-accuracy')).toBe('100');
    expect(accuracyRing.getAttribute('aria-label')).toBe('Accuracy: 100 percent');
    expect(metricCards.map((card) => card.getAttribute('data-metric'))).toEqual(['speed', 'accuracy', 'correct', 'digits']);
    expect(new Set(metricCards.map((card) => card.style.background)).size).toBe(4);
    expect(host.querySelector('.mf-results-metrics')).toBeTruthy();
    expect(localStorage.getItem('allo_fluency_accuracy_draft_v1')).toBeNull();
  });

  it('restores a validated Accuracy Focus draft and clears it after completion', async () => {
    const completed = [];
    localStorage.setItem('allo_fluency_accuracy_draft_v1', JSON.stringify({
      version: 1, savedAt: Date.now(), currentIndex: 1, elapsedMs: 1200,
      pauseStats: { count: 1, seconds: 2 },
      config: { mode: 'practice', form: null, grade: '3', operation: 'add', difficulty: 'focus', practiceSet: 'focus', timeLimit: 0, untimed: true, strategyCoach: true, problemCount: 2, goal: { id: 'accuracy-90', metric: 'accuracy', target: 90, available: true, label: '90% accuracy' } },
      problems: [
        { a: 2, b: 3, op: 'add', symbol: '+', answer: 5, studentAnswer: 5, correct: true, firstTryCorrect: true, responseMs: 700, attemptLog: [] },
        { a: 4, b: 4, op: 'add', symbol: '+', answer: 8, studentAnswer: null, correct: null, responseMs: null, attemptLog: [] },
      ],
    }));
    await mount({ onProbeComplete: (entry) => completed.push(entry) });

    const recoveryCard = host.querySelector('.mf-resume-session-card');
    expect(recoveryCard).toBeTruthy();
    expect(recoveryCard.textContent).toContain('1 of 2 completed');
    await click(recoveryCard.querySelector('button[aria-label="Resume saved Accuracy Focus"]'));

    let dialog = document.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('#2');
    await change(dialog.querySelector('input[aria-label="Your answer"]'), '8');
    await click(dialog.querySelector('button[type="submit"]'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 80)); });

    expect(completed).toHaveLength(1);
    expect(completed[0].data).toMatchObject({ resumedFromDraft: true, totalAttempted: 2, totalCorrect: 2, practicePauseCount: 1 });
    expect(localStorage.getItem('allo_fluency_accuracy_draft_v1')).toBeNull();
    expect(host.querySelector('.mf-recovery-result').textContent).toContain('Recovered session completed');
  });
});

describe('Math Fluency Strategy Coach and mastery map', () => {
  it('launches a mastery group and keeps coached retries on the same fact through answer reveal', async () => {
    localStorage.setItem('allo_fluency_fact_mastery_v1', JSON.stringify({
      'add|2|3': {
        key: 'add|2|3', a: 2, b: 3, op: 'add', symbol: '+', answer: 5,
        attempts: 1, correct: 0, responseMsTotal: 3000, timedAttempts: 1,
        lastSeen: '2026-07-26T12:00:00.000Z',
      },
    }));
    const completed = [];
    await mount({ onProbeComplete: (entry) => completed.push(entry) });
    expect(host.textContent).toContain('Fact Mastery Map');
    expect(host.textContent).toContain('Needs Focus');

    await change(host.querySelector('select[aria-label="Time limit"]'), '0');
    const focusGroup = host.querySelector('button[aria-label^="Needs Focus: 1"]');
    expect(focusGroup).toBeTruthy();
    await click(focusGroup);

    let dialog = document.querySelector('[role="dialog"]');
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await change(dialog.querySelector('input[aria-label="Your answer"]'), '0');
      await click(dialog.querySelector('button[type="submit"]'));
      dialog = document.querySelector('[role="dialog"]');
      expect(dialog.textContent).toContain('#1');
      expect(dialog.querySelector('.mf-strategy-coach')).toBeTruthy();
      if (attempt === 1) expect(dialog.textContent).toContain('Use a nearby double');
      if (attempt === 2) expect(dialog.textContent).toContain('Build the addition');
      if (attempt === 3) expect(dialog.textContent).toContain('The answer is 5');
    }

    await change(dialog.querySelector('input[aria-label="Your answer"]'), '5');
    await click(dialog.querySelector('button[type="submit"]'));
    dialog = document.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('#2');
    await confirmEarlyFinish();

    expect(completed).toHaveLength(1);
    expect(completed[0].data).toMatchObject({
      strategyCoach: true, totalAttempted: 1, totalCorrect: 1,
      firstTryCorrect: 0, accuracy: 0, totalPracticeAttempts: 4,
    });
    expect(completed[0].data.factInsights[0]).toMatchObject({ attempts: 4, correct: 1, accuracy: 25 });
    const stored = JSON.parse(localStorage.getItem('allo_fluency_fact_mastery_v1'))['add|2|3'];
    expect(stored).toMatchObject({ attempts: 5, correct: 1 });
  });
});


describe('Math Fluency Smart Review and Teacher Report Center', () => {
  it('shows due review work and filters teacher-facing session evidence', async () => {
    const now = Date.now();
    localStorage.setItem('allo_fluency_fact_mastery_v1', JSON.stringify({
      'add|2|3': { key: 'add|2|3', a: 2, b: 3, op: 'add', symbol: '+', answer: 5, attempts: 4, correct: 1, responseMsTotal: 5000, timedAttempts: 4, lastSeen: new Date(now).toISOString() },
      'sub|9|4': { key: 'sub|9|4', a: 9, b: 4, op: 'sub', symbol: '-', answer: 5, attempts: 2, correct: 2, responseMsTotal: 3000, timedAttempts: 2, lastSeen: new Date(now - 2 * 86400000).toISOString() },
      'mul|3|4': { key: 'mul|3|4', a: 3, b: 4, op: 'mul', symbol: 'x', answer: 12, attempts: 4, correct: 4, responseMsTotal: 12000, timedAttempts: 4, lastSeen: new Date(now - 10 * 86400000).toISOString() },
    }));
    localStorage.setItem('fluency_maze_lifetime', JSON.stringify({ gatesUnlocked: 18, mazesCompleted: 2, longestStreak: 6, totalSeconds: 600 }));
    const history = [
      { date: new Date(now - 86400000).toISOString(), mode: 'practice', untimed: true, operation: 'add', accuracy: 80, dcpm: null, totalCorrect: 8, totalAttempted: 10, completionStatus: 'complete', validForComparison: false, goal: { label: '80% accuracy' }, goalResult: { met: true, status: 'met' } },
      { date: new Date(now - 2 * 86400000).toISOString(), mode: 'practice', untimed: false, operation: 'add', accuracy: 90, dcpm: 31, totalCorrect: 9, totalAttempted: 10, completionStatus: 'complete', validForComparison: true },
      { date: new Date(now - 3 * 86400000).toISOString(), mode: 'benchmark', untimed: false, operation: 'mul', accuracy: 70, dcpm: 22, totalCorrect: 7, totalAttempted: 10, completionStatus: 'complete', validForComparison: true },
    ];
    const storageDB = {
      get: async (key) => key === 'allo_fluency_history' ? history : null,
      set: async () => {},
    };
    await mount({ storageDB });
    await act(async () => { await Promise.resolve(); });

    const smartReview = host.querySelector('button[aria-label^="Start Smart Review"]');
    expect(smartReview).toBeTruthy();
    expect(smartReview.textContent).toContain('3 due');
    const nextStep = host.querySelector('.mf-next-best-step');
    expect(nextStep).toBeTruthy();
    expect(nextStep.textContent).toContain('Addition: Build accuracy');
    expect(nextStep.querySelector('button').getAttribute('aria-label')).toContain('recommended Addition practice');

    const toggle = host.querySelector('button[aria-controls="mf-teacher-report"]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click(toggle);
    const report = host.querySelector('#mf-teacher-report');
    expect(report).toBeTruthy();
    expect(report.textContent).toContain('Teacher Report Center');
    expect(report.textContent).toContain('18 gates');
    const reportTables = report.querySelectorAll('.mf-teacher-report-table');
    expect(report.querySelectorAll('.mf-operation-growth-table tbody tr')).toHaveLength(4);
    expect(reportTables[0].textContent).toContain('Operation Growth and Next Steps');
    expect(reportTables[1].querySelectorAll('tbody tr')).toHaveLength(3);
    expect(report.textContent).toContain('Latest DCPM');
    expect(report.textContent).toContain('Goals Met');
    expect(report.textContent).toContain('100%');
    expect(report.querySelector('.mf-teacher-report-actions').textContent).toContain('CSV');

    const filters = report.querySelectorAll('.mf-teacher-report-filters select');
    await change(filters[1], 'accuracy-focus');
    const filteredReport = host.querySelector('#mf-teacher-report');
    const filteredSessions = filteredReport.querySelectorAll('.mf-teacher-report-table')[1].querySelector('tbody');
    expect(filteredSessions.querySelectorAll('tr')).toHaveLength(1);
    expect(filteredSessions.textContent).toContain('Accuracy Focus');
    expect(filteredSessions.textContent).not.toContain('Timed Practice');
  });
});
