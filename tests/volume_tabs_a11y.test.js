import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Volume Lab mode tab accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable mode tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_volume.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_volume.js', 'utf8')).toBe(source);
    expect(source).toContain("var VOLUME_TAB_ORDER = ['slider', 'freeform', 'word', 'displacement'];");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'stem-volume-tab-slider'");
    expect(source).toContain("id: 'stem-volume-tab-freeform'");
    expect(source).toContain("id: 'stem-volume-tab-word'");
    expect(source).toContain("id: 'stem-volume-tab-displacement'");
    expect(source).toContain("'aria-controls': 'stem-volume-panel-slider'");
    expect(source).toContain("'aria-controls': 'stem-volume-panel-freeform'");
    expect(source).toContain("'aria-controls': 'stem-volume-panel-word'");
    expect(source).toContain("'aria-controls': 'stem-volume-panel-displacement'");
    expect(source).toContain("tabIndex: mode === 'slider' ? 0 : -1");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain("'aria-labelledby': 'stem-volume-tab-' + modeKey");
  });
});
