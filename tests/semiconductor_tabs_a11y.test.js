import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_semiconductor.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_semiconductor.js');

describe('Semiconductor Lab mode tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes Explore, Challenge, Battle, and Learn as roving-focus tabs', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("['explore', 'challenge', 'battle', 'learn'].map(function(tb, tabIndex)");
    expect(source).toContain("role: 'tab'");
    expect(source).toContain("id: 'semiconductor-tab-' + tb");
    expect(source).toContain("'aria-controls': 'semiconductor-panel-' + tb");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { semiconductorTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('wraps the active mode content in a linked tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'semiconductor-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'semiconductor-tab-' + tab");
    expect(source).toContain("tabIndex: 0");
  });
});
