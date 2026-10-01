import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Algebra CAS tab accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable tab panels', () => {
    const source = readFileSync('stem_lab/stem_tool_algebracas.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_algebracas.js', 'utf8')).toBe(source);
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain('TABS.map(function(t, tabIndex)');
    expect(source).toContain("role: 'tab'");
    expect(source).toContain("'aria-controls': 'stem-algebracas-panel-' + t.id");
    expect(source).toContain("tabIndex: tab === t.id ? 0 : -1");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("'aria-labelledby': 'stem-algebracas-tab-' + tab");
    expect(source).toContain("'aria-pressed': mode === m.id");
    expect(source).toContain("'aria-pressed': difficulty === df.id");
    expect(source).toContain("'aria-pressed': practiceType === pt.id");
  });
});
