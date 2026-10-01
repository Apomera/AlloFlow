import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_echolocation.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_echolocation.js');

describe('Echolocation Acoustic Ecology sub-tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('supports roving focus and full keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("var ECOLOGY_SECTION_IDS = ['soundscape', 'bioacoustics', 'soundmap'];");
    expect(source).toContain("id: 'echolocation-ecology-tab-' + s.id");
    expect(source).toContain("'aria-controls': 'echolocation-ecology-panel-' + s.id");
    expect(source).toContain('onKeyDown: function(e) { ecologyTabKeyDown(e, si); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
  });

  it('links the active Ecology section to a focusable panel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'echolocation-ecology-panel-' + ecoSection");
    expect(source).toContain("'aria-labelledby': 'echolocation-ecology-tab-' + ecoSection");
    expect(source).toContain('tabIndex: 0');
  });
});
