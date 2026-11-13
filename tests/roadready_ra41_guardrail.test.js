import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 41, lane ra41, F2 (round 40 construction s2, -15 static crash). Guardrail cells (grid value 9) were placed by a
// world-X offset from the centre line. On a bend that is not the road's normal: a cell reached inside the paved
// shoulder and Ride-Along, pulling over for a fire truck, hit it. Cells now stand on the road's normal
// (rrGuardrailRailPoint, the basis the road ribbon is built on), each moved out until no corner is on the pavement
// (rrGuardrailCellAt). The 3D rail (post + beam) reads the same rail point, so the mesh and the cells match.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

const CHUNKS = [-30, 3];
const guardrailCells = (world, ci) => {
  const ch = world.getChunk(ci), out = [];
  for (let gy = 0; gy < RR.CHUNK_SIZE; gy++) for (let gx = 0; gx < RR.MAP_SIZE; gx++) if (ch.cells[gy][gx] === 9) out.push({ gx, y: ci * RR.CHUNK_SIZE + gy });
  return out;
};

describe('Road Ready ra41 F2: guardrails stand off the pavement, on the road normal, and the 3D rail matches the cells', () => {
  // rl42: construction has no bend tighter than about 78 m, so no guardrail now (rails on bends of 60 m or tighter): snow instead.
  it.each(['snow', 'rural', 'dawn'])('%s: no guardrail cell has a corner inside the paved half width (base: 550 of 1,253 cells over five roads, up to 1.56 m in)', (id) => {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === id));
    const profile = RR.getContinuousScenarioProfile(id);
    let cells = 0, worst = 0;
    for (let ci = CHUNKS[0]; ci <= CHUNKS[1]; ci++) {
      for (const c of guardrailCells(world, ci)) {
        const centre = RR.mainRoadLocalPoint(world, c.gx + 0.5, c.y + 0.5), dir = centre.lateral < 0 ? -1 : 1;
        const paved = RR.roadLayoutFor(RR.roadProfileAt(world, c.y, profile)).pavedHalfWidth;
        let min = Infinity;
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) min = Math.min(min, RR.mainRoadLocalPoint(world, c.gx + dx, c.y + dy).lateral * dir);
        cells++; worst = Math.max(worst, paved - min);
      }
    }
    expect(cells).toBeGreaterThan(0);
    expect(worst, id + ': deepest corner inside the paved edge (m)').toBeLessThanOrEqual(1e-6);
  });

  it('the round 40 construction s2 pull-over (pose from the sweep frames, t 98.4): the next 1.2 m of travel touches no guardrail (base: cell 9 at (37, -486))', () => {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'construction'));
    const size = RR.vehicleFootprint('sedan');
    const car = { x: 37.05, y: -482.25, heading: -1.8617 };
    for (let s = 0; s <= 1.2001; s += 0.2) {
      const pose = { x: car.x + Math.cos(car.heading) * s, y: car.y + Math.sin(car.heading) * s, heading: car.heading };
      const hit = RR.vehicleGridCollision(pose, size, (gx, gy) => world.getCell(gx, gy));
      expect(hit.hit, 'advance ' + s.toFixed(1) + ' m: ' + JSON.stringify(hit)).toBe(false);
    }
  });

  it('the rail point lies on the road normal at its station, on the middle of its grid row', () => {
    const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === 'rural'));
    for (const row of [-900, -640, -401, -120, 37]) for (const side of [-1, 1]) {
      const p = RR.rrGuardrailRailPoint(world.spline, row, side, 4.35);
      expect(Math.abs(p.y - (row + 0.5)), 'row ' + row + ': on the row middle within 2 cm').toBeLessThan(0.02);
      const back = RR.mainRoadLocalPoint(world, p.x, p.y);
      expect(Math.abs(back.lateral - side * 4.35), 'row ' + row + ': lateral').toBeLessThan(0.02);
      expect(Math.abs(back.longitudinal - p.station), 'row ' + row + ': station').toBeLessThan(0.02);
      const q = RR.mainRoadWorldPoint(world, p.station, side * 4.35);
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(1e-9);
    }
  });

  it('the 3D rail is built from the same rail point as the cells: every post stands in or within 1.5 m of its row\'s guardrail cell', () => {
    // the renderer (ROADSIDE FURNITURE): rl42: the rail of rrGuardrailRailPlan (the rows that hold cells), posts and
    // beams on the rail line rrGuardrailRailPoint gives (roadready_rl42_guardrail checks the plan against the cells)
    const furniture = src.slice(src.indexOf('                // Guardrails on tight curves: place on the OUTSIDE of any bend'), src.indexOf('                // Mile markers'));
    expect(furniture).toContain('var grSide = guardrailSideForRoad(iw.spline, grGridY);');
    expect(furniture).toContain('var grPlan = rrGuardrailRailPlan(iw, ci, roadsideOffsetFor(chunk, 0.25)), grRailRows = {};');
    expect(furniture).toContain('return { x: grPoint.x - MAP_SIZE / 2, h: iw.spline.heightAt(grPoint.station), z: grPoint.y - chunkBY + chunkWorldZ };');
    expect(furniture).toContain('grPost.position.set(grQ.x, grQ.h + 0.2, grQ.z);');
    expect(furniture).toContain('grRail.position.set((grA.x + grB.x) / 2, (grA.h + grB.h) / 2 + 0.55, (grA.z + grB.z) / 2);');
    expect(src).toContain('var p = rrGuardrailRailPoint(spline, lineY - 0.5, side, offset);');
    // the generator: the cells of a row are rrGuardrailRowCells', which start from rrGuardrailRailPoint
    expect(src).toContain('var guardrailCells = rrGuardrailRowCells(spline, guardrailWorldY, generatedGuardrailOffset,');
    expect(src).toContain('chunk.cells[gry][generatedGuardrailX] = 9;');
    // run the old renderer's sampling (grZ from chunk start + 2, step 2) with the exported functions on two roads.
    // rl42: up to 1.5 m (was 1 m): no cell is nearer the road than the rail line now (Ride-Along's pull-over room),
    // so the first cell can be two steps out from the rail point on a slanted row.
    for (const id of ['snow', 'rural']) {
      const world = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === id));
      let posts = 0, worst = 0;
      for (let ci = CHUNKS[0]; ci <= CHUNKS[1]; ci++) {
        const ch = world.getChunk(ci), by = ci * RR.CHUNK_SIZE, cells = guardrailCells(world, ci);
        for (let s = by + 2; s < by + RR.CHUNK_SIZE - 2; s += 2) {
          const side = RR.guardrailSideForRoad(world.spline, s); if (!side) continue;
          if (ch.hasIntersection && Math.abs(s - (by + ch.intersectionY)) < 12) continue; // junction openings differ (visual clearance)
          const p = RR.rrGuardrailRailPoint(world.spline, s, side, RR.roadsideOffsetFor(ch, 0.25));
          const own = cells.filter((c) => c.y === s);
          expect(own.length, id + ' station ' + s + ': a cell in the post\'s row').toBeGreaterThan(0);
          const d = Math.min(...own.map((c) => Math.hypot(Math.max(c.gx - p.x, 0, p.x - (c.gx + 1)), Math.max(c.y - p.y, 0, p.y - (c.y + 1)))));
          posts++; worst = Math.max(worst, d);
        }
      }
      expect(posts, id).toBeGreaterThan(0);
      expect(worst, id + ': post to its cell (m)').toBeLessThanOrEqual(1.5);
    }
  });
});
