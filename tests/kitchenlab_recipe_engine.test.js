// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Kitchen Lab's real-time Recipe Sim. Three things this file pins:
//   1. the burner dial reaches the temperature each recipe's text promises,
//   2. the egg judges read one integrated doneness state, so their notes
//      cannot contradict each other (no "browned hard" + "runny" verdicts),
//   3. the tick clamps real time and pauses on a hidden tab.
const source = readFileSync('stem_lab/stem_tool_kitchenlab.js', 'utf8');

let E;
beforeAll(() => {
  // The tool is a page-global IIFE; evaluate it against the jsdom window once.
  if (!window.StemLab || !window.StemLab.isRegistered('kitchenLab')) new Function(source)();
  E = window.StemLab._registry.kitchenLab.engine;
});

const labels = (judgement) => judgement.notes.map((n) => n.label);
const has = (judgement, text) => labels(judgement).some((l) => l.includes(text));

// Drive a whole cook through the engine's own pan + doneness math, the way the
// 500 ms tick does, and hand the judge the same snapshot nextStep() builds.
// schedule: [{ until: simSec, level, add: ['itemId', ...] }] — items go in at
// the start of their segment; `off: true` turns the burner to 0 with food in.
function cook(recipeId, schedule, opts = {}) {
  const rec = E.RECIPES[recipeId];
  const thermal = E.getRecipeThermal(rec, opts.material);
  const mat = E.panMaterial(opts.material);
  const seed = { recipeItemsInPan: [], recipeIngredientOrder: [], recipeItemAddTimes: {}, recipeItemAddPanF: {}, recipeBurnerLevel: 0 };
  if (opts.oil) seed.recipeOil = opts.oil;
  if (opts.food) seed.sandboxFood = opts.food;
  if (opts.material) seed.klPanMaterial = opts.material;
  if (opts.options) seed.recipeOptions = opts.options;
  seed.recipeMarks = {};
  const speed = rec.simSpeedMultiplier || 1;
  const dt = 0.5 * speed; // one real 500 ms tick in sim seconds
  const t0 = 1_000_000;
  const s = Object.assign(E.defaultState(), seed);
  const dnCfg = E.recipeDoneness(rec, s);
  const mainItem = dnCfg.browningFrom || null;
  let simSec = 0, now = t0, pan = 70, maxPan = 70, active = 0, heatRemovedAt = null;
  const trace = [];
  for (const seg of schedule) {
    for (const id of seg.add || []) {
      if (s.recipeItemsInPan.indexOf(id) === -1) {
        s.recipeItemsInPan.push(id); s.recipeIngredientOrder.push(id);
        s.recipeItemAddTimes[id] = now; s.recipeItemAddPanF[id] = Math.round(pan);
        s.recipeLastStirSimSec = simSec; // addItem: being at the pan resets the unattended clock
        // addItem: cold food pulls a stovetop pan down by the pan's thermal mass
        if (id === (mainItem || id) && thermal.mode === 'pan') pan = Math.max(70, pan - mat.foodDropF);
        // addItem: the main ingredient brings its surface water
        if (id === mainItem && dnCfg.moisture) s.recipeMoisture = E.initialMoisture(rec, s);
        // addItem: some ingredients cool the pan on their own (deglazing water)
        const ing = E.recipeIngredients(rec, s).find((i) => i.id === id);
        if (ing && ing.cools) pan = Math.max(70, pan - ing.cools);
      }
    }
    // `mark: 'flip'` records the moment at the start of the segment (mirrors a step's record:)
    if (seg.mark) s.recipeMarks[seg.mark] = { simSec, browning: s.recipeBrowning || 0, foodF: s.recipeFoodInternalF || 40, panF: pan, icon: '🔄' };
    // `stir: n` stirs n times spread evenly through the segment (mirrors stirPan())
    const stirEvery = seg.stir ? (seg.until - simSec) / seg.stir : Infinity;
    let nextStirAt = simSec + stirEvery;
    const level = seg.off ? 0 : seg.level;
    if (level === 0 && s.recipeItemsInPan.length && !heatRemovedAt) heatRemovedAt = now;
    s.recipeBurnerLevel = level; s.recipeHeatRemovedAt = heatRemovedAt;
    while (simSec < seg.until - 1e-9) {
      simSec += dt; now += 500;
      pan = E.tickPanTemp(pan, level, dt, thermal);
      maxPan = Math.max(maxPan, pan);
      if (s.recipeItemsInPan.length) active += dt;
      Object.assign(s, E.advanceDoneness(s, rec, pan, dt, now));
      s.recipeSimElapsedSec = simSec;
      if (simSec >= nextStirAt - 1e-9) {
        nextStirAt += stirEvery;
        s.recipeLastStirSimSec = simSec; s.recipeStirCount = (s.recipeStirCount || 0) + 1;
        if (dnCfg.stir && dnCfg.stir.disturbs) s.recipeBrowning *= 0.8;
      }
      if (opts.stopAtFoodF && s.recipeFoodInternalF >= opts.stopAtFoodF) { seg.until = simSec; break; }
    }
    trace.push({ simSec: Math.round(simSec), pan: Math.round(pan), food: Math.round(s.recipeFoodInternalF), browning: +s.recipeBrowning.toFixed(1) });
  }
  const snapshot = {
    maxPanTempF: maxPan, activeTimeSec: active, foodInternalF: s.recipeFoodInternalF,
    itemAddTimes: s.recipeItemAddTimes, itemAddPanF: s.recipeItemAddPanF, ingredientOrder: s.recipeIngredientOrder,
    heatRemovedAt, lastTickAt: now, stepsCompleted: rec.steps.length, elapsedSec: (now - t0) / 1000, panMaterial: s.klPanMaterial || 'stainless',
    options: s.recipeOptions || {}, marks: s.recipeMarks || {},
    doneness: { browning: s.recipeBrowning, foodPeakF: s.recipeFoodPeakF, secAboveOverF: s.recipeSecAboveOverF, setAt: s.recipeFoodSetAt, set: !!s.recipeFoodSetAt, simElapsedSec: simSec,
      stirCount: s.recipeStirCount || 0, unattendedSec: s.recipeUnattendedSec || 0, smokeSec: s.recipeSmokeSec || 0, oil: E.oilFor(rec, s),
      steamSec: s.recipeSteamSec || 0, moistureAtEnd: s.recipeMoisture || 0 }
  };
  const judgement = rec.judge(snapshot, Object.assign({}, s, opts.fullState || {}));
  return { snapshot, judgement, trace, state: s, simSec, food: s.recipeFoodInternalF, browning: s.recipeBrowning };
}

describe('Kitchen Lab burner dial', () => {
  it('maps off to ambient and dial 1..10 linearly across the documented 220-500°F range', () => {
    expect(E.burnerTargetTemp(0)).toBe(70);
    expect(E.burnerTargetTemp(1)).toBeCloseTo(220, 6);
    expect(E.burnerTargetTemp(10)).toBeCloseTo(500, 6);
    for (let level = 1; level < 10; level++) {
      expect(E.burnerTargetTemp(level + 1) - E.burnerTargetTemp(level)).toBeCloseTo(280 / 9, 6);
    }
  });

  it("lands every stovetop recipe's stated dial inside that step's target and under its penalty", () => {
    const cases = [
      { id: 'scrambledEggs', text: '2-3',  dials: [2, 3],  min: 220, below: 330 }, // step 1 range 220-290; step 4 cap 330
      { id: 'omelet',        text: '6-7',  dials: [6, 7],  min: 320, below: 410 }, // step 1 range 320-400; step 4 cap 410
      { id: 'stirFry',       text: '9-10', dials: [9, 10], min: 410, below: 501 }, // step 1 range 410-500
      { id: 'panSeared',     text: '7-8',  dials: [7, 8],  min: 400, below: 480 }, // sear range 400-470; judge penalty at 480
      { id: 'panSeared',     text: '4',    dials: [4],     min: 250, below: 380 }, // finish range 250-380
      { id: 'pastaSauce',    text: '3-4',  dials: [3, 4],  min: 240, below: 320 }, // sauce range 240-320
      { id: 'pancakes',      text: '5-6',  dials: [5, 6],  min: 330, below: 381 }, // medium range 330-380
      { id: 'steak',         text: '8-9',  dials: [8, 9],  min: 420, below: 501 }, // sear range 420-500
      { id: 'caramelisedOnions', text: '3-4', dials: [3, 4], min: 270, below: 331 } // medium-low 270-330
    ];
    for (const c of cases) {
      expect(E.RECIPES[c.id]).toBeTruthy();
      expect(E.RECIPES[c.id].steps.some((s) => s.instruction.includes(c.text))).toBe(true);
      for (const dial of c.dials) {
        const asymptote = E.burnerTargetTemp(dial);
        expect(asymptote, `${c.id} dial ${dial}`).toBeGreaterThanOrEqual(c.min);
        expect(asymptote, `${c.id} dial ${dial}`).toBeLessThan(c.below);
      }
    }
  });

  it("lands every oven recipe's stated dial inside that step's target", () => {
    const cases = [
      { id: 'sheetPan',     text: 'dial to 7 (about 400°F)',   dials: [7],    min: 380, max: 420 },
      { id: 'roastChicken', text: 'dial to 8 (about 425°F)',   dials: [8],    min: 410, max: 460 },
      { id: 'roastChicken', text: 'DOWN to 5-6 (about 350°F)', dials: [5, 6], min: 330, max: 400 }
    ];
    for (const c of cases) {
      expect(E.RECIPES[c.id].steps.some((s) => s.instruction.includes(c.text)), `${c.id} says "${c.text}"`).toBe(true);
      for (const dial of c.dials) {
        expect(E.ovenTargetTemp(dial), `${c.id} dial ${dial}`).toBeGreaterThanOrEqual(c.min);
        expect(E.ovenTargetTemp(dial), `${c.id} dial ${dial}`).toBeLessThanOrEqual(c.max);
      }
    }
  });

  it('brings the pan to its asymptote within a minute on the stovetop model', () => {
    expect(E.tickPanTemp(70, 2, 60)).toBeGreaterThan(E.burnerTargetTemp(2) - 3);
    expect(E.tickPanTemp(70, 2, 60)).toBeLessThanOrEqual(E.burnerTargetTemp(2));
  });
});

