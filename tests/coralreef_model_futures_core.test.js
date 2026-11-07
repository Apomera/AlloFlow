import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

// Reef future, lane mdl: the additive model helpers (trace, many runs, cause
// attribution, starting from a survey, comparing two futures). Every number is
// checked against runScenario itself, and the default model output is pinned
// by a sha256 digest taken from the tool before this lane (11-03 release copy).

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
// Digest of the 90 settings x 5 seeds below. Re-pin ONLY for a deliberate model change.
// 11-03: re-pinned for the new 'typical' default curve; with the default set back to
// 'tolerant' and only the old two curves, the digest was still the pre-lane 91e39554.
const DEFAULT_MODEL_DIGEST = '811d79735b4ec992828e9f00fb7bc50ad551c7a9877b7232f5e0e533b0b60a47';
function load(file) {
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync(file, 'utf8'), { window: win, document: undefined, Math, Object, JSON, Array, Number, String, Date, URL });
  return win.__RR_TEST_EXPORTS__;
}
let X, M;
beforeAll(() => {
  const ex = load(TOOL); X = ex.coralReef; M = ex.coralReefModel;
});

const strip = (rows) => rows.map((r) => { const o = { ...r }; delete o.mdlParts; return o; });
function settingsGrid() {
  const out = [];
  for (const s of X.SCENARIOS) for (const sensitivity of ['tolerant', 'typical', 'sensitive']) for (const herbivores of ['low', 'medium', 'high']) {
    out.push({ ...X.scenarioSettings(s.id), sensitivity, herbivores });
    out.push({ ...X.scenarioSettings(s.id), sensitivity, herbivores, nutrients: 'high', reefStructures: true, restoration: true });
  }
  return out;
}
// Survey log entries made the way ResultsStage saves them, from true records.
function surveyEntry(siteId, n) {
  const site = X.siteById(siteId), seed = (site.seed + (n - 1) * 7919) >>> 0, layout = X.buildTransect(site, seed);
  const records = Object.fromEntries(layout.points.map((p, i) => [i, p.category]));
  const sc = X.scoreSurvey(layout, records, X.fishInBelt(layout)), fish = {};
  sc.fish.forEach((f) => { fish[f.family] = f.density; });
  return { id: X.surveyEntryId(site, seed), siteId, seed, transect: n, modelYear: null, at: 1, agreement: sc.agreement, recorded: 40, records, cover: sc.cover, indicators: X.indicators(sc.cover), fish, modelRun: null };
}

describe('default model output is unchanged', () => {
  it('runScenario, heatSchedule, siteFromModelYear and modelRunSnapshot match the pre-lane tool (digest)', () => {
    const h = createHash('sha256');
    let n = 0;
    for (const st of settingsGrid()) for (const seed of [0, 1, 11, 4127, 99991]) {
      const rows = X.runScenario(st, seed);
      h.update(JSON.stringify(rows)); h.update(JSON.stringify(X.heatSchedule(st, seed)));
      h.update(JSON.stringify(X.siteFromModelYear(rows[seed % 31], st, 77, seed))); h.update(String(X.modelRunSnapshot(st, seed).id));
      n++;
    }
    for (const s of X.SCENARIOS) h.update(JSON.stringify(X.scenarioSettings(s.id)));
    expect(n).toBe(450);
    expect(h.digest('hex')).toBe(DEFAULT_MODEL_DIGEST);
  });

  it('the trace adds mdlParts and changes nothing else', () => {
    for (const st of settingsGrid()) for (const seed of [3, 11]) {
      const plain = X.runScenario(st, seed), traced = X.runScenario(st, seed, true);
      expect(plain.some((r) => 'mdlParts' in r)).toBe(false);
      expect(JSON.stringify(strip(traced))).toBe(JSON.stringify(plain));
      expect(traced[0].mdlParts).toBeUndefined();
      for (let y = 1; y < traced.length; y++) expect(traced[y].mdlParts, 'year ' + y).toBeTruthy();
    }
  });
});

