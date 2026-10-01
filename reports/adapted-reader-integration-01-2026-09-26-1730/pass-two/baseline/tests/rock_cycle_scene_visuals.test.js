// The transformation machine's scene: does the drawing say what the words say?
//
// Every defect here was found by rendering the machine and looking at it
// (dev-tools/rc_scene_shots.cjs), not by a test. Each of the three is the same
// shape of bug — the picture contradicting its own caption:
//
//   1. HEAT & PRESS drew its two pressure arrows pointing AWAY from each
//      other. That is tension, on the tool's central animation for
//      metamorphism. Their positions converged with progress, which is what
//      made it look right at a glance; only the heads were reversed.
//
//   2. "Pick an agent of change" — the one instruction a student needs before
//      anything happens — was #cbd5e1 on a #f8fafc panel: 1.42:1.
//
//   3. CRYSTALLINE and NONFOLIATED drew separated grains with wide gaps, while
//      the panels beside them said "coarse INTERLOCKING quartz, feldspar and
//      mica" and "grains recrystallize and FUSE together, SEALING the pore
//      space". Quartzite's whole identity is that it fractures THROUGH its
//      grains because there is no pore space left.
//
// So these tests assert the geometry and the colour, not the implementation:
// an arrow must point at the rock, a mosaic must actually cover its area.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  React,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';

// Scene geometry, from rcScene(). The swatch box is where a specimen is drawn.
const SW = { x: 10, y: 26, w: 86, h: 70 };
const CHAMBER_MID_Y = SW.y + SW.h / 2;

function tree(rockCycle) {
  const store = { rocks: {}, rockCycle: Object.assign({}, rockCycle) };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (f) => { const n = typeof f === 'function' ? f(store) : f; Object.assign(store, n); },
  });
  return window.StemLab._registry.rockCycle.render(ctx);
}

function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

