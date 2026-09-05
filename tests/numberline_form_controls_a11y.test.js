import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_numberline.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_numberline.js');

describe('Number Line form control accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the skip-count, tutor, and reflection controls', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("label:t('stem.numberline.skip_by','Skip By')");
    expect(source).toContain("label:t('stem.numberline.start_from','Start From')");
    expect(source).toContain("label:t('stem.numberline.number_of_hops','Number of hops')");
    expect(source).toContain("'aria-label': t('stem.numberline.ask_about_number_lines', 'Ask about number lines...')");
    expect(source).toContain("'aria-label': t('stem.numberline.hypothesis', 'Fraction relationship hypothesis')");
    expect(source).toContain("'aria-label': t('stem.numberline.explanation', 'Explain how to compare two fractions')");
  });
});
