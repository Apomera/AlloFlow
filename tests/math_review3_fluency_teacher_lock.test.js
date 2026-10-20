// Math review 3 (2026-10-19): teacher controls lock while a student has the keyboard.
//
// The Fluency panel only renders in teacher mode, so there is no student flag:
// a student who finished a run could open the Teacher Report (every saved
// session for this learner), press Clear History, discard a saved session or
// switch to another learner's records. Aaron's decision: once any run starts,
// hide/lock those until the teacher presses a plain "Return to teacher" button
// after the run (no PIN). While locked, the results trend shows only this
// sitting's runs, since earlier rows on a shared learner can be another
// student's.
//
// MF_REVIEW3_MODULE lets the mutation check load a copy with the change reverted.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
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
  delete window.__alloFluencyPendingConfig;
});

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
const results = () => host.querySelector('.mf-results-panel');
async function change(el, value) {
  await act(async () => {
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    d.set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function click(el) { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); }
const byText = (re) => Array.from(host.querySelectorAll('button')).find(b => re.test(b.textContent));
const reportToggle = () => host.querySelector('button[aria-controls="mf-teacher-report"]');
const clearHistory = () => host.querySelector('button[aria-label="Clear History"]');
const returnButton = () => byText(/^Return to teacher$/);

async function mountAsOtter() {
  clock = 100000;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  // Adaptive practice is on by default and makes timed practice non-comparable.
  localStorage.setItem('allo_fluency_support_prefs_v1', JSON.stringify({ adaptivePractice: false }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(window.AlloModules.MathFluency, {
      learnerId: null, learnerName: '', gradeLevel: '3', t: k => k,
      addToast: () => {}, onProbeComplete: () => {}, handleScoreUpdate: () => {},
    }));
  });
  await change(host.querySelector('#mf-learner-name'), 'Otter');
  await click(byText(/^Use learner$/));
}

// A timed practice run that the countdown ends (complete and comparable).
async function timedRun(startButton) {
  await click(startButton || host.querySelector('button[aria-label="Start practice"]'));
  expect(document.querySelector('[role="dialog"][aria-modal="true"]'), 'run overlay').toBeTruthy();
  const start = clock;
  await change(document.querySelector('input[aria-label="Your answer"]'), '1');
  await click(document.querySelector('form button[type="submit"]'));
  clock = start + 121000;
  await until(results, 'results after the countdown');
}

describe('a run hands the keyboard to a student', () => {
  it('the Teacher Report, Clear History and learner switch stay hidden until Return to teacher', async () => {
    await mountAsOtter();
    expect(reportToggle(), 'teacher sees the report toggle before any run').toBeTruthy();
    await click(reportToggle());
    expect(host.querySelector('#mf-teacher-report')).toBeTruthy();

    await click(host.querySelector('button[aria-label="Start practice"]'));
    // During the run there is nothing to return to yet.
    expect(returnButton()).toBeFalsy();
    const start = clock;
    await change(document.querySelector('input[aria-label="Your answer"]'), '1');
    await click(document.querySelector('form button[type="submit"]'));
    clock = start + 121000;
    await until(results, 'results after the countdown');

    // Results: the student's own score, but no Clear History.
    expect(clearHistory()).toBeNull();
    expect(byText(/Clear History/)).toBeFalsy();
    expect(host.querySelector('#mf-learner-name').disabled).toBe(true);
    expect(byText(/^Use learner$/).disabled).toBe(true);

    // The control is a real, named, described button.
    const back = returnButton();
    expect(back).toBeTruthy();
    expect(back.tagName).toBe('BUTTON');
    expect(back.getAttribute('type')).toBe('button');
    expect(back.disabled).toBe(false);
    const describedBy = document.getElementById(back.getAttribute('aria-describedby'));
    expect(describedBy && describedBy.textContent).toMatch(/hidden while a student/);
    expect(back.closest('[role="region"]').getAttribute('aria-labelledby')).toBeTruthy();

    // Closing results lands on setup, still locked: no report, no toggle.
    await click(host.querySelector('button[aria-label="Close results"]'));
    expect(host.querySelector('.mf-fluency-setup')).toBeTruthy();
    expect(reportToggle()).toBeNull();
    expect(host.querySelector('#mf-teacher-report')).toBeNull();

    await click(returnButton());
    expect(returnButton()).toBeFalsy();
    expect(reportToggle()).toBeTruthy();
    expect(document.activeElement, 'focus moves to the revealed teacher control').toBe(reportToggle());
    expect(host.querySelector('#mf-learner-name').disabled).toBe(false);
    // The report the run closed stays closed until the teacher opens it.
    expect(host.querySelector('#mf-teacher-report')).toBeNull();
  });

  it('Return to teacher on the results screen reveals Clear History and focuses it', async () => {
    await mountAsOtter();
    await timedRun();
    expect(clearHistory()).toBeNull();
    await click(returnButton());
    expect(clearHistory()).toBeTruthy();
    expect(document.activeElement).toBe(clearHistory());
  });

  it('a fixed-form run locks the same way', async () => {
    window.MATH_PROBE_BANKS = { '3': { A: { operation: 'add', difficulty: 'fixed', timeLimit: 60, problems: [{ a: 1, b: 1, op: 'add', symbol: '+', answer: 2 }] } } };
    await mountAsOtter();
    await change(host.querySelector('select[aria-label="Probe Mode"]'), 'benchmark');
    await click(host.querySelector('button[aria-label="Start fixed form"]'));
    await change(document.querySelector('input[aria-label="Your answer"]'), '2');
    await click(document.querySelector('form button[type="submit"]'));
    await until(results, 'results after the last item');
    expect(clearHistory()).toBeNull();
    expect(returnButton()).toBeTruthy();
  });

  it('the lock survives the session remounting, and hides Discard on a saved session', async () => {
    await mountAsOtter();
    await change(host.querySelector('select[aria-label="Time limit"]'), '0');
    await click(host.querySelector('button[aria-label="Start practice"]'));
    // Accuracy Focus checkpoints a resumable draft as soon as it starts.
    expect(localStorage.getItem('allo_fluency_v2:' + encodeURIComponent('name:otter') + ':draft')).toBeTruthy();
    // An Assessment Center handoff arrives mid-run: the session remounts.
    window.__alloFluencyPendingConfig = { at: Date.now(), operation: 'add' };
    await act(async () => { window.dispatchEvent(new CustomEvent('alloflow:fluency-pending-config')); });
    await until(() => host.querySelector('.mf-resume-session-card'), 'the saved-session card');
    const card = host.querySelector('.mf-resume-session-card');
    expect(card, 'the saved session is offered').toBeTruthy();
    expect(card.querySelector('button[aria-label="Resume saved Accuracy Focus"]')).toBeTruthy();
    expect(card.querySelector('button[aria-label="Discard saved session"]')).toBeNull();
    expect(reportToggle()).toBeNull();
    await click(returnButton());
    expect(host.querySelector('.mf-resume-session-card button[aria-label="Discard saved session"]')).toBeTruthy();
  });
});

describe('the results trend while locked', () => {
  it('shows only runs from this sitting, not the learner earlier rows', async () => {
    await mountAsOtter();
    await timedRun();                       // sitting 1 (someone else, say)
    await click(returnButton());
    await click(host.querySelector('button[aria-label="Close results"]'));
    await timedRun();                       // sitting 2, run 1
    expect(host.querySelector('.mf-results-panel').textContent).not.toContain('Comparable DCPM Trend');
    await timedRun(host.querySelector('button[aria-label="Run again"]')); // sitting 2, run 2
    expect(host.querySelector('.mf-results-panel').textContent).toContain('Comparable DCPM Trend (2 sessions)');
    // Back with the teacher, the full series is visible again.
    await click(returnButton());
    expect(host.querySelector('.mf-results-panel').textContent).toContain('Comparable DCPM Trend (3 sessions)');
  });
});
