// City Planning Lab stage C (2026-11-03): the pure parts of the coherence
// pass. The learning path, the scorecard memo, the drawn overlays in the 3D
// massing, and the class view's heat / transit / hearing facts, all run.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.CITYLAB_FILE || 'stem_lab/stem_tool_citylab.js';
let P = null;

beforeEach(() => {
  resetStemLab();
  delete window.__alloCityLabPure;
  loadTool(FILE, 'cityLab');
  P = window.__alloCityLabPure;
});

const words = (n) => Array.from({ length: n }, (_, i) => 'w' + i).join(' ');
const ids = (lp) => lp.steps.map((s) => s.id);
const ticks = (lp) => lp.steps.filter((s) => s.done).map((s) => s.id);

describe('stage C - the Start here path', () => {
  it('gives grades 6-8 the worked example and then the five missions, in order', () => {
    const lp = P.learningPath('g68', {}, {}, P.basePlan('riverbend'));
    expect(lp.kind).toBe('missions');
    expect(ids(lp)).toEqual(['example', 'm_park', 'm_bond', 'm_runoff', 'm_town', 'm_heat']);
    expect(lp.next).toBe('example');
    expect(lp.doneCount).toBe(0);
    // Below 6-8 the tool starts on missions too, so the path follows.
    expect(P.learningPath('g35', {}, {}, P.basePlan()).kind).toBe('missions');
  });

  it('gives grades 9-12 brief, Assumption Lab, memo, hearing, access gaps', () => {
    const lp = P.learningPath('g912', {}, {}, P.basePlan('riverbend'));
    expect(lp.kind).toBe('brief');
    expect(ids(lp)).toEqual(['brief', 'lab', 'memo', 'hearing', 'access']);
    expect(lp.next).toBe('brief');
  });

  it('follows a teacher\'s level and drops the hearing a teacher switched off', () => {
    expect(P.learningPath('g912', { level: 'missions' }, {}, P.basePlan()).kind).toBe('missions');
    expect(P.learningPath('g68', { level: 'brief' }, {}, P.basePlan()).kind).toBe('brief');
    expect(ids(P.learningPath('g912', { hearing: 'off' }, {}, P.basePlan()))).toEqual(['brief', 'lab', 'memo', 'access']);
  });

  it('ticks missions from the full record OR the flat flags the autosave keeps, per town', () => {
    const plan = P.basePlan('riverbend');
    let lp = P.learningPath('g68', {}, { missions: { riverbend: { m_park: { done: true }, m_bond: { checks: 3 } } } }, plan);
    // Mission 1 done also ticks the worked example: you cannot pass it without it.
    expect(ticks(lp)).toEqual(['example', 'm_park']);
    expect(lp.next).toBe('m_bond');
    lp = P.learningPath('g68', {}, { missionsDone: { 'riverbend:m_park': true, 'riverbend:m_bond': true, 'mesahollow:m_runoff': true } }, plan);
    expect(ticks(lp)).toEqual(['example', 'm_park', 'm_bond']);
    lp = P.learningPath('g68', {}, { exampleRead: { riverbend: true } }, plan);
    expect(ticks(lp)).toEqual(['example']);
    expect(lp.next).toBe('m_park');
    // Another town's progress never ticks this one.
    expect(P.learningPath('g68', {}, { exampleRead: { mesahollow: true } }, plan).doneCount).toBe(0);
  });

  it('ticks the 9-12 steps from XP ids, the plan and the submissions, never from a guess', () => {
    const plan = Object.assign(P.basePlan('riverbend'), { ranAssumptionLab: true, equity: { priority: 'park', note: '' } });
    const d = { xpAwarded: { citylab_brief_riverbend: true }, memoSubmitted: { riverbend: true }, hearingSubmitted: { mesahollow: true } };
    const lp = P.learningPath('g912', {}, d, plan);
    expect(ticks(lp)).toEqual(['brief', 'lab', 'memo', 'access']);
    expect(lp.next).toBe('hearing');
    // An untouched plan does not meet the brief, so nothing ticks on its own.
    expect(P.learningPath('g912', {}, {}, P.basePlan('harborlight')).doneCount).toBe(0);
  });
});

