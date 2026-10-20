// The screening battery overlays live in the Assessment Center panel (2026-10-19).
//
// They used to be rendered by the glossary view, which never received
// classifyScreeningRisk / advanceRoster / exportScreeningCSV: a finished battery
// crashed the next glossary opened ("classifyScreeningRisk is not a function"),
// its results showed nowhere else, and "Export Screening CSV" was dead. These run
// the overlay code sliced from the shipped module, with the module's own risk
// classifier, inside a small host that holds the session state.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const source = readFileSync('student_analytics_module.js', 'utf8');
const overlays = sliceBetween(source, 'var screenerDialogRef = React.useRef(null);', 'var screenerOverlays = renderScreenerOverlays();', { file: 'student_analytics_module.js', label: 'screening overlays' });
const classifier = sliceBetween(source, 'const classifyScreeningRisk = results => {', 'const exportScreeningCSV = () => {', { file: 'student_analytics_module.js', label: 'risk classifier' });
const Icon = () => null;
const makeOverlays = new Function('React', 'ReactDOM', 'Award', 'CheckCircle', 'b', `
  const { screenerSession, setScreenerSession, rosterQueue, setRosterQueue, t, theme, advanceRoster, exportScreeningCSV } = b;
  ${classifier}
  ${overlays}
  return renderScreenerOverlays();
`);

let root = null, host = null;
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.useRealTimers();
});

function mount(initial, extra = {}) {
  const spies = { advanceRoster: vi.fn(), exportScreeningCSV: vi.fn() };
  let api;
  function Panel() {
    const [screenerSession, setScreenerSession] = React.useState(initial.session);
    const [rosterQueue, setRosterQueue] = React.useState(initial.roster || []);
    api = { screenerSession, rosterQueue };
    return makeOverlays(React, ReactDOM, Icon, Icon, { screenerSession, setScreenerSession, rosterQueue, setRosterQueue, t: (key) => ({ 'common.done': 'Done', 'common.skip': 'Skip', 'common.screening_complete': 'Screening complete', 'flashcards.next': 'Next' })[key] || '', theme: 'light', ...spies, ...extra });
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(React.createElement(Panel)));
  return { spies, state: () => api };
}
const finished = { status: 'complete', student: 'Ana', grade: '2', form: 'A', subtests: ['lnf', 'nwf'], currentIndex: 2,
  results: [{ activity: 'lnf', correct: 9, total: 10, accuracy: 90, itemsPerMin: 30 }, { activity: 'nwf', correct: 4, total: 10, accuracy: 40 }] };

describe('screening battery overlays in the Assessment Center', () => {
  it('shows a finished battery as a named modal dialog with its risk summary', () => {
    vi.useFakeTimers();
    mount({ session: finished });
    const dialog = document.querySelector('[data-screener-overlay="complete"] [role="dialog"]');
    expect(dialog, 'the results dialog renders where its helpers live').toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent).toBe('Screening complete');
    expect(dialog.textContent).toContain('Ana');
    expect(dialog.textContent).toContain('65%');
    expect(dialog.textContent).toContain('At Risk');
    act(() => { vi.runAllTimers(); });
    expect(document.activeElement?.textContent).toBe('Done');
  });

  it('wires Export Screening CSV and Next student to the panel helpers', () => {
    const { spies } = mount({ session: finished, roster: ['Ben'] });
    const buttons = [...document.querySelectorAll('[data-screener-overlay="complete"] button')];
    act(() => buttons.find((b) => b.textContent.includes('Export Screening CSV')).click());
    expect(spies.exportScreeningCSV).toHaveBeenCalledOnce();
    act(() => buttons.find((b) => b.textContent.includes('(Ben)')).click());
    expect(spies.advanceRoster).toHaveBeenCalledOnce();
  });

  it('closes on Done and on Escape, clearing the session and the roster', () => {
    const first = mount({ session: finished, roster: ['Ben'] });
    act(() => [...document.querySelectorAll('[data-screener-overlay="complete"] button')].find((b) => b.textContent === 'Skip / Done').click());
    expect(first.state().screenerSession).toBeNull();
    expect(first.state().rosterQueue).toEqual([]);
    expect(document.querySelector('[data-screener-overlay]')).toBeNull();
    act(() => root.unmount()); root = null; host.remove(); host = null;
    const second = mount({ session: finished });
    const dialog = document.querySelector('[data-screener-overlay="complete"] [role="dialog"]');
    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(second.state().screenerSession).toBeNull();
  });

  it('announces the next subtest between subtests, and renders nothing while one runs', () => {
    mount({ session: { ...finished, status: 'interstitial', currentIndex: 1, results: finished.results.slice(0, 1) } });
    const status = document.querySelector('[data-screener-overlay="interstitial"] [role="status"]');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Nwf');
    expect(document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('1');
    act(() => root.unmount()); root = null; host.remove(); host = null;
    mount({ session: { ...finished, status: 'running' } });
    expect(document.querySelector('[data-screener-overlay]')).toBeNull();
  });
});

describe('the panel renders the overlays whether or not it is open', () => {
  it('returns them on the closed path and alongside the open panel', () => {
    expect(source.includes('if (!isOpen) return screenerOverlays;'), 'closed path').toBe(true);
    expect(source.includes('return React.createElement(React.Fragment, null, screenerOverlays, ReactDOM.createPortal('), 'open path').toBe(true);
  });
});
