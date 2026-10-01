import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_nutritionlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_nutritionlab.js');

describe('Nutrition Lab Eating Disorder Awareness tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives the six module sections roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'role': 'tablist', 'aria-label': __alloT('stem.nutritionlab.module_sections'");
    expect(source).toContain('sections.map(function(s, tabIndex)');
    expect(source).toContain("id: 'nutrition-ed-tab-' + s.id");
    expect(source).toContain("'aria-controls': 'nutrition-ed-panel-' + s.id");
    expect(source).toContain('tabIndex: sel ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { handleSectionKeyDown(e, tabIndex); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active Eating Disorder Awareness section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'nutrition-ed-panel-' + section");
    expect(source).toContain("'aria-labelledby': 'nutrition-ed-tab-' + section");
    expect(source).toContain('tabIndex: 0');
  });
});
