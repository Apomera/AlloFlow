// Behavior Lens recorders under classroom conditions (pass 8).
//
// WHY: until 2026-09-24
// - Live Observation counted time the page was not running as observed (a closed lid, a locked
//   phone), and dropped the second in progress at every pause.
// - Its interval method rolled intervals over on a timer that stopped with the page: a
//   10-minute closed lid became ONE "15 s" interval scored "not occurred". It saved the interval
//   in progress as a whole interval (1 of 4 plus a marked current one saved 40%, the screen 25%),
//   every session as incomplete (so the Overview graph never showed them), and no mode.
// - Switching method after recording discarded what was recorded, without a word.
// - A session's time stamp was the moment Save was pressed, and the per-hour rate read the
//   stretch just before it as the observed time.
// - In the Interval Grid, a second tap on "Occurred" UNMARKED the interval, and the current cell
//   did not show the mark.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let M, R, root;
beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  const source = readFileSync('behavior_lens_module.js', 'utf8');
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__blRecorders = { LiveObsOverlay, IntervalGrid, buildBehaviorReviewSeries, FrequencyCounter, SessionDataTracker, ABCModal, LatencyRecorder };})();'))();
  M = window.__blRecorders;
  R = window.AlloModules.BehaviorLensWorkspace;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  vi.useRealTimers();
  sessionStorage.clear();
  document.body.innerHTML = '';
});
const TARGETS = [{ id: 'yelled', label: 'Yelled' }];
const button = text => Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes(text) || node.getAttribute('aria-label') === text);
const click = node => act(async () => { expect(node).toBeTruthy(); node.click(); });
const advance = ms => act(async () => { vi.advanceTimersByTime(ms); });
// The page stops: the clock moves on and no timer fires, then one fires.
const lidClosed = ms => act(async () => { vi.setSystemTime(Date.now() + ms); vi.advanceTimersByTime(300); });
async function mount(Component, props) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 24, 9, 0, 0));
  document.body.innerHTML = '<div class="bl-root"><div id="mount"></div></div>';
  root = createRoot(document.getElementById('mount'));
  await act(async () => root.render(React.createElement(Component, Object.assign({ studentName: 'Kestrel', studentDraftId: 'rec-test', onClose: () => {}, addToast: () => {}, t: () => undefined }, props))));
}

