// City Planning Lab stage B (2026-11-03): surface heat, bus-stop walk-sheds,
// access gaps, the hearing, the described map and sonification. Everything
// here RUNS the model; the only source-level check is the no-WebGL message.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = process.env.CITYLAB_FILE || path.join(root, 'stem_lab', 'stem_tool_citylab.js');
const require = createRequire(import.meta.url);
let P;
let cfg;
let viewerCfg;

beforeAll(() => {
  const registered = [];
  viewerCfg = null;
  window.StemLab = {
    registerTool(id, c) { registered.push({ id, cfg: c }); },
    isRegistered() { return false; },
    // Captures the config the tool hands the host viewer.
    makeOrbitViewer(c) {
      viewerCfg = c;
      return { attach() {}, push() {}, onStatusChange() {}, dispose() {}, status() { return 'idle'; } };
    }
  };
  delete window.__alloCityLabPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloCityLabPure;
  cfg = registered[0].cfg;
});

const useAll = (p, ids, u) => ids.reduce((a, id) => P.setUse(a, id, u), p);
const giAll = (p, ids) => ids.reduce((a, id) => P.toggleGreenInfra(a, id), p);
const coolAll = (p, ids) => ids.reduce((a, id) => P.toggleCoolRoof(a, id), p);
const roadAll = (p, pairs, k) => pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], k || 'local'), p);
const SET = (id) => P.ASSUMPTION_SETS.find((a) => a.id === id);

