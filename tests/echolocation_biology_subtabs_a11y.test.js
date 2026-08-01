import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_echolocation.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_echolocation.js');

describe('Echolocation Biology sub-tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('supports roving focus and full keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("var BIOLOGY_SECTION_IDS = ['anatomy', 'species', 'conservation'];");
    expect(source).toContain("id: 'echolocation-biology-tab-' + s.id");
    expect(source).toContain("'aria-controls': 'echolocation-biology-panel-' + s.id");
    expect(source).toContain('onKeyDown: function(e) { biologyTabKeyDown(e, si); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain('tabIndex: active ? 0 : -1');
  });

  it('links the active Biology section to a focusable panel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel', id: 'echolocation-biology-panel-' + bioSection");
    expect(source).toContain("'aria-labelledby': 'echolocation-biology-tab-' + bioSection");
    expect(source).toContain('tabIndex: 0');
  });
});