describe('Live Observation', () => {
  it('a closed lid pauses the recording at the last moment the page ran, and says so', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession });
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await advance(60000);
    for (let i = 0; i < 3; i++) await click(button('+1'));
    await lidClosed(10 * 60000);
    expect(document.querySelector('[data-obs-suspended]')).toBeTruthy();
    expect(document.querySelector('[aria-label="Start observation timer"]')).toBeTruthy();   // paused
    await click(button('Save Session'));
    const saved = onSaveSession.mock.calls[0][0];
    expect(saved.duration).toBe(60);                                       // was 660
    expect(saved.data.rate).toBe(3);                                       // per minute, a number (was a string)
  });
  it('keeps the part-second at each pause', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession });
    for (let i = 0; i < 10; i++) {
      await click(document.querySelector('[aria-label="Start observation timer"]'));
      await advance(5900);
      await click(document.querySelector('[aria-label="Pause observation timer"]'));
    }
    await click(button('Save Session'));
    expect(onSaveSession.mock.calls[0][0].duration).toBe(59);              // was 50
  });
  it('intervals come from the recorded time, and a closed lid is not an interval', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession });
    await click(button('Interval'));
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await advance(60000);                                                  // 4 intervals of 15 s
    await lidClosed(10 * 60000);
    await click(button('Save Session'));
    const data = onSaveSession.mock.calls[0][0].data;
    expect(data.intervals.map(i => i.durationSeconds)).toEqual([15, 15, 15, 15]);   // one lasted 600 s and was saved as 15
    expect(data.completedCount).toBe(4);
  });
  it('scores completed intervals only, and reports the one in progress apart', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession });
    await click(button('Interval'));
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await advance(2000);
    await click(button('Not occurred'));                                   // interval 1 occurred
    await advance(58000);                                                  // 4 completed
    await advance(5000);
    await click(button('Not occurred'));                                   // the current one, marked
    await click(document.querySelector('[aria-label="Pause observation timer"]'));
    await click(button('Save Session'));
    const data = onSaveSession.mock.calls[0][0].data;
    expect(data).toMatchObject({ mode: 'partial', completedCount: 4, occurredCount: 1, percentage: 25, complete: true, partialInterval: { seconds: 5, occurred: true } });   // saved 40% (2 of 5), complete false
  });
  it('its interval sessions reach the Overview graph', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession, initialTarget: TARGETS[0] });
    await click(button('Interval'));
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await advance(31000);
    await click(button('Save Session'));
    const session = R.normalizeObservationSession(onSaveSession.mock.calls[0][0], { targetBehaviors: TARGETS }).session;
    const probe = M.buildBehaviorReviewSeries({ sessions: [session], targets: TARGETS, targetId: 'yelled' });
    const option = probe.options.find(o => /interval/i.test(o.id + ' ' + o.label));
    expect(option.label).toBe('Intervals: partial · 15 seconds');                 // was "unspecified"
    const model = M.buildBehaviorReviewSeries({ sessions: [session], targets: TARGETS, targetId: 'yelled', measurement: option.id });
    expect(model.rows.map(r => r.value)).toEqual([0]);                     // was null: every session "incomplete"
  });
  it('saves when it was observed, and the stretches observed', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession });
    await click(document.querySelector('[aria-label="Start observation timer"]'));   // 9:00
    await advance(5 * 60000);
    await click(document.querySelector('[aria-label="Pause observation timer"]'));
    await advance(25 * 60000);                                             // 9:30
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await advance(5 * 60000);
    await click(document.querySelector('[aria-label="Pause observation timer"]'));
    await advance(5 * 60000);                                              // saved at 9:40
    await click(button('Save Session'));
    const saved = onSaveSession.mock.calls[0][0];
    expect(new Date(saved.timestamp).getHours() * 60 + new Date(saved.timestamp).getMinutes()).toBe(9 * 60);   // was 9:40
    expect(saved.data.spans).toHaveLength(2);
    expect(saved.duration).toBe(600);
  });
  it('the method is fixed once something is recorded', async () => {
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn() });
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await advance(3000);
    await click(button('+1'));
    await click(document.querySelector('[aria-label="Pause observation timer"]'));
    expect(button('Duration').disabled).toBe(true);                        // switching discarded the counts
    expect(button('Duration').getAttribute('title')).toBe('Save or discard this session to change method');
  });
  it('says the session was saved, with no stray character', async () => {
    const toasts = [];
    await mount(M.LiveObsOverlay, { onSaveSession: vi.fn(), addToast: m => toasts.push(m) });
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await advance(2000);
    await click(button('Save Session'));
    expect(toasts).toContain('Observation session saved');                // was "Observation session saved ?"
  });
});

describe('the per-hour rate', () => {
  it('counts incidents inside the stretches a session observed', () => {
    const at = (h, m) => new Date(2026, 8, 24, h, m).toISOString();
    const session = { id: 's', method: 'frequency', timestamp: at(9, 0), duration: 600, data: { count: 1, spans: [{ start: at(9, 0), end: at(9, 5) }, { start: at(9, 30), end: at(9, 35) }] } };
    const entry = (id, h, m) => ({ id, antecedent: 'A', behavior: 'B', consequence: 'C', occurredAt: at(h, m), timestamp: at(h, m) });
    const rate = R.calculateIncidentRate([entry('observed', 9, 3), entry('during the pause', 9, 20)], [session]);
    expect([rate.observedIncidents, rate.outsideObservation]).toEqual([1, 1]);   // the 9:03 one was outside and the 9:20 one inside
  });
  it('a session saved before spans existed is read as before', () => {
    const at = (h, m) => new Date(2026, 8, 24, h, m).toISOString();
    const old = { id: 'o', method: 'frequency', timestamp: at(9, 10), duration: 600, data: { count: 1 } };
    expect(R.calculateIncidentRate([{ id: 'x', antecedent: 'A', behavior: 'B', consequence: 'C', occurredAt: at(9, 5), timestamp: at(9, 5) }], [old]).observedIncidents).toBe(1);
  });
});