// Riverbend's west bank: rows 9-12 of columns A to C, reached from column C.
const WEST = [];
['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => WEST.push(c + r)));
function westRoads(p) {
  const pairs = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
  return roadAll(p, pairs);
}

describe('stage B - the no-WebGL message translates at render time', () => {
  it('reads the 3D failure message through the translator when the viewer asks for it', () => {
    expect(viewerCfg, 'the tool never built a viewer').toBeTruthy();
    // Before any render there is no ctx, so English is the honest fallback.
    expect(viewerCfg.failMessage).toMatch(/3D model is unavailable/);
    const React = require(path.join(root, 'desktop/web-app/node_modules/react'));
    const ReactDOMServer = require(path.join(root, 'desktop/web-app/node_modules/react-dom/server'));
    const ctx = { React, t: (k, fb) => (k === 'stem.citylab.no_3d_fail_message' ? 'MODELE 3D INDISPONIBLE' : fb),
      theme: 'light', toolData: {}, setToolData() {}, announceToSR() {} };
    ReactDOMServer.renderToStaticMarkup(React.createElement(function Panel() { return cfg.render(ctx); }));
    expect(viewerCfg.failMessage).toBe('MODELE 3D INDISPONIBLE');
  });
});

describe('stage B - surface heat (modelled)', () => {
  it('computes the published-range formula by hand on one parcel', () => {
    const c = SET('central');
    const low = P.setUse(P.basePlan(), 'A1', 'housing_low');
    // 0.38 x (38 - 0.25 x 18) = 12.73
    expect(P.surfaceHeatOf(low, 'A1', c)).toBeCloseTo(0.38 * (38 - 0.25 * 18), 9);
    const mixed = P.setUse(P.basePlan(), 'A1', 'mixed');
    const bare = 0.85 * (38 - 0.08 * 18);
    expect(P.surfaceHeatOf(mixed, 'A1', c)).toBeCloseTo(bare, 9);
    // A cool roof takes 28 C off the roof share (40%) only.
    const shaded = 38 - 0.08 * 18;
    expect(P.surfaceHeatOf(P.toggleCoolRoof(mixed, 'A1'), 'A1', c))
      .toBeCloseTo(0.85 * (0.4 * (shaded - 28) + 0.6 * shaded), 9);
    // Green infrastructure adds 15 points of canopy.
    expect(P.surfaceHeatOf(P.toggleGreenInfra(mixed, 'A1'), 'A1', c))
      .toBeCloseTo(0.85 * (38 - 0.23 * 18), 9);
    // Open ground is the reference and water is not land.
    expect(P.surfaceHeatOf(P.basePlan(), 'A1', c)).toBe(0);
    expect(P.surfaceHeatOf(P.basePlan(), 'E6', c)).toBeNull();
  });

  it('is modelled: it moves with the assumption set, conservative hottest', () => {
    const p = westRoads(useAll(P.basePlan(), WEST, 'mixed'));
    const heat = (set) => P.scorecard(p, set).tier2.homeSurfaceHeatC;
    expect(heat('conservative')).toBeGreaterThan(heat('central'));
    expect(heat('central')).toBeGreaterThan(heat('optimistic'));
    expect(P.TIER2_IDS).toEqual(expect.arrayContaining(['surfaceHeatC', 'homeSurfaceHeatC']));
    expect(P.TIER1_IDS).not.toContain('surfaceHeatC');
    const row = P.compareAssumptions(p, 'conservative', 'optimistic').rows.find((r) => r.id === 'surfaceHeatC');
    expect(row.tier).toBe(2);
    expect(row.changed).toBe(true);
  });

  it('weights the home figure by homes a road reaches, and the town figure by land parcels', () => {
    const p = westRoads(useAll(P.basePlan(), WEST, 'mixed'));
    const s = P.scorecard(p, 'central');
    const hs = s.surfaceHeat;
    const land = P.allParcelIds().filter((id) => !P.isWater(id, p));
    const town = land.reduce((a, id) => a + hs[id], 0) / land.length;
    expect(s.tier2.surfaceHeatC).toBeCloseTo(town, 9);
    let w = 0, n = 0;
    P.allParcelIds().forEach((id) => {
      const u = P.USE_BY_ID[p.uses[id]].units;
      if (u > 0 && P.servedParcels(p)[id]) { w += hs[id] * u; n += u; }
    });
    expect(s.tier2.homeSurfaceHeatC).toBeCloseTo(w / n, 9);
  });

  it('lets a cool roof go only where there is a roof, charges the bond nothing, but costs a move', () => {
    const base = P.basePlan();
    expect(P.toggleCoolRoof(base, 'A1')).toBe(base);           // open field, no roof
    const homes = P.setUse(base, 'A1', 'housing_mid');
    const cooled = P.toggleCoolRoof(homes, 'A1');
    expect(cooled.coolRoofs.A1).toBe(true);
    expect(cooled.editCount).toBe(homes.editCount + 1);
    expect(P.scorecard(cooled, 'central').tier2.capitalCost).toBe(P.scorecard(homes, 'central').tier2.capitalCost);
    // Rezoning to open ground takes the overlay with it.
    expect(P.setUse(cooled, 'A1', 'park').coolRoofs.A1).toBeUndefined();
    ['park', 'field', 'farm', 'preserve', 'water'].forEach((u) => expect(P.canCoolRoof(u), u).toBe(false));
  });
});

describe('stage B - bus stops and the walk-shed (measured)', () => {
  it('needs a road into the parcel to add a stop, and charges the bond for it', () => {
    const base = P.basePlan();
    expect(P.toggleTransit(base, 'A1')).toBe(base);            // no road into A1
    expect(P.toggleTransit(base, 'E6')).toBe(base);            // the river
    const withStop = P.toggleTransit(base, 'C6');
    expect(withStop.transit.C6).toBe(true);
    const line = P.scorecard(withStop, 'central').costLines.find((l) => l.id === 'transit');
    expect(line.total).toBe(P.COSTS.transit_stop);
  });

  it('counts homes within 4 steps of a stop that a road from the centre reaches', () => {
    const p = P.toggleTransit(P.basePlan(), 'C6');
    const s = P.scorecard(p, 'central');
    expect(s.transitHopLimit).toBe(4);
    // Every old-town home is within 4 steps of C6 along the existing streets.
    expect(s.tier1.transitAccessPct).toBe(1);
    // Measured: no assumption set moves it.
    expect(P.scorecard(p, 'conservative').tier1.transitAccessPct).toBe(s.tier1.transitAccessPct);
    expect(P.TIER1_IDS).toContain('transitAccessPct');
  });

  it('ignores a stop a bus cannot reach, and lets it be removed', () => {
    // A9 joined to A10 by a road that does not connect to the town centre.
    let p = P.setEdge(P.basePlan(), 'A9', 'A10', 'local');
    p = P.toggleTransit(p, 'A9');
    expect(p.transit.A9).toBe(true);
    expect(P.scorecard(p, 'central').transitStops).toEqual([]);
    expect(P.toggleTransit(P.setEdge(p, 'A9', 'A10', null), 'A9').transit.A9).toBeUndefined();
  });

  it('imports overlays only where they are valid', () => {
    const res = P.importPlan(JSON.stringify({ v: 1, scenarioId: 'riverbend', uses: { A1: 'park', A2: 'mixed' },
      coolRoofs: { A1: true, A2: true, ZZ9: true }, transit: { C6: true, E6: true },
      equity: { priority: 'teleporter', note: 'x' } }));
    expect(res.plan.coolRoofs).toEqual({ A2: true });
    expect(res.plan.transit).toEqual({ C6: true });
    expect(res.plan.equity).toEqual({ priority: '', note: 'x' });
  });

  it('scores an old plan that has none of the stage B fields', () => {
    const old = P.basePlan();
    delete old.coolRoofs; delete old.transit; delete old.equity;
    expect(() => P.scorecard(old, 'central')).not.toThrow();
    expect(P.restorePlan(JSON.stringify(old)).transit).toEqual({});
  });
});

describe('stage B - access gaps (measured, not a score)', () => {
  it('counts the homes missing each of the three, and how many they miss', () => {
    const g = P.accessGaps(P.basePlan('riverbend'));
    expect(g.homes).toBe(120);
    expect(g.lack).toEqual({ park: 120, transit: 120, clinic: 0 });
    expect(g.byMissing).toEqual([0, 0, 120, 0]);
    expect(g.lackAny).toBe(120);
    expect(Object.keys(g)).not.toContain('score');
  });

  it('closes gaps as parks and stops are added', () => {
    let p = P.toggleTransit(P.basePlan('riverbend'), 'C6');
    p = P.setUse(p, 'A6', 'park');                             // the main street runs into A6
    const g = P.accessGaps(p);
    expect(g.lack.transit).toBe(0);
    expect(g.lack.park).toBeLessThan(120);
    expect(g.byMissing.reduce((a, b) => a + b, 0)).toBe(g.homes);
  });

  it('phrases every combination as a whole phrase', () => {
    const combos = [[], ['park'], ['transit'], ['clinic'], ['park', 'transit'], ['park', 'clinic'], ['transit', 'clinic'], ['park', 'transit', 'clinic']];
    const phrases = combos.map((c) => P.gapsPhrase(c));
    expect(new Set(phrases).size).toBe(combos.length);
  });
});

describe('stage B - the heat mission', () => {
  const builtWith = (u, opts) => {
    let p = westRoads(useAll(P.basePlan('riverbend'), WEST, u));
    if (opts.cool) p = coolAll(p, WEST);
    if (opts.gi) p = giAll(p, WEST);
    return p;
  };

  it('sets the target at today\'s homes plus 6 C, rounded up to the half degree', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      const today = P.scorecard(P.basePlan(sid), 'central').tier2.homeSurfaceHeatC;
      expect(P.heatTarget(sid)).toBe(Math.ceil((today + 6) * 2) / 2);
      expect(P.missionConds('m_heat', sid).map((c) => c.k)).toEqual(['homes', 'heat']);
    });
    expect(P.MISSION_IDS).toContain('m_heat');
  });

  it('passes mid density with cool roofs, and mixed use only with cool roofs and shade', () => {
    // 12 parcels of mid density = 540 homes, short of 600: add a 13th and 14th.
    const extra = ['D9', 'D11'];
    let mid = builtWith('housing_mid', { cool: true });
    mid = coolAll(roadAll(useAll(mid, extra, 'housing_mid'), [['C11', 'D11']]), extra);
    expect(P.missionStatus('m_heat', mid).conds.find((c) => c.k === 'homes').met).toBe(true);
    expect(P.missionStatus('m_heat', mid).met).toBe(true);
    const midBare = builtWith('housing_mid', {});
    expect(P.missionStatus('m_heat', midBare).conds.find((c) => c.k === 'heat').met).toBe(false);
    expect(P.missionStatus('m_heat', builtWith('mixed', { cool: true })).met).toBe(false);
    expect(P.missionStatus('m_heat', builtWith('mixed', { cool: true, gi: true })).met).toBe(true);
  });

  it('names the two heat misconceptions on bare, unshaded blocks', () => {
    const mis = P.missionStatus('m_heat', builtWith('mixed', {})).misconceptions;
    expect(mis).toEqual(expect.arrayContaining(['heat_dark_roofs', 'heat_no_shade']));
    const shadedOnly = P.missionStatus('m_heat', builtWith('mixed', { gi: true })).misconceptions;
    expect(shadedOnly).toContain('heat_dark_roofs');
    expect(shadedOnly).not.toContain('heat_no_shade');
  });

  it('judges heat under the central set even when the scorecard uses another', () => {
    const p = Object.assign(builtWith('mixed', { cool: true, gi: true }), { assumptionSetId: 'conservative' });
    expect(P.missionStatus('m_heat', p).met).toBe(true);
  });
});