describe('stage C - the scorecard memo', () => {
  it('returns exactly what the uncached model returns, for every town and set', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      let p = P.setUse(P.basePlan(sid), 'A1', 'mixed');
      p = P.toggleGreenInfra(p, 'A1');
      P.ASSUMPTION_SETS.forEach((s) => {
        expect(JSON.stringify(P.scorecard(p, s.id)), sid + ' ' + s.id).toBe(JSON.stringify(P.scorecardUncached(p, s.id)));
      });
    });
  });

  it('serves a repeat call from the memo, and rescoring a plan mutated after scoring', () => {
    const p = P.basePlan('riverbend');
    const a = P.scorecard(p, 'central');
    expect(P.scorecard(p, 'central')).toBe(a);           // same object: no recompute
    expect(P.scorecard(p, 'optimistic')).not.toBe(a);   // the set is part of the key
    // Mutating in place must not serve a stale scorecard.
    p.uses.D6 = 'park';
    const b = P.scorecard(p, 'central');
    expect(b).not.toBe(a);
    expect(JSON.stringify(b)).toBe(JSON.stringify(P.scorecardUncached(p, 'central')));
    p.transit = { C6: true };
    expect(P.scorecard(p, 'central').transitStops).toEqual(['C6']);
    p.coolRoofs = { D6: true };
    p.uses.D6 = 'mixed';
    expect(P.scorecard(p, 'central').surfaceHeat.D6).toBe(P.scorecardUncached(p, 'central').surfaceHeat.D6);
  });
});

describe('stage C - the 3D model draws cool roofs, bus stops and green infrastructure', () => {
  function overlaid() {
    let p = P.setUse(P.basePlan('riverbend'), 'A6', 'mixed');
    p = P.toggleCoolRoof(p, 'A6');
    p = P.toggleTransit(p, 'C6');
    p = P.toggleGreenInfra(p, 'A6');
    return p;
  }

  it('lists each overlay in the massing, with counts, and leaves the selection marker alone', () => {
    const p = overlaid();
    const m = P.buildMassing(p, 'central', 'D6');
    expect(m.buildings.find((b) => b.id === 'A6').coolRoof).toBe(true);
    expect(m.buildings.filter((b) => b.coolRoof).map((b) => b.id)).toEqual(['A6']);
    expect(m.features.filter((f) => f.kind === 'stop')).toEqual([expect.objectContaining({ id: 'C6', served: true })]);
    expect(m.features.filter((f) => f.kind === 'gi').map((f) => f.id)).toEqual(['A6']);
    expect(m.overlays).toEqual({ coolRoofs: 1, busStops: 1, greenInfra: 1 });
    expect(m.marks.map((x) => x.id)).toEqual(['D6']);
  });

  it('marks a stop no road reaches as unserved, as the scorecard does', () => {
    const p = Object.assign(P.basePlan('riverbend'), { transit: { A1: true } });
    const m = P.buildMassing(p, 'central', null);
    expect(m.features[0]).toMatchObject({ id: 'A1', kind: 'stop', served: false });
    expect(P.scorecard(p, 'central').transitStops).toEqual([]);
  });

  it('rebuilds when an overlay changes', () => {
    const base = P.setUse(P.basePlan('riverbend'), 'A6', 'mixed');
    const sig = P.massingSignature(base, 'central', 'D6');
    expect(P.massingSignature(P.toggleCoolRoof(base, 'A6'), 'central', 'D6')).not.toBe(sig);
    expect(P.massingSignature(P.toggleTransit(base, 'C6'), 'central', 'D6')).not.toBe(sig);
    expect(P.massingSignature(P.toggleGreenInfra(base, 'A6'), 'central', 'D6')).not.toBe(sig);
  });

  it('puts a roof cap, a stop sign and a planted block in the scene', () => {
    // A minimal stand-in for Three.js that records what was added.
    const added = [];
    function V() { this.set = function (x, y, z) { this.x = x; this.y = y; this.z = z; }; }
    const THREE = {
      BoxGeometry: function () {}, PlaneGeometry: function () {},
      Color: function (c) { this.hex = c; },
      MeshLambertMaterial: function (o) { this.color = o.color; },
      Mesh: function (g, mat) { this.material = mat; this.position = new V(); this.scale = new V(); this.rotation = {}; },
      AmbientLight: function () {}, DirectionalLight: function () { this.position = new V(); },
      Vector3: function () {}, DoubleSide: 2, FrontSide: 0
    };
    const S = { model: { add: (o) => added.push(o) } };
    P.buildCityScene(THREE, S, { massing: P.buildMassing(overlaid(), 'central', null), dark: false });
    const colours = added.filter((o) => o.material).map((o) => o.material.color.hex);
    // City Lab 3D W2 (2026-11-04): a mixed-use parcel is now four blocks, one
    // in each corner around its street cross, so ONE cool-roof parcel puts a
    // cap on each of its four roofs (it was one cap on one block).
    expect(colours.filter((c) => c === '#f8fafc')).toHaveLength(4);   // one cool-roof parcel, four roofs
    expect(colours.filter((c) => c === '#facc15')).toHaveLength(1);   // one served stop sign
    expect(colours.filter((c) => c === '#15803d')).toHaveLength(1);   // one planted block
    const roof = added.find((o) => o.material && o.material.color.hex === '#f8fafc');
    const block = P.buildMassing(overlaid(), 'central', null).buildings.find((b) => b.id === 'A6');
    expect(roof.position.y).toBeGreaterThan(block.base + block.height);    // on top, not inside
  });
});

