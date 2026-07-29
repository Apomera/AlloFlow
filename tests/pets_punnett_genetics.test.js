// Pets Lab — Punnett square + domestication timeline.
//
// ★★ THE PUNNETT SQUARE COMPUTED WRONG RATIOS (fixed 2026-07-28).
//
// gametes() collapsed a homozygous locus to a single allele and then padded
// the list back to 4 by REPEATING THE LAST ENTRY:
//
//     BBEe -> bs=[B], es=[E,e] -> [BE, Be] -> padded [BE, Be, Be, Be]
//
// which weights Be at 3/4 instead of 1/2 and reweights all 16 cells. Measured
// damage, tool vs. correct:
//
//     BBEe x BBEe    7:0:9   should be 12:0:4
//     BbEE x BbEE    7:9:0   should be 12:4:0
//     bbEe x bbEe    0:7:9   should be 0:12:4
//     Bbee x bbEe    1:3:12  should be 4:4:8   <- the cross the tool's own
//                                                 teaching note TELLS students
//                                                 to try
//
// It survived because the DEFAULT cross, BbEe x BbEe, is heterozygous at both
// loci and so never reaches the padding branch — and BbEe x BbEe is also the
// only ratio hard-coded in prose (9:3:4). Both things a reviewer would spot-
// check were the two things that were right. The bug lived only in the four
// "carrier" genotypes the widget exists to teach.
//
// So this file does not spot-check. It derives the expected ratio from first
// principles for ALL 81 crosses the dropdowns allow and compares against what
// the tool actually renders.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

const GENOTYPES = ['BBEE', 'BBEe', 'BbEE', 'BbEe', 'bbEE', 'bbEe', 'BBee', 'Bbee', 'bbee'];

/**
 * Expected phenotype counts, derived from the definition of independent
 * assortment rather than from any notion of a "gamete": each offspring takes
 * one B-allele from each parent and one E-allele from each parent, giving
 * 2x2x2x2 = 16 equally likely combinations. Deliberately NOT the same
 * construction the tool uses, so a shared mistake cannot cancel out.
 */
function expectedCounts(p1, p2) {
  const c = { Black: 0, Chocolate: 0, Yellow: 0 };
  for (const b1 of [p1[0], p1[1]]) {
    for (const b2 of [p2[0], p2[1]]) {
      for (const e1 of [p1[2], p1[3]]) {
        for (const e2 of [p2[2], p2[3]]) {
          const hasE = e1 === 'E' || e2 === 'E';
          const hasB = b1 === 'B' || b2 === 'B';
          c[!hasE ? 'Yellow' : hasB ? 'Black' : 'Chocolate']++;
        }
      }
    }
  }
  return c;
}

