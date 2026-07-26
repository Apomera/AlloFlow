// Arc City — authoring + onboarding UX.
//
// Wave 2 of the visual/UX pass. Where arc_city_visual_ux.test.js pins what the
// BOARD shows, this pins how the player DRIVES it: pointer authoring on the
// parameter sliders, the co-highlight that binds a knob to its number in the
// equation (design §4.2, "mandatory"), the premise card, the hint ladder as an
// offer rather than an interruption (§8.3), and the badge case.

import { describe, it, expect } from 'vitest';
import { render, click } from './helpers/arc_harness.js';

const L3 = { levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [] };

// Drive a slider track by pointer. The harness has no layout, so the track's
// getBoundingClientRect is supplied here — the handler must read the rect off the
// element it was given rather than assuming anything about the page.
function dragTrack(state, name, fracs) {
  const r = render(state);
  const row = r.find('row-' + name);
  let track = null;
  (function walk(n) {
    if (track || n == null || n === false) return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n === 'object') { if (n.props && n.props.key === 'sld') { track = n; return; } if (n.children) n.children.forEach(walk); }
  })(row);
  expect(track, 'slider track for ' + name).not.toBeNull();
  expect(typeof track.props.onPointerDown, 'track is pointer-authorable').toBe('function');

  const moves = [];
  const el = {
    getBoundingClientRect: () => ({ left: 100, width: 200 }),
    focus() { },
    setPointerCapture() { },
    releasePointerCapture() { }
  };
  const before = r.reducers.length;
  track.props.onPointerDown({ currentTarget: el, clientX: 100 + fracs[0] * 200, pointerId: 1, preventDefault() { } });
  for (const f of fracs.slice(1)) moves.push(f);
  const queued = r.reducers.slice(before);
  let s = { _arccity: state };
  for (const fn of queued) s = fn(s) || s;
  return s._arccity;
}

describe('Arc City authoring — the sliders answer to a pointer', () => {
  it('pressing the track sets the value directly instead of forcing repeated +/− taps', () => {
    // h spans 0..10; pressing at the far right lands on the max, not one step up
    const after = dragTrack(L3, 'h', [1.0]);
    expect(after.byLevel.L3.params.h).toBe(10);
    const mid = dragTrack(L3, 'h', [0.5]);
    expect(mid.byLevel.L3.params.h).toBe(5);
  });

  it('clamps a press outside the track to the range ends', () => {
    expect(dragTrack(L3, 'h', [-3]).byLevel.L3.params.h).toBe(0);
    expect(dragTrack(L3, 'h', [4]).byLevel.L3.params.h).toBe(10);
  });

  it('lands on a discrete snap value for snapped params (the sine period)', () => {
    const L5 = { levelId: 'L5', byLevel: {}, tier: 'practice', fired: false, badges: [] };
    const after = dragTrack(L5, 'b', [1.0]);
    // period slider snaps by INDEX; the far end is the last snap value
    expect([1.5708, 1.2566, 1.0472, 0.7854]).toContain(after.byLevel.L5.params.b);
    expect(after.byLevel.L5.params.b).toBe(0.7854);
  });

  it('keeps the keyboard grammar — pointer is an additional way in, not a replacement', () => {
    const r = render(L3);
    const row = r.find('row-h');
    let track = null;
    (function walk(n) {
      if (track || n == null || n === false) return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (typeof n === 'object') { if (n.props && n.props.key === 'sld') { track = n; return; } if (n.children) n.children.forEach(walk); }
    })(row);
    expect(typeof track.props.onKeyDown).toBe('function');
    expect(track.props.role).toBe('slider');
    expect(track.props.tabIndex).toBe(0);
    expect(track.props['aria-valuenow']).toBe(5);
    expect(r.find('dec')).not.toBeNull();   // the steppers are still there
    expect(r.find('inc')).not.toBeNull();
  });
});