describe('Kitchen Lab food model gives thick cuts a realistic clock', () => {
  it('no longer reads a chicken breast at 343°F after the minimum 3-minute sear', () => {
    const r = cook('panSeared', [{ until: 60, level: 8, add: ['oil'] }, { until: 240, level: 8, add: ['chicken'] }]);
    expect(r.food).toBeGreaterThan(70);
    expect(r.food).toBeLessThan(130);
  });

  it('brings a breast to 165°F in roughly 9-13 sim-minutes across sear + medium finish', () => {
    const r = cook('panSeared', [
      { until: 60, level: 8, add: ['oil'] },
      { until: 330, level: 8, add: ['chicken'] },  // side 1, 4.5 min
      { until: 570, level: 8 },                    // side 2, 4 min
      { until: 900, level: 4 }                     // finish on medium until 165°F
    ], { stopAtFoodF: 165 });
    expect(r.simSec).toBeGreaterThan(540);
    expect(r.simSec).toBeLessThan(780);
  });

  it('brings a whole bird to 165°F in roughly 60-90 sim-minutes of a 425 → 350°F roast', () => {
    const r = cook('roastChicken', [
      { until: 300, level: 8, add: ['seasoning'] },
      { until: 1200, level: 8, add: ['chicken'] },
      { until: 6000, level: 5 }
    ], { stopAtFoodF: 165 });
    expect(r.simSec / 60).toBeGreaterThan(60);
    expect(r.simSec / 60).toBeLessThan(90);
  });

  it('does not brown oil sitting alone in a hot pan', () => {
    const r = cook('panSeared', [{ until: 300, level: 8, add: ['oil'] }]);
    expect(r.browning).toBe(0);
  });

  it('records the pan temperature at the moment each ingredient goes in', () => {
    const r = cook('panSeared', [{ until: 60, level: 8, add: ['oil'] }, { until: 120, level: 8, add: ['chicken'] }]);
    expect(r.snapshot.itemAddPanF.oil).toBe(70);
    expect(r.snapshot.itemAddPanF.chicken).toBeGreaterThan(400);
    expect(source).toContain('newPanF[itemId] = Math.round(prior.recipePanTempF || 70);');
    expect(source.match(/recipeItemAddPanF: \{\},/g)).toHaveLength(4);
  });
});

describe('Kitchen Lab pan-seared chicken judge', () => {
  const textbook = () => cook('panSeared', [
    { until: 60, level: 8, add: ['oil'] }, { until: 330, level: 8, add: ['chicken'] }, { until: 570, level: 8 },
    { until: 900, level: 4 }, { until: 930, level: 0, off: true }
  ], { stopAtFoodF: 165 });

  it('grades the textbook sear → flip → medium finish → rest an A with a deep crust', () => {
    const { judgement: j, food } = textbook();
    expect(food).toBeGreaterThanOrEqual(165);
    expect(has(j, 'Deep golden crust')).toBe(true);
    expect(has(j, 'Internal temp')).toBe(true);
    expect(has(j, 'Carryover discipline')).toBe(true);
    expect(j.grade).toBe('A');
  });

  it('calls a cold-pan start "no crust" and reads the pan temp the chicken actually met', () => {
    const { judgement: j } = cook('panSeared', [{ until: 10, level: 4, add: ['oil', 'chicken'] }, { until: 1000, level: 4 }], { stopAtFoodF: 165 });
    expect(has(j, 'No crust')).toBe(true);
    expect(j.notes.find((n) => n.label.includes('No crust')).detail).toMatch(/Pan was (7\d|8\d|9\d|1\d\d)°F/);
    expect(has(j, 'Internal temp')).toBe(true);
  });

  it('fails an undercooked breast on safety, and never pairs it with an overcooked note', () => {
    const { judgement: j, food } = cook('panSeared', [{ until: 60, level: 8, add: ['oil'] }, { until: 300, level: 8, add: ['chicken'] }]);
    expect(food).toBeLessThan(165);
    expect(has(j, 'FOOD SAFETY')).toBe(true);
    expect(has(j, 'Overcooked')).toBe(false);
    expect(j.score).toBeLessThanOrEqual(49);
  });

  it('calls a breast left on high the whole time dry, without also calling the crust weak', () => {
    const { judgement: j } = cook('panSeared', [{ until: 60, level: 8, add: ['oil'] }, { until: 840, level: 8, add: ['chicken'] }]);
    expect(has(j, 'Overcooked')).toBe(true);
    expect(has(j, 'Light crust') || has(j, 'No crust')).toBe(false);
  });

  it('keeps exactly one crust note and one interior note', () => {
    const crust = ['Crust burnt', 'Deep golden crust', 'Light crust', 'No crust'];
    const interior = ['FOOD SAFETY', 'Internal temp', 'Overcooked'];
    for (const level of [3, 5, 8, 10]) for (const sec of [200, 600, 1200]) {
      const { judgement: j } = cook('panSeared', [{ until: 30, level, add: ['oil'] }, { until: sec, level, add: ['chicken'] }]);
      const ls = labels(j);
      expect(ls.filter((l) => crust.some((c) => l.includes(c))).length, `level ${level} ${sec}s`).toBe(1);
      expect(ls.filter((l) => interior.some((c) => l.includes(c))).length, `level ${level} ${sec}s`).toBe(1);
    }
  });

  it('makes Carryover King reachable only by an A at a verified 165-168°F', () => {
    const ach = E.ACHIEVEMENTS.find((a) => a.id === 'carryoverKing');
    expect(ach.description).toContain('165-168°F');
    const ctx = (grade) => ({ recipe: E.RECIPES.panSeared, judgement: { grade } });
    expect(ach.check({ recipeFoodInternalF: 166 }, ctx('A'))).toBe(true);
    expect(ach.check({ recipeFoodInternalF: 160 }, ctx('A'))).toBe(false);
    expect(ach.check({ recipeFoodInternalF: 172 }, ctx('A'))).toBe(false);
    expect(ach.check({ recipeFoodInternalF: 166 }, ctx('B'))).toBe(false);
  });
});

describe('Kitchen Lab roast chicken judge', () => {
  it('grades the two-stage roast, pulled at 165°F and rested, an A with crackly skin', () => {
    const r = cook('roastChicken', [
      { until: 300, level: 8, add: ['seasoning'] }, { until: 1200, level: 8, add: ['chicken'] }, { until: 6000, level: 5 }
    ], { stopAtFoodF: 165 });
    // rest off heat for one sim-minute
    const rested = cook('roastChicken', [
      { until: 300, level: 8, add: ['seasoning'] }, { until: 1200, level: 8, add: ['chicken'] }, { until: r.simSec, level: 5 }, { until: r.simSec + 60, level: 0, off: true }
    ]);
    expect(has(rested.judgement, 'Crackly skin')).toBe(true);
    expect(has(rested.judgement, 'Internal temp') || has(rested.judgement, 'Slightly overdone')).toBe(true);
    expect(has(rested.judgement, 'Resting')).toBe(true);
    expect(has(rested.judgement, 'FOOD SAFETY')).toBe(false);
    expect(['A', 'B']).toContain(rested.judgement.grade);
  });

  it('calls a bird roasted at 350°F throughout pale-skinned, not burnt', () => {
    const { judgement: j } = cook('roastChicken', [{ until: 300, level: 5, add: ['seasoning'] }, { until: 7000, level: 5, add: ['chicken'] }], { stopAtFoodF: 165 });
    expect(has(j, 'Lightly golden skin') || has(j, 'Pale, flabby skin')).toBe(true);
    expect(has(j, 'Skin burnt')).toBe(false);
  });

  it('calls a bird left at 485°F until done burnt, never also pale', () => {
    const { judgement: j } = cook('roastChicken', [{ until: 300, level: 9, add: ['seasoning'] }, { until: 7000, level: 9, add: ['chicken'] }], { stopAtFoodF: 165 });
    expect(has(j, 'Skin burnt')).toBe(true);
    expect(has(j, 'Pale')).toBe(false);
  });
});

describe('Kitchen Lab sheet-pan judge', () => {
  const roast = (level, minutes, withFlip = true) => cook('sheetPan', [
    { until: 300, level }, { until: 310, level, add: ['oil'] }, { until: 320, level, add: ['veg'] },
    { until: 320 + minutes * 30, level, add: withFlip ? ['flip'] : [] }, { until: 320 + minutes * 60, level }
  ]);

  it('grades 25 minutes at 400°F with a flip an A: preheated, golden, fork-tender', () => {
    const { judgement: j } = roast(7, 25);
    expect(has(j, 'Preheat')).toBe(true);
    expect(has(j, 'Golden edges')).toBe(true);
    expect(has(j, 'Fork-tender')).toBe(true);
    expect(has(j, 'Halfway flip')).toBe(true);
    expect(j.grade).toBe('A');
  });

  it('calls 10 minutes pale and hard, never golden', () => {
    const { judgement: j } = roast(7, 10);
    expect(has(j, 'Pale')).toBe(true);
    expect(has(j, 'Hard inside')).toBe(true);
    expect(has(j, 'Golden edges')).toBe(false);
  });

  it('calls 25 minutes at 485°F charred, never pale', () => {
    const { judgement: j } = roast(9, 25);
    expect(has(j, 'Charred edges')).toBe(true);
    expect(has(j, 'Pale')).toBe(false);
  });

  it('judges preheat by the oven temp when the tray went in, not the later peak', () => {
    const { judgement: j } = cook('sheetPan', [{ until: 5, level: 7, add: ['oil', 'veg'] }, { until: 1800, level: 7, add: ['flip'] }]);
    expect(has(j, 'No real preheat')).toBe(true);
    expect(j.notes.find((n) => n.label.includes('No real preheat')).detail).toMatch(/only (7\d|8\d|9\d|1\d\d)°F/);
  });
});

