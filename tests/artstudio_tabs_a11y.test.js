import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Art Studio section tabs accessibility', () => {
  it('keeps mirrored source aligned and exposes keyboard-operable tabs', () => {
    const source = readFileSync('stem_lab/stem_tool_artstudio.js', 'utf8');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_artstudio.js', 'utf8')).toBe(source);
    expect(source).toContain("const ART_STUDIO_TAB_ORDER = ['artistExplorer', 'colorWheel', 'mixer', 'watercolor', 'pixel', 'symmetry', 'spirograph', 'generative', 'spinArt', 'stringArt', 'opArt', 'tessellation', 'fractal', 'gradient', 'stereogram', 'sculpt3d', 'contrast', 'harmonyHunt'];");
    expect(source).toContain("const tab = ART_STUDIO_TAB_ORDER.indexOf(requestedArtStudioTab) !== -1 ? requestedArtStudioTab : 'colorWheel';");
    expect(source).toContain('const ART_STUDIO_GROUPS = [');
    expect(source).toContain("label: __alloT(\"stem.artstudio.learning_paint_color_0cfeba8\", \"Paint & color\")");
    expect(source).toContain("label: __alloT(\"stem.artstudio.learning_pattern_mathematics_b2fb534\", \"Pattern & mathematics\")");
    expect(source).toContain("label: __alloT(\"stem.artstudio.learning_perception_access_5e1f966\", \"Perception & access\")");
    expect(source).toContain("'data-artstudio-grouped-nav': 'true'");
    expect(source).toContain("'aria-label': __alloT(\"stem.artstudio.learning_art_studio_tool_groups_f20ca83\", \"Art Studio tool groups\")");
    expect(source).toContain("role: 'tablist'");
    expect(source).toContain("id: 'artstudio-tab-' + tb.id");
    expect(source).toContain("'aria-controls': 'artstudio-panel-' + tb.id");
    expect(source).toContain("tabIndex: tab === tb.id ? 0 : -1");
    expect(source).toContain("onKeyDown: function (e) { artStudioTabKeyDown(e, tabIndex, activeArtStudioGroup.tabs); }");
    expect(source).toContain("e.key === 'ArrowRight'");
    expect(source).toContain("e.key === 'ArrowLeft'");
    expect(source).toContain("e.key === 'Home'");
    expect(source).toContain("e.key === 'End'");
    expect(source).toContain("role: 'tabpanel', id: 'artstudio-panel-' + tab");
    expect(source).toContain("'aria-labelledby': 'artstudio-tab-' + tab");
    expect(source).toContain('id: "watercolorCanvas"');
    expect(source).toContain("'aria-describedby': \"artstudio-watercolor-touch-help artstudio-watercolor-keyboard-help artstudio-watercolor-status\"");
    expect(source).toContain('var _artStudioWatercolorCache = {');
    expect(source).toContain('captureState: captureState');
    expect(source).toContain('restoreState: restoreState');
    expect(source).toContain('event.getCoalescedEvents');
    expect(source).toContain('var pigmentDensity = new Float32Array(COUNT);');
    expect(source).toContain('togglePause: function ()');
    expect(source).toContain('var mask = new Float32Array(COUNT);');
    expect(source).toContain('removeMask: function ()');
    // Transport, drying, and pigment traits are verified by behavioral tests
    // in artstudio_watercolor_engine.test.js, independent of formula spelling.
    expect(source).toContain('var pigmentStainingMass = new Float32Array(COUNT);');
    expect(source).toContain('var pigmentOpacityMass = new Float32Array(COUNT);');
    expect(source).toContain('var pigmentGranulationMass = new Float32Array(COUNT);');
    expect(source).toContain('var pigmentMobilityMass = new Float32Array(COUNT);');
    expect(source).toContain("description: 'granulating, transparent, low staining, medium mobility'");
  });
});
