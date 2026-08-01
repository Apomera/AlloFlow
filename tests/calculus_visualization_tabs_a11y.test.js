import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_calculus.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_calculus.js');

describe('Calculus visualization subtabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives visualization subtabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': 'Calculus visualization view'");
    expect(source).toContain("id: 'calculus-viz-tab-' + v.id");
    expect(source).toContain("'aria-controls': 'calculus-viz-panel-' + v.id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false', tabIndex: active ? 0 : -1");
    expect(source).toContain('onKeyDown: function(e) { calculusVizTabKeyDown(e, vi); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active visualization view to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'calculus-viz-panel-' + vizView");
    expect(source).toContain("'aria-labelledby': 'calculus-viz-tab-' + vizView");
    expect(source).toContain('tabIndex: 0');
  });
});
