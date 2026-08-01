import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_titration.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_titration.js');

describe('Titration Lab tabs accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('gives lab tabs roving focus and keyboard navigation', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('role: "tablist"');
    expect(source).toContain("var _TITR_TABS = ['titrate', 'challenge', 'incidents', 'equipment', 'molarity', 'buffers'];");
    expect(source).toContain("id: 'titration-tab-' + tab.id");
    expect(source).toContain("'aria-controls': 'titration-panel-' + tab.id");
    expect(source).toContain("'aria-selected': active ? \"true\" : \"false\"");
    expect(source).toContain('tabIndex: active ? 0 : -1');
    expect(source).toContain('onKeyDown: function(e) { onTitrTabKey(e, _TITR_TABS.indexOf(tab.id)); }');
    expect(source).toContain("key !== 'ArrowRight' && key !== 'ArrowDown'");
    expect(source).toContain("key === 'ArrowLeft' || key === 'ArrowUp'");
    expect(source).toContain("key === 'Home'");
    expect(source).toContain("key === 'End'");
  });

  it('links the active lab section to its tabpanel', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('role: "tabpanel"');
    expect(source).toContain("id: 'titration-panel-' + labTab");
    expect(source).toContain("'aria-labelledby': 'titration-tab-' + labTab");
    expect(source).toContain('tabIndex: 0');
  });
});
