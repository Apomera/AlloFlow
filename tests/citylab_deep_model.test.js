// City Planning Lab deep pass (2026-11-03): the model-side changes.
// Everything here RUNS the model; nothing greps for wording except the key
// scan at the end, which is the i18n gate.
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

beforeAll(() => {
  const registered = [];
  window.StemLab = { registerTool(id, c) { registered.push({ id, cfg: c }); }, isRegistered() { return false; } };
  delete window.__alloCityLabPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloCityLabPure;
  cfg = registered[0].cfg;
});

const useAll = (p, ids, u) => ids.reduce((a, id) => P.setUse(a, id, u), p);
const giAll = (p, ids) => ids.reduce((a, id) => P.toggleGreenInfra(a, id), p);
const roadAll = (p, pairs, k) => pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], k || 'local'), p);

// The compact west-bank plan from city_lab_core.test.js: meets every hard requirement.
function compactWest() {
  const homes = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  ['A', 'B', 'C'].forEach((c) => [1, 2].forEach((r) => homes.push(c + r)));
  homes.push('A3', 'B3');
  let p = useAll(P.basePlan(), homes, 'mixed');
  p = giAll(p, homes);
  p = useAll(p, ['D10', 'D2', 'D12'], 'park');
  const pairs = [];
  for (let r = 8; r <= 11; r++) pairs.push(['C' + r, 'C' + (r + 1)]);
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  for (let r = 2; r <= 5; r++) pairs.push(['C' + r, 'C' + (r - 1)]);
  [1, 2, 3].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  pairs.push(['D2', 'D1']);
  return roadAll(p, pairs);
}

function applyParkExample(sid) {
  let p = P.basePlan(sid);
  P.parkExample(sid).steps.forEach((s) => {
    p = P.setUse(p, s.id, 'park');
    if (s.via) p = P.setEdge(p, s.id, s.via, 'path');
  });
  return p;
}

describe('citylab deep - existing homes and the access rule', () => {
  it('reaches every existing home in every town with the town\'s own roads', () => {
    // Review item :1328: B5/B7 (Riverbend), D4 (Mesa Hollow) and G9
    // (Harborlight) were reported as "no road reaches them" before any edit.
    P.SCENARIO_IDS.forEach((sid) => {
      const s = P.scorecard(P.basePlan(sid), 'central');
      expect(s.tier1.unitsUnserved, sid + ' has existing homes no road reaches').toBe(0);
    });
  });

  it('still does not count a road on the NEXT parcel, for homes or for walking', () => {
    // A5 sits beside A6 on the main street; no link runs into A5.
    const p = P.setUse(P.basePlan('riverbend'), 'A5', 'mixed');
    expect(P.servedParcels(p).A6).toBe(true);
    expect(P.servedParcels(p).A5).toBeUndefined();
    expect(P.scorecard(p, 'central').tier1.unitsUnserved).toBe(60);
    // The walk model agrees: A5 has no distance to anything.
    expect(P.hopsToNearest(p, ['A6']).A5).toBeUndefined();
    // One link into the parcel fixes both at once.
    const q = P.setEdge(p, 'A5', 'A6', 'local');
    expect(P.servedParcels(q).A5).toBe(true);
    expect(P.hopsToNearest(q, ['A6']).A5).toBe(1);
  });

  it('says why a home next to a road is not counted', () => {
    const p = P.setUse(P.basePlan('riverbend'), 'A5', 'mixed');
    const row = P.constraintReport(p, 'central').rows.find((r) => r.id === 'req_units');
    expect(row.detail).toMatch(/60/);
    expect(row.detail).toMatch(/next parcel/);
  });
});

