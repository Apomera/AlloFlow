import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Coral Reef Survey Lab core: the transect a site produces, the survey
// arithmetic students are taught, and the direction of every effect in the
// reef-health model. Numbers the tool SHOWS are computed by running the tool's
// own functions, never re-derived here.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X;
beforeAll(() => {
  const win = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
  vm.runInNewContext(readFileSync(TOOL, 'utf8'), { window: win, document: undefined, Math, Object, JSON, Array, Number, String, Date, URL });
  X = win.__RR_TEST_EXPORTS__.coralReef;
});

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

describe('survey method constants', () => {
  it('uses a 20 m tape, a point every 0.5 m and a 5 m wide belt of 100 m2', () => {
    const c = X.constants;
    expect(c.TRANSECT_M).toBe(20);
    expect(c.POINT_SPACING_M).toBe(0.5);
    expect(c.POINT_COUNT).toBe(c.TRANSECT_M / c.POINT_SPACING_M);
    expect(c.BELT_HALF_WIDTH_M).toBe(2.5);
    expect(c.BELT_AREA_M2).toBe(100);
    expect(c.FISH_IN_MAX_M).toBeLessThan(c.BELT_HALF_WIDTH_M);
    expect(c.FISH_OUT_MIN_M).toBeGreaterThan(c.BELT_HALF_WIDTH_M);
  });
});

describe('transects', () => {
  it('samples each reef: transects average out to the reef cover but differ from each other', () => {
    for (const site of X.SITES) {
      expect(sum(site.cover), site.id + ' cover sums to 1').toBeCloseTo(1, 6);
      const live = [], tally = Object.fromEntries(X.CATEGORY_IDS.map((id) => [id, 0]));
      const N = 400;
      for (let s = 1; s <= N; s++) {
        const c = X.trueCover(X.buildTransect(site, s * 7919));
        for (const id of X.CATEGORY_IDS) tally[id] += c[id];
        live.push(c.hard_coral + c.bleached_coral);
      }
      for (const id of X.CATEGORY_IDS) expect(Math.abs(tally[id] / N - site.cover[id] * 100), site.id + ' ' + id + ' long-run mean').toBeLessThan(2.5);
      const mean = live.reduce((a, b) => a + b, 0) / N;
      const sd = Math.sqrt(live.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (N - 1));
      // Two 20 m transects at one reef should rarely agree exactly: about 7 points of
      // spread for 40 independent points at 30% cover, more because colonies clump.
      if (mean > 20) { expect(sd, site.id + ' spread between transects').toBeGreaterThan(5); expect(sd).toBeLessThan(16); }
    }
  });

  it('is the same for the same seed and different for another seed', () => {
    const site = X.SITES[1];
    const a = X.buildTransect(site, 123), b = X.buildTransect(site, 123), c = X.buildTransect(site, 124);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.points.map((p) => p.category).join()).not.toBe(c.points.map((p) => p.category).join());
  });

  it('places 40 points 0.5 m apart with the site cover and a coral form only on coral', () => {
    for (const site of X.SITES) {
      const t = X.buildTransect(site, site.seed);
      expect(t.points.length).toBe(40);
      t.points.forEach((p, i) => {
        // Reef Check: plumb line at 0.0, 0.5 ... 19.5 m.
        expect(p.distanceM).toBe(i * 0.5);
        expect(X.CATEGORY_IDS.includes(p.category)).toBe(true);
        const coral = ['hard_coral', 'bleached_coral', 'recently_dead_coral'].includes(p.category);
        expect(coral ? X.CORAL_FORMS.includes(p.coralForm) : p.coralForm === null, site.id + ' point ' + i).toBe(true);
      });
      for (const p of t.points) expect(site.cover[p.category] > 0, site.id + ' drew a category the reef does not have').toBe(true);
    }
  });

  it('fish in the belt average the reef density, and each fish is clearly in or clearly out', () => {
    const c = X.constants;
    for (const site of X.SITES) {
      const N = 300, totals = Object.fromEntries(X.FISH_FAMILIES.map((f) => [f, 0]));
      for (let s = 1; s <= N; s++) { const b = X.fishInBelt(X.buildTransect(site, s * 104729)); for (const f of X.FISH_FAMILIES) totals[f] += b[f]; }
      for (const fam of X.FISH_FAMILIES) expect(Math.abs(totals[fam] / N - site.fish[fam]), site.id + ' ' + fam + ' mean per belt').toBeLessThan(Math.max(0.35, site.fish[fam] * 0.12));
      const t = X.buildTransect(site, site.seed);
      for (const f of t.fish) {
        const off = Math.abs(f.offsetM);
        if (f.inBelt) expect(off).toBeLessThanOrEqual(c.FISH_IN_MAX_M); else expect(off).toBeGreaterThanOrEqual(c.FISH_OUT_MIN_M);
        expect(f.alongM).toBeGreaterThan(0); expect(f.alongM).toBeLessThan(20);
      }
      expect(t.fish.some((f) => !f.inBelt), site.id + ' needs distractor fish outside the belt').toBe(true);
    }
  });

  it('keeps fish far enough apart to count them on the map', () => {
    for (const site of X.SITES) for (const seed of [site.seed, 1, 2, 3, 99]) {
      const fish = X.buildTransect(site, seed).fish;
      for (let i = 0; i < fish.length; i++) for (let j = i + 1; j < fish.length; j++) {
        const close = Math.abs(fish[i].alongM - fish[j].alongM) < 1.4 && Math.abs(fish[i].offsetM - fish[j].offsetM) < 0.7;
        expect(close, site.id + ' seed ' + seed + ': ' + fish[i].id + ' and ' + fish[j].id + ' overlap').toBe(false);
      }
    }
  });

  it('describes a point by what can be seen, never by its category name', () => {
    const t = X.buildTransect(X.SITES[2], X.SITES[2].seed);
    for (const p of t.points) {
      const feats = X.pointFeatures(p).filter(Boolean);
      expect(feats.length).toBeGreaterThanOrEqual(3);
      expect(feats.join(' ').includes(p.category)).toBe(false);
    }
    // Bleached and recently dead coral of the same form must differ in what is visible.
    const bleached = X.pointFeatures({ category: 'bleached_coral', coralForm: 'massive' }).join();
    const dead = X.pointFeatures({ category: 'recently_dead_coral', coralForm: 'massive' }).join();
    expect(bleached).not.toBe(dead);
  });
});

