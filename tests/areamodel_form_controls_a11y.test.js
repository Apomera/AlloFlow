import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_areamodel.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_areamodel.js');

describe('Area Model form control accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the multi-digit factors and reflection controls', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': t('stem.areamodel.factor_a', 'Factor A')");
    expect(source).toContain("'aria-label': t('stem.areamodel.factor_b', 'Factor B')");
    expect(source).toContain("'aria-label': t('stem.areamodel.area_hypothesis', 'Area relationship hypothesis')");
    expect(source).toContain("'aria-label': t('stem.areamodel.area_explanation', 'Explain the area multiplication relationship')");
  });
});