describe('model trace', () => {
  it('adds up: coral and seaweed changes equal the sum of their parts every year', () => {
    for (const st of settingsGrid()) {
      const rows = X.runScenario(st, 11, true);
      for (let y = 1; y < rows.length; y++) {
        const p = rows[y].mdlParts, dC = rows[y].coral - rows[y - 1].coral, dM = rows[y].algae - rows[y - 1].algae;
        expect(Math.abs(p.regrowth + p.recruits + p.fragments + p.planted - p.background - p.overgrowth - p.heat - dC), st.scenarioId + ' y' + y).toBeLessThan(1e-12);
        expect(Math.abs(p.algaeSpread + p.overgrowth - p.grazed - dM)).toBeLessThan(1e-12);
        expect(p.heat).toBe(rows[y].killed);
        for (const k of ['regrowth', 'recruits', 'background', 'overgrowth', 'blocked', 'acidSlowed', 'algaeSpread', 'nutrientSpread', 'grazed', 'fragments', 'planted', 'openSpace']) expect(p[k], k).toBeGreaterThanOrEqual(0);
        expect(p.grazed).toBeLessThanOrEqual(p.grazeDemand + 1e-12);
        expect(p.openSpace).toBeCloseTo(rows[y].hardBottom - rows[y].coral - rows[y].algae, 12);
      }
    }
  });

  it('runoff and acidification show up only when they are on', () => {
    const base = X.scenarioSettings('recent');
    const sum = (rows, k) => rows.slice(1).reduce((a, r) => a + r.mdlParts[k], 0);
    expect(sum(X.runScenario({ ...base, nutrients: 'low' }, 4, true), 'nutrientSpread')).toBe(0);
    expect(sum(X.runScenario({ ...base, nutrients: 'high', herbivores: 'low' }, 4, true), 'nutrientSpread')).toBeGreaterThan(0);
    expect(sum(X.runScenario({ ...base, acidification: false }, 4, true), 'acidSlowed')).toBe(0);
    expect(sum(X.runScenario(base, 4, true), 'acidSlowed')).toBeGreaterThan(0);
    const rub = X.runScenario(X.scenarioSettings('rubble'), 4, true);
    expect(sum(rub, 'fragments') + sum(rub, 'planted')).toBeGreaterThan(0);
    expect(sum(X.runScenario(base, 4, true), 'planted')).toBe(0);
  });
});

describe('many runs', () => {
  it('uses the student seed first, then 19 fixed and distinct seeds', () => {
    for (const seed of [11, 12, 0, 101 + 7919]) {
      const seeds = M.mdlEnsembleSeeds(seed, M.MDL_RUNS);
      expect(seeds).toHaveLength(20);
      expect(seeds[0]).toBe(seed >>> 0);
      expect(new Set(seeds).size).toBe(20);
    }
    expect(M.mdlEnsembleSeeds(11, 20).slice(1)).toEqual(M.mdlEnsembleSeeds(12, 20).slice(1));
  });

  it('is deterministic and its bands are computed from runScenario runs', () => {
    for (const id of ['recent', 'warmer', 'rubble']) for (const seed of [11, 5]) {
      const st = X.scenarioSettings(id), e = M.mdlEnsemble(st, seed), again = M.mdlEnsemble({ ...st }, seed);
      expect(JSON.stringify(again.bands)).toBe(JSON.stringify(e.bands));
      expect(e.count).toBe(20); expect(e.middle).toBe(16);
      expect(e.counts.higher + e.counts.same + e.counts.lower).toBe(20);
      e.seeds.forEach((s, i) => expect(e.finals[i].coral).toBe(X.runScenario(st, s)[30].coral));
      for (const b of e.bands) {
        const v = e.seeds.map((s) => X.runScenario(st, s)[b.year].coral).sort((a, c) => a - c);
        expect(b.min).toBe(v[0]); expect(b.max).toBe(v[19]); expect(b.lo).toBe(v[2]); expect(b.hi).toBe(v[17]);
        expect(b.median).toBe((v[9] + v[10]) / 2);
        expect(b.min <= b.lo && b.lo <= b.median && b.median <= b.hi && b.hi <= b.max).toBe(true);
      }
    }
  });

  it('the band holds the student run in every year, and the student rank adds up', () => {
    for (const seed of [11, 3, 77]) {
      const st = X.scenarioSettings('warmer'), e = M.mdlEnsemble(st, seed), mine = X.runScenario(st, seed);
      e.bands.forEach((b) => { expect(mine[b.year].coral).toBeGreaterThanOrEqual(b.min); expect(mine[b.year].coral).toBeLessThanOrEqual(b.max); });
      expect(e.finals[0].coral).toBe(mine[30].coral);
      const ties = e.finals.filter((f) => Math.abs(f.coral - mine[30].coral) <= 1e-12).length;
      expect(e.yoursBelow + e.yoursAbove + ties).toBe(20);
    }
  });

  it('runs 20 thirty-year runs fast enough for a Chromebook', () => {
    const st = X.scenarioSettings('warmer'), t0 = performance.now();
    for (let k = 0; k < 10; k++) M.mdlEnsemble({ ...st, heatPeakEnd: 12 + k * 0.1 }, k);
    const per = (performance.now() - t0) / 10;
    console.log('[mdl] one 20-run ensemble: ' + per.toFixed(2) + ' ms');
    expect(per).toBeLessThan(150);
  });
});

