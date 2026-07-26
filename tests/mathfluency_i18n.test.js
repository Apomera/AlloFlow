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

describe('Math Fluency UI localization', () => {
  it('renders the setup screen without error in English by default', async () => {
    await mount();
    expect(host.textContent).toContain('Operation');
    expect(host.textContent).not.toContain('ES·');
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
    await click(document.querySelector('button[aria-label="End probe early"]'));

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
    expect(host.textContent).toContain('Accuracy Focus removes the countdown');
    await click(host.querySelector('button[aria-label="Practice my focus facts"]'));

    let dialog = document.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain('Accuracy Focus');
    expect(dialog.textContent.toLowerCase()).not.toContain('dcpm');
    expect(dialog.querySelector('[role="progressbar"]').getAttribute('aria-label')).toContain('Problem progress');

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
    });
    expect(scoreUpdates).toHaveLength(1);
    expect(scoreUpdates[0][0]).toBe(2);
    expect(host.textContent).toContain('Accuracy Focus Practice');
    expect(host.textContent).toContain('Not scored in Accuracy Focus');
    expect(host.querySelector('.mf-results-metrics')).toBeTruthy();
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
    await click(document.querySelector('button[aria-label="End probe early"]'));

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
