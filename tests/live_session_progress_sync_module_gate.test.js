import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The student progress-sync effect, run for real against a module that lands late.
//
// WHY THIS EXISTS
// A student joined a live session from an iPhone (mailbox link, 393x852) and the error reporter
// captured 27 copies of this in eleven seconds:
//
//   Unhandled promise rejection: [syncProgressToFirestore] PhaseKHelpers module not loaded
//
// The effect starts syncing the moment activeSessionCode + studentNickname land, immediately and
// then every 60s. But PhaseKHelpersModule is NOT in __alloBootCriticalModules, so it goes into the
// deferred background queue behind ~250 other modules -- and that pump parks completely while the
// launch pad is up and creeps one file per starve window while a finger is on the glass. A student
// tapping through the join flow on cell data is the exact worst case: the module arrives minutes
// after the first sync attempt. Every attempt in between called the wrapper, which throws, from a
// timer nobody awaits -- so each one surfaced as an unhandled rejection.
//
// The fix is the shape feedback_lazy_module_landing_leaves_stale_render_closure describes: gate on
// the module instead of throwing, promote it out of the background queue by name, and make its
// arrival a real dependency so the sync starts on a FRESH closure rather than one captured before
// the module existed. These tests drive the shipped effect body to hold all three.
const ANTI = resolve(process.cwd(), 'AlloFlowANTI.txt');

function sliceSyncEffect() {
  const source = readFileSync(ANTI, 'utf8');
  const anchor = source.indexOf('// PhaseKHelpers is a deferred module.');
  expect(anchor, 'the progress-sync module gate moved or was renamed').toBeGreaterThan(-1);
  const start = source.lastIndexOf('React.useEffect(() => {', anchor);
  expect(start, 'the sync effect never opens').toBeGreaterThan(-1);
  const end = source.indexOf('modulesReady]);', anchor);
  expect(end, 'the sync effect never closes on modulesReady').toBeGreaterThan(anchor);
  return source.slice(start, end + 'modulesReady]);'.length);
}

const EFFECT_SOURCE = sliceSyncEffect();

// Runs the shipped effect body with a controlled clock and a fake window.
function runEffect(options) {
  const settings = options || {};
  const timers = new Map();
  let nextTimerId = 1;
  let now = 0;

  const win = {
    AlloModules: settings.modulePresent ? { PhaseKHelpers: {} } : {},
    __alloLazyLiveSessionSync: () => { calls.promoted++; },
  };
  const calls = { promoted: 0, sync: 0, warn: [] };

  const scope = {
    window: win,
    // The wrapper as shipped: throws when the module is absent.
    syncProgressToFirestore: () => {
      calls.sync++;
      if (!(win.AlloModules && win.AlloModules.PhaseKHelpers)) {
        return Promise.reject(new Error('[syncProgressToFirestore] PhaseKHelpers module not loaded - reload the page'));
      }
      return Promise.resolve('synced');
    },
    setInterval: (fn, ms) => { const id = nextTimerId++; timers.set(id, { fn, ms, next: now + ms }); return id; },
    clearInterval: (id) => { timers.delete(id); },
    console: { warn: (...a) => calls.warn.push(a.map(String).join(' ')) },
    Date: { now: () => now },
  };

  let readyTicks = 0;
  const state = {
    isCanvas: false,
    activeSessionCode: 'ABC123',
    studentNickname: 'Sam',
    progressSyncTimerRef: { current: null },
    setModulesReady: (fn) => { readyTicks++; if (typeof fn === 'function') fn(0); },
    modulesReady: 0,
  };

  // Capture the effect callback + deps instead of letting React run them.
  let effectFn = null;
  let effectDeps = null;
  const React = { useEffect: (fn, deps) => { effectFn = fn; effectDeps = deps; } };

  const factory = new Function(
    'React', 'window', 'syncProgressToFirestore', 'setInterval', 'clearInterval',
    'console', 'Date', 'isCanvas', 'activeSessionCode', 'studentNickname',
    'progressSyncTimerRef', 'setModulesReady', 'modulesReady',
    EFFECT_SOURCE,
  );
  factory(
    React, scope.window, scope.syncProgressToFirestore, scope.setInterval, scope.clearInterval,
    scope.console, scope.Date, state.isCanvas, state.activeSessionCode, state.studentNickname,
    state.progressSyncTimerRef, state.setModulesReady, state.modulesReady,
  );

  const cleanup = effectFn();

  const advance = (ms) => {
    const target = now + ms;
    // Fire due timers in order, honouring any that reschedule themselves.
    for (;;) {
      let due = null;
      for (const [id, t] of timers) {
        if (t.next <= target && (!due || t.next < due.t.next)) due = { id, t };
      }
      if (!due) break;
      now = due.t.next;
      due.t.next = now + due.t.ms;
      due.t.fn();
    }
    now = target;
  };

  return { calls, cleanup, advance, timers, deps: effectDeps, readyTicks: () => readyTicks, win };
}

