import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
let registered;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_citylab.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_citylab.js');

beforeAll(() => {
  registered = [];
  window.StemLab = {
    registerTool(id, cfg) { registered.push({ id, cfg }); },
    isRegistered() { return false; }
  };
  delete window.__alloCityLabPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloCityLabPure;
  if (!P) throw new Error('city lab pure hook not exposed');
});

// ---------------------------------------------------------------------
// Fixtures. These exist ONLY as test fixtures and are never shown to a
// student. The scenario is authored so that materially different plans
// can all satisfy it; that property is what the solvability suite checks.
// ---------------------------------------------------------------------
const useAll = (p, ids, u) => ids.reduce((a, id) => P.setUse(a, id, u), p);
const giAll = (p, ids) => ids.reduce((a, id) => P.toggleGreenInfra(a, id), p);
const roadAll = (p, pairs, k) => pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], k || 'local'), p);

function gridRoads(cols, rows) {
  const pairs = [];
  rows.forEach((r) => {
    for (let i = 0; i < cols.length - 1; i++) pairs.push([cols[i] + r, cols[i + 1] + r]);
  });
  cols.forEach((c) => {
    for (let i = 0; i < rows.length - 1; i++) pairs.push([c + rows[i], c + rows[i + 1]]);
  });
  return pairs;
}

// A: a compact mixed-use district on the west bank
function planCompactWest() {
  const base = P.basePlan();
  const homes = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  ['A', 'B', 'C'].forEach((c) => [1, 2].forEach((r) => homes.push(c + r)));
  homes.push('A3', 'B3');
  let p = useAll(base, homes, 'mixed');
  p = giAll(p, homes);
  p = useAll(p, ['D10', 'D2', 'D12'], 'park');
  const pairs = [];
  for (let r = 8; r <= 11; r++) pairs.push(['C' + r, 'C' + (r + 1)]);
  [9, 10, 11, 12].forEach((r) => {
    pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]);
  });
  for (let r = 2; r <= 5; r++) pairs.push(['C' + r, 'C' + (r - 1)]);
  [1, 2, 3].forEach((r) => {
    pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]);
  });
  pairs.push(['D2', 'D1']);
  return { id: 'compact-west', plan: roadAll(p, pairs), homes };
}

// B: mid density spread over two west-bank clusters
function planMidWest() {
  const base = P.basePlan();
  const homes = [];
  ['A', 'B', 'C'].forEach((c) => [1, 2, 3, 4, 9, 10, 11, 12].forEach((r) => {
    if (base.uses[c + r] === 'field') homes.push(c + r);
  }));
  [5, 6, 7, 8].forEach((r) => { if (base.uses['A' + r] === 'field') homes.push('A' + r); });
  let p = useAll(base, homes, 'housing_mid');
  p = giAll(p, homes);
  p = useAll(p, ['D2', 'D10', 'D12', 'D3'], 'park');
  p = roadAll(p, gridRoads(['A', 'B', 'C', 'D'], [1, 2, 3, 4]));
  p = roadAll(p, gridRoads(['A', 'B', 'C', 'D'], [9, 10, 11, 12]));
  p = roadAll(p, [['A4', 'A5'], ['A5', 'A6'], ['A6', 'A7'], ['A7', 'A8'], ['A8', 'A9'],
    ['C8', 'C9'], ['D4', 'D5']]);
  return { id: 'mid-west', plan: p, homes };
}

// C: the east bank, reached over the road-6 bridge that already exists
function planEastBank() {
  const base = P.basePlan();
  const homes = [];
  ['G', 'H', 'I'].forEach((c) => [1, 2, 3, 4, 5].forEach((r) => {
    const t = P.terrainAt(c + r);
    if (!t.floodplain && (t.baseUse === 'field' || t.baseUse === 'farm')) homes.push(c + r);
  }));
  ['H', 'I', 'J'].forEach((c) => [7, 8, 9].forEach((r) => {
    const t = P.terrainAt(c + r);
    if (!t.floodplain && (t.baseUse === 'field' || t.baseUse === 'farm')) homes.push(c + r);
  }));
  homes.length = 20;
  let p = useAll(base, homes, 'mixed');
  p = giAll(p, homes);
  p = useAll(p, ['H6', 'J8', 'J4'], 'park');
  p = roadAll(p, gridRoads(['G', 'H', 'I', 'J'], [1, 2, 3, 4, 5, 6]));
  p = roadAll(p, gridRoads(['H', 'I', 'J'], [6, 7, 8, 9]));
  return { id: 'east-bank', plan: p, homes };
}

const REFERENCE_PLANS = [planCompactWest, planMidWest, planEastBank];

// A plan for Mesa Hollow: mixed-use on the dry scrub north-east of the wash,
// two parks, and some irrigated land retired back to scrub to free the water.
// Deliberately takes no protected desert; an earlier draft of this fixture did
// and passed, which is exactly why req_preserve exists.
function planMesa(retireFarm) {
  const base = P.basePlan('mesahollow');
  const homes = [];
  ['G', 'H'].forEach((c) => [1, 2, 3, 4, 5].forEach((r) => homes.push(c + r)));
  let p = useAll(base, homes, 'mixed');
  p = giAll(p, homes);
  p = useAll(p, ['I2', 'I4'], 'park');
  if (retireFarm) p = useAll(p, ['G9', 'H9', 'G10'], 'field');
  const pairs = [];
  for (let r = 1; r <= 4; r++) {
    pairs.push(['G' + r, 'G' + (r + 1)], ['H' + r, 'H' + (r + 1)], ['I' + r, 'I' + (r + 1)]);
  }
  for (let r = 1; r <= 5; r++) pairs.push(['G' + r, 'H' + r], ['H' + r, 'I' + r]);
  pairs.push(['G5', 'G6'], ['F6', 'G6']);
  return { id: 'mesa', plan: roadAll(p, pairs), homes };
}