describe('citylab deep - sources and honest ranges', () => {
  it('plans Harborlight for 2100 with allowances inside NOAA 2022 2100 scenarios', () => {
    // NOAA Tech. Rep. NOS 01 (2022): 2100 GMSL Low 0.3 ... High 2.0 m. Its
    // 2020-2050 rise is about 0.25-0.30 m, so 0.6/0.9 m "by 2050" was outside it.
    P.ASSUMPTION_SETS.forEach((s) => {
      expect(s.planningSeaRiseM).toBeGreaterThanOrEqual(0.3);
      expect(s.planningSeaRiseM).toBeLessThanOrEqual(2.0);
    });
    expect(P.ASSUMPTION_SETS.find((s) => s.id === 'optimistic').planningSeaRiseM).toBe(0.3);
    expect(P.ASSUMPTION_SETS.find((s) => s.id === 'conservative').planningSeaRiseM).toBe(1.0);
    const hl = P.SCENARIOS.harborlight;
    const future = hl.requirements.find((r) => r.id === 'req_future_flood');
    expect(future.label).toMatch(/2100/);
    expect(hl.intro + hl.blurb + future.label).not.toMatch(/2050/);
    P.discussionFor('harborlight').forEach((q) => expect(q.question).not.toMatch(/2050/));
  });

  it('keeps every runoff coefficient inside its HEC-22 Table 3-1 range', () => {
    const ranges = { preserve: [0.05, 0.25], farm: [0.08, 0.41], field: [0.10, 0.30], park: [0.10, 0.25],
      housing_low: [0.30, 0.50], housing_mid: [0.60, 0.75], mixed: [0.60, 0.75], commercial: [0.70, 0.95],
      industry: [0.50, 0.80] };
    Object.keys(ranges).forEach((id) => {
      const c = P.USE_BY_ID[id].C;
      expect(c, id).toBeGreaterThanOrEqual(ranges[id][0]);
      expect(c, id).toBeLessThanOrEqual(ranges[id][1]);
    });
  });

  it('labels the civic cost line as clinic scale rather than a whole school', () => {
    const p = P.setUse(P.basePlan('riverbend'), 'A1', 'civic');
    const line = P.capitalCost(p, P.ASSUMPTION_SETS[0]).lines.find((l) => l.id === 'civic');
    expect(line.total).toBe(9000000);
    expect(line.note).toMatch(/school usually costs several times/);
  });
});

describe('citylab deep - predict before commit (pure parts)', () => {
  it('classifies a single edit into direction and rough size', () => {
    expect(P.classifyChange('runoffCoefficient', 0.45 / 144)).toEqual({ direction: 'up', size: 'medium' });
    expect(P.classifyChange('runoffCoefficient', -0.0001)).toEqual({ direction: 'about the same', size: 'none' });
    expect(P.classifyChange('capitalCost', 2800000)).toEqual({ direction: 'up', size: 'large' });
    expect(P.classifyChange('newUnitsServed', -12)).toEqual({ direction: 'down', size: 'small' });
    expect(P.classifyChange('rent', 5), 'a contested quantity was offered for prediction').toBeNull();
  });

  it('never offers a contested indicator, and only offers water or sea level where they exist', () => {
    P.PREDICT_INDICATORS.forEach((p) => expect(P.CONTESTED_IDS).not.toContain(p.id));
    const ids = (sid) => P.predictIndicatorsFor(sid).map((p) => p.id);
    expect(ids('riverbend')).not.toContain('waterDemandM3PerDay');
    expect(ids('mesahollow')).toContain('waterDemandM3PerDay');
    expect(ids('harborlight')).toContain('newUnitsInFutureSurge');
  });

  it('resolves a prediction against the real model', () => {
    const base = P.basePlan('riverbend');
    // A9 has no road, so zoning it adds homes nobody can reach: the count of
    // new homes a road reaches does NOT move, though the runoff does.
    const op = { kind: 'use', id: 'A9', useId: 'housing_mid' };
    const homes = P.resolvePrediction(base, op, 'newUnitsServed', 'up', 'medium').record;
    expect(homes.actual).toBe('about the same');
    const c = P.resolvePrediction(base, op, 'runoffCoefficient', 'down', '').record;
    expect(c.actual).toBe('up');
    expect(c.to).toBeGreaterThan(c.from);
    expect(c.toC).toBeGreaterThan(c.fromC);
  });

  it('applies a staged edit exactly as the direct edit would', () => {
    const base = P.basePlan('riverbend');
    expect(P.applyOp(base, { kind: 'use', id: 'A1', useId: 'park' })).toEqual(P.setUse(base, 'A1', 'park'));
    expect(P.applyOp(base, { kind: 'edge', a: 'A1', b: 'A2', edgeKind: 'path' })).toEqual(P.setEdge(base, 'A1', 'A2', 'path'));
    const housed = P.setUse(base, 'A1', 'mixed');
    expect(P.applyOp(housed, { kind: 'gi', id: 'A1' })).toEqual(P.toggleGreenInfra(housed, 'A1'));
  });
});

