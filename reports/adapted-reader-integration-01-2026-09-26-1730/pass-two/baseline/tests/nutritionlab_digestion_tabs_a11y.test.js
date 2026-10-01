import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_nutritionlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_nutritionlab.js');

describe('Nutrition Lab Digestion Walkthrough tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives digestion stages roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'role': 'tablist', 'aria-label': __alloT('stem.nutritionlab.digestion_stages'");
    expect(source).toContain('DIGESTION_STAGES.map(function(s, i)');
    expect(source).toContain("id: 'nutrition-digestion-tab-' + s.id");
    expect(source).toContain("'aria-controls': 'nutrition-digestion-panel-' + s.id");
    expect(source).toContain('tabIndex: sel ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { digestionStageTabKeyDown(e, i); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active digestion stage to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'nutrition-digestion-panel-' + stage.id");
    expect(source).toContain("'aria-labelledby': 'nutrition-digestion-tab-' + stage.id");
    expect(source).toContain('tabIndex: 0');
  });
});
