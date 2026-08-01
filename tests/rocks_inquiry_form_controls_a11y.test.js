import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_rocks.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_rocks.js');

describe('Rocks Lab inquiry accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides accessible names for weathering hypothesis and explanation fields', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': __alloT('stem.rocks.hypothesis_input', 'Weathering climate hypothesis')");
    expect(source).toContain("'aria-label': __alloT('stem.rocks.explanation_input', 'Weathering climate explanation')");
  });
});
