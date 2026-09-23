// Behavior Lens Interval Grid clock and momentary mode.
//
// WHY: until 2026-09-23 the grid counted 1-second timer TICKS. Browsers slow timers in
// a background tab and stop them on a locked phone, so a "15 s" interval could last
// minutes and the saved duration (the denominator of every rate) came out short.
// "Momentary" mode accepted "Occurred" at any moment of the interval, which is partial
// interval recording under another name. Pausing inside the first interval dropped
// back to the setup screen, whose Start button erased the time already recorded.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let G, IG, root;
beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  const source = readFileSync('behavior_lens_module.js', 'utf8');
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__blGridClockTest = { IntervalGrid };})();'))();
  G = window.__blGridClockTest.IntervalGrid;
  IG = window.AlloModules.BehaviorLensIntervalGrid;
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  vi.useRealTimers();
  sessionStorage.clear();
  document.body.innerHTML = '';
});

const button = text => Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes(text) || node.getAttribute('aria-label') === text);
const click = node => act(async () => { expect(node).toBeTruthy(); node.click(); });
const advance = ms => act(async () => { vi.advanceTimersByTime(ms); });
const progress = () => Array.from(document.querySelectorAll('span')).map(s => s.textContent).find(t => /^\d+\/20$/.test(t));
const clockText = () => Array.from(document.querySelectorAll('span')).map(s => s.textContent).find(t => /^\d+:\d\d$/.test(t));
async function mount(props = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-23T14:00:00Z'));
  document.body.innerHTML = '<div class="bl-root"><div id="mount"></div></div>';
  root = createRoot(document.getElementById('mount'));
  const onSaveSession = vi.fn();
  await act(async () => root.render(React.createElement(G, { studentName: 'Test', studentDraftId: 'clock-' + Math.random(), onClose: () => {}, addToast: () => {}, t: () => undefined, onSaveSession, ...props })));
  return onSaveSession;
}

describe('intervalGridPosition', () => {
  it('finds the interval and the look window from elapsed time', () => {
    expect(IG.intervalGridPosition(12000, 15, 20)).toMatchObject({ completed: 0, secondsLeft: 3, lookWindow: false });
    expect(IG.intervalGridPosition(13000, 15, 20)).toMatchObject({ completed: 0, secondsLeft: 2, lookWindow: true });
    expect(IG.intervalGridPosition(31000, 15, 20)).toMatchObject({ completed: 2, elapsedSec: 31 });
    expect(IG.intervalGridPosition(999999, 15, 20)).toMatchObject({ completed: 20, finished: true, elapsedSec: 300, lookWindow: false });
  });
});

describe('the interval grid clock', () => {
  it('follows the wall clock when the browser slows its timers', async () => {
    await mount();
    await click(button('Start recording'));
    // A background tab: each timer fires 250 ms late while 1.75 s of real time passes.
    for (let k = 0; k < 10; k += 1) { vi.setSystemTime(Date.now() + 1500); await advance(250); }
    expect(progress()).toBe('1/20');         // 17.5 s of real time (old: 2 ticks, 0/20)
    expect(clockText()).toBe('0:17');
  });
  it('a stopped page pauses the session and does not count the gap', async () => {
    const onSaveSession = await mount();
    await click(button('Start recording'));
    await advance(20000);                                      // 20 s: interval 1 done
    vi.setSystemTime(Date.now() + 120000); await advance(250);  // locked for 2 minutes
    const notice = document.querySelector('[data-interval-suspended]');
    expect(notice && notice.textContent).toBe('Recording paused: this page stopped running for 120 seconds (screen locked or another app). That time is not counted. Resume when you are watching again.');
    expect(clockText()).toBe('0:20');
    expect(progress()).toBe('1/20');                          // old: 9 intervals "observed" on wake (or none, if throttled)
    await click(button('Resume'));
    expect(document.querySelector('[data-interval-suspended]')).toBeNull();   // the notice goes once recording resumes
    await advance(10000);
    expect(progress()).toBe('2/20');
    await click(button('Pause'));
    await click(button('Save'));
    expect(onSaveSession.mock.calls[0][0].duration).toBe(30);
  });
  it('a pause inside the first interval keeps the time and offers Resume', async () => {
    await mount();
    await click(button('Start recording'));
    await advance(6000);
    await click(button('Pause'));
    expect(button('Start recording')).toBeUndefined();       // old: the setup screen, whose Start erased the 6 s
    expect(clockText()).toBe('0:06');
    await click(button('Resume'));
    await advance(9000);
    expect(progress()).toBe('1/20');
  });
});

describe('momentary time sampling', () => {
  it('takes a mark only at the end of the interval', async () => {
    await mount();
    await click(button('Momentary'));
    await click(button('Start recording'));
    await advance(5000);
    const occurring = () => button('Mark: occurring at the end of this interval');
    expect(occurring().disabled).toBe(true);
    expect(document.querySelector('[data-interval-look]').textContent).toBe('Look in 8 s');
    await click(document.querySelectorAll('.bl-interval-cell')[0]);   // the current cell refuses too
    await advance(8250);                                                // 13.25 s: the look window
    expect(document.querySelector('[data-interval-look]').textContent).toBe('Look now: is it happening at this moment?');
    await click(occurring());
    await advance(2000);                                                // interval 1 ends
    expect(document.querySelector('[data-interval-pct]').getAttribute('data-interval-pct')).toBe('100');
  });
  it('partial interval still takes a mark at any time', async () => {
    await mount();
    await click(button('Start recording'));
    await advance(5000);
    await click(button('Mark current interval as occurred'));
    await advance(10000);
    expect(document.querySelector('[data-interval-pct]').getAttribute('data-interval-pct')).toBe('100');
  });
});