describe('citylab deep - saved plans', () => {
  it('restores a saved plan through the import gate, keeping budget, lab flag and predictions', () => {
    const saved = Object.assign(P.basePlan('riverbend'), {
      moveBudget: 30, editCount: 4, ranAssumptionLab: true,
      predictions: [{ guess: 'up', actual: 'up', indicator: 'runoffCoefficient', fn: 'x' }, 'junk']
    });
    saved.uses.A1 = 'lunar_base';   // the old loader copied this straight onto the board
    const p = P.restorePlan(JSON.stringify(saved));
    expect(p.uses.A1).toBe('field');
    expect(p.moveBudget).toBe(30);
    expect(p.ranAssumptionLab).toBe(true);
    expect(p.predictions).toHaveLength(1);
    expect(P.restorePlan('{not json')).toBeNull();
    expect(P.restorePlan('{"v":1,"scenarioId":"atlantis"}')).toBeNull();
  });

  it('migrates a memo that stored the binding constraint as its English label', () => {
    const label = 'Public infrastructure cost at or under the 22 million dollar bond';
    expect(P.normaliseBinding(label, 'riverbend')).toBe('req_cost');
    expect(P.normaliseBinding('req_cost', 'riverbend')).toBe('req_cost');
    const old = P.clonePlan(P.basePlan('riverbend'));
    old.memo = { bindingConstraint: label, tradeoff: 'x', text: '' };
    const fresh = P.clonePlan(P.basePlan('riverbend'));
    fresh.memo = { bindingConstraint: 'req_cost', tradeoff: 'y', text: '', evidence: [] };
    const s = P.classSummary([{ code: 'a', plan: old }, { code: 'b', plan: fresh }, { code: 'c', plan: fresh }], 'riverbend', 'central');
    expect(s.bindingChoice).toEqual({ req_cost: 3 });
  });

  it('carries cited evidence through export and import, dropping unknown ids', () => {
    const p = P.clonePlan(P.basePlan('riverbend'));
    p.memo.evidence = ['capitalCost', 'rent', 'capitalCost', 'parkAccessPct'];
    expect(P.importPlan(JSON.stringify(p)).plan.memo.evidence).toEqual(['capitalCost', 'parkAccessPct']);
  });

  it('checks a memo for evidence without reading the prose', () => {
    const p = P.clonePlan(P.basePlan('riverbend'));
    expect(P.memoReadiness(p).missing).toEqual(['binding', 'tradeoff', 'evidence']);
    p.memo.bindingConstraint = 'req_runoff';
    p.memo.tradeoff = 'one two three four five six seven eight nine ten eleven twelve';
    p.memo.evidence = ['runoffRatio'];
    expect(P.memoReadiness(p).ok).toBe(true);
  });
});

