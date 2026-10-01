import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Plate Boundary Simulator (AlloTectonicsInteractive) — the cross-section.
 *
 * The panels around this widget were already good: a boundary-evidence table, a
 * maths note, a set of things to try. The DRAWING was where it came apart.
 *
 * It drew one picture for all three boundary types and then named it differently:
 * two identical brown slabs of identical thickness, and a hot mantle plume rising
 * straight up under the seam. Under a convergent boundary that is upside down —
 * the flow there goes DOWN, which is what a subducting slab is — and under a
 * transform boundary it contradicts the defining fact, that no plate is made or
 * destroyed there. The subducting plate was a round-capped bezier stroke starting
 * below the plate and attached to nothing, and the mountain range that is the
 * headline outcome of a convergent boundary was mapped for an 8000 m ceiling it
 * takes about 45 minutes to approach, so it drew a fifth of a pixel tall.
 *
 * These pin the invariants of the repair. They read source: the widget's draw()
 * runs on a rAF against a real 2D context and cannot be instantiated in jsdom,
 * but the rules it encodes are still checkable statements about the source.
 */

const SOURCE = resolve(process.cwd(), 'stem_lab/stem_tool_platetectonics.js');
let cache = null;
function src() {
  if (cache == null) cache = readFileSync(SOURCE, 'utf8');
  return cache;
}

/** The body of the widget's draw(), which is the only region these assert on. */
function sectionDraw() {
  const text = src();
  const at = text.indexOf('function draw(ctx, W, H, cur) {');
  expect(at, 'widget draw() not found').toBeGreaterThan(-1);
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error('unbalanced braces in widget draw()');
}

