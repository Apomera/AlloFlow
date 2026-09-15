import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The Gauntlet must not claim families it never asked the player to use.
//
// WHY THIS EXISTS
// Five surfaces said the capstone covers "every function family": the badge
// label, the L10 hint, the screen-reader board description, the spoken
// completion line, and the on-screen banner. The RUN does not.
//
// gauntletOrder() deliberately sequences only the families the player has
// already solved standalone, and the unlock gate is GAUNTLET_MIN_FAMILIES = 4 of
// 7 -- exactly so a core-path student can reach a right-sized capstone without
// first clearing the above-grade reach levels (exponential, logarithm, cubic).
// That design is good. But it means a student who solves L1-L6 and skips the
// reach levels completes a genuine FOUR-family run and is then told they used
// "every function family", and earns a badge saying so. A teacher reading that
// badge as evidence would be misled about three families the child never met.
//
// The award logic was right; the wording was the overclaim. Every surface now
// scopes the claim to what the player had solved.
const TOOL = resolve(process.cwd(), 'stem_lab/stem_tool_arccity.js');

function core() {
  globalThis.window = globalThis.window || {};
  window.StemLab = { registerTool: () => {} };
  globalThis.StemLab = window.StemLab;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(TOOL, 'utf8'))();
  return window.ArcCityCore;
}
const C = core();
const SRC = readFileSync(TOOL, 'utf8');
const STAGES = C.levelById('L10').stages;

const solved = (ids) => ids.reduce((o, id) => {
  o[id] = { solved: true, independent: true, shots: 1, misses: 0, params: {} };
  return o;
}, {});

describe('Arc City - a core-path run really is smaller than "every family"', () => {
  it('the premise: skipping the reach levels still completes a Gauntlet', () => {
    const byLevel = solved(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
    const order = C.gauntletOrder(byLevel, STAGES);
    expect(order.length, 'a core-path student must still get a run').toBeGreaterThan(0);
    expect(order.length, 'the run must be SMALLER than every stage, or there is nothing to overclaim')
      .toBeLessThan(STAGES.length);
    // And that short run counts as complete.
    const withClones = Object.assign({}, byLevel);
    order.forEach((sid) => { withClones['G-' + sid] = { solved: true }; });
    expect(C.gauntletComplete(withClones, order)).toBe(true);
  });

  it('the families such a run covers are a strict subset of the tool\'s families', () => {
    const byLevel = solved(['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
    const covered = C.gauntletOrder(byLevel, STAGES).map((id) => C.levelById(id).family);
    const all = [...new Set(C.LEVELS.filter(l => l.family !== 'gauntlet' && l.goal !== 'match').map(l => l.family))];
    const missing = all.filter(f => !covered.includes(f));
    expect(missing.length, 'nothing is missing -- this suite would be proving nothing').toBeGreaterThan(0);
    // Named so a future reader knows which families the wording must not claim.
    expect(missing).toEqual(expect.arrayContaining(['exp', 'log', 'poly']));
  });
});

describe('Arc City - every Gauntlet surface scopes its claim', () => {
  const unqualified = /every function family(?!\s+you)/i;

  it('the badge label does not promise families the run may skip', () => {
    const badge = C.BADGES.find(b => b.id === 'grand-tour');
    expect(badge, 'grand-tour badge missing -- vacuous').toBeTruthy();
    expect(badge.label).not.toMatch(unqualified);
    expect(badge.label).toMatch(/you had solved|you have solved/i);
  });

  it('the screen-reader capstone description scopes it', () => {
    const s = C.describeBoard(C.levelById('L10'));
    expect(s).not.toMatch(unqualified);
    expect(s).toMatch(/you have solved|you had solved|already solved/i);
  });

  it('the level hint scopes it and points at how to widen the run', () => {
    const hint = C.levelById('L10').hint;
    expect(hint).not.toMatch(unqualified);
    expect(hint).toMatch(/already solved/i);
    // A student who wants the full tour should be told how to get it.
    expect(hint).toMatch(/exponential|logarithm|cubic/i);
  });

  it('no shipped string anywhere makes the unqualified claim', () => {
    // Catches the completion announcement and the on-screen banner too, and any
    // new surface someone adds later.
    const code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const hits = code.split('\n').filter(l => unqualified.test(l));
    expect(hits, `unqualified "every function family" still shipped:\n${hits.join('\n')}`).toHaveLength(0);
  });

  it('the scoped wording is actually present on several surfaces (not just deleted)', () => {
    const code = SRC.replace(/^\s*\/\/.*$/gm, '');
    const scoped = (code.match(/function family (?:you|YOU)[^']*/g) || []).length;
    expect(scoped, 'the claim was removed rather than corrected').toBeGreaterThanOrEqual(3);
  });
});
