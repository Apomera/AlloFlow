// Particle Lab 3D — reduced motion must take effect without a reload.
//
// THE DEFECT THIS PINS
// The WebGL setup effect read prefers-reduced-motion ONCE, into a local, and its
// deps are [ready, contextLost, preset, count, particleDiameter, massRatioB,
// resetKey, quality] — the motion preference is not among them. That captured
// boolean then fed 31 uses inside the animation frame loop: star rotation,
// beacon pulsing, holo-label bobbing, light flicker, energy-ring rotation,
// camera auto-rotate, flash events, flow trails.
//
// So a vestibular-sensitive learner who enabled reduced motion mid-lesson kept
// full animation until they changed quality or reloaded — exactly the moment
// they cannot afford it. Same shape and nearly the same count as magnetism
// @c69412cf9.
//
// WHAT IS EXERCISED
// The subscription is lifted out of the shipped source and run against a fake
// MediaQueryList, so the assertions are about the real code rather than a
// restatement of it. The frame-loop side is covered by a source guard: the
// captured local must be gone, because a test cannot easily drive 31 sites
// inside a Three.js render loop, and saying so is better than implying coverage
// this does not have.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync('stem_lab/stem_tool_particlelab3d.js', 'utf8');

/** A MediaQueryList that records its listeners and can flip. */
function fakeQuery(initial, { modern = true, legacy = false } = {}) {
  const q = {
    matches: initial,
    listeners: [],
    removed: 0,
  };
  if (modern) {
    q.addEventListener = (type, fn) => { if (type === 'change') q.listeners.push(fn); };
    q.removeEventListener = (type, fn) => {
      const i = q.listeners.indexOf(fn);
      if (i >= 0) { q.listeners.splice(i, 1); q.removed += 1; }
    };
  }
  if (legacy) {
    q.addListener = (fn) => q.listeners.push(fn);
    q.removeListener = (fn) => {
      const i = q.listeners.indexOf(fn);
      if (i >= 0) { q.listeners.splice(i, 1); q.removed += 1; }
    };
  }
  q.flip = (next) => {
    q.matches = next;
    for (const fn of [...q.listeners]) fn({ matches: next });
  };
  return q;
}

/** Lift the shipped subscription effect body and run it. */
function runSubscription(query) {
  const marker = "        var query = null;\n";
  const at = SOURCE.indexOf(marker);
  expect(at, 'the subscription effect is still in the source').toBeGreaterThan(-1);
  const end = SOURCE.indexOf('      }, []);', at);
  expect(end, 'its effect body is still bounded').toBeGreaterThan(at);
  const body = SOURCE.slice(at, end);

  const seen = [];
  const fn = new Function('window', 'setPrefersReducedMotion', body + '\n');
  const cleanup = fn({ matchMedia: () => query }, (v) => seen.push(v));
  return { seen, cleanup };
}