describe('stage C - the class view reports heat, transit and the hearing (measured only)', () => {
  function student(opts) {
    let p = P.basePlan('riverbend');
    ['A9', 'B9'].forEach((id) => { p = P.setUse(p, id, 'mixed'); });
    p = P.setEdge(P.setEdge(p, 'C8', 'C9', 'local'), 'B9', 'C9', 'local');
    p = P.setEdge(p, 'A9', 'B9', 'local');
    if (opts.roofs) p = P.toggleCoolRoof(P.toggleCoolRoof(p, 'A9'), 'B9');
    if (opts.stop) p = P.toggleTransit(p, 'C6');
    if (opts.hearing) {
      p = P.clonePlan(p);
      p.memo = Object.assign(p.memo, { stakeholder: 'rb_homes', counter: 'SECRETCOUNTER ' + words(12),
        rebuttal: 'SECRETREBUTTAL ' + words(14), counterEvidence: opts.theirs ? ['transitAccessPct'] : ['capitalCost'] });
    }
    return p;
  }

  it('counts per plan and in aggregate, and never reads the hearing prose', () => {
    const set = [
      { code: 's1', plan: student({ roofs: true, stop: true, hearing: true, theirs: true }) },
      { code: 's2', plan: student({ stop: true, hearing: true }) },
      { code: 's3', plan: student({}) }
    ];
    const s = P.classSummary(set, 'riverbend', 'central');
    expect(s.rows.map((r) => r.coolRoofParcels)).toEqual([2, 0, 0]);
    expect(s.rows.map((r) => r.newHomeParcels)).toEqual([2, 2, 2]);
    expect(s.rows.map((r) => r.newHomesCovered)).toEqual([2, 0, 0]);
    expect(s.rows.map((r) => r.busStops)).toEqual([1, 1, 0]);
    expect(s.rows[0].transitAccessPct).toBeGreaterThan(0);
    expect(s.rows[2].transitAccessPct).toBe(0);
    // s2 cites a number the homes campaign does not watch: not complete.
    expect(s.rows.map((r) => r.hearingPresent)).toEqual([true, false, false]);
    expect(s.rows.map((r) => r.hearingCitesTheirNumber)).toEqual([true, false, false]);
    expect(s.heatTransit).toEqual({ heatAction: 1, newHomesCovered: 1, anyStop: 2,
      allStop: s.rows.filter((r) => r.busStops && r.transitAccessPct >= 1).length, hearingStarted: 2, hearing: 1 });
    expect(s.stakeholderChoice).toEqual({ rb_homes: 2 });
    const json = JSON.stringify(s);
    expect(json).not.toContain('SECRET');
    // Surface heat is MODELLED, so the class view does not aggregate it.
    expect(json).not.toMatch(/surfaceHeat|homeSurfaceHeat/);
  });

  it('adds the new columns to the CSV after the old ones, with no prose', () => {
    const csv = P.classCsv([{ code: 's1', plan: student({ roofs: true, stop: true, hearing: true, theirs: true }) }], 'riverbend', 'central');
    const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
    const header = lines[0].split(',');
    const row = lines[1].split(',');
    expect(header.slice(0, 15).join(',')).toBe('code,town,hard_met,hard_total,soft_met,soft_total,new_homes,farmland_converted_ha,preserve_converted_ha,homes_in_floodplain,park_access_pct,capital_cost,assumption_lab_run,memo_present,move_budget');
    const col = (name) => row[header.indexOf(name)];
    expect(col('cool_roof_parcels')).toBe('2');
    expect(col('new_home_parcels_cooled')).toBe('2');
    expect(col('bus_stops_reached')).toBe('1');
    expect(Number(col('transit_access_pct'))).toBeGreaterThan(0);
    expect(col('hearing_present')).toBe('yes');
    expect(col('hearing_stakeholder')).toBe('rb_homes');
    expect(col('hearing_cites_their_number')).toBe('yes');
    expect(csv).not.toContain('SECRET');
  });
});
