import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fisherlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_fisherlab.js');

describe('Fisher Lab active panel accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('labels and focuses the active panel from the selected section tab', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-controls': 'fl-active-panel'");
    expect(source).toContain("'aria-labelledby': 'fl-tab-' + tab");
    expect(source).toContain('id: \'fl-active-panel\'');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain('tabIndex: 0');
  });
});
