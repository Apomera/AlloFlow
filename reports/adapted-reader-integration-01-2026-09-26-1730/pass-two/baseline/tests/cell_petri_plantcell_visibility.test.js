// The plant cell in the petri dish rendered as an empty box.
//
// Its wall is a bold olive rectangle, but every structure inside it was drawn in pale
// greens and violets at 12-60% alpha — on a mint dish. Measured against the band most
// organisms sit on (#a7f3d0):
//     cytoplasm 1.01-1.10   chloroplasts 1.19-1.21   thylakoids 1.25
//     vacuole   1.09-1.12   ER 1.10                  mitochondria 1.26
// Not one of them visible. This is the organism the catalogue describes as "cell wall,
// chloroplasts, and large vacuole", and the answer to the quiz question "Which cell has
// a rigid cell wall AND chloroplasts?" — so a student was being asked about structures
// the picture never showed.
//
// Opacity alone could not fix it: the authored chloroplast green (#4ade80) reaches only
// 1.36:1 against this dish at FULL opacity. The hues had to move away from mint.
//
// This test COMPUTES the contrast of whatever fills the renderer declares, rather than
// pinning the colour strings. Re-authoring the palette is fine; leaving it invisible is
// not.
import fs from 'node:fs';
import { describe, it, expect } from 'vitest';

const SRC = 'stem_lab/stem_tool_cell.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_cell.js';

// The dish gradient: pale centre, mid, deeper rim. Organisms drift across all three.
const DISH_BANDS = { pale: [209, 250, 229], mid: [167, 243, 208], deep: [110, 231, 183] };

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function composite([r, g, b], alpha, bg) {
  return [r, g, b].map((v, i) => v * alpha + bg[i] * (1 - alpha));
}

function plantCellBranch(src) {
  const lines = src.split(/\r?\n/);
  const start = lines.findIndex((l) => l.includes("} else if (def.id === 'plantcell') {"));
  expect(start, 'the plantcell renderer branch was not found').toBeGreaterThan(-1);
  let end = -1;
  for (let i = start + 1; i < start + 200; i++) {
    if (lines[i].includes('} else if (def.id ===') || lines[i].trim() === '} else {') { end = i; break; }
  }
  expect(end, 'the end of the plantcell branch was not found').toBeGreaterThan(start);
  return lines.slice(start, end).join('\n');
}

// Every rgba() the branch declares, with the contrast it reaches once composited.
function declaredFills(branch, band) {
  const out = [];
  const re = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g;
  let m;
  while ((m = re.exec(branch))) {
    const rgb = [Number(m[1]), Number(m[2]), Number(m[3])];
    const alpha = Number(m[4]);
    out.push({ css: m[0], ratio: contrast(composite(rgb, alpha, band), band) });
  }
  return out;
}

describe('cell petri dish — the plant cell must look like a cell', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  const branch = plantCellBranch(src);

  it('keeps the deployed mirror byte-identical', () => {
    expect(fs.readFileSync(MIRROR, 'utf8')).toBe(src);
  });

  it('declares fills at all', () => {
    // Guard the guard: if the branch stops using rgba() literals this test would pass
    // by measuring an empty list.
    expect(declaredFills(branch, DISH_BANDS.mid).length,
      'no rgba fills found in the plantcell renderer — this test is measuring nothing')
      .toBeGreaterThanOrEqual(6);
  });

  it('gives the cell interior structures that read against the dish', () => {
    for (const [name, band] of Object.entries(DISH_BANDS)) {
      const fills = declaredFills(branch, band);
      const strong = fills.filter((f) => f.ratio >= 3);
      expect(strong.length,
        `on the ${name} dish band only ${strong.length} of ${fills.length} fills reach 3:1.\n`
        + fills.map((f) => `    ${f.ratio.toFixed(2)}  ${f.css}`).join('\n')
        + '\n  Before this was fixed the best fill in the whole cell was 1.26:1 and the '
        + 'organism rendered as an empty rectangle.')
        .toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the chloroplasts among the strongest marks, since they are the point', () => {
    // The chloroplast gradient is the pair of fills inside the chloroplast loop.
    const chloroIdx = branch.indexOf('Chloroplasts');
    expect(chloroIdx, 'the chloroplast section was not found').toBeGreaterThan(-1);
    const chloroSection = branch.slice(chloroIdx, chloroIdx + 900);
    const fills = declaredFills(chloroSection, DISH_BANDS.mid);
    expect(fills.length, 'no chloroplast fills found').toBeGreaterThanOrEqual(2);
    fills.slice(0, 2).forEach((f) => {
      expect(f.ratio,
        `a chloroplast fill at ${f.ratio.toFixed(2)}:1 (${f.css}) is not visible on the dish`)
        .toBeGreaterThanOrEqual(3);
    });
  });
});

// Each organism's outline is its identity mark in the dish — the thing a student picks
// out when asked "which organism has cilia?". Measured 2026-08-17 against the mid dish
// band, nine of the eleven sat below 3:1: bacterium 1.67, euglena 1.78, paramecium 1.89,
// volvox 1.98, diatom 2.16, spirillum 2.19, plantcell 2.41, tardigrade 2.70, wbc 2.93.
// Only amoeba (3.30) and stentor (3.09) cleared it.
//
// The replacements are the SAME hues with every channel scaled by one factor (0.73-0.98),
// so the palette keeps its relationships and only loses lightness — verified by
// screenshot to leave the dish's character intact.
describe('cell petri dish — every organism outline reads against the dish', () => {
  const src = fs.readFileSync(SRC, 'utf8');

  function organismColours() {
    const out = [];
    const re = /id: '([a-z_]+)', label: '([^']*)', icon: '[^']*', color: '(#[0-9a-fA-F]{6})'/g;
    let m;
    while ((m = re.exec(src))) out.push({ id: m[1], label: m[2], color: m[3] });
    return out;
  }

  it('finds the organism table', () => {
    // Guard the guard: a renamed field would otherwise empty the sample and pass.
    expect(organismColours().length,
      'no organisms parsed out of the ORGANISMS table — this test is measuring nothing')
      .toBeGreaterThanOrEqual(10);
  });

  it('gives every organism an outline at 3:1 or better on every dish band', () => {
    const weak = [];
    for (const org of organismColours()) {
      const rgb = [1, 3, 5].map((i) => parseInt(org.color.slice(i, i + 2), 16));
      for (const [band, bg] of Object.entries(DISH_BANDS)) {
        const r = contrast(rgb, bg);
        if (r < 3) weak.push(`${org.label} (${org.color}) ${r.toFixed(2)}:1 on the ${band} band`);
      }
    }
    expect(weak,
      'these organisms cannot be picked out of the dish they swim on:\n  ' + weak.join('\n  '))
      .toEqual([]);
  });
});
