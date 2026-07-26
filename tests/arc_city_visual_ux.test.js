// Arc City — visual/UX affordance pass.
//
// Pins the board-reading and flow affordances added on top of the existing
// gameplay: the gate APERTURE (the opening drawn as an object, not as negative
// space), the "would-have-gone" remainder past a block, the previous-attempt
// trail, the near-miss gap measurement, the unlit-node reticle, the two-column
// play layout, the city-restored tally, the Next-level hand-off, and the
// tool-scoped F/R shortcuts.
//
// Every one of these is DECORATIVE by contract — the screen-reader path already
// carries the same facts in text — so each test also asserts the element is
// aria-hidden, which is what keeps the second way to play (§8.2) quiet.

import { describe, it, expect } from 'vitest';
import { render, click } from './helpers/arc_harness.js';

function some(r, pred) {
  let found = false;
  (function walk(n) {
    if (found || n == null || n === false) return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n === 'object') { if (pred(n)) { found = true; return; } if (n.children) n.children.forEach(walk); }
  })(r.tree);
  return found;
}

describe('Arc City visuals — the board names its own objects', () => {
  it('draws each gate OPENING (aperture band + both lips), not just the two blocking bars', () => {
    const r = render({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    const slot = r.find('gateSlot0off');
    expect(slot).not.toBeNull();
    expect(slot.props['aria-hidden']).toBe('true');       // the numbers live in the coord list
    expect(Number(slot.props.height)).toBeGreaterThan(0); // a real band, not a zero-height rect
    expect(r.find('gateLip00off')).not.toBeNull();        // lo lip
    expect(r.find('gateLip01off')).not.toBeNull();        // hi lip
  });

  it('caps the wall at the height you have to clear', () => {
    const r = render({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    const cap = r.find('wallcap0');
    expect(cap).not.toBeNull();
    expect(cap.props['aria-hidden']).toBe('true');
    expect(cap.props.y1).toBe(cap.props.y2);              // horizontal — it IS the height line
  });

  it('marks the DARK node with a reticle, and drops it once the node is lit', () => {
    const dark = render({ levelId: 'L1', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(dark.find('nodereticle')).not.toBeNull();
    expect(dark.find('nodereticle').props['aria-hidden']).toBe('true');
    expect(dark.find('nodeticks')).not.toBeNull();
    const lit = render({ levelId: 'L1', byLevel: { L1: { params: { m: 0.5, b: 0 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [] });
    expect(lit.find('nodereticle')).toBeNull();           // the halo takes over
  });

  it('a legend keys the swatches to their meaning (colour is never the only signal)', () => {
    const r = render({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    const legend = r.find('legend');
    expect(legend).not.toBeNull();
    expect(legend.props['aria-hidden']).toBe('true');
    expect(r.text).toMatch(/gate — pass through the opening/);
    expect(r.text).toMatch(/wall — clear the top/);       // wall entry only where a wall exists
    const noWall = render({ levelId: 'L1', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(noWall.text).not.toMatch(/wall — clear the top/);
  });
});

describe('Arc City visuals — a shot shows what happened to it', () => {
  const blocked = { levelId: 'L3', byLevel: { L3: { params: { a: 0, h: 5, k: 1 }, shots: 1, misses: 1 } }, tier: 'practice', fired: true, badges: [] };

  it('a BLOCKED beam draws the path it was denied, past the block, faint and dashed', () => {
    const r = render(blocked);
    const rem = r.find('beam-remainder');
    expect(rem).not.toBeNull();
    expect(rem.props['aria-hidden']).toBe('true');
    expect(rem.props.strokeDasharray).toBeTruthy();       // dashed: never mistakable for the beam
    expect(rem.props.opacity).toBeLessThan(0.5);
    expect(r.find('kx1')).not.toBeNull();                 // the ✕ at the block still marks the spot
  });

  it('a clean HIT has no denied remainder (nothing was blocked)', () => {
    const hit = render({ levelId: 'L3', byLevel: { L3: { params: { a: -0.5, h: 5, k: 5 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [] });
    expect(hit.find('beam-remainder')).toBeNull();
  });

  it('a NEAR MISS draws and labels the actual shortest gap to the node', () => {
    // reaches the node's street (no gates on L1) but slides past it
    const r = render({ levelId: 'L1', byLevel: { L1: { params: { m: 0.2, b: 0 }, shots: 1, misses: 1 } }, tier: 'practice', fired: true, badges: [] });
    expect(r.find('missgap')).not.toBeNull();
    expect(r.find('missdot')).not.toBeNull();
    const label = r.find('misslabel');
    expect(label).not.toBeNull();
    expect(label.props['aria-hidden']).toBe('true');
    expect(r.text).toMatch(/units short/);
    // and the gap measurement agrees with the sentence the screen reader hears
    expect(r.text).toMatch(/missed it by/);
  });

  it('the beam carries a head, coloured by the outcome', () => {
    const hit = render({ levelId: 'L1', byLevel: { L1: { params: { m: 0.5, b: 0 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [] });
    const head = hit.find('beamhead-1');
    expect(head).not.toBeNull();
    expect(head.props['aria-hidden']).toBe('true');
    expect(head.props.className).toBe('arccity-beam-head');
  });
});

describe('Arc City visuals — the previous attempt stays visible', () => {
  it('Fire records this shot and steps the earlier one back, so the trail is never the current beam', () => {
    const first = click({ levelId: 'L1', byLevel: { L1: { params: { m: 0.2, b: 0 }, shots: 0, misses: 0 } }, tier: 'practice', fired: false, badges: [] }, 'fire');
    expect(first.byLevel.L1.lastShot).toEqual({ m: 0.2, b: 0 });
    expect(first.byLevel.L1.prevShot).toBeNull();          // nothing before the first shot

    const second = click(Object.assign({ levelId: 'L1', tier: 'practice', fired: true, badges: [] },
      { byLevel: { L1: Object.assign({}, first.byLevel.L1, { params: { m: 0.4, b: 0 } }) } }), 'fire');
    expect(second.byLevel.L1.lastShot).toEqual({ m: 0.4, b: 0 });
    expect(second.byLevel.L1.prevShot).toEqual({ m: 0.2, b: 0 });
  });

  it('draws the earlier attempt as a faint trail while you tune the next one', () => {
    const r = render({ levelId: 'L1', byLevel: { L1: { params: { m: 0.4, b: 0 }, shots: 1, misses: 1, lastShot: { m: 0.2, b: 0 } } }, tier: 'practice', fired: false, badges: [] });
    const trail = r.find('prevtrail');
    expect(trail).not.toBeNull();
    expect(trail.props['aria-hidden']).toBe('true');
    expect(trail.props.opacity).toBeLessThan(0.5);
  });

  it('suppresses the trail when the earlier attempt is identical (nothing to compare)', () => {
    const r = render({ levelId: 'L1', byLevel: { L1: { params: { m: 0.2, b: 0 }, shots: 1, misses: 1, lastShot: { m: 0.2, b: 0 } } }, tier: 'practice', fired: false, badges: [] });
    expect(r.find('prevtrail')).toBeNull();
  });

  it('stays off match levels, where the ghost is the reference and a third curve would only crowd it', () => {
    const r = render({ levelId: 'L11', byLevel: { L11: { params: { a: 0.3, h: 4, k: 2 }, shots: 1, misses: 1, lastShot: { a: 0.3, h: 2, k: 1 } } }, tier: 'practice', fired: false, badges: [] });
    expect(r.find('ghost-curve')).not.toBeNull();
    expect(r.find('prevtrail')).toBeNull();
  });

  it('Reset clears the trail memory along with the counters', () => {
    const after = click({ levelId: 'L1', byLevel: { L1: { params: { m: 1, b: 0 }, shots: 4, misses: 3, lastShot: { m: 0.9, b: 0 }, prevShot: { m: 0.8, b: 0 } } }, tier: 'practice', fired: false, badges: [] }, 'reset');
    expect(after.byLevel.L1.lastShot).toBeNull();
    expect(after.byLevel.L1.prevShot).toBeNull();
  });
});

describe('Arc City UX — layout, progress and forward motion', () => {
  it('play mounts a two-column grid with the board and the controls in separate columns', () => {
    const r = render({ levelId: 'L1', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.find('playgrid')).not.toBeNull();
    expect(r.find('playgrid').props.className).toBe('arc-play-grid');
    expect(r.find('boardcol')).not.toBeNull();
    expect(r.find('ctlcol')).not.toBeNull();
    // the board and the equation still both exist — the split moved them, not dropped them
    expect(r.find('svg')).not.toBeNull();
    expect(r.find('fire')).not.toBeNull();
  });

  it('counts the city back up as a collective tally, never a score for a person', () => {
    const r = render({ levelId: 'L2', byLevel: { L1: { solved: true } }, tier: 'practice', fired: false, badges: [] });
    const bar = r.find('ptrack');
    expect(bar).not.toBeNull();
    expect(bar.props.role).toBe('progressbar');
    expect(bar.props['aria-valuenow']).toBe(1);
    expect(r.text).toMatch(/nodes re-lit/);
    expect(r.text).not.toMatch(/skill|mastery|proficien/i);
  });

  it('offers the next level right where the player just solved one, and switches to it', () => {
    const solvedState = { levelId: 'L1', byLevel: { L1: { params: { m: 0.5, b: 0 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [] };
    const r = render(solvedState);
    expect(r.find('nextlevel')).not.toBeNull();
    expect(r.find('nextlevel').props['aria-label']).toMatch(/Cross-Street/);
    expect(click(solvedState, 'nextlevel').levelId).toBe('L2');
  });

  it('shows no next-level hand-off before the level is solved', () => {
    const r = render({ levelId: 'L1', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.find('nextlevel')).toBeNull();
  });

  it('tags each level chip with the maths it teaches (the titles alone are fiction)', () => {
    const r = render({ levelId: 'L1', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.text).toMatch(/absolute value/); // L4 Switchback
    expect(r.text).toMatch(/logarithm/);      // L8 Logarithm Heights
    expect(r.text).toMatch(/transform/);      // the Re-Target levels
    // the visual sub-label is aria-hidden, so the same fact rides the accessible name
    expect(r.find('fam').props['aria-hidden']).toBe('true');
    expect(r.find('lvl-L4').props['aria-label']).toMatch(/Switchback — absolute value/);
    expect(r.find('lvl-L11').props['aria-label']).toMatch(/— transform/);
  });
});

describe('Arc City UX — tool-scoped keyboard shortcuts', () => {
  function press(state, key, target) {
    const r = render(state);
    const root = r.tree;
    expect(typeof root.props.onKeyDown).toBe('function');
    const before = r.reducers.length;
    root.props.onKeyDown({ key, target: target || {}, preventDefault() { } });
    const queued = r.reducers.slice(before);
    if (!queued.length) return null;
    let s = { _arccity: state };
    for (const fn of queued) s = fn(s) || s;
    return s._arccity;
  }
  const base = { levelId: 'L1', byLevel: { L1: { params: { m: 0.5, b: 0 }, shots: 0, misses: 0 } }, tier: 'practice', fired: false, badges: [] };

  it('F fires the beam', () => {
    const after = press(base, 'f');
    expect(after.fired).toBe(true);
    expect(after.byLevel.L1.shots).toBe(1);
  });

  it('R resets the level', () => {
    const after = press({ levelId: 'L1', byLevel: { L1: { params: { m: 1.4, b: 0 }, shots: 3, misses: 3 } }, tier: 'practice', fired: true, badges: [] }, 'r');
    expect(after.byLevel.L1.shots).toBe(0);
  });

  it('never steals a keystroke from a text field', () => {
    expect(press(base, 'f', { tagName: 'INPUT' })).toBeNull();
    expect(press(base, 'r', { tagName: 'TEXTAREA' })).toBeNull();
    expect(press(base, 'f', { isContentEditable: true })).toBeNull();
  });

  it('is not bound in the teacher view (nothing to fire there)', () => {
    const r = render({ levelId: 'L1', byLevel: {}, view: 'teacher', tier: 'practice', fired: false, badges: [] });
    expect(r.tree.props.onKeyDown).toBeNull();
  });
});
