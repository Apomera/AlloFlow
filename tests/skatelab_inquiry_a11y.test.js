import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_skatelab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_skatelab.js');

describe('Skate Lab inquiry accessibility', () => {
  it('names the hang-time hypothesis textarea in source and public mirrors', () => {
    const expected = "'aria-label': __alloT('stem.skatelab.hypothesis_input', 'Skate flight hang-time hypothesis')";
    for (const file of [sourcePath, publicPath]) expect(fs.readFileSync(file, 'utf8')).toContain(expected);
  });

  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });
});