describe('stage B - the hearing (grades 9-12)', () => {
  const memoPlan = (memo) => Object.assign(P.basePlan('riverbend'), { memo: Object.assign(P.basePlan('riverbend').memo, memo) });
  const words = (n) => Array.from({ length: n }, (_, i) => 'word' + i).join(' ');

  it('gives every town two stakeholders who watch real, visible indicators', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      const shs = P.SCENARIOS[sid].stakeholders;
      expect(shs).toHaveLength(2);
      const visible = P.visibleIndicatorIds(P.TIER1_IDS, sid).concat(P.visibleIndicatorIds(P.TIER2_IDS, sid));
      shs.forEach((s) => {
        expect(s.name.length).toBeGreaterThan(5);
        expect(s.wants.length).toBeGreaterThan(40);
        s.watches.forEach((id) => expect(visible, sid + ' ' + s.id + ' watches ' + id).toContain(id));
        expect(s.wants + s.asks).not.toMatch(/\b\d+(\.\d+)?\s?(percent|%)/);
      });
    });
  });

  it('requires a stakeholder, the objection, an answer and a number that stakeholder watches', () => {
    expect(P.hearingReadiness(memoPlan({})).missing).toEqual(['stakeholder', 'counter', 'rebuttal', 'counterEvidence']);
    const offTopic = memoPlan({ stakeholder: 'rb_farm', counter: words(10), rebuttal: words(12), counterEvidence: ['capitalCost'] });
    expect(P.hearingReadiness(offTopic).missing).toEqual(['relevance']);
    const ok = memoPlan({ stakeholder: 'rb_farm', counter: words(10), rebuttal: words(12), counterEvidence: ['capitalCost', 'farmHa'] });
    expect(P.hearingReadiness(ok).ok).toBe(true);
    expect(P.hearingReadiness(memoPlan({ stakeholder: 'rb_farm', counter: words(9), rebuttal: words(11), counterEvidence: ['farmHa'] })).missing)
      .toEqual(['counter', 'rebuttal']);
  });

  it('adds the hearing to memo readiness only when asked, so the stage A memo is unchanged', () => {
    const p = memoPlan({ bindingConstraint: 'req_cost', tradeoff: words(12), evidence: ['capitalCost'] });
    expect(P.memoReadiness(p).ok).toBe(true);
    expect(P.memoReadiness(p, { hearing: true }).ok).toBe(false);
    expect(P.memoReadiness(p, { hearing: true }).missing).toContain('stakeholder');
  });

  it('defaults the hearing on for 9-12, lets the learner choose, and lets the teacher fix it', () => {
    expect(P.hearingOn('g912', undefined, '')).toBe(true);
    expect(P.hearingOn('g68', undefined, '')).toBe(false);
    expect(P.hearingOn('g68', true, '')).toBe(true);
    expect(P.hearingOn('g912', false, '')).toBe(false);
    expect(P.hearingOn('g68', false, 'on')).toBe(true);
    expect(P.hearingOn('g912', true, 'off')).toBe(false);
    expect(P.teacherSettings({ hearing: 'sometimes' }).hearing).toBe('');
    expect(P.teacherSettings({ hearing: 'on' }).hearing).toBe('on');
  });

  it('imports the hearing fields through the same gate as the rest of the memo', () => {
    const res = P.importPlan(JSON.stringify({ v: 1, scenarioId: 'riverbend',
      memo: { stakeholder: 'mh_irrigation', counter: 'c', rebuttal: 'r', counterEvidence: ['farmHa', 'rent', 'farmHa'] } }));
    expect(res.plan.memo.stakeholder).toBe('');               // another town's stakeholder
    expect(res.plan.memo.counterEvidence).toEqual(['farmHa']);
    expect(P.XP_POINTS.hearing).toBe(10);
  });
});