describe('Interval Grid', () => {
  it('"Occurred" marks the interval, a second tap keeps it marked, and the current cell shows it', async () => {
    const onSaveSession = vi.fn();
    await mount(M.IntervalGrid, { onSaveSession });
    await click(button('Start recording'));
    await advance(3000);
    await click(button('Mark current interval as occurred'));
    await click(button('Mark current interval as occurred'));             // it happened again
    expect(button('Mark current interval as occurred').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[aria-label="Interval 1 — current, marked occurred"]')).toBeTruthy();
    await advance(13000);                                                  // interval 1 complete
    await click(button('Pause'));
    await advance(10 * 60000);                                             // saved at 9:10
    await click(button('Save Session'));
    const saved = onSaveSession.mock.calls[0][0];
    expect(saved.data.grid[0]).toBe(true);                                 // a second tap unmarked it
    expect(new Date(saved.timestamp).getMinutes()).toBe(0);                // 9:00, when it started
    expect(saved.data.spans).toHaveLength(1);
  });
  it('a session stopped before its planned end reaches the Overview graph', () => {
    const session = { id: 'g', method: 'interval', behaviorId: 'yelled', behavior: 'Yelled', timestamp: new Date(2026, 8, 24, 9).toISOString(), duration: 270, data: { mode: 'partial', intervalSec: 15, totalIntervals: 20, grid: Array(18).fill(false).map((_, i) => i < 9), occurredCount: 9, completedCount: 18, percentage: 50, complete: false } };
    const normalized = R.normalizeObservationSession(session, { targetBehaviors: TARGETS }).session;
    const probe = M.buildBehaviorReviewSeries({ sessions: [normalized], targets: TARGETS, targetId: 'yelled' });
    const option = probe.options.find(o => /interval/i.test(o.id + ' ' + o.label));
    expect(M.buildBehaviorReviewSeries({ sessions: [normalized], targets: TARGETS, targetId: 'yelled', measurement: option.id }).rows.map(r => r.value)).toEqual([50]);   // was a gap: the bell rang at 18 of 20
  });
});

const typeInto = async (node, value) => act(async () => {
  const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('Frequency Counter', () => {
  const tapFor = label => document.querySelector('[aria-label="Add one to ' + label + '"]');
  it('a closed lid pauses it, and the rate keeps its precision', async () => {
    const onSaveSession = vi.fn();
    await mount(M.FrequencyCounter, { onSaveSession });
    await click(button('Start recording'));
    await advance(40 * 60000);
    await click(document.querySelector('[aria-label^="Add one to"]'));
    await lidClosed(8 * 3600000);                                          // left running overnight
    expect(document.querySelector('[data-freq-suspended]')).toBeTruthy();
    await click(button('Save'));
    const saved = onSaveSession.mock.calls[0][0];
    expect(saved.duration).toBe(2400);                                     // was 8 h 40 min
    expect(saved.data.rate).toBe(0.025);                                   // was 0 (rounded to one decimal)
    expect(new Date(saved.timestamp).getHours()).toBe(9);
  });
  it('a counter added mid-session is divided by its own time', async () => {
    const onSaveSession = vi.fn();
    await mount(M.FrequencyCounter, { onSaveSession });
    await click(button('Start recording'));
    await advance(15 * 60000);
    await typeInto(document.querySelector('[aria-label="New behavior label"]'), 'Out of seat');
    await click(button('+ Add'));
    await advance(4 * 60000);
    for (let i = 0; i < 3; i++) await click(tapFor('Out of seat'));
    await advance(60000);
    await click(button('Save'));
    const counter = onSaveSession.mock.calls[0][0].data.counters.find(c => c.label === 'Out of seat');
    expect(counter).toMatchObject({ count: 3, rate: 0.6, observedSeconds: 300 });   // was 0.15: divided by all 20 minutes
  });
});

describe('Session Data Tracker', () => {
  async function startTracking() {
    await typeInto(document.querySelector('[aria-label="Target behavior name"]'), 'Yelled');
    await click(button('Start Session'));
  }
  it('a session in progress survives leaving the panel, comes back paused, and pauses', async () => {
    const onSaveSession = vi.fn();
    await mount(M.SessionDataTracker, { abcEntries: [], savedSessions: [], onSaveSession, studentDraftId: 'tracker-test' });
    await startTracking();
    await advance(60000);
    for (let i = 0; i < 4; i++) await click(button('Record Count'));
    await act(async () => root.unmount());                                 // opened another tool
    root = createRoot(document.getElementById('mount'));
    await act(async () => root.render(React.createElement(M.SessionDataTracker, { abcEntries: [], savedSessions: [], onSaveSession, studentDraftId: 'tracker-test', t: () => undefined, addToast: () => {} })));
    expect(document.body.textContent).toContain('Yelled: Count: 4');        // was an empty setup
    expect(button('Resume session')).toBeTruthy();
    await advance(10 * 60000);                                             // away: not counted
    await click(button('Resume session'));
    await advance(60000);
    await click(button('Pause session'));
    await advance(5 * 60000);                                              // paused: not counted
    await click(button('Resume session'));
    await click(button('End Session & Save'));
    const saved = onSaveSession.mock.calls[0][0];
    expect(saved.durationSec).toBe(120);
    expect(saved.targets[0]).toMatchObject({ count: 4, rate: 2 });
    expect(saved.spans).toHaveLength(3);
    expect(new Date(saved.date).getMinutes()).toBe(0);                     // 9:00, when it started (not 9:12)
  });
  it('a closed lid pauses it at the last moment the page ran', async () => {
    const onSaveSession = vi.fn();
    await mount(M.SessionDataTracker, { abcEntries: [], savedSessions: [], onSaveSession, studentDraftId: 'tracker-gap' });
    await startTracking();
    await advance(5 * 60000);
    await lidClosed(10 * 60000);
    expect(document.querySelector('[data-tracker-suspended]')).toBeTruthy();
    await click(button('End Session & Save'));
    expect(onSaveSession.mock.calls[0][0].durationSec).toBe(300);          // was 900
  });
});

describe('the ABC form while editing an entry', () => {
  const entry = { id: 'e1', antecedent: 'Math task', behavior: 'Yelled', consequence: 'Break', intensity: 2, occurredAt: new Date(2026, 8, 24, 9).toISOString(), timestamp: new Date(2026, 8, 24, 9).toISOString() };
  it('asks before Escape throws the changes away, and not when nothing changed', async () => {
    const onClose = vi.fn();
    await mount(M.ABCModal, { entry, onSave: vi.fn(), onClose, callGemini: null, targetBehaviors: [] });
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);                              // nothing changed: it closes
    await typeInto(document.querySelector('[aria-label="Antecedent narrative"]'), 'Changed antecedent');
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await advance(10);
    expect(document.body.textContent).toContain('Discard your changes to this entry?');   // closed without a word
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Latency Recorder', () => {
  it('trials from two days are saved as a record for each day', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LatencyRecorder, { onSaveSession });
    const trial = async ms => {
      await click(button('Present Stimulus'));
      await advance(ms);
      await click(Array.from(document.querySelectorAll('button')).find(b => /Response/.test(b.textContent) && (b.getAttribute('aria-label') || '') !== 'No Response'));
    };
    await trial(2000); await trial(4000);
    vi.setSystemTime(new Date(2026, 8, 25, 9, 0, 0));
    await trial(10000); await trial(12000);
    await click(button('Save to Session History'));
    const saved = onSaveSession.mock.calls.map(c => c[0]);
    expect(saved.map(s => [new Date(s.date).getDate(), s.value])).toEqual([[24, 3], [25, 11]]);   // was one record dated the 25th, mean 7 s
  });
});
