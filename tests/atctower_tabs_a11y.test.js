import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ATC Tower route tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable route tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_atctower.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_atctower.js', 'utf8')).toBe(source);
    expect(source).toContain("var ATC_TAB_ORDER = menuTabs.map(function(tab) { return tab.id; });");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'stem-atctower-tab-' + tab.id");
    expect(source).toContain("'aria-controls': 'stem-atctower-panel-' + tab.id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { atcTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel', id: 'stem-atctower-panel-' + atcMenuPanel");
    expect(source).toContain("'aria-labelledby': 'stem-atctower-tab-' + atcMenuPanel");
  });
});
