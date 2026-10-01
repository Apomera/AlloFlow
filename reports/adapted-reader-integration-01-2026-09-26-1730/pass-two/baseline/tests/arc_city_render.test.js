// Arc City — Gauntlet (L10) STATEFUL render/interaction tests.
//
// Covers the behaviour the pure-core golden master can't: the tier-lock UI swap,
// the Next / Restart / Fire handlers, the Grand Tour award (+ its no-re-award
// guard), and level-switch persistence. Driven through the mock-React harness so
// real onClick handlers run and their setToolData reducers are folded into state.
//
// The gauntlet keys its per-stage clone state under a fixed 'G-' namespace
// (decoupled from the gauntlet level id), and now sequences 7 families — the 7th
// stage being L9, the cubic.

import { describe, it, expect } from 'vitest';
import { render, click } from './helpers/arc_harness.js';

const ORDER = ['L1', 'L3', 'L4', 'L5', 'L7', 'L8', 'L9']; // 7 families; L9 = cubic, last
const LAST = ORDER.length - 1;
// The gauntlet now sequences only SOLVED families and unlocks after ≥4; this "all
// families cleared" history populates it to the full 7-stage run for these tests.
const SOLVED = { L1: { solved: true }, L3: { solved: true }, L4: { solved: true }, L5: { solved: true }, L7: { solved: true }, L8: { solved: true }, L9: { solved: true } };

