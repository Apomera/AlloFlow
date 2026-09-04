import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The background module pump, run for real on a controlled clock.
//
// WHY THIS EXISTS
// App boot registers ~162 modules. Twenty are boot-critical chrome; the other ~142 go into a
// deferred queue that drains in the background, and the "Loading tools… N left" pill counts what
// is still in it. The pill was added a week after the pump's throttle and is often mistaken for
// its cause; it is not. The throttle was `Math.max(0, 1 - pendingCount)` — one script in flight —
// and `pendingCount` counted EVERY module in the registry with status 'pending', including boot
// chrome and any module a person had just opened (opening a feature promotes its module out of
// the queue and loads it immediately). So the background queue's entire budget could be consumed
// by a module the pump had never queued, and 142 modules drained at best one per 360ms.
//
// Worse, `markInteraction` pushes the pause 3s out on every pointerdown and keydown. Someone
// working steadily never leaves a 3s gap, so the queue could sit still indefinitely while the
// pill honestly reported that nothing was moving.
//
// Nothing tested any of this, and none of it is visible from the pill's markup, so this suite
// slices the shipped pump and drives it: the budget is real but no longer one, foreign modules no
// longer spend it, continuous interaction slows the queue instead of stopping it, and the two
// hard stops that justify the whole design — hidden tab and launch pad — still hold.
const ANTI = resolve(process.cwd(), 'AlloFlowANTI.txt');

function slicePump() {
  const source = readFileSync(ANTI, 'utf8');
  const start = source.indexOf('    (function startDeferredModulePump() {');
  expect(start, 'startDeferredModulePump moved or was renamed').toBeGreaterThan(-1);
  const end = source.indexOf('\n    })();', start);
  expect(end, 'the pump IIFE never closes').toBeGreaterThan(start);
  return source.slice(start, end + '\n    })();'.length);
}

const PUMP_SOURCE = slicePump();

function makeHarness(options) {
  const settings = options || {};
  const timers = [];
  const listeners = {};
  const dispatched = [];
  const registry = Object.create(null);
  const queue = [];
  const names = Object.create(null);
  let clock = 0;
  let sequence = 0;

  const environment = {
    performance: { now: () => clock },
    navigator: settings.navigator || {},
    document: {
      get hidden() { return !!settings.hidden; },
      body: { classList: { contains: (name) => !!(settings.bodyClasses || []).includes(name) } },
    },
    window: {
      addEventListener: (type, handler) => { (listeners[type] = listeners[type] || []).push(handler); },
      // Left undefined on purpose: the pump then takes its documented fallback path and runs the
      // work with a didTimeout deadline, which is the branch every browser without rIC uses.
      requestIdleCallback: undefined,
    },
    setTimeout: (fn, delay) => {
      timers.push({ fn, at: clock + (delay || 0), order: sequence++ });
      return sequence;
    },
    __alloDeferredModuleQueue: queue,
    __alloDeferredModuleNames: names,
    __alloModuleRegistry: registry,
    __alloLoadModuleNow: (name, url) => {
      dispatched.push(name);
      registry[name] = { status: 'pending', url };
    },
  };

  function enqueue(count, prefix) {
    for (let index = 0; index < count; index++) {
      const entry = { name: (prefix || 'Module') + index, url: 'https://cdn.example/' + index + '.js' };
      names[entry.name] = entry;
      queue.push(entry);
    }
  }

  // Run every timer due at or before `until`, advancing the clock to each in turn.
  function runUntil(until, onEachTick) {
    for (let guard = 0; guard < 5000; guard++) {
      let next = -1;
      for (let index = 0; index < timers.length; index++) {
        if (next === -1 || timers[index].at < timers[next].at
          || (timers[index].at === timers[next].at && timers[index].order < timers[next].order)) next = index;
      }
      if (next === -1 || timers[next].at > until) break;
      const timer = timers.splice(next, 1)[0];
      clock = timer.at;
      if (onEachTick) onEachTick(clock);
      timer.fn();
    }
    clock = Math.max(clock, until);
  }

  function fire(type) {
    for (const handler of listeners[type] || []) handler();
  }

  function settleAll(name) {
    for (const key of Object.keys(registry)) {
      if (!name || key === name) registry[key].status = 'loaded';
    }
  }

  const keys = Object.keys(environment);
  // eslint-disable-next-line no-new-func
  new Function(...keys, PUMP_SOURCE)(...keys.map((key) => environment[key]));

  return { enqueue, runUntil, fire, settleAll, dispatched, registry, queue, get clock() { return clock; } };
}

