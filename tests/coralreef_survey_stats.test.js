import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Lane srv: the pure survey statistics behind the spread figures, the
// sampling-effort explorer and the claim checker. Every number they produce
// is checked against an independent computation from the real survey functions.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X, S;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey; });

const r1 = (v) => Math.round(v * 10) / 10;
// A saved entry built the way the Results step builds one.
function entry(siteId, n, mutate) {
  const site = X.siteById(siteId), seed = S.transectSeed(site, n), L = X.buildTransect(site, seed), records = {};
  L.points.forEach((p, i) => { records[i] = p.category; });
  if (mutate) mutate(records, L);
  const score = X.scoreSurvey(L, records, X.fishInBelt(L)), fish = {};
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  return { id: X.surveyEntryId(site, seed), siteId, seed, transect: n, modelYear: null, at: 1, agreement: score.agreement, recorded: Object.keys(records).length, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
}
// A synthetic entry with chosen indicator values (old-log shape: no records, no at).
function fake(siteId, n, live, algae, grazers) {
  return { id: siteId + ':' + n, siteId, seed: n, transect: n, modelYear: null, recorded: 40, agreement: 40,
    cover: { hard_coral: live, bleached_coral: 0, recently_dead_coral: 0, macroalgae: algae, rock: 100 - live - algae, rubble: 0, sand: 0 },
    indicators: { liveCoral: live, bleachedShare: 0, macroalgae: algae, coralToAlgae: algae ? r1(live / algae) : null },
    fish: { parrotfish: grazers, surgeonfish: 0, butterflyfish: 1, grouper: 0, snapper: 0 } };
}

describe('replicate statistics', () => {
  it('gives the mean, lowest, highest and spread of every transect at a reef, matching summarizeLog', () => {
    const log = [entry('reserve', 1), entry('reserve', 2), entry('reserve', 3), entry('harbor', 1), entry('harbor', 2)];
    const groups = X.summarizeLog(log);
    for (const g of groups) {
      const st = S.groupStats(g.entries), live = g.entries.map((e) => e.indicators.liveCoral);
      expect(st.live.n).toBe(g.entries.length);
      expect(st.live.mean).toBe(g.liveMean);
      expect(st.live.min).toBe(Math.min(...live)); expect(st.live.max).toBe(Math.max(...live));
      expect(st.live.spread).toBe(r1(Math.max(...live) - Math.min(...live)));
      expect(st.algae.mean).toBe(g.algaeMean);
      expect(st.grazers.mean).toBe(g.grazers); expect(st.butterfly.mean).toBe(g.butterfly); expect(st.predators.mean).toBe(g.predators);
    }
    // Three reserve transects really differ from each other.
    expect(S.groupStats(groups[0].entries).live.spread).toBeGreaterThan(0);
  });

  it('ignores values that are missing and copes with old saved entries', () => {
    expect(S.stats([4, null, 'x', 8, NaN])).toMatchObject({ n: 2, mean: 6, min: 4, max: 8, spread: 4 });
    expect(S.stats([])).toBeNull();
    const old = fake('reserve', 1, 30, 10, 4); delete old.indicators; delete old.fish.surgeonfish;
    expect(S.entryValue(old, 'live')).toBe(30); expect(S.entryValue(old, 'algae')).toBe(10); expect(S.entryValue(old, 'grazers')).toBe(4);
    const noFish = fake('reserve', 2, 30, 10, 4); delete noFish.fish;
    expect(S.entryValue(noFish, 'grazers')).toBeNull();
    expect(S.groupStats([old, noFish]).grazers).toMatchObject({ n: 1, mean: 4 });
  });

  it('calls two reefs clearly different only when their transect ranges do not overlap', () => {
    const st = (vals) => S.stats(vals);
    expect(S.compareStats(st([40, 44]), st([10, 20]))).toEqual({ diff: 27, higher: 'a', certainty: 'clear' });
    expect(S.compareStats(st([30, 44]), st([20, 32])).certainty).toBe('overlap');
    expect(S.compareStats(st([30, 44]), st([20, 30])).certainty).toBe('overlap');
    expect(S.compareStats(st([40]), st([10, 20])).certainty).toBe('few');
    expect(S.compareStats(st([10, 20]), st([10, 20])).higher).toBe('same');
    expect(S.compareStats(st([10, 12]), st([30, 32]))).toMatchObject({ higher: 'b', certainty: 'clear' });
  });
});

describe('sampling effort', () => {
  const live = (p) => p.category === 'hard_coral' || p.category === 'bleached_coral';
  const share = (pts) => r1(pts.filter(live).length / pts.length * 100);

  it('estimates from every 4th, every 2nd and all points of the learner tape, then more tapes, against the whole reef', () => {
    const site = X.siteById('reserve'), L = X.buildTransect(site, site.seed), res = S.effort(site, L, 'live', 1);
    expect(res.truth).toBe(r1((site.cover.hard_coral + site.cover.bleached_coral) * 100));
    expect(res.rows.map((r) => [r.points, r.tapes])).toEqual([[10, 1], [20, 1], [40, 1], [80, 2], [160, 4]]);
    const byId = Object.fromEntries(res.rows.map((r) => [r.id, r]));
    expect(byId.p10.own).toBe(share(L.points.filter((p, i) => i % 4 === 0)));
    expect(byId.p20.own).toBe(share(L.points.filter((p, i) => i % 2 === 0)));
    expect(byId.p40.own).toBe(r1(X.trueCover(L).hard_coral + X.trueCover(L).bleached_coral));
    // The extra tapes are the next transects the Results step would give.
    const t2 = X.buildTransect(site, S.transectSeed(site, 2)), t3 = X.buildTransect(site, S.transectSeed(site, 3)), t4 = X.buildTransect(site, S.transectSeed(site, 4));
    expect(byId.t2.own).toBe(share(L.points.concat(t2.points)));
    expect(byId.t4.own).toBe(share(L.points.concat(t2.points, t3.points, t4.points)));
    for (const r of res.rows) {
      expect(r.sims).toHaveLength(S.SIMS);
      expect(r.ownMiss).toBe(r1(Math.abs(r.own - res.truth)));
      expect(r.typicalMiss).toBe(r1(r.sims.reduce((a, v) => a + Math.abs(v - res.truth), 0) / r.sims.length));
      expect(r.close).toBe(r.sims.filter((v) => Math.abs(v - res.truth) <= S.CLOSE).length);
    }
  });

  it('is the same for the same transect, every time', () => {
    const site = X.siteById('harbor'), L = X.buildTransect(site, 777);
    expect(JSON.stringify(S.effort(site, L, 'algae', 3))).toBe(JSON.stringify(S.effort(site, L, 'algae', 3)));
  });

  it('shrinks the typical miss as the survey grows, but no size is exact for every survey', () => {
    for (const metric of ['live', 'algae']) {
      const avg = {};
      for (const site of X.SITES) {
        const rows = S.effort(site, X.buildTransect(site, site.seed), metric, 1).rows, by = Object.fromEntries(rows.map((r) => [r.id, r]));
        if (S.siteTruth(site, metric) >= 5) {
          expect(by.t4.typicalMiss, site.id + ' ' + metric).toBeLessThan(by.p10.typicalMiss);
          expect(by.t4.typicalMiss, site.id + ' ' + metric).toBeLessThan(by.p40.typicalMiss);
        }
        rows.forEach((r) => { avg[r.id] = (avg[r.id] || 0) + r.typicalMiss / X.SITES.length; });
      }
      expect(avg.p10).toBeGreaterThan(avg.p20); expect(avg.p20).toBeGreaterThan(avg.p40);
      expect(avg.p40).toBeGreaterThan(avg.t2); expect(avg.t2).toBeGreaterThan(avg.t4);
      expect(avg.t4).toBeGreaterThan(0);
    }
  });

  it('keeps the practice surveys apart from the learner transects', () => {
    const site = X.SITES[0], mine = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((n) => S.transectSeed(site, n)));
    for (let k = 0; k < S.SIMS; k++) for (let j = 0; j < 4; j++) expect(mine.has(S.simSeed(site, k, j))).toBe(false);
  });
});

