import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_playlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_playlab.js');

describe('Play Lab sport tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives sport tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.playlab.sport'");
    expect(source).toContain("var PLAYLAB_SPORT_TABS = ['football', 'soccer'];");
    expect(source).toContain("id: 'playlab-sport-tab-' + sp.id");
    expect(source).toContain("'aria-controls': 'playlab-sport-panel-' + sp.id");
    expect(source).toContain("'aria-selected': sel ? 'true' : 'false'");
    expect(source).toContain('tabIndex: sel ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { playLabSportTabKeyDown(e, PLAYLAB_SPORT_TABS.indexOf(sp.id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links the active sport to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'playlab-sport-panel-' + (d.sport || 'football')");
    expect(source).toContain("'aria-labelledby': 'playlab-sport-tab-' + (d.sport || 'football')");
    expect(source).toContain('tabIndex: 0');
  });
});
