import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_calculus.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_calculus.js');

describe('Calculus Lab main tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives the five calculus sections roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': 'Calculus Tool sections'");
    expect(source).toContain(".map(function(item, tabIndex){");
    expect(source).toContain("id:'calculus-tab-'+item[0]");
    expect(source).toContain("'aria-controls':'calculus-panel-'+item[0]");
    expect(source).toContain("tabIndex:tab===item[0]?0:-1");
    expect(source).toContain("onKeyDown:function(e){calculusTabKeyDown(e, tabIndex);}");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active calculus hero to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'calculus-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'calculus-tab-' + tab");
    expect(source).toContain("tabIndex: 0");
  });
});
