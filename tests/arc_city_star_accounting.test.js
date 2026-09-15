import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// A star count must never contradict the row it sits in.
//
// WHY THIS EXISTS
// levelStars() read `if (st.flawless) return 3;` with no independence check,
// while the legend it feeds defines the third star as "first try, preview-hidden"
// and the code comment above it says "...AND aced it". The write path only ever
// sets `flawless` on an independent solve, so ordinary play never diverges -- but
// levelStars reads a SAVED RECORD, and a corrupted or cross-version save carrying
// flawless WITHOUT independent produced a teacher row asserting both
// "independent: false" and "stars: 3" at once, against a legend that says three
// stars REQUIRES preview-hidden. Two derivations of one claim, disagreeing in the
// one place a teacher reads it.
//
// Same corrupted-save input class as arc_city_saved_record_integrity.test.js.
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

describe('Arc City - stars agree with the legend that explains them', () => {
  it('awards the ladder as documented', () => {
    expect(C.levelStars({ solved: false })).toBe(0);
    expect(C.levelStars({ solved: true })).toBe(1);
    expect(C.levelStars({ solved: true, independent: true })).toBe(2);
    expect(C.levelStars({ solved: true, independent: true, flawless: true })).toBe(3);
  });

  it('never gives the third star without the second', () => {
    // The legend's words are the contract: "first try, preview-hidden".
    const stars = C.levelStars({ solved: true, flawless: true });
    expect(stars, 'flawless alone must not reach 3 -- the legend requires preview-hidden').toBeLessThan(3);
  });

  it('an unsolved record scores nothing however it is flagged', () => {
    expect(C.levelStars({ solved: false, flawless: true, independent: true })).toBe(0);
    expect(C.levelStars(null)).toBe(0);
    expect(C.levelStars(undefined)).toBe(0);
  });

  it('the teacher row cannot say independent:false and stars:3', () => {
    const s = C.teacherSummary({ L1: { solved: true, flawless: true } }, []);
    const row = s.levels.find(l => l.id === 'L1');
    expect(row, 'L1 row missing -- vacuous').toBeTruthy();
    // Whatever the star count, it must be consistent with the independence flag.
    if (!row.independent) expect(row.stars).toBeLessThan(3);
    expect(s.stars).toBe(row.stars);
  });

  it('the legend really does claim preview-hidden for three stars (the premise)', () => {
    expect(C.STAR_LEGEND, 'the legend changed -- revisit what levelStars promises').toMatch(/preview-hidden/);
    expect(C.STAR_LEGEND).toMatch(/first try/i);
  });

  it('holds across every combination of the two flags', () => {
    let checked = 0;
    [false, true].forEach((independent) => {
      [false, true].forEach((flawless) => {
        const n = C.levelStars({ solved: true, independent, flawless });
        checked++;
        if (n === 3) expect(independent, 'three stars without independence').toBe(true);
        if (n >= 2) expect(independent, 'two stars without independence').toBe(true);
      });
    });
    expect(checked, 'no combinations checked -- vacuous').toBe(4);
  });
});