describe('City Planning Lab - the scenario registry is data, not logic', () => {
  it('ships more than one town', () => {
    expect(P.SCENARIO_IDS.length).toBeGreaterThan(1);
    expect(P.SCENARIO_IDS).toContain('riverbend');
    expect(P.SCENARIO_IDS).toContain('mesahollow');
  });

  it('gives every town three well-formed 12 by 12 maps', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      const sc = P.SCENARIOS[sid];
      [sc.baseMap, sc.floodMap, sc.elevMap].forEach((map, i) => {
        expect(map, sid + ' map ' + i).toHaveLength(P.N_ROWS);
        map.forEach((row) => expect(row.length, sid + ' row width').toBe(P.N_COLS));
      });
      sc.floodMap.forEach((row) => expect(row).toMatch(/^[01]{12}$/));
      sc.elevMap.forEach((row) => expect(row).toMatch(/^[0-9]{12}$/));
    });
  });

  it('resolves every parcel of every town to a known land use', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      P.allParcelIds().forEach((id) => {
        const t = P.terrainAt(id, sid);
        expect(P.USE_BY_ID[t.baseUse], sid + ' ' + id + ' has an unknown base use').toBeTruthy();
      });
    });
  });

  it('backs every requirement of every town with a check in the registry', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      P.SCENARIOS[sid].requirements.forEach((req) => {
        expect(P.CHECKS[req.id], sid + ' requires ' + req.id + ' but no check defines it').toBeTypeOf('function');
        expect(req.label, sid + ' ' + req.id + ' has no label').toBeTruthy();
      });
    });
  });

  it('starts every town with a core parcel its own road network reaches', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      const served = P.servedParcels(P.basePlan(sid));
      expect(served[P.SCENARIOS[sid].coreParcel], sid + ' core is off its own network').toBe(true);
    });
  });

  it('keeps the plan tied to the town it was drawn for', () => {
    expect(P.basePlan('mesahollow').scenarioId).toBe('mesahollow');
    expect(P.basePlan('riverbend').scenarioId).toBe('riverbend');
    // An unknown id falls back rather than producing a plan with no terrain.
    expect(P.basePlan('atlantis').scenarioId).toBe(P.DEFAULT_SCENARIO);
  });
});

describe('City Planning Lab - the binding constraint belongs to the place', () => {
  // This is the whole reason a second town exists. Riverbend runs out of
  // stormwater capacity and budget; Mesa Hollow runs out of water. Neither
  // limit is a property of the tool.
  it('models water only where there is a water problem', () => {
    expect(P.scenarioOf('mesahollow').modelsWater).toBe(true);
    expect(P.scenarioOf('riverbend').modelsWater).toBe(false);
    const shown = P.visibleIndicatorIds(P.TIER2_IDS, 'riverbend');
    P.WATER_IDS.forEach((id) => expect(shown, 'water shown in a town without it').not.toContain(id));
    const mesaShown = P.visibleIndicatorIds(P.TIER2_IDS, 'mesahollow');
    P.WATER_IDS.forEach((id) => expect(mesaShown).toContain(id));
  });

  it('makes Mesa Hollow unsolvable while every field stays irrigated', () => {
    const kept = planMesa(false).plan;
    const water = P.constraintReport(kept, 'central').rows.find((r) => r.id === 'req_water');
    expect(water.met, 'the farms were supposed to be drinking the water').toBe(false);
  });

  it('lets Mesa Hollow succeed once some irrigated land is retired', () => {
    const rep = P.constraintReport(planMesa(true).plan, 'central');
    const missed = rep.rows.filter((r) => r.hard && !r.met).map((r) => r.id);
    expect(missed).toEqual([]);
  });

  it('poses the two towns opposite questions about farmland', () => {
    // Riverbend asks the student not to eat the farms. Mesa Hollow asks them
    // to keep some, while water pushes the other way.
    const rb = P.SCENARIOS.riverbend.requirements.map((r) => r.id);
    const mh = P.SCENARIOS.mesahollow.requirements.map((r) => r.id);
    expect(rb).toContain('req_farm_max');
    expect(mh).toContain('req_farm_min');
    expect(rb).not.toContain('req_farm_min');
    expect(mh).not.toContain('req_farm_max');
  });

  it('holds the measured tier steady in Mesa Hollow too', () => {
    const cmp = P.compareAssumptions(planMesa(true).plan, 'conservative', 'optimistic');
    const movedTier1 = cmp.rows.filter((r) => r.tier === 1 && r.changed).map((r) => r.id);
    expect(movedTier1).toEqual([]);
  });

  it('makes Mesa Hollow water feasibility genuinely assumption-dependent', () => {
    // Worth asserting rather than hoping: this is the case where the
    // Assumption Lab flips a HARD requirement, which Riverbend never does.
    const plan = planMesa(true).plan;
    const lo = P.constraintReport(plan, 'optimistic').rows.find((r) => r.id === 'req_water');
    const hi = P.constraintReport(plan, 'conservative').rows.find((r) => r.id === 'req_water');
    expect(lo.met).toBe(true);
    expect(hi.met).toBe(false);
  });

  it('judges every town on the protected land it takes', () => {
    // The palette described preserve as land that cannot be built on, and the
    // code let a student rezone it for free. Reporting a number nobody is
    // measured against reads as a statistic rather than a cost.
    P.SCENARIO_IDS.forEach((sid) => {
      expect(P.SCENARIOS[sid].requirements.map((r) => r.id),
        sid + ' does not judge protected land').toContain('req_preserve');
    });
    const base = P.basePlan('mesahollow');
    const preserved = P.allParcelIds().filter((id) => P.terrainAt(id, 'mesahollow').baseUse === 'preserve');
    expect(preserved.length).toBeGreaterThan(0);
    const bulldozed = P.setUse(base, preserved[0], 'mixed');
    const row = P.constraintReport(bulldozed, 'central').rows.find((r) => r.id === 'req_preserve');
    expect(row.met).toBe(false);
  });

  it('keeps every reference plan off protected land', () => {
    [planCompactWest(), planMidWest(), planEastBank(), planMesa(true)].forEach(({ plan, id }) => {
      const row = P.constraintReport(plan, 'central').rows.find((r) => r.id === 'req_preserve');
      expect(row.met, 'reference plan ' + id + ' builds on protected land').toBe(true);
    });
  });

  it('charges no bridge in a town with no river', () => {
    P.allParcelIds().forEach((id) => {
      expect(P.isWater(id, 'mesahollow'), id + ' is water in a desert').toBe(false);
    });
  });
});

