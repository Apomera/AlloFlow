import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_renewables.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_renewables.js');

describe('Renewables inquiry form accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides accessible names for renewable-grid reflection fields', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': __alloT('stem.renewables.hypothesis_input', 'Renewable-grid hypothesis')");
    expect(source).toContain("'aria-label': __alloT('stem.renewables.explanation_input', 'Renewable-grid explanation')");
  });
});
