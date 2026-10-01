// Climate Explorer — the hero canvas must follow reduced motion in BOTH
// directions, without a reload.
//
// THE DEFECT THIS PINS
// The hero canvas read prefers-reduced-motion ONCE, inside its ref callback,
// behind a `cv._ceInit = true` re-entry guard — so exactly once per mount. Two
// gates consulted that captured value:
//
//     if (!heroRM) heroTick++;                                   // advance time
//     if (!heroRM && !cv._cePaused) requestAnimationFrame(...);  // reschedule
//
// It broke both ways:
//   ON  mid-session -> the loop kept rescheduling, molecules and stars kept
//                      moving, until reload.
//   OFF mid-session -> worse, and easy to miss: the loop had ALREADY stopped
//                      rescheduling itself, and nothing restarted it, so the
//                      hero stayed frozen for ever.
//
// The second direction is why a live read alone is not enough and the fix also
// subscribes: by the time the preference flips off there is no frame running to
// notice it.
//
// WHAT IS EXERCISED
// The shipped ref callback is lifted out of the source and run against a fake
// canvas and a fake MediaQueryList, with requestAnimationFrame counted. So the
// assertions are about the real loop, not a restatement of it.
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync('stem_lab/stem_tool_climateexplorer.js', 'utf8');

/** A MediaQueryList that records listeners and can flip. */
function fakeMQ(initial, { modern = true } = {}) {
  const q = { matches: initial, listeners: [], removed: 0 };
  if (modern) {
    q.addEventListener = (t, fn) => { if (t === 'change') q.listeners.push(fn); };
    q.removeEventListener = (t, fn) => {
      const i = q.listeners.indexOf(fn);
      if (i >= 0) { q.listeners.splice(i, 1); q.removed += 1; }
    };
  } else {
    q.addListener = (fn) => q.listeners.push(fn);
    q.removeListener = (fn) => {
      const i = q.listeners.indexOf(fn);
      if (i >= 0) { q.listeners.splice(i, 1); q.removed += 1; }
    };
  }
  q.flip = (next) => { q.matches = next; for (const fn of [...q.listeners]) fn({ matches: next }); };
  return q;
}

/**
 * Lift the hero canvas ref callback out of the shipped source and run it.
 * Returns the fake canvas plus a count of scheduled frames.
 */
function runHero(query, { connected = true } = {}) {
  const at = SOURCE.indexOf('cv._ceInit = true;');
  expect(at, 'the hero ref callback is still in the source').toBeGreaterThan(-1);
  const start = SOURCE.lastIndexOf('function', at);
  // The callback ends at its own `heroDraw();` tail.
  const tail = SOURCE.indexOf('heroDraw();\n              },', at);
  expect(tail, 'the callback tail is still recognisable').toBeGreaterThan(at);
  const body = SOURCE.slice(SOURCE.indexOf('{', start) + 1, tail + 'heroDraw();'.length);

  let scheduled = 0;
  // A 2D context stub that is faithful where the shipped code depends on the
  // SHAPE of a return value: createLinearGradient must hand back something with
  // addColorStop, and the settable properties (fillStyle, globalAlpha…) must
  // accept writes. Everything else can be a no-op.
  const gradient = { addColorStop() {} };
  const ctx2d = new Proxy({}, {
    get: (target, prop) => {
      if (prop in target) return target[prop];
      if (typeof prop === 'string' && /^create(Linear|Radial|Conic)Gradient$/.test(prop)) {
        return () => gradient;
      }
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set: (target, prop, value) => { target[prop] = value; return true; },
  });
  const cv = {
    _ceInit: false,
    _cePaused: false,
    isConnected: connected,
    clientWidth: 600,
    clientHeight: 130,
    width: 0,
    height: 0,
    getContext: () => ctx2d,
  };
  const win = { matchMedia: () => query };
  const raf = (fn) => { scheduled += 1; return scheduled; };

  // The callback closes over a few outer values from the component; supply them
  // rather than editing the lifted body, so what runs stays the shipped code.
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'cv', 'window', 'requestAnimationFrame', 'Math', 'heroSignal', 'heroTicker', 'heroMotionPaused',
    body,
  );
  fn.call(null, cv, win, raf, Math, 0.42, null, false);
  return { cv, frames: () => scheduled, query };
}

describe('Climate Explorer hero canvas follows reduced motion live', () => {
  it('does not schedule frames when the preference is already on', () => {
    const q = fakeMQ(true);
    const h = runHero(q);
    expect(h.frames(), 'a reduced-motion learner must get a static hero').toBe(0);
  });

  it('schedules frames when the preference is off', () => {
    const q = fakeMQ(false);
    const h = runHero(q);
    expect(h.frames(), 'motion is expected by default').toBeGreaterThan(0);
  });

  it('subscribes, so turning the preference OFF can restart the stopped loop', () => {
    // This is the direction a live read alone cannot fix: once the loop has
    // stopped rescheduling there is no frame left to notice the change.
    const q = fakeMQ(true);
    const h = runHero(q);
    expect(h.frames(), 'starts static').toBe(0);
    expect(q.listeners, 'the hero must subscribe to the query').toHaveLength(1);

    q.flip(false);
    expect(h.frames(), 'THE DEFECT: the hero stayed frozen for ever').toBeGreaterThan(0);
  });

  it('subscribes through addListener when addEventListener is absent', () => {
    // Safari < 14 and the older classroom iPads.
    const q = fakeMQ(true, { modern: false });
    const h = runHero(q);
    expect(q.listeners).toHaveLength(1);
    q.flip(false);
    expect(h.frames()).toBeGreaterThan(0);
  });

  it('drops its listener once the canvas leaves the page', () => {
    const q = fakeMQ(true);
    const h = runHero(q);
    h.cv.isConnected = false;
    q.flip(false);
    expect(q.listeners, 'a detached canvas must not keep a live handler').toHaveLength(0);
    expect(q.removed).toBe(1);
  });

  it('does not restart a hero the learner paused by hand', () => {
    // The pause button owns cv._cePaused; a preference change must not override
    // a deliberate choice.
    //
    // Mutation note, stated plainly rather than engineered around: removing the
    // `!cv._cePaused` half of the listener's guard SURVIVES this test, and that
    // is correct. heroDraw() opens with `if (!cv.isConnected || cv._cePaused)
    // return;`, so it already enforces the pause itself — the listener's copy is
    // defensive duplication with no observable behaviour of its own. Asserting
    // it would mean asserting an implementation detail that cannot be wrong.
    // What this test does cover is that a paused hero stays paused, whichever of
    // the two guards happens to be doing the work.
    const paused = fakeMQ(true);
    const hp = runHero(paused);
    hp.cv._cePaused = true;
    paused.flip(false);
    expect(hp.frames(), 'a hand-paused hero must stay paused').toBe(0);

    // Control: the same flip on an unpaused hero DOES restart it, so the
    // assertion above is about the pause and not about the flip being inert.
    const live = fakeMQ(true);
    const hl = runHero(live);
    live.flip(false);
    expect(hl.frames(), 'control: an unpaused hero restarts').toBeGreaterThan(0);
  });

  it('no longer captures the preference at init', () => {
    expect(SOURCE, 'the captured flag must be gone').not.toContain('heroRM');
    expect(SOURCE, 'the gates must call the live reader').toContain('if (!heroReduced()) heroTick++;');
    expect(SOURCE).toContain('if (!heroReduced() && !cv._cePaused) requestAnimationFrame(heroDraw);');
  });
});
