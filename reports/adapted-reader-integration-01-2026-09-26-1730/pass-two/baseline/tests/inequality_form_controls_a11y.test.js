import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_inequality.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_inequality.js');

describe('Inequality Lab form and state accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes the quiz tier state and reflection fields accessibly', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-pressed': isActive");
    expect(source).toContain("'aria-label': __alloT('stem.inequality.hypothesis', 'Inequality relationship hypothesis')");
    expect(source).toContain("'aria-label': __alloT('stem.inequality.explanation', 'Explain inequality test logic')");
  });
});