describe('Arc City authoring — co-highlighting binds the knob to the symbol (§4.2)', () => {
  it('touching a parameter marks its number in the equation and its row', () => {
    const after = dragTrack(L3, 'k', [0.5]);
    expect(after.touch.names).toEqual(['k']);
    const r = render(Object.assign({}, L3, { byLevel: after.byLevel, touch: after.touch }));
    const hot = r.find('k-hot' + after.touch.n);
    expect(hot, 'the touched number carries the pulse class + underline').not.toBeNull();
    expect(hot.props.className).toBe('arccity-eq-hot');
    expect(hot.props.style.borderBottom).toBeTruthy();   // static mark: survives reduced motion
    // the untouched siblings stay plain
    expect(r.find('a').props.className == null).toBe(true);
    // ...and the link reads back the other way, on the row
    expect(r.find('row-k').props.style.borderLeft).not.toMatch(/transparent/);
    expect(r.find('row-a').props.style.borderLeft).toMatch(/transparent/);
  });

  it('a board-handle drag marks BOTH parameters it moves', () => {
    const r = render(L3);
    const handle = r.find('vh');                          // the vertex grabber
    expect(handle).not.toBeNull();
    // Minimal SVG stand-ins for the two calls svgWorldFromEvent makes.
    const svgEl = {
      createSVGPoint: () => ({ x: 0, y: 0, matrixTransform: () => ({ x: 320, y: 210 }) }),
      getScreenCTM: () => ({ inverse: () => ({}) })
    };
    const el = { ownerSVGElement: svgEl, setPointerCapture() { }, releasePointerCapture() { } };
    const before = r.reducers.length;
    handle.props.onPointerDown({ currentTarget: el, pointerId: 1, clientX: 0, clientY: 0, preventDefault() { } });
    const move = new window.Event('pointermove');
    move.clientX = 0; move.clientY = 0;
    window.dispatchEvent(move);
    window.dispatchEvent(new window.Event('pointerup'));  // release the drag listeners
    const queued = r.reducers.slice(before);
    expect(queued.length, 'the drag wrote through setParamsMulti').toBeGreaterThan(0);
    let s = { _arccity: L3 };
    for (const fn of queued) s = fn(s) || s;
    // dragging the vertex moves h and k together, so BOTH light up in the equation
    expect(s._arccity.touch.names.slice().sort()).toEqual(['h', 'k']);
  });

  it('the pulse tick holds steady while one knob is dragged, and advances when the knob changes', () => {
    const one = dragTrack(L3, 'h', [0.4]);
    const again = dragTrack(Object.assign({}, L3, { byLevel: one.byLevel, touch: one.touch }), 'h', [0.6]);
    expect(again.touch.n).toBe(one.touch.n);              // same knob → no re-pulse (no flicker)
    const other = dragTrack(Object.assign({}, L3, { byLevel: again.byLevel, touch: again.touch }), 'k', [0.6]);
    expect(other.touch.n).toBe(again.touch.n + 1);        // new knob → one pulse
  });

  it('drops the highlight on a level switch (the parameter names differ per family)', () => {
    const after = click(Object.assign({}, L3, { touch: { names: ['h'], n: 4 } }), 'lvl-L1');
    expect(after.touch).toBeNull();
  });
});

describe('Arc City onboarding — the premise, told once', () => {
  it('shows the fiction on a first visit with a one-tap way in, and never blocks the board', () => {
    const r = render(L3);
    expect(r.find('intro')).not.toBeNull();
    expect(r.text).toMatch(/Arc City went dark/);
    expect(r.text).toMatch(/Lightwright/);
    expect(r.find('svg'), 'the board is live underneath — the card is not a gate').not.toBeNull();
    expect(r.find('fire')).not.toBeNull();
    // and it does not grab focus out of the host page on mount
    expect(r.find('intro-dismiss').props.autoFocus).toBeUndefined();
  });

  it('is at most 40 words, per the design brief', () => {
    const r = render(L3);
    const premise = r.find('itxt').children.join(' ');
    expect(premise.trim().split(/\s+/).length).toBeLessThanOrEqual(40);
  });

  it('dismisses for good once started', () => {
    expect(click(L3, 'intro-dismiss').introSeen).toBe(true);
    expect(render(Object.assign({}, L3, { introSeen: true })).find('intro')).toBeNull();
  });

  it('stays out of the teacher view', () => {
    expect(render(Object.assign({}, L3, { view: 'teacher' })).find('intro')).toBeNull();
  });
});

