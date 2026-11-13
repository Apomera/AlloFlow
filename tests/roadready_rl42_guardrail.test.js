import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 42, lane rail (tag rl42): continuous guardrails. Round 41 (decision 4) found the guardrail was single grid
// cells 3 m apart and a 2 m beam every 6 m. Why: the spline's heading takes a seeded step every metre, and the steps
// repeat every 3 m (the first draw of seededRandom(seed + y * 2654435761) moves on by about 2/3 of its range a metre),
// a zig-zag around the real bend. guardrailSideForRoad read the heading change over 2 m (signedRoadCurvatureAt), so it
// fired on one metre in three, on bends of any radius. It now reads the bend over 12 m (rrGuardrailBendAt), puts rail
// on bends of 60 m radius or tighter (the ra33 curve-sign note: "bends of 40 to 60 m radius") and runs it on along the
// same bend while it stays 100 m or tighter. The cells of a rail row join the next row's (rrGuardrailRowCells), none
// nearer the road than the rail line; the 3D rail is drawn from the same rows (rrGuardrailRailPlan).

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const ROADS = ['rural', 'fog', 'snow', 'dawn'];
const C0 = -30, C1 = 3;
const worlds = {};

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  for (const id of ROADS.concat(['construction'])) worlds[id] = RR.createScenarioWorld(RR.SCENARIOS.find((s) => s.id === id));
});

const centre = (world) => (s) => RR.mainRoadWorldPoint(world, s, 0);
const radius = (world, s) => 1 / Math.max(1e-9, Math.abs(RR.rideAlongPathCurvature(centre(world), s)));
// outside of the bend: the offset point is farther from the centre of the circle through three centre-line points 8 m apart
const onOutside = (world, s, side) => {
  const a = centre(world)(s - 8), b = centre(world)(s), c = centre(world)(s + 8);
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return true;
  const ux = ((a.x * a.x + a.y * a.y) * (b.y - c.y) + (b.x * b.x + b.y * b.y) * (c.y - a.y) + (c.x * c.x + c.y * c.y) * (a.y - b.y)) / d;
  const uy = ((a.x * a.x + a.y * a.y) * (c.x - b.x) + (b.x * b.x + b.y * b.y) * (a.x - c.x) + (c.x * c.x + c.y * c.y) * (b.x - a.x)) / d;
  const o = RR.mainRoadWorldPoint(world, s, side * 4);
  return Math.hypot(o.x - ux, o.y - uy) > Math.hypot(b.x - ux, b.y - uy);
};
// grid rows holding guardrail cells: y -> { side, xs }
const cellRows = (world) => {
  const rows = new Map();
  for (let ci = C0 - 1; ci <= C1 + 1; ci++) {
    const ch = world.getChunk(ci);
    for (let gy = 0; gy < RR.CHUNK_SIZE; gy++) for (let gx = 0; gx < RR.MAP_SIZE; gx++) {
      if (ch.cells[gy][gx] !== 9) continue;
      const y = ci * RR.CHUNK_SIZE + gy;
      const side = RR.mainRoadLocalPoint(world, gx + 0.5, y + 0.5).lateral < 0 ? -1 : 1;
      if (!rows.has(y)) rows.set(y, { side, xs: [] });
      rows.get(y).xs.push(gx);
    }
  }
  return rows;
};
const nearJunction = (world, y) => {
  const ci = Math.floor(y / RR.CHUNK_SIZE);
  for (let k = ci - 1; k <= ci + 1; k++) { const ch = world.getChunk(k); if (ch.hasIntersection && Math.abs(y + 0.5 - (k * RR.CHUNK_SIZE + ch.intersectionY)) < 12) return true; }
  return false;
};

