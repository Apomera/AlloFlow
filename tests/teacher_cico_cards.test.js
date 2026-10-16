// Daily check-in cards (Tier 2 CICO, 2026-10-13), run in the real Teacher roster panel.
// Ratings stay in their own device key; the roster, its exports and the School Store
// never see them. "Add to Store worksheet" writes one neutral row that the app's own
// recognition worksheet (sliced from AlloFlowANTI.txt) picks up.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let cico, identity, React, createRoot, act, root, container, currentRoster;
const ANTI = readFileSync(resolve('AlloFlowANTI.txt'), 'utf8');
const worksheetSource = ANTI.slice(ANTI.indexOf('const buildSchoolRewardsRecognitionWorksheet = '), ANTI.indexOf('const queueAlloHavenClassroomRewards = '));
const buildWorksheet = new Function('normalizeAlloHavenClassroomReward', 'ALLOHAVEN_CLASSROOM_REWARD_REASONS', worksheetSource + '; return buildSchoolRewardsRecognitionWorksheet;')(() => null, []);
const LOG_KEY = 'allo_school_rewards_recognition_log_v1';

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('teacher_module.js');
  cico = window.AlloModules.CicoInternals;
  identity = window.AlloModules.RosterIdentityInternals;
});
beforeEach(() => localStorage.clear());
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; container?.remove();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function roster() {
  return {
    classId: 'CLS-fictional', className: 'Fictional class',
    groups: {}, students: { 'Calm Otter': '', 'Quiet Owl': '' },
    learnerIds: { 'Calm Otter': 'LRN-calm', 'Quiet Owl': 'LRN-quiet' }
  };
}
async function mount(props = {}) {
  container = document.createElement('div'); document.body.appendChild(container);
  function Host() {
    const [value, setValue] = React.useState(() => identity.ensureRosterIdentity(roster()));
    currentRoster = value;
    return React.createElement(window.AlloModules.RosterKeyPanel, { isOpen: true, onClose() {}, rosterKey: value, setRosterKey: setValue, t: key => key, ...props });
  }
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Host)));
}
const button = text => [...container.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const click = async el => { await act(async () => el.click()); };
async function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  await act(async () => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
const cell = (expectation, period, points) => container.querySelector(`[role="radiogroup"][aria-label="${expectation}, ${period}"] [aria-label="${points} ${points === 1 ? 'point' : 'points'}"]`);
const settings = () => cico.defaults();

describe('scoring', () => {
  it('counts only the periods actually rated, so an absence does not lower the percent', () => {
    const s = settings();
    expect(cico.score({ ratings: {} }, s)).toMatchObject({ earned: 0, possible: 0, rated: 0, pct: null, met: false });
    expect(cico.score({ ratings: { '0:0': 2, '0:1': 2, '0:2': 1, '1:0': 2 } }, s)).toMatchObject({ earned: 7, possible: 8, pct: 88, met: true });
    expect(cico.score({ ratings: { '0:0': 2, '0:1': 1, '0:2': 1 } }, s)).toMatchObject({ pct: 67, met: false });
    expect(cico.score({ ratings: { '0:0': 2, '9:0': 0, '0:7': 0 } }, s)).toMatchObject({ rated: 1, pct: 100 }); // outside the layout
  });

  it('trends the most recent rated days, oldest first', () => {
    const student = { days: { '2026-10-01': { ratings: { '0:0': 2 } }, '2026-10-02': { ratings: {} }, '2026-10-03': { ratings: { '0:0': 0 } } } };
    expect(cico.trend(student, settings()).map(r => [r.date, r.pct, r.met])).toEqual([['2026-10-01', 100, true], ['2026-10-03', 0, false]]);
  });
});

describe('stored shape', () => {
  it('drops malformed ratings, dates and settings, and caps sizes', () => {
    const days = {};
    for (let i = 0; i < 230; i++) days[new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)] = { ratings: { '0:0': 2 } };
    days['2026-02-30'] = { ratings: { '0:0': 2 } };
    days['2026-10-05'] = { ratings: { '0:0': 3, '0:1': '2', 'x:1': 1, '1:1': 1 }, checkIn: 'yes', checkOut: true, note: 'never kept' };
    const out = cico.normalize({ classes: { CLS: { settings: { periods: [], expectations: ['  Kind  ', ''], goalPct: 500 }, students: { LRN: { days } } } } });
    const cls = out.classes.CLS, kept = cls.students.LRN.days;
    expect(cls.settings).toEqual({ periods: settings().periods, expectations: ['Kind'], goalPct: 80 });
    expect(Object.keys(kept)).toHaveLength(200);
    expect(kept['2026-02-30']).toBeUndefined();
    expect(kept['2026-10-05']).toEqual({ ratings: { '1:1': 1 }, checkOut: true });
  });
});

describe('Store worksheet handoff', () => {
  it('adds one neutral row per student per day that the app worksheet folds in', () => {
    expect(cico.addToStoreWorksheet('CLS', 'LRN-calm', 'Calm Otter', '2026-10-13', 1000)).toBe('added');
    expect(cico.addToStoreWorksheet('CLS', 'LRN-calm', 'Calm Otter', '2026-10-13', 2000)).toBe('already');
    expect(cico.addToStoreWorksheet('CLS', 'LRN-calm', 'Calm Otter', '2026-10-14', 3000)).toBe('added');
    const log = JSON.parse(localStorage.getItem(LOG_KEY));
    const sheet = buildWorksheet({}, '', log);
    expect(sheet.rows).toEqual([{ codename: 'Calm Otter', total: 2, reasons: [{ label: 'Individual goal progress', count: 2 }], lastAt: 3000, sessions: 2 }]);
    expect(JSON.stringify(log)).not.toMatch(/cico|check-in|tier|percent|rating/i);
  });

  it('keeps live-session rows already in the log', () => {
    localStorage.setItem(LOG_KEY, JSON.stringify({ sessions: { ABC123: { updatedAt: 5, rows: { 'Quiet Owl': { ids: ['r1'], reasons: { Collaboration: 1 }, lastAt: 5 } } } } }));
    cico.addToStoreWorksheet('CLS', 'LRN-calm', 'Calm Otter', '2026-10-13', 10);
    const sheet = buildWorksheet({}, '', JSON.parse(localStorage.getItem(LOG_KEY)));
    expect(sheet.rows.map(r => [r.codename, r.total])).toEqual([['Calm Otter', 1], ['Quiet Owl', 1]]);
  });
});

describe('Daily check-in cards in the Teacher roster panel', () => {
  it('rates a day, meets the goal, sends one worksheet row, and never touches the roster', async () => {
    await mount();
    const before = JSON.stringify(currentRoster);
    await click(button('Daily check-in cards'));
    expect(container.querySelector('[data-cico-view]')).not.toBeNull();
    expect(container.textContent).toContain('No cards yet');
    await choose(container.querySelector('[data-cico-view] select'), 'Calm Otter');
    await click(button('Start a card'));
    expect(container.textContent).toContain('Calm Otter now has a daily check-in card.');
    for (const e of ['Be safe', 'Be respectful', 'Be responsible']) await click(cell(e, 'Period 1', 2));
    await click(cell('Be safe', 'Period 2', 1));
    expect(container.querySelector('[data-cico-score]').textContent).toContain('7 of 8 points (88%)');
    expect(container.querySelector('[data-cico-score]').textContent).toContain('Goal met');
    expect(cell('Be safe', 'Period 2', 1).getAttribute('aria-checked')).toBe('true');
    await click(button('Add to Store worksheet'));
    expect(button('On your Store worksheet').disabled).toBe(true);
    const log = JSON.parse(localStorage.getItem(LOG_KEY));
    expect(buildWorksheet({}, '', log).rows[0]).toMatchObject({ codename: 'Calm Otter', total: 1, reasons: [{ label: 'Individual goal progress', count: 1 }] });
    const stored = JSON.parse(localStorage.getItem(cico.key));
    const today = cico.localDate();
    expect(stored.classes['CLS-fictional'].students['LRN-calm'].days[today].ratings).toEqual({ '0:0': 2, '0:1': 2, '0:2': 2, '1:0': 1 });
    expect(JSON.stringify(currentRoster)).toBe(before);
    expect(JSON.stringify(currentRoster)).not.toMatch(/cico|ratings/i);
  });

  it('clears a rating when it is chosen again, and shows the trend', async () => {
    await mount();
    await click(button('Daily check-in cards'));
    await choose(container.querySelector('[data-cico-view] select'), 'Quiet Owl');
    await click(button('Start a card'));
    await click(cell('Be safe', 'Period 1', 0));
    expect(container.querySelector('[data-cico-score]').textContent).toContain('0 of 2 points (0%)');
    expect(container.querySelector('[data-cico-trend]').textContent).toContain('goal met on 0 of 1');
    await click(cell('Be safe', 'Period 1', 0));
    expect(container.querySelector('[data-cico-score]').textContent).toContain('No ratings for this day yet');
    expect(button('Add to Store worksheet')).toBeUndefined();
  });

  it('downloads MTSS Triage rows as codename and average percent only', async () => {
    const day = cico.localDate();
    localStorage.setItem(cico.key, JSON.stringify({ classes: { 'CLS-fictional': { settings: cico.defaults(), students: { 'LRN-calm': { days: { [day]: { ratings: { '0:0': 2, '0:1': 1 } } } } } } } }));
    const blobs = [];
    vi.stubGlobal('URL', class extends globalThis.URL { static createObjectURL = () => 'blob:x'; static revokeObjectURL = () => {}; });
    vi.stubGlobal('Blob', class { constructor(parts) { blobs.push(parts.join('')); } });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount();
    await click(button('Daily check-in cards'));
    await click([...container.querySelectorAll('button')].find(b => b.textContent.includes('MTSS Triage rows')));
    expect(blobs[0]).toBe('"student_code","cico_avg_pct"\r\n"Calm Otter","75"');
  });

  it('removes a card and its ratings only after confirmation', async () => {
    await mount();
    await click(button('Daily check-in cards'));
    await choose(container.querySelector('[data-cico-view] select'), 'Calm Otter');
    await click(button('Start a card'));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    await click(button('Remove card'));
    expect(JSON.parse(localStorage.getItem(cico.key)).classes['CLS-fictional'].students['LRN-calm']).toBeDefined();
    await click(button('Remove card'));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem(cico.key)).classes['CLS-fictional'].students['LRN-calm']).toBeUndefined();
    expect(container.textContent).toContain('No cards yet');
  });

  it('returns to the roster, and is not offered outside teacher mode', async () => {
    await mount();
    await click(button('Daily check-in cards'));
    await click(button('Back to roster'));
    expect(container.querySelector('[data-cico-view]')).toBeNull();
    await act(async () => root.unmount()); root = null; container.remove();
    await mount({ isParentMode: true });
    expect(button('Daily check-in cards')).toBeUndefined();
  });
});