describe('Kitchen Lab stir-fry judge', () => {
  const wok = (level, aromaticsAlone = 15, hardVegSec = 120) => cook('stirFry', [
    { until: 60, level, add: ['oil'] }, { until: 60 + aromaticsAlone, level, add: ['aromatics'] },
    { until: 60 + aromaticsAlone + hardVegSec * 0.6, level, add: ['hardVeg'] },
    { until: 60 + aromaticsAlone + hardVegSec * 0.9, level, add: ['softVeg'] },
    { until: 60 + aromaticsAlone + hardVegSec, level, add: ['sauce'] }
  ]);

  it('grades a screaming-hot, properly ordered, quick stir-fry an A', () => {
    const { judgement: j } = wok(10);
    expect(has(j, 'Proper heat')).toBe(true);
    expect(has(j, 'Aromatics')).toBe(true);
    expect(has(j, 'Ingredient order')).toBe(true);
    expect(has(j, 'Timing')).toBe(true);
    expect(j.grade).toBe('A');
  });

  it('judges heat by the pan temp when the vegetables went in', () => {
    const { judgement: j } = wok(5);
    expect(has(j, 'Pan not hot enough')).toBe(true);
    expect(j.notes.find((n) => n.label.includes('Pan not hot enough')).detail).toMatch(/only 3\d\d°F when the vegetables went in/);
  });

  it('burns the aromatics left alone too long in a hot pan, and only then', () => {
    expect(has(wok(10, 60).judgement, 'Burnt aromatics')).toBe(true);
    expect(has(wok(10, 20).judgement, 'Burnt aromatics')).toBe(false);
    expect(has(wok(4, 60).judgement, 'Burnt aromatics')).toBe(false); // too cool to burn
  });

  it('never pairs undercooked and overcooked, or proper heat and steam-fried', () => {
    for (const level of [4, 7, 10]) for (const hv of [40, 120, 400]) {
      const { judgement: j } = wok(level, 15, hv);
      const tag = `level ${level} hardVeg ${hv}s`;
      expect(has(j, 'Undercooked') && has(j, 'Overcooked'), tag).toBe(false);
      expect(has(j, 'Proper heat') && has(j, 'Pan not hot enough'), tag).toBe(false);
      expect(labels(j).filter((l) => /Undercooked|Overcooked|Charred|Timing/.test(l)).length, tag).toBe(1);
    }
  });
});

describe('Kitchen Lab pasta + pan sauce judge', () => {
  const t0 = 1_000_000;
  const pot = (over = {}) => Object.assign({ potWaterReserved: true, potStartedAt: t0, potPastaInAt: t0 + 60_000, potDrainedAt: t0 + 60_000 + 135_000 }, over); // 4× sim: 4 min heat, 9 min cook
  const sauce = (level, fullState = pot()) => cook('pastaSauce', [
    { until: 60, level, add: ['oil'] }, { until: 90, level, add: ['garlic'] }, { until: 600, level, add: ['tomatoes'] }, { until: 630, level, add: ['pasta'] }
  ], { fullState });

  it('grades a gentle simmer with mellow garlic, saved water, boiling drop and al dente pasta an A', () => {
    const { judgement: j } = sauce(3);
    expect(has(j, 'Sauce temp')).toBe(true);
    expect(has(j, 'Garlic mellow')).toBe(true);
    expect(has(j, 'Pasta water saved')).toBe(true);
    expect(has(j, 'Boiling water')).toBe(true);
    expect(has(j, 'Al dente')).toBe(true);
    expect(j.grade).toBe('A');
  });

  it('scorches the sauce and browns the garlic on contact at dial 7, never also calling it barely cooked', () => {
    const { judgement: j } = sauce(7);
    expect(has(j, 'Scorched sauce')).toBe(true);
    expect(has(j, 'Garlic browned on contact')).toBe(true);
    expect(has(j, 'barely cooked')).toBe(false);
  });

  it('reads pasta texture from how long it boiled before draining', () => {
    expect(has(sauce(3, pot({ potDrainedAt: t0 + 60_000 + 60_000 })).judgement, 'Pasta underdone')).toBe(true);   // 4 sim-min
    expect(has(sauce(3, pot({ potDrainedAt: t0 + 60_000 + 240_000 })).judgement, 'Pasta overcooked')).toBe(true); // 16 sim-min
  });
});

describe('Kitchen Lab scrambled-egg judge reads one doneness state', () => {
  const eggs = () => E.RECIPES.scrambledEggs;
  const snapshot = (over = {}) => ({
    maxPanTempF: 270, activeTimeSec: 75,
    itemAddTimes: { butter: 1000, eggs: 5000, saltPepper: 90000 },
    // Heat pulled at 54 s with the eggs still glossy; they finish setting at 56 s off the burner.
    heatRemovedAt: 54000, lastTickAt: 95000, heatRemovedBeforeOverdone: true,
    doneness: { browning: 0.05, foodPeakF: 168, secAboveOverF: 12, setAt: 56000, set: true, simElapsedSec: 95 },
    ...over
  });

  it('declares the doneness thresholds the tick integrates against', () => {
    expect(eggs().doneness).toEqual({ foodK: 0.014, foodMaxF: 212, setF: 145, overF: 175, browningFrom: 'eggs', browningScale: [0.12, 0.3, 0.5, 0.8], stir: { label: 'Stir + fold', icon: '🥄', grace: 15 } });
    expect(E.RECIPES.omelet.doneness).toEqual({ foodK: 0.014, foodMaxF: 212, setF: 145, overF: 175, browningFrom: 'eggs', browningScale: [0.4, 0.9, 1.4, 2.5], stir: { label: 'Shake + scrape', icon: '🍳', grace: 10 } });
  });

  it('grades a textbook low-and-slow scramble A with no negative notes', () => {
    const j = eggs().judge(snapshot());
    expect(j.grade).toBe('A');
    expect(j.score).toBe(100);
    expect(j.notes.every((n) => n.neg === false)).toBe(true);
    expect(has(j, 'Carryover')).toBe(true);
  });

  it('calls the demonstrated 15-second 419°F run hot and raw, never carryover-perfect', () => {
    const j = eggs().judge(snapshot({
      maxPanTempF: 419, activeTimeSec: 15, heatRemovedAt: 20000, lastTickAt: 22000,
      itemAddTimes: { butter: 1000, eggs: 5000, saltPepper: 21000 },
      doneness: { browning: 0.08, foodPeakF: 98, secAboveOverF: 0, setAt: null, set: false, simElapsedSec: 22 }
    }));
    expect(has(j, 'Running hot')).toBe(true);
    expect(has(j, 'Way too fast')).toBe(true);
    expect(has(j, 'Carryover')).toBe(false);
    expect(has(j, 'Way too hot')).toBe(false);
    // Eggs that never set cannot pass, and the verdict says why
    expect(j.score).toBeLessThanOrEqual(55);
    expect(j.grade).toBe('F');
    expect(j.verdict).toMatch(/raw/i);
  });

  it('describes scorched-outside raw-inside eggs as one dish, not as browned AND runny', () => {
    const j = eggs().judge(snapshot({
      maxPanTempF: 475, activeTimeSec: 20, heatRemovedAt: 25000,
      doneness: { browning: 0.6, foodPeakF: 120, secAboveOverF: 0, setAt: null, set: false, simElapsedSec: 30 }
    }));
    expect(has(j, 'Way too hot')).toBe(true);
    expect(has(j, 'Pulled early')).toBe(true);
    expect(has(j, 'Way too fast')).toBe(false);
    expect(has(j, 'Carryover')).toBe(false);
    expect(j.grade).toBe('F');
  });

  it('keeps exactly one surface note and one interior note, and never a contradictory pair, across the state grid', () => {
    const surface = ['Way too hot', 'A bit hot', 'Running hot', 'Pan temp', 'cool side', 'Too cold'];
    const interior = ['Pulled early', 'Way too fast', 'A bit fast', 'Overcooked', 'Slightly dry', 'Timing'];
    for (const browning of [0, 0.2, 0.4, 0.8]) {
      for (const peakF of [98, 140, 170, 212]) {
        for (const overSec of [0, 60, 100]) {
          for (const maxT of [230, 270, 350, 450]) {
            const set = peakF >= 145;
            const j = eggs().judge(snapshot({
              maxPanTempF: maxT,
              doneness: { browning, foodPeakF: peakF, secAboveOverF: set ? overSec : 0, setAt: set ? 56000 : null, set, simElapsedSec: 95 }
            }));
            const ls = labels(j);
            const tag = `browning=${browning} peak=${peakF} over=${overSec} maxT=${maxT}`;
            expect(ls.filter((l) => surface.some((s) => l.includes(s))).length, tag).toBe(1);
            expect(ls.filter((l) => interior.some((s) => l.includes(s))).length, tag).toBe(1);
            expect(has(j, 'Way too hot') && has(j, 'Way too fast'), tag).toBe(false);
            expect(has(j, 'Carryover') && (has(j, 'Way too hot') || has(j, 'A bit hot')), tag).toBe(false);
            expect(has(j, 'Carryover') && !set, tag).toBe(false);
            expect(has(j, 'Overcooked') && has(j, 'fast'), tag).toBe(false);
            expect(j.score).toBeGreaterThanOrEqual(0);
            expect(j.score).toBeLessThanOrEqual(100);
            // Only truly runny eggs (never near setting) are capped below passing
            if (!set && peakF < 130) expect(j.score, tag).toBeLessThanOrEqual(55);
            if (!set && peakF >= 130) expect(j.verdict, tag).not.toMatch(/raw/i);
          }
        }
      }
    }
  });
});

