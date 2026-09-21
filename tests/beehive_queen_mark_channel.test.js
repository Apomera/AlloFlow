// Beehive — the queen's mark must survive contrast mode.
//
// The international queen-marking code puts her BIRTH YEAR in the colour of the
// dot on her thorax: white 1/6, yellow 2/7, red 3/8, green 4/9, blue 5/0. The
// colour IS the content. In contrast mode this tool forces every scene colour
// to white, so all five years collapsed to the same mark — and the narration
// still told the learner to look for "the blue mark", sending them after
// something the view was no longer showing.
//
// The disc now also carries the year as a SHAPE (segment count), which reads in
// any palette and for a learner who cannot separate the red and green of the
// code. WCAG 1.4.1.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');

function tableOf(name) {
  const m = new RegExp('var ' + name + ' = (\\[[^\\]]*\\]);').exec(SRC);
  expect(m, name + ' not found').toBeTruthy();
  // eslint-disable-next-line no-new-func
  return new Function('return ' + m[1])();
}

function markIndex(year) {
  const open = SRC.indexOf('function bhQueenMarkIndex');
  const close = SRC.indexOf('\n  }', open) + 4;
  // eslint-disable-next-line no-new-func
  return new Function(SRC.slice(open, close) + '\nreturn bhQueenMarkIndex;')()(year);
}

describe('the queen mark carries the year in two channels', () => {
  it('still matches the international colour convention', () => {
    // Guard the thing being protected: a shape channel is worthless if the
    // underlying year mapping drifts.
    const names = tableOf('BH_QUEEN_MARK_NAMES');
    const official = {
      1: 'white', 6: 'white', 2: 'yellow', 7: 'yellow', 3: 'red',
      8: 'red', 4: 'green', 9: 'green', 5: 'blue', 0: 'blue',
    };
    for (let y = 2020; y <= 2031; y++) {
      expect(names[markIndex(y)], `year ${y}`).toBe(official[y % 10]);
    }
  });

  it('gives every year in the cycle its own shape', () => {
    const sides = tableOf('BH_QUEEN_MARK_SIDES');
    const names = tableOf('BH_QUEEN_MARK_NAMES');
    expect(sides).toHaveLength(names.length);
    expect(new Set(sides).size, 'two years share a silhouette').toBe(names.length);
  });

  it('keeps the silhouettes far enough apart to tell apart', () => {
    // 12 vs 14 sides is not a distinguishable difference on a dot this small.
    const sides = tableOf('BH_QUEEN_MARK_SIDES').slice().sort((a, b) => a - b);
    for (let i = 1; i < sides.length; i++) {
      expect(sides[i] - sides[i - 1], `${sides[i - 1]} and ${sides[i]} look alike`)
        .toBeGreaterThanOrEqual(1);
    }
    // The low end must be a real polygon, not a near-circle.
    expect(sides[0]).toBeLessThanOrEqual(4);
    // And one of them should read as round, so "round" is a usable name.
    expect(sides[sides.length - 1]).toBeGreaterThanOrEqual(16);
  });

  it('builds the disc from the year, not a fixed segment count', () => {
    // The original was CircleGeometry(0.0115, 14) — the same disc every year.
    expect(SRC).toContain('BH_QUEEN_MARK_SIDES[bhQueenMarkIndex(');
    expect(SRC).not.toMatch(/CircleGeometry\(0\.0115,\s*14\)/);
  });

  it('names the shape in the narration, not only the colour', () => {
    // Contrast mode removes the colour; a learner told only "the blue mark" is
    // being sent after something they cannot see.
    const line = /Front frame drawn out\.[^']*'[^;]*/.exec(SRC);
    expect(line, 'queen narration not found').toBeTruthy();
    expect(line[0]).toContain('BH_QUEEN_MARK_SHAPES');
    expect(line[0]).toContain('BH_QUEEN_MARK_NAMES');
  });

  it('has a shape name for every colour name', () => {
    expect(tableOf('BH_QUEEN_MARK_SHAPES')).toHaveLength(tableOf('BH_QUEEN_MARK_NAMES').length);
  });
});