function text(html) {
  return html.replace(/&amp;/g, '&').replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

const geneView = (geneP1, geneP2) =>
  text(renderTool(ID, { [ID]: { view: 'genetics', geneP1, geneP2 } }));

/** Scrape the three "n/16" phenotype tiles, which render Black, Chocolate, Yellow in order. */
function renderedCounts(html) {
  const m = [...html.matchAll(/(\d+)\/16/g)].map((x) => Number(x[1]));
  expect(m.length, 'expected exactly 3 phenotype tiles').toBe(3);
  return { Black: m[0], Chocolate: m[1], Yellow: m[2] };
}

const fmt = (c) => c.Black + ':' + c.Chocolate + ':' + c.Yellow;

beforeAll(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z')); });
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('every cross the dropdowns allow produces the correct ratio', () => {
  it('matches first-principles Mendelian counts for all 81 pairings', () => {
    const wrong = [];
    for (const p1 of GENOTYPES) {
      for (const p2 of GENOTYPES) {
        const got = renderedCounts(geneView(p1, p2));
        const want = expectedCounts(p1, p2);
        if (fmt(got) !== fmt(want)) {
          wrong.push(p1 + ' x ' + p2 + ': rendered ' + fmt(got) + ', correct ' + fmt(want));
        }
      }
    }
    expect(wrong, wrong.length + ' cross(es) render a wrong ratio:\n' + wrong.join('\n')).toEqual([]);
  });

  it('always accounts for exactly 16 offspring', () => {
    for (const p1 of GENOTYPES) {
      for (const p2 of GENOTYPES) {
        const c = renderedCounts(geneView(p1, p2));
        expect(c.Black + c.Chocolate + c.Yellow, p1 + ' x ' + p2 + ' does not total 16').toBe(16);
      }
    }
  });
});

describe('the textbook ratios specifically', () => {
  const CASES = [
    ['BbEe', 'BbEe', '9:3:4', 'classic two-locus epistasis; the only ratio stated in prose'],
    ['BBEe', 'BBEe', '12:0:4', 'B fixed, E segregating -> 3:1'],
    ['BbEE', 'BbEE', '12:4:0', 'E fixed, B segregating -> 3:1'],
    ['bbEe', 'bbEe', '0:12:4', 'chocolate carrier pair'],
    ['Bbee', 'bbEe', '4:4:8', 'the cross the teaching note recommends'],
    ['BBEE', 'bbee', '16:0:0', 'all offspring BbEe, uniformly black'],
    ['bbee', 'bbee', '0:0:16', 'no dominant allele available anywhere']
  ];
  for (const [p1, p2, want, why] of CASES) {
    it(p1 + ' x ' + p2 + ' = ' + want + ' (' + why + ')', () => {
      expect(fmt(renderedCounts(geneView(p1, p2)))).toBe(want);
    });
  }
});

describe('the padding bug cannot come back', () => {
  it('none of the four affected crosses shows its old broken ratio', () => {
    const OLD = [
      ['BBEe', 'BBEe', '7:0:9'],
      ['BbEE', 'BbEE', '7:9:0'],
      ['bbEe', 'bbEe', '0:7:9'],
      ['Bbee', 'bbEe', '1:3:12']
    ];
    for (const [p1, p2, broken] of OLD) {
      expect(fmt(renderedCounts(geneView(p1, p2))), p1 + ' x ' + p2 + ' regressed').not.toBe(broken);
    }
  });

  it('gametes() no longer dedupes or pads', () => {
    // The shape of the fix, not just its output: padding is what silently
    // reweighted the grid, so its absence is worth pinning directly.
    const i = SRC.indexOf('function gametes(geno)');
    expect(i).toBeGreaterThan(-1);
    const body = SRC.slice(i, SRC.indexOf('function phenotype', i));
    expect(body, 'the pad-to-4 loop is back').not.toMatch(/while \(out\.length < 4\)/);
    expect(body, 'a homozygous locus is being collapsed again').not.toMatch(/\?\s*\[b1\]\s*:/);
    expect(body).toMatch(/var bs = \[geno\[0\], geno\[1\]\]/);
    expect(body).toMatch(/var es = \[geno\[2\], geno\[3\]\]/);
  });

  it('a homozygous parent still yields 4 gamete column headers', () => {
    // The padding existed to keep the grid 4x4; the fix must not shrink it.
    const html = geneView('BBEE', 'BBEE');
    expect((html.match(/>BE</g) || []).length).toBeGreaterThanOrEqual(8);
  });
});

describe('the grid itself stays coherent', () => {
  it('renders 16 cells whose genotypes are all reachable from the parents', () => {
    const html = geneView('BbEe', 'BbEe');
    const cells = [...html.matchAll(/>([BbEe]{4})</g)].map((m) => m[1]);
    const grid = cells.filter((g) => /^[Bb]{2}[Ee]{2}$/.test(g));
    expect(grid.length, 'expected 16 offspring genotype cells').toBeGreaterThanOrEqual(16);
    for (const g of grid) {
      expect(['BB', 'Bb', 'bb'], g + ' has an impossible B genotype').toContain(g.slice(0, 2));
      expect(['EE', 'Ee', 'ee'], g + ' has an impossible E genotype').toContain(g.slice(2));
    }
  });

  it('shows the simplified ratio a textbook would print', () => {
    // 4:4:8 out of 16 is what the grid counts; 1:1:2 is what a student is
    // asked to recognise.
    const html = geneView('Bbee', 'bbEe');
    expect(html).toMatch(/4 black : 4 chocolate : 8 yellow, out of 16/);
    expect(html).toMatch(/simplifies to 1:1:2/);
  });

  it('does not offer a simplification when the ratio is already lowest terms', () => {
    const html = geneView('BbEe', 'BbEe');
    expect(html).not.toMatch(/simplifies to/);
  });

  it('keeps the epistasis explanation on the default cross', () => {
    const html = geneView('BbEe', 'BbEe');
    expect(html).toMatch(/9:3:4/);
    expect(html).toMatch(/epistasis/i);
  });
});

describe('domestication dates are not presented as settled', () => {
  const timeline = () => geneView('BbEe', 'BbEe');

  it('flags the disputed dog origin region', () => {
    expect(timeline()).toMatch(/region disputed/i);
  });

  it('corrects the Botai horse story rather than repeating the old date', () => {
    const html = timeline();
    expect(html).toMatch(/Botai/);
    expect(html).toMatch(/Przewalski/);
    expect(html).toMatch(/Librado et al\. 2021/);
    expect(html).not.toMatch(/Pontic-Caspian steppe/);
  });

  it('drops the debunked French-monastery rabbit origin', () => {
    const html = timeline();
    expect(html, 'the monastery just-so story is back in the table').not.toMatch(/French monasteries/);
    expect(html).toMatch(/Irving-Pease et al\. 2018/);
    expect(html).toMatch(/gradual/i);
  });

  it('teaches the general point, not just the three corrections', () => {
    const html = timeline();
    expect(html).toMatch(/moving targets/i);
    expect(html).toMatch(/confidently-repeated date is not the same as a well-supported one/i);
  });

  it('keeps the well-supported rows intact', () => {
    const html = timeline();
    expect(html).toMatch(/Fertile Crescent/);
    expect(html).toMatch(/Felis silvestris/);
    expect(html).toMatch(/Red junglefowl/);
  });
});
