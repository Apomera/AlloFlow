// Dino Lab — the Dig Site had to be dug, not swept.
//
// The grid places 8-12 bones and counts how many the learner uncovers. That
// count was DISPLAYED and then used for nothing: every clue unlocked on
// `revealed.length`, the raw number of cells opened. So a left-to-right sweep
// earned the same six clues as a careful search, and finding a bone had no
// consequence at all — the one thing the activity is about.
//
// Clues now cost BONES. A dry cell costs a turn and buys nothing.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function clueThresholds() {
  const open = SRC.indexOf('var clueList = [');
  expect(open, 'clueList not found — did the dig site change shape?').toBeGreaterThan(-1);
  const close = SRC.indexOf('];', open);
  return [...SRC.slice(open, close).matchAll(/\{ at: (\d+),/g)].map((m) => Number(m[1]));
}

// The sparsest site the generator can produce.
function minBones() {
  const m = /var boneCells = \{\}, boneCount = (\d+) \+ Math\.floor\(rng\(\) \* (\d+)\)/.exec(SRC);
  expect(m, 'the bone count expression was not found').toBeTruthy();
  return Number(m[1]);
}

describe('clues are bought with bones, not clicks', () => {
  it('gates every clue on bones found', () => {
    expect(SRC).toContain('clueList.filter(function (c) { return dugBones >= c.at; })');
    // The old idiom must be gone, or a sweep still wins.
    expect(SRC).not.toContain('clueList.filter(function (c) { return revealed.length >= c.at; })');
  });

  it('keeps every site solvable', () => {
    // The top threshold cannot exceed the bones the sparsest site holds, or
    // some seeds could never reveal their last clue.
    const thresholds = clueThresholds();
    expect(thresholds.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...thresholds)).toBeLessThanOrEqual(minBones());
  });

  it('asks for at least one bone before the first clue', () => {
    // A clue at zero bones would be free, which is the old behaviour by
    // another name.
    expect(Math.min(...clueThresholds())).toBeGreaterThanOrEqual(1);
  });

  it('spaces the thresholds so later clues cost more', () => {
    const t = clueThresholds();
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
  });

  it('tells the learner what the next clue costs', () => {
    // Without this the gate is invisible: a student digs, nothing happens, and
    // there is no way to tell whether the site is stingy or they are unlucky.
    expect(SRC).toContain('var nextClue =');
    expect(SRC).toMatch(/next clue at ' \+ nextClue\.at \+ ' bones/);
    expect(SRC).toContain('all clues found');
  });

  it('declares nextClue before the status line that reads it', () => {
    expect(SRC.indexOf('var nextClue =')).toBeLessThan(SRC.indexOf('var digStatusText ='));
  });
});

describe('the three cell states are distinguishable', () => {
  function cellColours() {
    const m = /background: [a-zA-Z]+ \? \([a-zA-Z]+ \? '([^']+)' : '([^']+)'\) : '([^']+)'/.exec(SRC);
    expect(m, 'the dig cell background expression was not found').toBeTruthy();
    return { bone: m[1], empty: m[2], undug: m[3] };
  }

  const toRgb = (c) => {
    const rgba = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(c);
    if (rgba) {
      const a = rgba[4] === undefined ? 1 : Number(rgba[4]);
      // Composite over the panel, #0b1220.
      return [1, 2, 3].map((i) => Math.round(Number(rgba[i]) * a + [11, 18, 32][i - 1] * (1 - a)));
    }
    const hex = c.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(hex.substr(i, 2), 16));
  };
  const lum = (rgb) => {
    const v = rgb.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  it('separates an excavated empty cell from the panel behind it', () => {
    // It used to be T.deeper — the same token as the panel — so a dry cell read
    // as a hole in the page rather than as ground the learner had worked.
    const c = cellColours();
    expect(c.empty).not.toMatch(/T\.deeper/);
    expect(ratio(toRgb(c.empty), [11, 18, 32])).toBeGreaterThan(1.2);
  });

  it('separates a bone cell from an empty one by colour as well as glyph', () => {
    // The 🦴 glyph is the primary channel and must stay, but colour should
    // agree with it rather than leaving it to carry the whole distinction.
    const c = cellColours();
    expect(ratio(toRgb(c.bone), toRgb(c.empty))).toBeGreaterThan(1.8);
    expect(SRC).toContain('🦴');
  });

  it('keeps undug ground distinct from both', () => {
    const c = cellColours();
    expect(ratio(toRgb(c.undug), toRgb(c.empty))).toBeGreaterThan(1.5);
  });

  it('still names every cell for a screen reader', () => {
    // Colour and glyph are both visual; the label is what makes the grid
    // usable without either.
    expect(SRC).toMatch(/bone fragment uncovered/);
    expect(SRC).toMatch(/empty rock uncovered/);
    expect(SRC).toContain("'unopened rock'");
    expect(SRC).toContain("'. Press to dig.'");
  });
});