describe('Road Ready rl42: where guardrails stand (the bend, not the 3 m zig-zag)', () => {
  it('the winding roads\' heading steps repeat every 3 m; the 12 m bend (rrGuardrailBendAt) is the 16 m chord circle\'s bend, the 2 m test is not', () => {
    for (const id of ROADS) {
      const sp = worlds[id].spline, steps = [];
      for (let y = -960; y < 96; y++) steps.push(sp.headingAt(y + 1) - sp.headingAt(y));
      const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
      let v = 0, lag3 = 0;
      for (let i = 0; i < steps.length; i++) { v += (steps[i] - mean) ** 2; if (i >= 3) lag3 += (steps[i] - mean) * (steps[i - 3] - mean); }
      expect(lag3 / v, id + ': the steps repeat every 3 m (autocorrelation at 3 m)').toBeGreaterThan(0.8);
      let near12 = 0, near2 = 0, n = 0;
      for (let s = -960; s < 96; s += 2) {
        const chord = -RR.rideAlongPathCurvature(centre(worlds[id]), s); // the chord turns the other way round (sign)
        n++;
        if (Math.abs(RR.rrGuardrailBendAt(sp, s) - chord) < 0.004) near12++;
        if (Math.abs(RR.signedRoadCurvatureAt(sp, s) / 2 - chord) < 0.004) near2++;
      }
      expect(near12 / n, id + ': 12 m bend within 0.004 rad/m of the 16 m chord').toBeGreaterThan(0.9);
      expect(near2 / n, id + ': the old 2 m test, for contrast').toBeLessThan(0.5);
    }
  });

  it.each(ROADS)('%s: rail in whole runs (6 m or more), each on the outside of a bend that gets to 75 m radius or tighter, on every bend of 50 m or tighter (base: runs of 1 to 4 m, on bends up to 700 m)', (id) => {
    const world = worlds[id];
    let run = null; const runs = []; let rail = 0, inside = 0, sharpBare = 0; const radii = [];
    for (let s = C0 * RR.CHUNK_SIZE; s < (C1 + 1) * RR.CHUNK_SIZE; s++) {
      const side = RR.guardrailSideForRoad(world.spline, s), R = radius(world, s + 0.5);
      if (R <= 50 && !side) sharpBare++;
      if (side) { rail++; radii.push(R); if (!onOutside(world, s + 0.5, side)) inside++; }
      if (side && run && run.side === side) { run.len++; run.min = Math.min(run.min, R); }
      else { if (run) runs.push(run); run = side ? { side, len: 1, min: R, from: s } : null; }
    }
    if (run) run.cut = true; // cut by the end of the window
    if (runs.length && runs[0].from === C0 * RR.CHUNK_SIZE) runs.shift(); // cut by its start
    radii.sort((a, b) => a - b);
    expect(rail, id).toBeGreaterThan(200);
    expect(inside, id + ': stations with the rail on the inside of the bend').toBe(0);
    expect(sharpBare, id + ': stations on a bend of 50 m or tighter with no rail').toBe(0);
    expect(runs.filter((r) => r.len < 6).map((r) => r.from), id + ': runs under 6 m').toEqual([]);
    expect(runs.filter((r) => r.min > 75).map((r) => r.from), id + ': runs that never get to a 75 m bend').toEqual([]);
    expect(radii[Math.floor(radii.length * 0.95)], id + ': 95% of rail stations on a bend of 110 m or tighter').toBeLessThanOrEqual(110);
  });

  it('construction (no bend tighter than about 78 m) has no rail; a straight diagonal and a synthetic 25 m bend still behave as roadready_logic pins', () => {
    for (let s = C0 * RR.CHUNK_SIZE; s < (C1 + 1) * RR.CHUNK_SIZE; s++) expect(RR.guardrailSideForRoad(worlds.construction.spline, s), 'construction ' + s).toBe(0);
    expect(RR.guardrailSideForRoad({ headingAt: () => 0.45 }, 10)).toBe(0);
    expect(RR.guardrailSideForRoad({ headingAt: (y) => y * 0.04 }, 10)).toBe(-1);
    expect(RR.guardrailSideForRoad({ headingAt: (y) => -y * 0.04 }, 10)).toBe(1);
    expect(RR.GUARDRAIL_CURVATURE_THRESHOLD).toBeCloseTo(1 / 60, 12);
    expect(RR.RR_GUARDRAIL_RUN_CURVATURE).toBeCloseTo(1 / 100, 12);
  });
});