describe('why coral changed', () => {
  it('the causes match the traced rows and pick the biggest push', () => {
    const st = X.scenarioSettings('warmer'), rows = X.runScenario(st, 11, true);
    expect(M.mdlYearCauses(rows, 0, st)).toBe(null);
    for (let y = 1; y <= 30; y++) {
      const c = M.mdlYearCauses(rows, y, st), p = rows[y].mdlParts;
      expect(c.coral.reduce((a, x) => a + x.amount, 0)).toBeCloseTo(c.change, 12);
      expect(c.coral.find((x) => x.id === 'heat').amount).toBe(-rows[y].killed);
      expect(c.coral.find((x) => x.id === 'regrowth').amount).toBe(p.regrowth + p.recruits);
      const biggest = c.coral.reduce((m, x) => Math.abs(x.amount) > Math.abs(m.amount) ? x : m);
      expect(c.main).toBe(biggest.id);
      expect(c.flags.severe).toBe(rows[y].dhw >= 8);
      expect(c.coralFrom).toBe(rows[y - 1].coral); expect(c.coralTo).toBe(rows[y].coral);
    }
    const drop = M.mdlBiggestDrop(rows), diffs = rows.slice(1).map((r, i) => r.coral - rows[i].coral);
    expect(drop.year).toBe(diffs.indexOf(Math.min(...diffs)) + 1);
    expect(M.mdlYearCauses(rows, drop.year, st).main).toBe('heat');
  });

  it('a sensitive reef with few grazers and heavy runoff shows seaweed holding the space', () => {
    const st = { ...X.scenarioSettings('warmer'), sensitivity: 'sensitive', herbivores: 'low', nutrients: 'high', scenarioId: 'custom' };
    const rows = X.runScenario(st, 11, true), c = M.mdlYearCauses(rows, 25, st);
    expect(c.flags.seaweedHolds).toBe(true); expect(c.flags.fewGrazers).toBe(true);
    expect(c.blocked).toBeGreaterThan(0); expect(c.nutrientSpread).toBeGreaterThan(0);
  });
});

describe('starting from a survey', () => {
  it('turns saved surveys into starting reefs from the measured cover', () => {
    const log = [surveyEntry('harbor', 1), surveyEntry('harbor', 2), surveyEntry('rubble', 1)];
    const starts = M.mdlSurveyStarts(log), groups = X.summarizeLog(log);
    expect(starts.map((s) => s.groupKey)).toEqual(groups.map((g) => g.key));
    for (const s of starts) {
      const g = groups.find((x) => x.key === s.groupKey), tot = X.CATEGORY_IDS.reduce((a, id) => a + g.cover[id], 0);
      expect(s.coral).toBeCloseTo((g.cover.hard_coral + g.cover.bleached_coral) / tot, 3);
      expect(s.algae).toBeCloseTo(g.cover.macroalgae / tot, 3);
      expect(s.hardBottom).toBeCloseTo(1 - (g.cover.rubble + g.cover.sand) / tot, 3);
      expect(s.coral + s.algae).toBeLessThanOrEqual(s.hardBottom + 1e-9);
    }
    expect(starts.find((s) => s.siteId === 'harbor').transects).toBe(2);
    expect(M.mdlSurveyStarts([])).toEqual([]); expect(M.mdlSurveyStarts(undefined)).toEqual([]);
  });

  it('an unfinished transect does not lower the starting cover', () => {
    const full = surveyEntry('reserve', 1), half = JSON.parse(JSON.stringify(full));
    for (const id of X.CATEGORY_IDS) half.cover[id] = full.cover[id] / 2;
    const a = M.mdlStartFromGroup(X.summarizeLog([full])[0]), b = M.mdlStartFromGroup(X.summarizeLog([half])[0]);
    expect(b.coral).toBeCloseTo(a.coral, 2); expect(b.hardBottom).toBeCloseTo(a.hardBottom, 2);
  });

  it('is additive: no start leaves settings and runs untouched; a start sets year 0', () => {
    const st = X.scenarioSettings('recent');
    expect(M.mdlWithStart(st, null)).toBe(st);
    expect(M.mdlPredictKey('recent', null)).toBe('recent');
    const start = M.mdlSurveyStarts([surveyEntry('harbor', 1)])[0];
    expect(M.mdlPredictKey('recent', start)).toBe('recent@survey:harbor');
    const run = X.runScenario(M.mdlWithStart(st, start), 11);
    expect(run[0].coral).toBe(start.coral); expect(run[0].algae).toBe(start.algae); expect(run[0].hardBottom).toBe(start.hardBottom);
    expect(JSON.stringify(X.runScenario(st, 11))).toBe(JSON.stringify(X.runScenario(X.scenarioSettings('recent'), 11)));
    expect(st.startCoral).toBe(0.4);
  });
});

describe('two futures', () => {
  it('reports the year-30 difference, the widest gap and whether the heatwaves were the same', () => {
    const r = X.runScenario(X.scenarioSettings('recent'), 11), p = X.runScenario(X.scenarioSettings('reserve'), 11), w = X.runScenario(X.scenarioSettings('warmer'), 11);
    const a = M.mdlCompareRuns(r, p), b = M.mdlCompareRuns(r, w);
    expect(a.sameHeat).toBe(true); expect(b.sameHeat).toBe(false);
    expect(b.diff).toBe(Math.round(r[30].coral * 100) - Math.round(w[30].coral * 100));
    expect(b.direction).toBe('more');
    expect(M.mdlCompareRuns(w, r).direction).toBe('less');
    const gaps = r.map((row, y) => row.coral - w[y].coral);
    expect(b.gapDiff).toBe(Math.round(gaps.reduce((m, g) => Math.abs(g) > Math.abs(m) ? g : m, 0) * 100));
  });
});
