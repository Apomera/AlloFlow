import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_renewables.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_renewables.js');

describe('Renewables history table accessibility', () => {
  it('assigns column scope to year-by-year table headers', () => {
    for (const file of [sourcePath, publicPath]) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).toContain("return h('th', { key: i, scope: 'col', style:");
    }
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