describe('City Planning Lab - the contested tier reappears as argument', () => {
  // Tier 3 is excluded from the scorecard and promised back as discussion.
  // Excluding it and delivering nothing would be avoidance, so these guard
  // that the other half actually exists and keeps its own rules.
  it('gives every town its own questions plus the shared ones', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      const prompts = P.discussionFor(sid);
      expect(prompts.length, sid + ' has no discussion').toBeGreaterThan(3);
      expect(P.SCENARIOS[sid].discussion.length, sid + ' has no town-specific question')
        .toBeGreaterThan(0);
      P.SHARED_DISCUSSION.forEach((sh) => {
        expect(prompts.map((p) => p.id), sid + ' is missing a shared question').toContain(sh.id);
      });
    });
  });

  it('names at least two positions on every question', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      P.discussionFor(sid).forEach((d) => {
        expect(d.sides.length, d.id + ' is not a disagreement').toBeGreaterThanOrEqual(2);
        d.sides.forEach((side) => {
          expect(side.label, d.id + ' has an unlabelled side').toBeTruthy();
          // A one-line caricature is not a position. Each side gets reasoning.
          expect(side.view.length, d.id + ' side "' + side.label + '" is too thin')
            .toBeGreaterThan(60);
        });
      });
    });
  });

  it('marks no side as the right one', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      P.discussionFor(sid).forEach((d) => {
        const keys = d.sides.flatMap((s) => Object.keys(s));
        ['correct', 'right', 'answer', 'preferred', 'best', 'recommended']
          .forEach((bad) => expect(keys, d.id + ' ranks its sides').not.toContain(bad));
        expect(Object.keys(d), d.id + ' carries an answer').not.toContain('answer');
      });
    });
  });

  it('makes every question say what the tool did and did not do', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      P.discussionFor(sid).forEach((d) => {
        expect(d.toolSays, d.id + ' does not say what the tool contributed').toBeTruthy();
        expect(d.toolSays.length).toBeGreaterThan(40);
      });
    });
  });

  it('covers the quantities the scorecard deliberately refuses to print', () => {
    // If a contested quantity is excluded from the model and never discussed,
    // it has simply been dropped.
    const allText = P.SCENARIO_IDS
      .flatMap((sid) => P.discussionFor(sid))
      .map((d) => [d.question, d.why, d.toolSays, ...d.sides.map((s) => s.label + ' ' + s.view)].join(' '))
      .join(' ')
      .toLowerCase();
    ['rent', 'price', 'displac', 'water right'].forEach((topic) => {
      expect(allText, 'no discussion touches ' + topic).toContain(topic);
    });
  });

  it('cites no statistics and no studies, because these are questions', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      P.discussionFor(sid).forEach((d) => {
        const text = [d.question, d.why || '', d.toolSays, ...d.sides.map((s) => s.view)].join(' ');
        expect(text, d.id + ' cites a study').not.toMatch(/\b(et al|study found|research shows|according to)\b/i);
        expect(text, d.id + ' quotes a statistic').not.toMatch(/\b\d+(\.\d+)?\s?(percent|%)/);
      });
    });
  });
});

describe('City Planning Lab - the slack bar means one thing everywhere', () => {
  // The first version showed "allowance used", which read as full-is-good on
  // an at-least target and full-is-nearly-broken on an at-most limit, one row
  // apart. Slack means the same thing on every row.
  const row = (over) => Object.assign({ actual: 0, target: 10, met: true, unit: 'count' }, over);

  it('is full when a limit is nowhere near being reached', () => {
    expect(P.headroomFraction(row({ actual: 0, target: 10 }))).toBe(1);
  });

  it('is empty when sitting exactly on a limit', () => {
    expect(P.headroomFraction(row({ actual: 10, target: 10 }))).toBe(0);
  });

  it('goes negative once a limit is passed', () => {
    expect(P.headroomFraction(row({ actual: 12, target: 10, met: false }))).toBeLessThan(0);
  });

  it('reads the same way round for an at-least target', () => {
    // Just meeting a floor is just as tight as just meeting a ceiling.
    expect(P.headroomFraction(row({ actual: 10, target: 10, floor: true }))).toBe(0);
    expect(P.headroomFraction(row({ actual: 20, target: 10, floor: true }))).toBe(1);
    expect(P.headroomFraction(row({ actual: 5, target: 10, floor: true, met: false })))
      .toBeLessThan(0);
  });

  it('measures a ratio against the allowed increase, not the whole number', () => {
    // 123% of today against a 125% ceiling is nearly out of room, even though
    // 1.23 / 1.25 would look like plenty.
    const f = P.headroomFraction({ actual: 1.23, target: 1.25, met: true, unit: 'ratio' });
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(0.2);
  });

  it('handles a none-at-all limit without dividing by zero', () => {
    expect(P.headroomFraction(row({ actual: 0, target: 0, met: true }))).toBe(1);
    expect(P.headroomFraction(row({ actual: 45, target: 0, met: false }))).toBe(-1);
  });

  it('produces a usable number for every requirement of every town', () => {
    P.SCENARIO_IDS.forEach((sid) => {
      P.constraintReport(P.basePlan(sid), 'central').rows.forEach((r) => {
        const f = P.headroomFraction(r);
        expect(f === null || Number.isFinite(f), sid + ' ' + r.id + ' gave ' + f).toBe(true);
      });
    });
  });

  it('never announces which constraint is binding, because the memo asks that', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).not.toMatch(/your binding constraint is/i);
    expect(src).not.toMatch(/tightest constraint:/i);
  });
});

describe('City Planning Lab - registration and shape', () => {
  it('registers exactly one tool under the id the catalog will use', () => {
    expect(registered.map((r) => r.id)).toEqual(['cityLab']);
  });

  it('never offers the river as a land use a student can assign', () => {
    expect(P.PALETTE_IDS).not.toContain('water');
    expect(P.setUse(P.basePlan(), 'E6', 'housing_mid').uses.E6).toBe('water');
  });

  it('authors a 12 by 12 grid whose maps all agree in size', () => {
    expect(P.allParcelIds()).toHaveLength(144);
    P.allParcelIds().forEach((id) => {
      const t = P.terrainAt(id);
      expect(t.baseUse).toBeTruthy();
      expect(typeof t.floodplain).toBe('boolean');
      expect(t.elevationM).toBeGreaterThan(0);
    });
  });
});

describe('City Planning Lab - tier separation', () => {
  // The load-bearing integrity test. If a future contributor adds a rent or
  // displacement readout, this goes red. See docs/city_planning_lab_design.md
  // section 3 for why no contested quantity may ever be produced as a number.
  it('never renders a contested indicator anywhere', () => {
    const rendered = P.renderedIndicatorIds();
    const leaked = rendered.filter((id) => P.CONTESTED_IDS.indexOf(id) !== -1);
    expect(leaked).toEqual([]);
  });

  it('produces no contested key on the scorecard object itself', () => {
    const sc = P.scorecard(planCompactWest().plan, 'central');
    const keys = Object.keys(sc.tier1).concat(Object.keys(sc.tier2));
    P.CONTESTED_IDS.forEach((bad) => expect(keys).not.toContain(bad));
  });

  it('keeps the contested list non-empty, so the guard cannot pass vacuously', () => {
    expect(P.CONTESTED_IDS.length).toBeGreaterThan(5);
    expect(P.CONTESTED_IDS).toContain('rent');
    expect(P.CONTESTED_IDS).toContain('displacement');
  });

  it('exports every rendered indicator in exactly one tier', () => {
    const both = P.TIER1_IDS.filter((id) => P.TIER2_IDS.indexOf(id) !== -1);
    expect(both).toEqual([]);
  });
});

