import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
const start = source.indexOf('var LABELS = [');
const end = source.indexOf('\n      // The authored labels', start);
if (start < 0 || end < 0) throw new Error('Nutrition Lab label bank not found');
const labels = new Function('__alloT', source.slice(start, end) + '\nreturn LABELS;')((key, fallback) => fallback);

const rowFields = {
  'Total Fat': 'fat',
  'Saturated Fat': 'saturatedFat',
  Sodium: 'sodium',
  'Total Carbs': 'carbs',
  'Dietary Fiber': 'fiber',
  'Total Sugars': 'totalSugars',
  Protein: 'protein',
};

describe('Nutrition Lab label exploration data', () => {
  it('keeps calculator quantities consistent with every displayed nutrient row', () => {
    expect(labels.map((label) => label.servingGrams)).toEqual([24, 28, 213, 170]);
    const panels = labels.flatMap((label) => label.dualOther ? [label, label.dualOther] : [label]);
    for (const panel of panels) {
      const displayed = {};
      for (const row of panel.rows) {
        const field = rowFields[row.label];
        if (field) displayed[field] = Number.parseFloat(row.val);
        const added = /^Includes ([\d.]+) g Added Sugars$/.exec(row.label);
        if (added) displayed.addedSugars = Number(added[1]);
      }
      expect(panel.nutrients).toEqual(displayed);
      expect(panel.servingGrams).toBeGreaterThan(0);
      expect(panel.nutrients.addedSugars).toBeLessThanOrEqual(panel.nutrients.totalSugars);
      for (const amount of Object.values(panel.nutrients)) {
        expect(Number.isFinite(amount)).toBe(true);
        expect(amount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('does not turn omitted yogurt nutrients into zero or copy micronutrients between versions', () => {
    const yogurt = labels.find((label) => label.id === 'yogurt');
    for (const panel of [yogurt, yogurt.dualOther]) {
      expect(panel.nutrients).not.toHaveProperty('fiber');
      expect(panel.nutrients).not.toHaveProperty('sodium');
      expect(panel.nutrients).not.toHaveProperty('saturatedFat');
    }
    expect(yogurt.dualOther.micros).toEqual([]);
    expect(yogurt.dualOther.servingGrams).toBe(yogurt.servingGrams);
  });

  it('teaches the difference between scaling a rounded percent and calculating from sodium amounts', () => {
    const lasagna = labels.find((label) => label.id === 'frozen');
    const question = lasagna.questions[1];
    const roundedPercent = Number.parseInt(lasagna.rows.find((row) => row.label === 'Sodium').dv, 10);
    const scaledPercent = roundedPercent * lasagna.servings;
    const calculatedPercent = Math.round(lasagna.nutrients.sodium * lasagna.servings / 2300 * 100);
    expect(scaledPercent).toBe(93);
    expect(calculatedPercent).toBe(94);
    expect(question.choices[question.answer]).toBe('About ' + scaledPercent + '% DV');
    expect(question.explain).toContain('about ' + calculatedPercent + '% DV');
  });
});
