import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_multtable.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_multtable.js');

describe('Multiplication Table tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives Practice, Visual, and Patterns tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tablist', 'aria-label': t('stem.multtable.multiplication_table_sections'");
    expect(source).toContain('].map(function(tb, tabIndex)');
    expect(source).toContain("id: 'multtable-tab-' + tb.id");
    expect(source).toContain("'aria-controls': 'multtable-panel-' + tb.id");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { multTableTabKeyDown(e, tabIndex); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
  });

  it('links the active multiplication table tab to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("id: 'multtable-panel-' + mtTab");
    expect(source).toContain("'aria-labelledby': 'multtable-tab-' + mtTab");
    expect(source).toContain('tabIndex: 0');
  });
});