describe('Kitchen Lab omelet judge reads the same doneness state', () => {
  const omelet = () => E.RECIPES.omelet;
  const snapshot = (over = {}) => ({
    maxPanTempF: 400, activeTimeSec: 60,
    itemAddTimes: { butter: 1000, eggs: 4000, roll: 64000 },
    heatRemovedAt: null, lastTickAt: 66000,
    doneness: { browning: 0.5, foodPeakF: 212, secAboveOverF: 20, setAt: 34000, set: true, simElapsedSec: 66 },
    ...over
  });

  it('grades a fast pale rolled omelet A', () => {
    const j = omelet().judge(snapshot());
    expect(j.grade).toBe('A');
    expect(j.notes.every((n) => n.neg === false)).toBe(true);
  });

  it('browns the sheet only after enough heat × time, and never also calls it too fast', () => {
    const j = omelet().judge(snapshot({ maxPanTempF: 467, doneness: { browning: 1.55, foodPeakF: 212, secAboveOverF: 26, setAt: 30000, set: true, simElapsedSec: 66 } }));
    expect(has(j, 'Browned + tough')).toBe(true);
    expect(has(j, 'Too fast')).toBe(false);
  });

  it('calls a liquid interior too fast without calling it too slow', () => {
    const j = omelet().judge(snapshot({ activeTimeSec: 22, doneness: { browning: 0.08, foodPeakF: 121, secAboveOverF: 0, setAt: null, set: false, simElapsedSec: 30 } }));
    expect(has(j, 'Too fast')).toBe(true);
    expect(has(j, 'Too slow')).toBe(false);
    expect(j.grade).toBe('F');
    expect(j.verdict).toMatch(/raw/i);
  });
});

describe('Kitchen Lab tick guards real time', () => {
  it('clamps the per-tick real-time step so a tab switch is not applied as one lump', () => {
    expect(source).toContain('var dtRealSec = Math.min(2, Math.max(0, (now - (prior.recipeLastTickAt || now)) / 1000));');
  });

  it('pauses the cook when the document is hidden', () => {
    expect(source).toContain("document.addEventListener('visibilitychange', function() {");
    expect(source).toContain('if (document.hidden && typeof _klPauseHook === \'function\') _klPauseHook();');
    expect(source).toContain('_klPauseHook = pauseRecipe;');
  });

  it('resets the doneness state in default state and in all three cook starts, and shifts the set time on resume', () => {
    expect(source.match(/recipeOptions: \{\}, recipeMarks: \{\},/g)).toHaveLength(4); // the per-cook reset line, in defaultState + 3 cook starts
    expect(source.match(/recipeTempHistory: \[\]/g)).toHaveLength(3);
    expect(source).toContain('recipeFoodSetAt: shiftTimestamp(d.recipeFoodSetAt),');
  });

  it('shows one sim-time cook clock in the cockpit header', () => {
    expect(source).not.toContain('total elapsed');
    expect(source).toContain("' — cook time: ' +\n            klClock(d.recipeSimElapsedSec || 0)");
    expect(E.defaultState().recipeSimElapsedSec).toBe(0);
  });
});

describe('Kitchen Lab stirring', () => {
  it('browns unattended eggs 1.7× faster than eggs stirred within the grace period', () => {
    const still = cook('scrambledEggs', [{ until: 40, level: 5, add: ['butter'] }, { until: 130, level: 5, add: ['eggs'] }]);
    const stirred = cook('scrambledEggs', [{ until: 40, level: 5, add: ['butter'] }, { until: 130, level: 5, add: ['eggs'], stir: 12 }]);
    expect(stirred.state.recipeUnattendedSec).toBe(0);
    expect(still.state.recipeUnattendedSec).toBeGreaterThan(60);
    expect(still.browning / stirred.browning).toBeGreaterThan(1.5);
    expect(still.browning / stirred.browning).toBeLessThan(1.75);
  });

  it('flags eggs left alone and credits eggs kept moving, never both', () => {
    const still = cook('scrambledEggs', [{ until: 40, level: 3, add: ['butter'] }, { until: 130, level: 3, add: ['eggs'] }, { until: 140, level: 0, off: true, add: ['saltPepper'] }]);
    const stirred = cook('scrambledEggs', [{ until: 40, level: 3, add: ['butter'] }, { until: 130, level: 3, add: ['eggs'], stir: 12 }, { until: 140, level: 0, off: true, add: ['saltPepper'] }]);
    expect(has(still.judgement, 'Left alone')).toBe(true);
    expect(has(still.judgement, 'Kept moving')).toBe(false);
    expect(has(stirred.judgement, 'Kept moving')).toBe(true);
    expect(has(stirred.judgement, 'Left alone')).toBe(false);
  });

  it('does not count an empty or cool pan as unattended', () => {
    const r = cook('scrambledEggs', [{ until: 120, level: 1 }, { until: 200, level: 1, add: ['butter', 'eggs'] }]); // dial 1 = 220°F, under the 250°F floor
    expect(r.state.recipeUnattendedSec).toBe(0);
  });

  it('gives back crust when the chicken is poked, and the judge says so', () => {
    const sched = (stir) => [{ until: 60, level: 8, add: ['oil'] }, { until: 330, level: 8, add: ['chicken'], stir }, { until: 570, level: 8 }, { until: 900, level: 4 }, { until: 930, level: 0, off: true }];
    const patient = cook('panSeared', sched(0), { stopAtFoodF: 165 });
    const poked = cook('panSeared', sched(4), { stopAtFoodF: 165 });
    expect(poked.browning).toBeLessThan(patient.browning * 0.8);
    expect(has(patient.judgement, 'Left it alone')).toBe(true);
    expect(has(poked.judgement, 'Moved during the sear')).toBe(true);
    expect(has(poked.judgement, 'Left it alone')).toBe(false);
    expect(poked.judgement.score).toBeLessThan(patient.judgement.score);
  });

  it('wires the stir action into the cockpit and the tick', () => {
    expect(source).toContain('function stirPan()');
    expect(source).toContain("if (stir.disturbs) patch.recipeBrowning = (prior.recipeBrowning || 0) * 0.8;");
    expect(source).toContain("'data-kl-stir': stir.disturbs ? 'disturbs' : 'stir'");
    expect(source).toContain('recipeUnattendedSec: (prior.recipeUnattendedSec || 0) + (unattended ? dtSec : 0)');
    expect(source.match(/recipeLastStirSimSec: null, recipeStirCount: 0, recipeUnattendedSec: 0, recipeTraceStepSec: 1,/g)).toHaveLength(4);
  });
});

describe('Kitchen Lab temperature trace covers the whole cook', () => {
  it('samples on sim time and thins itself instead of keeping the last 60 seconds', () => {
    expect(source).not.toContain('.slice(-120)');
    expect(source).toContain('if (hist.length > 240) { hist = hist.filter(function(_, i) { return i % 2 === 0; }); traceStep *= 2; }');
    expect(source).toContain("'data-kl-trace': compact ? 'live' : 'full',");
    expect(source).toContain("renderTempTrace(d.recipeTempHistory, { compact: true, marks: traceMarks(rec) })");
    expect(source).toContain("renderTempTrace(d.recipeTempHistory, { marks: traceMarks(rec) })");
  });

  it('records the sim time of every ingredient and the heat-off moment for the trace marks', () => {
    expect(source).toContain('newSim[itemId] = simNow;');
    expect(source).toContain('patch.recipeHeatRemovedSimSec = prior.recipeSimElapsedSec || 0;');
  });
});

describe('Kitchen Lab sizzle cue', () => {
  it('is silent below boiling, grows with pan heat, and fades as the surface water goes', () => {
    expect(E.klSizzleLevel(150, false, 40)).toMatchObject({ level: 0, tier: 'quiet' });
    expect(E.klSizzleLevel(200, true, 60)).toMatchObject({ level: 0, tier: 'quiet' });
    const gentle = E.klSizzleLevel(260, true, 100), steady = E.klSizzleLevel(360, true, 120), spatter = E.klSizzleLevel(450, true, 120);
    expect(gentle.tier).toBe('gentle'); expect(steady.tier).toBe('steady'); expect(spatter.tier).toBe('spatter');
    expect(gentle.level).toBeLessThan(steady.level); expect(steady.level).toBeLessThan(spatter.level);
    expect(E.klSizzleLevel(360, true, 210).level).toBeLessThan(steady.level);
    expect(E.klSizzleLevel(360, true, 210).caption).toMatch(/fading/);
    expect(E.klSizzleLevel(400, false, 40).tier).toBe('dry');
  });

  it('ships the caption as plain text (not a live region) with an explicit on/off toggle, off by default', () => {
    expect(source).toContain("'data-kl-sizzle': sz.tier");
    expect(source).not.toMatch(/'data-kl-sizzle'[^\n]*aria-live/);
    expect(source).toContain("'aria-pressed': on ? 'true' : 'false', onClick: toggleSizzle");
    expect(E.defaultState().klSizzleOn).toBeUndefined();
    expect(source).toContain("if (section !== 'recipe' || d.recipePhase !== 'cooking') setTimeout(function() { klAudioSet(0, 'quiet', false); }, 0);");
  });
});

