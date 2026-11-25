import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Kepler Colony life-support model: every crew number, quiz answer, gate option and shortage rule the tool
// shows comes from window.StemLab.spaceColonyModel. SC_TOOL lets this run against a saved copy (fail-first).
const TOOL = process.env.SC_TOOL || 'stem_lab/stem_tool_spacecolony.js';
let M;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'spaceColony'); M = window.StemLab.spaceColonyModel; });

describe('crew needs (NASA BVAD Rev1 + ISS water article)', () => {
  it('uses the sourced per-person daily values', () => {
    expect(M).toBeTruthy();
    expect(M.crewDay).toEqual({ o2Kg: 0.816, co2Kg: 1.04, foodKg: 1.51, waterUseL: 3.785 });
    const six = M.crewNeeds(6, 0, 1);
    expect(six.o2Kg).toBeCloseTo(4.896, 6);
    expect(six.co2Kg).toBeCloseTo(6.24, 6);
    expect(six.waterUseL).toBeCloseTo(22.71, 6);
    expect(six.waterShipL).toBeCloseTo(22.71, 6);
  });
  it('ships only the water that is not recovered, and clamps bad input', () => {
    const yr = M.crewNeeds(6, 98, 365);
    expect(yr.waterShipL).toBeCloseTo(6 * 3.785 * 365 * 0.02, 6);
    expect(yr.waterShipL + yr.waterRecoveredL).toBeCloseTo(yr.waterUseL, 6);
    expect(M.crewNeeds(6, 140, 1).waterShipL).toBe(0);
    expect(M.crewNeeds(-3, 50, 1).crew).toBe(0);
    expect(M.crewNeeds(6, NaN, 1).waterShipL).toBeCloseTo(22.71, 6);
  });
  it('93% -> 98% leaves 2/7 of the shipped water, and the quiz key follows that', () => {
    const r = M.waterShipRatio(93, 98);
    expect(r).toBeCloseTo(2 / 7, 6);
    for (const seed of ['New Kepler', 'Aurora', 'x', 7, 0]) {
      const quiz = M.waterQuiz(seed);
      expect(quiz).toHaveLength(4);
      const right = quiz.filter((o) => o.correct);
      expect(right).toHaveLength(1);
      expect(right[0].id).toBe('third');
      quiz.forEach((o) => expect(o.why.length).toBeGreaterThan(20));
      const longest = Math.max(...quiz.map((o) => o.text.length));
      expect(right[0].text.length).toBeLessThan(longest);
    }
    const positions = new Set(['New Kepler', 'Aurora', 'Base', 'Haven', 'Delta', 'Echo', 'Fox'].map((s) => M.waterQuiz(s).findIndex((o) => o.correct)));
    expect(positions.size).toBeGreaterThan(1);
  });
});

