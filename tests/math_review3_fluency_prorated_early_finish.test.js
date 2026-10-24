// Math review 3 (2026-10-19): a fixed form finished early is scored, prorated.
//
// Benchmark forms have 25 items and a 120 s limit. Finishing every item before
// the limit was marked "not comparable" (formExhausted), so a fluent student
// could never be recorded: the most DCPM a recordable run could show was the
// digits on 25 items over 2 minutes (about 12-33 by grade). Aaron's decision:
// score an early finish as practice already did, digits correct over the
// minutes actually used, mark it comparable, and record that it was prorated.
// A run the student or teacher STOPS stays non-comparable. Under 20 s the
// sample is too short to scale (25 typed answers in < 20 s is skipping), so
// that run stays non-comparable too, and nothing calls a finished form
// "interrupted or ended early". scoringVersion goes 2 -> 3.
//
// Real runs are driven through the module with a controlled performance.now.
// The sidebar's onProbeComplete handler is executed out of its source.
// MF_REVIEW3_MODULE / MF_REVIEW3_SIDEBAR let the mutation check load copies.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { indexOfOrThrow } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
const SIDEBAR = process.env.MF_REVIEW3_SIDEBAR || 'view_sidebar_panels_source.jsx';
let React, ReactDOMClient, act, root, host, clock;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(process.env.MF_REVIEW3_MODULE || 'math_fluency_module.js');
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  vi.restoreAllMocks();
  localStorage.clear();
  delete window.MATH_PROBE_BANKS;
});

// A 25-item, 120 s grade-3 form shaped like psychometric_math_probes.json.
function form25(extra) {
  const problems = [];
  for (let a = 2; problems.length < 25; a++) {
    for (let b = 2; b <= 9 && problems.length < 25; b++) problems.push({ a, b, op: 'mul', symbol: '×', answer: a * b });
  }
  return Object.assign({ operation: 'mul', difficulty: 'facts', timeLimit: 120, problems }, extra || {});
}
const digitsOf = problems => problems.reduce((sum, p) => sum + String(p.answer).length, 0);

const wait = ms => act(async () => { await new Promise(r => setTimeout(r, ms)); });
// Poll instead of a fixed sleep: under machine load the 250 ms countdown tick
// and the 50 ms finish timeout can land late.
async function until(check, label, ms = 8000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out waiting for ' + label);
    await wait(25);
  }
}
async function change(el, value) {
  await act(async () => {
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    d.set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function click(el) { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); }

async function mountBenchmark(bank) {
  clock = 100000;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  window.MATH_PROBE_BANKS = { '3': { A: bank } };
  const completed = [];
  const xp = [];
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(window.AlloModules.MathFluency, {
      learnerId: 'name:otter', learnerName: 'Otter', gradeLevel: '3', t: k => k,
      addToast: () => {}, onProbeComplete: e => completed.push(e), handleScoreUpdate: (...a) => xp.push(a),
    }));
  });
  await change(host.querySelector('select[aria-label="Probe Mode"]'), 'benchmark');
  await click(host.querySelector('button[aria-label="Start fixed form"]'));
  return { completed, xp, start: clock };
}

// Answer `count` items correctly, the last one at `atMs` after the start.
// Answering the whole form waits for the run to finish.
async function answer(problems, count, startMs, atMs, completed) {
  for (let i = 0; i < count; i++) {
    clock = startMs + Math.round(atMs * (i + 1) / count);
    await change(document.querySelector('input[aria-label="Your answer"]'), String(problems[i].answer));
    await click(document.querySelector('form button[type="submit"]'));
  }
  if (count === problems.length) await until(() => completed.length === 1, 'the finished run');
  else await wait(60);
}

// The sidebar handler, run as shipped (same extraction as
// assessment_center_math_probe_record.test.js, anchored so a moved marker fails).
function runSidebarHandler(entry) {
  const src = readFileSync(resolve(process.cwd(), SIDEBAR), 'utf8');
  const marker = 'onProbeComplete={(entry) => {';
  const open = indexOfOrThrow(src, marker, { file: SIDEBAR }) + marker.length - 1;
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  expect(end, 'handler body closes').toBeGreaterThan(open);
  const saved = [], toasts = [];
  new Function('entry', 'setHistory', 'saveProbeResult', 'addToast', 't', src.slice(open + 1, end))(
    entry, () => {}, (student, record) => saved.push({ student, record }), (msg, level) => toasts.push({ msg, level }), () => null);
  return { saved, toasts };
}