describe('Kitchen Lab pan material', () => {
  it('offers three pans, stainless keeping the constants the sim always had', () => {
    expect(E.PAN_MATERIALS.map((m) => m.id)).toEqual(['nonstick', 'stainless', 'castIron']);
    expect(E.panMaterial(undefined).id).toBe('stainless');
    expect(E.getRecipeThermal(E.RECIPES.scrambledEggs)).toMatchObject({ mode: 'pan', material: 'stainless', k_up: 0.08, k_down: 0.025 });
    expect(E.getRecipeThermal(E.RECIPES.sheetPan, 'castIron').mode).toBe('oven'); // ovens ignore the pan
  });

  it('heats cast iron slowest and non-stick fastest', () => {
    const timeTo220 = (material) => { let pan = 70, t = 0; const th = E.getRecipeThermal(E.RECIPES.scrambledEggs, material); while (pan < 220 && t < 600) { pan = E.tickPanTemp(pan, 3, 0.5, th); t += 0.5; } return t; };
    expect(timeTo220('nonstick')).toBeLessThan(timeTo220('stainless'));
    expect(timeTo220('stainless')).toBeLessThan(timeTo220('castIron'));
    expect(timeTo220('castIron')).toBeLessThan(120);
  });

  it('holds a sear in cast iron and sags in thin non-stick when the chicken lands', () => {
    const drop = (material) => { const r = cook('panSeared', [{ until: 90, level: 8, add: ['oil'] }, { until: 90.5, level: 8, add: ['chicken'] }], { material }); return r.snapshot.itemAddPanF.chicken - r.trace[1].pan; };
    expect(E.panMaterial('castIron').foodDropF).toBeLessThan(E.panMaterial('stainless').foodDropF);
    expect(E.panMaterial('stainless').foodDropF).toBeLessThan(E.panMaterial('nonstick').foodDropF);
    expect(drop('castIron')).toBeLessThan(drop('nonstick') - 30);
  });

  it('records the pan temperature the food met, before the drop', () => {
    const r = cook('panSeared', [{ until: 60, level: 8, add: ['oil'] }, { until: 61, level: 8, add: ['chicken'] }], { material: 'nonstick' });
    expect(r.snapshot.itemAddPanF.chicken).toBeGreaterThan(400);
  });

  it('is chosen in the cockpit before the first ingredient, on the stovetop only', () => {
    expect(source).toContain("if (getRecipeThermal(rec).mode === 'oven') return null;");
    expect(source).toContain("role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-kl-pan': m.id,");
    expect(source).toContain("disabled: locked || isPaused, onClick: function() { setKL({ klPanMaterial: m.id });");
    expect(source).toContain("var thermal = getRecipeThermal(rec, prior.klPanMaterial);");
    expect(source).toContain("patch.recipePanTempF = Math.max(70, (prior.recipePanTempF || 70) - panMaterial(prior.klPanMaterial).foodDropF);");
  });
});

describe('Kitchen Lab visuals read the doneness state', () => {
  it('colours every recipe from browning, not elapsed time', () => {
    for (const id of ['stirFry', 'panSeared', 'sheetPan', 'roastChicken', 'pastaSauce', 'omelet']) {
      expect(E.RECIPES[id].renderVisual.toString(), id).toMatch(/state\.browning/);
    }
    // the old time × temp heuristics are gone
    expect(source).not.toContain('var brownIntensity = Math.min(1, (t / 1500)');
    expect(source).not.toContain("if (panTemp > 480 && t > 60) crustColor");
    expect(source).not.toContain("if (ovenTemp > 470 && t > 600) skinColor");
  });

  it('renders every visual without throwing across the doneness range', () => {
    const h = (tag, props, ...children) => ({ tag, props, children: children.flat().filter(Boolean) });
    for (const id of Object.keys(E.RECIPES)) {
      const rec = E.RECIPES[id];
      if (typeof rec.renderVisual !== 'function') continue;
      const items = rec.ingredients.map((i) => i.id);
      for (const browning of [0, 2, 10, 40, 120]) for (const panTemp of [70, 300, 480]) {
        const tree = rec.renderVisual(h, { panTemp, itemsInPan: items, activeTime: 300, foodTemp: 150, browning, set: true, stirCount: 2, unattended: browning > 5, itemAddPanF: { garlic: 380, chicken: 410 }, itemAddSimSec: { aromatics: 10 }, simElapsed: 300 });
        expect(tree && tree.tag, `${id} b=${browning} t=${panTemp}`).toBe('svg');
      }
    }
  });
});

describe('Kitchen Lab oil and smoke points', () => {
  it('defaults each stovetop recipe to an oil that suits it, from the Resources table', () => {
    expect(E.oilFor(E.RECIPES.stirFry, {}).oil).toBe('Refined avocado oil');
    expect(E.oilFor(E.RECIPES.panSeared, {}).smokeF).toBe(520);
    expect(E.oilFor(E.RECIPES.pastaSauce, {}).oil).toBe('Extra virgin olive oil');
    expect(E.oilFor(E.RECIPES.scrambledEggs, {})).toBeNull();
    expect(E.oilFor(E.RECIPES.sheetPan, {})).toBeNull();
    expect(E.oilFor(E.RECIPES.stirFry, { recipeOil: 'not a real oil' }).oil).toBe('Refined avocado oil');
  });

  it('smokes olive oil in a screaming wok and not avocado oil, and the judge names it', () => {
    const wok = (oil) => cook('stirFry', [
      { until: 60, level: 10, add: ['oil'] }, { until: 75, level: 10, add: ['aromatics'] }, { until: 150, level: 10, add: ['hardVeg'], stir: 6 },
      { until: 185, level: 10, add: ['softVeg'], stir: 3 }, { until: 200, level: 10, add: ['sauce'], stir: 2 }
    ], { oil });
    const olive = wok('Extra virgin olive oil'), avocado = wok('Refined avocado oil');
    expect(olive.state.recipeSmokeSec).toBeGreaterThan(60);
    expect(avocado.state.recipeSmokeSec).toBe(0);
    expect(has(olive.judgement, 'Oil past its smoke point')).toBe(true);
    expect(has(avocado.judgement, 'Oil matched the heat')).toBe(true);
    expect(olive.judgement.score).toBe(avocado.judgement.score - 10);
  });

  it('only counts smoke while the oil is actually in the pan', () => {
    const r = cook('panSeared', [{ until: 120, level: 10 }], { oil: 'Butter (unclarified)' }); // hot empty pan, butter never added
    expect(r.state.recipeSmokeSec).toBe(0);
  });

  it('lets a sauce pan run olive oil past its smoke point and says so alongside the scorch, never "barely cooked"', () => {
    const t0 = 1_000_000;
    const pot = { potWaterReserved: true, potStartedAt: t0, potPastaInAt: t0 + 60_000, potDrainedAt: t0 + 60_000 + 135_000 };
    const { judgement: j } = cook('pastaSauce', [{ until: 60, level: 7, add: ['oil'] }, { until: 90, level: 7, add: ['garlic'] }, { until: 600, level: 7, add: ['tomatoes'] }, { until: 630, level: 7, add: ['pasta'] }], { fullState: pot });
    expect(has(j, 'Oil past its smoke point')).toBe(true);
    expect(has(j, 'Scorched sauce')).toBe(true);
    expect(has(j, 'barely cooked')).toBe(false);
  });

  it('wires the oil selector and smoke warning into the cockpit', () => {
    expect(source).toContain("h('select', { id: 'kl-oil-select', 'data-kl-oil': oil ? oil.oil : '', value: oil ? oil.oil : fat.default, disabled: lockedOil || isPaused,");
    expect(source).toContain("nowSmoking ? h('div', { 'data-kl-smoke': 'true',");
    expect(source.match(/recipeOil: null, recipeSmokeSec: 0,/g)).toHaveLength(4);
  });
});

describe('Kitchen Lab surface colour scale', () => {
  it('names browning on each dish\'s own scale', () => {
    expect(E.browningLabel(0, [1, 4, 9, 24])).toMatchObject({ idx: 0, label: 'pale' });
    expect(E.browningLabel(2, [1, 4, 9, 24])).toMatchObject({ idx: 1, label: 'first colour' });
    expect(E.browningLabel(5, [1, 4, 9, 24])).toMatchObject({ idx: 2, label: 'golden' });
    expect(E.browningLabel(10, [1, 4, 9, 24])).toMatchObject({ idx: 3, label: 'deep brown' });
    expect(E.browningLabel(30, [1, 4, 9, 24])).toMatchObject({ idx: 4, label: 'burnt' });
    // the same browning is "burnt" for eggs and "pale" for a roast bird
    expect(E.browningLabel(1, E.RECIPES.scrambledEggs.doneness.browningScale).label).toBe('burnt');
    expect(E.browningLabel(1, E.RECIPES.roastChicken.doneness.browningScale).label).toBe('pale');
  });

  it('gives every recipe a scale whose "burnt" step matches its judge', () => {
    for (const id of Object.keys(E.RECIPES)) {
      const rec = E.RECIPES[id];
      if (rec.sandbox) continue;
      expect(rec.doneness.browningScale, id).toHaveLength(4);
      for (let i = 1; i < 4; i++) expect(rec.doneness.browningScale[i], id).toBeGreaterThan(rec.doneness.browningScale[i - 1]);
    }
    expect(E.RECIPES.panSeared.doneness.browningScale[3]).toBe(24);   // judge: crust burnt ≥ 24
    expect(E.RECIPES.sheetPan.doneness.browningScale[3]).toBe(32);    // judge: charred ≥ 32
    expect(E.RECIPES.roastChicken.doneness.browningScale[3]).toBe(110); // judge: skin burnt ≥ 110
    expect(source).toContain("'data-kl-surface': mainIn ? bl.label : 'none'");
  });
});

