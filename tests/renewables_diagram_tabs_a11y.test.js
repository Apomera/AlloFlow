import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_renewables.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_renewables.js');

describe('Renewables Lab diagram tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives diagram tabs roving focus and arrow/Home/End navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("function renderDiagrams()");
    expect(source).toContain("DIAGRAM_TABS.map(function(t, tabIndex)");
    expect(source).toContain("id: 'renewables-diagram-tab-' + t.id");
    expect(source).toContain("'aria-controls': 'renewables-diagram-panel-' + t.id");
    expect(source).toContain("tabIndex: picked ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { diagramTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the selected diagram to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'renewables-diagram-panel-' + current");
    expect(source).toContain("'aria-labelledby': 'renewables-diagram-tab-' + current");
    expect(source).toContain("tabIndex: 0");
  });
});