describe('Road Ready rl42: the guardrail cells are one unbroken barrier, off the pavement', () => {
  it.each(ROADS)('%s: following cell rows share a cell edge (no gap, no diagonal step), no empty rows inside a rail, every corner at or beyond the rail line (base: rows 3 m apart)', (id) => {
    const world = worlds[id], rows = cellRows(world), profile = RR.getContinuousScenarioProfile(id);
    let joins = 0, gaps = [], diagonal = [], holes = [], worst = -Infinity, chunkEdge = 0;
    for (const [y, row] of rows) {
      if (y < C0 * RR.CHUNK_SIZE || y >= (C1 + 1) * RR.CHUNK_SIZE) continue;
      const lo = Math.min(...row.xs), hi = Math.max(...row.xs);
      if (hi - lo + 1 !== row.xs.length) holes.push(y);
      const offset = RR.roadsideOffsetFor(RR.roadProfileAt(world, y, profile), 0.25);
      for (const gx of row.xs) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) worst = Math.max(worst, offset - RR.mainRoadLocalPoint(world, gx + dx, y + dy).lateral * row.side);
      const next = rows.get(y + 1);
      if (next && next.side === row.side) {
        if (Math.min(...next.xs) <= hi && lo <= Math.max(...next.xs)) joins++; else diagonal.push(y);
        if (y % RR.CHUNK_SIZE === RR.CHUNK_SIZE - 1 || y % RR.CHUNK_SIZE === -1) chunkEdge++;
      } else {
        for (let k = 2; k <= 4; k++) { const n = rows.get(y + k); if (n && n.side === row.side && !nearJunction(world, y)) { gaps.push(y); break; } }
      }
    }
    expect(joins, id).toBeGreaterThan(300);
    expect(diagonal, id + ': rows whose cells only meet the next row\'s at a corner, or not at all').toEqual([]);
    expect(gaps, id + ': rows followed by 1-3 empty rows and more rail on the same side').toEqual([]);
    expect(holes, id + ': rows with a hole in their run of cells').toEqual([]);
    expect(worst, id + ': deepest cell corner nearer the road than the rail line (m)').toBeLessThanOrEqual(1e-6);
    expect(chunkEdge, id + ': rails that run on across a chunk boundary (rows 31 and 0)').toBeGreaterThan(0);
  });

  it.each(['sedan', 'suv', 'pickup', 'van'])('Ride-Along stopped for an emergency on its shoulder line (raShoulderOffset) touches no guardrail cell on any rail row: %s (base: a sedan touched one on 12 to 20 rows a road)', (veh) => {
    const size = RR.vehicleFootprint(veh);
    for (const id of ROADS) {
      const world = worlds[id], profile = RR.getContinuousScenarioProfile(id), hits = [];
      for (const [y, row] of cellRows(world)) {
        if (y < C0 * RR.CHUNK_SIZE || y >= (C1 + 1) * RR.CHUNK_SIZE) continue;
        const live = RR.roadProfileAt(world, y + 0.5, profile), layout = RR.roadLayoutFor(live);
        const sign = row.side > 0 ? -1 : 1; // the way of travel whose right shoulder this is
        let off = RR.trafficRightShoulderOffset(live, sign);
        // the Ride-Along block: Math.max(edgeLineOffset - 0.02, Math.min(|shoulder|, pavedHalfWidth - width / 2 - 0.12))
        const mag = Math.max(layout.edgeLineOffset - 0.02, Math.min(Math.abs(off), layout.pavedHalfWidth - size.width * 0.5 - 0.12));
        off = (off < 0 ? -1 : 1) * mag;
        for (const ds of [-0.75, -0.25, 0.25, 0.75]) {
          const p = RR.mainRoadWorldPoint(world, y + 0.5 + ds, off);
          const hit = RR.vehicleGridCollision({ x: p.x, y: p.y, heading: Math.PI / 2 - p.heading + (sign < 0 ? Math.PI : 0) }, size, (cx, cy) => world.getCell(cx, cy));
          if (hit.hit) { hits.push(y + ':' + hit.cell); break; }
        }
      }
      expect(hits, veh + ' on ' + id).toEqual([]);
    }
    expect(src).toContain('raLayoutNow.pavedHalfWidth - raPlayerSize.width * 0.5 - 0.12));');
  });

  it('cross streets: no cell corner on a cross street, and no rail row whose rail point is within 1.1 m of one (the opening kept)', () => {
    for (const id of ROADS) {
      const world = worlds[id], rows = cellRows(world), offset = RR.roadsideOffsetFor(world.getChunk(0), 0.25);
      let junctionRows = 0;
      for (const [y, row] of rows) {
        for (const gx of row.xs) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(RR.crossStreetCorridorAt(world, gx + dx, y + dy, 0), id + ' cell ' + gx + ',' + y).toBeNull();
        const p = RR.rrGuardrailRailPoint(world.spline, y, row.side, offset);
        expect(RR.crossStreetCorridorAt(world, p.x, p.y, 1.1), id + ' row ' + y).toBeNull();
        // the row's cells are rrGuardrailRowCells' run (the generator's), on its side
        const run = RR.rrGuardrailRowCells(world.spline, y, offset, offset);
        expect(run && run.side, id + ' row ' + y).toBe(row.side);
        expect(Math.min(...row.xs) >= run.from && Math.max(...row.xs) <= run.to, id + ' row ' + y + ' cells inside ' + run.from + '..' + run.to).toBe(true);
      }
      for (let y = C0 * RR.CHUNK_SIZE; y < (C1 + 1) * RR.CHUNK_SIZE; y++) {
        const side = RR.guardrailSideForRoad(world.spline, y); if (!side) continue;
        const p = RR.rrGuardrailRailPoint(world.spline, y, side, offset);
        if (RR.crossStreetCorridorAt(world, p.x, p.y, 1.1)) { junctionRows++; expect(rows.has(y), id + ' row ' + y + ' in a junction opening').toBe(false); }
      }
      expect(junctionRows, id + ': rail rows cut for a junction').toBeGreaterThan(0);
    }
  });
});