describe('Kitchen Lab Free Cook sandbox', () => {
  it('offers five foods, each with a doneness config and a reference line', () => {
    expect(E.SANDBOX_FOODS.map((f) => f.id)).toEqual(['eggs', 'chicken', 'steak', 'mushrooms', 'onion']);
    for (const f of E.SANDBOX_FOODS) {
      expect(f.doneness.browningScale, f.id).toHaveLength(4);
      expect(f.doneness.browningFrom, f.id).toBe(f.id);
      expect(f.guide.length, f.id).toBeGreaterThan(20);
    }
    expect(E.sandboxFood('nope').id).toBe('eggs');
    expect(E.recipeIngredients(E.RECIPES.freeCook, { sandboxFood: 'steak' }).map((i) => i.id)).toEqual(['oil', 'steak']);
    expect(E.recipeDoneness(E.RECIPES.freeCook, { sandboxFood: 'steak' }).setF).toBe(145);
  });

  it('is not in the catalog, so competition, tournament and the suggester never pick it', () => {
    expect(E.RECIPE_CATALOG.some((r) => r.id === 'freeCook')).toBe(false);
    expect(source).toContain("if (rec.sandbox) {\n              return { recipePhase: 'done', recipeJudgement: judgement, recipeCurrentStep: rec.steps.length - 1, klNewAchievements: [] };");
    expect(source).toContain("if (!isSandbox && ctx.callGemini");
  });

  it('describes a soft scramble without a grade', () => {
    const r = cook('freeCook', [{ until: 30, level: 2, add: ['butter'] }, { until: 90, level: 2, add: ['eggs'], stir: 8 }, { until: 100, level: 0, off: true }], { food: 'eggs' });
    const j = r.judgement;
    expect(j.score).toBeNull(); expect(j.grade).toBeNull(); expect(j.sandbox).toBe(true);
    expect(has(j, 'Surface: pale')).toBe(true);
    expect(has(j, 'Interior: set')).toBe(true);
    expect(has(j, 'Attention: 8 stirs')).toBe(true);
    expect(has(j, 'Pan: Clad stainless')).toBe(true);
    expect(j.verdict).toMatch(/^Reference for whisked eggs/);
    expect(j.notes.every((n) => n.neg !== true)).toBe(true);
  });

  it('flags an unsafe steak and a burnt one, in the food\'s own terms', () => {
    const rare = cook('freeCook', [{ until: 60, level: 8, add: ['oil'] }, { until: 150, level: 8, add: ['steak'] }, { until: 160, level: 0, off: true }], { food: 'steak' });
    expect(rare.judgement.notes.find((n) => n.label.startsWith('🌡️ Interior')).detail).toMatch(/Below the USDA 145°F minimum/);
    const burnt = cook('freeCook', [{ until: 60, level: 10, add: ['oil'] }, { until: 800, level: 10, add: ['steak'] }], { food: 'steak' });
    expect(has(burnt.judgement, 'Surface: burnt')).toBe(true);
    expect(burnt.judgement.notes.find((n) => n.label.startsWith('🎨')).neg).toBe(true);
    expect(has(burnt.judgement, 'Oil: Refined avocado oil')).toBe(true);
  });

  it("treats a mushroom's water boiling off as the point, not as drying out", () => {
    const r = cook('freeCook', [{ until: 60, level: 8, add: ['oil'] }, { until: 360, level: 8, add: ['mushrooms'], stir: 12 }], { food: 'mushrooms' });
    const interior = r.judgement.notes.find((n) => n.label.startsWith('🌡️ Interior'));
    expect(interior.label).toBe('🌡️ Interior: cooked through at 212°F');
    expect(interior.neg).toBe(false);
    expect(interior.detail).toMatch(/water boiled off/);
  });

  it('browns mushrooms in a hot pan and leaves them pale in a cool one', () => {
    const hot = cook('freeCook', [{ until: 60, level: 8, add: ['oil'] }, { until: 360, level: 8, add: ['mushrooms'], stir: 12 }], { food: 'mushrooms' });
    const cool = cook('freeCook', [{ until: 60, level: 2, add: ['oil'] }, { until: 360, level: 2, add: ['mushrooms'], stir: 12 }], { food: 'mushrooms' });
    expect(E.browningLabel(hot.browning, E.sandboxFood('mushrooms').doneness.browningScale).idx).toBeGreaterThanOrEqual(2);
    expect(has(cool.judgement, 'Surface: pale')).toBe(true);
  });

  it('renders every sandbox food without throwing', () => {
    expect(source).toContain("if (food.visual === 'pieces') return renderPiecesVisual(h, state, food);");
    expect(source).toContain("itemsInPan: state.itemsInPan.map(function(id) { return id === food.id ? 'chicken' : id; }) });");
    expect(source).toContain("'data-kl-free-cook': 'start'");
  });
});

describe('Kitchen Lab new recipes: pancakes', () => {
  const flipAt = (flipSec, level = 5, total = 130) => cook('pancakes', [
    { until: 60, level }, { until: 62, level, add: ['oil'] }, { until: 62 + flipSec, level, add: ['batter'] },
    { until: 62 + total, level, mark: 'flip' }, { until: 62 + total + 5, level: 0, off: true }
  ], { stopAtFoodF: 200 });

  it('grades a medium-heat pancake flipped on the bubbles an A with two golden sides', () => {
    const { judgement: j, state } = flipAt(70);
    expect(has(j, 'Flipped on cue')).toBe(true);
    expect(has(j, 'Matched sides')).toBe(true);
    expect(has(j, 'Set through')).toBe(true);
    expect(state.recipeMarks.flip.browning).toBeGreaterThan(0.15);
    expect(state.recipeMarks.flip.browning).toBeLessThan(0.8);
    expect(j.grade).toBe('A');
  });

  it('calls an early flip early and a never-flipped pancake never flipped', () => {
    expect(has(flipAt(12).judgement, 'Flipped too early')).toBe(true);
    const never = cook('pancakes', [{ until: 60, level: 5 }, { until: 62, level: 5, add: ['oil'] }, { until: 200, level: 5, add: ['batter'] }], { stopAtFoodF: 200 });
    expect(has(never.judgement, 'Never flipped')).toBe(true);
  });

  it('caps a raw centre below passing and names the pan when it outran the inside', () => {
    const raw = cook('pancakes', [{ until: 60, level: 5 }, { until: 62, level: 5, add: ['oil'] }, { until: 100, level: 5, add: ['batter'] }, { until: 120, level: 5, mark: 'flip' }, { until: 125, level: 0, off: true }]);
    expect(has(raw.judgement, 'Raw in the middle')).toBe(true);
    expect(raw.judgement.score).toBeLessThanOrEqual(55);
    const hot = flipAt(70, 8);
    expect(has(hot.judgement, 'Flipped late')).toBe(true);
    expect(has(hot.judgement, 'Pan too hot')).toBe(true);
    expect(has(hot.judgement, 'Flipped too early')).toBe(false);
  });

  it('records the flip as a step mark the trace and judge both read', () => {
    expect(E.RECIPES.pancakes.steps.find((st) => st.record === 'flip').recordIcon).toBe('🔄');
    expect(source).toContain("marks[finishing.record] = { simSec: prior.recipeSimElapsedSec || 0, browning: prior.recipeBrowning || 0,");
    expect(source).toContain("Object.keys(rm).forEach(function(k) { marks.push({ t: rm[k].simSec, icon: rm[k].icon || '🔖', label: k }); });");
  });
});

describe('Kitchen Lab new recipes: steak', () => {
  const sear = (targetId, pullF) => cook('steak', [
    { until: 60, level: 9, add: ['oil'] }, { until: 270, level: 9, add: ['steak'] }, { until: 480, level: 9 }, { until: 1200, level: 9 }
  ], { options: { target: targetId }, stopAtFoodF: pullF });

  it('offers medium, medium-well and well done, with medium as the USDA-minimum default', () => {
    const opt = E.RECIPES.steak.options.find((o) => o.id === 'target');
    expect(opt.choices.map((c) => c.value)).toEqual([145, 150, 160]);
    expect(E.optionValue(E.RECIPES.steak, {}, 'target').value).toBe(145);
    expect(E.optionValue(E.RECIPES.steak, { target: 'well' }, 'target').value).toBe(160);
    expect(E.optionValue(E.RECIPES.steak, { target: 'nonsense' }, 'target').value).toBe(145);
    expect(opt.footnote).toMatch(/Rare \(125°F\) and medium-rare \(135°F\) sit below the USDA/);
  });

  it('grades a hot sear pulled at a medium target an A, on target', () => {
    const { judgement: j, food } = sear('medium', 146);
    expect(food).toBeGreaterThanOrEqual(145);
    expect(has(j, 'Deep crust')).toBe(true);
    expect(has(j, 'On target: Medium')).toBe(true);
    expect(has(j, 'Oil matched the heat')).toBe(true);
    expect(j.grade).toBe('A');
  });

  it('fails anything under 145°F on safety, whatever target was chosen', () => {
    const { judgement: j } = sear('medium', 138);
    expect(has(j, 'FOOD SAFETY: under 145°F')).toBe(true);
    expect(j.score).toBeLessThanOrEqual(49);
  });

  it('holds the cook to the chosen band: under, on, and past', () => {
    expect(has(sear('well', 148).judgement, 'Under your target')).toBe(true);
    expect(has(sear('well', 161).judgement, 'On target: Well done')).toBe(true);
    expect(has(sear('medium', 156).judgement, 'Past your target')).toBe(true);
    expect(has(sear('medium', 185).judgement, 'Well past your target')).toBe(true);
  });

  it('borrows the sear visual with beef colours and the 145°F floor', () => {
    const h = (tag, props, ...children) => ({ tag, props, children: children.flat().filter(Boolean) });
    const tree = E.RECIPES.steak.renderVisual(h, { panTemp: 440, itemsInPan: ['oil', 'steak'], activeTime: 60, foodTemp: 100, browning: 0.5 });
    expect(tree.tag).toBe('svg');
    expect(JSON.stringify(tree)).toContain('#b91c1c');
    expect(source).toContain("var crustColor = state.rawColor || '#fde68a';");
  });
});

