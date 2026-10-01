import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_nutritionlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_nutritionlab.js');

describe('Nutrition Lab Hydration tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives hydration sections roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.nutritionlab.hydration_lab_sections'");
    expect(source).toContain('TABS.map(tabBtn)');
    expect(source).toContain("id: 'nutrition-hydration-tab-' + t.id");
    expect(source).toContain("'aria-controls': 'nutrition-hydration-panel-' + t.id");
    expect(source).toContain('tabIndex: sel ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { hydrationTabKeyDown(e, tabIndex); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active hydration section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'nutrition-hydration-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'nutrition-hydration-tab-' + tab");
    expect(source).toContain('tabIndex: 0');
  });
});
