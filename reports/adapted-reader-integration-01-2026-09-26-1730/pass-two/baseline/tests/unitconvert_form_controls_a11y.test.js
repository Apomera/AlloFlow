import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_unitconvert.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_unitconvert.js');

describe('Unit Converter form control accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the table value and magnitude reflection controls', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': t('stem.unitconvert.table_value_to_convert', 'Value to convert in unit table')");
    expect(source).toContain("'aria-label': t('stem.unitconvert.magnitude_hypothesis', 'Magnitude relationship hypothesis')");
    expect(source).toContain("'aria-label': t('stem.unitconvert.magnitude_explanation', 'Explain dimensional reasoning across orders of magnitude')");
  });
});
