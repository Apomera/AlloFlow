/**
 * The Earth this tool draws in six places (orbit, both coasts, lunar orbit, the
 * horizon disc and the moonwalk's sky texture). It used to be three bezier blobs
 * whose x swung by cos(rot) around the centre: two green lenses that never set
 * behind the limb. It is now coastlines under an orthographic projection, so these
 * pin the properties that make it read as a globe rather than any coordinate.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const AFRICA = 2;   // index of Africa in MM_EARTH_LAND
let P;

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});

// One full turn at the tool's rate (0.0458 deg per frame), sampled 60 times.
const FULL_TURN = Math.ceil(360 / 0.0458);
const TICKS = Array.from({ length: 60 }, (_, i) => Math.round((i * FULL_TURN) / 60));
const SIZES = [14, 60, 90];   // horizon disc, coast view, orbit view
const ring = (tick, idx) => P.earthLandPaths(0, 0, 100, tick).find((s) => s.i === idx);

describe('Moon Mission Earth globe', () => {
  it('exposes the projection as a pure helper', () => {
    expect(typeof P.earthLandPaths).toBe('function');
    const kinds = new Set(P.earthLandPaths(0, 0, 100, 0).map((p) => p.k));
    ['land', 'arid', 'ice'].forEach((k) => expect(kinds.has(k), k + ' should be drawn on the first frame').toBe(true));
  });

  it('keeps every coastline point on or inside the disc', () => {
    let worst = 0;
    for (const r of SIZES) for (const t of TICKS) {
      for (const shape of P.earthLandPaths(0, 0, r, t)) {
        for (const [x, y] of shape.pts) worst = Math.max(worst, Math.hypot(x, y) / r);
      }
    }
    expect(worst, 'furthest coastline point as a fraction of the radius').toBeLessThanOrEqual(1 + 1e-9);
  });

  it('never draws a chord across the disc', () => {
    // A far-side vertex cannot be drawn where it is. Clamping each one to the rim
    // independently joins consecutive clamps with STRAIGHT lines that cut across
    // the globe when they land far apart; tracing the rim continuously keeps every
    // step short. Resampled steps are <= 3 degrees (0.052 r), so a tenth of the
    // radius is a ceiling that a single chord would blow straight through.
    // Near the point straight behind the globe a 3 degree step on the sphere can
    // swing the rim angle ~13 degrees, so large rim steps are filled along the
    // arc too; measured longest step is 0.074 r (the 3 degree bound itself).
    let longest = 0, shallowestRimChord = 1;
    const onRim = (x, y, r) => Math.abs(Math.hypot(x, y) - r) < r * 1e-9;
    for (const r of SIZES) for (const t of TICKS) {
      for (const shape of P.earthLandPaths(0, 0, r, t)) {
        const pts = shape.pts;
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
          longest = Math.max(longest, Math.hypot(x1 - x0, y1 - y0) / r);
          // A rim-to-rim step must hug the limb: a chord's midpoint falls inside.
          if (onRim(x0, y0, r) && onRim(x1, y1, r)) {
            shallowestRimChord = Math.min(shallowestRimChord, Math.hypot((x0 + x1) / 2, (y0 + y1) / 2) / r);
          }
        }
      }
    }
    expect(longest, 'longest straight segment as a fraction of the radius').toBeLessThan(0.1);
    expect(shallowestRimChord, 'a rim step dips inside the limb (a chord)').toBeGreaterThan(0.99);
  });

  it('turns eastward, so land crosses the view from left to right', () => {
    const cx = (tick) => {
      const pts = ring(tick, AFRICA).pts;
      return pts.reduce((a, p) => a + p[0], 0) / pts.length;
    };
    expect(ring(0, AFRICA), 'Africa should be in view on the first frame').toBeTruthy();
    expect(cx(200), 'Africa should move right as Earth turns').toBeGreaterThan(cx(0));
  });

  it('sets land behind the limb half a turn later', () => {
    const onFace = (tick) => {
      const s = ring(tick, AFRICA);
      // Far-side points are traced ON the rim (r = 100); the visible face is inside it.
      return s ? s.pts.filter(([x, y]) => Math.hypot(x, y) < 99).length : 0;
    };
    expect(onFace(0), 'Africa faces the viewer on the first frame').toBeGreaterThan(20);
    expect(onFace(Math.round(FULL_TURN / 2)), 'half a turn later no Africa point is on the visible face').toBe(0);
  });

  it('keeps the atmosphere halo inside the 1.45r the moonwalk texture was sized for', () => {
    // The moonwalk draws Earth into a 256px texture at r=86 so that r*1.45 = 125
    // fits; anything drawn further out is square-clipped at the texture edge.
    let maxReach = 0;
    const note = (x, y, extra) => { maxReach = Math.max(maxReach, Math.hypot(x - 128, y - 128) + (extra || 0)); };
    const noop = () => {};
    const grad = { addColorStop: noop };
    const ctx = {
      save: noop, restore: noop, clip: noop, fill: noop, stroke: noop, beginPath: noop, closePath: noop,
      moveTo: (x, y) => note(x, y), lineTo: (x, y) => note(x, y),
      arc: (x, y, rad) => note(x, y, rad),
      ellipse: (x, y, rx, ry) => note(x, y, Math.max(rx, ry)),
      createRadialGradient: () => grad, createLinearGradient: () => grad,
      set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {}, set globalAlpha(v) {},
    };
    // drawDetailedEarth is module-private: slice the tool's own Earth block and run
    // it, rather than re-implementing it here.
    const src = readFileSync(FILE, 'utf8');
    const a = src.indexOf('  var MM_EARTH_LAND = [');
    const z = src.indexOf('Detailed Moon with procedural craters and mare');
    expect(a, 'Earth block not found').toBeGreaterThan(-1);
    expect(z, 'Earth block end not found').toBeGreaterThan(a);
    const block = src.slice(a, src.lastIndexOf('\n', z));
    const drawDetailedEarth = new Function(block + '\nreturn drawDetailedEarth;')();
    for (const tick of [0, 500, 2000, 4000]) drawDetailedEarth(ctx, 128, 128, 86, tick);
    expect(maxReach, 'furthest drawn extent from the centre').toBeGreaterThan(86);
    expect(maxReach, 'furthest drawn extent from the centre').toBeLessThanOrEqual(86 * 1.45 + 1e-9);
  });
});