describe('Arc City — the hint is offered, not imposed (§8.3)', () => {
  const stuck = { levelId: 'L3', byLevel: { L3: { params: { a: 0, h: 5, k: 1 }, shots: 3, misses: 3 } }, tier: 'practice', fired: true, badges: [] };

  it('says nothing until the player has actually been stuck', () => {
    const early = render({ levelId: 'L3', byLevel: { L3: { params: { a: 0, h: 5, k: 1 }, shots: 1, misses: 1 } }, tier: 'practice', fired: true, badges: [] });
    expect(early.find('hintoffer')).toBeNull();
    expect(early.find('hint')).toBeNull();
  });

  it('then ASKS rather than handing over the answer', () => {
    const r = render(stuck);
    expect(r.find('hintoffer')).not.toBeNull();
    expect(r.text).toMatch(/Want a tip on which knob to turn\?/);
    expect(r.find('hint'), 'the tip itself is still closed').toBeNull();
  });

  it('"Show me" opens the tip and announces it', () => {
    const after = click(stuck, 'hintyes');
    expect(after.byLevel.L3.hintOpen).toBe(true);
    const r = render(Object.assign({}, stuck, { byLevel: after.byLevel }));
    expect(r.find('hint')).not.toBeNull();
    expect(r.find('hintoffer')).toBeNull();
    expect(r.text).toMatch(/raise k so the arc clears the wall/);
  });

  it('"Not yet" stands the offer down until the next try', () => {
    const declined = click(stuck, 'hintno');
    expect(declined.byLevel.L3.hintDismissedAt).toBe(3);
    const quiet = render(Object.assign({}, stuck, { byLevel: declined.byLevel }));
    expect(quiet.find('hintoffer'), 'not re-asked at the same miss count').toBeNull();
    // one more miss, and it offers again — never nagging, never abandoning
    const nextMiss = Object.assign({}, stuck, { byLevel: { L3: Object.assign({}, declined.byLevel.L3, { misses: 4 }) } });
    expect(render(nextMiss).find('hintoffer')).not.toBeNull();
  });

  it('a solved level is never nagged', () => {
    const solved = { levelId: 'L3', byLevel: { L3: { params: { a: -0.5, h: 5, k: 5 }, shots: 4, misses: 3, solved: true } }, tier: 'practice', fired: true, badges: [] };
    expect(render(solved).find('hintoffer')).toBeNull();
  });

  it('Reset returns the hint to its unasked state', () => {
    const after = click(Object.assign({}, stuck, { byLevel: { L3: Object.assign({}, stuck.byLevel.L3, { hintOpen: true, hintDismissedAt: 3 }) } }), 'reset');
    expect(after.byLevel.L3.hintOpen).toBe(false);
    expect(after.byLevel.L3.hintDismissedAt).toBeNull();
  });
});

describe('Arc City — the badge case shows what is still out there', () => {
  it('lists every badge, marks the earned ones, and says the count in text', () => {
    const r = render({ levelId: 'L1', byLevel: {}, tier: 'practice', fired: false, badges: ['first-light'] });
    const got = r.find('badge-first-light');
    const notYet = r.find('badge-wave-rider');
    expect(got).not.toBeNull();
    expect(notYet, 'unearned badges are visible, not hidden').not.toBeNull();
    expect(got.props['aria-label']).toMatch(/— earned$/);
    expect(notYet.props['aria-label']).toMatch(/not yet earned$/);
    expect(notYet.props.opacity == null).toBe(true);      // dimming is a style, not an attribute
    expect(notYet.props.style.opacity).toBeLessThan(1);
    expect(r.text).toMatch(/Badges earned — 1 \/ 13/);    // the count is words, never colour alone
  });

  it('keeps the full action description on the chip, so no badge reads as an ability claim', () => {
    const r = render({ levelId: 'L1', byLevel: {}, tier: 'practice', fired: false, badges: ['arc-architect'] });
    expect(r.find('badge-arc-architect').props.title).toMatch(/re-lit a node using a parabola/);
    expect(r.text).not.toMatch(/master|proficien/i);
  });
});
