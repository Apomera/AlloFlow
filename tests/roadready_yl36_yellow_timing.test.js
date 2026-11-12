import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 36, yellow lane (yl36): every traffic light's yellow change interval comes from the approach speed.
// Sources (quoted in lane_yellow NOTES.md):
//  - FHWA Signal Timing Manual (FHWA-HOP-08-024), Equation 5-2: CP = [t + 1.47v / 2(a + 32.2g)] + [(W + Lv) / 1.47v],
//    "the values of t = 1.0 s, a = 10 ft/s2, and Lv = 20 ft are often cited"; Table 5-7 (yellow and all-red terms).
//  - CDOT 2024 guideline Table 4 (yellow by speed and grade, rounded up to 0.1 s).
//  - MUTCD 11th ed. 4F.17 par. 13: yellow 3 to 6 s; red clearance not over 6 s.
//  - MaineDOT Traffic Signal Design and Operation: "Yellow and Red clearance intervals shall be rounded up to the
//    nearest half second."
// The expected values here are computed from the published formula in this file, not read from the tool.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const halfUp = (s) => Math.ceil(s * 2 - 1e-9) / 2;
const ite = (mph, gradePct = 0) => 1.0 + (1.47 * mph) / (2 * (10 + 32.2 * gradePct / 100));
const yellowExpected = (mph, gradePct = 0) => Math.max(3, Math.min(6, halfUp(ite(mph, gradePct))));
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready yl36: the yellow change interval from the approach speed', () => {
  it.each([[25, 3.0], [30, 3.5], [35, 4.0], [40, 4.0], [45, 4.5], [55, 5.5]])('%s mph: the ITE formula, rounded up to the half second (%s s)', (mph, seconds) => {
    expect(typeof RR.rrYellowSeconds).toBe('function');
    expect(RR.rrYellowSeconds(mph, 0)).toBe(yellowExpected(mph, 0));
    expect(RR.rrYellowSeconds(mph, 0)).toBe(seconds);
    expect(RR.rrYellowSeconds(mph, 0)).toBeGreaterThanOrEqual(ite(mph, 0)); // never shorter than the formula
  });

  it('the formula itself matches the published tables (FHWA Table 5-7 yellow column; CDOT Table 4 at 40 mph)', () => {
    // FHWA STM Table 5-7 "t + v/2a" (1 decimal); 25 mph is printed as 3.0 with the 3 s minimum note.
    const table57 = { 30: 3.2, 35: 3.6, 40: 3.9, 45: 4.3, 50: 4.7, 55: 5.0, 60: 5.4 };
    for (const [mph, y] of Object.entries(table57)) expect(Math.abs(ite(+mph) - y)).toBeLessThan(0.051);
    // CDOT Table 4, 40 mph row, grade -6 % .. +6 %, rounded UP to the nearest tenth.
    const cdot40 = [4.7, 4.6, 4.4, 4.3, 4.2, 4.1, 4.0, 3.9, 3.8, 3.7, 3.7, 3.6, 3.5];
    cdot40.forEach((y, i) => expect(Math.ceil(ite(40, i - 6) * 10 - 1e-9) / 10).toBe(y));
    // and the tool's function follows the grade the same way
    for (let g = -6; g <= 6; g++) expect(RR.rrYellowSeconds(40, g)).toBe(yellowExpected(40, g));
  });

  it('stays inside the MUTCD 3 to 6 s range and never shortens as the speed rises', () => {
    let last = 0;
    for (let mph = 0; mph <= 90; mph += 1) {
      const y = RR.rrYellowSeconds(mph, 0);
      expect(y).toBeGreaterThanOrEqual(3); expect(y).toBeLessThanOrEqual(6);
      expect(y).toBeGreaterThanOrEqual(last); last = y;
      for (const g of [-10, -5, 5, 10]) { const yg = RR.rrYellowSeconds(mph, g); expect(yg).toBeGreaterThanOrEqual(3); expect(yg).toBeLessThanOrEqual(6); }
    }
    expect(RR.rrYellowSeconds(40, -4)).toBeGreaterThanOrEqual(RR.rrYellowSeconds(40, 0)); // downhill: longer
    expect(RR.rrYellowSeconds(65, -10)).toBe(6);
  });

  it('red clearance is the second term, (W + 20 ft) / 1.47v, rounded up to the half second, 1 to 6 s', () => {
    // FHWA Table 5-7 all-red column, 30 mph and 50 ft: 1.6 s -> 2.0 s
    expect(RR.rrRedClearanceSeconds(30, 50)).toBe(halfUp((50 + 20) / (1.47 * 30)));
    expect(RR.rrRedClearanceSeconds(30, 50)).toBe(2);
    expect(RR.rrRedClearanceSeconds(55, 30)).toBe(1); // 0.62 s by the formula: the 1 s floor
    expect(RR.rrRedClearanceSeconds(10, 400)).toBe(6);
  });
});