describe('survey arithmetic', () => {
  it('computes percent cover as points in a category over 40 points', () => {
    const rec = {};
    for (let i = 0; i < 18; i++) rec[i] = 'hard_coral';
    for (let i = 18; i < 30; i++) rec[i] = 'rock';
    const cover = X.coverFromRecords(rec, 40);
    expect(cover.hard_coral).toBe(45);
    expect(cover.rock).toBe(30);
    expect(cover._recorded).toBe(30);
  });

  it('scores a perfect survey 40 of 40 with the true cover', () => {
    const site = X.SITES[0], t = X.buildTransect(site, site.seed);
    const rec = {}; t.points.forEach((p, i) => { rec[i] = p.category; });
    const fish = X.fishInBelt(t);
    const s = X.scoreSurvey(t, rec, fish);
    expect(s.agreement).toBe(40);
    expect(s.mismatches).toEqual([]);
    for (const id of X.CATEGORY_IDS) expect(s.cover[id]).toBe(s.trueCover[id]);
    for (const f of s.fish) { expect(f.counted).toBe(f.inBelt); expect(f.density).toBe(f.inBelt); }
  });

  it('reports every point recorded wrongly and every point left blank', () => {
    const site = X.SITES[2], t = X.buildTransect(site, site.seed);
    const rec = {}; t.points.forEach((p, i) => { if (i % 4) rec[i] = p.category; });
    rec[1] = rec[1] === 'sand' ? 'rock' : 'sand';
    const s = X.scoreSurvey(t, rec, {});
    expect(s.agreement).toBe(40 - 10 - 1);
    expect(s.mismatches.filter((m) => m.recorded === null).length).toBe(10);
  });

  it('densities are fish per 100 m2', () => {
    expect(X.densityPer100(6, 100)).toBe(6);
    expect(X.densityPer100(3, 50)).toBe(6);
    expect(X.densityPer100(0, 100)).toBe(0);
  });

  it('counts bleached coral as live coral in the indicators', () => {
    const ind = X.indicators({ hard_coral: 20, bleached_coral: 20, macroalgae: 10 });
    expect(ind.liveCoral).toBe(40);
    expect(ind.bleachedShare).toBe(50);
    expect(ind.coralToAlgae).toBe(4);
    expect(X.indicators({ hard_coral: 10, macroalgae: 0 }).coralToAlgae).toBe(null);
  });
});

