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

// Drive a whole cook through the engine's own headless cook (simulateCook: the
// same pan + doneness math the 500 ms tick runs, with the cockpit's add / stir /
// mark / off mechanics) and hand the judge the snapshot nextStep() builds.
// Schedules are segments: { level | off, add, stir | stirEvery, mark, until |
// for | untilPanF | untilFoodF | untilWaterGone }; opts: { options, oil, food,
// material, stopAtFoodF, fullState }.
function cook(recipeId, schedule, opts = {}) {
  return E.simulateCook(E.RECIPES[recipeId], schedule, opts);
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
      { id: 'caramelisedOnions', text: '3-4', dials: [3, 4], min: 270, below: 331 }, // medium-low 270-330
      { id: 'friedEgg',      text: '2-3',  dials: [2, 3],  min: 250, below: 321 }, // medium-low 250-320
      { id: 'rice',          text: '8-10', dials: [8, 10], min: 213, below: 501 }  // the pot is pinned at 212 whatever the dial; any asymptote past boiling reaches the 205-212 step
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
    expect(source.match(/recipeItemAddPanF: \{\},/g)).toHaveLength(5);   // 4 reset blocks + the headless cook's seed
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
  // The pot as the judge reads it: pasta went into boiling water and had nine minutes in it before the drain
  const pot = (over = {}) => Object.assign({ potWaterReserved: true, potStartedSimSec: 0, potPastaInSimSec: 400, potPastaInTempF: 212, potDrainedSimSec: 940, potPastaSec: 540, potPastaCook: 540 }, over);
  const sauce = (level, fullState = pot(), tomatoesUntil = 600) => cook('pastaSauce', [
    { until: 60, level, add: ['oil'] }, { until: 90, level, add: ['garlic'] }, { until: tomatoesUntil, level, add: ['tomatoes'] }, { until: tomatoesUntil + 30, level, add: ['pasta'] }
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

  it('browns the garlic on contact and smokes the oil at dial 7, but a sauce with water in it cannot scorch', () => {
    const { judgement: j, state } = sauce(7);
    expect(has(j, 'Garlic browned on contact')).toBe(true);
    expect(has(j, 'Oil past its smoke point')).toBe(true);
    expect(has(j, 'Scorched sauce')).toBe(false);
    expect(has(j, 'barely cooked')).toBe(false);
    expect(state.recipeMoisture).toBeGreaterThan(0);   // 300 units of tomato water, most of it still there after nine minutes
  });

  it('scorches only once the sauce has boiled dry: dial 7 for twenty-seven minutes', () => {
    const { judgement: j, state } = sauce(7, pot(), 1700);
    expect(state.recipeMoisture).toBe(0);
    expect(has(j, 'Scorched sauce')).toBe(true);
    expect(has(j, 'Cooked dry')).toBe(false);   // the scorch note has said it
  });

  it('reads the sauce reduction and the pasta clock', () => {
    expect(has(sauce(3).judgement, 'Reduced to cling')).toBe(true);
    expect(has(sauce(1).judgement, 'Thin sauce')).toBe(true);     // dial 1 never simmers hard enough to reduce
    expect(has(sauce(3, pot({ potPastaSec: 240, potPastaCook: 240 })).judgement, 'Pasta underdone')).toBe(true);
    expect(has(sauce(3, pot({ potPastaSec: 960, potPastaCook: 960 })).judgement, 'Pasta overcooked')).toBe(true);
    expect(has(sauce(3, pot({ potPastaInTempF: 150 })).judgement, 'Pasta in cold water')).toBe(true);
    expect(has(sauce(3, pot({ potPastaInSimSec: null })).judgement, 'No pasta')).toBe(true);
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
    expect(source).toContain("renderTempTrace(d.recipeTempHistory, { marks: traceMarks(rec), cursorT:");
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
    expect(source).toContain("var thermal = getRecipeThermal(rec, prior.klPanMaterial, prior);");
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
    const pot = { potWaterReserved: true, potStartedSimSec: 0, potPastaInSimSec: 400, potPastaInTempF: 212, potDrainedSimSec: 940, potPastaSec: 540, potPastaCook: 540 };
    const { judgement: j } = cook('pastaSauce', [{ until: 60, level: 7, add: ['oil'] }, { until: 90, level: 7, add: ['garlic'] }, { until: 1700, level: 7, add: ['tomatoes'] }, { until: 1730, level: 7, add: ['pasta'] }], { fullState: pot });
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
    expect(ids).toHaveLength(12);
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
    expect(source).toContain("s range' + (showRange ? ' (' + rangeStep.min + '°F+)' : '')");   // demonstrate mode keeps the verdict, drops the numbers
    expect(source).toContain("if (tg && tg.boil) { rangeStep = { min: Math.round(boilingPointF(d) - 7), max: Math.round(boilingPointF(d)) }; break; }");   // a boil step's range follows the altitude
  });
  it('names the action on flip and finish steps instead of a generic continue', () => {
    expect(E.RECIPES.pancakes.steps[3].actionLabel).toBe('🔄 Flip the pancake');
    expect(E.RECIPES.steak.steps[2].actionLabel).toBe('🔄 Flip the steak');
    expect(E.RECIPES.steak.steps[4].actionLabel).toBe('🔪 Slice + serve');
    expect(E.RECIPES.panSeared.steps[2].actionLabel).toBe('🔄 Flip the chicken');
    expect(source).toContain("step.actionLabel ? step.actionLabel + (step.target && step.target.restSec && d.recipeHeatRemovedSimSec != null ? ' · rested ' + klClock(");
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
    // the companion pages are published to the CDN too (build.js asset list), so the
    // src is RESOLVED, not a bare relative path that only works at the repo root
    expect(source).toContain("h('iframe', { src: companionUrl('stem_lab/kitchen_studio/recipe_lab.html', RECIPE_LAB_CDN)");
    expect(source).toContain("var RECIPE_LAB_CDN = 'https://alloflow-cdn.pages.dev/stem_lab/kitchen_studio/recipe_lab.html';");
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
    expect(E.ACHIEVEMENTS).toHaveLength(27);   // + Kitchen Detective
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

describe('Kitchen Lab per-recipe history', () => {
  it('folds each judgement into attempts, best, last and the first thing flagged', () => {
    const j1 = { score: 65, grade: 'D', notes: [{ neg: false, label: '✓ Pan temp' }, { neg: true, label: '💧 Steamed before it browned' }, { neg: true, label: '⚠️ Not tossed enough' }] };
    const j2 = { score: 92, grade: 'A', notes: [{ neg: false, label: '✓ Pan temp' }] };
    const h1 = E.foldRecipeHistory({}, 'stirFry', j1, false);
    expect(h1.stirFry).toMatchObject({ attempts: 1, bestScore: 65, bestGrade: 'D', lastScore: 65, lastGrade: 'D', lastIssue: 'Steamed before it browned', competitionRuns: 0 });
    const h2 = E.foldRecipeHistory(h1, 'stirFry', j2, true);
    expect(h2.stirFry).toMatchObject({ attempts: 2, bestScore: 92, bestGrade: 'A', lastScore: 92, lastGrade: 'A', lastIssue: null, competitionRuns: 1 });
    const h3 = E.foldRecipeHistory(h2, 'stirFry', j1, false);
    expect(h3.stirFry).toMatchObject({ attempts: 3, bestScore: 92, bestGrade: 'A', lastScore: 65, lastGrade: 'D' });
    expect(h3.pancakes).toBeUndefined();
  });
  it('is recorded on both completion paths and shown on the picker card', () => {
    expect(source.match(/recipeHistory: foldRecipeHistory\(prior\.recipeHistory, rec\.id, judgement, (true|false)\)/g)).toHaveLength(2);
    expect(source).toContain("'data-kl-history': r.id,");
  });
});

describe('Kitchen Lab cook report', () => {
  const state = () => {
    const rec = E.RECIPES.panSeared;
    const j = rec.judge({ maxPanTempF: 438, activeTimeSec: 585, foodInternalF: 165, itemAddTimes: { oil: 1, chicken: 2 }, itemAddPanF: { chicken: 413 }, heatRemovedAt: 5, lastTickAt: 6, doneness: { browning: 13.2, foodPeakF: 165, secAboveOverF: 0, set: true, stirCount: 0, unattendedSec: 0, smokeSec: 0, oil: { oil: 'Refined avocado oil', smokeF: 520 }, steamSec: 0 }, options: { dry: 'patted' } });
    return Object.assign(E.defaultState(), { recipeJudgement: j, recipeSimElapsedSec: 585, recipeActiveTimeSec: 525, recipeMaxPanTempF: 438, recipeFoodPeakF: 165, recipeBrowning: 13.2, recipeIngredientOrder: ['oil', 'chicken'], recipeItemAddSimSec: { oil: 60, chicken: 62 }, recipeItemAddPanF: { oil: 404, chicken: 413 }, recipeHeatRemovedSimSec: 585, recipeOptions: { dry: 'patted' }, recipeTempHistory: [{ t: 0, pan: 70, food: 40 }, { t: 300, pan: 438, food: 108 }, { t: 585, pan: 317, food: 165 }] });
  };
  it('writes set-up, timings, surface, additions, notes and the trace as plain text', () => {
    const r = E.cookReport(E.RECIPES.panSeared, state(), 'F');
    expect(r).toContain('Kitchen Lab cook report — Pan-Seared Chicken');
    expect(r).toContain('Score 100 · Grade A');
    expect(r).toContain('Set-up: Clad stainless · Refined avocado oil (smokes at 520°F) · Before it goes in: Patted dry');
    expect(r).toContain('Cook time 9:45 · food in pan 8:45 · pan peak 438°F · food peak 165°F');
    expect(r).toContain('Seasoned chicken breast at 1:02 (pan 413°F)');
    expect(r).toContain('  + ✓ Deep golden crust');
    expect(r).toContain('  5:00  438°F  108°F');
    expect(r).toMatch(/simulation of decisions, not a record of a real cook/);
  });
  it('converts every temperature, including inside quoted judge notes, in °C mode', () => {
    const r = E.cookReport(E.RECIPES.panSeared, state(), 'C');
    expect(r).toContain('smokes at 271°C'); expect(r).toContain('pan peak 226°C'); expect(r).toContain('Internal 74°C');
    expect(r).not.toContain('°F');
  });
  it('routes the copy button through alloCopyText with an execCommand fallback and a select-and-copy textarea', () => {
    expect(source).toContain("if (typeof window.alloCopyText === 'function') { Promise.resolve(window.alloCopyText(text)).then(function(ok) { done(ok !== false); }).catch(function() { done(legacyCopy(text)); }); return; }");
    expect(source).toContain("d.klReportCopied === 'fail' ? h('div', { style: cardStyle() },");
    expect(source).toContain("onCopy: function() { setKL({ klReportCopied: 'ok' }); },");
    expect(source.split('\n').filter((l) => l.includes('navigator.clipboard.writeText'))).toHaveLength(3); // the report, the class set and the portfolio: one line each, last resort only
  });
});

describe('Kitchen Lab fried egg', () => {
  const egg = (opts, pullF) => cook('friedEgg', [
    { until: 60, level: 3 }, { until: 62, level: 3, add: ['butter'] }, { until: 600, level: 3, add: ['egg'] }
  ], { options: opts, stopAtFoodF: pullF });

  it('offers eggs, yolk and lid as choices, and the lid speeds the food by half again', () => {
    const ids = E.RECIPES.friedEgg.options.map((o) => o.id);
    expect(ids).toEqual(['eggs', 'yolk', 'lid']);
    expect(E.optionFactor(E.RECIPES.friedEgg, { lid: 'lid' }, 'foodKFactor')).toBe(1.5);
    expect(E.optionFactor(E.RECIPES.friedEgg, {}, 'foodKFactor')).toBe(1);
    const noLid = egg({}, 170), lid = egg({ lid: 'lid' }, 170);
    expect(lid.simSec).toBeLessThan(noLid.simSec * 0.8);
    expect(noLid.simSec - 62).toBeGreaterThan(150); // firm yolk takes a few minutes on medium-low
  });

  it('fails a soft yolk from a regular egg on safety, and allows it from a pasteurised one', () => {
    const regular = egg({ eggs: 'regular', yolk: 'runny' }, 150);
    expect(has(regular.judgement, 'FOOD SAFETY: soft yolk from a regular egg')).toBe(true);
    expect(regular.judgement.score).toBeLessThanOrEqual(49);
    const pasteurised = egg({ eggs: 'pasteurised', yolk: 'runny' }, 150);
    expect(has(pasteurised.judgement, 'Yolk on target: Runny')).toBe(true);
    expect(has(pasteurised.judgement, 'FOOD SAFETY')).toBe(false);
    expect(pasteurised.judgement.grade).toBe('A');
  });

  it('grades a firm yolk from regular eggs an A, and names under and over', () => {
    expect(egg({ yolk: 'firm' }, 170).judgement.grade).toBe('A');
    expect(has(egg({ yolk: 'firm' }, 161).judgement, 'Yolk under your target')).toBe(true);
    expect(has(egg({ eggs: 'pasteurised', yolk: 'jammy' }, 172).judgement, 'Yolk past your target')).toBe(true);
  });

  it('shows the yolk temperature and band on the visual', () => {
    const h = (tag, props, ...children) => ({ tag, props, children: children.flat().filter(Boolean) });
    const tree = JSON.stringify(E.RECIPES.friedEgg.renderVisual(h, { panTemp: 282, itemsInPan: ['butter', 'egg'], activeTime: 60, foodTemp: 155, browning: 0.1, options: { lid: 'lid' } }));
    expect(tree).toContain('Yolk: 155°F · runny→jammy');
    expect(tree).toContain('rgba(148,163,184,0.22)'); // the lid
  });
});

describe('Kitchen Lab Knife Lab try-it', () => {
  it('scales time-to-centre with thickness squared', () => {
    const t = [0.125, 0.25, 0.5, 0.75].map((sz) => E.cookThroughSec(sz, 350, 195));
    expect(t[1] / t[0]).toBeCloseTo(4, 5);
    expect(t[2] / t[1]).toBeCloseTo(4, 5);
    expect(t[3] / t[2]).toBeCloseTo(2.25, 5);
    expect(E.cookThroughSec(0.5, 190, 195)).toBe(Infinity); // pan below the target never gets there
    expect(source).toContain("'data-kl-cut-times': rows.map(function(r) { return Math.round(r.sec); }).join(',')");
    expect(source).toContain("onChange: function(e) { setKL({ knifePanTempF: parseInt(e.target.value, 10) }); }");
  });
});

describe('Kitchen Lab Maillard try-it', () => {
  it('halves the time to golden every 40°F and never browns below the threshold', () => {
    expect(E.minutesToBrowning(280, 4)).toBe(Infinity);
    expect(E.minutesToBrowning(320, 4)).toBeCloseTo(20, 5);
    expect(E.minutesToBrowning(360, 4)).toBeCloseTo(10, 5);
    expect(E.minutesToBrowning(400, 4)).toBeCloseTo(5, 5);
    expect(E.minutesToBrowning(440, 4)).toBeCloseTo(2.5, 5);
    expect(source).toContain("'data-kl-maillard-food': f.id, onClick: function() { setKL({ maillardFood: f.id }); }");
    expect(source).toContain("'data-kl-golden-min': here === Infinity ? 'never' : Math.round(here * 10) / 10");
  });
});

describe('Kitchen Lab rice: a pot of water', () => {
  // Rice and water into the cold pot, high until it boils, then the dial at `simmer` for simmerSec, then off for `rest`.
  // The boil time depends on the pan material and the dial, so it is measured first.
  function riceCook(opts, simmer = 2, rest = 600, simmerSec = 1080, boilLevel = 9) {
    const boil = cook('rice', [{ until: 3, level: 0, add: ['rice'] }, { untilPanF: 205, level: boilLevel }], { options: opts });
    const tBoil = boil.simSec;
    return Object.assign(cook('rice', [
      { until: 3, level: 0, add: ['rice'] }, { until: tBoil, level: boilLevel },
      { until: tBoil + simmerSec, level: simmer }, { until: tBoil + simmerSec + rest, off: true }
    ], { options: opts }), { tBoil });
  }

  it('pins the vessel at 212°F while there is water in it, however high the dial', () => {
    const r = riceCook({});
    expect(r.tBoil).toBeGreaterThan(240);           // two cups take minutes to boil, not the dry pan's seconds
    expect(r.tBoil).toBeLessThan(480);
    expect(r.snapshot.maxPanTempF).toBeLessThanOrEqual(212);
    expect(r.trace[1].pan).toBe(205);
    // the same pot without its water is a pan: thermal scale 1
    const st = Object.assign(E.defaultState(), { recipeItemsInPan: ['rice'], recipeMoisture: 0 });
    expect(E.vesselWaterScale(E.RECIPES.rice, Object.assign({}, st, { recipeBurnerLevel: 5, recipeAbsorbed: 120 }))).toBe(1);   // dry pot on a live burner: a pan again
    expect(E.vesselWaterScale(E.RECIPES.rice, Object.assign({}, st, { recipeBurnerLevel: 0, recipeAbsorbed: 120 }))).toBe(0.02); // off heat, the hot grain keeps the pot warm
    expect(E.vesselWaterScale(E.RECIPES.rice, Object.assign({}, st, { recipeMoisture: 50 }))).toBe(0.015);
    expect(E.boilCap(E.RECIPES.rice, Object.assign({}, st, { recipeMoisture: 50 }), 380)).toBe(212);
    expect(E.boilCap(E.RECIPES.rice, st, 380)).toBe(380);
    expect(E.boilCap(E.RECIPES.scrambledEggs, { recipeItemsInPan: ['eggs'], recipeMoisture: 50 }, 380)).toBe(380); // dry-pan recipes never pin
  });

  it('loses water by the dial, not the pan, and a lid keeps most of it', () => {
    const boilOff = (level, lid) => { const r = riceCook({ lid }, level, 0, 600); return 200 - r.snapshot.doneness.moistureAtEnd - r.snapshot.doneness.absorbed; };
    const low = boilOff(2, 'lid'), high = boilOff(9, 'lid'), openLow = boilOff(2, 'none');
    expect(high / low).toBeGreaterThan(5);           // a rolling boil sends water up several times faster, at the same 212°F
    expect(openLow / low).toBeCloseTo(1 / 0.3, 0);   // the lid's evapFactor
  });

  it('two to one, lid on, low flame, ten-minute rest: fluffy and separate (A)', () => {
    const r = riceCook({});
    const j = r.judgement;
    expect(has(j, 'Cooked through')).toBe(true);
    expect(has(j, 'Water all gone into the grain')).toBe(true);
    expect(has(j, 'Never past boiling')).toBe(true);
    expect(has(j, 'Dropped to a simmer')).toBe(true);
    expect(has(j, 'Rested 10 min')).toBe(true);
    expect(has(j, 'Separate grains')).toBe(true);
    expect(j.grade).toBe('A');
    expect(r.snapshot.doneness.absorbed).toBeGreaterThanOrEqual(150);
  });

  it('no lid: three times the steam, the pot runs dry and the grain is left firm', () => {
    const r = riceCook({ lid: 'none' });
    expect(r.snapshot.doneness.moistureAtEnd).toBe(0);
    expect(r.snapshot.doneness.absorbed).toBeLessThan(150);
    expect(has(r.judgement, 'A touch firm')).toBe(true);
    expect(has(r.judgement, 'Water all gone into the grain')).toBe(false);   // some of it went up as steam; the firm note says so
    expect(r.judgement.notes.some((n) => n.detail.includes('A lid would have kept it in the pot'))).toBe(true);
    expect(r.judgement.grade).not.toBe('A');
  });

  it('three to one: the grain is full long before the water is gone (gummy)', () => {
    const r = riceCook({ ratio: 'three' });
    expect(r.snapshot.doneness.absorbed).toBeCloseTo(180, 0);   // a full grain stops drinking
    expect(has(r.judgement, 'Gummy, sitting in water')).toBe(true);
    expect(r.judgement.verdict).toContain('porridge');
  });

  it('simmering on 5 instead of 2 boils the water off early, then the dry pot scorches', () => {
    const r = riceCook({}, 5);
    expect(has(r.judgement, 'Boiled hard for')).toBe(true);
    expect(r.snapshot.maxPanTempF).toBeGreaterThan(300);       // once dry, the pot climbed toward the dial's asymptote
    expect(has(r.judgement, 'Scorched bottom') || has(r.judgement, 'Burnt bottom')).toBe(true);
    expect(r.judgement.score).toBeLessThan(70);
  });

  it('left on 9 with the lid on: crunchy and burnt, an F', () => {
    const r = riceCook({}, 9);
    expect(has(r.judgement, 'Crunchy centres')).toBe(true);
    expect(has(r.judgement, 'Burnt bottom')).toBe(true);
    expect(r.judgement.grade).toBe('F');
  });

  it('serving straight off the heat costs the rest, and unrinsed rice clumps', () => {
    const noRest = riceCook({}, 2, 0);
    expect(has(noRest.judgement, 'No rest')).toBe(true);
    expect(noRest.judgement.grade).toBe('B');
    expect(has(riceCook({ rinse: 'unrinsed' }).judgement, 'Clumped')).toBe(true);
  });

  it('the rice stays in the pot off heat and keeps drinking while it is hot', () => {
    const atOff = riceCook({}, 2, 0), rested = riceCook({}, 2, 600);
    expect(rested.snapshot.doneness.absorbed).toBeGreaterThan(atOff.snapshot.doneness.absorbed);
    expect(rested.food).toBeGreaterThan(150);   // a covered pot cools slowly; the grain tracks it rather than drifting to room temperature
  });

  it('the pot has its own sound, the dial has its own step, and the report lists the water', () => {
    expect(E.klBoilLevel(212, true, 9, 100).caption).toContain('rolling boil');
    expect(E.klBoilLevel(212, true, 2, 100).caption).toContain('bare simmer');
    expect(E.klBoilLevel(212, true, 0, 100).caption).toContain('off the heat');
    expect(E.klBoilLevel(120, true, 9, 100).caption).toContain('cold water');
    expect(E.klBoilLevel(330, true, 5, 0).caption).toContain('toasting');
    expect(E.klBoilLevel(120, false, 0, 0).tier).toBe('quiet');
    expect(E.RECIPES.rice.steps.find((st) => st.completeWhen === 'burnerInRange').target.burnerLevel).toEqual({ min: 1, max: 3 });
    expect(source).toContain("} else if (auto === 'burnerInRange' && step.target.burnerLevel) {");
    expect(source).toContain("var newTemp = boilCap(rec, prior, tickPanTemp(prior.recipePanTempF || 70, prior.recipeBurnerLevel || 0, dtSec, thermal));");
    const r = riceCook({});
    const report = E.cookReport(E.RECIPES.rice, Object.assign(E.defaultState(), r.state, { recipeJudgement: r.judgement, recipeMaxPanTempF: r.snapshot.maxPanTempF, recipeHeatRemovedSimSec: r.snapshot.heatRemovedSimSec }), 'F');
    expect(report).toContain('Water: 0 of 200 left');
    expect(report).toContain('(needs 150)');
  });

  it('an auto-advance check from a stale render cannot skip a step, and re-lighting the burner restarts the rest clock', () => {
    // arrow keys stepping the dial 1, 2, 3 schedule three checks; each must advance only the step it saw
    expect(source).toContain("if (fromStep != null && (prior.recipeCurrentStep || 0) !== fromStep) return {};");
    const auto = source.slice(source.indexOf('function maybeAutoAdvance() {'), source.indexOf('function renderRecipe() {'));
    expect(auto.match(/nextStep\(stepNow\);/g)).toHaveLength(7);
    expect(auto).not.toContain('nextStep();');
    // setBurner: heat back on clears the heat-removed stamp
    expect(source).toContain("if (level > 0 && prior.recipeHeatRemovedAt) {");
    expect(source).toContain("patch.recipeHeatRemovedAt = null;");
    // in the engine driver the same rule gives a re-lit pot no rest credit
    const relit = cook('rice', [{ until: 3, level: 0, add: ['rice'] }, { until: 360, level: 9 }, { until: 1400, level: 2 }, { until: 1500, off: true }, { until: 1600, level: 2 }, { until: 1660, off: true }], { options: {} });
    expect(relit.snapshot.heatRemovedSimSec).toBeCloseTo(1600, -1);   // the tick is 3 sim-seconds
    expect(has(relit.judgement, 'No rest')).toBe(true);
  });

  it('draws the pot: water level, rice layer, lid, and a readout', () => {
    const h = (tag, props, ...children) => ({ tag, props, children: children.flat().filter(Boolean) });
    const tree = JSON.stringify(E.RECIPES.rice.renderVisual(h, { panTemp: 212, itemsInPan: ['rice'], burnerLevel: 2, moisture: 120, absorbed: 75, browning: 0, options: {} }));
    expect(tree).toContain('Water 60% · rice 50% hydrated · 212°F');
    expect(tree).toContain('"data-kl-rice":"50,120"');
    expect(tree).toContain('#94a3b8'); // the lid (default on)
    const dry = JSON.stringify(E.RECIPES.rice.renderVisual(h, { panTemp: 340, itemsInPan: ['rice'], burnerLevel: 5, moisture: 0, absorbed: 120, browning: 0.6, options: { lid: 'none' } }));
    expect(dry).toContain('#6b3f14'); // scorch band
    expect(dry).not.toContain('#94a3b8');
  });
});

describe('Kitchen Lab experiment bench', () => {
  const benchIds = () => Object.keys(E.TEXTBOOK_COOKS);

  it('cooks every recipe on the bench to an A by the book, with its default choices', () => {
    for (const id of benchIds()) {
      const rec = E.RECIPES[id];
      const r = E.runBench(rec, 'dial', '0').result;
      expect(r.judgement.grade, id + ': ' + r.judgement.verdict + ' | ' + r.judgement.notes.filter((n) => n.neg).map((n) => n.label).join(', ')).toBe('A');
      expect(r.history.length).toBeGreaterThan(10);
      expect(r.history.length).toBeLessThanOrEqual(301);
    }
    expect(benchIds()).toContain('pastaSauce');
    expect(benchIds()).not.toContain('freeCook');
    expect(benchIds()).toHaveLength(12);
  });

  it('offers the pan, the dial, the fat, each recipe choice, attention and the pull point where they apply', () => {
    const ids = (rec) => E.benchVariables(rec).map((v) => v.id);
    expect(ids(E.RECIPES.steak)).toEqual(['pan', 'dial', 'oil', 'opt:dry', 'opt:target', 'pull']);   // poking a steak is a mistake, not a variable
    expect(ids(E.RECIPES.scrambledEggs)).toEqual(['pan', 'dial', 'stir', 'pull']);
    expect(ids(E.RECIPES.sheetPan)).toEqual(['dial', 'x:door']);                                    // an oven has no pan and no fat choice, but it has a door
    expect(ids(E.RECIPES.pastaSauce)).toEqual(['pan', 'dial', 'oil', 'opt:lid', 'stir', 'alt', 'x:water', 'x:drop', 'x:potDial', 'x:pastaTime']);   // the pot's actions are the recipe's own variables
    expect(ids(E.RECIPES.rice)).toEqual(['pan', 'dial', 'opt:ratio', 'opt:lid', 'opt:rinse', 'alt']);   // cooked in water: the altitude matters
    for (const id of benchIds()) for (const v of E.benchVariables(E.RECIPES[id])) {
      expect(v.choices.some((c) => c.id === v.textbook), id + ' ' + v.id + ' names its textbook choice').toBe(true);
      expect(v.choices.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('changes exactly one thing per side', () => {
    expect(E.benchSetup(E.RECIPES.steak, 'pan', 'castIron')).toMatchObject({ material: 'castIron', dialOffset: 0, options: {}, pullOffsetF: 0 });
    expect(E.benchSetup(E.RECIPES.steak, 'opt:target', 'well')).toMatchObject({ material: 'stainless', options: { target: 'well' } });
    const hot = E.applyBenchSetup(E.TEXTBOOK_COOKS.stirFry, E.benchSetup(E.RECIPES.stirFry, 'dial', '+2'));
    expect(hot.filter((g) => !g.off).every((g) => g.level === 10)).toBe(true);   // clamped at the top of the dial
    const low = E.applyBenchSetup(E.TEXTBOOK_COOKS.scrambledEggs, E.benchSetup(E.RECIPES.scrambledEggs, 'dial', '-2'));
    expect(low[0].level).toBe(1);
    const late = E.applyBenchSetup(E.TEXTBOOK_COOKS.steak, E.benchSetup(E.RECIPES.steak, 'pull', '+15'));
    const st = Object.assign(E.defaultState(), { recipeOptions: {} });
    expect(late.find((g) => g.untilFoodF).untilFoodF(E.RECIPES.steak, st)).toBe(145 - 4 + 15);
    const quiet = E.applyBenchSetup(E.TEXTBOOK_COOKS.scrambledEggs, E.benchSetup(E.RECIPES.scrambledEggs, 'stir', 'never'));
    expect(quiet.some((g) => g.stirEvery)).toBe(false);
  });

  it('shows the lessons the recipes teach: cast iron is slower, pulling chicken early fails on safety, a hard simmer scorches the rice, walking away from eggs costs', () => {
    const stainless = E.runBench(E.RECIPES.steak, 'pan', 'stainless').result, iron = E.runBench(E.RECIPES.steak, 'pan', 'castIron').result;
    expect(iron.trace[0].simSec).toBeGreaterThan(stainless.trace[0].simSec * 1.5);   // preheat to 430°F
    const early = E.runBench(E.RECIPES.panSeared, 'pull', '-10').result;
    expect(has(early.judgement, 'FOOD SAFETY')).toBe(true);
    expect(early.judgement.score).toBeLessThanOrEqual(49);
    const hard = E.runBench(E.RECIPES.rice, 'dial', '+2').result;
    expect(has(hard.judgement, 'Scorched bottom') || has(hard.judgement, 'Burnt bottom')).toBe(true);
    const away = E.runBench(E.RECIPES.scrambledEggs, 'stir', 'never').result;
    expect(away.judgement.score).toBeLessThan(E.runBench(E.RECIPES.scrambledEggs, 'stir', 'told').result.judgement.score);
    expect(has(E.runBench(E.RECIPES.omelet, 'stir', 'never').result.judgement, 'Stuck to the pan')).toBe(true);
    const noLid = E.runBench(E.RECIPES.rice, 'opt:lid', 'none').result;
    expect(has(noLid.judgement, 'A touch firm')).toBe(true);
  });

  it('describes each side in words and lines up the numbers', () => {
    const setup = E.benchSetup(E.RECIPES.steak, 'opt:target', 'well');
    const lines = E.describeCook(E.RECIPES.steak, E.applyBenchSetup(E.TEXTBOOK_COOKS.steak, setup), setup);
    expect(lines[0]).toBe('dial 9 until the pan reads 430°F');
    expect(lines[4]).toBe("dial 9 until the centre reads 156°F");   // well done 160 minus the 4°F pull
    expect(lines[5]).toBe('off 3:00');
    const rows = E.benchNumbers(E.RECIPES.rice, E.runBench(E.RECIPES.rice, 'dial', '0').result).map((r) => r.id);
    expect(rows).toEqual(['time', 'panPeak', 'foodPeak', 'browning', 'water']);
    expect(E.benchNumbers(E.RECIPES.steak, E.runBench(E.RECIPES.steak, 'dial', '0').result).map((r) => r.id)).toEqual(['time', 'panPeak', 'foodPeak', 'browning', 'smoke']);
    // the picker carries the bench; the run button is disabled until the two sides differ
    expect(source).toContain("renderExperimentBench()");
    expect(source).toContain("h('button', { type: 'button', 'data-kl-bench-run': '1', disabled: choiceA === choiceB,");
    expect(source).toContain("'data-kl-bench': ran ? ra.result.judgement.score + ',' + rb.result.judgement.score : 'idle'");
  });
});

describe('Kitchen Lab kitchen detective', () => {
  it('builds a case pool from bench runs that scored under the textbook, deterministically', () => {
    const cases = E.detectiveCases(E.RECIPES.rice);
    expect(cases.map((c) => c.varId + '=' + c.choiceId).sort()).toEqual(['dial=+2', 'opt:lid=none', 'opt:ratio=onehalf', 'opt:ratio=three']);
    for (const c of cases) expect(c.result.judgement.score).toBeLessThanOrEqual(100 - 8);
    expect(E.detectiveCases(E.RECIPES.omelet).map((c) => c.varId)).toEqual(['stir']);
    const a = E.detectiveCase(10), b = E.detectiveCase(10);
    expect(a.rec.id).toBe(b.rec.id);
    expect(a.options.map(E.detectiveKey)).toEqual(b.options.map(E.detectiveKey));
    expect(E.seededShuffle([1, 2, 3, 4, 5], 3)).toEqual(E.seededShuffle([1, 2, 3, 4, 5], 3));
    expect(E.seededShuffle([1, 2, 3, 4, 5], 3)).not.toEqual([1, 2, 3, 4, 5]);
  });

  it('offers the culprit among three or four options, none of them the textbook choice, none leaving the same evidence', () => {
    let fair = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const k = E.detectiveCase(seed);
      if (!k) continue;
      fair++;
      const keys = k.options.map(E.detectiveKey);
      expect(keys).toContain(E.detectiveKey(k.truth));
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.length).toBeGreaterThanOrEqual(3);
      expect(keys.length).toBeLessThanOrEqual(4);
      const vars = E.benchVariables(k.rec);
      for (const o of k.options) {
        const v = vars.find((x) => x.id === o.varId);
        expect(o.choiceId).not.toBe(v.textbook);
        if (E.detectiveKey(o) !== E.detectiveKey(k.truth)) expect(E.sameEvidence(E.runBench(k.rec, o.varId, o.choiceId).result, k.result)).toBe(false);
      }
      expect(k.plan.length).toBe(E.TEXTBOOK_COOKS[k.rec.id].length);
    }
    expect(fair).toBeGreaterThan(30);
    expect(E.nextDetectiveCase(1, 'sheetPan').options.length).toBe(3);   // the dial's two settings and the door: just enough for a fair case
    expect(E.nextDetectiveCase(1, 'roastChicken').options.length).toBeGreaterThanOrEqual(3);
    expect(E.nextDetectiveCase(1)).not.toBeNull();
  });

  it('tells two runs apart by pan peak, food peak, browning, time, water or score', () => {
    const a = E.runBench(E.RECIPES.rice, 'opt:lid', 'none').result, b = E.runBench(E.RECIPES.rice, 'opt:ratio', 'onehalf').result;
    expect(E.sameEvidence(a, a)).toBe(true);
    expect(E.sameEvidence(a, E.runBench(E.RECIPES.rice, 'dial', '+2').result)).toBe(false);   // a scorched pot floor is visible
    expect(typeof E.sameEvidence(a, b)).toBe('boolean');
  });

  it('awards Kitchen Detective at five first-guess solves and reminds a live cook what the bench did', () => {
    const ach = E.ACHIEVEMENTS.find((a) => a.id === 'kitchenDetective');
    expect(ach.check({ klDetectiveSolved: 4 }, {})).toBe(false);
    expect(ach.check({ klDetectiveSolved: 5 }, {})).toBe(true);
    const vars = E.benchVariables(E.RECIPES.steak);
    expect(E.benchLiveHint(vars.find((v) => v.id === 'dial'), 'Two notches higher', 'B')).toBe('Bench pan B: two notches higher on the dial than the recipe says, at every step.');
    expect(E.benchLiveHint(vars.find((v) => v.id === 'pull'), '10°F early', 'B')).toBe('Bench pan B: pull it 10°F early.');
    expect(E.benchLiveHint(vars.find((v) => v.id === 'pan'), '⚫ Cast iron', 'A')).toContain('already set');
    expect(E.traceMarksFor(E.RECIPES.rice, E.runBench(E.RECIPES.rice, 'dial', '0').result.state, 'Heat off').map((m) => m.icon)).toEqual(['🍚', '⏻']);
    expect(source).toContain("h('button', { type: 'button', 'data-kl-bench-live': tag, onClick: function() { cookLive(tag, choiceId, r); },");
    expect(source).toContain("setKL({ recipeOptions: Object.assign({}, st.options), klPanMaterial: st.material || 'stainless', recipeOil: st.oil || null, klBenchLiveHint: benchLiveHint(v, labelOf(choiceId), tag) });");
    expect(source).toContain("klNewAchievements: [], klBenchLiveHint: null");   // a fresh start clears the reminder
    expect(source).toContain("d.klBenchLiveHint ? h('div', { 'data-kl-bench-live-hint': '1',");
  });
});

describe('Kitchen Lab pasta pot on the shared physics', () => {
  const potCook = (sched) => cook('pastaSauce', sched);

  it('boils in about six minutes on its own burner, pins at 212°F, and cooks pasta only in boiling water', () => {
    const r = potCook([{ level: 0, pot: 'start', untilPot: 'boiling' }]);
    expect(r.simSec).toBeGreaterThan(300);
    expect(r.simSec).toBeLessThan(420);
    expect(r.state.potTempF).toBeGreaterThanOrEqual(E.POT_BOILING_F);
    const held = potCook([{ level: 0, pot: 'start', untilPot: 'boiling' }, { level: 0, for: 600 }]);
    expect(held.state.potTempF).toBeLessThanOrEqual(212);
    // dropped at the boil: the water dips, comes back, and the clock counts from there
    const dropped = potCook([{ level: 0, pot: 'start', untilPot: 'boiling' }, { level: 0, pot: 'drop', for: 600 }]);
    expect(dropped.state.potPastaInTempF).toBeGreaterThanOrEqual(E.POT_BOILING_F);
    expect(dropped.state.potPastaSec).toBeGreaterThan(500);
    expect(dropped.state.potPastaSec).toBeLessThan(600);
    expect(dropped.state.potState).toBe('pasta-done');
    // dropped into warm water: the clock waits for the boil
    const early = potCook([{ level: 0, pot: 'start', untilPotF: 150 }, { level: 0, pot: 'drop', for: 300 }]);
    expect(early.state.potPastaInTempF).toBeLessThan(E.POT_BOILING_F);
    expect(early.state.potPastaSec).toBeLessThan(200);
    expect(early.state.potState).toBe('pasta-in');
  });

  it('runs on sim time and refuses out-of-order buttons', () => {
    const cold = E.defaultState();
    expect(E.potAction(cold, 'drop', 10)).toEqual({});
    expect(E.potAction(cold, 'drainKeep', 10)).toEqual({});
    expect(E.potAction(cold, 'start', 10)).toMatchObject({ potState: 'heating', potStartedSimSec: 10, potTempF: 70 });
    const boiling = Object.assign(E.defaultState(), { potState: 'boiling', potTempF: 212 });
    expect(E.potAction(boiling, 'drop', 400)).toMatchObject({ potState: 'pasta-in', potPastaInSimSec: 400, potPastaInTempF: 212, potTempF: 202, potPastaSec: 0 });
    expect(E.potAction(Object.assign(E.defaultState(), { potState: 'pasta-in' }), 'drain', 900)).toMatchObject({ potState: 'drained', potDrainedSimSec: 900, potWaterReserved: false });
    expect(E.tickPot(Object.assign(E.defaultState(), { potState: 'heating', potTempF: 100 }), E.RECIPES.steak, 1)).toEqual({});   // one-vessel recipes have no pot
    expect(source).toContain("var potPatch = tickPot(prior, rec, dtSec);");
    expect(source).not.toContain('tickPotPhase');
    expect(source).not.toContain('potStartedAt');            // no wall-clock stamps anywhere
    expect(source).toContain("phase === 'heating' || phase === 'boiling' ? h('button', { disabled: controlsDisabled, 'data-kl-pot': 'drop',");
    expect(source).toContain("'⏱️ Drain early (save water)'");
  });

  it('is a wet sauce: the tomatoes pin the pan at 212°F and the dial sets how fast it reduces', () => {
    const r = potCook([{ level: 3, untilPanF: 260 }, { level: 3, add: ['oil'], for: 30 }, { level: 3, add: ['garlic'], for: 40 }, { level: 3, add: ['tomatoes'], for: 600 }]);
    expect(r.state.recipeMoisture).toBeGreaterThan(200);
    expect(r.trace[3].pan).toBe(212);
    const hot = potCook([{ level: 3, untilPanF: 260 }, { level: 3, add: ['oil'], for: 30 }, { level: 3, add: ['garlic'], for: 40 }, { level: 7, add: ['tomatoes'], for: 600 }]);
    expect(hot.state.recipeMoisture).toBeLessThan(r.state.recipeMoisture);
    expect(hot.trace[3].pan).toBe(212);
    expect(E.RECIPES.pastaSauce.ingredients.find((i) => i.id === 'tomatoes').moisture).toBe(300);
  });

  it('joins the bench and the detective with its own pot variables', () => {
    const tb = E.runBench(E.RECIPES.pastaSauce, 'dial', '0').result;
    expect(tb.judgement.grade).toBe('A');
    expect(has(tb.judgement, 'Reduced to cling')).toBe(true);
    expect(has(tb.judgement, 'Al dente')).toBe(true);
    expect(has(E.runBench(E.RECIPES.pastaSauce, 'x:water', 'wasted').result.judgement, 'Lost the gold')).toBe(true);
    expect(has(E.runBench(E.RECIPES.pastaSauce, 'x:drop', 'warm').result.judgement, 'Pasta in cold water')).toBe(true);
    expect(has(E.runBench(E.RECIPES.pastaSauce, 'x:pastaTime', 'five').result.judgement, 'Pasta underdone')).toBe(true);
    expect(has(E.runBench(E.RECIPES.pastaSauce, 'x:pastaTime', 'fourteen').result.judgement, 'Pasta overcooked')).toBe(true);
    expect(has(E.runBench(E.RECIPES.pastaSauce, 'stir', 'never').result.judgement, 'Caught on the bottom')).toBe(true);
    const lines = E.describeCook(E.RECIPES.pastaSauce, E.TEXTBOOK_COOKS.pastaSauce, E.benchSetup(E.RECIPES.pastaSauce, 'dial', '0'));
    expect(lines[0]).toBe('pot on, water to boil 0:05');
    expect(lines[4]).toBe('dial 3 + Crushed tomatoes until the pot is boiling stirring every 60 s');
    expect(lines[5]).toBe('dial 3 pasta into the pot until the pasta is al dente stirring every 60 s');
    expect(E.benchNumbers(E.RECIPES.pastaSauce, tb).map((r) => r.id)).toEqual(['time', 'panPeak', 'foodPeak', 'browning', 'reduced', 'pasta', 'unattended', 'smoke']);
    expect(E.nextDetectiveCase(1, 'pastaSauce')).not.toBeNull();
  });
});

describe('Kitchen Lab replay: the logged cook, one thing changed', () => {
  // A scrambled-egg cook as the cockpit would log it: dial 3 at once, butter at 30 s, eggs at 40 s,
  // stirred every 8 s, salt and the burner off together at 88 s, judged at 120 s.
  const eggLog = [{ t: 0, k: 'dial', level: 3 }, { t: 30, k: 'add', id: 'butter' }, { t: 40, k: 'add', id: 'eggs' }]
    .concat([48, 56, 64, 72, 80].map((t) => ({ t, k: 'stir' })))
    .concat([{ t: 88, k: 'dial', level: 0 }, { t: 88, k: 'add', id: 'saltPepper' }]);

  it('turns the log into segments, carrying the dial and merging moments', () => {
    const sched = E.logToSchedule(eggLog, 120);
    expect(sched[0]).toEqual({ level: 3, until: 30 });
    expect(sched[1]).toEqual({ level: 3, until: 40, add: ['butter'] });
    expect(sched[2]).toEqual({ level: 3, until: 48, add: ['eggs'] });
    expect(sched[3]).toEqual({ level: 3, until: 56, stirNow: 1 });
    expect(sched[sched.length - 1]).toEqual({ level: 0, until: 120, add: ['saltPepper'] });   // off and salt at the same moment share a segment
    expect(E.logToSchedule([], 60)).toEqual([{ level: 0, until: 60 }]);
    const unsorted = E.logToSchedule([{ t: 20, k: 'add', id: 'eggs' }, { t: 5, k: 'dial', level: 2 }], 30);
    expect(unsorted.map((g) => g.level)).toEqual([0, 2, 2]);
  });

  it('reproduces the cook tick for tick, so a replay with nothing changed equals the cook', () => {
    const replay = E.simulateCook(E.RECIPES.scrambledEggs, E.logToSchedule(eggLog, 120), {});
    const direct = cook('scrambledEggs', [{ until: 30, level: 3 }, { until: 40, level: 3, add: ['butter'] }, { until: 48, level: 3, add: ['eggs'] },
      { until: 56, level: 3, stirNow: 1 }, { until: 64, level: 3, stirNow: 1 }, { until: 72, level: 3, stirNow: 1 }, { until: 80, level: 3, stirNow: 1 }, { until: 88, level: 3, stirNow: 1 }, { until: 120, level: 0, add: ['saltPepper'] }]);
    expect(replay.judgement.score).toBe(direct.judgement.score);
    expect(replay.snapshot.doneness.foodPeakF).toBe(direct.snapshot.doneness.foodPeakF);
    expect(replay.snapshot.doneness.stirCount).toBe(5);
    expect(replay.judgement.grade).toBe('A');
  });

  it('offers the set-up variables plus attention, never the pull point or the pot buttons', () => {
    expect(E.replayVariables(E.RECIPES.scrambledEggs).map((v) => v.id)).toEqual(['pan', 'dial', 'stir']);
    expect(E.replayVariables(E.RECIPES.steak).map((v) => v.id)).toEqual(['pan', 'dial', 'oil', 'opt:dry', 'opt:target']);
    expect(E.replayVariables(E.RECIPES.pastaSauce).map((v) => v.id)).toEqual(['pan', 'dial', 'oil', 'opt:lid', 'alt', 'stir']);
    const dial = E.replayVariables(E.RECIPES.rice).find((v) => v.id === 'dial');
    expect(dial.choices.map((c) => c.label)).toEqual(['Two notches lower than you did', 'As you did', 'Two notches higher than you did']);
    const stir = E.replayVariables(E.RECIPES.scrambledEggs).find((v) => v.id === 'stir');
    expect(stir.choices.map((c) => c.id)).toEqual(['you', 'never', 'often']);
    expect(stir.choices[2].label).toBe('Stir + fold every 8 s');
  });

  it('changes exactly one thing about the logged cook and judges it again', () => {
    const key = 'cook1';
    const asWas = E.runReplay(E.RECIPES.scrambledEggs, eggLog, 120, key, 'dial', '0').result;
    const never = E.runReplay(E.RECIPES.scrambledEggs, eggLog, 120, key, 'stir', 'never').result;
    expect(never.snapshot.doneness.stirCount).toBe(0);
    expect(never.snapshot.doneness.unattendedSec).toBeGreaterThan(asWas.snapshot.doneness.unattendedSec);
    expect(has(never.judgement, 'Left alone')).toBe(true);
    const iron = E.runReplay(E.RECIPES.scrambledEggs, eggLog, 120, key, 'pan', 'castIron').result;
    expect(iron.snapshot.maxPanTempF).toBeLessThan(asWas.snapshot.maxPanTempF);        // cast iron is still climbing when the eggs go in
    const hot = E.runReplay(E.RECIPES.scrambledEggs, eggLog, 120, key, 'dial', '+2').result;
    expect(hot.snapshot.maxPanTempF).toBeGreaterThan(asWas.snapshot.maxPanTempF + 40);
    expect(E.runReplay(E.RECIPES.scrambledEggs, eggLog, 120, key, 'dial', '0')).toBe(E.runReplay(E.RECIPES.scrambledEggs, eggLog, 120, key, 'dial', '0'));   // cached per cook
    const often = E.replaySetup(E.RECIPES.scrambledEggs, 'stir', 'often');
    expect(often.stirEvery).toBe(8);
    expect(E.replaySetup(E.RECIPES.steak, 'opt:target', 'well').options).toEqual({ target: 'well' });
  });

  it('puts the timeline into the cook report and logs every hand on the cook', () => {
    const st = Object.assign(E.defaultState(), { recipeOptions: {} });
    expect(E.describeEvent(E.RECIPES.scrambledEggs, st, { k: 'dial', level: 3 })).toBe('dial 3');
    expect(E.describeEvent(E.RECIPES.scrambledEggs, st, { k: 'dial', level: 0 })).toBe('burner off');
    expect(E.describeEvent(E.RECIPES.scrambledEggs, st, { k: 'add', id: 'eggs' })).toBe('+ Whisked eggs (3)');
    expect(E.describeEvent(E.RECIPES.scrambledEggs, st, { k: 'stir' })).toBe('stir + fold');
    expect(E.describeEvent(E.RECIPES.pastaSauce, st, { k: 'pot', action: 'drainKeep' })).toBe('pasta drained, a cup of water kept');
    const report = E.cookReport(E.RECIPES.scrambledEggs, Object.assign(E.defaultState(), { recipeLog: eggLog, recipeJudgement: { score: 100, grade: 'A', verdict: 'x', notes: [] } }), 'F');
    expect(report).toContain('Timeline:');
    expect(report).toContain('  0:30  + Butter (1 tbsp)');
    expect(report).toContain('  1:28  burner off');
    expect(source).toContain("if ((prior.recipeBurnerLevel || 0) !== level) patch.recipeLog = logEvent(prior, { k: 'dial', level: level });");
    expect(source).toContain("patch.recipeLog = logEvent(prior, { k: 'add', id: itemId });");
    expect(source).toContain("recipeLog: logEvent(prior, { k: 'stir' })");
    expect(source).toContain("advance.recipeLog = logEvent(prior, { k: 'mark', id: finishing.record });");
    expect(source).toContain("if (Object.keys(patch).length) patch.recipeLog = logEvent(prior, action === 'dial' ? { k: 'pot', action: action, level: arg } : { k: 'pot', action: action });");
    expect(source.match(/recipeLog: \[\],/g)).toHaveLength(4);
    expect(source).toContain("!isSandbox && (d.recipeLog || []).length >= 2 ? renderReplayPanel(rec, j) : null,");
  });
});

describe('Kitchen Lab forecast: if you change nothing', () => {
  const st = (over) => Object.assign(E.defaultState(), { recipeLastTickAt: 1_000_000 }, over);

  it('names the moments ahead for a searing steak, in order, and the pan it settles to', () => {
    const f = E.forecast(E.RECIPES.steak, st({ recipeItemsInPan: ['oil', 'steak'], recipeBurnerLevel: 9, recipePanTempF: 460, recipeFoodInternalF: 110, recipeBrowning: 6, recipeOptions: { target: 'medium' } }));
    expect(f.settlesF).toBe(469);
    expect(f.marks.map((m) => m.id)).toEqual(['shade', 'your target', 'overdone']);
    expect(f.marks[1].label).toBe('centre 145°F (your target)');
    expect(f.marks[0].label).toBe('browning: deep brown');
    for (let i = 1; i < f.marks.length; i++) expect(f.marks[i].sec).toBeGreaterThanOrEqual(f.marks[i - 1].sec);
    expect(f.pastHorizon).toEqual([]);
    // the same steak with a well-done target asks for 160°F instead, and the USDA floor becomes 'set'
    const well = E.forecast(E.RECIPES.steak, st({ recipeItemsInPan: ['oil', 'steak'], recipeBurnerLevel: 9, recipePanTempF: 460, recipeFoodInternalF: 110, recipeOptions: { target: 'well' } }));
    expect(well.marks.map((m) => m.label)).toContain('centre 160°F (your target)');
    expect(well.marks.map((m) => m.label)).toContain('centre 145°F (set)');
  });

  it('follows carryover off the heat, and says what lies beyond the horizon', () => {
    const off = E.forecast(E.RECIPES.steak, st({ recipeItemsInPan: ['oil', 'steak'], recipeBurnerLevel: 0, recipePanTempF: 460, recipeFoodInternalF: 141, recipeHeatRemovedAt: 1_000_000, recipeOptions: {} }));
    expect(off.settlesF).toBeNull();
    expect(off.marks.map((m) => m.id)).toEqual(['your target']);        // 141 → 145 on carryover alone
    expect(off.pastHorizon).toEqual(['centre 160°F (overdone)']);
    const roast = E.forecast(E.RECIPES.roastChicken, st({ recipeItemsInPan: ['seasoning', 'chicken'], recipeBurnerLevel: 5, recipePanTempF: 350, recipeFoodInternalF: 120 }));
    expect(roast.horizonSec).toBe(75 * 90);                              // a whole bird gets a longer look ahead
    expect(roast.marks.map((m) => m.id)).toContain('your target');       // 165°F lands inside it
  });

  it('watches water, grain, pot and pan as the recipe needs', () => {
    const rice = E.forecast(E.RECIPES.rice, st({ recipeItemsInPan: ['rice'], recipeBurnerLevel: 2, recipePanTempF: 212, recipeFoodInternalF: 212, recipeMoisture: 120, recipeAbsorbed: 60, recipeOptions: {} }));
    expect(rice.marks.map((m) => m.id)).toEqual(['grain', 'water']);
    expect(rice.settlesF).toBe(212);                                    // pinned while there is water
    const hot = E.forecast(E.RECIPES.rice, st({ recipeItemsInPan: ['rice'], recipeBurnerLevel: 5, recipePanTempF: 212, recipeFoodInternalF: 212, recipeMoisture: 120, recipeAbsorbed: 60, recipeOptions: {} }));
    expect(hot.marks.map((m) => m.id)).toEqual(['water', 'shade']);      // runs dry, then the floor colours
    const pot = E.forecast(E.RECIPES.pastaSauce, st({ recipeItemsInPan: ['oil', 'garlic', 'tomatoes'], recipeBurnerLevel: 3, recipePanTempF: 212, recipeMoisture: 250, potState: 'heating', potTempF: 120, potBurnerLevel: 9 }));
    expect(pot.marks.find((m) => m.id === 'pot').label).toBe('pot boils');
    const pasta = E.forecast(E.RECIPES.pastaSauce, st({ recipeItemsInPan: ['oil', 'garlic', 'tomatoes'], recipeBurnerLevel: 3, recipePanTempF: 212, recipeMoisture: 250, potState: 'pasta-in', potTempF: 212, potPastaSec: 200, potPastaCook: 200, potBurnerLevel: 9 }));
    expect(pasta.marks.find((m) => m.id === 'pot')).toMatchObject({ label: 'pasta al dente', sec: 340 });
    const preheat = E.forecast(E.RECIPES.panSeared, st({ recipeItemsInPan: [], recipeBurnerLevel: 8, recipePanTempF: 200, recipeCurrentStep: 0 }));
    expect(preheat.marks.map((m) => m.id)).toEqual(['pan']);
    expect(E.forecast(E.RECIPES.steak, st({ recipeItemsInPan: [], recipeBurnerLevel: 0, recipePanTempF: 70 })).marks).toEqual([]);
    expect(E.recipeTargetF(E.RECIPES.friedEgg, { recipeOptions: { yolk: 'runny' } })).toBe(150);
    expect(E.recipeTargetF(E.RECIPES.pancakes, {})).toBe(195);
    expect(E.recipeTargetF(E.RECIPES.scrambledEggs, {})).toBeNull();
  });

  it('is coaching: hidden in competition and in demonstrate mode, which the judge records as independent evidence', () => {
    expect(source).toContain("!inCompetition && !d.klIndependent && d.recipePhase !== 'idle' ? (function() {");
    expect(source).toContain("if (prior.klIndependent) judgement = Object.assign({}, judgement, { independent: true });");
    const j = { score: 92, grade: 'A', notes: [], independent: true, evidenceStatus: 'independent' };
    const h1 = E.foldRecipeHistory({}, 'steak', j, false);
    expect(h1.steak).toMatchObject({ attempts: 1, independentRuns: 1, supportedRuns: 0, independentBest: 92 });
    const h2 = E.foldRecipeHistory(h1, 'steak', { score: 70, grade: 'C', notes: [] }, false);
    expect(h2.steak).toMatchObject({ attempts: 2, independentRuns: 1, independentBest: 92, lastScore: 70 });
    // a demonstrate cook that leaned on the instruments is evidence of SUPPORT, not independence
    const sup = E.foldRecipeHistory(h2, 'steak', { score: 95, grade: 'A', notes: [], independent: true, evidenceStatus: 'supported' }, false);
    expect(sup.steak).toMatchObject({ independentRuns: 1, supportedRuns: 1, independentBest: 92 });
    const report = E.cookReport(E.RECIPES.steak, Object.assign(E.defaultState(), { recipeJudgement: Object.assign({}, j, { evidenceLabel: 'Cooked independently' }) }), 'F');
    expect(report).toContain('cooked independently');
  });
});

describe('Kitchen Lab real kitchen: reading the pan without a thermometer', () => {
  it('reads a flick of water and the fat by temperature band', () => {
    expect(E.waterFlickCue(100).tier).toBe('cold');
    expect(E.waterFlickCue(180).tier).toBe('warm');
    expect(E.waterFlickCue(250).tier).toBe('sizzle');
    expect(E.waterFlickCue(330).tier).toBe('hiss');
    expect(E.waterFlickCue(420).tier).toBe('skitter');
    expect(E.waterFlickCue(420).text).toContain('Leidenfrost');
    const evoo = E.SMOKE_POINTS.find((o) => o.oil === 'Extra virgin olive oil');
    expect(E.fatCue(200, evoo, true)).toContain('thick and still');
    expect(E.fatCue(300, evoo, true)).toContain('loosened');
    expect(E.fatCue(340, evoo, true)).toContain('shimmers');
    expect(E.fatCue(360, evoo, true)).toContain('edge of its smoke point');
    expect(E.fatCue(400, evoo, true)).toContain('smoking');
    expect(E.fatCue(400, evoo, false)).toBeNull();
  });

  it('judges the thermometer habit from the probes in the log, only for recipes with a target', () => {
    const st = (log, offAt) => Object.assign(E.defaultState(), { recipeLog: log, recipeHeatRemovedSimSec: offAt, recipeOptions: {} });
    expect(E.thermometerNote(E.RECIPES.steak, st([], 300))).toMatchObject({ neg: true, label: '🌡️ Never probed' });
    expect(E.thermometerNote(E.RECIPES.steak, st([{ t: 100, k: 'probe', reading: 110 }], 300))).toMatchObject({ neg: true, label: '🌡️ Probed early, not at the end' });
    const good = E.thermometerNote(E.RECIPES.steak, st([{ t: 100, k: 'probe', reading: 110 }, { t: 280, k: 'probe', reading: 141 }], 300));
    expect(good).toMatchObject({ neg: false, label: '✓ Verified with the thermometer' });
    expect(good.detail).toContain('141°F');
    expect(E.thermometerNote(E.RECIPES.scrambledEggs, st([], 60))).toBeNull();      // no temperature target: no thermometer habit to judge
    expect(E.thermometerNote(E.RECIPES.freeCook, st([], 60))).toBeNull();
    // the live judge applies it in real kitchen mode only, and re-grades after the five points
    expect(source).toContain("if (prior.klRealKitchen && judgement.score != null) {");
    expect(source).toContain("judgement = Object.assign({}, judgement, { realKitchen: true, notes: (judgement.notes || []).concat([thermo]), score: sc, grade:");
    // probes and flicks are logged but do not change the replay's schedule
    expect(E.logToSchedule([{ t: 0, k: 'dial', level: 9 }, { t: 30, k: 'flick' }, { t: 40, k: 'probe', reading: 90 }], 60)).toEqual([{ level: 9, until: 60 }]);
    const st2 = Object.assign(E.defaultState(), { recipeOptions: {} });
    expect(E.describeEvent(E.RECIPES.steak, st2, { k: 'probe', reading: 141.4 })).toBe('probed the centre: 141°F');
    expect(E.describeEvent(E.RECIPES.steak, st2, { k: 'flick' })).toBe('flicked water on the pan');
    const report = E.cookReport(E.RECIPES.steak, Object.assign(E.defaultState(), { recipeJudgement: { score: 95, grade: 'A', verdict: 'x', notes: [], realKitchen: true, independent: true, evidenceLabel: 'Cooked independently' } }), 'F');
    expect(report).toContain('real kitchen mode');
  });

  it('the steak judge reads the rest as a duration: three minutes is the recipe, slicing at once loses the carryover', () => {
    const rested = E.runBench(E.RECIPES.steak, 'dial', '0').result;
    expect(has(rested.judgement, 'Rested 3 min')).toBe(true);
    const sched = E.TEXTBOOK_COOKS.steak.map((g) => g.off ? Object.assign({}, g, { for: 6 }) : g);
    const sliced = E.simulateCook(E.RECIPES.steak, sched, { options: {} });
    expect(has(sliced.judgement, 'Sliced straight away')).toBe(true);
    expect(sliced.judgement.score).toBeLessThan(rested.judgement.score);
    const short = E.simulateCook(E.RECIPES.steak, E.TEXTBOOK_COOKS.steak.map((g) => g.off ? Object.assign({}, g, { for: 60 }) : g), { options: {} });
    expect(has(short.judgement, 'Short rest')).toBe(true);
  });
});

describe('Kitchen Lab class set and trace scrubber', () => {
  it('writes five distinct cases as text with an answer key the teacher can read', () => {
    const text = E.detectiveWorksheet(1, 5, null, 'F');
    const cases = text.split('\n').filter((l) => /^Case \d+ · /.test(l));
    expect(cases).toHaveLength(5);
    expect(new Set(cases).size).toBeGreaterThanOrEqual(3);                     // any-recipe sets cycle recipes
    expect(text).toContain('KITCHEN DETECTIVE · class set of 5');
    expect(text).toContain('  The plan:');
    expect(text).toContain('  What came out: score ');
    expect(text).toContain('    A. ');
    expect(text).toMatch(/Answer key \(teacher\): 1-[ABCD] \(/);
    expect(text).toContain('the judge said: ');
    expect(text).not.toContain('°C');
    const rice = E.detectiveWorksheet(1, 3, 'rice', 'C');
    expect(rice).toContain('class set of 3 · Rice (Absorption Method)');
    expect(rice.split('\n').filter((l) => /^Case \d+ · Rice/.test(l))).toHaveLength(3);
    expect(rice).toContain('°C');
    expect(rice).not.toContain('°F');
    // an answer letter names one of the printed options, every time
    const lines = text.split('\n');
    const keyLine = lines.find((l) => l.startsWith('Answer key'));
    keyLine.replace('Answer key (teacher): ', '').split(' · ').forEach((entry) => {
      const m = entry.match(/^(\d+)-([ABCD]) \((.*?)(?:; the judge said: |\)$)/);   // the culprit label may itself hold parentheses (a smoke point)
      expect(m).not.toBeNull();
      const start = lines.indexOf('Case ' + m[1] + ' · ' + lines.find((l) => l.startsWith('Case ' + m[1] + ' · ')).slice(('Case ' + m[1] + ' · ').length));
      const option = lines.slice(start).find((l) => l.startsWith('    ' + m[2] + '. '));
      expect(option).toBe('    ' + m[2] + '. ' + m[3]);
    });
    expect(source).toContain("var text = detectiveWorksheet(seed, 5, recId, units);");
  });

  it('draws a cursor on the trace where the scrubber points, and reads the moment out as numbers', () => {
    expect(source).toContain("opts.cursorT != null ? (function() {");
    expect(source).toContain("'data-kl-trace-cursor': Math.round(tOf(q.p, q.i))");
    expect(source).toContain("renderTraceScrubber(d.recipeTempHistory, traceMarks(rec), 'klScrubResults'),");
    expect(source).toContain("renderTraceScrubber(res.history, traceMarksFor(rec, res.state, __alloT('stem.kitchenlab.heat_off', 'Heat off')), 'klScrubDetective'),");
    expect(source).toContain("'aria-valuetext': klClock(t) + ': pan ' + fmtT(p.pan) + ', centre ' + fmtT(p.food),");
    expect(source).toContain("klFlickReading: null, klScrubResults: null");    // a new cook starts at the end of its own trace
  });
});

describe('Kitchen Lab altitude: water boils lower up a mountain', () => {
  it('sets the boiling point from the altitude and slows what cooks in water', () => {
    expect(E.boilingPointF({})).toBe(212);
    expect(E.boilingPointF({ klAltitudeFt: 2500 })).toBe(207);
    expect(E.boilingPointF({ klAltitudeFt: 5280 })).toBe(201.4);
    expect(E.boilingPointF({ klAltitudeFt: 10000 })).toBe(192);
    expect(E.boilCookRate(212)).toBe(1);
    expect(E.boilCookRate(201.4)).toBeCloseTo(0.853, 2);
    expect(E.boilCookRate(192)).toBeCloseTo(0.722, 2);
    expect(E.ALTITUDES.map((a) => a.ft)).toEqual([0, 2500, 5280, 7000, 10000]);
    const denver = Object.assign(E.defaultState(), { recipeItemsInPan: ['rice'], recipeMoisture: 100, klAltitudeFt: 5280 });
    expect(E.boilCap(E.RECIPES.rice, denver, 380)).toBe(201.4);
    expect(E.boilCap(E.RECIPES.steak, Object.assign({}, denver, { recipeItemsInPan: ['oil', 'steak'] }), 380)).toBe(380);   // a dry pan does not care
  });

  it('pins the rice pot and the pasta pot at the local boil, and the pasta needs longer', () => {
    const sea = E.runBench(E.RECIPES.rice, 'alt', '0').result, high = E.runBench(E.RECIPES.rice, 'alt', '10000').result;
    expect(sea.snapshot.maxPanTempF).toBe(212);
    expect(high.snapshot.maxPanTempF).toBe(192);
    expect(high.judgement.grade).toBe('A');                                   // a rest makes rice forgiving
    expect(has(high.judgement, 'Never past boiling')).toBe(true);
    expect(high.judgement.notes.find((n) => n.label === '✓ Never past boiling').detail).toContain('water boils at 192°F at this altitude');
    const pSea = E.runBench(E.RECIPES.pastaSauce, 'alt', '0').result, pHigh = E.runBench(E.RECIPES.pastaSauce, 'alt', '10000').result;
    expect(pHigh.simSec).toBeGreaterThan(pSea.simSec + 100);                  // al dente takes longer at a cooler boil
    expect(pHigh.state.potPastaCook).toBeGreaterThanOrEqual(540);
    expect(pHigh.state.potPastaSec).toBeGreaterThan(700);                     // more minutes in the water for the same cooking
    expect(pHigh.state.potTempF).toBeLessThanOrEqual(192);
    expect(pHigh.judgement.grade).toBe('A');
    expect(has(pHigh.judgement, 'Al dente')).toBe(true);
    expect(E.benchNumbers(E.RECIPES.pastaSauce, pHigh).map((r) => r.id)).toContain('boil');
    expect(E.benchNumbers(E.RECIPES.pastaSauce, pHigh).find((r) => r.id === 'pasta').value).toContain('cooks like 9:00 at sea level');
    // nine sea-level minutes on the clock at 10,000 ft is underdone
    const clocked = E.simulateCook(E.RECIPES.pastaSauce, E.TEXTBOOK_COOKS.pastaSauce.map((g) => g.untilPotCook ? Object.assign({}, g, { untilPotCook: undefined, untilPotPastaSec: 540 }) : g), { altitudeFt: 10000 });
    expect(has(clocked.judgement, 'Pasta underdone')).toBe(true);
  });

  it('moves every threshold that was 212 or 205: the boil step, the pot phases, the cues, the forecast, the trace line', () => {
    const rice = E.RECIPES.rice.steps.find((st) => st.completeWhen === 'boiling');
    expect(rice.target).toEqual({ boil: true });
    expect(source).toContain("if (vesselHasWater(rec, d) && (d.recipePanTempF || 0) >= boilingPointF(d) - 7) {");
    const pot = E.tickPot(Object.assign(E.defaultState(), { potState: 'heating', potTempF: 199, klAltitudeFt: 5280 }), E.RECIPES.pastaSauce, 1);
    expect(pot.potState).toBe('boiling');                                     // 199 is a boil in Denver
    expect(E.tickPot(Object.assign(E.defaultState(), { potState: 'heating', potTempF: 199 }), E.RECIPES.pastaSauce, 1).potState).toBeUndefined();   // not at sea level
    expect(E.klBoilLevel(200, true, 2, 100, 201.4).caption).toContain('bare simmer');
    expect(E.klBoilLevel(200, true, 2, 100).caption).toContain('about to boil');
    expect(E.waterFlickCue(205, 201.4).tier).toBe('sizzle');
    expect(E.waterFlickCue(205).tier).toBe('warm');
    const fc = E.forecast(E.RECIPES.rice, Object.assign(E.defaultState(), { recipeItemsInPan: ['rice'], recipeBurnerLevel: 9, recipePanTempF: 150, recipeMoisture: 200, klAltitudeFt: 5280, recipeLastTickAt: 1e6 }));
    expect(fc.settlesF).toBe(201);
    expect(source).toContain("var refs = [{ t: boilingPointF(d), label: __alloT('stem.kitchenlab.boil', 'Boil'), c: '#38bdf8' }");
    const pastaPot = { potWaterReserved: true, potStartedSimSec: 0, potPastaInSimSec: 400, potPastaInTempF: 199, potDrainedSimSec: 940, potPastaSec: 600, potPastaCook: 540 };
    const j = E.simulateCook(E.RECIPES.pastaSauce, [{ until: 60, level: 3, add: ['oil'] }, { until: 90, level: 3, add: ['garlic'] }, { until: 600, level: 3, add: ['tomatoes'] }, { until: 630, level: 3, add: ['pasta'] }], { fullState: pastaPot, altitudeFt: 5280 }).judgement;
    expect(has(j, 'Boiling water')).toBe(true);                               // 199°F is a full boil in Denver
    expect(has(j, 'Al dente')).toBe(true);
  });
});

describe('Kitchen Lab oven door, sauce lid and portfolio', () => {
  it('lets 25°F out per peek, counts the peeks, and the oven judges take a view from three', () => {
    expect(E.peekOven({ recipePanTempF: 425, recipePeeks: 2 })).toEqual({ recipePanTempF: 400, recipePeeks: 3 });
    expect(E.ovenDoorNote(0).label).toBe('✓ Door stayed shut');
    expect(E.ovenDoorNote(2).neg).toBe(false);
    expect(E.ovenDoorNote(5, 6).label).toBe('🚪 Door opened 5 times');
    expect(E.ovenDoorNote(5, 6).detail).toContain('about 25°F (14°C) out');   // a difference in the dual form localizeTemps keeps
    const shut = E.runBench(E.RECIPES.sheetPan, 'x:door', 'shut').result, peeks = E.runBench(E.RECIPES.sheetPan, 'x:door', 'peeks').result;
    expect(has(shut.judgement, 'Door stayed shut')).toBe(true);
    expect(peeks.snapshot.peeks).toBe(6);
    expect(has(peeks.judgement, 'Door opened 6 times')).toBe(true);
    expect(peeks.judgement.score).toBe(shut.judgement.score - 5);
    const bird = E.runBench(E.RECIPES.roastChicken, 'x:door', 'peeks').result;
    expect(bird.simSec).toBeGreaterThan(E.runBench(E.RECIPES.roastChicken, 'x:door', 'shut').result.simSec);   // the bird takes longer in a cooler oven
    expect(has(bird.judgement, 'Door opened')).toBe(true);
    // a logged peek replays where it happened, and the timeline names it
    expect(E.logToSchedule([{ t: 0, k: 'dial', level: 7 }, { t: 600, k: 'peek' }], 900)).toEqual([{ level: 7, until: 600 }, { level: 7, until: 900, peek: true }]);
    const replayed = E.simulateCook(E.RECIPES.sheetPan, [{ level: 7, until: 300 }, { level: 7, add: ['oil', 'veg'], until: 900, peek: true }, { level: 7, until: 1200, peek: true }, { level: 7, add: ['flip'], until: 1800, peek: true }, { off: true, until: 1810 }]);
    expect(replayed.snapshot.peeks).toBe(3);
    expect(E.describeEvent(E.RECIPES.sheetPan, E.defaultState(), { k: 'peek' })).toBe('opened the oven door');
    expect(E.describeCook(E.RECIPES.sheetPan, E.applyBenchSetup(E.TEXTBOOK_COOKS.sheetPan, E.benchSetup(E.RECIPES.sheetPan, 'x:door', 'peeks'), E.RECIPES.sheetPan), {})[2]).toContain('opening the door every 4:00');
    expect(source).toContain("h('button', { type: 'button', disabled: isPaused, 'data-kl-peek': d.recipePeeks || 0,");
    expect(source.match(/recipePeeks: 0,/g)).toHaveLength(4);
  });

  it('gives the pasta sauce a lid that keeps it thin', () => {
    expect(E.RECIPES.pastaSauce.options.map((o) => o.id)).toEqual(['lid']);
    const off = E.runBench(E.RECIPES.pastaSauce, 'opt:lid', 'off').result, on = E.runBench(E.RECIPES.pastaSauce, 'opt:lid', 'on').result;
    expect(on.state.recipeMoisture).toBeGreaterThan(off.state.recipeMoisture);
    expect(has(on.judgement, 'Thin sauce')).toBe(true);
    expect(has(off.judgement, 'Reduced to cling')).toBe(true);
  });

  it('writes the portfolio from state: recipes, independent runs, badges, detective, bench', () => {
    const st = Object.assign(E.defaultState(), {
      recipeHistory: { steak: { attempts: 3, bestScore: 92, bestGrade: 'A', lastScore: 85, lastGrade: 'B', lastIssue: 'Past your target', competitionRuns: 1, independentRuns: 1, independentBest: 92 }, rice: { attempts: 1, bestScore: 100, bestGrade: 'A', lastScore: 100, lastGrade: 'A', lastIssue: null, competitionRuns: 0, independentRuns: 0, independentBest: null } },
      aGradedRecipeIds: ['steak', 'rice'], klUnlockedAchievements: ['firstCook', 'kitchenDetective'], klDetectiveSolved: 5, klDetectiveCases: 6, klBenchRuns: 4 });
    const text = E.portfolioText(st, 'F');
    expect(text).toContain('2 of 12 recipes cooked · 2 mastered (an A) · 1 cooked without coaching · detective 5 of 6 cases on the first guess · bench experiments run: 4');
    expect(text).toContain('  Pan-Seared Steak: 3 cooks · best A 92 · last B 85 · 1 independent (best 92) · 1 in competition · last flagged: Past your target');
    expect(text).toContain('  Rice (Absorption Method): 1 cook · best A 100 · last A 100');
    expect(text).toContain('  Scrambled Eggs: not yet cooked');
    expect(text).toContain('Badges (2 of 27): First Cook, Kitchen Detective');
    expect(source).toContain("var text = portfolioText(d, units);");
    expect(source).toContain("klBenchRuns: (prior.klBenchRuns || 0) + 1");
  });
});

describe('Kitchen Lab pot dial and lesson links', () => {
  it('gives the pot its own burner: high when started, turned down it still boils, turned off the cooking stops', () => {
    const started = E.potAction(E.defaultState(), 'start', 0);
    expect(started.potBurnerLevel).toBe(9);
    expect(E.potAction(Object.assign(E.defaultState(), { potState: 'boiling' }), 'dial', 400, 2)).toEqual({ potBurnerLevel: 2 });
    expect(E.potAction(E.defaultState(), 'dial', 0, 2)).toEqual({});                       // a cold pot has no burner to turn
    const cooling = E.tickPot(Object.assign(E.defaultState(), { potState: 'pasta-in', potTempF: 212, potBurnerLevel: 0, potPastaSec: 100, potPastaCook: 100 }), E.RECIPES.pastaSauce, 60);
    expect(cooling.potTempF).toBeLessThan(212);
    const held = E.tickPot(Object.assign(E.defaultState(), { potState: 'pasta-in', potTempF: 212, potBurnerLevel: 2, potPastaSec: 100, potPastaCook: 100 }), E.RECIPES.pastaSauce, 60);
    expect(held.potTempF).toBe(212);
    expect(held.potPastaCook).toBe(160);
    const high = E.runBench(E.RECIPES.pastaSauce, 'x:potDial', 'high').result, off = E.runBench(E.RECIPES.pastaSauce, 'x:potDial', 'off').result, low = E.runBench(E.RECIPES.pastaSauce, 'x:potDial', 'low').result;
    expect(has(off.judgement, 'Pasta underdone')).toBe(true);
    expect(off.state.potBurnerLevel).toBe(0);
    expect(low.simSec).toBeGreaterThan(high.simSec);                                        // a low burner brings the pot back to the boil slowly after the drop
    expect(has(low.judgement, 'Al dente')).toBe(true);
    // the dial is logged and replayed, and named in the timeline
    expect(E.logToSchedule([{ t: 0, k: 'pot', action: 'start' }, { t: 400, k: 'pot', action: 'drop' }, { t: 410, k: 'pot', action: 'dial', level: 0 }], 900)).toEqual([{ level: 0, until: 400, pot: 'start' }, { level: 0, until: 410, pot: 'drop' }, { level: 0, until: 900, potLevel: 0 }]);
    expect(E.describeEvent(E.RECIPES.pastaSauce, E.defaultState(), { k: 'pot', action: 'dial', level: 3 })).toBe('pot burner to 3');
    expect(E.describeEvent(E.RECIPES.pastaSauce, E.defaultState(), { k: 'pot', action: 'dial', level: 0 })).toBe('pot burner off');
    expect(source).toContain("h('input', { id: 'kl-pot-dial', type: 'range', min: 0, max: 10, step: 1,");
  });

  it('links a flagged note to the tab that teaches the reason', () => {
    expect(E.lessonFor({ neg: true, label: '☣️ FOOD SAFETY: under 145°F', detail: 'Peak internal 137°F.' })).toEqual({ section: 'safety', label: 'Safe temperatures and resting' });
    expect(E.lessonFor({ neg: true, label: '🌫️ Oil past its smoke point', detail: 'x' })).toEqual({ section: 'resources', label: 'Smoke points' });
    expect(E.lessonFor({ neg: true, label: '🔥 Crust burnt', detail: 'x' }).section).toBe('maillard');
    expect(E.lessonFor({ neg: true, label: '⚠️ Left alone', detail: 'x' }).section).toBe('heat');
    expect(E.lessonFor({ neg: true, label: '💧 Thin sauce', detail: 'x' }).section).toBe('heat');
    expect(E.lessonFor({ neg: true, label: '🚪 Door opened 4 times', detail: 'x' }).section).toBe('heat');
    expect(E.lessonFor({ neg: true, label: '⏱️ Sliced straight away', detail: 'x' }).section).toBe('safety');
    expect(E.lessonFor(null)).toBeNull();
    expect(E.lessonFor({ neg: true, label: '⚠️ Pasta in cold water', detail: 'It sat in warm water soaking: gummy and stuck together.' }).section).toBe('heat');   // the label decides, not a word in the detail
    // every negative note any bench run can produce finds a lesson
    const missing = [];
    for (const id of Object.keys(E.TEXTBOOK_COOKS)) for (const v of E.benchVariables(E.RECIPES[id])) for (const c of v.choices) {
      E.runBench(E.RECIPES[id], v.id, c.id).result.judgement.notes.filter((n) => n.neg && !E.lessonFor(n)).forEach((n) => missing.push(id + ': ' + n.label));
    }
    expect([...new Set(missing)]).toEqual([]);
    expect(source).toContain("'📖 Learn why: ' + lesson.label + ' →'");
  });
});

describe('Kitchen Lab evidence ladder (matches the 3D studio)', () => {
  const st = (log, extra) => Object.assign(E.defaultState(), { recipeLog: log }, extra || {});
  const jud = (independent) => ({ score: 95, grade: 'A', notes: [], independent });

  it('grades a cook three ways, not two, the way the studio does', () => {
    expect(E.evidenceStatus(st([]), jud(false))).toMatchObject({ status: 'coached' });
    expect(E.evidenceStatus(st([]), jud(true))).toMatchObject({ status: 'independent' });
    // the recipe ASKS for one thermometer check, so the first probe is free
    expect(E.evidenceStatus(st([{ k: 'probe', reading: 140 }]), jud(true))).toMatchObject({ status: 'independent' });
    expect(E.evidenceStatus(st([{ k: 'probe' }, { k: 'probe' }, { k: 'probe' }]), jud(true))).toMatchObject({ status: 'supported' });
    expect(E.evidenceStatus(st([{ k: 'probe' }, { k: 'flick' }, { k: 'flick' }]), jud(true)).detail).toContain('2 water flicks');
    expect(E.evidenceStatus(st([], { aiCritique: 'x' }), jud(true)).detail).toContain('the AI critique');
    expect(E.evidenceStatus(st([]), { score: null })).toBeNull();          // the sandbox has no grade to stand behind
    expect(E.cookSupports(st([{ k: 'probe' }, { k: 'probe' }, { k: 'flick' }]), jud(true)).count).toBe(2);
    expect(E.cookSupports(st([{ k: 'dial', level: 9 }, { k: 'add', id: 'oil' }]), jud(true)).count).toBe(0);   // cooking is not a support
  });

  it('counts only a support-free cook as independent evidence in the record', () => {
    let h = E.foldRecipeHistory({}, 'steak', { score: 92, grade: 'A', notes: [], evidenceStatus: 'independent' }, false);
    expect(h.steak).toMatchObject({ independentRuns: 1, supportedRuns: 0, independentBest: 92 });
    h = E.foldRecipeHistory(h, 'steak', { score: 99, grade: 'A', notes: [], evidenceStatus: 'supported' }, false);
    expect(h.steak).toMatchObject({ independentRuns: 1, supportedRuns: 1, independentBest: 92 });   // a supported 99 does not beat an independent 92
    h = E.foldRecipeHistory(h, 'steak', { score: 70, grade: 'C', notes: [], evidenceStatus: 'coached' }, false);
    expect(h.steak).toMatchObject({ attempts: 3, independentRuns: 1, supportedRuns: 1 });
    const text = E.portfolioText(Object.assign(E.defaultState(), { recipeHistory: h, aGradedRecipeIds: ['steak'] }), 'F');
    expect(text).toContain('1 independent (best 92)');
    expect(text).toContain('1 with support');
    expect(source).toContain("j.evidenceLabel ? h('div', { 'data-kl-evidence': j.evidenceStatus,");
  });
});

describe('Kitchen Lab companion 3D pages resolve off the repo root', () => {
  it('falls back to the CDN on a foreign host instead of a path that 404s', () => {
    // build.js publishes 'stem_lab/kitchen_studio' to the CDN for exactly this case
    const build = readFileSync('build.js', 'utf8');
    expect(build).toContain("'stem_lab/kitchen_studio'");
    // the same resolution order the other companion-page tools use
    expect(source).toContain("var isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);");
    expect(source).toContain("if (isLocalHost || isAlloHosted) return new URL('/' + String(path)");
    expect(source).toContain("return cdnUrl;");
    // every reference to a companion page goes through it: no bare relative src or href left
    expect(source).not.toMatch(/src: 'stem_lab\/kitchen_studio\//);
    expect(source).not.toMatch(/href: 'stem_lab\/kitchen_studio\//);
    expect(source.match(/companionUrl\('stem_lab\/kitchen_studio\//g)).toHaveLength(6);   // 2 frames + 2 links + 2 fallback hrefs
  });
});
