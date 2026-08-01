import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Art Studio section tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_artstudio.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_artstudio.js', 'utf8')).toBe(source);
    expect(source).toContain("const ART_STUDIO_TAB_ORDER = ['colorWheel', 'mixer', 'pixel', 'symmetry', 'spirograph', 'generative', 'spinArt', 'stringArt', 'opArt', 'tessellation', 'fractal', 'gradient', 'stereogram', 'sculpt3d', 'contrast', 'harmonyHunt'];");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'artstudio-tab-' + tb.id");
    expect(source).toContain("'aria-controls': 'artstudio-panel-' + tb.id");
    expect(source).toContain("tabIndex: tab === tb.id ? 0 : -1");
    expect(source).toContain("onKeyDown: function (e) { artStudioTabKeyDown(e, tabIndex); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel', id: 'artstudio-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'artstudio-tab-' + tab");
  });
});
