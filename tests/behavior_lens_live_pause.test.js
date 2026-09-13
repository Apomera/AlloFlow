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
  it('freezes partial intervals while paused and excludes paused wall time after resume', async () => {
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
    expect(draft.intervals).toHaveLength(1);
    expect(draft.intervals[0]).toMatchObject({ durationSeconds: 5, occurred: true, complete: false });
    await act(async () => vi.advanceTimersByTime(10000));
    await act(async () => Simulate.change(document.querySelector('[aria-label="Session notes"]'), { target: { value: 'Edited while paused' } }));
    draft = JSON.parse(sessionStorage.getItem(key)).data;
    expect(draft.intervals[0].durationSeconds).toBe(5);
    await click(document.querySelector('[aria-label="Start observation timer"]'));
    await act(async () => vi.advanceTimersByTime(3000));
    await click(document.querySelector('[aria-label="Pause observation timer"]'));
    await click(button('Save Session'));
    const saved = onSaveSession.mock.calls[0][0];
    expect(saved.duration).toBe(8);
    expect(saved.data.intervals.map(interval => interval.durationSeconds)).toEqual([5, 3]);
    expect(saved.data.complete).toBe(false);
    expect(saved.data.occurredCount).toBe(1);
  });
});
