import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_nutritionlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_nutritionlab.js');

describe('Nutrition Lab Career Pathways tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives career sections roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'role': 'tablist', 'aria-label': __alloT('stem.nutritionlab.career_pathway_sections'");
    expect(source).toContain('tabs.map(function(t, tabIndex)');
    expect(source).toContain("id: 'nutrition-career-tab-' + t.id");
    expect(source).toContain("'aria-controls': 'nutrition-career-panel-' + t.id");
    expect(source).toContain('tabIndex: sel ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { careerTabKeyDown(e, tabIndex); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active career section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'nutrition-career-panel-' + view");
    expect(source).toContain("'aria-labelledby': 'nutrition-career-tab-' + view");
    expect(source).toContain('tabIndex: 0');
  });
});
