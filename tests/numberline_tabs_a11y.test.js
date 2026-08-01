import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_numberline.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_numberline.js');

describe('Number Line Lab tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives the five Number Line sections roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': t('stem.numberline.number_line_sections'");
    expect(source).toContain("tabs.map(function(t2, tabIndex)");
    expect(source).toContain("id: 'numberline-tab-' + t2.id");
    expect(source).toContain("'aria-controls': 'numberline-panel-' + t2.id");
    expect(source).toContain("tabIndex: tab === t2.id ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { numberlineTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active Number Line hero to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'numberline-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'numberline-tab-' + tab");
    expect(source).toContain("tabIndex: 0");
  });
});