// ── sRGB relative luminance, gamma-decoded. An equal channel shift does NOT
// move luminance linearly — that assumption produced a "fix" earlier in this
// work that left marks as low as 1.07:1 while claiming to hit 3:1.
function lum(hex) {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function polygons(node) {
  return findAll(node, (n) => n.type === 'polygon' && typeof n.props.points === 'string')
    .map((n) => n.props.points.trim().split(/\s+/).map((p) => p.split(',').map(Number)));
}

function inside(poly, px, py) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// What fraction of the swatch rectangle is covered by at least one grain?
// This is the direct measurement of "no pore space left" — the claim the
// quartzite and marble panels make in words.
function coverage(polys, box) {
  const N = 24;
  let inAny = 0, total = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      // Inset by half a step so samples sit inside the box, not on its edge.
      const px = box.x + ((c + 0.5) / N) * box.w;
      const py = box.y + ((r + 0.5) / N) * box.h;
      total++;
      if (polys.some((p) => inside(p, px, py))) inAny++;
    }
  }
  return inAny / total;
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('Heat & Press shows compression, not tension', () => {
  function arrows(prog) {
    const node = tree({
      startingRock: 'granite', geologicalAgent: 'heat_pressure',
      transformationAnimActive: true, transformationProgress: prog,
    });
    // Located by fill, not by React key: keys never reach the DOM, and this
    // work has already shipped tests that asserted on keys and so asserted on
    // nothing. Two paths in the scene carry the pressure-arrow colour.
    const found = findAll(node, (n) => n.type === 'path' && n.props.fill === '#b45309');
    expect(found, `expected 2 pressure arrows at progress ${prog}`).toHaveLength(2);
    return found.map((n) => {
      // The path anchors at its TIP; rotate(180) about that tip flips which way
      // the head faces without moving it.
      const anchorY = Number(/^M[\d.]+,([\d.]+)/.exec(n.props.d)[1]);
      const flipped = typeof n.props.transform === 'string' && /rotate\(180/.test(n.props.transform);
      return { anchorY, pointsDown: !flipped };
    });
  }

  it('points both arrows at the rock, at every stage of the run', () => {
    [0, 25, 50, 75, 100].forEach((prog) => {
      arrows(prog).forEach((a) => {
        const rockIsBelow = a.anchorY < CHAMBER_MID_Y;
        expect(a.pointsDown, `arrow at y=${a.anchorY} (progress ${prog}) must point toward the rock`)
          .toBe(rockIsBelow);
      });
    });
  });

  it('has one arrow above the rock and one below it', () => {
    const ys = arrows(0).map((a) => a.anchorY);
    expect(ys.some((y) => y < CHAMBER_MID_Y)).toBe(true);
    expect(ys.some((y) => y > CHAMBER_MID_Y)).toBe(true);
  });

  it('closes the gap as the run proceeds — that is what "squeeze" means', () => {
    const spread = (prog) => {
      const [a, b] = arrows(prog).map((x) => x.anchorY).sort((m, n) => m - n);
      return b - a;
    };
    expect(spread(100)).toBeLessThan(spread(0));
  });
});

describe('the machine states its own instruction legibly', () => {
  it('renders the prompt at 4.5:1 or better on the scene panel', () => {
    // The scene sits in a bg-slate-50 (#f8fafc) card; the chamber tint over it
    // is #0f172a at 6% opacity, which only darkens the backdrop and so can
    // only help. Measure against the lighter of the two, the harder case.
    const node = tree({ startingRock: 'granite' });
    const hint = findAll(node, (n) => n.type === 'text'
      && String(n.props.children).includes('Pick an agent'));
    expect(hint, 'the idle prompt should be on screen with no agent chosen').toHaveLength(1);
    const fill = hint[0].props.fill;
    expect(fill).not.toBe('#cbd5e1');
    expect(contrast(fill, '#f8fafc')).toBeGreaterThanOrEqual(4.5);
  });

  it('drops the prompt once an agent is chosen', () => {
    const node = tree({ startingRock: 'granite', geologicalAgent: 'heat_pressure' });
    expect(findAll(node, (n) => n.type === 'text'
      && String(n.props.children).includes('Pick an agent'))).toHaveLength(0);
  });
});

describe('interlocking textures actually interlock', () => {
  // Both of these draw the INPUT swatch, whose box is fixed by rcScene.
  const CASES = [
    ['granite', 'crystalline', 'coarse interlocking quartz, feldspar and mica'],
    ['marble', 'nonfoliated', 'interlocking calcite mosaic — no pore space'],
  ];

  CASES.forEach(([specimen, texture, claim]) => {
    it(`${texture} (${specimen}) leaves essentially no gap between grains — ${claim}`, () => {
      const node = tree({ startingRock: specimen });
      const polys = polygons(node).filter((p) =>
        p.some(([px, py]) => px > SW.x - 30 && px < SW.x + SW.w + 30 && py > SW.y - 30 && py < SW.y + SW.h + 30));
      expect(polys.length, 'expected grain polygons in the input swatch').toBeGreaterThan(4);
      const cov = coverage(polys, SW);
      expect(cov, `${texture} covers only ${(cov * 100).toFixed(1)}% of the specimen`)
        .toBeGreaterThan(0.9);
    });

    it(`${texture} keeps its family hue rather than repainting the swatch pale`, () => {
      // Tiling in the pale detail colour would cover the body entirely and
      // break the three-family colour coding the whole tool leans on.
      const node = tree({ startingRock: specimen });
      const fills = findAll(node, (n) => n.type === 'polygon' && n.props.fill)
        .map((n) => n.props.fill);
      expect(fills.length).toBeGreaterThan(4);
      // Every grain must be distinguishable from its neighbours' outline.
      fills.forEach((f) => expect(/^#[0-9a-f]{6}$/i.test(f), `bad colour ${f}`).toBe(true));
      // And there must be more than one tone, or it is a flat block again.
      expect(new Set(fills).size).toBeGreaterThan(1);
    });
  });

  it('draws more grains than the six it used to', () => {
    const node = tree({ startingRock: 'marble' });
    expect(polygons(node).length).toBeGreaterThanOrEqual(12);
  });

  it('draws Coarse Marble coarser than the marble that went in', () => {
    // "more heat does not create new minerals — it just lets existing crystals
    // grow larger by consuming their neighbours." Both rocks used the same
    // texture name, so the product came out with grains exactly the size of the
    // input: the one change the panel describes was the one thing the picture
    // did not show.
    //
    // Driven through transformationAnimActive rather than a hand-built result
    // record, so the product shown is the one the tool's own table produces.
    const node = tree({
      startingRock: 'marble', geologicalAgent: 'heat_pressure',
      transformationAnimActive: true, transformationProgress: 100,
    });
    const centroidX = (p) => p.reduce((a, [px]) => a + px, 0) / p.length;
    const all = polygons(node);
    const input = all.filter((p) => centroidX(p) < 150);
    const output = all.filter((p) => centroidX(p) > 200);
    expect(input.length, 'input marble grains').toBeGreaterThan(0);
    expect(output.length, 'product grains').toBeGreaterThan(0);
    expect(output.length, `coarse marble drew ${output.length} grains vs the input's ${input.length}`)
      .toBeLessThan(input.length);
  });

  it('is deterministic — the same state redraws the same frame', () => {
    const a = JSON.stringify(polygons(tree({ startingRock: 'granite' })));
    const b = JSON.stringify(polygons(tree({ startingRock: 'granite' })));
    expect(a).toBe(b);
  });
});
