import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_schoolbehaviortoolkit.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_schoolbehaviortoolkit.js');

describe('School Behavior Toolkit section tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes the twelve toolkit sections as a roving-focus tablist', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("function renderTabs()");
    expect(source).toContain("tabs.map(function(t, tabIndex)");
    expect(source).toContain("id: 'school-behavior-tab-' + t.id");
    expect(source).toContain("'aria-controls': 'school-behavior-panel-' + t.id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { schoolBehaviorTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active toolkit section content to its tab', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'school-behavior-panel-' + section");
    expect(source).toContain("'aria-labelledby': 'school-behavior-tab-' + section");
    expect(source).toContain("tabIndex: 0");
  });
});
