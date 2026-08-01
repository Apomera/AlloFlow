import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_nutritionlab.js';
const PUBLIC = 'desktop/web-app/public/stem_lab/stem_tool_nutritionlab.js';

describe('Nutrition Lab meal and hydration controls', () => {
  it('keeps the source and public bundles in sync', () => {
    expect(readFileSync(PUBLIC, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('names the direct numeric and range controls', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("'aria-label': 'Energy after meal, from 1 to 10'");
    expect(source).toContain("'aria-label': 'Daily water target in milliliters'");
    expect(source).toContain("'aria-label': 'Water amount in milliliters'");
  });
});