describe('City Planning Lab - green infrastructure only where it does something', () => {
  // The credit is floored at the open-field coefficient. On land that already
  // drains at or below that floor it changes no number, so offering it would
  // bill the bond $250k a hectare for nothing.
  it('refuses on land already at or below the open-field coefficient', () => {
    expect(P.canGreenInfra('park')).toBe(false);
    expect(P.canGreenInfra('preserve')).toBe(false);
    expect(P.canGreenInfra('farm')).toBe(false);
    expect(P.canGreenInfra('field')).toBe(false);
    expect(P.canGreenInfra('water')).toBe(false);
  });

  it('allows it on every surface it can actually reduce', () => {
    ['housing_low', 'housing_mid', 'mixed', 'commercial', 'civic', 'industry']
      .forEach((id) => expect(P.canGreenInfra(id), id).toBe(true));
  });

  it('never charges for an overlay that changes no coefficient', () => {
    const base = P.basePlan();
    const parked = P.setUse(base, 'A9', 'park');
    const attempted = P.toggleGreenInfra(parked, 'A9');
    expect(attempted.greenInfra.A9).toBeUndefined();
    expect(P.scorecard(attempted, 'central').tier2.capitalCost)
      .toBe(P.scorecard(parked, 'central').tier2.capitalCost);
  });

  it('clears a paid-for overlay when the land is rezoned out from under it', () => {
    let p = P.setUse(P.basePlan(), 'A9', 'housing_mid');
    p = P.toggleGreenInfra(p, 'A9');
    expect(p.greenInfra.A9).toBe(true);
    const rezoned = P.setUse(p, 'A9', 'park');
    expect(rezoned.greenInfra.A9, 'stale overlay would keep billing').toBeUndefined();
  });
});