describe('claim checker', () => {
  const groupsOf = (log) => X.summarizeLog(log);
  const two = (a, b) => groupsOf(a.concat(b));
  const check = (groups, type, evidence, a = groups[0].key, b = groups[1].key) => S.checkClaim(groups, { type, a, b, evidence: Object.fromEntries(evidence.map((e) => [e, true])) });

  it('supports a claim when the difference is bigger than the spread', () => {
    const g = two([fake('reserve', 1, 40, 5, 9), fake('reserve', 2, 44, 6, 11)], [fake('harbor', 1, 10, 30, 2), fake('harbor', 2, 16, 34, 3)]);
    const res = check(g, 'more_live', ['live', 'spread']);
    expect(res.status).toBe('supported'); expect(res.items[0]).toMatchObject({ verdict: 'supports', certainty: 'clear', diff: 29 });
    expect(res.needSpread).toBe(false);
    expect(check(g, 'healthier', ['live', 'algae', 'grazers']).status).toBe('supported');
  });

  it('says a difference within the spread is not clear yet, and one transect cannot show the spread', () => {
    const g = two([fake('reserve', 1, 30, 5, 9), fake('reserve', 2, 44, 6, 11)], [fake('harbor', 1, 25, 30, 2), fake('harbor', 2, 35, 34, 3)]);
    const res = check(g, 'more_live', ['live']);
    expect(res.status).toBe('supported_overlap'); expect(res.needSpread).toBe(true);
    const one = two([fake('reserve', 1, 40, 5, 9)], [fake('harbor', 1, 10, 30, 2), fake('harbor', 2, 12, 31, 2)]);
    expect(check(one, 'more_live', ['live']).status).toBe('supported_few');
  });

  it('flags evidence that goes against the claim, mixed evidence and evidence that misses the point', () => {
    const g = two([fake('reserve', 1, 40, 5, 9), fake('reserve', 2, 44, 6, 11)], [fake('harbor', 1, 10, 30, 2), fake('harbor', 2, 16, 34, 3)]);
    expect(check(g, 'more_algae', ['algae']).status).toBe('contradicted');
    expect(check(g, 'more_live', ['live'], g[1].key, g[0].key).status).toBe('contradicted');
    const mixed = two([fake('reserve', 1, 40, 35, 9), fake('reserve', 2, 44, 36, 11)], [fake('harbor', 1, 10, 30, 2), fake('harbor', 2, 16, 34, 3)]);
    expect(check(mixed, 'healthier', ['live', 'algae']).status).toBe('mixed');
    const off = check(g, 'more_live', ['grazers']);
    expect(off.status).toBe('off_topic'); expect(off.items[0].verdict).toBe('extra');
    expect(check(g, 'more_live', []).status).toBe('need_evidence');
    expect(check(g, 'more_live', ['spread']).status).toBe('spread_only');
    expect(check(g, 'more_live', ['live'], g[0].key, g[0].key).status).toBe('need_reefs');
    expect(S.checkClaim(g, { type: 'nonsense' }).status).toBe('need_claim');
    const own = check(g, 'own', ['live']); expect(own.status).toBe('own'); expect(own.items[0].verdict).toBe('info');
  });

  it('tests "more grazing fish, less seaweed" across every pair of reefs', () => {
    const fits = groupsOf([fake('reserve', 1, 40, 5, 14), fake('harbor', 1, 10, 30, 2), fake('heatwave', 1, 20, 15, 8)]);
    expect(check(fits, 'grazers_algae', ['grazers', 'algae'])).toMatchObject({ status: 'link_supported', agree: 3, disagree: 0, reefs: 3 });
    expect(check(fits, 'grazers_algae', ['grazers']).status).toBe('need_both');
    const against = groupsOf([fake('reserve', 1, 40, 35, 14), fake('harbor', 1, 10, 5, 2), fake('heatwave', 1, 20, 15, 8)]);
    expect(check(against, 'grazers_algae', ['grazers', 'algae']).status).toBe('link_contradicted');
    const mostly = groupsOf([fake('reserve', 1, 40, 5, 14), fake('harbor', 1, 10, 30, 2), fake('heatwave', 1, 20, 15, 8), fake('rubble', 1, 5, 2, 1)]);
    const m = check(mostly, 'grazers_algae', ['grazers', 'algae']);
    expect(m.agree + m.disagree + m.ties).toBe(6); expect(m.status).toBe(m.agree > m.disagree ? 'link_mostly' : 'link_mixed');
    expect(check(groupsOf([fake('reserve', 1, 40, 5, 14), fake('harbor', 1, 10, 30, 2)]), 'grazers_algae', ['grazers', 'algae']).status).toBe('link_two');
  });
});

describe('example reefs', () => {
  it('are built by the real survey functions, flagged as examples, and are none of the reefs a learner surveys', () => {
    const log = S.exampleLog(), ids = new Set(X.SITES.map((s) => s.id));
    expect(log.length).toBe(6);
    for (const e of log) {
      expect(e.example).toBe(true); expect(ids.has(e.siteId)).toBe(false);
      const site = S.EXAMPLE_SITES.find((s) => s.id === e.siteId), L = X.buildTransect(site, e.seed);
      expect(e.cover).toEqual(X.scoreSurvey(L, e.records, X.fishInBelt(L)).cover);
      expect(e.indicators).toEqual(X.indicators(e.cover));
    }
    expect(JSON.stringify(S.exampleLog())).toBe(JSON.stringify(log));
  });
});
