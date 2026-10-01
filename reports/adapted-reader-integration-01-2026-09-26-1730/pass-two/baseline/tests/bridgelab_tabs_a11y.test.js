import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Bridge Lab section tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_bridgelab.js', 'utf8')).toBe(source);
    expect(source).toContain("var bridgeTabKeyDown = function(e, index)");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'stem-bridgelab-tab-' + t.id");
    expect(source).toContain("'aria-controls': 'stem-bridgelab-panel-' + t.id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { bridgeTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel', id: 'stem-bridgelab-panel-' + d.tab");
    expect(source).toContain("'aria-labelledby': 'stem-bridgelab-tab-' + d.tab");
  });
});
