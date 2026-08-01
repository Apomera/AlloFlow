import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Angle Explorer tab accessibility', () => {
  it('keeps mirrored source aligned and exposes a roving, keyboard-operable tablist', () => {
    const source = readFileSync('stem_lab/stem_tool_angles.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_angles.js', 'utf8')).toBe(source);
    expect(source).toContain("var ANGLE_TAB_ORDER = ['explore', 'challenges', 'reference', 'tools'];");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("role: 'tab'");
    expect(source).toContain("'aria-controls': 'stem-angles-panel-' + id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("'aria-labelledby': 'stem-angles-tab-' + activeTab");
  });
});