describe('Kitchen Lab new recipes: caramelised onions', () => {
  const onions = (level, minutes, extra = {}) => cook('caramelisedOnions', [
    { until: 120, level }, { until: 126, level, add: ['fat'] }, { until: 126 + minutes * 60, level, add: ['onion'], stir: Math.max(1, Math.round(minutes / 4)) },
    ...(extra.noDeglaze ? [] : [{ until: 126 + minutes * 60 + 30, level, add: ['water'] }]), { until: 126 + minutes * 60 + 60, level: 0, off: true }
  ], { oil: extra.oil });

  it('runs at 6× and reaches soft and golden in 35 sim-minutes at dial 4', () => {
    expect(E.RECIPES.caramelisedOnions.simSpeedMultiplier).toBe(6);
    const { judgement: j, state } = onions(4, 35);
    expect(state.recipeSecAboveOverF).toBeGreaterThan(900);
    expect(has(j, 'Golden + jammy')).toBe(true);
    expect(has(j, 'Soft through')).toBe(true);
    expect(has(j, 'Fond lifted')).toBe(true);
    expect(has(j, 'Stirred through')).toBe(true);
    expect(j.grade).toBe('A');
  });

  it('cools the pan when the deglazing water goes in', () => {
    const r = cook('caramelisedOnions', [{ until: 120, level: 4, add: ['fat', 'onion'] }, { until: 600, level: 4 }, { until: 606, level: 4, add: ['water'] }]);
    const before = r.trace[1].pan, justAfter = r.snapshot.itemAddPanF.water;
    expect(E.RECIPES.caramelisedOnions.ingredients.find((i) => i.id === 'water').cools).toBe(40);
    expect(before - r.trace[2].pan).toBeGreaterThan(20); // still recovering 6 s later
    expect(justAfter).toBe(Math.round(before));           // recorded before the drop
  });

  it('burns them at high heat and calls the heat the cause, never also "not caramelised"', () => {
    const { judgement: j } = onions(8, 35);
    expect(has(j, 'Burnt')).toBe(true);
    expect(has(j, 'Too hot for this job')).toBe(true);
    expect(has(j, 'Not caramelised')).toBe(false);
  });

  it('leaves them sharp and firm when rushed, and notes a skipped deglaze', () => {
    const { judgement: j } = onions(4, 8, { noDeglaze: true });
    expect(has(j, 'Not caramelised') || has(j, 'Only just coloured')).toBe(true);
    expect(has(j, 'Firm centres') || has(j, 'Still some bite')).toBe(true);
    expect(has(j, 'Fond left in the pan')).toBe(true);
    expect(has(j, 'Golden + jammy')).toBe(false);
  });

  it('smokes butter at dial 4 but not olive oil', () => {
    expect(has(onions(4, 35, { oil: 'Butter (unclarified)' }).judgement, 'Fat past its smoke point')).toBe(true);
    expect(has(onions(4, 35).judgement, 'Fat past its smoke point')).toBe(false);
  });
});

describe('Kitchen Lab catalog with ten recipes', () => {
  it('lists the three new recipes in the picker, competition pool and tournament pool', () => {
    const ids = E.RECIPE_CATALOG.map((r) => r.id);
    expect(ids).toContain('pancakes'); expect(ids).toContain('steak'); expect(ids).toContain('caramelisedOnions');
    expect(ids).toHaveLength(10);
    for (const id of ids) expect(E.RECIPES[id], id).toBeTruthy();
  });

  it('counts the whole catalog for Master Chef and Renaissance Cook instead of a hard-coded 7', () => {
    const master = E.ACHIEVEMENTS.find((a) => a.id === 'masterChef'), ren = E.ACHIEVEMENTS.find((a) => a.id === 'renaissanceCook');
    const seven = ['scrambledEggs', 'omelet', 'stirFry', 'panSeared', 'sheetPan', 'roastChicken', 'pastaSauce'];
    expect(master.check({ aGradedRecipeIds: seven }, {})).toBe(false);
    expect(ren.check({ recipeCompletedIds: seven }, {})).toBe(false);
    const all = E.RECIPE_CATALOG.map((r) => r.id);
    expect(master.check({ aGradedRecipeIds: all }, {})).toBe(true);
    expect(ren.check({ recipeCompletedIds: all }, {})).toBe(true);
  });

  it('renders the option radiogroup only for recipes that declare options', () => {
    expect(source).toContain("(rec.options || []).map(function(opt) {");
    expect(source).toContain("'data-kl-option': opt.id + ':' + c.id,");
    expect(E.RECIPES.scrambledEggs.options).toBeUndefined();
  });
});

describe('Kitchen Lab cockpit labels follow the recipe', () => {
  it('judges the pan-temperature label against the current step’s own range', () => {
    expect(source).toContain("tempLabel = '✓ in range for this step'");
    expect(source).toContain("s range (' + rangeStep.min + '°F+)'");
    expect(source).toContain("for (var si = stepIdx; si >= 0; si--) { if (rec.steps[si].target && rec.steps[si].target.panTempF)");
  });
  it('names the action on flip and finish steps instead of a generic continue', () => {
    expect(E.RECIPES.pancakes.steps[3].actionLabel).toBe('🔄 Flip the pancake');
    expect(E.RECIPES.steak.steps[2].actionLabel).toBe('🔄 Flip the steak');
    expect(E.RECIPES.steak.steps[4].actionLabel).toBe('🔪 Slice + serve');
    expect(E.RECIPES.panSeared.steps[2].actionLabel).toBe('🔄 Flip the chicken');
    expect(source).toContain("step.actionLabel ? step.actionLabel : __alloT('stem.kitchenlab.continue_to_next_step'");
  });
});

describe('Kitchen Lab Heat & Technique micro-cook', () => {
  it('runs the recipe physics in one go, for the technique’s usual time', () => {
    expect(E.HEAT_MICRO_SEC.saute).toBe(300);
    expect(E.HEAT_MICRO_SEC.sear).toBe(180);
    for (const t of E.TECHNIQUES) { expect(E.HEAT_MICRO_SEC[t.id], t.id).toBeGreaterThan(0); expect(E.sandboxFood(E.HEAT_DEFAULT_FOOD[t.id]).id, t.id).toBe(E.HEAT_DEFAULT_FOOD[t.id]); }
    const m = E.sandboxFood('mushrooms');
    const cool = E.microCook(m, 250, 300), saute = E.microCook(m, 375, 300), hot = E.microCook(m, 500, 300);
    expect(cool.label.label).toBe('pale'); expect(cool.sizzle.tier).toBe('gentle');
    expect(saute.label.label).toBe('golden');
    expect(hot.label.label).toBe('burnt'); expect(hot.sizzle.tier).toBe('spatter');
    expect(hot.browning).toBeGreaterThan(saute.browning); expect(saute.browning).toBeGreaterThan(cool.browning);
  });

  it('gives a steak a crust in a three-minute sear at 425-450°F and none at 300°F', () => {
    const st = E.sandboxFood('steak');
    expect(E.microCook(st, 300, 180).label.idx).toBeLessThanOrEqual(1);
    expect(E.microCook(st, 440, 180).label.label).toBe('golden');
    expect(E.microCook(st, 440, 180).foodEndF).toBeLessThan(145); // a sear alone does not cook a 1-inch steak through
  });

  it('smokes the fat when the pan is hotter than it can take', () => {
    const on = E.sandboxFood('onion');
    expect(E.microCook(on, 350, 300).smokeSec).toBe(0);            // olive oil, 375°F smoke point
    expect(E.microCook(on, 400, 300).smokeSec).toBeGreaterThan(8);
    expect(E.microCook(on, 400, 300).oil.oil).toBe('Extra virgin olive oil');
  });

  it('is wired into the Heat tab with a food picker, live readout and a run log', () => {
    expect(source).toContain("var live = microCook(food, panTemp, secs);");
    expect(source).toContain("'data-kl-heat-food': f.id,");
    expect(source).toContain("h('div', { 'data-kl-heat-live': live.label.label,");
    expect(source).toContain("setKL({ heatRuns: runs.concat([entry]).slice(-4) });");
  });
});

