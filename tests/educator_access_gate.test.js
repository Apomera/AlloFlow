/**
 * The educator access gate: when may it demand a password?
 *
 * WHY THIS EXISTS
 * The gate shipped reading `_alloEducatorAccessCodeRequirement() !== 'off'`. The
 * requirement has FOUR states but only two of them are answers — 'configured' and
 * 'off'. The other two mean "not known yet" ('pending') and "cannot tell"
 * ('unavailable'), and `!== 'off'` counted both as "demand a password".
 *
 * On Canvas that was fatal. `_isCanvasEnv` routes the check through a hydration branch
 * that reports 'pending' for the whole prefs-hydration window and sticks on
 * 'unavailable' forever if the device-storage bridge never resolves. So the gate opened
 * on devices where no code had ever been configured, and TeacherGate then reported
 * "No educator access code is configured on this device" — a dialog with no input that
 * could ever open it. Teacher, Parent and Independent were unreachable; only Student
 * was left. No other surface showed it, because they skip that branch entirely.
 *
 * The functions are LIFTED FROM THE SOURCE rather than reimplemented here, so this
 * cannot pass while the shipped copy says something else.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const SOURCES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function liftGate(file) {
  const src = readFileSync(resolve(process.cwd(), file), 'utf8');
  const start = src.indexOf('const ALLO_EDUCATOR_ACCESS_CODE_STORAGE_KEY');
  const endMark = '  window._alloEducatorAccessCodeSettled = _alloEducatorAccessCodeSettled;\n}';
  const end = src.indexOf(endMark, start);
  if (start < 0 || end < 0) return null;
  return src.slice(start, end + endMark.length);
}

function evaluate(block, { canvas, hydration, stored, cfgKey, storageThrows } = {}) {
  const listeners = {};
  const win = {
    __alloPrefsHydrationStatus: hydration,
    addEventListener: (k, fn) => { (listeners[k] = listeners[k] || []).push(fn); },
    removeEventListener: (k, fn) => { listeners[k] = (listeners[k] || []).filter((f) => f !== fn); },
  };
  const sandbox = {
    window: win,
    _isCanvasEnv: !!canvas,
    APP_CONFIG: { _cfg_validation_key: cfgKey || '' },
    localStorage: {
      getItem() {
        if (storageThrows) throw new Error('storage blocked');
        return stored ? 'verifier-blob' : null;
      },
    },
    setTimeout, clearTimeout, Promise, Number, console,
  };
  vm.createContext(sandbox);
  vm.runInContext(block, sandbox);
  // `const` inside runInContext is lexical and never lands on the sandbox object; the
  // block publishes the same functions onto window, which is what the app consumes.
  return {
    requirement: win._alloEducatorAccessCodeRequirement(),
    required: win._alloEducatorAccessCodeRequired(),
    settled: win._alloEducatorAccessCodeSettled,
    fireHydrated: () => (listeners['allo-prefs-hydrated'] || []).slice().forEach((f) => f()),
    listenerCount: () => (listeners['allo-prefs-hydrated'] || []).length,
  };
}

describe('educator access gate — when it may demand a password', () => {
  const block = liftGate('AlloFlowANTI.txt');
  it('is present in the canonical source', () => {
    expect(block, 'could not lift the gate block from AlloFlowANTI.txt').toBeTruthy();
  });

  // The one and only state in which a password may be demanded.
  it('demands a code when one is actually configured', () => {
    expect(evaluate(block, { canvas: true, hydration: 'ready', stored: true }).required).toBe(true);
    expect(evaluate(block, { canvas: false, stored: true }).required).toBe(true);
  });

  it('honours an explicit deployment policy key', () => {
    expect(evaluate(block, { canvas: false, stored: false, cfgKey: 'k' }).required).toBe(true);
  });

  // Everything below is a state where NO code can be verified against. Demanding one
  // produces a dialog that cannot be opened.
  it('never demands a code on Canvas while prefs are still hydrating', () => {
    const r = evaluate(block, { canvas: true, hydration: undefined, stored: false });
    expect(r.requirement).toBe('pending');
    expect(r.required, 'THE REPORTED BUG: gate raised with nothing to verify against').toBe(false);
  });

  it('never demands a code when the storage bridge is unavailable', () => {
    // This one used to stick ON permanently, with no way through at all.
    const r = evaluate(block, { canvas: true, hydration: 'unavailable', stored: false });
    expect(r.requirement).toBe('unavailable');
    expect(r.required).toBe(false);
  });

  it('never demands a code when localStorage itself throws', () => {
    expect(evaluate(block, { canvas: false, stored: false, storageThrows: true }).required).toBe(false);
  });

  it('is off by default on a clean device, Canvas or not', () => {
    expect(evaluate(block, { canvas: true, hydration: 'ready', stored: false }).required).toBe(false);
    expect(evaluate(block, { canvas: false, stored: false }).required).toBe(false);
  });

  it('leaves non-Canvas surfaces exactly as they were', () => {
    expect(evaluate(block, { canvas: false, hydration: undefined, stored: false }).required).toBe(false);
    expect(evaluate(block, { canvas: false, hydration: undefined, stored: true }).required).toBe(true);
  });
});

describe('educator access gate — waiting for hydration instead of guessing', () => {
  const block = liftGate('AlloFlowANTI.txt');

  it('resolves as soon as prefs hydration reports in', async () => {
    const r = evaluate(block, { canvas: true, hydration: 'pending', stored: false });
    let done = false;
    const p = r.settled(5000).then(() => { done = true; });
    expect(done, 'settled() resolved before hydration reported').toBe(false);
    r.fireHydrated();
    await p;
    expect(done).toBe(true);
  });

  it('falls through rather than hanging when the bridge never answers', async () => {
    // A boot path awaiting a promise that never settles would strand the launch pad,
    // which is a worse failure than the one being fixed.
    const r = evaluate(block, { canvas: true, hydration: 'pending', stored: false });
    const t0 = Date.now();
    await r.settled(60);
    const waited = Date.now() - t0;
    expect(waited).toBeGreaterThanOrEqual(40);
    expect(waited).toBeLessThan(2000);
  });

  it('does not wait at all once the answer is known', async () => {
    const r = evaluate(block, { canvas: true, hydration: 'ready', stored: true });
    const t0 = Date.now();
    await r.settled(5000);
    expect(Date.now() - t0).toBeLessThan(50);
  });

  it('removes its listener, both when it fires and when it times out', async () => {
    const fired = evaluate(block, { canvas: true, hydration: 'pending', stored: false });
    const p = fired.settled(5000);
    expect(fired.listenerCount()).toBe(1);
    fired.fireHydrated();
    await p;
    expect(fired.listenerCount(), 'listener leaked after hydration fired').toBe(0);

    const timedOut = evaluate(block, { canvas: true, hydration: 'pending', stored: false });
    await timedOut.settled(40);
    expect(timedOut.listenerCount(), 'listener leaked after the timeout').toBe(0);
  });
});

describe('educator access gate — every shipped copy agrees', () => {
  // App.jsx is generated from AlloFlowANTI.txt by build.js and the desktop tree keeps
  // its own backup of the source. A fix that lands in one and not the others is the
  // same bug still shipping.
  const canonical = liftGate('AlloFlowANTI.txt');
  for (const file of SOURCES.slice(1)) {
    it(`${file} carries the same gate logic`, () => {
      const block = liftGate(file);
      expect(block, `could not lift the gate block from ${file}`).toBeTruthy();
      expect(block).toBe(canonical);
    });
  }

  it('no copy still uses the fail-closed comparison', () => {
    for (const file of SOURCES) {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(
        src.includes("_alloEducatorAccessCodeRequirement() !== 'off'"),
        `${file} still raises the gate on 'pending' and 'unavailable'`,
      ).toBe(false);
    }
  });
});