describe('City Planning Lab - determinism', () => {
  it('returns an identical scorecard for the same plan and assumption set', () => {
    const { plan } = planCompactWest();
    const a = P.scorecard(plan, 'central');
    const b = P.scorecard(P.clonePlan(plan), 'central');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('does not mutate the plan it is handed', () => {
    const { plan } = planMidWest();
    const before = JSON.stringify(plan);
    P.constraintReport(plan, 'conservative');
    P.compareAssumptions(plan, 'conservative', 'optimistic');
    expect(JSON.stringify(plan)).toBe(before);
  });

  it('treats every edit as a new plan rather than an in-place change', () => {
    const base = P.basePlan();
    const next = P.setUse(base, 'A1', 'housing_mid');
    expect(base.uses.A1).toBe('field');
    expect(next.uses.A1).toBe('housing_mid');
  });
});

describe('City Planning Lab - the assumption tiers are real, not decorative', () => {
  // This is the test that proves the three-tier split earns its keep. If
  // flipping the assumption set moved a measured number, the split would be
  // a label rather than a structure.
  it('moves at least one modelled indicator when the assumptions change', () => {
    const { plan } = planCompactWest();
    const cmp = P.compareAssumptions(plan, 'conservative', 'optimistic');
    const movedTier2 = cmp.rows.filter((r) => r.tier === 2 && r.changed);
    expect(movedTier2.length).toBeGreaterThan(0);
  });

  it('moves NO measured indicator when the assumptions change', () => {
    REFERENCE_PLANS.forEach((make) => {
      const { plan, id } = make();
      const cmp = P.compareAssumptions(plan, 'conservative', 'optimistic');
      const movedTier1 = cmp.rows.filter((r) => r.tier === 1 && r.changed).map((r) => r.id);
      expect(movedTier1, 'measured indicators moved on plan ' + id).toEqual([]);
    });
  });

  it('reports a plan as robust only when no requirement flips verdict', () => {
    const { plan } = planCompactWest();
    const cmp = P.compareAssumptions(plan, 'conservative', 'optimistic');
    expect(cmp.robust).toBe(cmp.flipped.length === 0);
  });

  it('expresses the runoff ceiling as a ratio, so the scaling largely cancels', () => {
    const { plan } = planCompactWest();
    const lo = P.constraintReport(plan, 'optimistic').rows.find((r) => r.id === 'req_runoff');
    const hi = P.constraintReport(plan, 'conservative').rows.find((r) => r.id === 'req_runoff');
    expect(Math.abs(hi.actual - lo.actual)).toBeLessThan(0.15);
  });
});

describe('City Planning Lab - the scenario admits more than one answer', () => {
  it('has three materially different plans that meet every hard requirement', () => {
    const results = REFERENCE_PLANS.map((make) => {
      const { plan, id } = make();
      const rep = P.constraintReport(plan, 'central');
      return { id, rep };
    });
    results.forEach(({ id, rep }) => {
      const missed = rep.rows.filter((r) => r.hard && !r.met).map((r) => r.id);
      expect(missed, 'hard requirements missed by plan ' + id).toEqual([]);
    });
    expect(results).toHaveLength(3);
  });

  // "Materially different" for a planning brief means a different strategy,
  // not merely different coordinates. Two plans on the same land at different
  // densities are genuinely different answers; so are two plans at the same
  // density on opposite banks. The test accepts either, and demands that the
  // cost of the three actually diverges so none is a relabelling of another.
  it('makes those three plans genuinely different rather than relabelled', () => {
    const built = REFERENCE_PLANS.map((make) => {
      const { plan, homes, id } = make();
      const uses = {};
      homes.forEach((hid) => { uses[plan.uses[hid]] = (uses[plan.uses[hid]] || 0) + 1; });
      const dominant = Object.keys(uses).sort((a, b) => uses[b] - uses[a])[0];
      return { id, set: new Set(homes), dominant,
        cost: P.scorecard(plan, 'central').tier2.capitalCost };
    });

    for (let i = 0; i < built.length; i++) {
      for (let j = i + 1; j < built.length; j++) {
        const a = built[i], b = built[j];
        const shared = [...a.set].filter((x) => b.set.has(x));
        const overlap = shared.length / Math.min(a.set.size, b.set.size);
        const differentPlace = overlap < 0.75;
        const differentDensity = a.dominant !== b.dominant;
        expect(differentPlace || differentDensity,
          a.id + ' and ' + b.id + ' are the same plan twice').toBe(true);
      }
    }

    const costs = built.map((x) => x.cost).sort((x, y) => x - y);
    for (let k = 1; k < costs.length; k++) {
      expect((costs[k] - costs[k - 1]) / costs[k - 1],
        'two reference plans cost almost the same, so they test the same trade-off').toBeGreaterThan(0.05);
    }
  });

  it('spans both banks of the river across the reference plans', () => {
    const banks = REFERENCE_PLANS.map(({ }, i) => {
      const { homes } = REFERENCE_PLANS[i]();
      return homes.every((id) => P.parcelCol(id) < 4) ? 'west' : 'east';
    });
    expect(new Set(banks).size).toBeGreaterThan(1);
  });

  it('stores no solution and no answer key on the brief', () => {
    const briefKeys = Object.keys(P.BRIEF).join(' ');
    expect(briefKeys).not.toMatch(/solution|answer|optimal|best/i);
  });
});

describe('City Planning Lab - low density fails on arithmetic, not on opinion', () => {
  // Worth stating plainly: this conclusion is reached with MEASURED
  // quantities only, so it cannot be argued away by moving a coefficient.
  it('cannot reach 1,200 homes at low density because the dry land does not exist', () => {
    const base = P.basePlan();
    const dry = P.allParcelIds().filter((id) => {
      const t = P.terrainAt(id);
      return !t.floodplain && ['field', 'farm'].indexOf(t.baseUse) !== -1;
    });
    const lowDensity = P.USE_BY_ID.housing_low.units;
    expect(dry.length * lowDensity).toBeLessThan(P.BRIEF.targetNewUnits);
  });

  it('holds that conclusion under every assumption set, because it is measured', () => {
    const base = P.basePlan();
    const dry = P.allParcelIds().filter((id) => {
      const t = P.terrainAt(id);
      return !t.floodplain && ['field', 'farm'].indexOf(t.baseUse) !== -1;
    });
    let sprawl = useAll(base, dry, 'housing_low');
    sprawl = giAll(sprawl, dry);
    const pairs = [];
    for (let r = 1; r <= 12; r++) {
      for (let i = 0; i < 11; i++) pairs.push([P.COLS[i] + r, P.COLS[i + 1] + r]);
    }
    sprawl = roadAll(sprawl, pairs);
    ['central', 'conservative', 'optimistic'].forEach((set) => {
      const rep = P.constraintReport(sprawl, set);
      const units = rep.rows.find((r) => r.id === 'req_units');
      expect(units.met, 'low density unexpectedly met the housing target under ' + set).toBe(false);
    });
  });
});

describe('City Planning Lab - walk distance is network distance', () => {
  it('treats a parcel with no connection as unreachable rather than nearby', () => {
    const base = P.basePlan();
    const withPark = P.setUse(base, 'A1', 'park');
    const dist = P.hopsToNearest(withPark, ['A1']);
    // A2 is physically adjacent to A1 but no street or path joins them.
    expect(dist.A2).toBeUndefined();
  });

  it('counts hops along built connections only', () => {
    let p = P.setUse(P.basePlan(), 'A1', 'park');
    p = P.setEdge(p, 'A1', 'A2', 'path');
    p = P.setEdge(p, 'A2', 'A3', 'path');
    const dist = P.hopsToNearest(p, ['A1']);
    expect(dist.A1).toBe(0);
    expect(dist.A2).toBe(1);
    expect(dist.A3).toBe(2);
    expect(dist.A4).toBeUndefined();
  });

  it('does not let homes count when no road reaches them', () => {
    const p = P.setUse(P.basePlan(), 'L1', 'mixed');
    const sc = P.scorecard(p, 'central');
    expect(sc.tier1.unitsUnserved).toBeGreaterThan(0);
    expect(sc.tier1.newUnitsServed).toBe(0);
  });

  it('charges a bridge for any connection touching the river', () => {
    expect(P.edgeIsBridge(P.edgeKey('D6', 'E6'))).toBe(true);
    expect(P.edgeIsBridge(P.edgeKey('A1', 'B1'))).toBe(false);
    const p = P.setEdge(P.basePlan(), 'E10', 'F10', 'local');
    const withoutBridge = P.setEdge(P.basePlan(), 'A1', 'B1', 'local');
    const bridged = P.setEdge(P.basePlan(), 'F9', 'G9', 'local'); // G9 is dry, F9 is river
    expect(P.capitalCost(bridged, P.ASSUMPTION_SETS[0]).total)
      .toBeGreaterThan(P.capitalCost(withoutBridge, P.ASSUMPTION_SETS[0]).total);
    expect(P.capitalCost(p, P.ASSUMPTION_SETS[0]).total).toBeGreaterThan(0);
  });
});

describe('City Planning Lab - floodplain accounting', () => {
  it('grandfathers the homes that were already there and says so separately', () => {
    const sc = P.scorecard(P.basePlan(), 'central');
    expect(sc.tier1.existingUnitsInFloodplain).toBeGreaterThan(0);
    expect(sc.tier1.newUnitsInFloodplain).toBe(0);
  });

  it('counts new homes in the floodplain against the requirement', () => {
    let p = P.setUse(P.basePlan(), 'E11', 'housing_mid');
    p = P.setEdge(p, 'E11', 'E10', 'local');
    p = P.setEdge(p, 'E10', 'D10', 'local');
    p = P.setEdge(p, 'D10', 'D9', 'local');
    const sc = P.scorecard(p, 'central');
    expect(P.terrainAt('E11').floodplain).toBe(false);
    let q = P.setUse(P.basePlan(), 'F11', 'housing_mid');
    q = P.setEdge(q, 'F11', 'F10', 'local');
    q = P.setEdge(q, 'F10', 'E10', 'local');
    q = P.setEdge(q, 'E10', 'D10', 'local');
    q = P.setEdge(q, 'D10', 'D9', 'local');
    expect(P.terrainAt('F11').floodplain).toBe(true);
    expect(P.scorecard(q, 'central').tier1.newUnitsInFloodplain).toBe(45);
    expect(sc.tier1.newUnitsInFloodplain).toBe(0);
  });
});

describe('City Planning Lab - the comfortable lie is shown next to the truth', () => {
  it('reports a park across an unbridged river as near, and as unreachable', () => {
    // The whole point of carrying both numbers. Straight-line distance is how
    // a planning dashboard reports access a resident does not actually have.
    let p = P.setUse(P.basePlan('riverbend'), 'G3', 'mixed');
    p = P.setUse(p, 'G4', 'mixed');
    p = P.setUse(p, 'C3', 'park');
    p = P.setEdge(p, 'G3', 'G4', 'local');
    p = P.setEdge(p, 'G4', 'G5', 'local');
    p = P.setEdge(p, 'G5', 'G6', 'local');
    const s = P.scorecard(p, 'central');
    expect(s.tier1.parkAccessPctAsCrowFlies).toBeGreaterThan(0.5);
    expect(s.tier1.parkAccessPct).toBe(0);
  });

  it('can never report worse access as the crow flies than along the streets', () => {
    // The invariant, and the reason the crow-flies figure always flatters:
    // a walking route is at least as long as the straight line, so every home
    // the network reaches is also inside the straight-line radius. If this
    // ever inverts, one of the two measures is computing the wrong thing.
    [planCompactWest(), planMidWest(), planEastBank(), planMesa(true)].forEach(({ plan, id }) => {
      const s = P.scorecard(plan, 'central');
      expect(s.tier1.parkAccessPctAsCrowFlies,
        'crow-flies below network access on ' + id).toBeGreaterThanOrEqual(s.tier1.parkAccessPct);
    });
    // and on the untouched baseline of every town
    P.SCENARIO_IDS.forEach((sid) => {
      const s = P.scorecard(P.basePlan(sid), 'central');
      expect(s.tier1.parkAccessPctAsCrowFlies).toBeGreaterThanOrEqual(s.tier1.parkAccessPct);
    });
  });

  it('keeps the crow-flies figure measured, so no assumption can move it', () => {
    const cmp = P.compareAssumptions(planCompactWest().plan, 'conservative', 'optimistic');
    const row = cmp.rows.find((r) => r.id === 'parkAccessPctAsCrowFlies');
    expect(row.tier).toBe(1);
    expect(row.changed).toBe(false);
  });
});

describe('City Planning Lab - importing a plan', () => {
  it('round-trips a plan through export and import', () => {
    const { plan } = planCompactWest();
    const res = P.importPlan(JSON.stringify(plan));
    expect(res.ok).toBe(true);
    expect(P.scorecard(res.plan, 'central').tier1.newUnitsServed)
      .toBe(P.scorecard(plan, 'central').tier1.newUnitsServed);
  });

  it('carries a plan into the town it was drawn for, not the one that is open', () => {
    const res = P.importPlan(JSON.stringify(planMesa(true).plan));
    expect(res.ok).toBe(true);
    expect(res.plan.scenarioId).toBe('mesahollow');
  });

  it('refuses junk without throwing', () => {
    ['', '{not json', '[]', 'null', '{"v":2,"scenarioId":"riverbend"}',
      '{"v":1,"scenarioId":"atlantis"}'].forEach((bad) => {
      const res = P.importPlan(bad);
      expect(res.ok, 'accepted: ' + bad).toBe(false);
      expect(res.error, 'no reason given for: ' + bad).toBeTruthy();
    });
  });

  it('is merge-only: a file cannot introduce terrain or an unknown land use', () => {
    const res = P.importPlan(JSON.stringify({
      v: 1, scenarioId: 'riverbend',
      uses: {
        A1: 'housing_mid',        // fine
        E6: 'housing_mid',        // the river, must stay terrain
        A2: 'lunar_base',         // not a land use
        ZZ9: 'housing_mid'        // not a parcel
      },
      edges: { 'A1|A2': 'local', 'A1|ZZ9': 'local', 'A1|A2x': 'teleport' }
    }));
    expect(res.ok).toBe(true);
    expect(res.plan.uses.A1).toBe('housing_mid');
    expect(res.plan.uses.E6, 'the river was overwritten').toBe('water');
    expect(res.plan.uses.A2).toBe('field');
    expect(res.plan.uses.ZZ9).toBeUndefined();
    expect(res.plan.edges['A1|A2']).toBe('local');
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('never lets an import smuggle in a function', () => {
    const res = P.importPlan('{"v":1,"scenarioId":"riverbend","uses":{"A1":"park"}}');
    const walk = (node) => {
      if (typeof node === 'function') throw new Error('function in imported plan');
      if (node && typeof node === 'object') Object.keys(node).forEach((k) => walk(node[k]));
    };
    expect(() => walk(res.plan)).not.toThrow();
  });

  it('drops a green-infrastructure overlay the imported land use cannot carry', () => {
    const res = P.importPlan(JSON.stringify({
      v: 1, scenarioId: 'riverbend',
      uses: { A1: 'park' },
      greenInfra: { A1: true }
    }));
    expect(res.plan.greenInfra.A1).toBeUndefined();
  });

  it('keeps the imported plan free of the exporter existing-edge duplication', () => {
    const { plan } = planCompactWest();
    const res = P.importPlan(JSON.stringify(plan));
    Object.keys(res.plan.edges).forEach((k) => {
      expect(['existing', 'local', 'arterial', 'path']).toContain(res.plan.edges[k]);
    });
  });
});

// Harborlight: all housing on the highest ground (robust) versus the same
// number of homes pushed downhill onto land that is only safe if the sea-level
// allowance turns out small.
function planCoastal(onHighGround) {
  const grid = (cols, rows) => {
    const pp = [];
    rows.forEach((r) => {
      for (let i = 0; i < cols.length - 1; i++) pp.push([cols[i] + r, cols[i + 1] + r]);
    });
    cols.forEach((c) => {
      for (let i = 0; i < rows.length - 1; i++) pp.push([c + rows[i], c + rows[i + 1]]);
    });
    return pp;
  };
  const homes = onHighGround
    ? ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'A2', 'B2', 'C2', 'D2', 'E2', 'A3']
    : ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'A5', 'B5', 'C5', 'A6', 'B6', 'A7'];
  let p = useAll(P.basePlan('harborlight'), homes, 'mixed');
  p = giAll(p, homes);
  p = useAll(p, ['B3', 'B4'], 'park');
  const spine = [];
  for (let r = 1; r <= 7; r++) spine.push(['A' + r, 'A' + (r + 1)]);
  let pairs = grid(['A', 'B', 'C', 'D', 'E', 'F'], [1, 2])
    .concat(spine, [['B2', 'B3'], ['B3', 'B4']]);
  if (!onHighGround) pairs = pairs.concat(grid(['A', 'B', 'C'], [5, 6]), [['A7', 'B7']]);
  return { id: onHighGround ? 'coastal-high' : 'coastal-low', plan: roadAll(p, pairs), homes };
}

describe('City Planning Lab - the coastal town, where the constraint is time', () => {
  it('derives today\'s surge reach and the authored flood map from the same ground', () => {
    // Two sources of truth for the same fact is how they drift apart.
    const sc = P.SCENARIOS.harborlight;
    P.allParcelIds().forEach((id) => {
      const t = P.terrainAt(id, 'harborlight');
      const derived = t.elevationM <= sc.surgeBaseElevationM + 1e-9;
      expect(derived, id + ' flood map disagrees with its elevation').toBe(t.floodplain);
    });
  });

  it('measures coastal ground finely enough for the question to mean anything', () => {
    // A 3 m elevation band would make every parcel identical to a half-metre
    // question, so the scenario carries its own scale.
    const sc = P.SCENARIOS.harborlight;
    expect(sc.elevStepM).toBeLessThan(1);
    const elevations = P.allParcelIds().map((id) => P.terrainAt(id, 'harborlight').elevationM);
    expect(Math.max(...elevations)).toBeLessThan(5);
  });

  it('shrinks the buildable map as the planning allowance grows', () => {
    const safeUnder = (setId) => {
      const a = P.ASSUMPTION_SETS.find((x) => x.id === setId);
      return P.allParcelIds().filter((id) => {
        const t = P.terrainAt(id, 'harborlight');
        return t.baseUse !== 'water' && !P.inFutureSurge(id, 'harborlight', a);
      }).length;
    };
    const lo = safeUnder('optimistic'), mid = safeUnder('central'), hi = safeUnder('conservative');
    expect(lo).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(hi);
    expect(hi).toBeGreaterThan(0);   // a town with no safe land is not a scenario
  });

  it('lets a plan on the high ground survive every allowance', () => {
    ['optimistic', 'central', 'conservative'].forEach((set) => {
      const rep = P.constraintReport(planCoastal(true).plan, set);
      const missed = rep.rows.filter((r) => r.hard && !r.met).map((r) => r.id);
      expect(missed, 'high-ground plan failed under ' + set).toEqual([]);
    });
  });

  it('catches a plan that only works if the allowance turns out small', () => {
    // The whole point of the town. Both plans house the same number of
    // families and both pass under the default assumptions.
    const low = planCoastal(false).plan;
    expect(P.constraintReport(low, 'central').rows
      .filter((r) => r.hard && !r.met)).toEqual([]);
    const strict = P.constraintReport(low, 'conservative');
    const failed = strict.rows.filter((r) => r.hard && !r.met).map((r) => r.id);
    expect(failed).toContain('req_future_flood');
    expect(P.scorecard(low, 'conservative').tier2.newUnitsInFutureSurge).toBeGreaterThan(0);
  });

  it('treats the 2050 exposure as modelled, never as measured', () => {
    // It depends on an allowance nobody can pin down, so it must be able to
    // move when the assumptions move, and must not sit in Tier 1.
    P.SEA_IDS.forEach((id) => {
      expect(P.TIER2_IDS, id + ' is not in the modelled tier').toContain(id);
      expect(P.TIER1_IDS).not.toContain(id);
    });
    const cmp = P.compareAssumptions(planCoastal(false).plan, 'conservative', 'optimistic');
    const moved = cmp.rows.filter((r) => r.changed).map((r) => r.id);
    expect(moved).toContain('newUnitsInFutureSurge');
    expect(cmp.rows.filter((r) => r.tier === 1 && r.changed)).toEqual([]);
  });

  it('shows sea-level indicators only in the town that has a coast', () => {
    P.SEA_IDS.forEach((id) => {
      expect(P.visibleIndicatorIds(P.TIER2_IDS, 'harborlight')).toContain(id);
      expect(P.visibleIndicatorIds(P.TIER2_IDS, 'riverbend')).not.toContain(id);
      expect(P.visibleIndicatorIds(P.TIER2_IDS, 'mesahollow')).not.toContain(id);
    });
  });

  it('grandfathers the homes already standing in the future reach', () => {
    const s = P.scorecard(P.basePlan('harborlight'), 'conservative');
    expect(s.tier2.existingUnitsInFutureSurge).toBeGreaterThan(0);
    expect(s.tier2.newUnitsInFutureSurge).toBe(0);
    const row = P.constraintReport(P.basePlan('harborlight'), 'conservative')
      .rows.find((r) => r.id === 'req_future_flood');
    expect(row.met, 'the town was blamed for houses it already had').toBe(true);
  });

  it('never claims to forecast sea level', () => {
    const row = P.CHECKS.req_future_flood(
      P.scorecard(P.basePlan('harborlight'), 'central'), P.SCENARIOS.harborlight);
    expect(row.detail).toMatch(/MODELLED/);
    expect(P.SCENARIOS.harborlight.intro).toMatch(/planned to have|asked/i);
    expect(P.SCENARIOS.harborlight.intro).not.toMatch(/will rise|prediction|forecast/i);
  });
});

describe('City Planning Lab - the limited-move challenge', () => {
  it('grants exactly the moves it promises and then stops', () => {
    let p = P.startChallenge('riverbend', 3);
    expect(P.movesLeft(p)).toBe(3);
    p = P.setUse(p, 'A1', 'housing_mid');
    p = P.setUse(p, 'A2', 'housing_mid');
    p = P.setUse(p, 'A3', 'housing_mid');
    expect(P.movesLeft(p)).toBe(0);
    expect(P.outOfMoves(p)).toBe(true);
    const blocked = P.setUse(p, 'A4', 'housing_mid');
    expect(blocked).toBe(p);
    expect(blocked.uses.A4).toBe('field');
  });

  it('does not charge a move for an edit that changes nothing', () => {
    const p = P.startChallenge('riverbend', 3);
    expect(P.movesLeft(P.setUse(p, 'A1', 'field'))).toBe(3);       // already field
    let q = P.setEdge(p, 'A1', 'A2', 'local');
    expect(P.movesLeft(q)).toBe(2);
    expect(P.movesLeft(P.setEdge(q, 'A1', 'A2', 'local'))).toBe(2); // same edge, same kind
  });

  it('blocks every kind of edit once the budget is spent, not only land use', () => {
    let p = P.startChallenge('riverbend', 1);
    p = P.setUse(p, 'A1', 'housing_mid');
    expect(P.outOfMoves(p)).toBe(true);
    expect(P.setEdge(p, 'A1', 'A2', 'local')).toBe(p);
    expect(P.toggleGreenInfra(p, 'A1')).toBe(p);
  });

  it('leaves an unbudgeted plan unlimited', () => {
    const p = P.basePlan('riverbend');
    expect(p.moveBudget).toBe(null);
    expect(P.movesLeft(p)).toBe(Infinity);
    expect(P.outOfMoves(p)).toBe(false);
  });

  it('survives a round trip through export and import', () => {
    let p = P.startChallenge('mesahollow', 12);
    p = P.setUse(p, 'G1', 'mixed');
    const res = P.importPlan(JSON.stringify(p));
    expect(res.ok).toBe(true);
    expect(res.plan.moveBudget).toBe(12);
    expect(P.movesLeft(res.plan)).toBe(11);
  });

  it('refuses a nonsense budget from an imported file', () => {
    ['-5', '0', '"lots"', 'null'].forEach((bad) => {
      const res = P.importPlan('{"v":1,"scenarioId":"riverbend","moveBudget":' + bad + '}');
      expect(res.plan.moveBudget, 'accepted budget ' + bad).toBe(null);
    });
  });
});

describe('City Planning Lab - the class view', () => {
  function entry(code, plan) { return { code, plan }; }

  function classOf(n, mutate) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let p = P.basePlan('riverbend');
      if (mutate) p = mutate(p, i);
      out.push(entry('student' + i, p));
    }
    return out;
  }

  it('counts only the town that is open, and says how many it set aside', () => {
    const mixed = [
      entry('a', P.basePlan('riverbend')),
      entry('b', P.basePlan('riverbend')),
      entry('c', P.basePlan('mesahollow'))
    ];
    const s = P.classSummary(mixed, 'riverbend', 'central');
    expect(s.n).toBe(2);
    expect(s.otherTown).toBe(1);
    const m = P.classSummary(mixed, 'mesahollow', 'central');
    expect(m.n).toBe(1);
    expect(m.otherTown).toBe(2);
  });

  it('withholds distribution signals below n = 3, and shows n either way', () => {
    expect(P.classSummary(classOf(2), 'riverbend', 'central').enoughToShowSignals).toBe(false);
    expect(P.classSummary(classOf(2), 'riverbend', 'central').n).toBe(2);
    expect(P.classSummary(classOf(3), 'riverbend', 'central').enoughToShowSignals).toBe(true);
  });

  it('counts a requirement as met per plan, against the town it belongs to', () => {
    const s = P.classSummary(classOf(3), 'riverbend', 'central');
    const units = s.perRequirement.find((r) => r.id === 'req_units');
    expect(units.met).toBe(0);         // nobody built anything
    expect(units.missed).toBe(3);
    const flood = s.perRequirement.find((r) => r.id === 'req_flood');
    expect(flood.met).toBe(3);
    expect(s.perRequirement.map((r) => r.id))
      .toEqual(P.SCENARIOS.riverbend.requirements.map((r) => r.id));
  });

  it('reports what plans gave up rather than ranking them', () => {
    const set = classOf(3, (p, i) => (i === 0 ? P.setUse(p, 'J1', 'housing_mid') : p));
    const s = P.classSummary(set, 'riverbend', 'central');
    expect(s.tradeOffs.farmland).toBe(1);
    expect(s.tradeOffs.preserve).toBe(0);
    // No score, no rank, no ordering by quality anywhere in the summary.
    expect(Object.keys(s)).not.toContain('score');
    expect(Object.keys(s)).not.toContain('rank');
    expect(Object.keys(s)).not.toContain('best');
  });

  it('counts who ran the Assumption Lab as a fact, not an inference', () => {
    const set = classOf(3, (p, i) => {
      if (i < 2) { const q = P.clonePlan(p); q.ranAssumptionLab = true; return q; }
      return p;
    });
    expect(P.classSummary(set, 'riverbend', 'central').ranLab).toBe(2);
  });

  it('never reads the memo prose, only whether one exists', () => {
    const withMemo = P.clonePlan(P.basePlan('riverbend'));
    withMemo.memo = { bindingConstraint: 'the bond', tradeoff: 'Ada lives at 12 Elm St', text: 'private' };
    const s = P.classSummary([entry('a', withMemo)], 'riverbend', 'central');
    expect(s.memoDone).toBe(1);
    expect(JSON.stringify(s)).not.toContain('Ada');
    expect(JSON.stringify(s)).not.toContain('Elm');
    expect(JSON.stringify(s)).not.toContain('private');
  });
});

