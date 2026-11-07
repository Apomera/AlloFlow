import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Angle Explorer tab accessibility', () => {
  it('keeps mirrored source aligned and exposes a roving, keyboard-operable tablist', () => {
    const source = readFileSync('stem_lab/stem_tool_angles.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_angles.js', 'utf8')).toBe(source);
    // Stage C: the order follows the level; every band keeps all ten tabs with Reference last.
    expect(source).toContain("g4: ['protractor', 'challenges', 'explore', 'puzzles', 'polygons', 'contexts', 'circles', 'construct', 'tools', 'reference'],");
    expect(source).toContain("g57: ['puzzles', 'polygons', 'contexts', 'protractor', 'challenges', 'explore', 'circles', 'construct', 'tools', 'reference'],");
    expect(source).toContain("g8: ['circles', 'construct', 'puzzles', 'polygons', 'contexts', 'protractor', 'challenges', 'explore', 'tools', 'reference']");
    expect(source).toContain('var ANGLE_TAB_ORDER = TAB_ORDER_BY_LEVEL[level] || TAB_ORDER_BY_LEVEL.g57;');
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
