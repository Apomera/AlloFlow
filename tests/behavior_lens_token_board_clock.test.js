// Behavior Lens Token Board: FI / VI / DRO timing.
//
// WHY: until 2026-09-23 the schedule clock counted 1-second timer TICKS, so a background
// tab or a locked screen stretched every interval. DRO started by itself with no timer
// on screen and no pause, and kept filling tokens every N minutes whether or not anyone
// was watching; its reinforcement ran inside a state updater, which React may call
// twice. The schedule and token-count buttons were all named "Toggle schedule type" and
// "Toggle slots", and DRO's description said "Average every N minutes" (it is fixed).
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let TB, root;
beforeAll(() => {
  setupBehaviorLens();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  const source = readFileSync('behavior_lens_module.js', 'utf8');
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__blTokenClockTest = { TokenBoard };})();'))();
  TB = window.__blTokenClockTest.TokenBoard;
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const button = text => Array.from(document.querySelectorAll('button')).find(node => node.textContent.includes(text) || node.getAttribute('aria-label') === text);
const click = node => act(async () => { expect(node).toBeTruthy(); node.click(); });
const advance = ms => act(async () => { vi.advanceTimersByTime(ms); });
const earned = () => Array.from(document.querySelectorAll('span')).map(s => s.textContent).find(t => /^\d+\/5$/.test(t));
const clock = () => document.querySelector('[data-token-clock]').textContent;
async function mount() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-23T14:00:00Z'));
  document.body.innerHTML = '<div class="bl-root"><div id="mount"></div></div>';
  root = createRoot(document.getElementById('mount'));
  const toasts = [];
  await act(async () => root.render(React.createElement(TB, { studentName: 'Test', studentKey: k => k, t: () => undefined, addToast: (m, kind) => toasts.push([m, kind]), callGemini: null, onClose: () => {} })));
  return toasts;
}
async function schedule(label, minutes) {
  await click(button(label));
  const input = document.querySelector('input[aria-label="Schedule parameter value"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => { setter.call(input, String(minutes)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}

describe('DRO', () => {
  it('shows a countdown, fills ONE token per interval, and resets on the behavior', async () => {
    const toasts = await mount();
    await schedule('DRO (Differential Reinforcement)', 1);
    expect(document.querySelector('[data-token-timer="DRO"]')).toBeTruthy();   // old: no DRO timer at all
    expect(document.body.textContent).toContain('A token after 1 minute(s) without the behavior');
    await advance(30000);
    expect(clock()).toBe('0:30');
    await click(button('Record Behavior'));                   // behavior occurred: start over
    expect(clock()).toBe('1:00');
    await advance(60250);
    expect(earned()).toBe('1/5');
    expect(toasts.filter(([m]) => /DRO interval complete/.test(m))).toHaveLength(1);
  });
  it('can be paused, and a stopped page neither runs the clock nor pays tokens', async () => {
    await mount();
    await schedule('DRO (Differential Reinforcement)', 1);
    await advance(20000);
    vi.setSystemTime(Date.now() + 300000); await advance(250);   // locked for 5 minutes
    expect(document.querySelector('[data-token-stopped]').textContent).toBe('Timer paused: this page stopped running for 300 seconds. That time is not counted. Start it again when you are watching.');
    expect(earned()).toBe('0/5');                                 // old: tokens for minutes nobody watched (or a frozen clock)
    expect(clock()).toBe('0:40');
    await click(button('Start Timer'));
    await advance(40250);
    expect(earned()).toBe('1/5');
    await advance(10000);
    await click(button('Pause'));
    await advance(180000);
    expect(earned()).toBe('1/5');
    await click(button('Start Timer'));
    await advance(250);
    expect(clock()).toBe('0:50');           // a pause keeps the 10 s already run
  });
});

describe('FI', () => {
  it('follows the wall clock when the browser slows its timers', async () => {
    await mount();
    await schedule('Fixed Interval (FI)', 1);
    await click(button('Start Timer'));
    // A background tab: each timer fires late while 2 s of real time passes.
    for (let k = 0; k < 30; k += 1) { vi.setSystemTime(Date.now() + 1750); await advance(250); }
    expect(document.body.textContent).toContain('INTERVAL READY');     // 60 s of real time (old: 7 ticks)
    expect(clock()).toBe('1:00');
  });
});

describe('filling tokens', () => {
  it('an FI reinforcement fills a slot on a fresh board (it filled nothing)', async () => {
    await mount();
    await schedule('Fixed Interval (FI)', 1);
    await click(button('Start Timer'));
    await advance(60250);
    await click(button('Record Behavior'));
    expect(earned()).toBe('1/5');
    expect(clock()).toBe('0:00');           // the next interval starts at the reinforcement
    await advance(60250);
    expect(document.body.textContent).toContain('INTERVAL READY');   // and becomes ready again
  });
  it('a fixed ratio fills a slot on the Nth response', async () => {
    await mount();
    await schedule('Fixed Ratio (FR)', 2);
    await click(button('Record Behavior'));
    expect(earned()).toBe('0/5');
    await click(button('Record Behavior'));
    expect(earned()).toBe('1/5');
  });
});

describe('button names', () => {
  it('say which schedule and how many tokens', async () => {
    await mount();
    const pressed = Array.from(document.querySelectorAll('button[aria-pressed="true"]')).map(b => b.getAttribute('aria-label') || b.textContent);
    expect(pressed).toContain('5 tokens');
    expect(document.querySelector('button[aria-label="Toggle schedule type"]')).toBeNull();
    expect(document.querySelector('button[aria-label="Toggle slots"]')).toBeNull();
  });
});