describe('citylab deep - missions', () => {
  it('scales mission targets with the town', () => {
    expect(P.missionTargets('riverbend').homes).toBe(600);
    expect(P.missionTargets('mesahollow').homes).toBe(300);
    expect(P.missionTargets('harborlight').homes).toBe(350);
    expect(P.missionConds('m_town', 'mesahollow').map((c) => c.k)).toContain('water');
    expect(P.missionConds('m_town', 'harborlight').map((c) => c.k)).toContain('future');
  });

  it('meets no mission on the untouched town', () => {
    P.SCENARIO_IDS.forEach((sid) => P.MISSION_IDS.forEach((mid) => {
      expect(P.missionStatus(mid, P.basePlan(sid)).met, sid + ' ' + mid).toBe(false);
    }));
  });

  it('computes a worked park example that really meets the park mission in every town', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      const ex = P.parkExample(sid);
      expect(ex.reaches, sid).toBe(true);
      expect(P.missionStatus('m_park', applyParkExample(sid)).met, sid).toBe(true);
    });
  });

  it('passes the bond and land missions with a plan that meets the brief', () => {
    const p = compactWest();
    ['m_bond', 'm_town'].forEach((mid) => expect(P.missionStatus(mid, p).met, mid).toBe(true));
    // The runoff mission is deliberately tighter than the brief (113% against
    // 125%) for half the homes: the full plan's 1,080 homes overshoot it.
    expect(P.missionStatus('m_runoff', p).met).toBe(false);
  });

  it('passes the runoff mission with exactly the homes it asks for, built with green infrastructure', () => {
    const homes = [];
    ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
    let p = giAll(useAll(P.basePlan('riverbend'), homes, 'mixed'), homes);
    const pairs = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
    [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
    p = roadAll(p, pairs);
    const st = P.missionStatus('m_runoff', p);
    expect(st.conds.find((c) => c.k === 'homes').value).toBe(720);
    expect(st.met).toBe(true);
    // Without the green infrastructure the same plan does not make it.
    const bare = homes.reduce((a, id) => P.toggleGreenInfra(a, id), p);
    expect(P.missionStatus('m_runoff', bare).met).toBe(false);
    expect(P.missionStatus('m_runoff', bare).misconceptions).toContain('hard_surfaces');
  });

  it('names the misconception behind an unmet mission', () => {
    expect(P.diagnoseMission('m_bond', P.setUse(P.basePlan('riverbend'), 'A5', 'mixed'))).toContain('road_next_door');
    expect(P.diagnoseMission('m_bond', P.setUse(P.basePlan('riverbend'), 'L1', 'mixed'))).toContain('unreached_homes');
    expect(P.diagnoseMission('m_park', P.basePlan('riverbend'))).toContain('no_park');
    // E7 is within a straight-line walk of every old-town home, and no street
    // or path runs into it.
    const crow = P.diagnoseMission('m_park', P.setUse(P.basePlan('riverbend'), 'E7', 'park'));
    expect(crow).toContain('crow_flies');
    expect(crow).toContain('park_off_network');
    // A bridge on the bond.
    let b = useAll(P.basePlan('riverbend'), ['G7', 'G8'], 'mixed');
    b = roadAll(b, [['F7', 'G7'], ['G7', 'G8'], ['E7', 'F7'], ['D7', 'E7']]);
    b = useAll(b, ['A1', 'B1', 'C1'], 'civic');
    expect(P.diagnoseMission('m_bond', b)).toEqual(expect.arrayContaining(['civic_cost']));
  });
});