describe('reef-health model', () => {
  const final = (settings, seed = 11) => { const r = X.runScenario(settings, seed); return r[r.length - 1]; };
  const base = (id = 'recent') => X.scenarioSettings(id);

  it('is deterministic and stays inside the bottom', () => {
    for (const s of X.SCENARIOS) {
      const a = X.runScenario(base(s.id), 5), b = X.runScenario(base(s.id), 5);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      for (const r of a) {
        for (const v of [r.coral, r.algae, r.bleached, r.killed]) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); }
        expect(r.coral + r.algae).toBeLessThanOrEqual(X.MODEL_PARAMS.hardBottom.value + 1e-9);
      }
      expect(a.length).toBe(31);
    }
  });

  it('heat mortality follows its sources and never falls as heat rises', () => {
    // Hughes et al. 2018 (Nature), Great Barrier Reef 2016: almost no loss up to 3 DHW,
    // 40% at 4, 66% at 8, over 80% above 9.
    for (const dhw of [0, 1, 2, 3]) expect(X.heatMortality(dhw, 'sensitive')).toBe(0);
    expect(X.heatMortality(4, 'sensitive')).toBeCloseTo(0.4, 6);
    expect(X.heatMortality(8, 'sensitive')).toBeCloseTo(0.66, 6);
    expect(X.heatMortality(10, 'sensitive')).toBeGreaterThan(0.8);
    // NOAA alert levels 4 and 5: over 50% of corals at 16 DHW, over 80% at 20.
    for (const dhw of [0, 2, 4]) expect(X.heatMortality(dhw, 'tolerant')).toBe(0);
    expect(X.heatMortality(16, 'tolerant')).toBeCloseTo(0.5, 6);
    expect(X.heatMortality(20, 'tolerant')).toBeCloseTo(0.8, 6);
    for (const curve of ['sensitive', 'tolerant']) {
      let prev = 0;
      for (let dhw = 0; dhw <= 24; dhw += 0.5) { const m = X.heatMortality(dhw, curve); expect(m).toBeGreaterThanOrEqual(prev); expect(m).toBeLessThan(1); prev = m; }
    }
    for (let dhw = 1; dhw <= 20; dhw++) expect(X.heatMortality(dhw, 'sensitive')).toBeGreaterThanOrEqual(X.heatMortality(dhw, 'tolerant'));
    expect(X.bleachedShare(8)).toBeGreaterThan(X.bleachedShare(4));
    expect(X.bleachedShare(0)).toBe(0);
  });

  it('regrows a damaged reef in about 12 years without heat, as Scott Reef did', () => {
    // Gilmour et al. 2013: Scott Reef went from 9% to 44% coral cover in 12 years.
    const calm = Object.assign(base('reserve'), { heatPeakStart: 0, heatPeakEnd: 0, startCoral: 0.09, startAlgae: 0.02, acidification: false });
    const rows = X.runScenario(calm, 1);
    const year = rows.findIndex((r) => r.coral >= 0.44);
    expect(year).toBeGreaterThanOrEqual(9);
    expect(year).toBeLessThanOrEqual(15);
  });

  it('a severe heatwave every 6 years leaves a heat-sensitive reef well below where it started', () => {
    // Recovery takes 10 to 15 years and severe bleaching now returns about every 6.
    const mean = (rows) => rows.slice(10).reduce((a, r) => a + r.coral, 0) / (rows.length - 10);
    for (const seed of [1, 2, 3, 4]) {
      const rows = X.runScenario(Object.assign(base('recent'), { sensitivity: 'sensitive' }), seed);
      expect(mean(rows), 'seed ' + seed).toBeLessThan(0.3);
      const mixed = X.runScenario(Object.assign(base('recent'), { sensitivity: 'tolerant' }), seed);
      expect(mean(mixed), 'seed ' + seed).toBeGreaterThan(mean(rows));
    }
  });

  it('defaults to the mixed reef and keeps the heat-sensitive reef one switch away', () => {
    for (const s of X.SCENARIOS) expect(X.scenarioSettings(s.id).sensitivity).toBe('tolerant');
  });

  it('stabilizing a rubble field turns rubble into ground and brings coral back far faster than doing nothing', () => {
    const calm = (s) => Object.assign({}, s, { heatPeakStart: 0, heatPeakEnd: 0 });
    const act = X.scenarioSettings('rubble');
    expect(X.hasActions(act)).toBe(true);
    expect(X.hasActions(X.withoutActions(act))).toBe(false);
    for (const seed of [1, 7, 11]) {
      const withA = X.runScenario(calm(act), seed), none = X.runScenario(calm(X.withoutActions(act)), seed);
      expect(withA[0].hardBottom).toBeCloseTo(act.startHardBottom, 9);
      expect(none[none.length - 1].hardBottom, 'rubble stays rubble without help').toBeCloseTo(act.startHardBottom, 9);
      expect(withA[5].hardBottom, 'frames installed within a few years').toBeGreaterThan(0.75);
      expect(withA[10].coral, 'seed ' + seed).toBeGreaterThan(2 * none[10].coral);
      // Even with the recent heatwave pattern, the restored reef ends ahead.
      const hotWith = X.runScenario(act, seed), hotNone = X.runScenario(X.withoutActions(act), seed);
      expect(hotWith[30].coral, 'seed ' + seed + ' with heat').toBeGreaterThan(hotNone[30].coral);
    }
  });

  it('matches the published restoration numbers', () => {
    const calm = (s) => Object.assign({}, s, { heatPeakStart: 0, heatPeakEnd: 0 });
    const act = X.scenarioSettings('rubble');
    for (const seed of [1, 5, 9]) {
      const none = X.runScenario(calm(X.withoutActions(act)), seed);
      // Fox et al. 2019: untreated blast rubble stayed near 3% coral for 17 years.
      expect(none[17].coral, 'left alone, seed ' + seed).toBeLessThan(0.07);
      const withA = X.runScenario(calm(act), seed);
      // Lange et al. 2024: 17% to 56% on the frames in four years (whole field here, so somewhat lower).
      expect(withA[4].coral, 'restored at year 4, seed ' + seed).toBeGreaterThan(0.35);
      expect(withA[4].coral).toBeLessThan(0.65);
    }
  });

  it('reef structures add only a little ground; coral gardening adds coral', () => {
    const plain = base('recent');
    const withS = X.runScenario(Object.assign({}, plain, { reefStructures: true }), 3);
    const noS = X.runScenario(plain, 3);
    expect(withS[10].hardBottom).toBeGreaterThan(noS[10].hardBottom);
    expect(withS[10].hardBottom - noS[10].hardBottom).toBeLessThan(0.05);
    const g = X.runScenario(Object.assign({}, plain, { restoration: true }), 3);
    expect(g[30].coral).toBeGreaterThan(noS[30].coral);
  });

  it('more frequent, stronger heatwaves leave less coral', () => {
    const mild = Object.assign(base(), { heatIntervalStart: 10, heatIntervalEnd: 10, heatPeakStart: 6, heatPeakEnd: 6 });
    const harsh = Object.assign(base(), { heatIntervalStart: 3, heatIntervalEnd: 3, heatPeakStart: 12, heatPeakEnd: 12 });
    for (const seed of [1, 2, 3, 4, 5]) expect(final(harsh, seed).coral, 'seed ' + seed).toBeLessThan(final(mild, seed).coral);
  });

  it('protecting grazers means less seaweed and more coral', () => {
    for (const seed of [1, 2, 3]) {
      const low = final(Object.assign(base(), { herbivores: 'low' }), seed), high = final(Object.assign(base(), { herbivores: 'high' }), seed);
      expect(high.algae).toBeLessThan(low.algae);
      expect(high.coral).toBeGreaterThan(low.coral);
    }
  });

  it('more runoff means more seaweed', () => {
    for (const seed of [1, 2, 3]) expect(final(Object.assign(base(), { nutrients: 'high' }), seed).algae).toBeGreaterThan(final(Object.assign(base(), { nutrients: 'low' }), seed).algae);
  });

  it('acidification slows coral growth and restoration adds some coral', () => {
    const on = final(Object.assign(base(), { acidification: true }), 3), off = final(Object.assign(base(), { acidification: false }), 3);
    expect(on.coral).toBeLessThan(off.coral);
    const withR = final(Object.assign(base(), { restoration: true }), 3), noR = final(Object.assign(base(), { restoration: false }), 3);
    expect(withR.coral).toBeGreaterThan(noR.coral);
    expect(X.acidFactor(X.MODEL_PARAMS.omegaReference.value)).toBe(1);
    // About 15% slower per unit drop in aragonite saturation (Chan and Connolly 2013).
    expect(X.acidFactor(X.MODEL_PARAMS.omegaReference.value - 1)).toBeCloseTo(0.85, 6);
  });

  it('turns any model year into a surveyable site whose cover sums to 1', () => {
    const settings = base('warmer');
    const rows = X.runScenario(settings, 9);
    for (const row of rows) {
      const site = X.siteFromModelYear(row, settings, 77);
      expect(sum(site.cover)).toBeCloseTo(1, 6);
      for (const v of Object.values(site.cover)) expect(v).toBeGreaterThanOrEqual(0);
      const t = X.buildTransect(site, site.seed);
      expect(t.points.length).toBe(40);
    }
  });
});