describe('Road Ready rl42: the 3D rail is drawn from the same rows, post to post', () => {
  it.each(ROADS)('%s: rrGuardrailRailPlan covers exactly the rows that hold cells; each beam starts where the last ended; posts every 2 m of station and at the ends; every beam point within 1.5 m of its row\'s cells', (id) => {
    const world = worlds[id], rows = cellRows(world);
    const covered = new Set(); let posts = 0, beams = 0, far = 0;
    for (let ci = C0; ci <= C1; ci++) {
      const plan = RR.rrGuardrailRailPlan(world, ci, RR.roadsideOffsetFor(world.getChunk(ci), 0.25));
      posts += plan.posts.length; beams += plan.beams.length;
      plan.beams.forEach((b, i) => {
        for (let r = b.fromRow; r <= b.toRow; r++) { covered.add(r); expect(rows.has(r) && rows.get(r).side === b.side, id + ' beam row ' + r + ' has cells on its side').toBe(true); }
        expect(b.toRow - b.fromRow, id + ': a beam spans 1 or 2 rows').toBeLessThanOrEqual(1);
        expect(b.fromRow % 2 === 0 || b.a.end, id + ': a beam starts on an even metre or at a run start').toBe(true);
        const next = plan.beams[i + 1];
        if (next && next.fromRow === b.toRow + 1 && next.side === b.side) expect(Math.hypot(next.a.x - b.b.x, next.a.y - b.b.y), id + ': beams meet').toBeLessThan(1e-9);
        expect(Math.hypot(b.b.x - b.a.x, b.b.y - b.a.y), id + ': beam length').toBeLessThan(2.4);
        for (let k = 0; k <= 10; k++) {
          const x = b.a.x + (b.b.x - b.a.x) * k / 10, y = b.a.y + (b.b.y - b.a.y) * k / 10;
          let best = Infinity;
          for (const ry of [Math.floor(y - 0.05), Math.floor(y + 0.05)]) {
            const row = rows.get(ry); if (!row) continue;
            for (const gx of row.xs) best = Math.min(best, Math.hypot(Math.max(gx - x, 0, x - (gx + 1)), Math.max(ry - y, 0, y - (ry + 1))));
          }
          far = Math.max(far, best);
        }
      });
      // every post is a beam start or a run end
      for (const p of plan.posts) expect(plan.beams.some((b) => b.a === p) || p.end, id + ': post').toBe(true);
    }
    for (const [y] of rows) if (y >= C0 * RR.CHUNK_SIZE && y < (C1 + 1) * RR.CHUNK_SIZE) expect(covered.has(y), id + ': cell row ' + y + ' has a beam over it').toBe(true);
    expect(beams, id).toBeGreaterThan(150);
    expect(posts, id).toBeGreaterThanOrEqual(beams);
    expect(far, id + ': beam point to its row\'s cells (m)').toBeLessThanOrEqual(1.5);
  });

  it('the renderer draws rrGuardrailRailPlan (High detail only): shared shapes, beams pitched to the road height, road marks on one beam in two, no driveway or mailbox by a rail', () => {
    const furniture = src.slice(src.indexOf('              if (isHighLOD && iw.spline) {\n                var furnRng'), src.indexOf("rrBatchCut(chunkGroup, 'furniture');"));
    expect(furniture.length).toBeGreaterThan(1000);
    expect(furniture).toContain('var grPlan = rrGuardrailRailPlan(iw, ci, roadsideOffsetFor(chunk, 0.25)), grRailRows = {};');
    expect(furniture).toContain('var grPostGeo = new T.BoxGeometry(0.08, 1.0, 0.08), grBeamGeo = new T.BoxGeometry(0.06, 0.18, 1);');
    expect(furniture).toContain('var grPost = new T.Mesh(grPostGeo, grPostMat);');
    expect(furniture).toContain('var grRail = new T.Mesh(grBeamGeo, grMat);');
    expect(furniture).toContain('grRail.scale.z = Math.hypot(grSpan, grB.h - grA.h);');
    expect(furniture).toContain("grRail.rotation.order = 'YXZ';");
    expect(furniture).toContain('grRail.rotation.x = -Math.atan2(grB.h - grA.h, grSpan);');
    expect(furniture).toContain('return { x: grPoint.x - MAP_SIZE / 2, h: iw.spline.heightAt(grPoint.station), z: grPoint.y - chunkBY + chunkWorldZ };');
    expect(furniture).toContain('if (positiveModulo(grPlan.beams[grJ].fromRow, 4) >= 2) continue;');
    expect(furniture).toContain('if (rrGuardrailRowsNear(grRailRows, dwZ - chunkWorldZ + chunkBY, dwSide)) continue;');
    expect(furniture).toContain('if (rrGuardrailRowsNear(grRailRows, mbZ - chunkWorldZ + chunkBY, mbSide)) continue;');
    expect(furniture).not.toContain('new T.BoxGeometry(0.06, 0.18, 2.0)');
    // the generator writes the rows the plan reads
    expect(src).toContain('var guardrailCells = rrGuardrailRowCells(spline, guardrailWorldY, generatedGuardrailOffset,');
    expect(src).toContain('    for (var gry = 0; gry < CHUNK_SIZE; gry++) {');
    expect(src).toContain('intersectionPose, guardrailWorldX, guardrailCells.y);');
    const rows = { 10: 1, 11: 1, 30: -1 };
    expect(RR.rrGuardrailRowsNear(rows, 12.4, 1)).toBe(true);
    expect(RR.rrGuardrailRowsNear(rows, 14.0, 1)).toBe(false);
    expect(RR.rrGuardrailRowsNear(rows, 29.0, 1)).toBe(false);
    expect(RR.rrGuardrailRowsNear(rows, 31.9, -1)).toBe(true);
  });
});
