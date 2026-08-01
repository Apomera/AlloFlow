import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_cellular.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_cellular.js');

describe('Cellular Lab tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('supports roving focus and keyboard tab navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('var CELLULAR_TAB_IDS = TABS.map(function (tb) { return tb.id; });');
    expect(source).toContain('onKeyDown: function (e) { cellularTabKeyDown(e, ti); }');
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("tabIndex: active ? 0 : -1");
  });

  it('keeps tab and tabpanel relationships explicit', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("id: 'cell-tab-' + tb.id");
    expect(source).toContain("'aria-controls': 'cell-panel'");
    expect(source).toContain("h('div', { id: 'cell-panel', role: 'tabpanel', tabIndex: 0, 'aria-labelledby': 'cell-tab-' + tab }");
  });
});
