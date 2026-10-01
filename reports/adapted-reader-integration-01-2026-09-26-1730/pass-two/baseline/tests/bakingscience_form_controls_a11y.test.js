import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_bakingscience.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_bakingscience.js');

describe('Baking Science inquiry accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('names the conditional explanation and exposes moisture toggle state', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': __alloT('stem.bakingscience.explanation_input', 'Baking science explanation')");
    expect(source).toContain("'aria-pressed': active");
    expect(source).toContain("__alloT('stem.bakingscience.moisture_dry', 'Dry moisture')");
    expect(source).toContain("__alloT('stem.bakingscience.moisture_wet', 'Wet moisture')");
  });
});
