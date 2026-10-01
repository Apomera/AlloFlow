import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_inequality.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_inequality.js');

describe('Inequality Lab graph mode tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes the graph modes as a keyboard-operable tablist', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("['1d', '2d'].map(function(m, tabIndex)");
    expect(source).toContain("id: 'stem-inequality-tab-' + m");
    expect(source).toContain("'aria-controls': 'stem-inequality-panel-' + m");
    expect(source).toContain("tabIndex: graphMode === m ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { inequalityTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("nextIndex = (index - 1 + 2) % 2");
    expect(source).not.toContain("else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + 1) % 2");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active graph-mode panel to its tab', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'stem-inequality-panel-' + graphMode");
    expect(source).toContain("'aria-labelledby': 'stem-inequality-tab-' + graphMode");
    expect(source).toContain("tabIndex: 0");
  });
});
