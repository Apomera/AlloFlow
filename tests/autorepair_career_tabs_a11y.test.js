import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_autorepair.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_autorepair.js');

describe('AutoRepair Career tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives Career tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.autorepair.career_sections'");
    expect(source).toContain("var CAREER_TAB_IDS = ['overview', 'ase', 'pathway'];");
    expect(source).toContain("id: 'autorepair-career-tab-' + id");
    expect(source).toContain("'aria-controls': 'autorepair-career-panel-' + id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { careerTabKeyDown(e, CAREER_TAB_IDS.indexOf(id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links every Career section to a stable tabpanel and hides inactive panels', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('function careerPanel(id, content)');
    expect(source).toContain("id: 'autorepair-career-panel-' + id");
    expect(source).toContain("'aria-labelledby': 'autorepair-career-tab-' + id");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('hidden: active ? undefined : true');
    expect(source).toContain("careerPanel('overview', overview())");
    expect(source).toContain("careerPanel('ase', ase())");
    expect(source).toContain("careerPanel('pathway', pathway())");
  });
});