describe('Arc City render — Gauntlet tier lock (proving ground)', () => {
  it('LOCKS the tier in the gauntlet: tier picker is swapped for a lock notice, preview hidden even if saved tier is practice', () => {
    const r = render({ levelId: 'L10', byLevel: SOLVED, tier: 'practice', fired: false, badges: [] });
    expect(r.find('tier-guided')).toBeNull();      // tier picker gone
    expect(r.find('tier-practice')).toBeNull();
    expect(r.find('gtierlock')).not.toBeNull();     // lock notice present
    expect(r.text).toMatch(/Preview hidden/);       // forced 'independent' → hidden until Fire
  });

  it('a NORMAL level keeps the tier picker and shows the live preview', () => {
    const r = render({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.find('tier-guided')).not.toBeNull();
    expect(r.text).not.toMatch(/Preview hidden/);
  });

  it('with too few solved families, the Gauntlet shows a gentle note instead of a board (no crash)', () => {
    const r = render({ levelId: 'L10', byLevel: {}, tier: 'independent', fired: false, badges: [] });
    expect(r.text).toMatch(/replays the ones you/); // "solve a few families first" note
    expect(r.find('svg')).toBeNull();               // no board built
    expect(r.find('fire')).toBeNull();              // no controls built
  });
});

describe('Arc City render — Gauntlet Next / Restart handlers', () => {
  it('Next challenge advances idx by one and freezes the run order', () => {
    const next = click(
      { levelId: 'L10', byLevel: Object.assign({}, SOLVED, { 'G-L1': { solved: true, params: {} } }), gauntlet: { order: ORDER, idx: 0 }, tier: 'independent', fired: true, badges: [] },
      'gnext'
    );
    expect(next.gauntlet.idx).toBe(1);
    expect(next.gauntlet.order).toEqual(ORDER);
    expect(next.fired).toBe(false);
  });

  it('Restart clears ALL G-* clone state, resets idx to 0, and re-derives the order from standalone history (clones never skew it)', () => {
    const before = {
      levelId: 'L10',
      byLevel: {
        // a genuine completed run: every stage clone solved (so the Restart control,
        // which shows only at completion, is present) ...
        'G-L1': { solved: true, params: {} }, 'G-L3': { solved: true, params: {} },
        'G-L4': { solved: true, params: {} }, 'G-L5': { solved: true, params: {} },
        'G-L7': { solved: true, params: {} }, 'G-L8': { solved: true, params: {} },
        'G-L9': { solved: true, params: {} },
        // ... plus ≥4 solved standalone families that survive the restart and drive re-ranking
        L1: { solved: true }, L4: { solved: true }, L5: { solved: true }, L3: { solved: true, independent: true }
      },
      gauntlet: { order: ORDER, idx: LAST }, tier: 'independent', fired: true, badges: ['grand-tour']
    };
    const after = click(before, 'grestart');
    expect(Object.keys(after.byLevel).some(k => k.indexOf('G-') === 0)).toBe(false); // clones cleared
    expect(after.gauntlet.idx).toBe(0);
    expect(after.byLevel.L3).toBeDefined();                 // standalone history untouched
    expect(after.gauntlet.order[after.gauntlet.order.length - 1]).toBe('L3'); // parabola mastered → last
    expect(after.fired).toBe(false);
  });
});

describe('Arc City render — Grand Tour award through the Fire handler', () => {
  it('awards Grand Tour by FIRING a solving shot on the LAST stage (cubic), and does NOT re-award it on a re-fire', () => {
    // last stage = L9 (cubic); solving params a=0.12,p=2.5,q=6.5,k=4
    const atLast = {
      levelId: 'L10',
      byLevel: { 'G-L9': { params: { a: 0.12, p: 2.5, q: 6.5, k: 4 }, shots: 0, solved: false, misses: 0 } },
      gauntlet: { order: ORDER, idx: LAST }, tier: 'independent', fired: false, badges: []
    };
    const fired = click(atLast, 'fire');
    expect(fired.badges).toContain('grand-tour');

    const refired = click(Object.assign({}, fired, { fired: false }), 'fire');
    expect(refired.badges.filter(b => b === 'grand-tour').length).toBe(1); // earned once, never duplicated
  });

  it('does NOT award Grand Tour on a non-final stage solve', () => {
    const atFirst = {
      levelId: 'L10',
      byLevel: Object.assign({}, SOLVED, { 'G-L1': { params: { m: 0.5, b: 0 }, shots: 0, solved: false, misses: 0 } }),
      gauntlet: { order: ORDER, idx: 0 }, tier: 'independent', fired: false, badges: []
    };
    const fired = click(atFirst, 'fire');
    expect(fired.badges).not.toContain('grand-tour');
  });
});

describe('Arc City render — neon-city visual layer (decorative, a11y-safe)', () => {
  // helper: does any node in the tree satisfy pred?
  function some(r, pred) {
    let found = false;
    (function walk(n) {
      if (found || n == null || n === false) return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (typeof n === 'object') { if (pred(n)) { found = true; return; } if (n.children) n.children.forEach(walk); }
    })(r.tree);
    return found;
  }

  it('defines glow filters + a theme sky, and lays a backdrop behind the board (light theme)', () => {
    const r = render({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(some(r, n => n.props && n.props.id === 'arc-glow')).toBe(true);        // glow filter defined
    expect(some(r, n => n.props && n.props.id === 'arc-glow-strong')).toBe(true);
    expect(r.find('backdrop')).not.toBeNull();                                     // sky backdrop present
    // glow is applied to the gates (additive halo — never lowers their tested contrast)
    expect(some(r, n => n.props && /^gateLo0/.test(n.props.key || '') && n.props.filter === 'url(#arc-glow)')).toBe(true);
  });

  it('decorative layers are aria-hidden (no SR noise)', () => {
    const r = render({ levelId: 'L3', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.find('backdrop').props['aria-hidden']).toBe('true');
  });

  it('a lit node gets a halo (and the unlit board does not)', () => {
    const lit = render({ levelId: 'L1', byLevel: { L1: { params: { m: 0.5, b: 0 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [] });
    expect(lit.find('nodehalo')).not.toBeNull();
    const unlit = render({ levelId: 'L1', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(unlit.find('nodehalo')).toBeNull();
  });

  it('FIRING draws the beam (dash animation class) and a HIT throws the full burst; a miss throws none', () => {
    const hit = render({ levelId: 'L1', byLevel: { L1: { params: { m: 0.5, b: 0 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [] });
    expect(some(hit, n => n.props && typeof n.props.key === 'string' && n.props.key.indexOf('beam-') === 0 && n.props.className === 'arccity-beam-draw')).toBe(true);
    expect(some(hit, n => n.props && /^burst-/.test(n.props.key || ''))).toBe(true);   // keyed by shot so it replays each hit
    expect(some(hit, n => n.props && /^sparks-/.test(n.props.key || ''))).toBe(true);
    const miss = render({ levelId: 'L1', byLevel: { L1: { params: { m: 1.5, b: 0 }, shots: 1 } }, tier: 'practice', fired: true, badges: [] }); // wrong SLOPE (b is locked)
    expect(some(miss, n => n.props && /^burst-/.test(n.props.key || ''))).toBe(false);
  });

  it('a HIT delivers the visceral payoff: node power-on punch, shockwave, embers, an escalating word, and gates igniting green', () => {
    const hit = render({ levelId: 'L3', byLevel: { L3: { params: { a: -0.5, h: 5, k: 5 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [] });
    expect(hit.find('node-on')).not.toBeNull();
    expect(hit.find('node-on').props.className).toMatch(/arccity-node-lit/);          // power-on punch class
    expect(some(hit, n => n.props && /^shock-/.test(n.props.key || ''))).toBe(true);  // shockwave
    expect(hit.find('ember0')).not.toBeNull();                                        // rising embers
    expect(hit.text).toMatch(/FIRST TRY!/);                                           // escalating action-praise
    // the threaded gates IGNITE green (success-green fill + flash class) — ties the payoff to the math
    expect(some(hit, n => n.props && /^gateLo0on/.test(n.props.key || '') && n.props.fill && n.props.className === 'arccity-gate-lit')).toBe(true);
    // a 3-shot solve celebrates differently, and a miss has neither shockwave nor a word
    const h3 = render({ levelId: 'L3', byLevel: { L3: { params: { a: -0.5, h: 5, k: 5 }, shots: 3, solved: true } }, tier: 'practice', fired: true, badges: [] });
    expect(h3.text).toMatch(/NAILED IT!/);
    const miss = render({ levelId: 'L3', byLevel: { L3: { params: { a: 0, h: 5, k: 1 }, shots: 1 } }, tier: 'practice', fired: true, badges: [] });
    expect(some(miss, n => n.props && /^shock-/.test(n.props.key || ''))).toBe(false);
    expect(miss.text).not.toMatch(/FIRST TRY!|NAILED IT!|LIT!/);
  });
});

describe('Arc City render — Sine Boulevard §3.1 affordances', () => {
  it('practice tier shows the crest-grabber handle + ghost target dots + period-framed label', () => {
    const r = render({ levelId: 'L5', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.find('sh')).not.toBeNull();        // crest-grabber handle
    expect(r.find('ghost-0')).not.toBeNull();   // ghost target dot at a window centre
    expect(r.text).toMatch(/one full wave every N units/); // the b slider is framed as period
  });

  it('hidden-preview tiers do NOT show the crest handle (the anti-fishing integrity gate)', () => {
    const r = render({ levelId: 'L5', byLevel: {}, tier: 'independent', fired: false, badges: [] });
    expect(r.find('sh')).toBeNull();
    expect(r.find('ghost-0')).toBeNull();
  });

  it('the inline equation annotates the whole-number period (bridges the symbolic b to the period slider)', () => {
    const r = render({ levelId: 'L5', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    expect(r.text).toMatch(/\(period 4\)/); // default b = 2π/4
  });
});

describe('Arc City render — Transformations world (ghost curve + anti-fishing gate)', () => {
  function some(r, pred) {
    let found = false;
    (function walk(n) { if (found || n == null || n === false) return; if (Array.isArray(n)) { n.forEach(walk); return; } if (typeof n === 'object') { if (pred(n)) { found = true; return; } if (n.children) n.children.forEach(walk); } })(r.tree);
    return found;
  }
  it('practice tier draws the ghost target curve and suppresses the node (no node to light)', () => {
    const r = render({ levelId: 'L11', byLevel: {}, tier: 'practice', fired: false, badges: [] });
    const ghost = r.find('ghost-curve');
    expect(ghost).not.toBeNull();
    expect(ghost.props['aria-hidden']).toBe('true');
    expect(some(r, n => n.props && typeof n.props.key === 'string' && n.props.key.indexOf('node-') === 0)).toBe(false); // node suppressed
    expect(r.text).toMatch(/match the ghost/i);        // board readout for SR
    expect(r.text).toMatch(/a.*is fixed this level/i); // names the locked param
    // the ghost is visually DISTINCT from the player's own preview (dash + opacity)
    const preview = r.find('preview');
    expect(ghost.props.strokeDasharray).not.toEqual(preview.props.strokeDasharray);
    expect(ghost.props.opacity).toBeGreaterThanOrEqual(0.8); // clears WCAG 3:1 for a graphical object on light
  });
  it('a match HIT celebrates with the goal-appropriate word (MATCHED!)', () => {
    const r = render({ levelId: 'L11', byLevel: { L11: { params: { a: 0.3, h: 5, k: 3 }, shots: 1, solved: true } }, tier: 'practice', fired: true, badges: [] });
    expect(r.text).toMatch(/MATCHED!/);
  });
  it('hidden-preview tiers HIDE the ghost until Fire (same anti-fishing gate as the player curve)', () => {
    const pre = render({ levelId: 'L11', byLevel: {}, tier: 'independent', fired: false, badges: [] });
    expect(pre.find('ghost-curve')).toBeNull();
    expect(pre.text).toMatch(/Preview hidden/);
    const post = render({ levelId: 'L11', byLevel: {}, tier: 'independent', fired: true, badges: [] });
    expect(post.find('ghost-curve')).not.toBeNull(); // revealed after Fire
  });
});

describe('Arc City render — mastery stars', () => {
  it('a solved level shows a star row + a star count in its aria-label', () => {
    const r = render({ levelId: 'L3', byLevel: { L1: { solved: true, independent: true, flawless: true } }, tier: 'practice', fired: false, badges: [] });
    expect(r.find('lvl-L1').props['aria-label']).toMatch(/3 of 3 stars/);
    expect(r.find('stars')).not.toBeNull(); // decorative row (aria-hidden; the count lives in the label)
  });

  it('an independent FIRST-TRY solve flags flawless (3★); a miss-then-solve does not; Reset clears counters but keeps achievements', () => {
    const ace = click({ levelId: 'L1', byLevel: { L1: { params: { m: 0.5, b: 0 }, shots: 0, solved: false, misses: 0 } }, tier: 'independent', fired: false, badges: [] }, 'fire');
    expect(ace.byLevel.L1.solved).toBe(true);
    expect(ace.byLevel.L1.independent).toBe(true);
    expect(ace.byLevel.L1.flawless).toBe(true);   // → 3 stars

    const capped = click({ levelId: 'L1', byLevel: { L1: { params: { m: 0.5, b: 0 }, shots: 1, solved: false, misses: 1 } }, tier: 'independent', fired: false, badges: [] }, 'fire');
    expect(capped.byLevel.L1.flawless).toBeFalsy(); // missed first → caps at 2 stars

    const reset = click({ levelId: 'L1', byLevel: { L1: { params: { m: 1, b: 1 }, shots: 5, misses: 3, solved: true, independent: true, flawless: true } }, tier: 'practice', fired: false, badges: [] }, 'reset');
    expect(reset.byLevel.L1.shots).toBe(0);
    expect(reset.byLevel.L1.misses).toBe(0);        // fresh attempt → can try for 3★ again
    expect(reset.byLevel.L1.flawless).toBe(true);   // earned achievements never regress
    expect(reset.byLevel.L1.solved).toBe(true);
  });
});

describe('Arc City render — leaving/returning preserves the run (no silent data loss)', () => {
  it('switching to a normal level mid-run keeps the gauntlet state; returning resumes at the same stage', () => {
    const mid = {
      levelId: 'L10',
      byLevel: Object.assign({}, SOLVED, { 'G-L1': { solved: true, params: {} } }), // ≥4 families solved ⇒ L10 unlocked
      gauntlet: { order: ORDER, idx: 1 }, tier: 'independent', fired: false, badges: []
    };
    const left = click(mid, 'lvl-L1');
    expect(left.levelId).toBe('L1');
    expect(left.gauntlet.idx).toBe(1);           // gauntlet untouched while away
    expect(left.gauntlet.order).toEqual(ORDER);

    const back = click(left, 'lvl-L10');
    expect(back.levelId).toBe('L10');
    expect(back.gauntlet.idx).toBe(1);           // resumes, does not restart
  });
});
