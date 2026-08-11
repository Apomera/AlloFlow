import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Deep-dive integrity pins for Nutrition Lab (2026-08-11 audit, which found
// the tool clean apart from the previously fixed quiz-bank stacking). These
// properties rot silently, so they get regression coverage:
//   - the 248-entry component registry stays complete and hub-reachable
//   - the food database stays Atwater-consistent (kcal ≈ 4c + 4p + 9f)
//   - the sweat-rate calculator keeps its input guards
//   - the supplement reference keeps its medical disclaimer
//   - calories stay framed as information, not goals (NEDA-aligned design)

const nut = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
const pub = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_nutritionlab.js', 'utf8');

describe('component registry and hub reachability', () => {
  const registryEntries = [...nut.matchAll(/^ {6}([a-zA-Z_0-9]+): \[([A-Za-z_0-9]+),/gm)]
    .map((m) => ({ key: m[1], component: m[2] }));
  const tileIds = (() => {
    const start = nut.indexOf('var allTools = [');
    const end = nut.indexOf('\n    ];', start);
    expect(start).toBeGreaterThan(-1);
    return [...nut.slice(start, end).matchAll(/\{ id: '([a-zA-Z_0-9]+)'/g)].map((m) => m[1]);
  })();

  it('every registered component has a definition', () => {
    expect(registryEntries.length).toBeGreaterThanOrEqual(248);
    for (const e of registryEntries) {
      expect(nut.includes('function ' + e.component + '('), e.component).toBe(true);
    }
  });

  it('registry keys and hub tiles match bidirectionally (export is the special case)', () => {
    const keys = new Set(registryEntries.map((e) => e.key));
    const tiles = new Set(tileIds);
    for (const key of keys) expect(tiles.has(key), 'tile for ' + key).toBe(true);
    for (const tile of tiles) {
      if (tile === 'export') continue; // wired directly to PersonalNutritionKitExport
      expect(keys.has(tile), 'registry entry for ' + tile).toBe(true);
    }
    expect(nut.includes('Comp = PersonalNutritionKitExport')).toBe(true);
  });
});

describe('food database integrity', () => {
  const start = nut.indexOf('var NUTRITION_KIT_FOOD_DB = [');
  const end = nut.indexOf('\n  ];', start);
  // eslint-disable-next-line no-new-func
  const DB = new Function(nut.slice(start, end) + '\n];\nreturn NUTRITION_KIT_FOOD_DB;')();

  it('every entry is Atwater-consistent and well-formed', () => {
    expect(DB.length).toBeGreaterThanOrEqual(119);
    const ids = new Set();
    for (const e of DB) {
      expect(ids.has(e.id), 'duplicate id ' + e.id).toBe(false);
      ids.add(e.id);
      for (const field of ['kcal', 'c', 'p', 'f']) {
        expect(typeof e[field], e.id + '.' + field).toBe('number');
        expect(e[field], e.id + '.' + field).toBeGreaterThanOrEqual(0);
      }
      // Label rounding and fiber discounting create legitimate slack; the
      // bound catches transposed macros and decimal-point typos.
      const atwater = 4 * e.c + 4 * e.p + 9 * e.f;
      const slack = Math.max(20, 0.25 * atwater, 4 * (e.fib || 0));
      expect(Math.abs(e.kcal - atwater), e.id + ' kcal=' + e.kcal + ' atwater=' + atwater.toFixed(0)).toBeLessThanOrEqual(slack + 0.25 * atwater);
    }
  });
});

describe('clinical-adjacent guardrails', () => {
  it('the sweat-rate calculator validates raw inputs before computing', () => {
    expect(nut).toContain('if (isNaN(pre) || isNaN(post) || form.durationMin <= 0) return;');
    expect(nut).toContain("fluidIntakeMl: parseInt(e.target.value) || 0");
  });

  it('the supplement reference keeps its consult-first disclaimer', () => {
    expect(nut).toContain('Always consult your doctor or pharmacist BEFORE starting any supplement');
    expect(nut).toContain('This reference is educational, not medical advice.');
  });

  it('calories stay framed as information, not goals', () => {
    expect(nut).toContain('"energy in kcal" as informational rather than as a goal');
    // No calorie-budget/deficit gamification language anywhere.
    expect(nut).not.toMatch(/calorie[s]?\s*(budget|remaining|deficit)/i);
  });

  it('the symptom-nutrient table keeps escalation language', () => {
    const start = nut.indexOf('var NUTRITION_KIT_SYMPTOM_NUTRIENT = [');
    const end = nut.indexOf('\n  ];', start);
    const table = nut.slice(start, end);
    const escalations = (table.match(/See doctor|See GI|medical eval|Neurological eval|dermatology assessment|Test ferritin|Test vit D|B12 test|Test TSH|TSH/g) || []).length;
    expect(escalations).toBeGreaterThanOrEqual(8);
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(pub()).toBe(nut);
  });
});
