import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from './helpers/arc_harness.js';

// Work a student actually did must appear in the teacher report.
//
// WHY THIS EXISTS
// Transformations (L11-L13, goal:'match') are correctly EXCLUDED from "Levels
// solved": overlaying a ghost curve is not re-lighting a node, and folding the two
// objectives into one tally would misreport both. But excluding them from the COUNT
// had been implemented as excluding them from the REPORT entirely.
//
// Measured before the fix: a student who matched two Re-Target levels independently
// and made five attempts on a third produced a summary reading "Levels solved: 0 of
// 9" with "not started" on all nine lines, and a single binary 're-targeter' badge as
// the only evidence any of it happened. The panel's own caveat promises "observations
// of what this player did inside Arc City" -- a whole session rendered as nothing
// contradicts that promise, and a teacher scanning the panel between students would
// reasonably conclude the child had not engaged.
//
// They now get their own section and their own count, in the same never-a-score
// wording the rest of the panel uses, and stay hidden until touched so an untouched
// world does not pad the panel with "not started".
const TOOL = resolve(process.cwd(), 'stem_lab/stem_tool_arccity.js');

function core() {
  const src = readFileSync(TOOL, 'utf8');
  globalThis.window = globalThis.window || {};
  window.StemLab = { registerTool: () => {} };
  globalThis.StemLab = window.StemLab;
  // eslint-disable-next-line no-new-func
  new Function(src)();
  return window.ArcCityCore;
}

const C = core();
const TF_IDS = C.LEVELS.filter(l => l.goal === 'match').map(l => l.id);

// A student who ONLY worked in Transformations -- the case that reported nothing.
const transformOnly = {
  [TF_IDS[0]]: { solved: true, independent: true, shots: 1, misses: 0, params: {} },
  [TF_IDS[1]]: { solved: true, independent: true, shots: 2, misses: 1, params: {} },
  [TF_IDS[2]]: { solved: false, independent: false, shots: 0, misses: 5, params: {} },
};

describe('Arc City - the teacher summary reports transformation work', () => {
  it('there really are match levels to report (the premise)', () => {
    expect(TF_IDS.length, 'no goal:match levels -- this suite would be vacuous').toBeGreaterThan(0);
  });

  it('counts them separately, never inside "Levels solved"', () => {
    const s = C.teacherSummary(transformOnly, ['re-targeter']);
    // The node-lighting tally must stay honest: matching a ghost is a different goal.
    expect(s.nodesReLit, 'transformation work leaked into the node count').toBe(0);
    expect(s.transformationsMatched).toBe(2);
    expect(s.transformationsTotal).toBe(TF_IDS.length);
    // And none of the match levels may appear in the node-level list.
    expect(s.levels.filter(l => TF_IDS.includes(l.id))).toHaveLength(0);
  });

  it('records each level\'s own observations', () => {
    const s = C.teacherSummary(transformOnly, []);
    const rows = s.transformations;
    expect(rows).toHaveLength(TF_IDS.length);
    expect(rows[0]).toMatchObject({ status: 'completed', independent: true, shots: 1 });
    // The third was attempted but never matched -- "explored", not "not started".
    expect(rows[2].status).toBe('explored');
    expect(rows[2].exploredAdjustments).toBe(5);
  });

  it('the exported text names the work instead of showing a blank session', () => {
    const txt = C.teacherSummaryText(C.teacherSummary(transformOnly, ['re-targeter']));
    expect(txt).toMatch(/Transformations/);
    expect(txt).toMatch(/Matched: 2 of 3/);
    TF_IDS.forEach((id) => {
      const title = C.levelById(id).title;
      expect(txt, `${title} is missing from the export`).toContain(title);
    });
    // The separate-goal framing has to travel with the numbers, or the count invites
    // exactly the conflation the exclusion exists to prevent.
    expect(txt).toMatch(/not node-lighting|separate goal/i);
  });

  it('says nothing about transformations when the player never opened them', () => {
    const nodeOnly = { L1: { solved: true, independent: true, shots: 1, misses: 0, params: {} } };
    const txt = C.teacherSummaryText(C.teacherSummary(nodeOnly, []));
    expect(txt).not.toMatch(/Transformations/);
    // ...while the node-lighting half still reports normally.
    expect(txt).toMatch(/Levels solved: 1 of/);
  });

  it('keeps the non-removable caveat', () => {
    const txt = C.teacherSummaryText(C.teacherSummary(transformOnly, []));
    expect(txt).toContain('NOT a test score');
  });
});

describe('Arc City - the teacher PANEL shows the same thing', () => {
  it('renders a transformations section with its count', () => {
    const r = render({ view: 'teacher', byLevel: transformOnly, badges: ['re-targeter'] });
    expect(r.text).toMatch(/Transformations/);
    expect(r.text).toMatch(/Matched:\s*2\s*\/\s*3/);
    expect(r.text).toContain(C.levelById(TF_IDS[0]).title);
  });

  it('states the separate-goal framing on screen too', () => {
    const r = render({ view: 'teacher', byLevel: transformOnly, badges: [] });
    expect(r.text).toMatch(/counted separately|different goal/i);
  });

  it('spells out stars for a screen reader, not only as glyphs', () => {
    const r = render({ view: 'teacher', byLevel: transformOnly, badges: [] });
    // The glyph row is aria-hidden; the words must carry the same fact.
    expect(r.text).toMatch(/\d of 3 stars/);
  });

  it('omits the section entirely when untouched', () => {
    const r = render({ view: 'teacher', byLevel: { L1: { solved: true, shots: 1, misses: 0, params: {} } }, badges: [] });
    expect(r.text).not.toMatch(/Transformations/);
    // Vacuity guard: the panel must actually have rendered.
    expect(r.text).toMatch(/Progress summary/);
  });
});
