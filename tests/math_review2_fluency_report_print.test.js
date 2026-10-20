// Math review 2 (2026-10-19): Teacher Report "Print" did nothing in Gemini Canvas.
//
// The button called window.print() on the app. Canvas runs the app in a sandboxed
// iframe without allow-modals, where print() is ignored without an error, so the
// teacher pressed Print and nothing happened. The report now prints from a window
// the module writes itself (the Symbol Studio pattern): the rendered report, its
// styles, the chosen filters as text, and no CSV/Print controls. If no window can
// open, it falls back to printing in place, and says so when that is refused too.
//
// MF_REVIEW2_MODULE lets the mutation check load a copy with the fix reverted.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(process.env.MF_REVIEW2_MODULE || 'math_fluency_module.js');
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  vi.restoreAllMocks();
});

const session = hoursAgo => ({
  learnerId: 'name:otter', date: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
  mode: 'practice', untimed: false, operation: 'add', difficulty: 'within20',
  accuracy: 90, dcpm: 30, totalCorrect: 18, totalAttempted: 20,
  completionStatus: 'complete', validForComparison: true, timeLimit: 60,
});

async function openReport(addToast) {
  const store = { ['allo_fluency_v2:' + encodeURIComponent('name:otter') + ':history']: [session(2), session(1)] };
  const storageDB = { get: async key => (store[key] == null ? null : store[key]), set: async () => {} };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(window.AlloModules.MathFluency, {
      learnerId: 'name:otter', learnerName: 'Otter', gradeLevel: '3', storageDB,
      t: k => k, addToast, onProbeComplete: () => {}, handleScoreUpdate: () => {},
    }));
  });
  await act(async () => { await new Promise(r => setTimeout(r, 30)); });
  const toggle = Array.from(host.querySelectorAll('button')).find(b => /^Teacher Report/.test(b.textContent));
  expect(toggle, 'Teacher Report toggle').toBeTruthy();
  await act(async () => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  const report = host.querySelector('#mf-teacher-report');
  expect(report, 'report region').toBeTruthy();
  return report;
}

function fakeWindow() {
  const written = [];
  const win = {
    document: { open: vi.fn(), write: html => written.push(html), close: vi.fn(), images: [] },
    focus: vi.fn(),
    print: vi.fn(),
  };
  return { win, html: () => written.join('') };
}

const printButton = report => Array.from(report.querySelectorAll('button')).find(b => b.textContent === 'Print');

describe('Teacher Report printing', () => {
  it('prints from a window of its own, not window.print() on the app', async () => {
    const addToast = vi.fn();
    const report = await openReport(addToast);
    const { win, html } = fakeWindow();
    const open = vi.spyOn(window, 'open').mockImplementation(() => win);
    const appPrint = vi.spyOn(window, 'print').mockImplementation(() => {});
    await act(async () => { printButton(report).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(open).toHaveBeenCalledTimes(1);
    expect(appPrint).not.toHaveBeenCalled();
    expect(win.print).toHaveBeenCalledTimes(1);
    const doc = html();
    expect(doc).toMatch(/^<!DOCTYPE html>/);
    expect(doc).toContain('Teacher Report Center');
    expect(doc).toContain('Avg Accuracy');
    expect(doc).toContain('Recent filtered sessions');
    expect(doc).toContain('.mf-teacher-report-table');
    expect(doc).toContain('Last 30 days');
    // The window's own Print bar is the only button; CSV/Print controls and the
    // filter selects do not carry over.
    const body = (doc.match(/<body[\s\S]*$/) || [''])[0];
    expect(body, 'the print window has a body').not.toBe('');
    const parsed = new DOMParser().parseFromString(body, 'text/html');
    expect(Array.from(parsed.querySelectorAll('button')).map(b => b.textContent.trim())).toHaveLength(1);
    expect(parsed.querySelector('select')).toBeNull();
    expect(parsed.querySelector('.mf-teacher-report-actions')).toBeNull();
    expect(addToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
  });

  it('when no window opens and in-place print is refused, the teacher is told', async () => {
    const addToast = vi.fn();
    const report = await openReport(addToast);
    vi.spyOn(window, 'open').mockImplementation(() => null);
    const appPrint = vi.spyOn(window, 'print').mockImplementation(() => {});
    await act(async () => { printButton(report).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(appPrint).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith(expect.stringMatching(/pop-ups/i), 'error');
  });

  it('when no window opens but in-place print runs, no error is shown', async () => {
    const addToast = vi.fn();
    const report = await openReport(addToast);
    vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(window, 'print').mockImplementation(() => { window.dispatchEvent(new Event('beforeprint')); });
    await act(async () => { printButton(report).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(addToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
  });
});
