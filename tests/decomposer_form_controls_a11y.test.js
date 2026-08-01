import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_decomposer.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_decomposer.js');

describe('Decomposer Lab form control accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the comparison, tutor, and reflection controls', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': t('stem.decomposer.compare_material', 'Compare with material')");
    expect(source).toContain("'aria-label': 'Ask the Decomposer tutor'");
    expect(source).toContain("'aria-label': 'Decomposition hypothesis'");
    expect(source).toContain("'aria-label': 'Explain decomposition conditions'");
  });
});
