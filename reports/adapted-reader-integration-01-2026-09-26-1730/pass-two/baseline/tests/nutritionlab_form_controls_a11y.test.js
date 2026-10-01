import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_nutritionlab.js';
const PUBLIC = 'desktop/web-app/public/stem_lab/stem_tool_nutritionlab.js';

describe('Nutrition Lab meal and hydration controls', () => {
  it('keeps the source and public bundles in sync', () => {
    expect(readFileSync(PUBLIC, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  // These three sit outside the function that declares __alloT, so a keyed call
  // there threw at render. They go through the module-scope translator instead.
  it('names the direct numeric and range controls', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain(`'aria-label': __alloNLT('stem.nutritionlab.a11y_energy_after_meal_from_1_to_10', 'Energy after meal, from 1 to 10')`);
    expect(source).toContain(`'aria-label': __alloNLT('stem.nutritionlab.a11y_daily_water_target_in_milliliters', 'Daily water target in milliliters')`);
    expect(source).toContain(`'aria-label': __alloNLT('stem.nutritionlab.a11y_water_amount_in_milliliters', 'Water amount in milliliters')`);
  });
});
