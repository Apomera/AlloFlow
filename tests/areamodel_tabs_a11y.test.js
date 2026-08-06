import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Area Model mode tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable mode tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_areamodel.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_areamodel.js', 'utf8')).toBe(source);
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("].map(function(m, tabIndex)");
    expect(source).toContain("role: 'tab'");
    expect(source).toContain("'aria-controls': 'stem-areamodel-panel-' + viewMode");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("'aria-labelledby': 'stem-areamodel-tab-' + viewMode");
    // aria-SELECTED, not aria-pressed. This line used to assert
    // "'aria-pressed': active", which is prohibited on role="tab" — axe rates
    // it critical, and the browser drops it, so the state it claimed to expose
    // was never exposed. aria-selected is the state attribute a tab actually
    // has, and it was already present alongside it.
    expect(source).toContain("'aria-selected': active");
    expect(source, 'aria-pressed is invalid on role="tab" and must not come back')
      .not.toContain("'aria-pressed': active");
  });
});