describe('deferred module pump', () => {
  it('starts more than one background module at a time', () => {
    const harness = makeHarness();
    harness.enqueue(10);
    // The pump parks for 1400ms after boot before its first attempt.
    harness.runUntil(2000);
    expect(harness.dispatched.length, 'the pump still drains one module at a time')
      .toBeGreaterThan(1);
  });

  it('still throttles: it will not stampede the whole queue in one pass', () => {
    const harness = makeHarness();
    harness.enqueue(40);
    harness.runUntil(2000);
    // Nothing has finished loading, so the in-flight budget must hold the rest back.
    expect(harness.dispatched.length, 'the throttle is gone, not merely widened')
      .toBeLessThan(10);
    const afterFirstPass = harness.dispatched.length;
    harness.runUntil(4000);
    expect(harness.dispatched.length, 'modules were started while the previous ones were still pending')
      .toBe(afterFirstPass);
  });

  it('frees the budget as modules finish, so the queue keeps moving', () => {
    const harness = makeHarness();
    harness.enqueue(40);
    harness.runUntil(2000);
    const first = harness.dispatched.length;
    harness.settleAll();
    harness.runUntil(4000);
    expect(harness.dispatched.length, 'finished modules did not release the budget')
      .toBeGreaterThan(first);
  });

  it('does not spend its budget on modules it never queued', () => {
    // A person opens a feature: that module is promoted out of the queue and loaded immediately,
    // so it appears in the registry as pending without the pump having dispatched it. Before the
    // fix this alone drove the pump's budget to zero and stopped the background queue dead.
    const harness = makeHarness();
    harness.registry.SomethingTheUserOpened = { status: 'pending' };
    harness.enqueue(10);
    harness.runUntil(2000);
    expect(harness.dispatched, 'a module the pump never queued is still blocking the queue')
      .not.toEqual([]);
    expect(harness.dispatched).not.toContain('SomethingTheUserOpened');
  });

  it('creeps rather than stopping when someone is working continuously', () => {
    const harness = makeHarness();
    harness.enqueue(30);
    // Click steadily: every pointerdown pushes the pause 3s out, so there is never a quiet gap.
    harness.runUntil(30000, () => harness.fire('pointerdown'));
    expect(harness.dispatched.length, 'continuous interaction still starves the queue completely')
      .toBeGreaterThan(0);
    // It must creep, not resume — the interaction pause is there for a reason.
    expect(harness.dispatched.length, 'the interaction pause stopped protecting the main thread')
      .toBeLessThan(12);
  });

  it('stays parked behind the launch pad and in a hidden tab', () => {
    // These two hard stops are what make a wider budget safe: nothing loads while the person is
    // still on the launch pad, or while the tab is in the background.
    const concealed = makeHarness({ bodyClasses: ['alloflow-launchpad-active'] });
    concealed.enqueue(10);
    concealed.runUntil(10000);
    expect(concealed.dispatched, 'modules loaded behind the launch pad').toEqual([]);

    const hidden = makeHarness({ hidden: true });
    hidden.enqueue(10);
    hidden.runUntil(10000);
    expect(hidden.dispatched, 'modules loaded in a hidden tab').toEqual([]);
  });

  it('keeps the single-file cooldown on Data Saver and 2G', () => {
    const saver = makeHarness({ navigator: { connection: { saveData: true } } });
    saver.enqueue(20);
    saver.runUntil(4000);
    expect(saver.dispatched.length, 'Data Saver lost its narrow cooldown').toBeLessThan(3);

    const twoG = makeHarness({ navigator: { connection: { effectiveType: '2g' } } });
    twoG.enqueue(20);
    twoG.runUntil(4000);
    expect(twoG.dispatched.length, '2G lost its narrow cooldown').toBeLessThan(3);
  });

  it('never dispatches the same module twice', () => {
    const harness = makeHarness();
    harness.enqueue(12);
    for (let round = 0; round < 6; round++) {
      harness.runUntil(2000 + round * 1000);
      harness.settleAll();
    }
    expect(new Set(harness.dispatched).size).toBe(harness.dispatched.length);
  });
});