describe('Particle Lab 3D follows the reduced-motion preference live', () => {
  it('re-reads the preference on mount', () => {
    // It can flip between the initial render and the effect running.
    const q = fakeQuery(true);
    const { seen } = runSubscription(q);
    expect(seen[0], 'mount must sync from the query, not trust the first render').toBe(true);
  });

  it('reports a mid-session change without a reload', () => {
    const q = fakeQuery(false);
    const { seen } = runSubscription(q);
    expect(q.listeners, 'it must actually subscribe').toHaveLength(1);

    q.flip(true);
    expect(seen.at(-1), 'THE DEFECT: enabling reduced motion did nothing until reload').toBe(true);

    q.flip(false);
    expect(seen.at(-1), 'and turning it back off must restore motion').toBe(false);
  });

  it('subscribes through addListener when addEventListener is absent', () => {
    // Safari < 14 and the older classroom iPads have only the deprecated one on
    // a MediaQueryList. Without the fallback those devices never update.
    const q = fakeQuery(false, { modern: false, legacy: true });
    const { seen } = runSubscription(q);
    expect(q.listeners, 'legacy path must still subscribe').toHaveLength(1);
    q.flip(true);
    expect(seen.at(-1)).toBe(true);
  });

  it('removes its listener on unmount', () => {
    // A module-scoped listener survives every tool switch; without cleanup each
    // mount leaves another dead handler behind.
    const q = fakeQuery(false);
    const { cleanup } = runSubscription(q);
    expect(typeof cleanup, 'the effect must return a cleanup').toBe('function');
    cleanup();
    expect(q.listeners, 'listener still attached after unmount').toHaveLength(0);
    expect(q.removed).toBe(1);
  });

  it('survives a browser with no matchMedia at all', () => {
    const marker = "        var query = null;\n";
    const at = SOURCE.indexOf(marker);
    const end = SOURCE.indexOf('      }, []);', at);
    const fn = new Function('window', 'setPrefersReducedMotion', SOURCE.slice(at, end) + '\n');
    expect(() => fn({}, () => {})).not.toThrow();
  });

  it('no longer captures the preference once per scene build', () => {
    // The frame loop has ~28 gates; driving them would mean standing up a real
    // Three.js scene, so this guards the shape instead. If the captured read
    // comes back, every animation goes stale again and the runtime tests above
    // would still pass, because they only exercise the subscription.
    //
    // The gates deliberately keep the name `reducedMotion`: a previous session
    // pinned three of them by their exact text in
    // tests/particle_lab_3d_accessibility.test.js after a pixel probe found ~20%
    // of the PAUSED chamber still moving. Renaming the variable would break
    // those pins for no benefit, so the local is REASSIGNED per frame instead.
    expect(SOURCE, 'the build-time capture must be gone')
      .not.toMatch(/var\s+reducedMotion\s*=\s*!!\(window\.matchMedia/);
    expect(SOURCE, 'the frame loop must refresh the local from the live ref')
      .toContain('reducedMotion = !!motionRef.current;');
    expect(SOURCE, 'and the ref must track the subscribed state')
      .toContain('motionRef.current = prefersReducedMotion;');
  });

  it('refreshes inside the scene loop, not merely where it starts', () => {
    // There are two `function animate(now) {` in this file; only the first
    // carries the motion gates (the second is the flat-2D fallback). The refresh
    // has to sit INSIDE that loop body, so it runs every frame. A refresh placed
    // just above the loop would run once and be exactly the original defect.
    //
    // Checking only that a refresh appears somewhere after the loop opens is NOT
    // enough: hoisting a copy above the loop leaves the inner one in place, so
    // such a check passes while the value is captured once. Mutation-verified —
    // that exact hoist survived the first version of this test. So: brace-match
    // the loop body and require the refresh to be INSIDE it.
    const first = SOURCE.indexOf('function animate(now) {');
    expect(first, 'the scene loop is still there').toBeGreaterThan(-1);

    const open = SOURCE.indexOf('{', first);
    let depth = 0;
    let close = -1;
    for (let i = open; i < SOURCE.length; i += 1) {
      const ch = SOURCE[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') { depth -= 1; if (depth === 0) { close = i; break; } }
    }
    expect(close, 'the loop body is brace balanced').toBeGreaterThan(open);
    const body = SOURCE.slice(open, close);

    expect(body, 'the refresh must run INSIDE the frame, not once above it')
      .toContain('reducedMotion = !!motionRef.current;');
    // …and before the first gate it protects.
    expect(body.indexOf('var pulse = reducedMotion ?'))
      .toBeGreaterThan(body.indexOf('reducedMotion = !!motionRef.current;'));
    // Exactly one refresh inside the loop: a second would be dead weight and a
    // sign someone hoisted a copy and left both.
    expect(body.split('reducedMotion = !!motionRef.current;').length - 1).toBe(1);

    // And the decisive one: NOTHING may refresh the local between the effect's
    // declaration and the loop. A hoisted copy there runs once per scene build,
    // which is the original defect, and it leaves the in-loop refresh untouched
    // so every check above still passes. This is the assertion that fails.
    const decl = SOURCE.indexOf('var reducedMotion = !!motionRef.current;');
    expect(decl, 'the effect-scope declaration is still there').toBeGreaterThan(-1);
    const between = SOURCE.slice(decl + 'var reducedMotion = !!motionRef.current;'.length, first);
    expect(between, 'a refresh above the loop runs once per scene build')
      .not.toContain('reducedMotion = !!motionRef.current;');
  });

  it('keeps the render-scope read, which was never stale', () => {
    // The read in `render:` re-runs every render, so it is not part of the
    // defect. It is now the useState initialiser, and the state is what the ref
    // mirrors.
    expect(SOURCE).toMatch(/var _motionState = useState\(function \(\) \{/);
    expect(SOURCE).toContain('var prefersReducedMotion = _motionState[0], setPrefersReducedMotion = _motionState[1];');
  });
});
