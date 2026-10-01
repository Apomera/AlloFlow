import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const { act } = React;
let LiveObsOverlay;
let root;

beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  const source = readFileSync('behavior_lens_module.js', 'utf8');
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__blPauseTest = LiveObsOverlay;})();'))();
  LiveObsOverlay = window.__blPauseTest;
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
  document.body.innerHTML = '';
});

const button = text => Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes(text));
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }

describe('Live Observation pause measurements', () => {
  it('keeps the interval in progress while paused and excludes paused wall time after resume', async () => {
    // Since 2026-09-24 a pause no longer closes the interval early (a 5 s stretch was saved as
    // an interval and scored like a whole one); the interval continues after the pause.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-12T12:00:00Z'));
    const onSaveSession = vi.fn();
    document.body.innerHTML = '<div class="bl-root"><div id="mount"></div></div>';
    root = createRoot(document.getElementById('mount'));
    await act(async () => root.render(React.createElement(LiveObsOverlay, {
      studentName: 'Test', studentDraftId: 'pause-test', onClose: () => {},
      onSaveSession, addToast: () => {}, t: () => undefined
    })));
    await click(button('Interval'));
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await act(async () => vi.advanceTimersByTime(5000));
    await click(button('Not occurred'));
    await click(document.querySelector('[aria-label="Pause observation timer"]'));
    const key = 'behaviorLens_observation_draft_v1_live_pause-test';
    let draft = JSON.parse(sessionStorage.getItem(key)).data;
    expect(draft.intervals).toHaveLength(0);                               // no interval has finished
    expect(draft.currentInterval).toMatchObject({ occurred: true });
    await act(async () => vi.advanceTimersByTime(10000));
    await act(async () => Simulate.change(document.querySelector('[aria-label="Session notes"]'), { target: { value: 'Edited while paused' } }));
    draft = JSON.parse(sessionStorage.getItem(key)).data;
    expect(draft.timer).toBe(5);                                           // the pause is not counted
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await act(async () => vi.advanceTimersByTime(13000));
    await click(document.querySelector('[aria-label="Pause observation timer"]'));
    await click(button('Save Session'));
    const saved = onSaveSession.mock.calls[0][0];
    expect(saved.duration).toBe(18);
    expect(saved.data.intervals.map(interval => interval.durationSeconds)).toEqual([15]);
    expect(saved.data).toMatchObject({ occurredCount: 1, completedCount: 1, percentage: 100, complete: true, partialInterval: { seconds: 3, occurred: false } });
  });
});
