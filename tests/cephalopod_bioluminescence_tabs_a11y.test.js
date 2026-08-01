import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_cephalopodlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_cephalopodlab.js');

describe('Cephalopod Lab bioluminescence tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('provides labelled tabs with roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': __alloT('stem.cephalopodlab.bioluminescence_sub_sections'");
    expect(source).toContain("id: 'cephalopod-biolux-tab-' + s.id");
    expect(source).toContain("'aria-controls': 'cephalopod-biolux-panel-' + s.id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain('onKeyDown: function(e) { bioluxTabKeyDown(e, si); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active sub-section to a focusable tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'cephalopod-biolux-panel-' + view");
    expect(source).toContain("'aria-labelledby': 'cephalopod-biolux-tab-' + view");
    expect(source).toContain('tabIndex: 0');
  });
});
