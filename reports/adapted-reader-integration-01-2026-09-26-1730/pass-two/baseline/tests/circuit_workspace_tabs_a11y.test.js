import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_circuit.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_circuit.js');

describe('Circuit Builder workspace tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides roving focus and arrow/Home/End navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('var workspaceTabKeyDown = function(e, index)');
    expect(source).toContain("id: 'circuit-workspace-tab-' + tab.id");
    expect(source).toContain("'aria-selected': active ? 'true' : 'false'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { workspaceTabKeyDown(e, tabIndex); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('labels both workspace panels from their active tabs', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-controls': tab.id === 'reference' ? 'circuit-reference-panel' : 'circuit-build-panel'");
    expect(source).toContain("'aria-labelledby': 'circuit-workspace-tab-reference'");
    expect(source).toContain("'aria-labelledby': 'circuit-workspace-tab-build'");
    expect(source).toContain("id: 'circuit-reference-panel', role: 'tabpanel'");
    expect(source).toContain("id: 'circuit-build-panel', role: 'tabpanel'");
    expect(source).toContain('tabIndex: 0');
  });
});