describe('Boundary simulator — the mantle follows the boundary type', () => {
  it('derives the limb from the mode instead of always drawing an upwelling', () => {
    const d = sectionDraw();
    expect(d).toMatch(/var limb = cur\.mode === 'divergent' \? 'up' : cur\.mode === 'convergent' \? 'down' : 'none'/);
    // All three cases are drawn, not just the divergent one.
    expect(d).toMatch(/if \(limb === 'up'\)/);
    expect(d).toMatch(/else if \(limb === 'down'\)/);
  });

  it('turns the cells the way the limb requires', () => {
    const d = sectionDraw();
    expect(d).toMatch(/var direction = \(c === 0 \? -1 : 1\) \* \(limb === 'down' \? -1 : 1\)/);
  });

  it('says nothing rises or sinks under a transform boundary', () => {
    const d = sectionDraw();
    expect(d).toMatch(/no rising or sinking here/);
    expect(d).toMatch(/no new plate made/);
    expect(d).toMatch(/none destroyed either/);
    // And moves the cells so no limb lands under the fault to contradict it.
    expect(d).toMatch(/limb === 'none'\s*\n\s*\? \(c === 0 \? 92 : 316\)/);
  });

  it('colours the down-limb cold rather than hot', () => {
    const d = sectionDraw();
    const down = d.slice(d.indexOf("} else if (limb === 'down')"), d.indexOf("} else if (limb === 'down')") + 1400);
    // Blue, because the reason it sinks is that it is the COOL part of the loop.
    expect(down).toMatch(/rgba\(147,197,253/);
    expect(down).toMatch(/cool rock sinks here/);
    expect(down).not.toMatch(/rgba\(249,115,22/);
  });

  it('colours a flow marker by whether it is actually going up', () => {
    // The old test was `sin(fa) < 0`, which asks whether the marker is in the
    // UPPER half of the loop — so a marker was painted hot on the way down the
    // far side and cool on the way back up.
    const d = sectionDraw();
    expect(d).toMatch(/var rising = Math\.cos\(fa\) \* direction < 0/);
    expect(d).not.toMatch(/var rising = Math\.sin\(fa\) < 0/);
  });
});

describe('Boundary simulator — the plates are typed where it matters', () => {
  it('types them for convergent and leaves the other two alone', () => {
    const d = sectionDraw();
    expect(d).toMatch(/var typed = cur\.mode === 'convergent'/);
    // A ridge or a transform fault in this scenario is between two plates of the
    // same kind, so inventing a contrast there would be its own lie.
    expect(d).toMatch(/var lTop = typed \?/);
    expect(d).toMatch(/oceanic — thin, dense/);
    expect(d).toMatch(/continental — thick, buoyant/);
  });

  it('puts the ocean basin below the land beside it', () => {
    const d = sectionDraw();
    // plateY is sea level and the top of the continent both; the oceanic plate's
    // top is pushed DOWN from it, which is half of why that plate sinks.
    expect(d).toMatch(/lTop = typed \? plateY \+ plateH \* 0\.34 : plateY/);
    expect(d).toMatch(/lH = typed \? plateH \* 0\.52 : plateH/);
  });
});

describe('Boundary simulator — the slab is a plate, not a stroke', () => {
  it('draws it as a quadrilateral of the oceanic plate\'s own thickness', () => {
    const d = sectionDraw();
    expect(d).toMatch(/var slabT = lH;/);
    // Hinged at the trench: sx0/sy0 are the boundary and the ocean floor.
    expect(d).toMatch(/var sx0 = bx, sy0 = lTop;/);
    expect(d).toMatch(/same plate, going down/);
  });

  it('keeps the slab inside the canvas', () => {
    const d = sectionDraw();
    expect(d).toMatch(/slabReach = Math\.min\(H \* 0\.46, H - lTop - 14\)/);
    expect(d).toMatch(/slabRun = Math\.min\(slabReach \/ Math\.tan\(slabDip\), W - bx - 30\)/);
  });

  it('derives the melt point from the slab rather than a hand-placed constant', () => {
    const d = sectionDraw();
    expect(d).toMatch(/meltX = sx0 \+ \(meltY - sy0\) \/ Math\.tan\(slabDip\)/);
    // Arc set back from the trench, which is the fact the geometry exists to show.
    expect(d).toMatch(/var arcX = Math\.min\(W - 60, meltX \+ 26\)/);
  });

  it('marks the trench', () => {
    expect(sectionDraw()).toMatch(/fieldChip\('trench'/);
  });
});

describe('Boundary simulator — the outcome of a collision is visible', () => {
  it('maps the range so it can be seen inside a lesson', () => {
    const d = sectionDraw();
    const m = /var mH = Math\.min\(50, 3 \+ 50 \* Math\.sqrt\(Math\.min\(1, cur\.mountainHeight \/ (\d+)\)\)\)/.exec(d);
    expect(m, 'mountain mapping not found').toBeTruthy();
    // Referenced against a height reachable in a classroom, not the 8000 m cap.
    expect(+m[1]).toBeLessThan(3000);
    // A linear map against the cap is what made it invisible.
    expect(d).not.toMatch(/cur\.mountainHeight \/ 130/);
  });
});

describe('Boundary simulator — transform gets the view that can show it', () => {
  it('draws a map view, and names it as one', () => {
    const d = sectionDraw();
    expect(d).toMatch(/MAP VIEW — LOOKING STRAIGHT DOWN/);
    expect(d).toMatch(/one stream, cut in two/);
    expect(d).toMatch(/motion is into and out of this page/);
  });

  it('no longer offsets a road DOWNWARD inside the section', () => {
    // Down the page in a cross-section is depth, so the old offset marker drew a
    // road that had slid sideways in the real world as sinking into the ground.
    const d = sectionDraw();
    expect(d).not.toMatch(/roadY \+ roadOffset/);
  });

  it('describes the map view for a student who cannot see it', () => {
    const text = src();
    expect(text).toMatch(/var sectionScene = s\.mode === 'convergent'/);
    const scene = text.slice(text.indexOf('var sectionScene'), text.indexOf('var depthSummary'));
    expect(scene).toMatch(/a map view is drawn above the section/);
    expect(scene).toMatch(/creates no new plate and destroys none/);
    // The convergent description names what the drawing now actually contains.
    expect(scene).toMatch(/trench/);
    expect(scene).toMatch(/volcanic arc set back from the trench/);
  });
});

describe('Boundary simulator — labels survive the background behind them', () => {
  it('routes field labels through one chip helper', () => {
    const d = sectionDraw();
    expect(d).toMatch(/function fieldChip\(text, x, y, ink\)/);
    // Every one of these used to be bare 8-9px text over a red-orange mantle or
    // a pale sky: dark maroon on orange, navy on red.
    expect((d.match(/fieldChip\(/g) || []).length).toBeGreaterThanOrEqual(9);
    expect(d).not.toMatch(/SHEAR STRESS ' \+ Math\.round/);
    expect(d).not.toMatch(/'NEW CRUST • MIRRORED MAGNETIC STRIPES'/);
  });

  it('states how focus depth is read, without claiming a scale the drawing lacks', () => {
    const d = sectionDraw();
    expect(d).toMatch(/FOCUS DEPTH, BY COLOUR/);
    expect(d).toMatch(/shallow — under 70 km/);
    expect(d).toMatch(/intermediate — 70 to 300 km/);
    expect(d).toMatch(/deep — over 300 km/);
    // The key moves out of whichever corner the current mode is using.
    expect(d).toMatch(/keyY = cur\.mode === 'transform' \? H - 44 : 80/);
  });

  it('keeps the mode stat clear of the map view', () => {
    const d = sectionDraw();
    // Printed at the top right it ran straight across the map view's header.
    expect(d).toMatch(/ctx\.fillText\(modeStat, 14, 72\)/);
    expect(d).not.toMatch(/'Offset: ' \+ Math\.round\(cur\.offset\) \+ ' m', W - 130/);
  });

  it('drops the sun while the map view holds that corner', () => {
    expect(sectionDraw()).toMatch(/if \(cur\.mode === 'transform'\) \{\s*\n\s*\/\/ no celestial body/);
  });
});

describe('Boundary simulator — control hooks', () => {
  it('exposes the boundary-type buttons with pressed state', () => {
    const text = src();
    expect(text).toMatch(/'data-tect-mode': k/);
    expect(text).toMatch(/'aria-pressed': s\.mode === k/);
  });

  it('exposes the 2D section for tests and tooling', () => {
    expect(src()).toMatch(/'data-tect-section': 'true'/);
  });
});