describe('citylab deep - XP and teacher rules', () => {
  it('pays the brief XP only for a plan built here that meets every hard requirement', () => {
    expect(P.briefXpEligible(P.basePlan('riverbend'))).toBe(false);
    const built = compactWest();
    expect(P.constraintReport(built, 'central').allHardMet).toBe(true);
    expect(P.briefXpEligible(built)).toBe(true);
    expect(P.briefXpEligible(Object.assign(P.clonePlan(built), { imported: true }))).toBe(false);
    expect(P.xpId('brief', 'riverbend')).toBe('citylab_brief_riverbend');
    expect(P.xpId('mission', 'mesahollow', 'm_park')).toBe('citylab_mission_mesahollow_m_park');
  });

  it('sanitises teacher settings and picks the starting level by band', () => {
    expect(P.teacherSettings({ lockTown: 'atlantis', moveBudget: -3, setA: 'nope', level: 'x' }))
      .toMatchObject({ lockTown: '', moveBudget: null, setA: 'conservative', level: '', allowReveal: true });
    expect(P.teacherSettings({ lockTown: 'mesahollow', moveBudget: 5000 }).moveBudget).toBe(999);
    expect(P.startingLevel('g68', '', '')).toBe('missions');
    expect(P.startingLevel('g912', '', '')).toBe('brief');
    expect(P.startingLevel('g68', 'brief', '')).toBe('brief');
    expect(P.startingLevel('g912', 'brief', 'missions')).toBe('missions');
  });

  it('names no town-specific number in the housing quest', () => {
    // Review item :2223: "House 1,200 families" completed at 600 or 700.
    const q = cfg.questHooks.find((x) => x.id === 'city_units');
    expect(q.label).not.toMatch(/1,200|600|700/);
    expect(cfg.questHooks.find((x) => x.id === 'city_predict').label).toMatch(/before you make them/);
  });

  it('inserts placeholder values literally', () => {
    expect(P.fmt('a {x} b {x}', { x: '$&$\'' })).toBe('a $&$\' b $&$\'');
  });
});

// The i18n gate: the same extraction the key registration uses.
describe('citylab deep - every string goes through a literal t() call', () => {
  it('calls hundreds of stem.citylab keys, each with one fallback', () => {
    const acorn = require(path.join(root, 'node_modules', 'acorn'));
    const src = fs.readFileSync(sourcePath, 'utf8');
    const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });
    const lit = (n) => {
      if (!n) return null;
      if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
      if (n.type === 'BinaryExpression' && n.operator === '+') { const l = lit(n.left), r = lit(n.right); return l !== null && r !== null ? l + r : null; }
      return null;
    };
    const keys = new Map();
    const dynamic = [];
    (function walk(n) {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'CallExpression') {
        const c = n.callee;
        const name = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && !c.computed ? c.property.name : null);
        if (name === 't' || name === '__alloT') {
          const k = lit(n.arguments[0]);
          if (k === null) dynamic.push(src.slice(n.start, n.start + 60));
          else if (/^stem\.citylab\./.test(k)) {
            if (!keys.has(k)) keys.set(k, new Set());
            keys.get(k).add(lit(n.arguments[1]));
          }
        }
      }
      for (const k of Object.keys(n)) {
        const v = n[k];
        if (Array.isArray(v)) v.forEach((x) => x && typeof x.type === 'string' && walk(x));
        else if (v && typeof v.type === 'string') walk(v);
      }
    })(ast);
    // The host t() wrapper inside render passes k through; that one call is
    // the only non-literal key allowed.
    expect(dynamic.filter((s) => !/^t\(k, fb\)|^ctx\.t\(k, fb\)|^__alloCtx_citylab\.t\(k, fb\)/.test(s))).toEqual([]);
    expect(keys.size).toBeGreaterThan(450);
    const conflicting = [...keys.entries()].filter(([, fbs]) => fbs.size !== 1 || [...fbs][0] === null);
    expect(conflicting.map(([k]) => k)).toEqual([]);
    // The keys that existed before this pass keep their names. City Lab 3D W2
    // (2026-11-04) reworded the 3D model's label for the new town forms, so by
    // the repo's i18n rule it moved to model_description_v2.
    ['stem.citylab.map_view', 'stem.citylab.sr_nothing_to_undo', 'stem.citylab.measured', 'stem.citylab.model_description_v2',
      'stem.citylab.which_constraint_was_binding', 'stem.citylab.what_this_tool_did'].forEach((k) => expect(keys.has(k), k).toBe(true));
  });
});