describe('Kitchen Lab surface moisture (the Recipe Kitchen model, brought across)', () => {
  const chicken = (dry) => cook('panSeared', [
    { until: 60, level: 8, add: ['oil'] }, { until: 330, level: 8, add: ['chicken'] }, { until: 570, level: 8 }, { until: 900, level: 4 }, { until: 930, level: 0, off: true }
  ], { options: { dry }, stopAtFoodF: 165 });

  it('holds browning to a trickle while the surface is wet, so a wet breast sears late', () => {
    const patted = chicken('patted'), wet = chicken('wet');
    expect(E.initialMoisture(E.RECIPES.panSeared, { recipeOptions: { dry: 'wet' } })).toBe(45);
    expect(E.initialMoisture(E.RECIPES.panSeared, {})).toBe(6);
    expect(patted.state.recipeSteamSec).toBe(0);
    expect(wet.state.recipeSteamSec).toBeGreaterThan(30);
    expect(wet.state.recipeSteamSec).toBeLessThan(150);
    expect(wet.browning).toBeLessThan(patted.browning);
    expect(has(wet.judgement, 'Wet surface')).toBe(true);
    expect(has(patted.judgement, 'Wet surface')).toBe(false);
  });

  it('makes a crowded wok steam before it browns, and credits two batches with room to breathe', () => {
    const wok = (load) => cook('stirFry', [
      { until: 60, level: 10, add: ['oil'] }, { until: 75, level: 10, add: ['aromatics'] }, { until: 150, level: 10, add: ['hardVeg'], stir: 6 },
      { until: 185, level: 10, add: ['softVeg'], stir: 3 }, { until: 200, level: 10, add: ['sauce'], stir: 2 }
    ], { options: { load } });
    const batches = wok('batches'), crowded = wok('crowded');
    expect(E.evapFactor(E.RECIPES.stirFry, { recipeOptions: { load: 'crowded' } })).toBe(0.45);
    expect(has(crowded.judgement, 'Steamed before it browned')).toBe(true);
    expect(has(batches.judgement, 'Room to breathe')).toBe(true);
    expect(crowded.browning).toBeLessThan(batches.browning);
    expect(crowded.judgement.score).toBeLessThan(batches.judgement.score);
  });

  it('lets the onion pile steam for minutes and still reach golden at dial 4', () => {
    const r = cook('caramelisedOnions', [{ until: 120, level: 4 }, { until: 126, level: 4, add: ['fat'] }, { until: 2226, level: 4, add: ['onion'], stir: 9 }, { until: 2256, level: 4, add: ['water'] }, { until: 2286, level: 0, off: true }]);
    expect(r.state.recipeSteamSec).toBeGreaterThan(200);
    expect(has(r.judgement, 'Golden + jammy')).toBe(true);
  });

  it('names the loud spatter of water hitting hot fat, and quietens once the surface dries', () => {
    expect(E.klSizzleLevel(430, true, 60, 40)).toMatchObject({ tier: 'spatter' });
    expect(E.klSizzleLevel(430, true, 60, 40).caption).toMatch(/loud spatter/);
    expect(E.klSizzleLevel(430, true, 60, 2).caption).not.toMatch(/loud spatter/);
    expect(E.klSizzleLevel(200, true, 60, 40).tier).toBe('quiet'); // below boiling nothing flashes off
  });

  it('shows the surface state on the cockpit tile and seeds the Heat-tab micro-cook with it', () => {
    expect(source).toContain("'data-kl-moisture': (d.recipeMoisture || 0) > 10 ? 'wet' : (d.recipeMoisture || 0) > 3 ? 'drying' : 'dry'");
    expect(source).toContain("s.recipeMoisture = initialMoisture(rec, s);   // the food brings its surface water");
    expect(E.microCook(E.sandboxFood('mushrooms'), 375, 300).steamSec).toBeGreaterThan(30);
    expect(E.microCook(E.sandboxFood('mushrooms'), 375, 300).label.label).toBe('golden');
  });
});

describe('Kitchen Lab reaches the 3D Recipe Kitchen from the recipe list', () => {
  it('renders the Recipe Kitchen as a sub-view of the Recipe Sim tab', () => {
    expect(source).toContain("var section = view === 'recipeKitchen' ? 'recipe' : view;");
    expect(source).toContain("else if (view === 'recipeKitchen') content = renderRecipeKitchen();");
    expect(source).toContain("src: 'stem_lab/kitchen_studio/recipe_lab.html'");
    expect(source).toContain("'data-kl-open-kitchen': 'true', onClick: function() { setSection('recipeKitchen'); }");
    expect(source).toContain("'data-kl-back': 'recipe'");
  });
});

describe('Kitchen Lab danger-zone clock', () => {
  it('doubles fastest in the 80-110°F sweet spot and not at all in the fridge or above 140°F', () => {
    expect(E.doublingMinutes(40)).toBe(Infinity);
    expect(E.doublingMinutes(140)).toBe(Infinity);
    expect(E.doublingMinutes(98)).toBe(20);
    expect(E.doublingMinutes(50)).toBeGreaterThan(E.doublingMinutes(70));
    expect(E.doublingMinutes(130)).toBeGreaterThan(E.doublingMinutes(110));
  });

  it('reproduces the 64× in two hours the tab has always claimed, and the USDA 2 h / 1 h limits', () => {
    expect(Math.round(E.dangerClock(98, 2).multiplier)).toBe(64);
    expect(E.dangerClock(98, 2)).toMatchObject({ limitHours: 1, overLimit: true });
    expect(E.dangerClock(72, 2)).toMatchObject({ limitHours: 2, overLimit: false });
    expect(E.dangerClock(72, 2.25).overLimit).toBe(true);
    expect(E.dangerClock(38, 8)).toMatchObject({ multiplier: 1, inZone: false, overLimit: false });
    expect(E.dangerClock(50, 2).multiplier).toBeLessThan(2);
  });

  it('is wired into the Safety tab with an hours slider', () => {
    expect(source).toContain("var clock = dangerClock(curTemp, hoursOut);");
    expect(source).toContain("onChange: function(e) { setKL({ safetyHours: parseFloat(e.target.value) }); },");
    expect(source).toContain("'data-kl-danger-clock': clock.inZone ? (clock.overLimit ? 'over' : 'within') : 'none'");
    expect(source).not.toContain('var growthAfter2h');
  });
});

describe('Kitchen Lab competition constraints on the doneness state', () => {
  const byId = (id) => E.COMPETITION_CONSTRAINTS.find((c) => c.id === id);
  it('adds four constraints to the pool', () => {
    expect(E.COMPETITION_CONSTRAINTS).toHaveLength(14);
    for (const id of ['drySurface', 'clearAir', 'attentive', 'thermometerTruth']) expect(byId(id), id).toBeTruthy();
  });
  it('passes and fails on the state the judge reads, and auto-passes where not applicable', () => {
    expect(byId('drySurface').check({ doneness: { steamSec: 12 } }).passed).toBe(true);
    expect(byId('drySurface').check({ doneness: { steamSec: 80 } }).passed).toBe(false);
    expect(byId('clearAir').check({ doneness: { oil: { oil: 'X', smokeF: 375 }, smokeSec: 30 } }).passed).toBe(false);
    expect(byId('clearAir').check({ doneness: { oil: null } }).resultText).toMatch(/automatic pass/);
    expect(byId('attentive').check({ doneness: { unattendedSec: 40 } }, E.RECIPES.scrambledEggs).passed).toBe(false);
    expect(byId('attentive').check({ doneness: { unattendedSec: 40 } }, E.RECIPES.panSeared).resultText).toMatch(/automatic pass/);
    expect(byId('thermometerTruth').check({ doneness: { foodPeakF: 167 } }, E.RECIPES.panSeared).passed).toBe(true);
    expect(byId('thermometerTruth').check({ doneness: { foodPeakF: 180 } }, E.RECIPES.panSeared).passed).toBe(false);
    expect(byId('thermometerTruth').check({ doneness: { foodPeakF: 150 } }, E.RECIPES.scrambledEggs).resultText).toMatch(/automatic pass/);
  });
});

describe('Kitchen Lab achievements for the new mechanics', () => {
  const ach = (id) => E.ACHIEVEMENTS.find((a) => a.id === id);
  it('adds six badges and the picker counts them', () => {
    expect(E.ACHIEVEMENTS).toHaveLength(26);
    expect(source).toContain("unlocked.length + ' / ' + ACHIEVEMENTS.length + ' unlocked'");
  });
  it('unlocks on the right evidence', () => {
    const ctx = (rec, grade, labels = []) => ({ recipe: rec, judgement: { grade, notes: labels.map((l) => ({ label: l })) } });
    expect(ach('patItDry').check({ recipeSteamSec: 0, recipeItemAddPanF: { chicken: 410 } }, ctx(E.RECIPES.panSeared, 'B'))).toBe(true);
    expect(ach('patItDry').check({ recipeSteamSec: 60, recipeItemAddPanF: { chicken: 410 } }, ctx(E.RECIPES.panSeared, 'A'))).toBe(false);
    expect(ach('roomToBreathe').check({ recipeSteamSec: 0 }, ctx(E.RECIPES.stirFry, 'A'))).toBe(true);
    expect(ach('roomToBreathe').check({ recipeSteamSec: 100 }, ctx(E.RECIPES.stirFry, 'A'))).toBe(false);
    expect(ach('readsTheBubbles').check({}, ctx(E.RECIPES.pancakes, 'B', ['✓ Flipped on cue']))).toBe(true);
    expect(ach('thermometerNotClock').check({}, ctx(E.RECIPES.steak, 'B', ['✓ On target: Medium']))).toBe(true);
    expect(ach('onionJam').check({}, ctx(E.RECIPES.caramelisedOnions, 'A'))).toBe(true);
    expect(ach('clearAirBadge').check({ recipeMaxPanTempF: 470, recipeSmokeSec: 0 }, ctx(E.RECIPES.stirFry, 'C'))).toBe(true);
    expect(ach('clearAirBadge').check({ recipeMaxPanTempF: 470, recipeSmokeSec: 0 }, ctx(E.RECIPES.scrambledEggs, 'A'))).toBeFalsy();
  });
});

describe('Kitchen Lab stale-cook guard', () => {
  it('pauses a cook whose last tick is more than a minute old instead of resuming it', () => {
    expect(source).toContain("var stale = d.recipePhase === 'cooking' && d.recipeLastTickAt && (Date.now() - d.recipeLastTickAt) > 60000;");
    expect(source).toContain("return { recipePhase: 'paused', recipePausedAt: prior.recipeLastTickAt, recipeAutoPaused: true };");
    expect(source).toContain("ensureTickMatches(stale ? 'paused' : d.recipePhase);");
    // and the tick itself pauses on a gap, so a live interval after laptop sleep cannot refresh the clock first
    expect(source).toContain("if (prior.recipeLastTickAt && now - prior.recipeLastTickAt > 60000) {");
    expect(source).toContain("return { recipePhase: 'paused', recipePausedAt: prior.recipeLastTickAt, recipeAutoPaused: true };");
    expect(source).toContain("recipePhase: 'cooking', recipePausedAt: null, recipeAutoPaused: false,");
  });
});