describe('live session progress sync: PhaseKHelpers gate', () => {
  it('does not call the throwing wrapper while the module is missing', () => {
    const run = runEffect({ modulePresent: false });
    // Five minutes of a student sitting in a session on a slow phone.
    run.advance(300000);
    expect(run.calls.sync, 'the wrapper was called before PhaseKHelpers landed').toBe(0);
  });

  it('promotes PhaseKHelpers out of the deferred queue on join', () => {
    const run = runEffect({ modulePresent: false });
    expect(run.calls.promoted, 'joining did not promote the module').toBe(1);
  });

  it('bumps modulesReady once the module lands, so the sync re-runs on a fresh closure', () => {
    const run = runEffect({ modulePresent: false });
    run.advance(5000);
    expect(run.readyTicks()).toBe(0);
    run.win.AlloModules.PhaseKHelpers = {}; // module finally lands
    run.advance(2000);
    expect(run.readyTicks(), 'module arrival did not force a re-render').toBe(1);
  });

  it('lists modulesReady as a dependency, not just a polled global', () => {
    const run = runEffect({ modulePresent: false });
    expect(run.deps, 'the effect must re-run when the module lands').toContain(0);
    // The slice is anchored on `modulesReady]);`, so the dep list ends with it.
    expect(EFFECT_SOURCE.trimEnd().endsWith('modulesReady]);')).toBe(true);
  });

  it('gives up after the lazy-module ceiling instead of polling forever', () => {
    const run = runEffect({ modulePresent: false });
    run.advance(70000);
    expect(run.calls.warn.join(' ')).toMatch(/did not load/i);
    expect(run.timers.size, 'the wait timer kept running past the ceiling').toBe(0);
  });

  it('syncs immediately and every 60s once the module is present', () => {
    const run = runEffect({ modulePresent: true });
    expect(run.calls.sync, 'no sync on mount').toBe(1);
    run.advance(180000);
    expect(run.calls.sync).toBe(4); // mount + three minutes
  });

  it('swallows a sync failure instead of raising an unhandled rejection', async () => {
    const run = runEffect({ modulePresent: true });
    // The module vanishes (failed retry) while the interval is live.
    delete run.win.AlloModules.PhaseKHelpers;
    const rejections = [];
    const onReject = (e) => { rejections.push(e); };
    process.on('unhandledRejection', onReject);
    run.advance(60000);
    await new Promise(r => setTimeout(r, 50));
    process.off('unhandledRejection', onReject);
    expect(rejections, 'the timer sync escaped as an unhandled rejection').toHaveLength(0);
    expect(run.calls.warn.join(' ')).toMatch(/sync failed/i);
  });

  it('clears the wait timer on unmount', () => {
    const run = runEffect({ modulePresent: false });
    expect(run.timers.size).toBe(1);
    run.cleanup();
    expect(run.timers.size, 'leaving the session left a poll running').toBe(0);
  });
});
