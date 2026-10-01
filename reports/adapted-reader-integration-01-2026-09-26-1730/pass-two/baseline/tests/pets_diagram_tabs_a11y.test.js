import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_pets.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_pets.js');

describe('Pets Lab diagram tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives the four schematics roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("function renderDiagrams()");
    expect(source).toContain("DIAGRAM_TABS.map(function(t, tabIndex)");
    expect(source).toContain("id: 'pets-diagram-tab-' + t.id");
    expect(source).toContain("'aria-controls': 'pets-diagram-panel-' + t.id");
    expect(source).toContain("tabIndex: picked ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { petsDiagramTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the selected schematic to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'pets-diagram-panel-' + current");
    expect(source).toContain("'aria-labelledby': 'pets-diagram-tab-' + current");
    expect(source).toContain("tabIndex: 0");
  });
});
