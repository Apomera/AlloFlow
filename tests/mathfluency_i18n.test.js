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
