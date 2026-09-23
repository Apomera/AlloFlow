// Behavior Lens recording tools: what the latency and interval numbers MEAN.
//
// WHY (fixed 2026-09-23):
//   - Live Observation saved latency as the whole recording's elapsed seconds, not the
//     time from cue to response. Recording frequency for 30 s, pausing, switching to
//     Latency and responding 5 s after the cue saved 35 s. A pause between cue and
//     response was also counted.
//   - Interval Grid put a mark on the UNFINISHED interval into the numerator only: 1
//     scored of 4 completed plus a marked current interval showed and saved 50%
//     (correct 25%), and a session stopped early saved no `complete` flag.
//   - The AI "edit this entry" path spread the whole reply over the saved entry and
//     forced intensity to 1-5, so "fix the spelling" rated an unrated entry 1.
// Components run in real React (jsdom), with fake timers; expected values are worked
// from the definitions.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let M; let root;

beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  const source = readFileSync('behavior_lens_module.js', 'utf8');
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__blMeasureTest = { LiveObsOverlay, IntervalGrid, mergeAiAbcEdit };})();'))();
  M = window.__blMeasureTest;
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
  document.body.innerHTML = '';
});

const button = text => Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes(text) || node.getAttribute('aria-label') === text);
async function click(node, label) { expect(node, label).toBeTruthy(); await act(async () => node.click()); }
const advance = ms => act(async () => vi.advanceTimersByTime(ms));
async function mount(Component, props) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
  document.body.innerHTML = '<div class="bl-root"><div id="mount"></div></div>';
  root = createRoot(document.getElementById('mount'));
  await act(async () => root.render(React.createElement(Component, Object.assign({
    studentName: 'Test', studentDraftId: 'measure-' + Math.random(), onClose: () => {}, addToast: () => {}, t: () => undefined,
  }, props))));
}

describe('Live Observation latency', () => {
  it('is measured from the cue, not from the start of the recording', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession });
    await click(document.querySelector('[aria-label="Start observation timer"]'), 'start');
    await advance(30000);
    await click(document.querySelector('[aria-label="Pause observation timer"]'), 'pause');
    await click(button('Latency'), 'latency method');
    await click(document.querySelector('[aria-label="Start observation timer"]'), 'resume (cue)');
    await advance(5000);
    await click(button('Response started: stop the latency timer'), 'response');
    await click(button('Save Session'), 'save');
    expect(onSaveSession).toHaveBeenCalledTimes(1);
    expect(onSaveSession.mock.calls[0][0].data).toMatchObject({ latencyMs: 5000, latencySeconds: 5 });
  });

  it('does not count a pause between cue and response', async () => {
    const onSaveSession = vi.fn();
    await mount(M.LiveObsOverlay, { onSaveSession, initialMethod: 'latency' });
    await click(button('Latency'), 'latency method');
    await click(document.querySelector('[aria-label="Start observation timer"]'), 'cue');
    await advance(2000);
    await click(document.querySelector('[aria-label="Pause observation timer"]'), 'pause');
    await advance(10000);
    await click(document.querySelector('[aria-label="Start observation timer"]'), 'resume');
    await advance(3000);
    await click(button('Response started: stop the latency timer'), 'response');
    await click(button('Save Session'), 'save');
    expect(onSaveSession.mock.calls[0][0].data.latencyMs).toBe(5000);
  });
});

describe('Interval Grid percentage', () => {
  it('counts completed intervals only, and says whether the session finished', async () => {
    const onSaveSession = vi.fn();
    await mount(M.IntervalGrid, { onSaveSession });
    const start = Array.from(document.querySelectorAll('button')).find(b => /start/i.test(b.textContent) && !b.disabled);
    await click(start, 'start interval recording');
    const cell = i => document.querySelectorAll('.bl-interval-cell')[i];
    await advance(15000);                  // interval 1 completes (15 s default)
    await click(cell(0), 'score interval 1');
    await advance(45000);                  // intervals 2-4 complete, unscored
    await click(cell(4), 'score the unfinished interval 5');
    const pause = Array.from(document.querySelectorAll('button')).find(b => /pause|stop/i.test(b.textContent + (b.getAttribute('aria-label') || '')));
    await click(pause, 'pause');
    expect(document.querySelector('[data-interval-pct]').getAttribute('data-interval-pct')).toBe('25');
    await click(button('Save'), 'save');
    const data = onSaveSession.mock.calls[0][0].data;
    expect(data).toMatchObject({ occurredCount: 1, completedCount: 4, percentage: 25, complete: false, inProgressScored: true });
  });
});

describe('AI "edit this entry" merge', () => {
  const entry = { id: 'abc-1', occurredAt: '2026-09-12T12:00:00.000Z', phase: 'baseline', antecedent: 'Math', behavior: 'Left seat', consequence: 'Redirect', setting: 'Room 12', notes: 'teh note', intensity: null };
  it('a spelling fix keeps an unrated entry unrated (was rated 1)', () => {
    const out = M.mergeAiAbcEdit(entry, { antecedent: 'Math', behavior: 'Left seat', consequence: 'Redirect', setting: 'Room 12', notes: 'the note', intensity: 1 }, 'fix the spelling in the notes');
    expect(out.intensity).toBeNull();
    expect(out.notes).toBe('the note');
  });
  it('fields outside the editable six cannot overwrite the record', () => {
    const out = M.mergeAiAbcEdit(entry, { notes: 'x', id: 'hijack', phase: 'intervention', occurredAt: '2020-01-01T00:00:00Z' }, 'shorten notes');
    expect(out).toMatchObject({ id: 'abc-1', phase: 'baseline', occurredAt: '2026-09-12T12:00:00.000Z' });
  });
  it('an instruction about intensity can set or change it, within 1-5', () => {
    expect(M.mergeAiAbcEdit(entry, { intensity: 4 }, 'rate the intensity 4').intensity).toBe(4);
    expect(M.mergeAiAbcEdit({ ...entry, intensity: 2 }, { intensity: 9 }, 'make intensity higher').intensity).toBe(2);
    expect(M.mergeAiAbcEdit({ ...entry, intensity: 2 }, { intensity: 3 }, 'reword the behavior').intensity).toBe(2);
  });
});
