// brainAtlas — "Cranial nerves and Circle of Willis" top-band layout must not collide.
//
// The original defect: brainAtlasDrawCanvasHeading sizes its panel in ABSOLUTE
// pixels and clamps it (14 + clamp(76..96)), while the bedside-clue banner, the
// clue chips and the anatomy were each positioned as fractions of H. Two
// different coordinate systems agree at exactly one canvas height; everywhere
// else they slide through each other. At the shipped size that produced four
// simultaneous overlaps: the banner rode up over the heading subtitle, the chips
// sat inside the banner, the CN I pill was painted over by the banner, and the
// AComm/ACA pill collided with the chip row.
//
// This pins the INVARIANT (each band starts below the one above it, and the
// anatomy fits in what is left) rather than the spelling of any one constant, so
// the numbers stay free to be tuned. Source-literal extraction: brainAtlas is
// ~1 MB, too slow for loadTool.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const COPIES = [
  'stem_lab/stem_tool_brainatlas.js',
  'desktop/web-app/public/stem_lab/stem_tool_brainatlas.js',
];

// Every canvas height the tool realistically renders at, including the small
// end where the clamped heading eats the largest share of the canvas.
const HEIGHTS = [380, 420, 500, 560, 600, 700, 840, 900, 1000, 1200, 1400];

function extractBands(src) {
  const names = [
    'cwHeadBottom', 'cwBannerY', 'cwBannerH', 'cwChipY',
    'cwChipH', 'cwArtTop', 'cwArtBottom', 'cwSrcTop', 'cwSrcBottom', 'cwScale',
  ];
  const parts = [];
  for (const name of names) {
    const at = src.search(new RegExp('\\b' + name + ' = '));
    expect(at, name + ' band expression not found').toBeGreaterThan(-1);
    let i = at + src.slice(at).indexOf(' = ') + 3;
    // Scan to the end of the initialiser, ignoring the commas and semicolons
    // that live inside Math.max(...) / Math.min(...) calls.
    let depth = 0;
    let out = '';
    for (; i < src.length; i += 1) {
      const ch = src[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      if (depth === 0 && (ch === ';' || ch === ',' || ch === '\n')) break;
      out += ch;
    }
    parts.push('var ' + name + ' = ' + out.trim() + ';');
  }
  return parts.join('\n');
}

function evaluateBands(bandSource, H) {
  // eslint-disable-next-line no-new-func
  return new Function('H', bandSource + `
    return {
      headBottom: cwHeadBottom, bannerY: cwBannerY, bannerH: cwBannerH,
      chipY: cwChipY, chipH: cwChipH, artTop: cwArtTop, artBottom: cwArtBottom,
      srcTop: cwSrcTop, srcBottom: cwSrcBottom, scale: cwScale,
    };`)(H);
}

describe('brainAtlas — cranial nerves / Circle of Willis layout bands', () => {
  const sources = {};
  beforeAll(() => {
    for (const file of COPIES) sources[file] = fs.readFileSync(file, 'utf8');
  });

  it('ships the same file to the CDN and the desktop bundle', () => {
    expect(sources[COPIES[0]]).toBe(sources[COPIES[1]]);
  });

  it('derives the decoder banner and chip row from the measured heading, not from H fractions', () => {
    const src = sources[COPIES[0]];
    // The regression is literally "these were H * 0.xx". Assert they are bound
    // to the computed bands instead.
    expect(src).toMatch(/clueY = cwBannerY, clueW = W \* 0\.80, clueH = cwBannerH/);
    expect(src).toMatch(/var clueChipY = cwChipY;/);
    expect(src).toMatch(/brainAtlasDrawDecoderChip\(x, y, w, cwChipH,/);
  });

  it('keeps heading, banner, chip row and anatomy in disjoint vertical bands at every height', () => {
    const bandSource = extractBands(sources[COPIES[0]]);
    for (const H of HEIGHTS) {
      const b = evaluateBands(bandSource, H);
      expect(b.headBottom, `H=${H} heading must end before the banner`).toBeLessThan(b.bannerY);
      expect(b.bannerY + b.bannerH, `H=${H} banner must end before the chips`).toBeLessThan(b.chipY);
      expect(b.chipY + b.chipH, `H=${H} chips must end before the anatomy`).toBeLessThanOrEqual(b.artTop);
      expect(b.artTop, `H=${H} anatomy band must be non-empty`).toBeLessThan(b.artBottom);
      expect(b.artBottom, `H=${H} anatomy must stay on canvas`).toBeLessThanOrEqual(H);
    }
  });

  it('fits the whole anatomy, CN I pill through basilar pill, inside the anatomy band', () => {
    const bandSource = extractBands(sources[COPIES[0]]);
    for (const H of HEIGHTS) {
      const b = evaluateBands(bandSource, H);
      const cwY = (f) => b.artTop + (f - b.srcTop) * H * b.scale;
      const cwH = (f) => f * H * b.scale;
      const pillHalf = cwH(0.061) / 2;
      // CN I is the topmost pill (y 0.13) and basilar the lowest (y 0.905).
      const topMost = cwY(0.13) - pillHalf;
      const bottomMost = cwY(0.905) + pillHalf;
      expect(topMost, `H=${H} CN I pill must clear the chip row`).toBeGreaterThanOrEqual(b.chipY + b.chipH - 0.5);
      expect(bottomMost, `H=${H} basilar pill must stay on canvas`).toBeLessThanOrEqual(H);
      // A degenerate scale would technically satisfy the bounds while rendering
      // an unreadable, flattened brain.
      expect(b.scale, `H=${H} vertical compression must stay legible`).toBeGreaterThan(0.5);
      expect(b.scale, `H=${H} anatomy must not be stretched past its design`).toBeLessThanOrEqual(1.05);
    }
  });

  it('does not reintroduce a raw H fraction anywhere in the Willis anatomy', () => {
    const src = sources[COPIES[0]];
    const start = src.indexOf("cwPath([[W * 0.43, cwY(0.27)");
    const end = src.indexOf('} else if (currentView.isStrokeTerritory) {');
    expect(start, 'Willis anatomy block not found').toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    // Anatomy Y must go through cwY()/cwH() so it tracks the band; a bare
    // `H * 0.xx` here is exactly how the overlap came back last time.
    expect(block.match(/H \* 0\.\d+/g) || []).toEqual([]);
  });
});
