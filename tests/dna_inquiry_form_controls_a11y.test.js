import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_dna.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_dna.js');

describe('DNA Lab inquiry accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides accessible names for the hypothesis and explanation fields', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': t('stem.dna.hypothesis_input', 'Evolutionary fixation hypothesis')");
    expect(source).toContain("'aria-label': t('stem.dna.explanation_input', 'Evolutionary fixation explanation')");
  });
});