describe('offline science gates', () => {
  const ids = ['hydroponics', 'solar', 'waterReclaim', 'mine', 'lab', 'medbay', 'atmo', 'fusion', 'biodome', 'comms', 'greenhouse', 'refinery', 'cloning', 'shield', 'oceanSeeder', 'spaceport'];
  it('cover all 16 buildings with 4 options, one key and an explanation for every wrong option', () => {
    expect(Object.keys(M.gateBank).sort()).toEqual(ids.slice().sort());
    ids.forEach((id) => {
      const g = M.gateMcq(id, 3);
      expect(g.options).toHaveLength(4);
      expect(new Set(g.options).size).toBe(4);
      expect(g.options[g.correctIndex]).toBe(M.gateBank[id].a);
      g.whys.forEach((w, i) => (i === g.correctIndex ? expect(w).toBeNull() : expect(w.length).toBeGreaterThan(15)));
      expect(g.explanation.length).toBeGreaterThan(20);
    });
  });
  it('moves the answer around and rarely makes it the longest option', () => {
    const counts = [0, 0, 0, 0];
    ids.forEach((id) => { for (let turn = 1; turn <= 12; turn++) counts[M.gateMcq(id, turn).correctIndex]++; });
    counts.forEach((c) => expect(c).toBeGreaterThan(16 * 12 * 0.12));
    const longest = ids.filter((id) => { const b = M.gateBank[id]; return b.w.every((w) => b.a.length > w[0].length); });
    expect(longest.length).toBeLessThanOrEqual(1);
  });
  it('reorders AI options without losing the key', () => {
    const gate = { question: 'Q', options: ['Right', 'W1', 'W2', 'W3', 'W4', 'W5'], correctIndex: 0 };
    const seen = new Set();
    for (let k = 0; k < 20; k++) {
      const out = M.shuffleMcq(gate, 'solar:' + k);
      expect(out.options[out.correctIndex]).toBe('Right');
      expect(out.options.slice().sort()).toEqual(gate.options.slice().sort());
      seen.add(out.correctIndex);
    }
    expect(seen.size).toBeGreaterThan(2);
    expect(M.shuffleMcq({ options: ['a'], correctIndex: 4 }, 's')).toEqual({ options: ['a'], correctIndex: 4 });
  });
});

describe('turn rules', () => {
  it('terraform gain comes from one table, counted once per building', () => {
    expect(M.terraformGain(['atmo', 'biodome', 'hydroponics', 'greenhouse', 'oceanSeeder'])).toBe(8);
    expect(M.terraformGain(['atmo', 'atmo', 'solar'])).toBe(2);
    expect(M.terraformGain(null)).toBe(0);
  });
  it('build cards no longer print numbers the turn does not use', () => {
    const src = readFileSync(TOOL, 'utf8');
    expect(src).not.toContain("'Converts alien atmosphere. +5% terraforming per turn.'");
    expect(src).not.toContain('+10 health/turn');
    expect(src).not.toContain('1,206 years');
    expect(src).not.toContain('Biodome (+10%/turn)');
  });
  it('empty reserves harm settlers, water most', () => {
    expect(M.lifeSupportCheck({ food: 5, water: 5, energy: 5 })).toEqual({ alarms: [], healthLoss: 0 });
    expect(M.lifeSupportCheck({ food: 0, water: 0, energy: 3 })).toEqual({ alarms: ['water', 'food'], healthLoss: 25 });
    expect(M.lifeSupportCheck({}).alarms).toEqual(['water', 'food', 'energy']);
    const after = M.applyHealthLoss([{ name: 'a', health: 12 }, { name: 'b', health: 0 }, { name: 'c' }], 15);
    expect(after.map((s) => s.health)).toEqual([0, 0, 85]);
  });
  it('baseline forecast lists its parts and the dusk question picks the reserve that runs out first', () => {
    const defs = [{ id: 'hydroponics', name: 'Hydroponics Bay', production: { food: 3 } }, { id: 'waterReclaim', name: 'Water Reclaimer', production: { water: 3 } }];
    const f = M.baselineForecast(6, ['hydroponics'], defs, { hydroponics: 50 }, { science: 1 });
    expect(f.food.total).toBe(-6 + 2);
    expect(f.water.total).toBe(-3);
    expect(f.science.parts).toEqual([{ label: 'Doctrine', amount: 1 }]);
    expect(M.forecastFocus({ food: 40, water: 30, energy: 30 }, { food: -6, water: -3, energy: 0 })).toBe('food');
    expect(M.forecastFocus({ food: 40, water: 9, energy: 30 }, { food: -6, water: -3, energy: 0 })).toBe('water');
    expect(M.forecastFocus({ food: 40, water: 30, energy: 12 }, { food: 2, water: 1, energy: 0 })).toBe('energy');
    expect(M.forecastVerdict('down', -4)).toEqual({ direction: 'down', correct: true });
    expect(M.forecastVerdict('down', 0)).toEqual({ direction: 'same', correct: false });
  });
});
