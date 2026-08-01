import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_statslab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_statslab.js');

describe('Statistics Lab mode tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes the eight analysis modes as a roving-focus tablist', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("].map(function(tab, tabIndex)");
    expect(source).toContain("id: 'statslab-tab-' + tab.id");
    expect(source).toContain("'aria-controls': 'statslab-panel-' + tab.id");
    expect(source).toContain("tabIndex: sel ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { statslabTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active analysis-mode hero to its tab', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'statslab-panel-' + d.mode");
    expect(source).toContain("'aria-labelledby': 'statslab-tab-' + d.mode");
    expect(source).toContain("tabIndex: 0");
  });
});
