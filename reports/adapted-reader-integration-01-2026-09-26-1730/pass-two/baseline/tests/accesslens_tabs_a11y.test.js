import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Access Lens mode tabs accessibility', () => {
  it('keeps mirrored source aligned and supports roving keyboard navigation', () => {
    const source = readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(source);
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("role: 'tab'");
    expect(source).toContain("id: 'accesslens-tab-' + m.id");
    expect(source).toContain("'aria-controls': 'accesslens-panel'");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("onKeyDown: function (e) { accessLensTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("id: 'accesslens-panel'");
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("'aria-labelledby': 'accesslens-tab-' + mode");
  });
});