describe('stage B - the described map', () => {
  it('describes all twelve rows, merging runs, in every view', () => {
    ['use', 'elevation', 'heat', 'access'].forEach((view) => {
      const rows = P.describeMapRows(P.basePlan('riverbend'), view);
      expect(rows, view).toHaveLength(12);
      rows.forEach((r, i) => {
        expect(r.startsWith('Row ' + (i + 1) + ': '), view + ' ' + r).toBe(true);
        expect(r).not.toMatch(/undefined|NaN|\{/);
      });
    });
    const use6 = P.describeMapRows(P.basePlan('riverbend'), 'use')[5];
    expect(use6).toContain('F to J Open field (vacant)');
    expect(use6).toContain('A road runs into A to L.');
    expect(use6).toContain('Homes a road reaches: 12.');
  });

  it('says what each view shows', () => {
    const p = P.toggleTransit(P.basePlan('riverbend'), 'C6');
    expect(P.describeMapRows(p, 'use')[5]).toContain('Bus stop at C.');
    expect(P.describeMapRows(p, 'access')[5]).toContain('B homes with no park nearby');
    expect(P.describeMapRows(p, 'heat')[5]).toMatch(/D very hot/);
    expect(P.describeMapRows(p, 'elevation')[0]).toMatch(/Ground from \d+ m to \d+ m, highest at [A-L]\./);
  });
});

describe('stage B - sonification', () => {
  it('maps slack to pitch and met to timbre, one tone per requirement', () => {
    const rep = P.constraintReport(P.basePlan('riverbend'), 'central');
    const tones = P.sonifyRequirements(rep);
    expect(tones).toHaveLength(rep.rows.length);
    tones.forEach((tn, i) => {
      expect(tn.met).toBe(rep.rows[i].met);
      expect(tn.wave).toBe(rep.rows[i].met ? 'sine' : 'square');
      expect(tn.freq).toBeGreaterThanOrEqual(220);
      expect(tn.freq).toBeLessThanOrEqual(880);
    });
    // Slack 0 is 440 Hz, exactly at the limit.
    const edge = P.sonifyRequirements({ rows: [{ id: 'x', met: true, actual: 100, target: 100, unit: 'count' }] });
    expect(edge[0].freq).toBe(440);
  });

  it('plays a row from its lowest value to its highest across two octaves, with rests for gaps', () => {
    const tones = P.sonifyRow([0, 5, 10, null]);
    expect(tones.map((x) => x.freq)).toEqual([220, 440, 880, null]);
    expect(P.sonifyRow([3, 3]).map((x) => x.freq)).toEqual([440, 440]);
  });
});

describe('stage B - contested tier and contrast', () => {
  it('keeps who rides and what heat does to health contested, and argues mode share', () => {
    ['modeShare', 'ridership', 'heatIllness', 'airTemperature'].forEach((id) => {
      expect(P.CONTESTED_IDS).toContain(id);
      expect(P.renderedIndicatorIds()).not.toContain(id);
    });
    const d = P.SHARED_DISCUSSION.find((x) => x.id === 'disc_mode_share');
    expect(d.sides.length).toBeGreaterThanOrEqual(3);
    expect(d.toolSays).toMatch(/does not model/);
  });

  it('keeps the parcel code legible on every heat and access fill', () => {
    P.HEAT_RAMP.concat(P.ACCESS_RAMP, [P.ACCESS_NONE]).forEach((fill) => {
      expect(P.contrastRatio(P.readableInk(fill), fill), fill).toBeGreaterThanOrEqual(4.5);
    });
    expect(P.HEAT_RAMP).toHaveLength(P.HEAT_BANDS.length + 1);
  });
});