describe('City Planning Lab - the class CSV', () => {
  it('emits one row per plan plus a header, with a BOM', () => {
    const set = [
      { code: 's1', plan: P.basePlan('riverbend') },
      { code: 's2', plan: P.setUse(P.basePlan('riverbend'), 'A1', 'housing_mid') }
    ];
    const csv = P.classCsv(set, 'riverbend', 'central');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('code,town,hard_met');
    P.SCENARIOS.riverbend.requirements.forEach((r) => expect(lines[0]).toContain(r.id));
  });

  it('excludes every scrap of free text, because student writing carries names', () => {
    const p = P.clonePlan(P.basePlan('riverbend'));
    p.memo = {
      bindingConstraint: 'Public infrastructure cost at or under the 22 million dollar bond',
      tradeoff: 'SECRETNAME wrote this, 12 Elm Street',
      text: 'more identifying prose'
    };
    const csv = P.classCsv([{ code: 's1', plan: p }], 'riverbend', 'central');
    expect(csv).not.toContain('SECRETNAME');
    expect(csv).not.toContain('Elm Street');
    expect(csv).not.toContain('identifying prose');
    expect(csv).not.toContain('Public infrastructure cost at or under');
    expect(csv).toContain('memo_present');
    expect(csv).toMatch(/,yes,/);
  });

  it('escapes a code that would otherwise break the column layout', () => {
    const csv = P.classCsv(
      [{ code: 'Doe, Ada "A"', plan: P.basePlan('riverbend') }], 'riverbend', 'central');
    expect(csv).toContain('"Doe, Ada ""A"""');
    expect(csv.replace(/^﻿/, '').trim().split('\r\n')).toHaveLength(2);
  });

  it('carries the same requirement verdicts the report shows', () => {
    const p = P.setUse(P.basePlan('riverbend'), 'J1', 'housing_mid');
    const rep = P.constraintReport(p, 'central');
    const csv = P.classCsv([{ code: 's1', plan: p }], 'riverbend', 'central');
    const header = csv.replace(/^﻿/, '').split('\r\n')[0].split(',');
    const row = csv.replace(/^﻿/, '').split('\r\n')[1].split(',');
    rep.rows.forEach((r) => {
      expect(row[header.indexOf(r.id)], r.id + ' disagrees with the report')
        .toBe(r.met ? 'met' : 'missed');
    });
  });
});

describe('City Planning Lab - serialization', () => {
  it('round-trips a plan exactly', () => {
    const { plan } = planMidWest();
    const round = JSON.parse(JSON.stringify(plan));
    expect(round).toEqual(plan);
    expect(JSON.stringify(P.scorecard(round, 'central')))
      .toBe(JSON.stringify(P.scorecard(plan, 'central')));
  });

  it('keeps plan state free of functions, which serialization would strip', () => {
    const { plan } = planCompactWest();
    const walk = (node, trail) => {
      if (typeof node === 'function') throw new Error('function found in plan state at ' + trail);
      if (node && typeof node === 'object') {
        Object.keys(node).forEach((k) => walk(node[k], trail + '.' + k));
      }
    };
    expect(() => walk(plan, 'plan')).not.toThrow();
  });

  it('carries a version so a future format change has somewhere to migrate from', () => {
    expect(P.basePlan().v).toBe(1);
  });
});

describe('City Planning Lab - deploy mirror', () => {
  it('is mirrored to desktop/web-app/public byte for byte', () => {
    expect(fs.existsSync(deployPath), 'deploy mirror missing').toBe(true);
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
