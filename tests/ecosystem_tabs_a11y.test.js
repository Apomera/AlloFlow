import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Ecosystem Explorer mode tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_ecosystem.js', 'utf8')).toBe(source);
    expect(source).toContain("var ECO_TAB_ORDER = ['explore', 'sandbox', 'conserve', 'inquiry', 'quiz', 'badges'];");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'stem-ecosystem-tab-' + t2");
    expect(source).toContain("'aria-controls': 'stem-ecosystem-panel-' + t2");
    expect(source).toContain("tabIndex: tab === t2 ? 0 : -1");
    expect(source).toContain("onKeyDown: function(e) { ecoTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel', id: 'stem-ecosystem-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'stem-ecosystem-tab-' + tab");
  });
});
