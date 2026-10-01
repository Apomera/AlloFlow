import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Kitchen Lab tab accessibility', () => {
  it('keeps mirrored source aligned and makes primary and resource tabs keyboard-operable', () => {
    const source = readFileSync('stem_lab/stem_tool_kitchenlab.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_kitchenlab.js', 'utf8')).toBe(source);
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'stem-kitchen-tab-' + t.id");
    expect(source).toContain("'aria-controls': 'stem-kitchen-panel-' + t.id");
    expect(source).toContain("id: 'stem-kitchen-resource-tab-' + s.id");
    expect(source).toContain("'aria-controls': 'stem-kitchen-resources-panel-' + s.id");
    expect(source).toContain("tabIndex: active ? 0 : -1");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel', id: 'stem-kitchen-panel-' + section");
    expect(source).toContain("role: 'tabpanel', id: 'stem-kitchen-resources-panel-' + sub");
  });
});