describe('Road Ready yl36: every light uses it', () => {
  const scenarios = ['suburban', 'night', 'rain', 'downtown', 'school_zone'];

  it('rrSignalTiming: the posted limit at the junction, the steepest downhill approach, the widest crossing', () => {
    for (const id of scenarios) {
      const sc = RR.SCENARIOS.find((s) => s.id === id);
      const world = RR.createScenarioWorld(sc);
      for (let ci = -12; ci <= 12; ci++) {
        const ch = world.getChunk(ci); if (!ch || !ch.hasIntersection) continue;
        const st = ci * RR.CHUNK_SIZE + ch.intersectionY;
        const t = RR.rrSignalTiming(world, ch, st, sc.speedLimit);
        const limit = RR.worldPostedLimitMph(world, ch, sc.speedLimit, st);
        expect(t.approachMph).toBe(limit);
        expect(t.gradePct).toBeLessThanOrEqual(0);
        expect(t.yellowDur).toBe(yellowExpected(limit, t.gradePct));
        const half = RR.roadLayoutFor(ch).roadHalfWidth, stop = 4.1;
        const crossLine = Math.max(stop, half + 0.6);
        const want = Math.max(RR.rrRedClearanceSeconds(limit, (stop + 3.25) * RR.FT_PER_M), RR.rrRedClearanceSeconds(limit, (crossLine + half) * RR.FT_PER_M));
        expect(t.allRedDur).toBe(want);
      }
    }
  });

  it('the streamed light builder (the real chunk block) gives every light its timing', () => {
    const block = cut('for (var sci = currentChunk + loFromTravel', '// Unload distant chunks. Hysteresis');
    const run = new Function('scope', 'with (scope) {' + block + '}');
    const worlds = scenarios.map((id) => [id, RR.SCENARIOS.find((s) => s.id === id)]).map(([id, sc]) => [id, sc, RR.createScenarioWorld(sc)]);
    for (const seed of [3, 11]) worlds.push(['fe' + seed, { id: 'suburban', speedLimit: 25, weather: 'clear', freeExplore: true }, RR.createInfiniteWorld(seed)]);
    let lights = 0;
    for (const [id, sc, iw] of worlds) {
      const signalsRef = { current: [] };
      const scope = { ...RR, iw, currentChunk: 0, loFromTravel: -10, hiFromTravel: 10, signalsRef, trafficRef: { current: [] }, pedsRef: { current: [] },
        currentScenario: sc, scn: sc, spawnStreamedPedestrians: () => [] };
      run(scope);
      for (const s of signalsRef.current) {
        if (s.type !== 'light') continue;
        lights++;
        const ch = iw.getChunk(s._chunk);
        const limit = RR.worldPostedLimitMph(iw, ch, sc.speedLimit, s.y);
        const t = RR.rrSignalTiming(iw, ch, s.y, sc.speedLimit);
        expect(s.yellowDur, id + ' chunk ' + s._chunk).toBe(t.yellowDur);
        expect(s.yellowDur).toBeGreaterThanOrEqual(ite(limit, t.gradePct));
        expect(s.allRedDur).toBe(t.allRedDur);
      }
    }
    expect(lights).toBeGreaterThan(20);
  });

  it('the finite-map lights (spawnSignals) use it too, and no light keeps a hand-typed yellow', () => {
    for (const id of ['suburban', 'night', 'school_zone', 'downtown']) {
      const sc = RR.SCENARIOS.find((s) => s.id === id);
      const lights = RR.spawnSignals(sc).filter((s) => s.type === 'light');
      expect(lights.length).toBeGreaterThan(0);
      lights.forEach((s) => expect(s.yellowDur).toBe(RR.rrYellowSeconds(sc.speedLimit, 0)));
    }
    // every yellowDur written in the source is a flagger's paddle change-over or comes from the function
    const writes = src.match(/yellowDur:\s*[^,}\n]+/g) || [];
    writes.forEach((w) => expect(/rrYellowSeconds|sigTiming|isFlagger \? 2|yellowDur: 2$/.test(w.trim()), w).toBe(true));
  });

  it('updateSignals runs the new durations: green, yellow, red clearance, cross green, cross yellow, red clearance', () => {
    const t = { yellowDur: RR.rrYellowSeconds(40, 0), allRedDur: 1.5 };
    const s = { type: 'light', state: 'green', timer: 0, greenDur: 8, redDur: 6, yellowDur: t.yellowDur, allRedDur: t.allRedDur };
    const seen = [];
    for (let i = 0; i < 400; i++) { RR.updateSignals([s], 0.1); const k = s._phase; if (!seen.length || seen[seen.length - 1].p !== k) seen.push({ p: k, at: i }); }
    const lengths = {}; for (let i = 1; i < seen.length - 1; i++) lengths[seen[i].p] = (seen[i + 1].at - seen[i].at) / 10;
    expect(lengths.main_yellow).toBeCloseTo(4, 5);
    expect(lengths.cross_yellow).toBeCloseTo(4, 5);
    expect(lengths.all_red_to_cross).toBeCloseTo(1.5, 5);
    expect(lengths.all_red_to_main).toBeCloseTo(1.5, 5);
    expect(lengths.cross_green).toBeCloseTo(6, 5);
  });
});
