import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Art Studio section tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_artstudio.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_artstudio.js', 'utf8')).toBe(source);
    expect(source).toContain("const ART_STUDIO_TAB_ORDER = ['colorWheel', 'mixer', 'watercolor', 'pixel', 'symmetry', 'spirograph', 'generative', 'spinArt', 'stringArt', 'opArt', 'tessellation', 'fractal', 'gradient', 'stereogram', 'sculpt3d', 'contrast', 'harmonyHunt'];");
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
    expect(source).toContain('id: "watercolorCanvas"');
    expect(source).toContain("'aria-describedby': \"artstudio-watercolor-keyboard-help artstudio-watercolor-status\"");
    expect(source).toContain('var _artStudioWatercolorCache = {');
    expect(source).toContain('captureState: captureState');
    expect(source).toContain('restoreState: restoreState');
    expect(source).toContain('event.getCoalescedEvents');
    expect(source).toContain('var pigmentDensity = new Float32Array(COUNT);');
    expect(source).toContain('togglePause: function ()');
    expect(source).toContain('var mask = new Float32Array(COUNT);');
    expect(source).toContain('removeMask: function ()');
    expect(source).toContain('evaporation *= 0.45 + params.drying * 1.10;');
    expect(source).toContain('gravityStrength *= 0.10 + params.flowStrength * 1.50;');
  });
});