describe('a fixed form finished early is a prorated, comparable rate', () => {
  it('25 items in 45 s scores digits / 0.75 min, comparable, flagged as prorated', async () => {
    const bank = form25();
    const { completed, xp, start } = await mountBenchmark(bank);
    await answer(bank.problems, 25, start, 45000, completed);
    expect(completed).toHaveLength(1);
    const r = completed[0].data;
    const expected = Math.round(digitsOf(bank.problems) / 0.75);
    expect(r).toMatchObject({
      mode: 'benchmark', finishReason: 'complete', completionStatus: 'complete',
      validForComparison: true, completedEarly: true, prorated: true, elapsedSeconds: 45,
      dcpm: expected, scoringVersion: 3,
    });
    // Over the full 2 minutes the same work would have read as half the rate:
    // the old ceiling a fluent student could never get above.
    expect(r.dcpm).toBe(Math.round(digitsOf(bank.problems) / 0.75));
    expect(r.dcpm).toBeGreaterThan(Math.round(digitsOf(bank.problems) / 2));
    expect(xp.length, 'a comparable run earns XP like any other').toBe(1);
    const panel = host.querySelector('.mf-results-panel');
    expect(panel.textContent).toContain('rate prorated to a full minute');
    expect(panel.textContent).not.toContain('descriptive rate only');
    expect(panel.textContent).not.toContain('ended early');
  });

  it('the sidebar records it, says it was prorated, and carries the flags', async () => {
    const bank = form25();
    const { completed, start } = await mountBenchmark(bank);
    await answer(bank.problems, 25, start, 45000, completed);
    const entry = completed[0];
    entry.data.student = 'Otter';
    const { saved, toasts } = runSidebarHandler(entry);
    expect(saved).toHaveLength(1);
    expect(saved[0].record).toMatchObject({ dcpm: entry.data.dcpm, itemsPerMin: entry.data.dcpm, prorated: true, scoringVersion: 3, elapsedSeconds: 45 });
    expect(toasts).toHaveLength(1);
    expect(toasts[0].level).toBe('success');
    expect(toasts[0].msg).toMatch(/prorated/i);
  });

  it('exactly 20 s is long enough to prorate', async () => {
    const bank = form25();
    const { completed, start } = await mountBenchmark(bank);
    await answer(bank.problems, 25, start, 20000, completed);
    expect(completed[0].data).toMatchObject({ validForComparison: true, prorated: true, elapsedSeconds: 20, dcpm: Math.round(digitsOf(bank.problems) / (20 / 60)) });
  });
});

describe('what stays non-comparable', () => {
  it('a form finished in under 20 s has no rate, and is never called interrupted or ended early', async () => {
    const bank = form25();
    const { completed, start } = await mountBenchmark(bank);
    await answer(bank.problems, 25, start, 19900, completed);
    const r = completed[0].data;
    expect(r).toMatchObject({ completionStatus: 'complete', completedEarly: true, prorated: false, validForComparison: false, dcpm: null, belowProrationMinimum: true, scoringVersion: 3 });
    const panel = host.querySelector('.mf-results-panel');
    expect(panel.textContent).toMatch(/under 20 seconds/);
    expect(panel.textContent).not.toContain('ended early');
    r.student = 'Otter';
    const { saved, toasts } = runSidebarHandler(completed[0]);
    expect(saved).toHaveLength(0);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].level).toBe('warning');
    expect(toasts[0].msg).not.toMatch(/interrupted|ended early/i);
    expect(toasts[0].msg).toMatch(/20 seconds/);
  });

  it('a run the student stops is still incomplete and not recorded', async () => {
    const bank = form25();
    const { completed, start } = await mountBenchmark(bank);
    await answer(bank.problems, 10, start, 30000, completed);
    await click(document.querySelector('button[aria-label="End probe early"]'));
    const safeguard = document.querySelector('[role="alertdialog"][aria-labelledby="mf-end-early-title"]');
    await click(Array.from(safeguard.querySelectorAll('button')).find(b => b.textContent.includes('End & save')));
    const r = completed[0].data;
    expect(r).toMatchObject({ finishReason: 'early', completionStatus: 'incomplete', validForComparison: false, dcpm: null, prorated: false });
    r.student = 'Otter';
    const { saved, toasts } = runSidebarHandler(completed[0]);
    expect(saved).toHaveLength(0);
    expect(toasts[0].msg).toMatch(/interrupted or ended early/);
  });

  it('a form that runs to the time limit is scored over the full limit, not prorated', async () => {
    const bank = form25();
    const { completed, start } = await mountBenchmark(bank);
    await answer(bank.problems, 12, start, 60000, completed);
    clock = start + 121000;
    await until(() => completed.length === 1, 'the countdown finish'); // the 250 ms tick sees the deadline
    const r = completed[0].data;
    expect(r).toMatchObject({ finishReason: 'time', completionStatus: 'complete', validForComparison: true, completedEarly: false, prorated: false, elapsedSeconds: 120 });
    expect(r.dcpm).toBe(Math.round(digitsOf(bank.problems.slice(0, 12)) / 2));
    expect(host.querySelector('.mf-results-panel').textContent).not.toContain('prorated');
  });
});
